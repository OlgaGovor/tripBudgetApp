import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Accommodation } from '../schema'
import { ExpenseRepository } from './ExpenseRepository'
import { TripRepository } from './TripRepository'

/** Upsert accommodation stops: update in place if already exists, create if missing,
 *  delete stops for days no longer in the date range. Never duplicates.
 *  selectedStopId: if the user picked an existing stop, adopt it instead of creating a new one. */
async function syncStopsForAccommodation(
  tripId: string,
  accommodationId: string,
  name: string,
  checkIn: string,
  checkOut: string,
  placeName?: string,
  lat?: number,
  lng?: number,
  selectedStopId?: string,
): Promise<void> {
  const newDates = new Set(occupiedDates(checkIn, checkOut))
  const existingStops = await db.stops.where('accommodationId').equals(accommodationId).toArray()

  // Fetch days for existing stops to check which are no longer in the date range
  const existingDayIds = [...new Set(existingStops.map(s => s.dayId))]
  const existingDays = await Promise.all(existingDayIds.map(id => db.days.get(id)))
  const dayDateById = new Map(existingDays.filter(Boolean).map(d => [d!.id, d!.date]))

  await Promise.all(existingStops.map(async s => {
    const date = dayDateById.get(s.dayId)
    if (date && !newDates.has(date)) {
      await db.stops.delete(s.id)
    }
  }))

  // Re-read after deletes to know which stops still exist
  const remainingStops = await db.stops.where('accommodationId').equals(accommodationId).toArray()
  const remainingByDayId = new Map(remainingStops.map(s => [s.dayId, s]))

  // Pre-fetch selected stop once (if user picked an existing stop from the day's chip list)
  const selectedStop = selectedStopId ? await db.stops.get(selectedStopId) : undefined

  // Upsert for each day in the new range
  const days = await db.days.where('tripId').equals(tripId).filter(d => newDates.has(d.date)).toArray()
  await Promise.all(days.map(async d => {
    const stopData = { placeName: placeName ?? name, placeLink: undefined as string | undefined, lat, lng }
    const existing = remainingByDayId.get(d.id)
    if (existing) {
      // Already linked to this accommodation — update in place
      await db.stops.update(existing.id, stopData)
    } else if (selectedStop && selectedStop.dayId === d.id && !selectedStop.accommodationId) {
      // User picked an existing stop on this day — adopt it instead of creating a duplicate
      await db.stops.update(selectedStop.id, { ...stopData, accommodationId })
    } else {
      const dayStops = await db.stops.where('dayId').equals(d.id).toArray()
      await db.stops.add({
        id: uuidv4(), dayId: d.id, order: dayStops.length,
        ...stopData, accommodationId, usefulLinks: [],
      })
    }
  }))
}

async function syncExpenseForAccommodation(
  accommodationId: string,
  tripId: string,
  name: string,
  placeName: string | undefined,
  checkIn: string,
  price: number | undefined,
  priceCurrency: string | undefined,
): Promise<void> {
  const existing = await db.expenses.where('accommodationId').equals(accommodationId).first()
  if (!price || !priceCurrency) {
    if (existing) await db.expenses.delete(existing.id)
    return
  }
  const note = placeName ? `${name} · ${placeName}` : name
  if (existing) {
    await ExpenseRepository.update(existing.id, { amount: price, currency: priceCurrency, note, date: checkIn })
  } else {
    await ExpenseRepository.create({
      tripId, categoryId: 'cat-accommodation',
      amount: price, currency: priceCurrency,
      date: checkIn, note, accommodationId,
    })
  }
}

async function deleteStopsForAccommodation(accommodationId: string): Promise<void> {
  const stops = await db.stops.where('accommodationId').equals(accommodationId).toArray()
  await Promise.all(stops.map(s => db.stops.delete(s.id)))
}

type AccommodationInput = Omit<Accommodation, 'id'>

/** Returns all dates from checkIn through checkOut (inclusive) */
function occupiedDates(checkIn: string, checkOut: string): string[] {
  const dates: string[] = []
  let current = checkIn
  while (current <= checkOut) {
    dates.push(current)
    const d = new Date(current + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    current = d.toISOString().slice(0, 10)
  }
  return dates
}

async function assignToDays(tripId: string, accommodationId: string, checkIn: string, checkOut: string): Promise<void> {
  const dates = new Set(occupiedDates(checkIn, checkOut).filter(d => d < checkOut))
  const days = await db.days.where('tripId').equals(tripId).filter(d => dates.has(d.date)).toArray()
  await Promise.all(days.map(d => db.days.update(d.id, { accommodationId })))
}

async function unassignFromDays(tripId: string, accommodationId: string): Promise<void> {
  const days = await db.days.where('tripId').equals(tripId)
    .filter(d => d.accommodationId === accommodationId).toArray()
  await Promise.all(days.map(d => db.days.update(d.id, { accommodationId: undefined })))
}

export const AccommodationRepository = {
  useByTripId(tripId: string) {
    return useLiveQuery(
      () => db.accommodations.where('tripId').equals(tripId).sortBy('checkIn'),
      [tripId]
    )
  },

  async create(input: AccommodationInput, selectedStopId?: string): Promise<string> {
    const id = uuidv4()
    await db.accommodations.add({ ...input, id })
    await assignToDays(input.tripId, id, input.checkIn, input.checkOut)
    await syncStopsForAccommodation(input.tripId, id, input.name, input.checkIn, input.checkOut, input.placeName, input.lat, input.lng, selectedStopId)
    await syncExpenseForAccommodation(id, input.tripId, input.name, input.placeName, input.checkIn, input.price, input.priceCurrency)
    await TripRepository.touch(input.tripId)
    return id
  },

  async update(id: string, updates: Partial<Omit<Accommodation, 'id' | 'tripId'>>, selectedStopId?: string): Promise<void> {
    const existing = await db.accommodations.get(id)
    if (!existing) throw new Error(`Accommodation ${id} not found`)
    const datesChanged = (updates.checkIn !== undefined && updates.checkIn !== existing.checkIn)
      || (updates.checkOut !== undefined && updates.checkOut !== existing.checkOut)
    const stopsAffected = datesChanged
      || (updates.name !== undefined && updates.name !== existing.name)
      || ('link' in updates && updates.link !== existing.link)
      || ('placeName' in updates && updates.placeName !== existing.placeName)
      || ('lat' in updates && updates.lat !== existing.lat)
      || ('lng' in updates && updates.lng !== existing.lng)
    if (datesChanged) await unassignFromDays(existing.tripId, id)
    await db.accommodations.update(id, updates)
    const updated = (await db.accommodations.get(id))!
    if (datesChanged) {
      await assignToDays(existing.tripId, id, updated.checkIn, updated.checkOut)
    }
    if (stopsAffected) {
      await syncStopsForAccommodation(existing.tripId, id, updated.name, updated.checkIn, updated.checkOut, updated.placeName, updated.lat, updated.lng, selectedStopId)
    }
    await syncExpenseForAccommodation(id, existing.tripId, updated.name, updated.placeName, updated.checkIn, updated.price, updated.priceCurrency)
    await TripRepository.touch(existing.tripId)
  },

  async delete(id: string): Promise<void> {
    const existing = await db.accommodations.get(id)
    if (existing) {
      await unassignFromDays(existing.tripId, id)
      await deleteStopsForAccommodation(id)
      const expense = await db.expenses.where('accommodationId').equals(id).first()
      if (expense) await db.expenses.delete(expense.id)
      await TripRepository.touch(existing.tripId)
    }
    await db.accommodations.delete(id)
  },
}

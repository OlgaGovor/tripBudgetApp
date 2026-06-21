import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Accommodation, Expense } from '../schema'
import { TripRepository } from './TripRepository'
import { getExchangeRates, convertAmount } from '../../lib/currency'
import { notifyDataChanged } from '../../sync/SyncManager'

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
  city?: string,
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
    const stopData = { placeName: city ?? placeName ?? name, placeLink: undefined as string | undefined, lat, lng }
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

type ExpensePlan =
  | { type: 'none' }
  | { type: 'delete'; id: string }
  | { type: 'update'; id: string; data: Partial<Omit<Expense, 'id'>> }
  | { type: 'create'; data: Omit<Expense, 'id'> }

/** Decide what to do with the accommodation's linked expense. Runs OUTSIDE the write
 *  transaction because it may fetch exchange rates (network); returns a pure-data plan
 *  that applyExpensePlan() then executes inside the transaction. */
async function planExpense(
  accommodationId: string,
  tripId: string,
  name: string,
  placeName: string | undefined,
  checkIn: string,
  price: number | undefined,
  priceCurrency: string | undefined,
): Promise<ExpensePlan> {
  const existing = await db.expenses.where('accommodationId').equals(accommodationId).first()
  if (!price || !priceCurrency) {
    return existing ? { type: 'delete', id: existing.id } : { type: 'none' }
  }
  const trip = await db.trips.get(tripId)
  const { rates } = await getExchangeRates()
  const amountConverted = trip ? convertAmount(price, priceCurrency, trip.defaultCurrency, rates) : price
  const convertedAt = new Date().toISOString()
  const note = placeName ? `${name} · ${placeName}` : name
  if (existing) {
    return { type: 'update', id: existing.id, data: { amount: price, currency: priceCurrency, note, date: checkIn, amountConverted, convertedAt } }
  }
  return {
    type: 'create',
    data: { tripId, categoryId: 'cat-accommodation', amount: price, currency: priceCurrency, date: checkIn, note, accommodationId, amountConverted, convertedAt },
  }
}

async function applyExpensePlan(plan: ExpensePlan): Promise<void> {
  if (plan.type === 'delete') await db.expenses.delete(plan.id)
  else if (plan.type === 'update') await db.expenses.update(plan.id, plan.data)
  else if (plan.type === 'create') await db.expenses.add({ ...plan.data, id: uuidv4() })
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

/** Move an accommodation's day assignment to a new date range, touching ONLY the days
 *  that actually change. Days that stay assigned are left untouched, so the accommodation
 *  never blinks off the plan page during a date edit. */
async function reassignDays(tripId: string, accommodationId: string, checkIn: string, checkOut: string): Promise<void> {
  const target = new Set(occupiedDates(checkIn, checkOut).filter(d => d < checkOut))
  const tripDays = await db.days.where('tripId').equals(tripId).toArray()
  const writes: Promise<unknown>[] = []
  for (const d of tripDays) {
    const shouldHave = target.has(d.date)
    const has = d.accommodationId === accommodationId
    if (shouldHave && !has) writes.push(db.days.update(d.id, { accommodationId }))
    else if (!shouldHave && has) writes.push(db.days.update(d.id, { accommodationId: undefined }))
  }
  await Promise.all(writes)
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
    // Compute the expense (may fetch rates) BEFORE the transaction so the txn stays pure DB.
    const expensePlan = await planExpense(id, input.tripId, input.name, input.placeName, input.checkIn, input.price, input.priceCurrency)
    await db.transaction('rw', [db.accommodations, db.days, db.stops, db.expenses, db.trips], async () => {
      await db.accommodations.add({ ...input, id })
      await assignToDays(input.tripId, id, input.checkIn, input.checkOut)
      await syncStopsForAccommodation(input.tripId, id, input.name, input.checkIn, input.checkOut, input.placeName, input.lat, input.lng, selectedStopId, input.city)
      await applyExpensePlan(expensePlan)
      await db.trips.update(input.tripId, { updatedAt: new Date().toISOString() })
    })
    notifyDataChanged(input.tripId)
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
      || ('city' in updates && updates.city !== existing.city)
      || ('lat' in updates && updates.lat !== existing.lat)
      || ('lng' in updates && updates.lng !== existing.lng)
    const merged = { ...existing, ...updates }
    // Compute the expense (may fetch rates) BEFORE the transaction so the txn stays pure DB.
    const expensePlan = await planExpense(id, existing.tripId, merged.name, merged.placeName, merged.checkIn, merged.price, merged.priceCurrency)
    await db.transaction('rw', [db.accommodations, db.days, db.stops, db.expenses, db.trips], async () => {
      await db.accommodations.update(id, updates)
      if (datesChanged) {
        await reassignDays(existing.tripId, id, merged.checkIn, merged.checkOut)
      }
      if (stopsAffected) {
        await syncStopsForAccommodation(existing.tripId, id, merged.name, merged.checkIn, merged.checkOut, merged.placeName, merged.lat, merged.lng, selectedStopId, merged.city)
      }
      await applyExpensePlan(expensePlan)
      await db.trips.update(existing.tripId, { updatedAt: new Date().toISOString() })
    })
    notifyDataChanged(existing.tripId)
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

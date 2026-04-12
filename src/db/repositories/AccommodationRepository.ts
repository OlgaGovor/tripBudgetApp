import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Accommodation } from '../schema'

async function createStopsForAccommodation(
  tripId: string,
  accommodationId: string,
  name: string,
  link: string | undefined,
  checkIn: string,
  checkOut: string,
  placeName?: string,
  lat?: number,
  lng?: number,
): Promise<void> {
  const dates = new Set(occupiedDates(checkIn, checkOut))
  const days = await db.days.where('tripId').equals(tripId).filter(d => dates.has(d.date)).toArray()
  await Promise.all(days.map(async d => {
    const alreadyExists = await db.stops.where('accommodationId').equals(accommodationId)
      .filter(s => s.dayId === d.id).first()
    if (alreadyExists) return
    const dayStops = await db.stops.where('dayId').equals(d.id).toArray()
    await db.stops.add({
      id: uuidv4(), dayId: d.id, order: dayStops.length,
      placeName: placeName ?? name, placeLink: link, lat, lng, accommodationId, usefulLinks: [],
    })
  }))
}

async function deleteStopsForAccommodation(accommodationId: string): Promise<void> {
  const stops = await db.stops.where('accommodationId').equals(accommodationId).toArray()
  await Promise.all(stops.map(s => db.stops.delete(s.id)))
}

type AccommodationInput = Omit<Accommodation, 'id'>

/** Returns all dates from checkIn up to (but not including) checkOut */
function occupiedDates(checkIn: string, checkOut: string): string[] {
  const dates: string[] = []
  let current = checkIn
  while (current < checkOut) {
    dates.push(current)
    const d = new Date(current + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    current = d.toISOString().slice(0, 10)
  }
  return dates
}

async function assignToDays(tripId: string, accommodationId: string, checkIn: string, checkOut: string): Promise<void> {
  const dates = new Set(occupiedDates(checkIn, checkOut))
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

  async create(input: AccommodationInput): Promise<string> {
    const id = uuidv4()
    await db.accommodations.add({ ...input, id })
    await assignToDays(input.tripId, id, input.checkIn, input.checkOut)
    await createStopsForAccommodation(input.tripId, id, input.name, input.link, input.checkIn, input.checkOut, input.placeName, input.lat, input.lng)
    return id
  },

  async update(id: string, updates: Partial<Omit<Accommodation, 'id' | 'tripId'>>): Promise<void> {
    const existing = await db.accommodations.get(id)
    if (!existing) throw new Error(`Accommodation ${id} not found`)
    const datesChanged = updates.checkIn !== undefined || updates.checkOut !== undefined
    const stopsAffected = datesChanged || updates.name !== undefined || updates.link !== undefined
      || updates.placeName !== undefined || updates.lat !== undefined || updates.lng !== undefined
    if (datesChanged) await unassignFromDays(existing.tripId, id)
    if (stopsAffected) await deleteStopsForAccommodation(id)
    await db.accommodations.update(id, updates)
    if (datesChanged || stopsAffected) {
      const updated = (await db.accommodations.get(id))!
      if (datesChanged) await assignToDays(existing.tripId, id, updated.checkIn, updated.checkOut)
      if (stopsAffected) await createStopsForAccommodation(existing.tripId, id, updated.name, updated.link, updated.checkIn, updated.checkOut, updated.placeName, updated.lat, updated.lng)
    }
  },

  async delete(id: string): Promise<void> {
    const existing = await db.accommodations.get(id)
    if (existing) {
      await unassignFromDays(existing.tripId, id)
      await deleteStopsForAccommodation(id)
    }
    await db.accommodations.delete(id)
  },
}

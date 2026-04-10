import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Accommodation } from '../schema'

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
    return id
  },

  async update(id: string, updates: Partial<Omit<Accommodation, 'id' | 'tripId'>>): Promise<void> {
    const existing = await db.accommodations.get(id)
    if (!existing) throw new Error(`Accommodation ${id} not found`)
    if (updates.checkIn !== undefined || updates.checkOut !== undefined) {
      await unassignFromDays(existing.tripId, id)
    }
    await db.accommodations.update(id, updates)
    if (updates.checkIn !== undefined || updates.checkOut !== undefined) {
      const updated = (await db.accommodations.get(id))!
      await assignToDays(existing.tripId, id, updated.checkIn, updated.checkOut)
    }
  },

  async delete(id: string): Promise<void> {
    const existing = await db.accommodations.get(id)
    if (existing) await unassignFromDays(existing.tripId, id)
    await db.accommodations.delete(id)
  },
}

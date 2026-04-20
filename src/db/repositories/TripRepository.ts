import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Trip } from '../schema'
import { DayRepository } from './DayRepository'
import { notifyDataChanged } from '../../sync/SyncManager'

type TripInput = Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>
type TripUpdate = Partial<TripInput> & { id: string }

export const TripRepository = {
  useAll() {
    return useLiveQuery(() => db.trips.orderBy('createdAt').reverse().toArray(), [])
  },

  useById(id: string) {
    return useLiveQuery(() => db.trips.get(id), [id])
  },

  async create(input: TripInput): Promise<string> {
    const now = new Date().toISOString()
    const id = uuidv4()
    await db.trips.add({ ...input, id, createdAt: now, updatedAt: now })
    await DayRepository.generateForTrip(id, input.startDate, input.endDate)
    notifyDataChanged(id)
    return id
  },

  async update(input: TripUpdate): Promise<void> {
    const { id, ...rest } = input
    const now = new Date().toISOString()
    if (rest.startDate !== undefined || rest.endDate !== undefined) {
      const existing = await db.trips.get(id)
      if (!existing) return
      const newStart = rest.startDate ?? existing.startDate
      const newEnd = rest.endDate ?? existing.endDate
      await db.trips.update(id, { ...rest, updatedAt: now })
      await DayRepository.regenerateForTrip(id, newStart, newEnd)
    } else {
      await db.trips.update(id, { ...rest, updatedAt: now })
    }
    notifyDataChanged(id)
  },

  async delete(id: string): Promise<void> {
    await db.transaction(
      'rw',
      [db.trips, db.days, db.stops, db.transportLegs, db.accommodations, db.expenses, db.packingItems],
      async () => {
        const days = await db.days.where('tripId').equals(id).toArray()
        const dayIds = days.map(d => d.id)
        if (dayIds.length) await db.stops.where('dayId').anyOf(dayIds).delete()
        await db.days.where('tripId').equals(id).delete()
        await db.transportLegs.where('tripId').equals(id).delete()
        await db.accommodations.where('tripId').equals(id).delete()
        await db.expenses.where('tripId').equals(id).delete()
        await db.packingItems.where('tripId').equals(id).delete()
        await db.trips.delete(id)
      }
    )
  },
}

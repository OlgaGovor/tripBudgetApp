import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { PackingItem } from '../schema'
import { TripRepository } from './TripRepository'

type CreateInput = Omit<PackingItem, 'id'>

export const PackingRepository = {
  useByTripId(tripId: string) {
    return useLiveQuery(
      () => db.packingItems.where('tripId').equals(tripId).sortBy('order'),
      [tripId]
    )
  },

  async create(input: CreateInput): Promise<string> {
    const id = uuidv4()
    await db.packingItems.add({ ...input, id })
    await TripRepository.touch(input.tripId)
    return id
  },

  async update(id: string, updates: Partial<Omit<PackingItem, 'id'>>): Promise<void> {
    await db.packingItems.update(id, updates)
    const item = await db.packingItems.get(id)
    if (item) await TripRepository.touch(item.tripId)
  },

  async delete(id: string): Promise<void> {
    const item = await db.packingItems.get(id)
    await db.packingItems.delete(id)
    if (item) await TripRepository.touch(item.tripId)
  },

  async toggleChecked(id: string): Promise<void> {
    const item = await db.packingItems.get(id)
    if (item) {
      await db.packingItems.update(id, { checked: !item.checked })
      await TripRepository.touch(item.tripId)
    }
  },

  async copyFromTrip(sourceTripId: string, targetTripId: string): Promise<void> {
    const items = await db.packingItems.where('tripId').equals(sourceTripId).toArray()
    await db.packingItems.bulkAdd(
      items.map(item => ({ ...item, id: uuidv4(), tripId: targetTripId, checked: false }))
    )
    await TripRepository.touch(targetTripId)
  },

  async getTotalWeightGrams(tripId: string): Promise<number> {
    const items = await db.packingItems.where('tripId').equals(tripId).toArray()
    return items.reduce((sum, i) => sum + (i.weightGrams ?? 0), 0)
  },
}

import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Stop } from '../schema'

type StopInput = Omit<Stop, 'id'>

export const StopRepository = {
  useByDayId(dayId: string) {
    return useLiveQuery(
      () => db.stops.where('dayId').equals(dayId).sortBy('order'),
      [dayId]
    )
  },

  async getByDayId(dayId: string): Promise<Stop[]> {
    return db.stops.where('dayId').equals(dayId).sortBy('order')
  },

  async create(input: StopInput): Promise<string> {
    const id = uuidv4()
    await db.stops.add({ ...input, id })
    return id
  },

  async update(id: string, updates: Partial<Omit<Stop, 'id'>>): Promise<void> {
    await db.stops.update(id, updates)
  },

  async delete(id: string): Promise<void> {
    await db.stops.delete(id)
  },

  async reorder(dayId: string, orderedIds: string[]): Promise<void> {
    await Promise.all(orderedIds.map((id, index) => db.stops.update(id, { order: index })))
  },
}

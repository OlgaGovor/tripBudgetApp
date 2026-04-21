import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Stop } from '../schema'
import { TripRepository } from './TripRepository'

type StopInput = Omit<Stop, 'id'>

async function touchTripForDay(dayId: string): Promise<void> {
  const day = await db.days.get(dayId)
  if (day) await TripRepository.touch(day.tripId)
}

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
    await touchTripForDay(input.dayId)
    return id
  },

  async update(id: string, updates: Partial<Omit<Stop, 'id'>>): Promise<void> {
    await db.stops.update(id, updates)
    const stop = await db.stops.get(id)
    if (stop) await touchTripForDay(stop.dayId)
  },

  async delete(id: string): Promise<void> {
    const stop = await db.stops.get(id)
    await db.stops.delete(id)
    if (stop) await touchTripForDay(stop.dayId)
  },

  async reorder(dayId: string, orderedIds: string[]): Promise<void> {
    await Promise.all(orderedIds.map((id, index) => db.stops.update(id, { order: index })))
    await touchTripForDay(dayId)
  },
}

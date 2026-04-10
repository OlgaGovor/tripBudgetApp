import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Day } from '../schema'

/** Timezone-safe: always works in UTC to avoid DST shifts */
function datesBetweenInclusive(start: string, end: string): string[] {
  const dates: string[] = []
  let current = start
  while (current <= end) {
    dates.push(current)
    const d = new Date(current + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    current = d.toISOString().slice(0, 10)
  }
  return dates
}

export const DayRepository = {
  useByTripId(tripId: string) {
    return useLiveQuery(
      () => db.days.where('tripId').equals(tripId).sortBy('date'),
      [tripId]
    )
  },

  async generateForTrip(tripId: string, startDate: string, endDate: string): Promise<void> {
    const dates = datesBetweenInclusive(startDate, endDate)
    const days: Day[] = dates.map((date, i) => ({
      id: uuidv4(),
      tripId,
      date,
      dayNumber: i + 1,
    }))
    await db.days.bulkAdd(days)
  },

  async regenerateForTrip(tripId: string, startDate: string, endDate: string): Promise<void> {
    const targetDates = new Set(datesBetweenInclusive(startDate, endDate))
    const existing = await db.days.where('tripId').equals(tripId).toArray()
    const existingByDate = new Map(existing.map(d => [d.date, d]))

    // Delete days outside new range (and their stops)
    const toDelete = existing.filter(d => !targetDates.has(d.date)).map(d => d.id)
    if (toDelete.length) {
      await db.stops.where('dayId').anyOf(toDelete).delete()
      await db.days.bulkDelete(toDelete)
    }

    // Add missing days (placeholder dayNumber; renumbered below)
    const toAdd: Day[] = [...targetDates]
      .filter(date => !existingByDate.has(date))
      .map(date => ({ id: uuidv4(), tripId, date, dayNumber: 0 }))
    if (toAdd.length) await db.days.bulkAdd(toAdd)

    // Renumber all remaining days in date order
    const allDays = await db.days.where('tripId').equals(tripId).sortBy('date')
    await Promise.all(allDays.map((d, i) => db.days.update(d.id, { dayNumber: i + 1 })))
  },

  async updateNotes(id: string, notes: string): Promise<void> {
    await db.days.update(id, { notes })
  },

  async setAccommodation(id: string, accommodationId: string | undefined): Promise<void> {
    await db.days.update(id, { accommodationId })
  },
}

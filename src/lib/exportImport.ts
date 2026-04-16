import { db } from '../db/db'
import type { Trip, Day, Stop, TransportLeg, Accommodation, Expense, PackingItem, ExpenseCategory } from '../db/schema'

interface TripBundle {
  version: 1
  exportedAt: string
  trip: Trip
  days: Day[]
  stops: Stop[]
  transportLegs: TransportLeg[]
  accommodations: Accommodation[]
  expenses: Expense[]
  packingItems: PackingItem[]
}

interface FullBundle {
  version: 1
  exportedAt: string
  trips: TripBundle[]
  expenseCategories: ExpenseCategory[]
}

export async function exportTrip(tripId: string): Promise<string> {
  const trip = await db.trips.get(tripId)
  if (!trip) throw new Error(`Trip ${tripId} not found`)
  const days = await db.days.where('tripId').equals(tripId).toArray()
  const dayIds = days.map(d => d.id)
  const [stops, transportLegs, accommodations, expenses, packingItems] = await Promise.all([
    dayIds.length ? db.stops.where('dayId').anyOf(dayIds).toArray() : [],
    db.transportLegs.where('tripId').equals(tripId).toArray(),
    db.accommodations.where('tripId').equals(tripId).toArray(),
    db.expenses.where('tripId').equals(tripId).toArray(),
    db.packingItems.where('tripId').equals(tripId).toArray(),
  ])
  const bundle: TripBundle = {
    version: 1, exportedAt: new Date().toISOString(),
    trip, days, stops, transportLegs, accommodations, expenses, packingItems,
  }
  return JSON.stringify(bundle, null, 2)
}

export async function importTrip(json: string, mode: 'replace' | 'merge'): Promise<void> {
  const bundle: TripBundle = JSON.parse(json)
  if (bundle.version !== 1) throw new Error('Unsupported bundle version')
  await db.transaction('rw', [db.trips, db.days, db.stops, db.transportLegs, db.accommodations, db.expenses, db.packingItems], async () => {
    if (mode === 'replace') {
      await db.trips.put(bundle.trip)
      const existingDays = await db.days.where('tripId').equals(bundle.trip.id).toArray()
      if (existingDays.length) await db.stops.where('dayId').anyOf(existingDays.map(d => d.id)).delete()
      await db.days.where('tripId').equals(bundle.trip.id).delete()
      await db.transportLegs.where('tripId').equals(bundle.trip.id).delete()
      await db.accommodations.where('tripId').equals(bundle.trip.id).delete()
      await db.expenses.where('tripId').equals(bundle.trip.id).delete()
      await db.packingItems.where('tripId').equals(bundle.trip.id).delete()
    }
    await db.days.bulkPut(bundle.days)
    await db.stops.bulkPut(bundle.stops)
    await db.transportLegs.bulkPut(bundle.transportLegs)
    await db.accommodations.bulkPut(bundle.accommodations)
    await db.expenses.bulkPut(bundle.expenses)
    await db.packingItems.bulkPut(bundle.packingItems)
  })
}

export async function exportAll(): Promise<string> {
  const trips = await db.trips.toArray()
  const expenseCategories = await db.expenseCategories.toArray()
  const tripBundles: TripBundle[] = await Promise.all(
    trips.map(async t => JSON.parse(await exportTrip(t.id)))
  )
  const bundle: FullBundle = {
    version: 1, exportedAt: new Date().toISOString(),
    trips: tripBundles, expenseCategories,
  }
  return JSON.stringify(bundle, null, 2)
}

export async function importAll(json: string, mode: 'replace' | 'merge'): Promise<void> {
  const bundle: FullBundle = JSON.parse(json)
  if (bundle.version !== 1) throw new Error('Unsupported bundle version')
  if (mode === 'replace') {
    await Promise.all([
      db.trips.clear(), db.days.clear(), db.stops.clear(),
      db.transportLegs.clear(), db.accommodations.clear(),
      db.expenses.clear(), db.packingItems.clear(), db.expenseCategories.clear(),
    ])
  }
  await db.expenseCategories.bulkPut(bundle.expenseCategories)
  for (const tripBundle of bundle.trips) {
    await importTrip(JSON.stringify(tripBundle), 'merge')
    await db.trips.put(tripBundle.trip)
  }
}

/** Trigger a browser file download of the JSON string. */
export function downloadJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/** Read a JSON file chosen by the user. Returns the file contents as a string. */
export function readJsonFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return reject(new Error('No file selected'))
      resolve(await file.text())
    }
    input.click()
  })
}

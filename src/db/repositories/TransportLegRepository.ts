import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { TransportLeg } from '../schema'
import { DayRepository } from './DayRepository'
import { StopRepository } from './StopRepository'
import { ExpenseRepository } from './ExpenseRepository'

const METHOD_EMOJIS: Record<TransportLeg['method'], string> = {
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', walk: '🚶', boat: '⛵', ferry: '⛴️',
}

async function syncExpenseForTransportLeg(legId: string): Promise<void> {
  const leg = await db.transportLegs.get(legId)
  if (!leg) return
  const existing = await db.expenses.where('transportLegId').equals(legId).first()
  if (!leg.price || !leg.priceCurrency) {
    if (existing) await db.expenses.delete(existing.id)
    return
  }
  const fromStop = await db.stops.get(leg.fromStopId)
  const toStop = await db.stops.get(leg.toStopId)
  const note = `${METHOD_EMOJIS[leg.method]} ${fromStop?.placeName ?? '?'} → ${toStop?.placeName ?? '?'}`
  const date = leg.departureDateTime ? leg.departureDateTime.slice(0, 10) : new Date().toISOString().slice(0, 10)
  if (existing) {
    await ExpenseRepository.update(existing.id, { amount: leg.price, currency: leg.priceCurrency, note, date })
  } else {
    await ExpenseRepository.create({
      tripId: leg.tripId, categoryId: 'cat-transport',
      amount: leg.price, currency: leg.priceCurrency,
      date, note, transportLegId: legId,
    })
  }
}

export function isOvernightTransport(leg: Pick<TransportLeg, 'departureDateTime' | 'arrivalDateTime'>): boolean {
  if (!leg.departureDateTime || !leg.arrivalDateTime) return false
  return leg.arrivalDateTime.slice(0, 10) > leg.departureDateTime.slice(0, 10)
}

type CreateInput = {
  tripId: string
  fromStopId: string
  toStopId?: string          // if provided, reuse this existing stop instead of creating new
  method: TransportLeg['method']
  status: TransportLeg['status']
  departureDateTime?: string
  arrivalDateTime?: string
  destinationName: string
  destinationLat?: number
  destinationLng?: number
  price?: number
  priceCurrency?: string
  notes?: string
  bookingLink?: string
  usefulLinks?: TransportLeg['usefulLinks']
}

type UpdateInput = {
  id: string
  method?: TransportLeg['method']
  status?: TransportLeg['status']
  departureDateTime?: string
  arrivalDateTime?: string
  destinationName?: string
  destinationLat?: number
  destinationLng?: number
  price?: number
  priceCurrency?: string
  notes?: string
  bookingLink?: string
  usefulLinks?: TransportLeg['usefulLinks']
}

async function findOrCreateArrivalDay(tripId: string, arrivalDateTime: string): Promise<string> {
  const arrivalDate = arrivalDateTime.slice(0, 10)
  let day = await db.days.where('tripId').equals(tripId).filter(d => d.date === arrivalDate).first()
  if (!day) {
    const trip = await db.trips.get(tripId)
    if (!trip) throw new Error(`Trip ${tripId} not found`)
    if (arrivalDate > trip.endDate) {
      await db.transaction('rw', [db.trips, db.days], async () => {
        await db.trips.update(tripId, { endDate: arrivalDate, updatedAt: new Date().toISOString() })
        await DayRepository.regenerateForTrip(tripId, trip.startDate, arrivalDate)
      })
    }
    day = await db.days.where('tripId').equals(tripId).filter(d => d.date === arrivalDate).first()
  }
  if (!day) throw new Error(`Could not find or create day for ${arrivalDate}`)
  return day.id
}

export const TransportLegRepository = {
  useByTripId(tripId: string) {
    return useLiveQuery(
      () => db.transportLegs.where('tripId').equals(tripId).toArray(),
      [tripId]
    )
  },

  async create(input: CreateInput): Promise<string> {
    const { tripId, fromStopId, toStopId: existingToStopId, destinationName, destinationLat, destinationLng, arrivalDateTime, price, priceCurrency, ...rest } = input

    let toStopId: string
    if (existingToStopId) {
      toStopId = existingToStopId
    } else {
      let destDayId: string
      if (arrivalDateTime) {
        destDayId = await findOrCreateArrivalDay(tripId, arrivalDateTime)
      } else {
        const fromStop = await db.stops.get(fromStopId)
        if (!fromStop) throw new Error(`Stop ${fromStopId} not found`)
        destDayId = fromStop.dayId
      }

      const existingStops = await StopRepository.getByDayId(destDayId)
      toStopId = await StopRepository.create({
        dayId: destDayId,
        order: existingStops.length,
        placeName: destinationName,
        lat: destinationLat,
        lng: destinationLng,
        usefulLinks: [],
      })
    }

    const id = uuidv4()
    await db.transportLegs.add({
      id, tripId, fromStopId, toStopId, arrivalDateTime, price, priceCurrency, usefulLinks: [], ...rest,
    })
    await syncExpenseForTransportLeg(id)
    return id
  },

  async update(input: UpdateInput): Promise<void> {
    const { id, arrivalDateTime, destinationName, destinationLat, destinationLng, price, priceCurrency, ...rest } = input
    const leg = await db.transportLegs.get(id)
    if (!leg) throw new Error(`TransportLeg ${id} not found`)

    if (arrivalDateTime !== undefined && arrivalDateTime !== leg.arrivalDateTime) {
      const newDayId = await findOrCreateArrivalDay(leg.tripId, arrivalDateTime)
      await db.stops.update(leg.toStopId, { dayId: newDayId })
    }

    if (destinationName !== undefined) await db.stops.update(leg.toStopId, { placeName: destinationName })
    if (destinationLat !== undefined) await db.stops.update(leg.toStopId, { lat: destinationLat, lng: destinationLng })

    await db.transportLegs.update(id, {
      ...rest,
      ...(arrivalDateTime !== undefined && { arrivalDateTime }),
      price,
      priceCurrency,
    })
    await syncExpenseForTransportLeg(id)
  },

  async delete(id: string): Promise<void> {
    const leg = await db.transportLegs.get(id)
    if (leg) {
      await db.stops.delete(leg.toStopId)
      const expense = await db.expenses.where('transportLegId').equals(id).first()
      if (expense) await db.expenses.delete(expense.id)
    }
    await db.transportLegs.delete(id)
  },
}

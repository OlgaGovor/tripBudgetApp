import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { TransportLegRepository, isOvernightTransport } from '../TransportLegRepository'
import { DayRepository } from '../DayRepository'

beforeEach(async () => {
  await Promise.all([db.trips.clear(), db.days.clear(), db.stops.clear(), db.transportLegs.clear()])
  // Seed: trip + days + origin stop
  await db.trips.add({
    id: 'trip1', name: 'T', destination: 'D', emoji: '🌍', coverColor: '#fff',
    startDate: '2026-06-01', endDate: '2026-06-03',
    defaultCurrency: 'EUR', budget: {}, createdAt: '', updatedAt: '',
  })
  await DayRepository.generateForTrip('trip1', '2026-06-01', '2026-06-03')
  const day1 = (await db.days.where('tripId').equals('trip1').filter(d => d.date === '2026-06-01').first())!
  await db.stops.add({ id: 'stop1', dayId: day1.id, order: 0, placeName: 'Paris', usefulLinks: [] })
})

describe('isOvernightTransport', () => {
  it('returns true when arrival date is after departure date', () => {
    const leg = { departureDateTime: '2026-06-01T22:00:00', arrivalDateTime: '2026-06-02T06:00:00' }
    expect(isOvernightTransport(leg as any)).toBe(true)
  })

  it('returns false when same day', () => {
    const leg = { departureDateTime: '2026-06-01T10:00:00', arrivalDateTime: '2026-06-01T14:00:00' }
    expect(isOvernightTransport(leg as any)).toBe(false)
  })
})

describe('TransportLegRepository.create', () => {
  it('creates leg and destination stop on arrival day', async () => {
    const legId = await TransportLegRepository.create({
      tripId: 'trip1',
      fromStopId: 'stop1',
      method: 'train',
      status: 'not_booked',
      departureDateTime: '2026-06-01T22:00:00',
      arrivalDateTime: '2026-06-02T06:00:00',
      destinationName: 'Amsterdam Centraal',
    })

    const leg = await db.transportLegs.get(legId)
    expect(leg).toBeTruthy()
    expect(leg?.fromStopId).toBe('stop1')

    const destStop = await db.stops.get(leg!.toStopId)
    expect(destStop?.placeName).toBe('Amsterdam Centraal')

    const day2 = (await db.days.where('tripId').equals('trip1').filter(d => d.date === '2026-06-02').first())!
    expect(destStop?.dayId).toBe(day2.id)
  })

  it('extends trip endDate when arrival is after trip end', async () => {
    await TransportLegRepository.create({
      tripId: 'trip1',
      fromStopId: 'stop1',
      method: 'plane',
      status: 'not_booked',
      departureDateTime: '2026-06-03T23:00:00',
      arrivalDateTime: '2026-06-05T08:00:00',
      destinationName: 'Tokyo',
    })

    const trip = await db.trips.get('trip1')
    expect(trip?.endDate).toBe('2026-06-05')
    const day5 = await db.days.where('tripId').equals('trip1').filter(d => d.date === '2026-06-05').first()
    expect(day5).toBeTruthy()
  })
})

describe('TransportLegRepository.delete', () => {
  it('removes leg and its destination stop', async () => {
    const legId = await TransportLegRepository.create({
      tripId: 'trip1', fromStopId: 'stop1', method: 'bus',
      status: 'not_booked', arrivalDateTime: '2026-06-02T10:00:00', destinationName: 'Lyon',
    })
    const leg = (await db.transportLegs.get(legId))!
    const toStopId = leg.toStopId
    await TransportLegRepository.delete(legId)
    expect(await db.transportLegs.get(legId)).toBeUndefined()
    expect(await db.stops.get(toStopId)).toBeUndefined()
  })
})

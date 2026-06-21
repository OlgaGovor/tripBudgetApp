import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { AccommodationRepository } from '../AccommodationRepository'
import { DayRepository } from '../DayRepository'

beforeEach(async () => {
  await Promise.all([db.days.clear(), db.accommodations.clear()])
  await DayRepository.generateForTrip('trip1', '2026-07-01', '2026-07-05')
})

describe('AccommodationRepository.create', () => {
  it('assigns accommodationId to days within checkIn–checkOut range (exclusive checkOut)', async () => {
    const id = await AccommodationRepository.create({
      tripId: 'trip1', name: 'Hotel A', status: 'booked',
      checkIn: '2026-07-02', checkOut: '2026-07-04', usefulLinks: [],
    })
    const days = await db.days.where('tripId').equals('trip1').sortBy('date')
    expect(days.find(d => d.date === '2026-07-01')?.accommodationId).toBeUndefined()
    expect(days.find(d => d.date === '2026-07-02')?.accommodationId).toBe(id)
    expect(days.find(d => d.date === '2026-07-03')?.accommodationId).toBe(id)
    expect(days.find(d => d.date === '2026-07-04')?.accommodationId).toBeUndefined() // exclusive
    expect(days.find(d => d.date === '2026-07-05')?.accommodationId).toBeUndefined()
  })

  it('names auto-created stops after the city when one is set', async () => {
    const id = await AccommodationRepository.create({
      tripId: 'trip1', name: 'Hotel Granvia', city: 'Kyoto', status: 'booked',
      checkIn: '2026-07-02', checkOut: '2026-07-04', usefulLinks: [],
    })
    const stops = await db.stops.where('accommodationId').equals(id).toArray()
    expect(stops.length).toBeGreaterThan(0)
    expect(stops.every(s => s.placeName === 'Kyoto')).toBe(true)
  })

  it('falls back to the hotel name when no city is set', async () => {
    const id = await AccommodationRepository.create({
      tripId: 'trip1', name: 'Hotel Granvia', status: 'booked',
      checkIn: '2026-07-02', checkOut: '2026-07-04', usefulLinks: [],
    })
    const stops = await db.stops.where('accommodationId').equals(id).toArray()
    expect(stops.length).toBeGreaterThan(0)
    expect(stops.every(s => s.placeName === 'Hotel Granvia')).toBe(true)
  })
})

describe('AccommodationRepository.update', () => {
  it('re-assigns days when dates change', async () => {
    const id = await AccommodationRepository.create({
      tripId: 'trip1', name: 'Hotel A', status: 'booked',
      checkIn: '2026-07-01', checkOut: '2026-07-03', usefulLinks: [],
    })
    await AccommodationRepository.update(id, { checkIn: '2026-07-03', checkOut: '2026-07-05' })
    const days = await db.days.where('tripId').equals('trip1').sortBy('date')
    expect(days.find(d => d.date === '2026-07-01')?.accommodationId).toBeUndefined()
    expect(days.find(d => d.date === '2026-07-03')?.accommodationId).toBe(id)
    expect(days.find(d => d.date === '2026-07-04')?.accommodationId).toBe(id)
  })
})

describe('AccommodationRepository.delete', () => {
  it('clears accommodationId from all days before deleting', async () => {
    const id = await AccommodationRepository.create({
      tripId: 'trip1', name: 'Hotel A', status: 'booked',
      checkIn: '2026-07-01', checkOut: '2026-07-03', usefulLinks: [],
    })
    await AccommodationRepository.delete(id)
    expect(await db.accommodations.get(id)).toBeUndefined()
    const days = await db.days.where('tripId').equals('trip1').toArray()
    expect(days.every(d => d.accommodationId === undefined)).toBe(true)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { TripRepository } from '../TripRepository'

const BASE_TRIP = {
  name: 'Japan Trip',
  destination: 'Japan',
  emoji: '🇯🇵',
  coverColor: '#FF0000',
  startDate: '2026-05-01',
  endDate: '2026-05-03',
  defaultCurrency: 'PLN',
  budget: {},
}

beforeEach(async () => {
  await Promise.all([db.trips.clear(), db.days.clear()])
})

describe('TripRepository.create', () => {
  it('persists a trip with generated id, createdAt, updatedAt', async () => {
    const id = await TripRepository.create(BASE_TRIP)
    const saved = await db.trips.get(id)
    expect(saved).toMatchObject({ name: 'Japan Trip', id })
    expect(saved?.createdAt).toBeTruthy()
    expect(saved?.updatedAt).toBeTruthy()
  })

  it('auto-generates one Day per date in the trip range (inclusive)', async () => {
    const id = await TripRepository.create(BASE_TRIP)
    const days = await db.days.where('tripId').equals(id).sortBy('date')
    expect(days).toHaveLength(3)
    expect(days.map(d => d.date)).toEqual(['2026-05-01', '2026-05-02', '2026-05-03'])
    expect(days.map(d => d.dayNumber)).toEqual([1, 2, 3])
  })
})

describe('TripRepository.update', () => {
  it('updates fields and bumps updatedAt', async () => {
    const id = await TripRepository.create(BASE_TRIP)
    const before = (await db.trips.get(id))!.updatedAt
    await new Promise(r => setTimeout(r, 5))
    await TripRepository.update({ id, name: 'Korea Trip' })
    const saved = await db.trips.get(id)
    expect(saved?.name).toBe('Korea Trip')
    expect(saved?.updatedAt).not.toBe(before)
  })
})

describe('TripRepository.delete', () => {
  it('removes the trip and all its days', async () => {
    const id = await TripRepository.create(BASE_TRIP)
    await TripRepository.delete(id)
    expect(await db.trips.get(id)).toBeUndefined()
    const days = await db.days.where('tripId').equals(id).toArray()
    expect(days).toHaveLength(0)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db'
import { DayRepository } from '../DayRepository'

beforeEach(async () => {
  await Promise.all([db.days.clear()])
})

describe('DayRepository.generateForTrip', () => {
  it('creates sequential numbered days for each date inclusive', async () => {
    await DayRepository.generateForTrip('trip1', '2026-06-01', '2026-06-03')
    const days = await db.days.where('tripId').equals('trip1').sortBy('date')
    expect(days).toHaveLength(3)
    expect(days[0]).toMatchObject({ date: '2026-06-01', dayNumber: 1, tripId: 'trip1' })
    expect(days[2]).toMatchObject({ date: '2026-06-03', dayNumber: 3 })
  })
})

describe('DayRepository.regenerateForTrip', () => {
  it('removes days outside new range and adds missing ones', async () => {
    await DayRepository.generateForTrip('trip1', '2026-06-01', '2026-06-04')
    await DayRepository.regenerateForTrip('trip1', '2026-06-02', '2026-06-05')
    const days = await db.days.where('tripId').equals('trip1').sortBy('date')
    const dates = days.map(d => d.date)
    expect(dates).not.toContain('2026-06-01')
    expect(dates).toContain('2026-06-05')
    expect(days.map(d => d.dayNumber)).toEqual([1, 2, 3, 4])
  })

  it('preserves notes on retained days', async () => {
    await DayRepository.generateForTrip('trip1', '2026-06-01', '2026-06-03')
    const day = (await db.days.where('tripId').equals('trip1').filter(d => d.date === '2026-06-02').first())!
    await db.days.update(day.id, { notes: 'Visit temple' })
    await DayRepository.regenerateForTrip('trip1', '2026-06-01', '2026-06-04')
    const retained = await db.days.get(day.id)
    expect(retained?.notes).toBe('Visit temple')
  })
})

describe('DayRepository.updateNotes', () => {
  it('sets notes on the day', async () => {
    await DayRepository.generateForTrip('trip1', '2026-06-01', '2026-06-01')
    const day = (await db.days.where('tripId').equals('trip1').first())!
    await DayRepository.updateNotes(day.id, 'Arrival day')
    const updated = await db.days.get(day.id)
    expect(updated?.notes).toBe('Arrival day')
  })
})

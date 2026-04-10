import { beforeEach, describe, it, expect, vi } from 'vitest'
import { db } from '../../db'
import { ExpenseRepository } from '../ExpenseRepository'

// Mock currency so tests don't make real network calls
vi.mock('../../../lib/currency', () => ({
  getExchangeRates: async () => ({ rates: { EUR: 1, USD: 1.08, PLN: 4.25 }, stale: false }),
  convertAmount: (amount: number, from: string, to: string, rates: Record<string, number>) => {
    if (from === to) return amount
    return (amount / rates[from]) * rates[to]
  },
}))

beforeEach(async () => {
  await Promise.all([db.trips.clear(), db.expenses.clear()])
  await db.trips.add({
    id: 'trip1', name: 'T', destination: 'D', emoji: '✈️', coverColor: '#fff',
    startDate: '2026-06-01', endDate: '2026-06-07', defaultCurrency: 'PLN',
    budget: { dailyAmount: 200 }, createdAt: '', updatedAt: '',
  })
})

describe('ExpenseRepository.create', () => {
  it('auto-converts amount to trip default currency and stores convertedAt', async () => {
    const id = await ExpenseRepository.create({
      tripId: 'trip1', categoryId: 'cat-food',
      amount: 10, currency: 'USD', date: '2026-06-01',
    })
    const saved = await db.expenses.get(id)
    expect(saved?.amountConverted).toBeCloseTo(10 / 1.08 * 4.25, 1)
    expect(saved?.convertedAt).toBeTruthy()
  })

  it('stores original amount and currency unchanged', async () => {
    const id = await ExpenseRepository.create({
      tripId: 'trip1', categoryId: 'cat-food',
      amount: 50, currency: 'PLN', date: '2026-06-01',
    })
    const saved = await db.expenses.get(id)
    expect(saved?.amount).toBe(50)
    expect(saved?.currency).toBe('PLN')
    expect(saved?.amountConverted).toBeCloseTo(50, 1)
  })
})

describe('ExpenseRepository.getTotalConverted', () => {
  it('sums amountConverted for all trip expenses', async () => {
    await ExpenseRepository.create({ tripId: 'trip1', categoryId: 'cat-food', amount: 100, currency: 'PLN', date: '2026-06-01' })
    await ExpenseRepository.create({ tripId: 'trip1', categoryId: 'cat-food', amount: 100, currency: 'PLN', date: '2026-06-02' })
    const total = await ExpenseRepository.getTotalConverted('trip1')
    expect(total).toBeCloseTo(200, 1)
  })
})

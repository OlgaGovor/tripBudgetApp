import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '../../db/db'
import { getExchangeRates, convertAmount } from '../currency'

beforeEach(async () => { await db.exchangeRateCache.clear() })

describe('convertAmount', () => {
  const rates = { EUR: 1, USD: 1.08, PLN: 4.25, JPY: 160 }

  it('converts USD to PLN', () => {
    // 100 USD → EUR → PLN: 100 / 1.08 * 4.25 ≈ 393.52
    expect(convertAmount(100, 'USD', 'PLN', rates)).toBeCloseTo(393.52, 1)
  })

  it('returns same amount when currencies are equal', () => {
    expect(convertAmount(50, 'EUR', 'EUR', rates)).toBe(50)
  })

  it('throws for unknown currency code', () => {
    expect(() => convertAmount(100, 'XYZ', 'EUR', rates)).toThrow('Unknown currency: XYZ')
  })
})

describe('getExchangeRates', () => {
  it('fetches and caches rates when no cache exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'EUR', rates: { USD: 1.08, PLN: 4.25 } }),
    }))
    const { rates, stale } = await getExchangeRates()
    expect(rates['USD']).toBe(1.08)
    expect(stale).toBe(false)
    const cached = await db.exchangeRateCache.get('EUR')
    expect(cached).toBeTruthy()
    vi.restoreAllMocks()
  })

  it('returns stale=true and uses cache when offline and cache exists', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    await db.exchangeRateCache.put({ base: 'EUR', rates: { USD: 1.05 }, fetchedAt: oldDate })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { rates, stale } = await getExchangeRates()
    expect(rates['USD']).toBe(1.05)
    expect(stale).toBe(true)
    vi.restoreAllMocks()
  })
})

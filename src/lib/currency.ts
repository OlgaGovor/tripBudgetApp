import { db } from '../db/db'

const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?base=EUR'
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000

export async function getExchangeRates(): Promise<{ rates: Record<string, number>; stale: boolean }> {
  const cached = await db.exchangeRateCache.get('EUR')
  const age = cached ? Date.now() - new Date(cached.fetchedAt).getTime() : Infinity
  const isFresh = age < STALE_THRESHOLD_MS

  if (cached && isFresh) return { rates: { EUR: 1, ...cached.rates }, stale: false }

  try {
    const res = await fetch(FRANKFURTER_URL)
    if (!res.ok) throw new Error('Frankfurter error')
    const data: { rates: Record<string, number> } = await res.json()
    await db.exchangeRateCache.put({ base: 'EUR', rates: data.rates, fetchedAt: new Date().toISOString() })
    return { rates: { EUR: 1, ...data.rates }, stale: false }
  } catch {
    if (cached) return { rates: { EUR: 1, ...cached.rates }, stale: true }
    throw new Error('No exchange rate data available')
  }
}

/** Convert amount from one currency to another via EUR as base. */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount
  const fromRate = rates[fromCurrency]
  const toRate = rates[toCurrency]
  if (fromRate === undefined || toRate === undefined) {
    throw new Error(`Unknown currency: ${fromRate === undefined ? fromCurrency : toCurrency}`)
  }
  const inEur = amount / fromRate
  return inEur * toRate
}

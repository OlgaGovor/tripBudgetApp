import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { Expense } from '../schema'
import { getExchangeRates, convertAmount } from '../../lib/currency'

type CreateInput = {
  tripId: string
  dayId?: string
  categoryId: string
  amount: number
  currency: string
  date: string
  note?: string
  accommodationId?: string
  transportLegId?: string
}

export const ExpenseRepository = {
  useByTripId(tripId: string) {
    return useLiveQuery(
      () => db.expenses.where('tripId').equals(tripId).reverse().sortBy('date'),
      [tripId]
    )
  },

  async create(input: CreateInput): Promise<string> {
    const trip = await db.trips.get(input.tripId)
    if (!trip) throw new Error(`Trip ${input.tripId} not found`)
    const { rates } = await getExchangeRates()
    const amountConverted = convertAmount(input.amount, input.currency, trip.defaultCurrency, rates)
    const id = uuidv4()
    await db.expenses.add({
      ...input,
      id,
      amountConverted,
      convertedAt: new Date().toISOString(),
    })
    return id
  },

  async update(id: string, updates: Partial<Omit<Expense, 'id' | 'tripId'>>): Promise<void> {
    const existing = await db.expenses.get(id)
    if (!existing) throw new Error(`Expense ${id} not found`)
    let amountConverted = existing.amountConverted
    let convertedAt = existing.convertedAt
    if (updates.amount !== undefined || updates.currency !== undefined) {
      const trip = await db.trips.get(existing.tripId)
      if (trip) {
        const { rates } = await getExchangeRates()
        const amount = updates.amount ?? existing.amount
        const currency = updates.currency ?? existing.currency
        amountConverted = convertAmount(amount, currency, trip.defaultCurrency, rates)
        convertedAt = new Date().toISOString()
      }
    }
    await db.expenses.update(id, { ...updates, amountConverted, convertedAt })
  },

  async delete(id: string): Promise<void> {
    await db.expenses.delete(id)
  },

  async getTotalConverted(tripId: string): Promise<number> {
    const expenses = await db.expenses.where('tripId').equals(tripId).toArray()
    return expenses.reduce((sum, e) => sum + e.amountConverted, 0)
  },

  async getByDay(dayId: string): Promise<Expense[]> {
    return db.expenses.where('dayId').equals(dayId).toArray()
  },
}

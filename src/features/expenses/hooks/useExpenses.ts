import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/db'
import { ExpenseCategoryRepository } from '../../../db/repositories/ExpenseCategoryRepository'

export function useExpenses(tripId: string) {
  const expenses = useLiveQuery(
    () => db.expenses.where('tripId').equals(tripId).reverse().sortBy('date'),
    [tripId]
  ) ?? []
  const categories = ExpenseCategoryRepository.useAll() ?? []
  return { expenses, categories }
}

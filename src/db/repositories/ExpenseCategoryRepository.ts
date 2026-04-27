import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'
import type { ExpenseCategory } from '../schema'
import { SettingsRepository } from './SettingsRepository'

function markUpdated() {
  return SettingsRepository.update({ categoriesUpdatedAt: new Date().toISOString() })
}

export const DEFAULT_CATEGORIES: Omit<ExpenseCategory, 'id'>[] = [
  { label: 'Accommodation', color: '#4A90D9', icon: '🏨' },
  { label: 'Transport',     color: '#7B68EE', icon: '🚌' },
  { label: 'Food',          color: '#F5A623', icon: '🍕' },
  { label: 'Other',         color: '#9B9B9B', icon: '📦' },
]

export const ExpenseCategoryRepository = {
  useAll() {
    return useLiveQuery(() => db.expenseCategories.toArray(), [])
  },

  async ensureSeeded(): Promise<void> {
    const count = await db.expenseCategories.count()
    if (count > 0) return
    await db.expenseCategories.bulkAdd(
      DEFAULT_CATEGORIES.map(c => ({ ...c, id: `cat-${c.label.toLowerCase()}` }))
    )
  },

  async create(input: Omit<ExpenseCategory, 'id'>): Promise<string> {
    const id = uuidv4()
    await db.expenseCategories.add({ ...input, id })
    await markUpdated()
    return id
  },

  async update(id: string, updates: Partial<Omit<ExpenseCategory, 'id'>>): Promise<void> {
    await db.expenseCategories.update(id, updates)
    await markUpdated()
  },

  async delete(id: string): Promise<void> {
    await db.expenseCategories.delete(id)
    await markUpdated()
  },

  async resetToDefaults(): Promise<void> {
    await db.expenseCategories.clear()
    await db.expenseCategories.bulkAdd(
      DEFAULT_CATEGORIES.map(c => ({ ...c, id: `cat-${c.label.toLowerCase()}` }))
    )
    await markUpdated()
  },
}

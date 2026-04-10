import { beforeEach, describe, it, expect } from 'vitest'
import { db } from '../../db'
import { ExpenseCategoryRepository } from '../ExpenseCategoryRepository'

beforeEach(async () => { await db.expenseCategories.clear() })

describe('ExpenseCategoryRepository.ensureSeeded', () => {
  it('creates 4 default categories on first call', async () => {
    await ExpenseCategoryRepository.ensureSeeded()
    const all = await db.expenseCategories.toArray()
    expect(all).toHaveLength(4)
    expect(all.map(c => c.label)).toContain('Food')
  })

  it('does not duplicate categories on second call', async () => {
    await ExpenseCategoryRepository.ensureSeeded()
    await ExpenseCategoryRepository.ensureSeeded()
    const all = await db.expenseCategories.toArray()
    expect(all).toHaveLength(4)
  })
})

describe('ExpenseCategoryRepository.resetToDefaults', () => {
  it('replaces all categories with the 4 defaults', async () => {
    await ExpenseCategoryRepository.ensureSeeded()
    await ExpenseCategoryRepository.create({ label: 'Custom', color: '#fff', icon: '🎯' })
    await ExpenseCategoryRepository.resetToDefaults()
    const all = await db.expenseCategories.toArray()
    expect(all).toHaveLength(4)
    expect(all.every(c => ['Accommodation', 'Transport', 'Food', 'Other'].includes(c.label))).toBe(true)
  })
})

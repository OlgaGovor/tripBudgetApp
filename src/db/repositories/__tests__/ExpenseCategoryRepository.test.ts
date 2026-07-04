import { beforeEach, describe, it, expect } from 'vitest'
import { db } from '../../db'
import { ExpenseCategoryRepository } from '../ExpenseCategoryRepository'

beforeEach(async () => { await db.expenseCategories.clear() })

describe('ExpenseCategoryRepository.ensureSeeded', () => {
  it('creates the default categories on first call', async () => {
    await ExpenseCategoryRepository.ensureSeeded()
    const all = await db.expenseCategories.toArray()
    expect(all).toHaveLength(5)
    expect(all.map(c => c.label)).toContain('Food')
    expect(all.map(c => c.label)).toContain('Experience')
  })

  it('does not duplicate categories on second call', async () => {
    await ExpenseCategoryRepository.ensureSeeded()
    await ExpenseCategoryRepository.ensureSeeded()
    const all = await db.expenseCategories.toArray()
    expect(all).toHaveLength(5)
  })

  it('backfills a missing default without touching existing categories', async () => {
    await ExpenseCategoryRepository.ensureSeeded()
    await db.expenseCategories.delete('cat-experience')
    await ExpenseCategoryRepository.ensureSeeded()
    const all = await db.expenseCategories.toArray()
    expect(all.map(c => c.id)).toContain('cat-experience')
  })
})

describe('ExpenseCategoryRepository.resetToDefaults', () => {
  it('replaces all categories with the defaults', async () => {
    await ExpenseCategoryRepository.ensureSeeded()
    await ExpenseCategoryRepository.create({ label: 'Custom', color: '#fff', icon: '🎯' })
    await ExpenseCategoryRepository.resetToDefaults()
    const all = await db.expenseCategories.toArray()
    expect(all).toHaveLength(5)
    expect(all.every(c => ['Accommodation', 'Transport', 'Experience', 'Food', 'Other'].includes(c.label))).toBe(true)
  })
})

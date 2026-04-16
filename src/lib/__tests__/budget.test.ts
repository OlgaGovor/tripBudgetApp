import { describe, it, expect } from 'vitest'
import { getDailyBudgetStatus, getTotalBudgetStatus, STATUS_COLORS } from '../budget'

describe('getDailyBudgetStatus', () => {
  it('returns under when spent < 95% of cumulative budget', () => {
    // dailyAmount=100, 5 days elapsed → budget=500; spent=400 → 80%
    expect(getDailyBudgetStatus(400, 100, 5)).toBe('under')
  })

  it('returns warning when spent 95–100%', () => {
    // budget=500, spent=490 → 98%
    expect(getDailyBudgetStatus(490, 100, 5)).toBe('warning')
  })

  it('returns over when spent > 100%', () => {
    expect(getDailyBudgetStatus(510, 100, 5)).toBe('over')
  })
})

describe('getTotalBudgetStatus', () => {
  it('returns under when spent is below 95% of total', () => {
    expect(getTotalBudgetStatus(900, 1000)).toBe('under')
  })

  it('returns warning when spent is 95–100% of total', () => {
    expect(getTotalBudgetStatus(960, 1000)).toBe('warning')
  })

  it('returns over when spent exceeds total', () => {
    expect(getTotalBudgetStatus(1010, 1000)).toBe('over')
  })
})

describe('STATUS_COLORS', () => {
  it('covers all statuses with correct hex values', () => {
    expect(STATUS_COLORS).toMatchObject({
      under: '#27ae60',
      warning: '#f39c12',
      over: '#e74c3c',
    })
  })
})

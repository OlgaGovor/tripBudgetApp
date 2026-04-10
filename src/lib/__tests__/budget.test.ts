import { describe, it, expect } from 'vitest'
import { getDailyBudgetStatus, getTotalBudgetStatus } from '../budget'

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
  it('returns under when spend pace is below 95%', () => {
    // total=1000, 3/10 days elapsed → pace=300; spent=200 → 67%
    expect(getTotalBudgetStatus(200, 1000, 3, 10)).toBe('under')
  })

  it('returns warning when pace 95–100%', () => {
    expect(getTotalBudgetStatus(295, 1000, 3, 10)).toBe('warning')
  })

  it('returns over when pace exceeded', () => {
    expect(getTotalBudgetStatus(310, 1000, 3, 10)).toBe('over')
  })
})

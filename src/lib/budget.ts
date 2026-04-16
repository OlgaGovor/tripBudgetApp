export type BudgetStatus = 'under' | 'warning' | 'over'

export function getDailyBudgetStatus(
  spent: number,
  dailyAmount: number,
  daysElapsed: number
): BudgetStatus {
  const cumulativeBudget = dailyAmount * daysElapsed
  if (cumulativeBudget === 0) return 'under'
  const ratio = spent / cumulativeBudget
  if (ratio > 1) return 'over'
  if (ratio >= 0.95) return 'warning'
  return 'under'
}

export function getTotalBudgetStatus(
  spent: number,
  total: number
): BudgetStatus {
  if (total === 0) return 'under'
  const ratio = spent / total
  if (ratio > 1) return 'over'
  if (ratio >= 0.95) return 'warning'
  return 'under'
}

export const STATUS_COLORS: Record<BudgetStatus, string> = {
  under: '#27ae60',
  warning: '#f39c12',
  over: '#e74c3c',
}

// Day card uses 90% threshold and a darker yellow for legibility
export function getDayCardStatus(ratio: number): BudgetStatus {
  if (ratio > 1) return 'over'
  if (ratio >= 0.9) return 'warning'
  return 'under'
}

export const DAY_CARD_COLORS: Record<BudgetStatus, string> = {
  under: '#27ae60',
  warning: '#d4a017',
  over: '#e74c3c',
}

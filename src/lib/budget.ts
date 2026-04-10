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
  total: number,
  daysElapsed: number,
  totalDays: number
): BudgetStatus {
  if (total === 0 || totalDays === 0) return 'under'
  const pace = (daysElapsed / totalDays) * total
  if (pace === 0) return 'under'
  const ratio = spent / pace
  if (ratio > 1) return 'over'
  if (ratio >= 0.95) return 'warning'
  return 'under'
}

export const STATUS_COLORS: Record<BudgetStatus, string> = {
  under: '#27ae60',
  warning: '#f39c12',
  over: '#e74c3c',
}

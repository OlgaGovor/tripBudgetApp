import type { Trip } from '../../../db/schema'
import { getDailyBudgetStatus, getTotalBudgetStatus, STATUS_COLORS } from '../../../lib/budget'

interface Props {
  trip: Trip
  totalSpent: number
}

const BudgetBar: React.FC<Props> = ({ trip, totalSpent }) => {
  const today = new Date().toISOString().slice(0, 10)
  const start = new Date(trip.startDate + 'T00:00:00Z')
  const now = new Date(today + 'T00:00:00Z')
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86400000) + 1)

  if (!trip.budget.dailyAmount && !trip.budget.total) return null

  return (
    <div style={{ padding: '0.75rem 1rem' }}>
      {trip.budget.dailyAmount && (() => {
        const status = getDailyBudgetStatus(totalSpent, trip.budget.dailyAmount, daysElapsed)
        const cumulative = trip.budget.dailyAmount * daysElapsed
        const pct = Math.min(100, (totalSpent / cumulative) * 100)
        return (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 3 }}>
              <span>Daily budget</span>
              <span style={{ color: STATUS_COLORS[status] }}>{totalSpent.toFixed(0)} / {cumulative.toFixed(0)} {trip.defaultCurrency}</span>
            </div>
            <div style={{ height: 6, background: 'var(--ion-color-light-shade)', borderRadius: 3 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: STATUS_COLORS[status], borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
        )
      })()}
      {trip.budget.total && (() => {
        const status = getTotalBudgetStatus(totalSpent, trip.budget.total)
        const pct = Math.min(100, (totalSpent / trip.budget.total) * 100)
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 3 }}>
              <span>Total budget</span>
              <span style={{ color: STATUS_COLORS[status] }}>{totalSpent.toFixed(0)} / {trip.budget.total} {trip.defaultCurrency}</span>
            </div>
            <div style={{ height: 6, background: 'var(--ion-color-light-shade)', borderRadius: 3 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: STATUS_COLORS[status], borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default BudgetBar

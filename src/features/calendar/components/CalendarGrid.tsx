import { useMemo } from 'react'
import type { Day, Accommodation, TransportLeg } from '../../../db/schema'
import type { BudgetStatus } from '../../../lib/budget'
import DayCell from './DayCell'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1))
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

interface Props {
  year: number
  month: number
  days: Day[]
  accommodations: Accommodation[]
  legs: TransportLeg[]
  stopNamesByDayId: Record<string, string>
  budgetStatusByDate: Record<string, BudgetStatus>
  onDayClick: (date: string) => void
}

const CalendarGrid: React.FC<Props> = ({
  year, month, days, accommodations, legs,
  stopNamesByDayId, budgetStatusByDate, onDayClick,
}) => {
  const cells = useMemo(() => {
    const first = startOfMonth(year, month)
    const startOffset = (first.getUTCDay() + 6) % 7
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const grid: (string | null)[] = []
    for (let i = 0; i < startOffset; i++) grid.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(isoDate(new Date(Date.UTC(year, month, d))))
    }
    return grid
  }, [year, month])

  const dayByDate = useMemo(() => new Map(days.map(d => [d.date, d])), [days])
  const accomByDayId = useMemo(() => {
    const accomById = new Map(accommodations.map(a => [a.id, a]))
    const m = new Map<string, Accommodation>()
    days.forEach(d => {
      if (d.accommodationId) {
        const a = accomById.get(d.accommodationId)
        if (a) m.set(d.id, a)
      }
    })
    return m
  }, [days, accommodations])
  const legsByDate = useMemo(() => {
    const m = new Map<string, TransportLeg[]>()
    legs.forEach(l => {
      if (l.departureDateTime) {
        const date = l.departureDateTime.slice(0, 10)
        m.set(date, [...(m.get(date) ?? []), l])
      }
    })
    return m
  }, [legs])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
      {WEEKDAYS.map(d => (
        <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--ion-color-medium)', padding: '4px 0' }}>
          {d}
        </div>
      ))}
      {cells.map((date, i) => {
        if (!date) return <div key={`empty-${i}`} />
        const day = dayByDate.get(date)
        return (
          <DayCell
            key={date}
            calendarDate={date}
            day={day}
            accommodation={day ? accomByDayId.get(day.id) : undefined}
            departingLegs={legsByDate.get(date) ?? []}
            firstStopName={day ? stopNamesByDayId[day.id] : undefined}
            budgetStatus={budgetStatusByDate[date]}
            isInHighlightRange={false}
            onClick={() => onDayClick(date)}
          />
        )
      })}
    </div>
  )
}

export default CalendarGrid

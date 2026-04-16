import type { Day, Accommodation, TransportLeg } from '../../../db/schema'
import { getDayCardStatus, DAY_CARD_COLORS } from '../../../lib/budget'
import type { BudgetStatus } from '../../../lib/budget'
const ACCOM_COLORS: Record<Accommodation['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}
const METHOD_ICONS: Record<string, string> = {
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', walk: '🚶', boat: '⛵', ferry: '⛴️',
}
const TRANSPORT_STATUS_DOT: Record<TransportLeg['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}

interface Props {
  calendarDate: string
  day?: Day
  accommodation?: Accommodation
  departingLegs: TransportLeg[]
  firstStopName?: string
  budgetStatus?: BudgetStatus
  dailySpent?: number
  effectiveDailyBudget?: number
  isInHighlightRange: boolean
  onClick?: () => void
}

const DayCell: React.FC<Props> = ({
  calendarDate, day, accommodation, departingLegs, firstStopName,
  budgetStatus, dailySpent, effectiveDailyBudget, isInHighlightRange, onClick,
}) => {
  const dateNum = parseInt(calendarDate.slice(8), 10)
  const isTrip = !!day
  const isToday = calendarDate === new Date().toISOString().slice(0, 10)
  const hasGap = isTrip && !accommodation && !departingLegs.some(l => l.arrivalDateTime)
  const accomColor = accommodation ? ACCOM_COLORS[accommodation.status] : undefined

  return (
    <div
      onClick={isTrip ? onClick : undefined}
      style={{
        minHeight: 64,
        padding: '4px 2px',
        background: isInHighlightRange ? 'rgba(56,128,255,0.08)' : hasGap ? 'rgba(231,76,60,0.08)' : 'transparent',
        opacity: isTrip ? 1 : 0.35,
        cursor: isTrip ? 'pointer' : 'default',
        position: 'relative',
        borderRadius: 4,
        border: '0.5px solid rgba(0,0,0,0.2)',
      }}
    >
      {/* Row 1: date number + cumulative budget dot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '0.75rem', fontWeight: 600,
          ...(isToday && {
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '50%',
            background: 'var(--ion-color-primary)', color: '#fff', fontSize: '0.65rem',
          }),
        }}>{dateNum}</span>
        <span style={{
          display: 'inline-block', width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: budgetStatus ? DAY_CARD_COLORS[budgetStatus] : 'transparent',
          visibility: budgetStatus ? 'visible' : 'hidden',
        }} />
      </div>
      {day && (
        <>
          {/* Row 2: day number + daily spend amount */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '0.75rem' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--ion-color-medium)' }}>Day {day.dayNumber}</div>
            <div style={{
              fontSize: '0.55rem', fontWeight: 600,
              color: effectiveDailyBudget && dailySpent ? DAY_CARD_COLORS[getDayCardStatus(dailySpent / effectiveDailyBudget)] : 'transparent',
              visibility: effectiveDailyBudget && dailySpent ? 'visible' : 'hidden',
            }}>
              {Math.round(dailySpent ?? 0)}
            </div>
          </div>
          {/* Row 3: first stop name */}
          <div style={{ fontSize: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', minHeight: '0.75rem' }}>
            {firstStopName?.slice(0, 12) ?? ''}
          </div>
          {/* Row 4: accommodation bar */}
          <div style={{ height: 3, borderRadius: 2, marginTop: 2, background: accomColor ?? 'transparent' }} />
          {/* Row 5: transport icons */}
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 1, minHeight: '0.75rem' }}>
            {departingLegs.map((l, i) => (
              <span key={i} style={{ position: 'relative', display: 'inline-block', fontSize: '0.55rem' }}>
                {METHOD_ICONS[l.method] ?? '🚐'}
                <span style={{
                  position: 'absolute', bottom: 0, right: -1,
                  width: 4, height: 4, borderRadius: '50%',
                  background: TRANSPORT_STATUS_DOT[l.status],
                }} />
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default DayCell

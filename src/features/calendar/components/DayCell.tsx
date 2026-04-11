import type { Day, Accommodation, TransportLeg } from '../../../db/schema'
import type { BudgetStatus } from '../../../lib/budget'

const STATUS_DOT: Record<BudgetStatus, string> = { under: '#27ae60', warning: '#f39c12', over: '#e74c3c' }
const ACCOM_COLORS: Record<Accommodation['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}
const METHOD_ICONS: Record<string, string> = {
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', walk: '🚶', boat: '⛵', ferry: '⛴️',
}

interface Props {
  calendarDate: string
  day?: Day
  accommodation?: Accommodation
  departingLegs: TransportLeg[]
  firstStopName?: string
  budgetStatus?: BudgetStatus
  isInHighlightRange: boolean
  onClick?: () => void
}

const DayCell: React.FC<Props> = ({
  calendarDate, day, accommodation, departingLegs, firstStopName,
  budgetStatus, isInHighlightRange, onClick,
}) => {
  const dateNum = parseInt(calendarDate.slice(8), 10)
  const isTrip = !!day
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
      }}
    >
      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{dateNum}</span>
      {day && (
        <>
          <div style={{ fontSize: '0.6rem', color: 'var(--ion-color-medium)' }}>Day {day.dayNumber}</div>
          {firstStopName && (
            <div style={{ fontSize: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {firstStopName.slice(0, 12)}
            </div>
          )}
          {accomColor && (
            <div style={{ height: 3, background: accomColor, borderRadius: 2, marginTop: 2 }} />
          )}
          <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap', marginTop: 1 }}>
            {departingLegs.map((l, i) => (
              <span key={i} style={{ fontSize: '0.55rem' }}>{METHOD_ICONS[l.method] ?? '🚐'}</span>
            ))}
          </div>
          {budgetStatus && (
            <div style={{
              position: 'absolute', bottom: 3, right: 3,
              width: 6, height: 6, borderRadius: '50%',
              background: STATUS_DOT[budgetStatus],
            }} />
          )}
        </>
      )}
    </div>
  )
}

export default DayCell

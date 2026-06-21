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
  transitLeg?: TransportLeg
  firstStopName?: string
  budgetStatus?: BudgetStatus
  dailySpent?: number
  effectiveDailyBudget?: number
  isInHighlightRange: boolean
  onClick?: () => void
}

const DayCell: React.FC<Props> = ({
  calendarDate, day, accommodation, departingLegs, transitLeg, firstStopName,
  budgetStatus, dailySpent, effectiveDailyBudget, isInHighlightRange, onClick,
}) => {
  const dateNum = parseInt(calendarDate.slice(8), 10)
  const isTrip = !!day
  const isToday = calendarDate === new Date().toISOString().slice(0, 10)
  // An overnight transport leg spanning this night covers it instead of a hotel.
  const overnightLeg = !accommodation ? transitLeg : undefined
  const hasGap = isTrip && !accommodation && !overnightLeg && !departingLegs.some(l => l.arrivalDateTime)
  const accomColor = accommodation ? ACCOM_COLORS[accommodation.status] : undefined
  // Show the method icon on every night a leg spans (the spanning leg only departs once,
  // so add it on the in-transit nights where it isn't already a departing leg).
  const iconLegs = transitLeg && !departingLegs.includes(transitLeg)
    ? [...departingLegs, transitLeg]
    : departingLegs

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
          {/* Row 2: daily spend amount */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minHeight: '0.75rem' }}>
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
          {/* Row 4: accommodation bar (solid), or overnight-transport bar (dashed, by booking status) */}
          <div style={{
            height: 3, borderRadius: 2, marginTop: 2,
            background: accomColor
              ? accomColor
              : overnightLeg
                ? `repeating-linear-gradient(90deg, ${TRANSPORT_STATUS_DOT[overnightLeg.status]} 0 4px, transparent 4px 7px)`
                : 'transparent',
          }} />
          {/* Row 5: transport icons */}
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 1, minHeight: '0.75rem' }}>
            {iconLegs.map(l => (
              <span key={l.id} style={{ position: 'relative', display: 'inline-block', fontSize: '0.55rem' }}>
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

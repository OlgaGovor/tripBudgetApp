// src/features/planner/components/DayCard.tsx
import { useState } from 'react'
import { IonIcon } from '@ionic/react'
import { chevronDownOutline, chevronUpOutline } from 'ionicons/icons'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Accommodation, Day, Stop, TransportLeg } from '../../../db/schema'
import { db } from '../../../db/db'
import { useStops } from '../hooks/useStops'
import { DayRepository } from '../../../db/repositories/DayRepository'
import { StopRepository } from '../../../db/repositories/StopRepository'
import { getDayCardStatus, DAY_CARD_COLORS } from '../../../lib/budget'
import StopItem from './StopItem'
import TransportCard from './TransportCard'
import AccommodationDayCard from './AccommodationDayCard'
import StopFormModal from './StopFormModal'
import TransportLegFormModal from './TransportLegFormModal'

const METHOD_ICONS: Record<TransportLeg['method'], string> = {
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', walk: '🚶', boat: '⛵', ferry: '⛴️',
}
const STATUS_COLORS: Record<TransportLeg['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}

interface Props {
  day: Day
  tripId: string
  legs: TransportLeg[]
  accommodations: Accommodation[]
  dailySpent?: number
  cumulativeSpent?: number
  effectiveDailyBudget?: number
  currency?: string
}

function addDaysToDateStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

const NoteSection: React.FC<{ day: Day }> = ({ day }) => {
  const [expanded, setExpanded] = useState(false)
  const [value, setValue] = useState(day.notes ?? '')

  async function handleBlur() {
    await DayRepository.updateNotes(day.id, value)
  }

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{ padding: '0.25rem 1rem', fontSize: '0.8rem', color: 'var(--ion-color-medium)', cursor: 'pointer' }}
      >
        {day.notes ? day.notes.slice(0, 60) + (day.notes.length > 60 ? '…' : '') : '+ Add notes'}
      </div>
    )
  }

  return (
    <textarea
      autoFocus
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => { handleBlur(); setExpanded(false) }}
      placeholder="Notes for this day..."
      style={{ width: '100%', minHeight: 80, padding: '0.5rem 1rem', border: 'none', background: 'transparent', fontSize: '0.85rem', resize: 'vertical' }}
    />
  )
}

const InTransitCard: React.FC<{ leg: TransportLeg }> = ({ leg }) => {
  const fromStop = useLiveQuery(() => db.stops.get(leg.fromStopId), [leg.fromStopId])
  const toStop = useLiveQuery(() => db.stops.get(leg.toStopId), [leg.toStopId])
  const arrTime = leg.arrivalDateTime?.slice(11, 16)
  return (
    <div style={{
      margin: '8px 10px 5px', padding: '7px 10px',
      background: 'rgba(155,89,182,0.08)', borderRadius: 6,
      borderLeft: '3px solid #9b59b6',
      display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem',
    }}>
      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{METHOD_ICONS[leg.method]}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: '#444' }}>
          In transit · {fromStop?.placeName ?? '…'} → {toStop?.placeName ?? '…'}
        </div>
        {arrTime && <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 1 }}>arrives {arrTime}</div>}
      </div>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[leg.status], flexShrink: 0 }} />
    </div>
  )
}

const DayCard: React.FC<Props> = ({ day, tripId, legs, accommodations, dailySpent = 0, cumulativeSpent = 0, effectiveDailyBudget, currency }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [showStopForm, setShowStopForm] = useState(false)
  const [addLegFromStopId, setAddLegFromStopId] = useState<string | null>(null)
  const { stops } = useStops(day.id)

  const nearbyStops = useLiveQuery<Array<{ stop: Stop; dayNumber: number }>>(
    async () => {
      const endDate = addDaysToDateStr(day.date, 3)
      const nearbyDays = await db.days
        .where('tripId').equals(tripId)
        .filter(dd => dd.date >= day.date && dd.date <= endDate)
        .sortBy('date')
      const result: Array<{ stop: Stop; dayNumber: number }> = []
      for (const nd of nearbyDays) {
        const ndStops = await db.stops.where('dayId').equals(nd.id).sortBy('order')
        for (const s of ndStops) {
          result.push({ stop: s, dayNumber: nd.dayNumber })
        }
      }
      return result
    },
    [tripId, day.date]
  )

  const dayAccom = accommodations.find(a => a.id === day.accommodationId)
  const legsForStop = (stopId: string): TransportLeg[] =>
    legs.filter(l => l.fromStopId === stopId)

  const inTransitLegs = legs.filter(l => {
    if (!l.departureDateTime || !l.arrivalDateTime) return false
    const depDate = l.departureDateTime.slice(0, 10)
    const arrDate = l.arrivalDateTime.slice(0, 10)
    return depDate < day.date && day.date <= arrDate
  })

  function swapStops(i: number, j: number): string[] {
    const ids = stops.map(s => s.id)
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    return ids
  }

  return (
    <div style={{ borderRadius: 12, margin: '0.75rem 1rem', background: 'var(--ion-color-light)', overflow: 'hidden' }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 600 }}
      >
        <span style={{ flex: 1 }}>Day {day.dayNumber} · {formatDate(day.date)}</span>
        {effectiveDailyBudget && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
            {dailySpent > 0 && (
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: DAY_CARD_COLORS[getDayCardStatus(dailySpent / effectiveDailyBudget)] }}>
                {dailySpent.toFixed(0)} {currency}
              </span>
            )}
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
              background: DAY_CARD_COLORS[getDayCardStatus(cumulativeSpent / (effectiveDailyBudget * day.dayNumber))],
            }} />
          </div>
        )}
        <IonIcon icon={collapsed ? chevronDownOutline : chevronUpOutline} />
      </div>

      {!collapsed && (
        <div style={{ paddingBottom: '0.5rem' }}>
          {inTransitLegs.map(leg => (
            <InTransitCard key={leg.id} leg={leg} />
          ))}

          {stops.map((stop, i) => {
            const stopLegs = legsForStop(stop.id)
            return (
              <div key={stop.id}>
                <StopItem
                  stop={stop}
                  tripId={tripId}
                  legsFromThisStop={stopLegs}
                  canMoveUp={i > 0}
                  canMoveDown={i < stops.length - 1}
                  onMoveUp={() => StopRepository.reorder(day.id, swapStops(i, i - 1))}
                  onMoveDown={() => StopRepository.reorder(day.id, swapStops(i, i + 1))}
                />
                {stopLegs.length > 0
                  ? stopLegs.map(leg => <TransportCard key={leg.id} leg={leg} />)
                  : (
                    <div style={{ margin: '4px 10px 7px' }}>
                      <button
                        onClick={() => setAddLegFromStopId(stop.id)}
                        style={{
                          fontSize: '0.75rem', color: '#bbb', background: 'none',
                          border: '1px dashed #ddd', borderRadius: 10, padding: '3px 10px', cursor: 'pointer',
                        }}
                      >
                        ＋ add leg after {stop.placeName}
                      </button>
                    </div>
                  )
                }
              </div>
            )
          })}

          <AccommodationDayCard
            accommodation={dayAccom}
            tripId={tripId}
            initialDate={day.date}
          />

          <div
            onClick={() => setShowStopForm(true)}
            style={{
              margin: '5px 10px', padding: '7px 10px',
              borderRadius: 6, border: '1px dashed #b3c6ff', borderLeft: '3px solid #b3c6ff',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '1rem', opacity: 0.4 }}>📍</span>
            <span style={{ color: '#3880ff', fontWeight: 500 }}>＋ Add stop</span>
          </div>

          <NoteSection day={day} />
        </div>
      )}

      <StopFormModal isOpen={showStopForm} onDismiss={() => setShowStopForm(false)} tripId={tripId} dayId={day.id} />
      {addLegFromStopId && (
        <TransportLegFormModal
          isOpen={true}
          onDismiss={() => setAddLegFromStopId(null)}
          tripId={tripId}
          fromStopId={addLegFromStopId}
          nearbyStops={nearbyStops ?? []}
          initialDate={day.date}
        />
      )}
    </div>
  )
}

export default DayCard

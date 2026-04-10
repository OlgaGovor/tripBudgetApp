import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { chevronDownOutline, chevronUpOutline, addOutline } from 'ionicons/icons'
import type { Day, TransportLeg } from '../../../db/schema'
import { useStops } from '../hooks/useStops'
import { useTransportLegs } from '../hooks/useTransportLegs'
import { useAccommodations } from '../hooks/useAccommodations'
import { DayRepository } from '../../../db/repositories/DayRepository'
import { StopRepository } from '../../../db/repositories/StopRepository'
import StopItem from './StopItem'
import AccommodationBlock from './AccommodationBlock'
import StopFormModal from './StopFormModal'
import AccommodationFormModal from './AccommodationFormModal'

const METHOD_ICONS: Record<TransportLeg['method'], string> = {
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', walk: '🚶', boat: '⛵', ferry: '⛴️',
}

interface Props {
  day: Day
  tripId: string
  isLastDay?: boolean
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

const DayCard: React.FC<Props> = ({ day, tripId, isLastDay }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [showStopForm, setShowStopForm] = useState(false)
  const [showAccomForm, setShowAccomForm] = useState(false)
  const { stops } = useStops(day.id)
  const { legs } = useTransportLegs(tripId)
  const { accommodations } = useAccommodations(tripId)

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
        <IonIcon icon={collapsed ? chevronDownOutline : chevronUpOutline} />
      </div>

      {!collapsed && (
        <div style={{ paddingBottom: '0.5rem' }}>
          {dayAccom
            ? <AccommodationBlock accommodation={dayAccom} />
            : !isLastDay && (
              <IonButton fill="clear" size="small" style={{ marginLeft: '0.5rem' }} onClick={() => setShowAccomForm(true)}>
                <IonIcon icon={addOutline} /> Add accommodation
              </IonButton>
            )
          }

          {inTransitLegs.map(leg => {
            const isArrivalDay = leg.arrivalDateTime?.slice(0, 10) === day.date
            return (
              <div key={leg.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0.4rem 1rem', background: 'rgba(155,89,182,0.1)', borderRadius: 8, margin: '0.25rem 1rem',
                fontSize: '0.9rem',
              }}>
                <span>{METHOD_ICONS[leg.method]}</span>
                <span style={{ flex: 1 }}>
                  In transit
                  {isArrivalDay && leg.arrivalDateTime && (
                    <span style={{ fontSize: '0.8rem', marginLeft: 4, color: 'var(--ion-color-medium)' }}>
                      · arrives {leg.arrivalDateTime.slice(11, 16)}
                    </span>
                  )}
                </span>
              </div>
            )
          })}

          {stops.map((stop, i) => (
            <StopItem
              key={stop.id}
              stop={stop}
              tripId={tripId}
              legsFromThisStop={legsForStop(stop.id)}
              dayStops={stops}
              dayDate={day.date}
              canMoveUp={i > 0}
              canMoveDown={i < stops.length - 1}
              onMoveUp={() => StopRepository.reorder(day.id, swapStops(i, i - 1))}
              onMoveDown={() => StopRepository.reorder(day.id, swapStops(i, i + 1))}
            />
          ))}

          <IonButton fill="clear" size="small" style={{ marginLeft: '0.5rem' }} onClick={() => setShowStopForm(true)}>
            <IonIcon icon={addOutline} /> Add stop
          </IonButton>

          <NoteSection day={day} />
        </div>
      )}

      <StopFormModal isOpen={showStopForm} onDismiss={() => setShowStopForm(false)} tripId={tripId} dayId={day.id} />
      <AccommodationFormModal isOpen={showAccomForm} onDismiss={() => setShowAccomForm(false)} tripId={tripId} initialDate={day.date} />
    </div>
  )
}

export default DayCard

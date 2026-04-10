import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { chevronDownOutline, chevronUpOutline, addOutline } from 'ionicons/icons'
import type { Day, TransportLeg } from '../../../db/schema'
import { useStops } from '../hooks/useStops'
import { useTransportLegs } from '../hooks/useTransportLegs'
import { useAccommodations } from '../hooks/useAccommodations'
import { DayRepository } from '../../../db/repositories/DayRepository'
import StopItem from './StopItem'
import AccommodationBlock from './AccommodationBlock'
import StopFormModal from './StopFormModal'
import AccommodationFormModal from './AccommodationFormModal'

interface Props {
  day: Day
  tripId: string
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

const DayCard: React.FC<Props> = ({ day, tripId }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [showStopForm, setShowStopForm] = useState(false)
  const [showAccomForm, setShowAccomForm] = useState(false)
  const { stops } = useStops(day.id)
  const { legs } = useTransportLegs(tripId)
  const { accommodations } = useAccommodations(tripId)

  const dayAccom = accommodations.find(a => a.id === day.accommodationId)
  const legsForStop = (stopId: string): TransportLeg[] =>
    legs.filter(l => l.fromStopId === stopId)

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
            : (
              <IonButton fill="clear" size="small" style={{ marginLeft: '0.5rem' }} onClick={() => setShowAccomForm(true)}>
                <IonIcon icon={addOutline} /> Add accommodation
              </IonButton>
            )
          }

          {stops.map(stop => (
            <StopItem key={stop.id} stop={stop} tripId={tripId} legsFromThisStop={legsForStop(stop.id)} />
          ))}

          <IonButton fill="clear" size="small" style={{ marginLeft: '0.5rem' }} onClick={() => setShowStopForm(true)}>
            <IonIcon icon={addOutline} /> Add stop
          </IonButton>

          <NoteSection day={day} />
        </div>
      )}

      <StopFormModal isOpen={showStopForm} onDismiss={() => setShowStopForm(false)} tripId={tripId} dayId={day.id} />
      <AccommodationFormModal isOpen={showAccomForm} onDismiss={() => setShowAccomForm(false)} tripId={tripId} />
    </div>
  )
}

export default DayCard

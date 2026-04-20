// src/features/planner/components/TransportCard.tsx
import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { pencilOutline, trashOutline } from 'ionicons/icons'
import { useLiveQuery } from 'dexie-react-hooks'
import type { TransportLeg } from '../../../db/schema'
import { db } from '../../../db/db'
import { TransportLegRepository, isOvernightTransport } from '../../../db/repositories/TransportLegRepository'
import TransportLegFormModal from './TransportLegFormModal'

const METHOD_ICONS: Record<TransportLeg['method'], string> = {
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', walk: '🚶', boat: '⛵', ferry: '⛴️',
}
const STATUS_COLORS: Record<TransportLeg['status'], string> = {
  not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60',
}

interface Props { leg: TransportLeg }

const TransportCard: React.FC<Props> = ({ leg }) => {
  const [showEdit, setShowEdit] = useState(false)
  const fromStop = useLiveQuery(() => db.stops.get(leg.fromStopId), [leg.fromStopId])
  const toStop = useLiveQuery(() => db.stops.get(leg.toStopId), [leg.toStopId])
  const overnight = isOvernightTransport(leg)
  const dep = leg.departureDateTime?.slice(11, 16)
  const arr = leg.arrivalDateTime?.slice(11, 16)
  const timeStr = dep && arr ? `${dep} → ${arr}${overnight ? ' next day' : ''}` : (dep ?? '')

  return (
    <>
      <div style={{
        margin: '5px 10px', padding: '7px 10px',
        background: 'rgba(155,89,182,0.08)', borderRadius: 6,
        borderLeft: '3px solid #9b59b6',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem',
      }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{METHOD_ICONS[leg.method]}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#444' }}>
            {fromStop?.placeName ?? '…'} → {toStop?.placeName ?? '…'}
          </div>
          {timeStr && <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 1 }}>{timeStr}</div>}
        </div>
        {overnight && (
          <span style={{ fontSize: '0.7rem', background: '#9b59b6', color: '#fff', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>
            overnight
          </span>
        )}
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[leg.status], flexShrink: 0 }} />
        <IonButton fill="clear" size="small" onClick={() => setShowEdit(true)}>
          <IonIcon icon={pencilOutline} />
        </IonButton>
        <IonButton fill="clear" size="small" color="danger" onClick={() => TransportLegRepository.delete(leg.id)}>
          <IonIcon icon={trashOutline} />
        </IonButton>
      </div>
      <TransportLegFormModal
        isOpen={showEdit}
        onDismiss={() => setShowEdit(false)}
        tripId={leg.tripId}
        fromStopId={leg.fromStopId}
        leg={leg}
      />
    </>
  )
}

export default TransportCard

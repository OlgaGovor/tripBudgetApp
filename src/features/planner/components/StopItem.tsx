// src/features/planner/components/StopItem.tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { IonButton, IonIcon } from '@ionic/react'
import { chevronUpOutline, chevronDownOutline, pencilOutline, trashOutline } from 'ionicons/icons'
import type { Stop, TransportLeg } from '../../../db/schema'
import { db } from '../../../db/db'
import StopFormModal from './StopFormModal'

interface Props {
  stop: Stop
  tripId: string
  legsFromThisStop: TransportLeg[]
  canMoveUp?: boolean
  canMoveDown?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const StopItem: React.FC<Props> = ({ stop, tripId, legsFromThisStop, canMoveUp, canMoveDown, onMoveUp, onMoveDown }) => {
  const [showStopEditForm, setShowStopEditForm] = useState(false)

  const usedAsDestination = useLiveQuery(
    () => db.transportLegs.where('toStopId').equals(stop.id).first().then(leg => !!leg),
    [stop.id]
  )
  const usedInTransport = legsFromThisStop.length > 0 || !!usedAsDestination

  async function handleDelete() {
    await db.stops.delete(stop.id)
  }

  return (
    <div style={{ margin: '5px 10px', padding: '7px 10px', background: '#f8f9ff', borderRadius: 6, borderLeft: '3px solid #3880ff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontWeight: 600 }}>{stop.placeName}</span>
          {!stop.lat && <span style={{ fontSize: '0.7rem', color: 'var(--ion-color-medium)', marginLeft: 6 }}>📍 not pinned</span>}
          {stop.placeLink && (
            <a href={stop.placeLink} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontSize: '0.8rem' }}>🔗</a>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <IonButton fill="clear" size="small" disabled={!canMoveUp} onClick={onMoveUp}>
            <IonIcon icon={chevronUpOutline} />
          </IonButton>
          <IonButton fill="clear" size="small" disabled={!canMoveDown} onClick={onMoveDown}>
            <IonIcon icon={chevronDownOutline} />
          </IonButton>
          <IonButton fill="clear" size="small" onClick={() => setShowStopEditForm(true)}>
            <IonIcon icon={pencilOutline} />
          </IonButton>
          <IonButton
            fill="clear" size="small" color="danger"
            onClick={handleDelete}
            disabled={usedInTransport}
            title={usedInTransport ? 'Used in a transport leg — remove the transport first' : undefined}
          >
            <IonIcon icon={trashOutline} />
          </IonButton>
        </div>
      </div>
      <StopFormModal
        isOpen={showStopEditForm}
        onDismiss={() => setShowStopEditForm(false)}
        tripId={tripId}
        stop={stop}
      />
    </div>
  )
}

export default StopItem

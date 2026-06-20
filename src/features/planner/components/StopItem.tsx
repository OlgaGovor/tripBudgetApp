// src/features/planner/components/StopItem.tsx
import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { chevronUpOutline, chevronDownOutline } from 'ionicons/icons'
import type { Stop } from '../../../db/schema'
import StopFormModal from './StopFormModal'

interface Props {
  stop: Stop
  tripId: string
  canMoveUp?: boolean
  canMoveDown?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const StopItem: React.FC<Props> = ({ stop, tripId, canMoveUp, canMoveDown, onMoveUp, onMoveDown }) => {
  const [showStopEditForm, setShowStopEditForm] = useState(false)

  return (
    <div style={{ margin: '5px 10px', padding: '7px 10px', background: '#f8f9ff', borderRadius: 6, borderLeft: '3px solid #3880ff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span
            onClick={() => setShowStopEditForm(true)}
            style={{ fontWeight: 600, cursor: 'pointer' }}
          >
            {stop.placeName}
          </span>
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

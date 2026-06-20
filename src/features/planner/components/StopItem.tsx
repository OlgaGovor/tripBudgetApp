// src/features/planner/components/StopItem.tsx
import { useState } from 'react'
import { IonReorder, IonIcon } from '@ionic/react'
import { reorderTwoOutline } from 'ionicons/icons'
import type { Stop } from '../../../db/schema'
import StopFormModal from './StopFormModal'

interface Props {
  stop: Stop
  tripId: string
}

const StopItem: React.FC<Props> = ({ stop, tripId }) => {
  const [showStopEditForm, setShowStopEditForm] = useState(false)

  return (
    <div style={{ margin: '5px 10px', padding: '7px 10px', background: '#f8f9ff', borderRadius: 6, borderLeft: '3px solid #3880ff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IonReorder>
          <IonIcon icon={reorderTwoOutline} style={{ color: 'var(--ion-color-medium)', fontSize: '1.1rem', cursor: 'grab' }} />
        </IonReorder>
        <div style={{ flex: 1 }}>
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

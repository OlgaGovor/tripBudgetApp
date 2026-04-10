import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { addOutline, chevronUpOutline, chevronDownOutline, pencilOutline, trashOutline } from 'ionicons/icons'
import type { Stop, TransportLeg } from '../../../db/schema'
import { db } from '../../../db/db'
import { TransportLegRepository } from '../../../db/repositories/TransportLegRepository'
import TransportLegItem from './TransportLegItem'
import TransportLegFormModal from './TransportLegFormModal'
import StopFormModal from './StopFormModal'

interface Props {
  stop: Stop
  tripId: string
  legsFromThisStop: TransportLeg[]
  dayStops?: Stop[]
  dayDate?: string
  canMoveUp?: boolean
  canMoveDown?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const StopItem: React.FC<Props> = ({ stop, tripId, legsFromThisStop, dayStops, dayDate, canMoveUp, canMoveDown, onMoveUp, onMoveDown }) => {
  const [showTransportForm, setShowTransportForm] = useState(false)
  const [showStopEditForm, setShowStopEditForm] = useState(false)

  async function handleDelete() {
    const legUsingThisAsDestination = await db.transportLegs.where('toStopId').equals(stop.id).first()
    if (legUsingThisAsDestination) {
      await TransportLegRepository.delete(legUsingThisAsDestination.id)
    } else {
      await db.stops.delete(stop.id)
    }
  }

  const otherStops = dayStops?.filter(s => s.id !== stop.id)

  return (
    <div style={{ padding: '0.5rem 1rem', borderLeft: '3px solid var(--ion-color-primary)', marginLeft: '1rem', marginBottom: '0.5rem' }}>
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
          <IonButton fill="clear" size="small" color="danger" onClick={handleDelete}>
            <IonIcon icon={trashOutline} />
          </IonButton>
        </div>
      </div>

      {legsFromThisStop.map(leg => (
        <TransportLegItem key={leg.id} leg={leg} />
      ))}

      {legsFromThisStop.length === 0 && (
        <>
          <IonButton fill="clear" size="small" onClick={() => setShowTransportForm(true)}>
            <IonIcon icon={addOutline} /> Add transport
          </IonButton>
          <TransportLegFormModal
            isOpen={showTransportForm}
            onDismiss={() => setShowTransportForm(false)}
            tripId={tripId}
            fromStopId={stop.id}
            otherStops={otherStops}
            initialDate={dayDate}
          />
        </>
      )}
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

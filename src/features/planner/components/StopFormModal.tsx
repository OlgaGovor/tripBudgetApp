import { useState, useEffect } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonItem, IonLabel, IonInput,
} from '@ionic/react'
import { StopRepository } from '../../../db/repositories/StopRepository'
import type { Stop } from '../../../db/schema'
import PlaceSearchModal from './PlaceSearchModal'

interface Props {
  isOpen: boolean
  onDismiss: () => void
  tripId: string
  dayId?: string    // required when creating a new stop
  stop?: Stop       // provided when editing
}

const StopFormModal: React.FC<Props> = ({ isOpen, onDismiss, tripId: _tripId, dayId, stop }) => {
  const [placeName, setPlaceName] = useState('')
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [placeLink, setPlaceLink] = useState('')
  const [showPlaceSearch, setShowPlaceSearch] = useState(false)

  useEffect(() => {
    if (stop) {
      setPlaceName(stop.placeName)
      setLat(stop.lat)
      setLng(stop.lng)
      setPlaceLink(stop.placeLink ?? '')
    } else {
      setPlaceName(''); setLat(undefined); setLng(undefined); setPlaceLink('')
    }
  }, [stop, isOpen])

  async function handleSave() {
    if (!placeName.trim()) return
    if (stop) {
      await StopRepository.update(stop.id, { placeName, lat, lng, placeLink: placeLink || undefined })
    } else {
      const existingStops = await StopRepository.getByDayId(dayId!)
      await StopRepository.create({
        dayId: dayId!, order: existingStops.length,
        placeName, lat, lng, placeLink: placeLink || undefined, usefulLinks: [],
      })
    }
    onDismiss()
  }

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start"><IonButton onClick={onDismiss}>Cancel</IonButton></IonButtons>
            <IonTitle>{stop ? 'Edit Stop' : 'Add Stop'}</IonTitle>
            <IonButtons slot="end">
              <IonButton strong onClick={handleSave} disabled={!placeName.trim()}>Save</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem button onClick={() => setShowPlaceSearch(true)}>
            <IonLabel>
              <h3>Place</h3>
              <p>{placeName || 'Search or enter a place name...'}</p>
              {lat && <p style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>📍 {lat.toFixed(4)}, {lng?.toFixed(4)}</p>}
              {!lat && placeName && <p style={{ fontSize: '0.75rem', color: 'var(--ion-color-warning)' }}>Not pinned — tap to search</p>}
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Website / booking link</IonLabel>
            <IonInput value={placeLink} onIonInput={e => setPlaceLink(e.detail.value ?? '')} placeholder="https://..." />
          </IonItem>
        </IonContent>
      </IonModal>

      <PlaceSearchModal
        isOpen={showPlaceSearch}
        onDismiss={() => setShowPlaceSearch(false)}
        onSelect={r => { setPlaceName(r.name); setLat(r.lat); setLng(r.lng) }}
        title="Search stop"
      />
    </>
  )
}

export default StopFormModal

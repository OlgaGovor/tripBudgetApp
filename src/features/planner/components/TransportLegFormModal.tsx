import { useState, useEffect } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { TransportLegRepository } from '../../../db/repositories/TransportLegRepository'
import type { Stop, TransportLeg } from '../../../db/schema'
import { db } from '../../../db/db'
import PlaceSearchModal from './PlaceSearchModal'

const METHODS: TransportLeg['method'][] = ['car', 'bus', 'train', 'plane', 'walk', 'boat', 'ferry']
const METHOD_LABELS: Record<TransportLeg['method'], string> = {
  car: '🚗 Car', bus: '🚌 Bus', train: '🚆 Train', plane: '✈️ Plane',
  walk: '🚶 Walk', boat: '⛵ Boat', ferry: '⛴️ Ferry',
}
const STATUSES: TransportLeg['status'][] = ['not_booked', 'booked', 'booked_paid']
const STATUS_LABELS: Record<TransportLeg['status'], string> = {
  not_booked: '🔴 Not booked', booked: '🟡 Booked', booked_paid: '🟢 Booked & Paid',
}

interface Props {
  isOpen: boolean
  onDismiss: () => void
  tripId: string
  fromStopId: string
  leg?: TransportLeg
  otherStops?: Stop[]
  initialDate?: string
}

const TransportLegFormModal: React.FC<Props> = ({ isOpen, onDismiss, tripId, fromStopId, leg, otherStops, initialDate }) => {
  const [method, setMethod] = useState<TransportLeg['method']>('train')
  const [status, setStatus] = useState<TransportLeg['status']>('not_booked')
  const [departureDateTime, setDepartureDateTime] = useState('')
  const [arrivalDateTime, setArrivalDateTime] = useState('')
  const [destinationName, setDestinationName] = useState('')
  const [destinationLat, setDestinationLat] = useState<number | undefined>()
  const [destinationLng, setDestinationLng] = useState<number | undefined>()
  const [bookingLink, setBookingLink] = useState('')
  const [notes, setNotes] = useState('')
  const [showPlaceSearch, setShowPlaceSearch] = useState(false)

  const toStop = useLiveQuery<Stop | undefined>(
    () => leg?.toStopId ? db.stops.get(leg.toStopId) : Promise.resolve(undefined),
    [leg?.toStopId]
  )

  // Reinitialise all fields when modal opens or the leg being edited changes.
  // toStop is included so destination fills in once the liveQuery resolves.
  useEffect(() => {
    if (!isOpen) return
    setMethod(leg?.method ?? 'train')
    setStatus(leg?.status ?? 'not_booked')
    setDepartureDateTime(leg?.departureDateTime ?? (initialDate ? `${initialDate}T12:00` : ''))
    setArrivalDateTime(leg?.arrivalDateTime ?? '')
    setDestinationName(toStop?.placeName ?? '')
    setDestinationLat(toStop?.lat)
    setDestinationLng(toStop?.lng)
    setBookingLink(leg?.bookingLink ?? '')
    setNotes(leg?.notes ?? '')
  }, [isOpen, leg?.id, toStop]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!destinationName.trim()) return
    if (leg) {
      await TransportLegRepository.update({
        id: leg.id,
        method, status,
        departureDateTime: departureDateTime || undefined,
        arrivalDateTime: arrivalDateTime || undefined,
        destinationName,
        destinationLat,
        destinationLng,
        bookingLink: bookingLink || undefined,
        notes: notes || undefined,
      })
    } else {
      await TransportLegRepository.create({
        tripId, fromStopId, method, status,
        departureDateTime: departureDateTime || undefined,
        arrivalDateTime: arrivalDateTime || undefined,
        destinationName, destinationLat, destinationLng,
        bookingLink: bookingLink || undefined,
        notes: notes || undefined,
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
            <IonTitle>{leg ? 'Edit Transport' : 'Add Transport'}</IonTitle>
            <IonButtons slot="end">
              <IonButton strong onClick={handleSave} disabled={!destinationName.trim()}>Save</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Method</IonLabel>
            <IonSelect value={method} onIonChange={e => setMethod(e.detail.value)}>
              {METHODS.map(m => <IonSelectOption key={m} value={m}>{METHOD_LABELS[m]}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Status</IonLabel>
            <IonSelect value={status} onIonChange={e => setStatus(e.detail.value)}>
              {STATUSES.map(s => <IonSelectOption key={s} value={s}>{STATUS_LABELS[s]}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Departure date & time</IonLabel>
            <IonInput type="datetime-local" value={departureDateTime} onIonInput={e => setDepartureDateTime(e.detail.value ?? '')} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Arrival date & time</IonLabel>
            <IonInput type="datetime-local" value={arrivalDateTime} onIonInput={e => setArrivalDateTime(e.detail.value ?? '')} />
          </IonItem>
          <IonItem button onClick={() => setShowPlaceSearch(true)}>
            <IonLabel>
              <h3>Destination *</h3>
              <p>{destinationName || 'Search or enter destination...'}</p>
            </IonLabel>
          </IonItem>
          {!leg && otherStops && otherStops.length > 0 && (
            <div style={{ padding: '0.5rem 1rem 0' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', color: 'var(--ion-color-medium)' }}>Quick-select stop:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {otherStops.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setDestinationName(s.placeName); setDestinationLat(s.lat); setDestinationLng(s.lng) }}
                    style={{
                      padding: '4px 10px', borderRadius: 16,
                      background: destinationName === s.placeName ? 'var(--ion-color-primary)' : 'var(--ion-color-light)',
                      color: destinationName === s.placeName ? '#fff' : 'inherit',
                      cursor: 'pointer', fontSize: '0.85rem',
                    }}
                  >
                    {s.placeName}
                  </div>
                ))}
              </div>
            </div>
          )}
          <IonItem>
            <IonLabel position="stacked">Booking link</IonLabel>
            <IonInput value={bookingLink} onIonInput={e => setBookingLink(e.detail.value ?? '')} placeholder="https://..." />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Notes</IonLabel>
            <IonInput value={notes} onIonInput={e => setNotes(e.detail.value ?? '')} placeholder="Platform 3, seat 14A..." />
          </IonItem>
        </IonContent>
      </IonModal>

      <PlaceSearchModal
        isOpen={showPlaceSearch}
        onDismiss={() => setShowPlaceSearch(false)}
        onSelect={r => { setDestinationName(r.name); setDestinationLat(r.lat); setDestinationLng(r.lng) }}
        title="Search destination"
      />
    </>
  )
}

export default TransportLegFormModal

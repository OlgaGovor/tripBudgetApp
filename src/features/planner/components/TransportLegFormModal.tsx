import { useState, useEffect } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
} from '@ionic/react'
import { searchOutline } from 'ionicons/icons'
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
  nearbyStops?: Array<{ stop: Stop; dayNumber: number }>
  initialDate?: string
}

const TransportLegFormModal: React.FC<Props> = ({ isOpen, onDismiss, tripId, fromStopId, leg, nearbyStops, initialDate }) => {
  const [method, setMethod] = useState<TransportLeg['method']>('train')
  const [status, setStatus] = useState<TransportLeg['status']>('not_booked')
  const [departureDateTime, setDepartureDateTime] = useState('')
  const [arrivalDateTime, setArrivalDateTime] = useState('')
  const [destinationName, setDestinationName] = useState('')
  const [destinationLat, setDestinationLat] = useState<number | undefined>()
  const [destinationLng, setDestinationLng] = useState<number | undefined>()
  const [selectedToStopId, setSelectedToStopId] = useState<string | undefined>()
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
    setArrivalDateTime(leg?.arrivalDateTime ?? (initialDate ? `${initialDate}T12:00` : ''))
    setDestinationName(toStop?.placeName ?? '')
    setDestinationLat(toStop?.lat)
    setDestinationLng(toStop?.lng)
    setSelectedToStopId(undefined)
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
        tripId, fromStopId,
        toStopId: selectedToStopId,
        method, status,
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
          <IonItem>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 0' }}>
              <span style={{ flexShrink: 0, fontSize: '0.85rem', fontWeight: 500 }}>Destination *</span>
              <div style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto', paddingBottom: 2 }}>
                {!leg && nearbyStops?.map(ns => (
                  <div
                    key={ns.stop.id}
                    onClick={() => { setDestinationName(ns.stop.placeName); setDestinationLat(ns.stop.lat); setDestinationLng(ns.stop.lng); setSelectedToStopId(ns.stop.id) }}
                    style={{
                      flexShrink: 0, padding: '3px 8px', borderRadius: 10, whiteSpace: 'nowrap',
                      background: selectedToStopId === ns.stop.id ? 'var(--ion-color-primary)' : 'var(--ion-color-light-shade)',
                      color: selectedToStopId === ns.stop.id ? '#fff' : 'inherit',
                      cursor: 'pointer', fontSize: '0.82rem',
                    }}
                  >
                    {ns.stop.placeName}
                    <span style={{ fontSize: '0.72rem', opacity: 0.7, marginLeft: 3 }}>D{ns.dayNumber}</span>
                  </div>
                ))}
                {!selectedToStopId && destinationName && (
                  <div style={{
                    flexShrink: 0, padding: '3px 8px', borderRadius: 10, whiteSpace: 'nowrap',
                    background: 'var(--ion-color-primary)', color: '#fff', fontSize: '0.82rem',
                  }}>
                    {destinationName}
                  </div>
                )}
              </div>
              <IonButton fill="clear" size="small" style={{ flexShrink: 0 }} onClick={() => setShowPlaceSearch(true)}>
                <IonIcon icon={searchOutline} />
              </IonButton>
            </div>
          </IonItem>
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
        onSelect={r => { setDestinationName(r.name); setDestinationLat(r.lat); setDestinationLng(r.lng); setSelectedToStopId(undefined) }}
        title="Search destination"
      />
    </>
  )
}

export default TransportLegFormModal

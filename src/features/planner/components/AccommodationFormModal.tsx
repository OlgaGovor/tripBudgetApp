import { useState, useEffect } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
} from '@ionic/react'
import { searchOutline } from 'ionicons/icons'
import { AccommodationRepository } from '../../../db/repositories/AccommodationRepository'
import type { Accommodation } from '../../../db/schema'
import PlaceSearchModal from './PlaceSearchModal'

const STATUSES: Accommodation['status'][] = ['not_booked', 'booked', 'booked_paid']
const STATUS_LABELS: Record<Accommodation['status'], string> = {
  not_booked: '🔴 Not booked', booked: '🟡 Booked', booked_paid: '🟢 Booked & Paid',
}

interface Props {
  isOpen: boolean
  onDismiss: () => void
  tripId: string
  accommodation?: Accommodation
  initialDate?: string
}

const AccommodationFormModal: React.FC<Props> = ({ isOpen, onDismiss, tripId, accommodation, initialDate }) => {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<Accommodation['status']>('not_booked')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')
  const [placeName, setPlaceName] = useState('')
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [showPlaceSearch, setShowPlaceSearch] = useState(false)

  useEffect(() => {
    if (accommodation) {
      setName(accommodation.name)
      setStatus(accommodation.status)
      setCheckIn(accommodation.checkIn)
      setCheckOut(accommodation.checkOut)
      setLink(accommodation.link ?? '')
      setNotes(accommodation.notes ?? '')
      setPlaceName(accommodation.placeName ?? '')
      setLat(accommodation.lat)
      setLng(accommodation.lng)
    } else {
      setName(''); setStatus('not_booked')
      setCheckIn(initialDate ?? '')
      const nextDay = initialDate
        ? new Date(new Date(initialDate + 'T00:00:00Z').getTime() + 86400000).toISOString().slice(0, 10)
        : ''
      setCheckOut(nextDay)
      setLink(''); setNotes('')
      setPlaceName(''); setLat(undefined); setLng(undefined)
    }
  }, [accommodation, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!name.trim() || !checkIn || !checkOut) return
    const data = {
      tripId, name, status, checkIn, checkOut,
      link: link || undefined,
      notes: notes || undefined,
      placeName: placeName || undefined,
      lat, lng,
      usefulLinks: [] as Accommodation['usefulLinks'],
    }
    if (accommodation) {
      await AccommodationRepository.update(accommodation.id, { name, status, checkIn, checkOut, link: link || undefined, notes: notes || undefined, placeName: placeName || undefined, lat, lng })
    } else {
      await AccommodationRepository.create(data)
    }
    onDismiss()
  }

  return (
    <>
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onDismiss}>Cancel</IonButton></IonButtons>
          <IonTitle>{accommodation ? 'Edit Accommodation' : 'Add Accommodation'}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={handleSave} disabled={!name.trim() || !checkIn || !checkOut}>Save</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
          <div>
            <IonItem>
              <IonLabel position="stacked">Name *</IonLabel>
              <IonInput value={name} onIonInput={e => setName(e.detail.value ?? '')} placeholder="e.g. Hotel Granvia" />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Status</IonLabel>
              <IonSelect interface="popover" value={status} onIonChange={e => setStatus(e.detail.value)}>
                {STATUSES.map(s => <IonSelectOption key={s} value={s}>{STATUS_LABELS[s]}</IonSelectOption>)}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Check-in *</IonLabel>
              <IonInput type="date" value={checkIn} onIonInput={e => setCheckIn(e.detail.value ?? '')} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Check-out * (exclusive)</IonLabel>
              <IonInput type="date" value={checkOut} onIonInput={e => setCheckOut(e.detail.value ?? '')} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Link</IonLabel>
              <IonInput value={link} onIonInput={e => setLink(e.detail.value ?? '')} placeholder="https://..." />
            </IonItem>
            <IonItem>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 0' }}>
                <span style={{ flexShrink: 0, fontSize: '0.85rem', fontWeight: 500, color: 'var(--ion-color-medium)' }}>Place</span>
                <div style={{ flex: 1 }}>
                  {placeName && (
                    <div style={{
                      display: 'inline-block', padding: '3px 8px', borderRadius: 10,
                      background: 'var(--ion-color-primary)', color: '#fff', fontSize: '0.82rem',
                    }}>
                      {placeName}
                    </div>
                  )}
                </div>
                <IonButton fill="clear" size="small" style={{ flexShrink: 0 }} onClick={() => setShowPlaceSearch(true)}>
                  <IonIcon icon={searchOutline} />
                </IonButton>
              </div>
            </IonItem>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px 16px', minHeight: 0 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)', fontWeight: 500, marginBottom: 6, display: 'block' }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Confirmation number, check-in instructions..."
              style={{ flex: 1, resize: 'none', padding: '8px', border: '1px solid var(--ion-color-light-shade)', borderRadius: 6, fontSize: '0.9rem', fontFamily: 'inherit', background: 'transparent', minHeight: 0 }}
            />
          </div>
        </div>
      </IonContent>
    </IonModal>

    <PlaceSearchModal
      isOpen={showPlaceSearch}
      onDismiss={() => setShowPlaceSearch(false)}
      onSelect={r => { setPlaceName(r.name); setLat(r.lat); setLng(r.lng) }}
      title="Search place"
    />
    </>
  )
}

export default AccommodationFormModal

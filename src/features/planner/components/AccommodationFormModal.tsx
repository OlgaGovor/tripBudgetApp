import { useState, useEffect } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
} from '@ionic/react'
import { AccommodationRepository } from '../../../db/repositories/AccommodationRepository'
import type { Accommodation } from '../../../db/schema'

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
  const [confirmationLink, setConfirmationLink] = useState('')

  useEffect(() => {
    if (accommodation) {
      setName(accommodation.name)
      setStatus(accommodation.status)
      setCheckIn(accommodation.checkIn)
      setCheckOut(accommodation.checkOut)
      setLink(accommodation.link ?? '')
      setConfirmationLink(accommodation.confirmationLink ?? '')
    } else {
      setName(''); setStatus('not_booked')
      setCheckIn(initialDate ?? '')
      const nextDay = initialDate
        ? new Date(new Date(initialDate + 'T00:00:00Z').getTime() + 86400000).toISOString().slice(0, 10)
        : ''
      setCheckOut(nextDay)
      setLink(''); setConfirmationLink('')
    }
  }, [accommodation, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!name.trim() || !checkIn || !checkOut) return
    const data = {
      tripId, name, status, checkIn, checkOut,
      link: link || undefined,
      confirmationLink: confirmationLink || undefined,
      usefulLinks: [] as Accommodation['usefulLinks'],
    }
    if (accommodation) {
      await AccommodationRepository.update(accommodation.id, { name, status, checkIn, checkOut, link: link || undefined, confirmationLink: confirmationLink || undefined })
    } else {
      await AccommodationRepository.create(data)
    }
    onDismiss()
  }

  return (
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
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Name *</IonLabel>
          <IonInput value={name} onIonInput={e => setName(e.detail.value ?? '')} placeholder="e.g. Hotel Granvia" />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Status</IonLabel>
          <IonSelect value={status} onIonChange={e => setStatus(e.detail.value)}>
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
          <IonLabel position="stacked">Property website</IonLabel>
          <IonInput value={link} onIonInput={e => setLink(e.detail.value ?? '')} placeholder="https://..." />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Confirmation / booking link</IonLabel>
          <IonInput value={confirmationLink} onIonInput={e => setConfirmationLink(e.detail.value ?? '')} placeholder="https://..." />
        </IonItem>
      </IonContent>
    </IonModal>
  )
}

export default AccommodationFormModal

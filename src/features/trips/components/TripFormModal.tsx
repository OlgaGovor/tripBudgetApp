import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonInput, IonItem, IonLabel, IonSelect, IonSelectOption,
} from '@ionic/react'
import { useState } from 'react'
import { TripRepository } from '../../../db/repositories/TripRepository'
import type { Trip } from '../../../db/schema'

const COLORS = ['#e8f4e8', '#fef3cd', '#d1ecf1', '#f8d7da', '#e2e3e5', '#d4edda']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN', 'JPY', 'CHF', 'AUD', 'CAD']

interface Props {
  isOpen: boolean
  onDismiss: () => void
  trip?: Trip
}

const TripFormModal: React.FC<Props> = ({ isOpen, onDismiss, trip }) => {
  const [name, setName] = useState(trip?.name ?? '')
  const [destination, setDestination] = useState(trip?.destination ?? '')
  const [emoji, setEmoji] = useState(trip?.emoji ?? '✈️')
  const [coverColor, setCoverColor] = useState(trip?.coverColor ?? COLORS[0])
  const [startDate, setStartDate] = useState(trip?.startDate ?? '')
  const [endDate, setEndDate] = useState(trip?.endDate ?? '')
  const [currency, setCurrency] = useState(trip?.defaultCurrency ?? 'EUR')

  async function handleSave() {
    if (!name.trim() || !startDate || !endDate) return
    if (trip) {
      await TripRepository.update({ id: trip.id, name, destination, emoji, coverColor, startDate, endDate, defaultCurrency: currency })
    } else {
      await TripRepository.create({ name, destination, emoji, coverColor, startDate, endDate, defaultCurrency: currency, budget: {} })
    }
    onDismiss()
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>{trip ? 'Edit Trip' : 'New Trip'}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={handleSave} disabled={!name.trim() || !startDate || !endDate}>
              Save
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Trip name *</IonLabel>
          <IonInput value={name} onIonInput={e => setName(e.detail.value ?? '')} placeholder="e.g. Japan 2026" />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Destination</IonLabel>
          <IonInput value={destination} onIonInput={e => setDestination(e.detail.value ?? '')} placeholder="e.g. Tokyo, Japan" />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Emoji</IonLabel>
          <IonInput value={emoji} onIonInput={e => setEmoji(e.detail.value ?? '')} placeholder="🇯🇵" />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Start date *</IonLabel>
          <IonInput type="date" value={startDate} onIonInput={e => setStartDate(e.detail.value ?? '')} />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">End date *</IonLabel>
          <IonInput type="date" value={endDate} onIonInput={e => setEndDate(e.detail.value ?? '')} />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Default currency</IonLabel>
          <IonSelect value={currency} onIonChange={e => setCurrency(e.detail.value)}>
            {CURRENCIES.map(c => <IonSelectOption key={c} value={c}>{c}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
        <div style={{ padding: '1rem 0 0.5rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>Card colour</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map(c => (
              <div
                key={c}
                onClick={() => setCoverColor(c)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: c,
                  border: coverColor === c ? '3px solid var(--ion-color-primary)' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </IonContent>
    </IonModal>
  )
}

export default TripFormModal

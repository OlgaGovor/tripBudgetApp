import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonInput, IonItem, IonLabel, IonSelect, IonSelectOption,
} from '@ionic/react'
import { useState, useEffect } from 'react'
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
  const [budgetTotal, setBudgetTotal] = useState(trip?.budget.total?.toString() ?? '')
  const [budgetDaily, setBudgetDaily] = useState(trip?.budget.dailyAmount?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  // Sync form fields when trip data first becomes available (e.g. loaded from DB after mount)
  useEffect(() => {
    setName(trip?.name ?? '')
    setDestination(trip?.destination ?? '')
    setEmoji(trip?.emoji ?? '✈️')
    setCoverColor(trip?.coverColor ?? COLORS[0])
    setStartDate(trip?.startDate ?? '')
    setEndDate(trip?.endDate ?? '')
    setCurrency(trip?.defaultCurrency ?? 'EUR')
    setBudgetTotal(trip?.budget.total?.toString() ?? '')
    setBudgetDaily(trip?.budget.dailyAmount?.toString() ?? '')
  }, [trip?.id])

  const dateValid = !startDate || !endDate || endDate >= startDate

  async function handleSave() {
    if (saving || !name.trim() || !startDate || !endDate || !dateValid) return
    setSaving(true)
    try {
      const budget = {
        total: budgetTotal ? parseFloat(budgetTotal) : undefined,
        dailyAmount: budgetDaily ? parseFloat(budgetDaily) : undefined,
      }
      if (trip) {
        await TripRepository.update({ id: trip.id, name, destination, emoji, coverColor, startDate, endDate, defaultCurrency: currency, budget })
      } else {
        await TripRepository.create({ name, destination, emoji, coverColor, startDate, endDate, defaultCurrency: currency, budget })
      }
      onDismiss()
    } finally {
      setSaving(false)
    }
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
            <IonButton strong onClick={handleSave} disabled={saving || !name.trim() || !startDate || !endDate || !dateValid}>
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
          <IonInput
            type="date"
            value={endDate}
            onIonFocus={() => {
              if (!endDate) setEndDate(startDate || new Date().toISOString().slice(0, 10))
            }}
            onIonInput={e => setEndDate(e.detail.value ?? '')}
          />
        </IonItem>
        {!dateValid && <p style={{ color: 'var(--ion-color-danger)', fontSize: '0.75rem', margin: '0 1rem 0.5rem' }}>End date must be on or after start date</p>}
        <IonItem>
          <IonLabel position="stacked">Default currency</IonLabel>
          <IonSelect value={currency} onIonChange={e => setCurrency(e.detail.value)}>
            {CURRENCIES.map(c => <IonSelectOption key={c} value={c}>{c}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Total budget ({currency})</IonLabel>
          <IonInput
            type="number"
            min="0"
            value={budgetTotal}
            onIonInput={e => setBudgetTotal(e.detail.value ?? '')}
            placeholder="e.g. 3000"
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Daily budget ({currency})</IonLabel>
          <IonInput
            type="number"
            min="0"
            value={budgetDaily}
            onIonInput={e => setBudgetDaily(e.detail.value ?? '')}
            placeholder="e.g. 150"
          />
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

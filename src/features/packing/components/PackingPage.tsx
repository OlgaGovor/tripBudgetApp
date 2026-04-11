import { useState } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonFab, IonFabButton, IonIcon, IonModal, IonButtons, IonButton,
  IonItem, IonLabel, IonInput,
} from '@ionic/react'
import { add } from 'ionicons/icons'
import { useParams } from 'react-router-dom'
import { usePacking } from '../hooks/usePacking'
import { TripRepository } from '../../../db/repositories/TripRepository'
import { PackingRepository } from '../../../db/repositories/PackingRepository'
import PackingItemRow from './PackingItemRow'

const PackingPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const { items } = usePacking(tripId)
  const trips = TripRepository.useAll() ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [label, setLabel] = useState('')
  const [weight, setWeight] = useState('')

  const totalGrams = items.reduce((s, i) => s + (i.weightGrams ?? 0), 0)
  const checkedCount = items.filter(i => i.checked).length

  async function handleAdd() {
    if (!label.trim()) return
    await PackingRepository.create({
      tripId, label: label.trim(), checked: false,
      order: items.length,
      weightGrams: parseInt(weight) || undefined,
    })
    setLabel(''); setWeight(''); setShowAdd(false)
  }

  async function handleCopyFromTrip(sourceTripId: string) {
    await PackingRepository.copyFromTrip(sourceTripId, tripId)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Packing</IonTitle>
          <IonButtons slot="end">
            {trips.filter(t => t.id !== tripId && items.length === 0).length > 0 && (
              <IonButton onClick={() => {
                const other = trips.find(t => t.id !== tripId)
                if (other) handleCopyFromTrip(other.id)
              }}>
                Copy from trip
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {items.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--ion-color-medium)' }}>No items yet</p>
        )}
        {items.map(item => <PackingItemRow key={item.id} item={item} />)}
        <div style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--ion-color-medium)', textAlign: 'right' }}>
          {checkedCount}/{items.length} packed · {(totalGrams / 1000).toFixed(1)} kg total
        </div>
      </IonContent>
      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton onClick={() => setShowAdd(true)}><IonIcon icon={add} /></IonFabButton>
      </IonFab>
      <IonModal isOpen={showAdd} onDidDismiss={() => setShowAdd(false)} breakpoints={[0, 0.4]} initialBreakpoint={0.4}>
        <IonHeader><IonToolbar>
          <IonTitle>Add item</IonTitle>
          <IonButtons slot="end"><IonButton strong onClick={handleAdd} disabled={!label.trim()}>Add</IonButton></IonButtons>
        </IonToolbar></IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Item name *</IonLabel>
            <IonInput value={label} onIonInput={e => setLabel(e.detail.value ?? '')} placeholder="e.g. Passport" autoFocus />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Weight (grams)</IonLabel>
            <IonInput type="number" value={weight} onIonInput={e => setWeight(e.detail.value ?? '')} placeholder="optional" />
          </IonItem>
        </IonContent>
      </IonModal>
    </IonPage>
  )
}

export default PackingPage

import { useState } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonFab, IonFabButton, IonIcon, IonModal, IonButtons, IonButton,
  IonItem, IonLabel, IonInput,
} from '@ionic/react'
import { add, homeOutline } from 'ionicons/icons'
import { useParams, useHistory } from 'react-router-dom'
import { usePacking } from '../hooks/usePacking'
import { TripRepository } from '../../../db/repositories/TripRepository'
import { PackingRepository } from '../../../db/repositories/PackingRepository'
import PackingItemRow from './PackingItemRow'
import type { PackingItem } from '../../../db/schema'

const PackingPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const history = useHistory()
  const { items } = usePacking(tripId)
  const trips = TripRepository.useAll() ?? []
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [label, setLabel] = useState('')
  const [weight, setWeight] = useState('')

  const totalGrams = items.reduce((s, i) => s + (i.weightGrams ?? 0), 0)
  const checkedCount = items.filter(i => i.checked).length
  const modalOpen = showAdd || !!editingItem

  function openAdd() {
    setLabel(''); setWeight(''); setEditingItem(null); setShowAdd(true)
  }

  function openEdit(item: PackingItem) {
    setLabel(item.label); setWeight(item.weightGrams ? String(item.weightGrams) : ''); setEditingItem(item); setShowAdd(false)
  }

  function closeModal() {
    setShowAdd(false); setEditingItem(null); setLabel(''); setWeight('')
  }

  async function handleSave() {
    if (!label.trim()) return
    if (editingItem) {
      await PackingRepository.update(editingItem.id, {
        label: label.trim(),
        weightGrams: parseInt(weight) || undefined,
      })
    } else {
      await PackingRepository.create({
        tripId, label: label.trim(), checked: false,
        order: items.length,
        weightGrams: parseInt(weight) || undefined,
      })
    }
    closeModal()
  }

  async function handleCopyFromTrip(sourceTripId: string) {
    await PackingRepository.copyFromTrip(sourceTripId, tripId)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.push('/')}><IonIcon icon={homeOutline} /></IonButton>
          </IonButtons>
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
        {items.map(item => <PackingItemRow key={item.id} item={item} onEdit={openEdit} />)}
        <div style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--ion-color-medium)', textAlign: 'right' }}>
          {checkedCount}/{items.length} packed · {(totalGrams / 1000).toFixed(1)} kg total
        </div>
      </IonContent>
      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton onClick={openAdd}><IonIcon icon={add} /></IonFabButton>
      </IonFab>
      <IonModal isOpen={modalOpen} onDidDismiss={closeModal} breakpoints={[0, 0.4]} initialBreakpoint={0.4}>
        <IonHeader><IonToolbar>
          <IonButtons slot="start"><IonButton onClick={closeModal}>Cancel</IonButton></IonButtons>
          <IonTitle>{editingItem ? 'Edit item' : 'Add item'}</IonTitle>
          <IonButtons slot="end"><IonButton strong onClick={handleSave} disabled={!label.trim()}>{editingItem ? 'Save' : 'Add'}</IonButton></IonButtons>
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

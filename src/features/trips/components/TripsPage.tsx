import {
  IonContent, IonFab, IonFabButton, IonHeader, IonIcon,
  IonPage, IonTitle, IonToolbar, IonButtons, IonButton,
  useIonAlert,
} from '@ionic/react'
import { add, settingsOutline } from 'ionicons/icons'
import { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { useTrips } from '../hooks/useTrips'
import TripCard from './TripCard'
import TripFormModal from './TripFormModal'
import SyncStatusBadge from '../../../components/SyncStatusBadge'
import { TripRepository } from '../../../db/repositories/TripRepository'
import type { Trip } from '../../../db/schema'

const TripsPage: React.FC = () => {
  const { trips } = useTrips()
  const [showForm, setShowForm] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | undefined>()
  const [offline, setOffline] = useState(!navigator.onLine)
  const [present] = useIonAlert()
  const history = useHistory()

  function confirmDelete(trip: Trip) {
    present({
      header: 'Delete trip',
      message: `Delete "${trip.name}"? This will permanently remove all days, stops, expenses, and packing items.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => TripRepository.delete(trip.id) },
      ],
    })
  }

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Trips <SyncStatusBadge /></IonTitle>
          <IonButtons slot="end">
            <IonButton routerLink="/settings">
              <IonIcon icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {offline && (
          <div style={{ background: '#f39c12', color: '#fff', padding: '0.5rem 1rem', fontSize: '0.85rem', textAlign: 'center' }}>
            ⚠️ Offline — showing cached data
          </div>
        )}
        {trips.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--ion-color-medium)' }}>
            No trips yet — tap + to create one
          </p>
        )}
        {trips.map(trip => (
          <TripCard
            key={trip.id}
            trip={trip}
            onClick={() => history.push(`/trips/${trip.id}/plan`)}
            onEdit={() => setEditingTrip(trip)}
            onDelete={() => confirmDelete(trip)}
          />
        ))}
      </IonContent>

      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton onClick={() => setShowForm(true)}>
          <IonIcon icon={add} />
        </IonFabButton>
      </IonFab>

      <TripFormModal isOpen={showForm} onDismiss={() => setShowForm(false)} />
      {editingTrip && (
        <TripFormModal isOpen onDismiss={() => setEditingTrip(undefined)} trip={editingTrip} />
      )}
    </IonPage>
  )
}

export default TripsPage

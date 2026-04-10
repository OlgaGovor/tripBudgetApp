import {
  IonContent, IonFab, IonFabButton, IonHeader, IonIcon,
  IonPage, IonTitle, IonToolbar, IonButtons, IonButton,
} from '@ionic/react'
import { add, settingsOutline } from 'ionicons/icons'
import { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useTrips } from '../hooks/useTrips'
import TripCard from './TripCard'
import TripFormModal from './TripFormModal'

const TripsPage: React.FC = () => {
  const { trips } = useTrips()
  const [showForm, setShowForm] = useState(false)
  const history = useHistory()

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Trips</IonTitle>
          <IonButtons slot="end">
            <IonButton routerLink="/settings">
              <IonIcon icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
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
          />
        ))}
      </IonContent>

      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton onClick={() => setShowForm(true)}>
          <IonIcon icon={add} />
        </IonFabButton>
      </IonFab>

      <TripFormModal isOpen={showForm} onDismiss={() => setShowForm(false)} />
    </IonPage>
  )
}

export default TripsPage

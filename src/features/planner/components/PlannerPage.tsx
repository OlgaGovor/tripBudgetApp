import { useState } from 'react'
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon } from '@ionic/react'
import { ellipsisVertical, homeOutline } from 'ionicons/icons'
import { useParams, useHistory } from 'react-router-dom'
import { useDays } from '../hooks/useDays'
import { TripRepository } from '../../../db/repositories/TripRepository'
import DayCard from './DayCard'
import TripFormModal from '../../trips/components/TripFormModal'

const PlannerPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const { days } = useDays(tripId)
  const trip = TripRepository.useById(tripId)
  const history = useHistory()
  const [showEditTrip, setShowEditTrip] = useState(false)

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.push('/')}>
              <IonIcon icon={homeOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>Plan</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowEditTrip(true)}>
              <IonIcon icon={ellipsisVertical} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {days.map((day, i) => (
          <DayCard key={day.id} day={day} tripId={tripId} isLastDay={i === days.length - 1} />
        ))}
      </IonContent>
      {trip && (
        <TripFormModal
          isOpen={showEditTrip}
          onDismiss={() => setShowEditTrip(false)}
          trip={trip}
        />
      )}
    </IonPage>
  )
}

export default PlannerPage

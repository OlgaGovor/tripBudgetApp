import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon } from '@ionic/react'
import { ellipsisVertical } from 'ionicons/icons'
import { useParams } from 'react-router-dom'
import { useDays } from '../hooks/useDays'
import DayCard from './DayCard'

const PlannerPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const { days } = useDays(tripId)

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Plan</IonTitle>
          <IonButtons slot="end">
            <IonButton>
              <IonIcon icon={ellipsisVertical} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {days.map(day => (
          <DayCard key={day.id} day={day} tripId={tripId} />
        ))}
      </IonContent>
    </IonPage>
  )
}

export default PlannerPage

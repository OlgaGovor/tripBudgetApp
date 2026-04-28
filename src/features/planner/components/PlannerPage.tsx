import { useState } from 'react'
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon } from '@ionic/react'
import { ellipsisVertical, homeOutline } from 'ionicons/icons'
import { useParams, useHistory } from 'react-router-dom'
import { useDays } from '../hooks/useDays'
import { useTransportLegs } from '../hooks/useTransportLegs'
import { useAccommodations } from '../hooks/useAccommodations'
import { useExpenses } from '../../expenses/hooks/useExpenses'
import { TripRepository } from '../../../db/repositories/TripRepository'
import DayCard from './DayCard'
import TripFormModal from '../../trips/components/TripFormModal'
import { useProgressiveCount } from '../../../lib/useProgressiveCount'

const PlannerPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const { days } = useDays(tripId)
  const trip = TripRepository.useById(tripId)
  const { legs } = useTransportLegs(tripId)
  const { accommodations } = useAccommodations(tripId)
  const { expenses } = useExpenses(tripId)
  const history = useHistory()
  const [showEditTrip, setShowEditTrip] = useState(false)

  const visibleDayCount = useProgressiveCount(days.length, 5)

  const effectiveDailyBudget: number | undefined = trip
    ? (trip.budget.dailyAmount || (trip.budget.total && days.length > 0 ? trip.budget.total / days.length : undefined))
    : undefined

  const spentByDate: Record<string, number> = {}
  for (const e of expenses) {
    spentByDate[e.date] = (spentByDate[e.date] ?? 0) + e.amountConverted
  }
  let running = 0
  const cumulativeByDayId: Record<string, number> = {}
  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    running += spentByDate[day.date] ?? 0
    cumulativeByDayId[day.id] = running
  }

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
            <IonButton onClick={() => history.push(`/trips/${tripId}/summary`)}>
              <IonIcon icon={ellipsisVertical} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {days.slice(0, visibleDayCount).map((day) => (
          <DayCard
            key={day.id}
            day={day}
            tripId={tripId}
            legs={legs}
            accommodations={accommodations}
            dailySpent={spentByDate[day.date] ?? 0}
            cumulativeSpent={cumulativeByDayId[day.id] ?? 0}
            effectiveDailyBudget={effectiveDailyBudget}
            currency={trip?.defaultCurrency}
          />
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

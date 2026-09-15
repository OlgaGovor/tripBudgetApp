import { useState } from 'react'
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  useIonViewWillEnter,
} from '@ionic/react'
import { ellipsisVertical, homeOutline } from 'ionicons/icons'
import { useParams, useHistory } from 'react-router-dom'
import { db } from '../../../db/db'
import { useDays } from '../hooks/useDays'
import { useTransportLegs } from '../hooks/useTransportLegs'
import { useAccommodations } from '../hooks/useAccommodations'
import { useExpenses } from '../../expenses/hooks/useExpenses'
import { TripRepository } from '../../../db/repositories/TripRepository'
import DayCard from './DayCard'
import TripFormModal from '../../trips/components/TripFormModal'
import ExpenseFormModal from '../../expenses/components/ExpenseFormModal'
import { useProgressiveCount } from '../../../lib/useProgressiveCount'

/** Local (not UTC) YYYY-MM-DD for today, matching how day.date is stored. */
function localTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const PlannerPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const { days } = useDays(tripId)
  const trip = TripRepository.useById(tripId)
  const { legs } = useTransportLegs(tripId)
  const { accommodations } = useAccommodations(tripId)
  const { expenses, categories } = useExpenses(tripId)
  const history = useHistory()

  const [showEditTrip, setShowEditTrip] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  const visibleDayCount = useProgressiveCount(days.length, 5)

  // Today as a local YYYY-MM-DD string (day.date is stored this way; days are date-sorted).
  const [todayStr] = useState(localTodayString)

  // Plan/Calendar are cached tabs, so scroll on view-enter (fires every time the tab is
  // shown) rather than via effects. Reads days fresh from the DB to avoid stale closures,
  // and retries because day cards render progressively after the page mounts.
  useIonViewWillEnter(() => {
    const requested = new URLSearchParams(window.location.search).get('date')

    async function scrollWhenReady(attempt = 0) {
      const d = await db.days.where('tripId').equals(tripId).sortBy('date')

      let idx = requested
          ? d.findIndex(x => x.date === requested)
          : -1

      if (idx < 0) {
        const t = d.findIndex(x => x.date >= todayStr)
        idx = t === -1 ? d.length - 1 : t
      }

      if (idx < 0 || idx >= d.length) return

      const el = document.getElementById(`day-card-${d[idx].id}`)

      if (el) {
        el.scrollIntoView({
          block: 'start',
        })
        return
      }

      if (attempt < 25) {
        setTimeout(() => scrollWhenReady(attempt + 1), 80)
      }
    }

    scrollWhenReady()
  })

  const effectiveDailyBudget: number | undefined = trip
      ? (
          trip.budget.dailyAmount ||
          (
              trip.budget.total &&
              days.length > 0
                  ? trip.budget.total / days.length
                  : undefined
          )
      )
      : undefined

  const spentByDate: Record<string, number> = {}

  for (const e of expenses) {
    if (e.categoryId === 'cat-accommodation' && e.accommodationId) {
      const accommodation = accommodations.find(
          a => a.id === e.accommodationId
      )

      if (accommodation) {
        const checkIn = new Date(
            accommodation.checkIn + 'T00:00:00Z'
        )

        const checkOut = new Date(
            accommodation.checkOut + 'T00:00:00Z'
        )

        const nights = Math.round(
            (checkOut.getTime() - checkIn.getTime()) /
            (1000 * 60 * 60 * 24)
        )

        if (nights > 0) {
          const dailyAmount = e.amountConverted / nights

          for (let i = 0; i < nights; i++) {
            const date = new Date(checkIn)
            date.setUTCDate(date.getUTCDate() + i)

            const dateKey = date.toISOString().slice(0, 10)

            spentByDate[dateKey] =
                (spentByDate[dateKey] ?? 0) + dailyAmount
          }

          continue
        }
      }
    }

    spentByDate[e.date] =
        (spentByDate[e.date] ?? 0) + e.amountConverted
  }

  let running = 0

  const cumulativeByDayId: Record<string, number> = {}

  for (const day of [...days].sort(
      (a, b) => a.date.localeCompare(b.date)
  )) {
    running += spentByDate[day.date] ?? 0
    cumulativeByDayId[day.id] = running
  }

  return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => history.push('/trips')}>
                <IonIcon icon={homeOutline} />
              </IonButton>
            </IonButtons>

            <IonTitle>Plan</IonTitle>

            <IonButtons slot="end">
              <IonButton
                  onClick={() =>
                      history.push(`/trips/${tripId}/summary`)
                  }
              >
                <IonIcon icon={ellipsisVertical} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          {days.slice(0, visibleDayCount).map(day => (
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
                  defaultCollapsed={day.date < todayStr}
                  domId={`day-card-${day.id}`}
              />
          ))}
        </IonContent>

        {trip && (
            <>
              <div
                  style={{
                    position: 'fixed',
                    right: '16px',
                    bottom: '16px',
                    zIndex: 1000,
                  }}
              >
                <IonButton
                    shape="round"
                    onClick={() => setShowExpenseForm(true)}
                >
                  + Expense
                </IonButton>
              </div>

              <ExpenseFormModal
                  isOpen={showExpenseForm}
                  onDismiss={() => setShowExpenseForm(false)}
                  tripId={tripId}
                  tripCurrency={trip.defaultCurrency}
                  categories={categories}
              />

              <TripFormModal
                  isOpen={showEditTrip}
                  onDismiss={() => setShowEditTrip(false)}
                  trip={trip}
              />
            </>
        )}
      </IonPage>
  )
}

export default PlannerPage
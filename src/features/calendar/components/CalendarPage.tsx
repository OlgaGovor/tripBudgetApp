import { useMemo, useState, useEffect, useRef } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon,
} from '@ionic/react'
import { homeOutline } from 'ionicons/icons'
import { useParams, useHistory } from 'react-router-dom'
import { useDays } from '../../planner/hooks/useDays'
import { useTransportLegs } from '../../planner/hooks/useTransportLegs'
import { useAccommodations } from '../../planner/hooks/useAccommodations'
import { useExpenses } from '../../expenses/hooks/useExpenses'
import { StopRepository } from '../../../db/repositories/StopRepository'
import { TripRepository } from '../../../db/repositories/TripRepository'
import CalendarGrid from './CalendarGrid'
import { getDayCardStatus, type BudgetStatus } from '../../../lib/budget'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function monthsBetween(startDate: string, endDate: string): Array<{ year: number; month: number }> {
  const result: Array<{ year: number; month: number }> = []
  const start = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  let cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  while (cur <= end) {
    result.push({ year: cur.getUTCFullYear(), month: cur.getUTCMonth() })
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1))
  }
  return result
}

const CalendarPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const { days } = useDays(tripId)
  const { legs } = useTransportLegs(tripId)
  const { accommodations } = useAccommodations(tripId)
  const { expenses } = useExpenses(tripId)
  const trip = TripRepository.useById(tripId)
  const history = useHistory()

  const today = new Date().toISOString().slice(0, 10)

  const [stopNamesByDayId, setStopNamesByDayId] = useState<Record<string, string>>({})
  useEffect(() => {
    Promise.all(
      days.map(async d => {
        const stops = await StopRepository.getByDayId(d.id)
        return [d.id, stops[0]?.placeName ?? ''] as [string, string]
      })
    ).then(pairs => setStopNamesByDayId(Object.fromEntries(pairs)))
  }, [days])

  const months = useMemo(
    () => trip ? monthsBetween(trip.startDate, trip.endDate) : [],
    [trip]
  )

  // Scroll to the right month once months are available
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrolled = useRef(false)
  useEffect(() => {
    if (!trip || scrolled.current || months.length === 0) return
    scrolled.current = true
    const targetDate = (today >= trip.startDate && today <= trip.endDate) ? today : trip.startDate
    const key = targetDate.slice(0, 7)
    requestAnimationFrame(() => {
      monthRefs.current[key]?.scrollIntoView({ behavior: 'instant' })
    })
  }, [months]) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveDailyBudget: number | undefined = trip
    ? (trip.budget.dailyAmount || (trip.budget.total && days.length > 0 ? trip.budget.total / days.length : undefined))
    : undefined

  const spentByDate: Record<string, number> = {}
  for (const e of expenses) {
    spentByDate[e.date] = (spentByDate[e.date] ?? 0) + e.amountConverted
  }

  const budgetStatusByDate: Record<string, BudgetStatus> = {}
  if (effectiveDailyBudget) {
    let running = 0
    for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
      running += spentByDate[day.date] ?? 0
      budgetStatusByDate[day.date] = getDayCardStatus(running / (effectiveDailyBudget * day.dayNumber))
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.push('/')}><IonIcon icon={homeOutline} /></IonButton>
          </IonButtons>
          <IonTitle>Calendar</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: '0 4px 2rem' }}>
          {months.map(({ year, month }) => {
            const key = `${year}-${String(month + 1).padStart(2, '0')}`
            return (
              <div key={key} ref={el => { monthRefs.current[key] = el }}>
                <div style={{ padding: '1rem 0.5rem 0.25rem', fontWeight: 600, fontSize: '1rem' }}>
                  {MONTH_NAMES[month]} {year}
                </div>
                <CalendarGrid
                  year={year}
                  month={month}
                  days={days}
                  accommodations={accommodations}
                  legs={legs}
                  stopNamesByDayId={stopNamesByDayId}
                  budgetStatusByDate={budgetStatusByDate}
                  spentByDate={spentByDate}
                  effectiveDailyBudget={effectiveDailyBudget}
                  onDayClick={_date => history.push(`/trips/${tripId}/plan`)}
                />
              </div>
            )
          })}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default CalendarPage

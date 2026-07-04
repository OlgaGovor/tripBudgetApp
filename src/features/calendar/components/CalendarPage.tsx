import { useMemo, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
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
import { db } from '../../../db/db'
import { TripRepository } from '../../../db/repositories/TripRepository'
import { isOvernightTransport } from '../../../db/repositories/TransportLegRepository'
import CalendarGrid from './CalendarGrid'
import { getDayCardStatus, type BudgetStatus } from '../../../lib/budget'
import { useProgressiveCount } from '../../../lib/useProgressiveCount'

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

  // Place shown per day: the accommodation's city; otherwise, if an overnight transport
  // leg departs that day, its departure city; otherwise nothing.
  const stopNamesByDayId = useLiveQuery(async () => {
    if (!days.length) return {}
    const dayIds = days.map(d => d.id)
    const allStops = await db.stops.where('dayId').anyOf(dayIds).toArray()
    const stopName = new Map(allStops.map(s => [s.id, s.placeName]))
    const accomById = new Map(accommodations.map(a => [a.id, a]))
    const result: Record<string, string> = {}
    for (const day of days) {
      if (day.accommodationId) {
        const accom = accomById.get(day.accommodationId)
        // Prefer the city; fall back to the accommodation's place (or name) when no city
        // was captured (e.g. a manually-typed hotel).
        const place = accom?.city ?? accom?.placeName ?? accom?.name
        if (place) result[day.id] = place
        continue
      }
      // Overnight legs cover every night they span: [departureDate, arrivalDate).
      const overnight = legs.find(l => {
        if (!isOvernightTransport(l) || !l.departureDateTime || !l.arrivalDateTime) return false
        const dep = l.departureDateTime.slice(0, 10)
        const arr = l.arrivalDateTime.slice(0, 10)
        return dep <= day.date && day.date < arr
      })
      if (overnight) {
        const dep = stopName.get(overnight.fromStopId)
        if (dep) result[day.id] = dep
      }
    }
    return result
  }, [days, accommodations, legs]) ?? {}

  const months = useMemo(
    () => trip ? monthsBetween(trip.startDate, trip.endDate) : [],
    [trip]
  )

  const targetMonthKey = useMemo(() => {
    if (!trip) return ''
    return ((today >= trip.startDate && today <= trip.endDate) ? today : trip.startDate).slice(0, 7)
  }, [trip, today])

  const targetMonthIndex = useMemo(() => {
    if (!months.length) return 0
    const idx = months.findIndex(m => `${m.year}-${String(m.month + 1).padStart(2, '0')}` === targetMonthKey)
    return idx === -1 ? 0 : idx
  }, [months, targetMonthKey])

  const visibleMonthCount = useProgressiveCount(months.length, targetMonthIndex + 1)

  // Scroll to the right month once months are available
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrolled = useRef(false)
  useEffect(() => {
    if (!trip || scrolled.current || months.length === 0 || !targetMonthKey) return
    scrolled.current = true
    requestAnimationFrame(() => {
      monthRefs.current[targetMonthKey]?.scrollIntoView({ behavior: 'instant' })
    })
  }, [months, targetMonthKey]) // eslint-disable-line react-hooks/exhaustive-deps

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
          {months.slice(0, visibleMonthCount).map(({ year, month }) => {
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
                  onDayClick={date => history.push(`/trips/${tripId}/plan?date=${date}`)}
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

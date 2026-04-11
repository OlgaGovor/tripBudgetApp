import { useMemo, useState } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon,
} from '@ionic/react'
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons'
import { useParams, useHistory } from 'react-router-dom'
import { useDays } from '../../planner/hooks/useDays'
import { useTransportLegs } from '../../planner/hooks/useTransportLegs'
import { useAccommodations } from '../../planner/hooks/useAccommodations'
import { StopRepository } from '../../../db/repositories/StopRepository'
import CalendarGrid from './CalendarGrid'
import type { BudgetStatus } from '../../../lib/budget'

type FilterMode = 'next10' | 'next20' | 'next30' | 'all'

const CalendarPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const { days } = useDays(tripId)
  const { legs } = useTransportLegs(tripId)
  const { accommodations } = useAccommodations(tripId)
  const history = useHistory()

  const today = new Date().toISOString().slice(0, 10)
  const [viewYear, setViewYear] = useState(() => new Date().getUTCFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getUTCMonth())
  const [filter, setFilter] = useState<FilterMode>('all')

  const highlightRange = useMemo((): { from: string; to: string } | undefined => {
    if (filter === 'all') return undefined
    const n = filter === 'next10' ? 10 : filter === 'next20' ? 20 : 30
    const end = new Date(today + 'T00:00:00Z')
    end.setUTCDate(end.getUTCDate() + n - 1)
    return { from: today, to: end.toISOString().slice(0, 10) }
  }, [filter, today])

  const [stopNamesByDayId, setStopNamesByDayId] = useState<Record<string, string>>({})
  useMemo(() => {
    Promise.all(
      days.map(async d => {
        const stops = await StopRepository.getByDayId(d.id)
        return [d.id, stops[0]?.placeName ?? ''] as [string, string]
      })
    ).then(pairs => setStopNamesByDayId(Object.fromEntries(pairs)))
  }, [days])

  const budgetStatusByDate: Record<string, BudgetStatus> = {}

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={prevMonth}><IonIcon icon={chevronBackOutline} /></IonButton>
          </IonButtons>
          <IonTitle>{MONTH_NAMES[viewMonth]} {viewYear}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={nextMonth}><IonIcon icon={chevronForwardOutline} /></IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <div style={{ display: 'flex', gap: 4, padding: '0 1rem', overflowX: 'auto' }}>
            {(['next10','next20','next30','all'] as FilterMode[]).map(f => (
              <IonButton
                key={f}
                fill={filter === f ? 'solid' : 'outline'}
                size="small"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Whole trip' : `Next ${f.replace('next', '')}`}
              </IonButton>
            ))}
            <IonButton size="small" fill="clear" onClick={() => { setViewYear(new Date().getUTCFullYear()); setViewMonth(new Date().getUTCMonth()) }}>
              Today
            </IonButton>
            {days[0] && (
              <IonButton size="small" fill="clear" onClick={() => {
                const d = new Date(days[0].date + 'T00:00:00Z')
                setViewYear(d.getUTCFullYear()); setViewMonth(d.getUTCMonth())
              }}>
                Trip start
              </IonButton>
            )}
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: '0 4px' }}>
          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            days={days}
            accommodations={accommodations}
            legs={legs}
            stopNamesByDayId={stopNamesByDayId}
            budgetStatusByDate={budgetStatusByDate}
            highlightRange={highlightRange}
            onDayClick={_date => history.push(`/trips/${tripId}/plan`)}
          />
        </div>
      </IonContent>
    </IonPage>
  )
}

export default CalendarPage

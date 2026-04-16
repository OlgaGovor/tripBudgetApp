import { useEffect, useState } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonList, IonItem, IonLabel,
} from '@ionic/react'
import { arrowBackOutline } from 'ionicons/icons'
import { useParams, useHistory } from 'react-router-dom'
import { TripRepository } from '../../../db/repositories/TripRepository'
import { ExpenseRepository } from '../../../db/repositories/ExpenseRepository'
import { ExpenseCategoryRepository } from '../../../db/repositories/ExpenseCategoryRepository'
import { AccommodationRepository } from '../../../db/repositories/AccommodationRepository'
import { db } from '../../../db/db'

const STATUS_COLORS = { not_booked: '#e74c3c', booked: '#f39c12', booked_paid: '#27ae60' }

const SummaryPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const history = useHistory()
  const trip = TripRepository.useById(tripId)
  const accommodations = AccommodationRepository.useByTripId(tripId) ?? []
  const categories = ExpenseCategoryRepository.useAll() ?? []

  const [totalSpent, setTotalSpent] = useState(0)
  const [spendByCategory, setSpendByCategory] = useState<Record<string, number>>({})
  const [packingStats, setPackingStats] = useState({ total: 0, checked: 0 })
  const [dailyAvg, setDailyAvg] = useState(0)

  useEffect(() => {
    if (!trip) return
    Promise.all([
      ExpenseRepository.getTotalConverted(tripId),
      db.expenses.where('tripId').equals(tripId).toArray(),
      db.packingItems.where('tripId').equals(tripId).toArray(),
    ]).then(([total, expenses, items]) => {
      setTotalSpent(total)
      const byCat: Record<string, number> = {}
      expenses.forEach(e => { byCat[e.categoryId] = (byCat[e.categoryId] ?? 0) + e.amountConverted })
      setSpendByCategory(byCat)
      const start = new Date(trip.startDate + 'T00:00:00Z')
      const end = new Date(trip.endDate + 'T00:00:00Z')
      const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
      setDailyAvg(totalDays > 0 ? total / totalDays : 0)
      setPackingStats({ total: items.length, checked: items.filter(i => i.checked).length })
    })
  }, [trip, tripId])

  if (!trip) return null

  const catById = Object.fromEntries(categories.map(c => [c.id, c]))
  const totalDays = Math.floor(
    (new Date(trip.endDate + 'T00:00:00Z').getTime() - new Date(trip.startDate + 'T00:00:00Z').getTime()) / 86400000
  ) + 1

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>Trip Summary</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Trip header */}
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: '3rem' }}>{trip.emoji}</div>
          <h2 style={{ margin: '0.25rem 0' }}>{trip.name}</h2>
          <p style={{ color: 'var(--ion-color-medium)', margin: 0 }}>
            {trip.destination} · {totalDays} days
          </p>
          <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            {new Date(trip.startDate + 'T00:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            {' – '}
            {new Date(trip.endDate + 'T00:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Spend overview */}
        <div style={{ background: 'var(--ion-color-light)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--ion-color-medium)' }}>TOTAL SPEND</h3>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {totalSpent.toFixed(2)} <span style={{ fontSize: '1rem' }}>{trip.defaultCurrency}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ion-color-medium)', marginTop: 4 }}>
            Avg {dailyAvg.toFixed(2)} {trip.defaultCurrency}/day
          </div>
          {trip.budget.total && (
            <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
              Budget: {trip.budget.total} {trip.defaultCurrency} · {totalSpent > trip.budget.total ? '🔴 over' : '🟢 within'}
            </div>
          )}
        </div>

        {/* Spend by category */}
        {Object.entries(spendByCategory).length > 0 && (
          <>
            <h3 style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem', color: 'var(--ion-color-medium)' }}>BY CATEGORY</h3>
            <IonList>
              {Object.entries(spendByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([catId, amount]) => {
                  const cat = catById[catId]
                  return (
                    <IonItem key={catId}>
                      <span slot="start">{cat?.icon ?? '💰'}</span>
                      <IonLabel>{cat?.label ?? catId}</IonLabel>
                      <span slot="end" style={{ fontWeight: 600 }}>
                        {amount.toFixed(2)} {trip.defaultCurrency}
                      </span>
                    </IonItem>
                  )
                })}
            </IonList>
          </>
        )}

        {/* Accommodations */}
        {accommodations.length > 0 && (
          <>
            <h3 style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem', color: 'var(--ion-color-medium)' }}>ACCOMMODATION</h3>
            <IonList>
              {accommodations.map(a => (
                <IonItem key={a.id}>
                  <IonLabel>
                    <h3>{a.name}</h3>
                    <p>{a.checkIn} → {a.checkOut}</p>
                  </IonLabel>
                  <span slot="end" style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[a.status], display: 'inline-block' }} />
                </IonItem>
              ))}
            </IonList>
          </>
        )}

        {/* Packing */}
        {packingStats.total > 0 && (
          <div style={{ background: 'var(--ion-color-light)', borderRadius: 12, padding: '1rem', margin: '1rem 0' }}>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', color: 'var(--ion-color-medium)' }}>PACKING</h3>
            <div>{packingStats.checked} / {packingStats.total} items packed</div>
          </div>
        )}
      </IonContent>
    </IonPage>
  )
}

export default SummaryPage

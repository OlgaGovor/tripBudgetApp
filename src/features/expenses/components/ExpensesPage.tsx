import { useState, useEffect } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonFab, IonFabButton, IonIcon, IonItem, IonLabel, IonList,
} from '@ionic/react'
import { add } from 'ionicons/icons'
import { useParams } from 'react-router-dom'
import { TripRepository } from '../../../db/repositories/TripRepository'
import { ExpenseRepository } from '../../../db/repositories/ExpenseRepository'
import { useExpenses } from '../hooks/useExpenses'
import BudgetBar from './BudgetBar'
import ExpenseFormModal from './ExpenseFormModal'
import type { Expense } from '../../../db/schema'

const ExpensesPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const trip = TripRepository.useById(tripId)
  const { expenses, categories } = useExpenses(tripId)
  const [totalSpent, setTotalSpent] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | undefined>()

  useEffect(() => {
    ExpenseRepository.getTotalConverted(tripId).then(setTotalSpent)
  }, [expenses, tripId])

  if (!trip) return null

  const byDate = expenses.reduce<Record<string, typeof expenses>>((acc, e) => {
    acc[e.date] = [...(acc[e.date] ?? []), e]
    return acc
  }, {})

  const categoryById = Object.fromEntries(categories.map(c => [c.id, c]))

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar><IonTitle>Expenses</IonTitle></IonToolbar>
      </IonHeader>
      <IonContent>
        <BudgetBar trip={trip} totalSpent={totalSpent} />
        {expenses.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--ion-color-medium)' }}>No expenses yet</p>
        )}
        {Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => (
          <div key={date}>
            <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ion-color-medium)' }}>
              {new Date(date + 'T00:00:00Z').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <IonList>
              {items.map(e => {
                const cat = categoryById[e.categoryId]
                return (
                  <IonItem key={e.id} button onClick={() => { setEditExpense(e); setShowForm(true) }}>
                    <span slot="start" style={{ fontSize: '1.2rem' }}>{cat?.icon ?? '💰'}</span>
                    <IonLabel>
                      <h3>{cat?.label ?? 'Expense'}</h3>
                      {e.note && <p>{e.note}</p>}
                    </IonLabel>
                    <div slot="end" style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>{e.amount.toFixed(2)} {e.currency}</div>
                      {e.currency !== trip.defaultCurrency && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>
                          {e.amountConverted.toFixed(2)} {trip.defaultCurrency}
                        </div>
                      )}
                    </div>
                  </IonItem>
                )
              })}
            </IonList>
          </div>
        ))}
      </IonContent>
      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton onClick={() => { setEditExpense(undefined); setShowForm(true) }}>
          <IonIcon icon={add} />
        </IonFabButton>
      </IonFab>
      <ExpenseFormModal
        isOpen={showForm}
        onDismiss={() => { setShowForm(false); setEditExpense(undefined) }}
        tripId={tripId}
        tripCurrency={trip.defaultCurrency}
        categories={categories}
        expense={editExpense}
      />
    </IonPage>
  )
}

export default ExpensesPage

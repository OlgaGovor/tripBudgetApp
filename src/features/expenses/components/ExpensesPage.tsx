import { useState, useEffect } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonFab, IonFabButton, IonIcon, IonItem, IonLabel, IonList,
  IonButtons, IonButton,
} from '@ionic/react'
import { add, homeOutline } from 'ionicons/icons'
import { useParams, useHistory } from 'react-router-dom'
import { TripRepository } from '../../../db/repositories/TripRepository'
import { ExpenseRepository } from '../../../db/repositories/ExpenseRepository'
import { useExpenses } from '../hooks/useExpenses'
import BudgetBar from './BudgetBar'
import ExpenseFormModal from './ExpenseFormModal'
import type { Expense } from '../../../db/schema'

const ExpensesPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const history = useHistory()
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

  const CATEGORY_ORDER = ['cat-transport', 'cat-accommodation', 'cat-food']

  function groupByCategory(items: typeof expenses) {
    const map = new Map<string, typeof expenses>()
    for (const e of items) {
      map.set(e.categoryId, [...(map.get(e.categoryId) ?? []), e])
    }
    const fixed = CATEGORY_ORDER.filter(id => map.has(id)).map(id => [id, map.get(id)!] as const)
    const custom = Array.from(map.entries()).filter(([id]) => !CATEGORY_ORDER.includes(id) && id !== 'cat-other')
    const other = map.has('cat-other') ? [['cat-other', map.get('cat-other')!] as const] : []
    return [...fixed, ...custom, ...other]
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.push('/')}><IonIcon icon={homeOutline} /></IonButton>
          </IonButtons>
          <IonTitle>Expenses</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <BudgetBar trip={trip} totalSpent={totalSpent} />
        {expenses.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--ion-color-medium)' }}>No expenses yet</p>
        )}
        {Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, items], sectionIdx) => (
          <div key={date}>
            <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ion-color-medium)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: sectionIdx > 0 ? '1px solid var(--ion-color-light-shade)' : undefined }}>
              <span>{new Date(date + 'T00:00:00Z').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span style={{ color: 'var(--ion-color-dark)' }}>
                {items.reduce((sum, e) => sum + e.amountConverted, 0).toFixed(2)} {trip.defaultCurrency}
              </span>
            </div>
            <IonList>
              {groupByCategory(items).map(([categoryId, catItems]) => {
                const cat = categoryById[categoryId]
                return (
                  <div key={categoryId}>
                    <div style={{ padding: '0.4rem 1rem 0.1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ion-color-dark)' }}>
                      {cat?.label ?? 'Other'}
                    </div>
                    {catItems.map(e => (
                      <IonItem key={e.id} lines="none" button onClick={() => { setEditExpense(e); setShowForm(true) }}>
                        <IonLabel>
                          {e.note && <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ion-color-dark)' }}>{e.note}</p>}
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
                    ))}
                  </div>
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

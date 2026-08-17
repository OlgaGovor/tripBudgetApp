import { useState, useEffect, useRef } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonFab, IonFabButton, IonIcon, IonItem, IonLabel, IonList,
  IonButtons, IonButton,
} from '@ionic/react'
import {
  add,
  homeOutline,
  trashOutline,
  chevronDownOutline,
  chevronForwardOutline,
} from 'ionicons/icons'
import { useParams, useHistory } from 'react-router-dom'
import { TripRepository } from '../../../db/repositories/TripRepository'
import { ExpenseRepository } from '../../../db/repositories/ExpenseRepository'
import { useExpenses } from '../hooks/useExpenses'
import BudgetBar from './BudgetBar'
import ExpenseFormModal from './ExpenseFormModal'
import type { Expense } from '../../../db/schema'
import { useProgressiveCount } from '../../../lib/useProgressiveCount'

const ExpensesPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const history = useHistory()
  const trip = TripRepository.useById(tripId)
  const { expenses, categories } = useExpenses(tripId)

  const [totalSpent, setTotalSpent] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | undefined>()
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  const todayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ExpenseRepository.getTotalConverted(tripId).then(setTotalSpent)
  }, [expenses, tripId])

  const sortedSections = Object.entries(
      expenses.reduce<Record<string, typeof expenses>>((acc, e) => {
        acc[e.date] = [...(acc[e.date] ?? []), e]
        return acc
      }, {})
  ).sort(([a], [b]) => a.localeCompare(b))

  const today = new Date().toISOString().slice(0, 10)

  const todayIndex = sortedSections.findIndex(([date]) => date === today)

  const progressiveSectionCount = useProgressiveCount(
      sortedSections.length,
      5
  )

  const visibleSectionCount = Math.max(
      progressiveSectionCount,
      todayIndex >= 0 ? todayIndex + 1 : 0
  )

  function isDayExpanded(date: string) {
    if (date in expandedDays) {
      return expandedDays[date]
    }

    return date >= today
  }

  function toggleDay(date: string) {
    setExpandedDays(prev => ({
      ...prev,
      [date]: !isDayExpanded(date),
    }))
  }

  useEffect(() => {
    if (todayIndex >= 0 && todayRef.current) {
      const timeout = setTimeout(() => {
        todayRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 100)

      return () => clearTimeout(timeout)
    }
  }, [todayIndex, visibleSectionCount])

  if (!trip) return null

  const categoryById = Object.fromEntries(
      categories.map(c => [c.id, c])
  )

  const CATEGORY_ORDER = [
    'cat-transport',
    'cat-accommodation',
    'cat-experience',
    'cat-food',
  ]

  function groupByCategory(items: typeof expenses) {
    const map = new Map<string, typeof expenses>()

    for (const e of items) {
      map.set(
          e.categoryId,
          [...(map.get(e.categoryId) ?? []), e]
      )
    }

    const fixed = CATEGORY_ORDER
        .filter(id => map.has(id))
        .map(id => [id, map.get(id)!] as const)

    const custom = Array.from(map.entries()).filter(
        ([id]) =>
            !CATEGORY_ORDER.includes(id) &&
            id !== 'cat-other'
    )

    const other = map.has('cat-other')
        ? [['cat-other', map.get('cat-other')!] as const]
        : []

    return [...fixed, ...custom, ...other]
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

            <IonTitle>Expenses</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <BudgetBar
              trip={trip}
              totalSpent={totalSpent}
          />

          {expenses.length === 0 && (
              <p
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: 'var(--ion-color-medium)',
                  }}
              >
                No expenses yet
              </p>
          )}

          {sortedSections
              .slice(0, visibleSectionCount)
              .map(([date, items], sectionIdx) => {
                const isExpanded = isDayExpanded(date)
                const isToday = date === today

                const dayTotal = items.reduce(
                    (sum, e) => sum + e.amountConverted,
                    0
                )

                return (
                    <div
                        key={date}
                        ref={isToday ? todayRef : undefined}
                    >
                      <IonItem
                          button
                          detail={false}
                          lines="none"
                          onClick={() => toggleDay(date)}
                          style={{
                            '--padding-start': '1rem',
                            '--padding-end': '1rem',
                            '--min-height': '44px',
                            borderTop:
                                sectionIdx > 0
                                    ? '1px solid var(--ion-color-light-shade)'
                                    : undefined,
                          }}
                      >
                        <IonIcon
                            slot="start"
                            icon={
                              isExpanded
                                  ? chevronDownOutline
                                  : chevronForwardOutline
                            }
                            style={{
                              fontSize: '0.9rem',
                              color: 'var(--ion-color-medium)',
                              marginRight: '0.25rem',
                            }}
                        />

                        <IonLabel>
                          <div
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--ion-color-medium)',
                              }}
                          >
                            {new Date(
                                date + 'T00:00:00Z'
                            ).toLocaleDateString('en', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}

                            {isToday && ' · Today'}
                          </div>
                        </IonLabel>

                        <div
                            slot="end"
                            style={{
                              fontWeight: 600,
                              color: 'var(--ion-color-dark)',
                            }}
                        >
                          {dayTotal.toFixed(2)}{' '}
                          {trip.defaultCurrency}
                        </div>
                      </IonItem>

                      {isExpanded && (
                          <IonList>
                            {groupByCategory(items).map(
                                ([categoryId, catItems]) => {
                                  const cat = categoryById[categoryId]

                                  return (
                                      <div key={categoryId}>
                                        <div
                                            style={{
                                              padding:
                                                  '0.4rem 1rem 0.1rem',
                                              fontSize: '0.8rem',
                                              fontWeight: 700,
                                              color:
                                                  'var(--ion-color-dark)',
                                            }}
                                        >
                                          {cat?.label ?? 'Other'}
                                        </div>

                                        {catItems.map(e => (
                                            <IonItem
                                                key={e.id}
                                                lines="none"
                                                button
                                                onClick={() => {
                                                  setEditExpense(e)
                                                  setShowForm(true)
                                                }}
                                            >
                                              <IonLabel>
                                                <div
                                                    style={{
                                                      display: 'flex',
                                                      alignItems:
                                                          'center',
                                                      gap: 6,
                                                    }}
                                                >
                                                  {cat?.icon && (
                                                      <span
                                                          style={{
                                                            fontSize:
                                                                '0.85rem',
                                                          }}
                                                      >
                                        {cat.icon}
                                      </span>
                                                  )}

                                                  {e.note && (
                                                      <p
                                                          style={{
                                                            margin: 0,
                                                            fontSize:
                                                                '0.9rem',
                                                            color:
                                                                'var(--ion-color-dark)',
                                                          }}
                                                      >
                                                        {e.note}
                                                      </p>
                                                  )}
                                                </div>
                                              </IonLabel>

                                              <div
                                                  slot="end"
                                                  style={{
                                                    display: 'flex',
                                                    alignItems:
                                                        'center',
                                                    gap: 8,
                                                  }}
                                              >
                                                <div
                                                    style={{
                                                      textAlign: 'right',
                                                    }}
                                                >
                                                  <div
                                                      style={{
                                                        fontWeight: 600,
                                                      }}
                                                  >
                                                    {e.amount.toFixed(2)}{' '}
                                                    {e.currency}
                                                  </div>

                                                  {e.currency !==
                                                      trip.defaultCurrency && (
                                                          <div
                                                              style={{
                                                                fontSize:
                                                                    '0.75rem',
                                                                color:
                                                                    'var(--ion-color-medium)',
                                                              }}
                                                          >
                                                            {e.amountConverted.toFixed(
                                                                2
                                                            )}{' '}
                                                            {
                                                              trip.defaultCurrency
                                                            }
                                                          </div>
                                                      )}
                                                </div>

                                                <IonButton
                                                    fill="clear"
                                                    size="small"
                                                    color="danger"
                                                    onClick={ev => {
                                                      ev.stopPropagation()
                                                      ExpenseRepository.delete(
                                                          e.id
                                                      )
                                                    }}
                                                >
                                                  <IonIcon
                                                      icon={trashOutline}
                                                  />
                                                </IonButton>
                                              </div>
                                            </IonItem>
                                        ))}
                                      </div>
                                  )
                                }
                            )}
                          </IonList>
                      )}
                    </div>
                )
              })}
        </IonContent>

        <IonFab
            vertical="bottom"
            horizontal="end"
            slot="fixed"
        >
          <IonFabButton
              onClick={() => {
                setEditExpense(undefined)
                setShowForm(true)
              }}
          >
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <ExpenseFormModal
            isOpen={showForm}
            onDismiss={() => {
              setShowForm(false)
              setEditExpense(undefined)
            }}
            tripId={tripId}
            tripCurrency={trip.defaultCurrency}
            categories={categories}
            expense={editExpense}
        />
      </IonPage>
  )
}

export default ExpensesPage
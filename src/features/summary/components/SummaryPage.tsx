import { useEffect, useState } from 'react'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonList, IonItem, IonLabel,
  IonSegment, IonSegmentButton,
} from '@ionic/react'
import { arrowBackOutline, chevronDownOutline, chevronForwardOutline } from 'ionicons/icons'
import { useParams, useHistory } from 'react-router-dom'
import { TripRepository } from '../../../db/repositories/TripRepository'
import { ExpenseRepository } from '../../../db/repositories/ExpenseRepository'
import { ExpenseCategoryRepository } from '../../../db/repositories/ExpenseCategoryRepository'
import { db } from '../../../db/db'

type ExpenseLite = { id: string; date: string; note?: string; amount: number; currency: string; amountConverted: number }
type CategoryAmount = { catId: string; amount: number; expenses: ExpenseLite[] }
type MonthGroup = { key: string; label: string; total: number; categories: CategoryAmount[] }

function monthLabel(monthKey: string): string {
  return new Date(monthKey + '-01T00:00:00Z').toLocaleDateString('en', { month: 'long', year: 'numeric' })
}

function fmtDay(date: string): string {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
}

const sumConverted = (list: ExpenseLite[]) => list.reduce((s, e) => s + e.amountConverted, 0)
const byDate = (list: ExpenseLite[]) => [...list].sort((a, b) => a.date.localeCompare(b.date))

const SummaryPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const history = useHistory()
  const trip = TripRepository.useById(tripId)
  const categories = ExpenseCategoryRepository.useAll() ?? []

  const [totalSpent, setTotalSpent] = useState(0)
  const [allCategories, setAllCategories] = useState<CategoryAmount[]>([])
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([])
  const [packingStats, setPackingStats] = useState({ total: 0, checked: 0 })
  const [dailyAvg, setDailyAvg] = useState(0)
  const [categoryView, setCategoryView] = useState<'all' | 'month'>('all')
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!trip) return
    Promise.all([
      ExpenseRepository.getTotalConverted(tripId),
      db.expenses.where('tripId').equals(tripId).toArray(),
      db.packingItems.where('tripId').equals(tripId).toArray(),
    ]).then(([total, expenses, items]) => {
      setTotalSpent(total)
      const byCat: Record<string, ExpenseLite[]> = {}
      const byMonthCat: Record<string, Record<string, ExpenseLite[]>> = {}
      expenses.forEach(e => {
        const lite: ExpenseLite = { id: e.id, date: e.date, note: e.note, amount: e.amount, currency: e.currency, amountConverted: e.amountConverted }
        ;(byCat[e.categoryId] ??= []).push(lite)
        const month = e.date.slice(0, 7) // YYYY-MM
        byMonthCat[month] ??= {}
        ;(byMonthCat[month][e.categoryId] ??= []).push(lite)
      })
      const toCategories = (cats: Record<string, ExpenseLite[]>): CategoryAmount[] =>
        Object.entries(cats)
          .map(([catId, list]) => ({ catId, amount: sumConverted(list), expenses: byDate(list) }))
          .sort((a, b) => b.amount - a.amount)
      setAllCategories(toCategories(byCat))
      const groups: MonthGroup[] = Object.entries(byMonthCat)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, cats]) => {
          const categories = toCategories(cats)
          return { key: month, label: monthLabel(month), total: categories.reduce((s, c) => s + c.amount, 0), categories }
        })
      setMonthGroups(groups)
      // Expand the first month by default.
      setExpandedMonths(new Set(groups.length ? [groups[0].key] : []))
      const start = new Date(trip.startDate + 'T00:00:00Z')
      const end = new Date(trip.endDate + 'T00:00:00Z')
      const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
      setDailyAvg(totalDays > 0 ? total / totalDays : 0)
      setPackingStats({ total: items.length, checked: items.filter(i => i.checked).length })
    })
  }, [trip, tripId])

  function toggleMonth(key: string) {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleCat(key: string) {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (!trip) return null
  const currency = trip.defaultCurrency

  const catById = Object.fromEntries(categories.map(c => [c.id, c]))
  const totalDays = Math.floor(
    (new Date(trip.endDate + 'T00:00:00Z').getTime() - new Date(trip.startDate + 'T00:00:00Z').getTime()) / 86400000
  ) + 1

  /** A category row that expands to show its individual expenses. keyPrefix scopes the
   *  expand state so the same category can be open in one month but not another. */
  function renderCategory(c: CategoryAmount, keyPrefix: string) {
    const cat = catById[c.catId]
    const key = `${keyPrefix}:${c.catId}`
    const expanded = expandedCats.has(key)
    return (
      <div key={key}>
        <IonItem button detail={false} onClick={() => toggleCat(key)}>
          <span slot="start">{cat?.icon ?? '💰'}</span>
          <IonLabel>{cat?.label ?? c.catId}</IonLabel>
          <span slot="end" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            {c.amount.toFixed(2)} {currency}
            <IonIcon icon={expanded ? chevronDownOutline : chevronForwardOutline} style={{ color: 'var(--ion-color-medium)' }} />
          </span>
        </IonItem>
        {expanded && (
          <div style={{ background: 'var(--ion-color-light)', borderRadius: 6, margin: '0 0 6px' }}>
            {c.expenses.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 2.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.note || (cat?.label ?? '—')}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ion-color-medium)' }}>{fmtDay(e.date)}</div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                  {e.amountConverted.toFixed(2)} {currency}
                  {e.currency !== currency && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--ion-color-medium)' }}>{e.amount.toFixed(2)} {e.currency}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

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
        {allCategories.length > 0 && (
          <>
            <h3 style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem', color: 'var(--ion-color-medium)' }}>BY CATEGORY</h3>
            <IonSegment value={categoryView} onIonChange={e => setCategoryView((e.detail.value as 'all' | 'month') ?? 'all')}>
              <IonSegmentButton value="all"><IonLabel>All trip</IonLabel></IonSegmentButton>
              <IonSegmentButton value="month"><IonLabel>By month</IonLabel></IonSegmentButton>
            </IonSegment>

            {categoryView === 'all' && (
              <IonList>
                {allCategories.map(c => renderCategory(c, 'all'))}
              </IonList>
            )}

            {categoryView === 'month' && monthGroups.map(g => {
              const expanded = expandedMonths.has(g.key)
              return (
                <div key={g.key} style={{ marginTop: 8 }}>
                  <div
                    onClick={() => toggleMonth(g.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 0.25rem', cursor: 'pointer', borderBottom: '1px solid var(--ion-color-light-shade)' }}
                  >
                    <span style={{ flex: 1, fontWeight: 600 }}>{g.label}</span>
                    <span style={{ fontWeight: 600 }}>{g.total.toFixed(2)} {currency}</span>
                    <IonIcon icon={expanded ? chevronDownOutline : chevronForwardOutline} style={{ color: 'var(--ion-color-medium)' }} />
                  </div>
                  {expanded && (
                    <IonList>
                      {g.categories.map(c => renderCategory(c, g.key))}
                    </IonList>
                  )}
                </div>
              )
            })}
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

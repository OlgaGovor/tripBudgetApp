import { useState, useEffect } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
} from '@ionic/react'
import { ExpenseRepository } from '../../../db/repositories/ExpenseRepository'
import type { Expense, ExpenseCategory } from '../../../db/schema'
import { getExchangeRates, convertAmount } from '../../../lib/currency'

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN', 'JPY', 'CHF', 'AUD', 'CAD', 'CZK', 'NOK', 'SEK', 'DKK']

interface Props {
  isOpen: boolean
  onDismiss: () => void
  tripId: string
  tripCurrency: string
  categories: ExpenseCategory[]
  expense?: Expense
}

const ExpenseFormModal: React.FC<Props> = ({
  isOpen, onDismiss, tripId, tripCurrency, categories, expense,
}) => {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(tripCurrency)
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount)); setCurrency(expense.currency)
      setCategoryId(expense.categoryId); setDate(expense.date); setNote(expense.note ?? '')
    } else {
      setAmount(''); setCurrency(tripCurrency); setCategoryId(categories[0]?.id ?? '')
      setDate(new Date().toISOString().slice(0, 10)); setNote('')
    }
  }, [expense, isOpen, tripCurrency, categories])

  useEffect(() => {
    const n = parseFloat(amount)
    if (!n || currency === tripCurrency) { setPreview(null); return }
    getExchangeRates().then(({ rates }) => {
      setPreview(`≈ ${convertAmount(n, currency, tripCurrency, rates).toFixed(2)} ${tripCurrency}`)
    }).catch(() => setPreview(null))
  }, [amount, currency, tripCurrency])

  async function handleSave() {
    const n = parseFloat(amount)
    if (!n || !categoryId) return
    if (expense) {
      await ExpenseRepository.update(expense.id, { amount: n, currency, categoryId, date, note: note || undefined })
    } else {
      await ExpenseRepository.create({ tripId, categoryId, amount: n, currency, date, note: note || undefined })
    }
    onDismiss()
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onDismiss}>Cancel</IonButton></IonButtons>
          <IonTitle>{expense ? 'Edit Expense' : 'Add Expense'}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={handleSave} disabled={!parseFloat(amount) || !categoryId}>Save</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Amount *</IonLabel>
          <IonInput type="number" value={amount} onIonInput={e => setAmount(e.detail.value ?? '')} placeholder="0.00" />
          {preview && <p style={{ fontSize: '0.8rem', color: 'var(--ion-color-medium)', margin: '4px 0 0' }}>{preview}</p>}
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Currency</IonLabel>
          <IonSelect value={currency} onIonChange={e => setCurrency(e.detail.value)}>
            {COMMON_CURRENCIES.map(c => <IonSelectOption key={c} value={c}>{c}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Category *</IonLabel>
          <IonSelect value={categoryId} onIonChange={e => setCategoryId(e.detail.value)}>
            {categories.map(c => <IonSelectOption key={c.id} value={c.id}>{c.icon} {c.label}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Date</IonLabel>
          <IonInput type="date" value={date} onIonInput={e => setDate(e.detail.value ?? '')} />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Note</IonLabel>
          <IonInput value={note} onIonInput={e => setNote(e.detail.value ?? '')} placeholder="Optional note..." />
        </IonItem>
      </IonContent>
    </IonModal>
  )
}

export default ExpenseFormModal

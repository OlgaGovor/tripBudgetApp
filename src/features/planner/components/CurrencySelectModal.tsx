import { useState } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonSearchbar, IonList, IonItem, IonLabel,
} from '@ionic/react'

const CURRENCIES: { code: string; name: string }[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'PLN', name: 'Polish Złoty' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'GEL', name: 'Georgian Lari' },
  { code: 'AMD', name: 'Armenian Dram' },
  { code: 'AZN', name: 'Azerbaijani Manat' },
  { code: 'KZT', name: 'Kazakhstani Tenge' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'ILS', name: 'Israeli Shekel' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'TWD', name: 'New Taiwan Dollar' },
  { code: 'CLP', name: 'Chilean Peso' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'PEN', name: 'Peruvian Sol' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'HRK', name: 'Croatian Kuna' },
  { code: 'ISK', name: 'Icelandic Króna' },
  { code: 'HUF', name: 'Hungarian Forint' },
]

// Deduplicate by code
const CURRENCY_LIST = CURRENCIES.filter((c, i, arr) => arr.findIndex(x => x.code === c.code) === i)

interface Props {
  isOpen: boolean
  onDismiss: () => void
  onSelect: (code: string) => void
  selectedCode?: string
}

const CurrencySelectModal: React.FC<Props> = ({ isOpen, onDismiss, onSelect, selectedCode }) => {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? CURRENCY_LIST.filter(c =>
        c.code.toLowerCase().includes(query.toLowerCase()) ||
        c.name.toLowerCase().includes(query.toLowerCase())
      )
    : CURRENCY_LIST

  function handleSelect(code: string) {
    onSelect(code)
    onDismiss()
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={() => { setQuery(''); onDismiss() }}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>Select Currency</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonSearchbar
          value={query}
          onIonInput={e => setQuery(e.detail.value ?? '')}
          placeholder="Search currency..."
          autoFocus
        />
        <IonList>
          {filtered.map(c => (
            <IonItem
              key={c.code}
              button
              onClick={() => handleSelect(c.code)}
              color={selectedCode === c.code ? 'primary' : undefined}
            >
              <IonLabel>
                <span style={{ fontWeight: 600 }}>{c.code}</span>
                <span style={{ marginLeft: 8, color: 'var(--ion-color-medium)', fontSize: '0.85rem' }}>{c.name}</span>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonModal>
  )
}

export default CurrencySelectModal

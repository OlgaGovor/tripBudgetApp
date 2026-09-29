import { useState } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonSearchbar, IonList, IonItem, IonLabel,
} from '@ionic/react'
import { CURRENCIES } from '../../../constants/currencies.ts'

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

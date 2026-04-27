import { useState, useRef } from 'react'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonSearchbar, IonList, IonItem, IonLabel, IonSpinner,
} from '@ionic/react'
import { searchPlaces, type PlaceResult } from '../../../lib/geocoding'

interface Props {
  isOpen: boolean
  onDismiss: () => void
  onSelect: (result: { name: string; lat?: number; lng?: number }) => void
  title?: string
}

const PlaceSearchModal: React.FC<Props> = ({ isOpen, onDismiss, onSelect, title = 'Search place' }) => {
  const searchbarRef = useRef<HTMLIonSearchbarElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(false)

  async function handleSearch(q: string) {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    if (!navigator.onLine) { setOffline(true); setResults([]); return }
    setOffline(false)
    setLoading(true)
    try {
      const found = await searchPlaces(q)
      setResults(found)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleConfirmOffline() {
    onSelect({ name: query.trim() })
    onDismiss()
  }

  function handleSelect(result: PlaceResult) {
    onSelect({ name: result.displayName.split(',')[0].trim(), lat: result.lat, lng: result.lng })
    onDismiss()
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} onDidPresent={() => searchbarRef.current?.setFocus()}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonSearchbar
          ref={searchbarRef}
          value={query}
          onIonInput={e => handleSearch(e.detail.value ?? '')}
          placeholder="Search for a place..."
          debounce={400}
        />

        {loading && <div style={{ textAlign: 'center', padding: '2rem' }}><IonSpinner /></div>}

        {offline && query.trim() && (
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.85rem' }}>
              You're offline — the place won't be pinned on the map.
              You can update it later when online.
            </p>
            <IonButton onClick={handleConfirmOffline}>Use "{query.trim()}"</IonButton>
          </div>
        )}

        {!loading && !offline && results.length > 0 && (
          <IonList>
            {results.map((r, i) => (
              <IonItem key={i} button onClick={() => handleSelect(r)}>
                <IonLabel>
                  <h3>{r.displayName.split(',')[0]}</h3>
                  <p style={{ fontSize: '0.75rem' }}>{r.displayName}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonModal>
  )
}

export default PlaceSearchModal

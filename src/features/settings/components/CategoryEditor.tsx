import { useState } from 'react'
import {
  IonList, IonItem, IonLabel, IonButton, IonIcon, IonInput,
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent,
} from '@ionic/react'
import { addOutline, pencilOutline, trashOutline } from 'ionicons/icons'
import { ExpenseCategoryRepository } from '../../../db/repositories/ExpenseCategoryRepository'
import type { ExpenseCategory } from '../../../db/schema'

interface Props { categories: ExpenseCategory[] }

const PRESET_ICONS = ['🏨','🚌','🍕','📦','🎭','🏋️','💊','🛍️','☕','🍷','🎡','⛷️','🤿','📸']

const CategoryEditor: React.FC<Props> = ({ categories }) => {
  const [editing, setEditing] = useState<ExpenseCategory | null>(null)
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('#4A90D9')
  const [icon, setIcon] = useState('📦')

  function openEdit(cat: ExpenseCategory) {
    setEditing(cat); setLabel(cat.label); setColor(cat.color); setIcon(cat.icon)
  }

  async function handleSave() {
    if (!label.trim()) return
    if (editing) {
      await ExpenseCategoryRepository.update(editing.id, { label, color, icon })
      setEditing(null)
    } else {
      await ExpenseCategoryRepository.create({ label, color, icon })
      setAdding(false)
    }
    setLabel(''); setColor('#4A90D9'); setIcon('📦')
  }

  const formOpen = !!editing || adding

  return (
    <>
      <IonList>
        {categories.map(cat => (
          <IonItem key={cat.id}>
            <span slot="start" style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
            <IonLabel>
              <h3>{cat.label}</h3>
              <p><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: cat.color, marginRight: 4 }} />{cat.color}</p>
            </IonLabel>
            <IonButton slot="end" fill="clear" onClick={() => openEdit(cat)}>
              <IonIcon icon={pencilOutline} />
            </IonButton>
            <IonButton slot="end" fill="clear" color="danger" onClick={() => ExpenseCategoryRepository.delete(cat.id)}>
              <IonIcon icon={trashOutline} />
            </IonButton>
          </IonItem>
        ))}
        <IonItem button onClick={() => { setAdding(true); setLabel(''); setColor('#4A90D9'); setIcon('📦') }}>
          <IonIcon icon={addOutline} slot="start" />
          <IonLabel>Add category</IonLabel>
        </IonItem>
        <IonItem button onClick={() => ExpenseCategoryRepository.resetToDefaults()}>
          <IonLabel color="medium">Reset to defaults</IonLabel>
        </IonItem>
      </IonList>

      <IonModal isOpen={formOpen} onDidDismiss={() => { setEditing(null); setAdding(false) }}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start"><IonButton onClick={() => { setEditing(null); setAdding(false) }}>Cancel</IonButton></IonButtons>
            <IonTitle>{editing ? 'Edit Category' : 'New Category'}</IonTitle>
            <IonButtons slot="end"><IonButton strong onClick={handleSave} disabled={!label.trim()}>Save</IonButton></IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Label</IonLabel>
            <IonInput value={label} onIonInput={e => setLabel(e.detail.value ?? '')} placeholder="e.g. Entertainment" />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Color</IonLabel>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ marginTop: 8, width: 48, height: 32, border: 'none', cursor: 'pointer' }} />
          </IonItem>
          <div style={{ padding: '0.75rem 0' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>Icon</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESET_ICONS.map(i => (
                <button
                  key={i} onClick={() => setIcon(i)}
                  style={{
                    fontSize: '1.5rem', background: 'none', cursor: 'pointer',
                    border: icon === i ? '2px solid var(--ion-color-primary)' : '2px solid transparent',
                    borderRadius: 8, padding: 4,
                  }}
                >{i}</button>
              ))}
            </div>
          </div>
        </IonContent>
      </IonModal>
    </>
  )
}

export default CategoryEditor

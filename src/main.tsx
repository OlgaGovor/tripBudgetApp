import React from 'react'
import { createRoot } from 'react-dom/client'
import { IonApp, setupIonicReact } from '@ionic/react'
import App from './App'
import { ExpenseCategoryRepository } from './db/repositories/ExpenseCategoryRepository'
import { startAutoSync } from './sync/SyncManager'
import { requestTokenQuiet } from './sync/GoogleDriveSync'
import { SettingsRepository } from './db/repositories/SettingsRepository'

import './index.css'

/* Ionic CSS — order matters */
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/float-elements.css'
import '@ionic/react/css/text-alignment.css'
import '@ionic/react/css/text-transformation.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/display.css'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

setupIonicReact()
startAutoSync()

// Silently restore Google token if user was previously connected
SettingsRepository.get().then(s => {
  if (!s.googleConnected) return
  let attempts = 0
  function tryRestore() {
    if (typeof (window as any).google !== 'undefined') { requestTokenQuiet(() => {}); return }
    if (++attempts < 20) setTimeout(tryRestore, 300) // give up after ~6s (offline / script blocked)
  }
  tryRestore()
})
if (navigator.storage?.persist) {
  navigator.storage.persist()
}
ExpenseCategoryRepository.ensureSeeded()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IonApp>
      <App />
    </IonApp>
  </React.StrictMode>
)

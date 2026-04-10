import { IonReactRouter } from '@ionic/react-router'
import { IonRouterOutlet } from '@ionic/react'
import { Route } from 'react-router-dom'
import TripsPage from './features/trips/components/TripsPage'
import TripShell from './components/TripShell'
import SettingsPage from './features/settings/components/SettingsPage'

const App: React.FC = () => (
  <IonReactRouter>
    <IonRouterOutlet>
      <Route exact path="/" component={TripsPage} />
      <Route path="/trips/:tripId" component={TripShell} />
      <Route exact path="/settings" component={SettingsPage} />
    </IonRouterOutlet>
  </IonReactRouter>
)

export default App

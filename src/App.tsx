import { IonReactRouter } from '@ionic/react-router'
import { IonRouterOutlet } from '@ionic/react'
import { Redirect, Route } from 'react-router-dom'
import TripsPage from './features/trips/components/TripsPage'
import TripShell from './components/TripShell'
import SettingsPage from './features/settings/components/SettingsPage'

const App: React.FC = () => (
  <IonReactRouter>
    <IonRouterOutlet>
      <Route exact path="/" component={TripsPage} />
      <Route path="/trips/:tripId" component={TripShell} />
      <Route exact path="/settings" component={SettingsPage} />
      <Redirect exact from="/" to="/" />
    </IonRouterOutlet>
  </IonReactRouter>
)

export default App

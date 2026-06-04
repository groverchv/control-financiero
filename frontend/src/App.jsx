import { AppRouter } from './routes/AppRouter';
import { useAuth } from './hooks/useAuth';
import { useOfflineSync } from './hooks/useOfflineSync';
import { ToastContainer } from 'react-toastify';
import { IdleTimeoutHandler } from './components/feedback';
import { OfflineSyncBanner } from './components/ui';
import { InstallPWABanner } from './components/pwa/InstallPWABanner';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  useAuth();
  useOfflineSync();

  return (
    <div className="min-h-screen">
      <AppRouter />
      <IdleTimeoutHandler />
      <ToastContainer position="top-right" autoClose={5000} />
      {/* PWA: Banner premium de estado offline y sincronización de cola */}
      <OfflineSyncBanner />
      {/* PWA: Banner de instalación personalizado */}
      <InstallPWABanner />
    </div>
  );
}

export default App;

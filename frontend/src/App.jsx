import { AppRouter } from './routes/AppRouter';
import { useAuth } from './hooks/useAuth';
import { ToastContainer } from 'react-toastify';
import { IdleTimeoutHandler } from './components/feedback';
import { NetworkStatusBanner } from './components/pwa/NetworkStatusBanner';
import { InstallPWABanner } from './components/pwa/InstallPWABanner';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  useAuth();

  return (
    <div className="min-h-screen">
      <AppRouter />
      <IdleTimeoutHandler />
      <ToastContainer position="top-right" autoClose={5000} />
      {/* PWA: Indicador de estado de red (online/offline) */}
      <NetworkStatusBanner />
      {/* PWA: Banner de instalación personalizado */}
      <InstallPWABanner />
    </div>
  );
}

export default App;

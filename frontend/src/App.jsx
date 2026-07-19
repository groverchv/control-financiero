import { AppRouter } from './routes/AppRouter';
import { useAuth } from './hooks/useAuth';
import { ToastContainer } from 'react-toastify';
import { IdleTimeoutHandler, ErrorBoundary } from './components/feedback';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  useAuth();

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <AppRouter />
        <IdleTimeoutHandler />
        <ToastContainer position="top-right" autoClose={5000} />
      </div>
    </ErrorBoundary>
  );
}

export default App;

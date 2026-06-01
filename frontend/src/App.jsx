import { AppRouter } from './routes/AppRouter';
import { useAuth } from './hooks/useAuth';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  useAuth();

  return (
    <div className="min-h-screen">
      <AppRouter />
      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
}

export default App;

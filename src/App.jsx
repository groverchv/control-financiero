import { AppRouter } from './routes/AppRouter';
import { useAuth } from './hooks/useAuth';

function App() {
  useAuth();

  return (
    <div className="min-h-screen">
      <AppRouter />
    </div>
  );
}

export default App;

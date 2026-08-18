import { useState } from 'react';
import { Dashboard, Login } from './components';

function savedSession() {
  try {
    return JSON.parse(localStorage.getItem('financeSession') || 'null');
  } catch {
    localStorage.removeItem('financeSession');
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState(savedSession);

  if (!session) return <Login onLogin={setSession} />;

  function logout() {
    localStorage.removeItem('financeSession');
    setSession(null);
  }

  return <Dashboard session={session} logout={logout} />;
}

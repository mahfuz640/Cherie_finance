import React, { useState } from 'react';
import { Dashboard, Login } from './components';

class DashboardBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Dashboard render failed:', error);
    this.props.onError();
  }

  render() {
    if (this.state.failed) return <div className="loading">Returning to the login page…</div>;
    return this.props.children;
  }
}

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

  return <DashboardBoundary key={session.user?.id || session.user?.role} onError={logout}>
    <Dashboard session={session} logout={logout} />
  </DashboardBoundary>;
}

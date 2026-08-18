import { useState } from 'react';
import { ArrowUpRight, Building2 } from 'lucide-react';

const API = 'http://localhost:4000/api';
const ROLES = [
  ['admin', 'Admin', 'Full control'],
  ['nadiya', 'Nadiya', 'Team account'],
  ['mahfuz', 'Mahfuz', 'Team account'],
];
const DEMO_PASSWORDS = {
  admin: 'admin123', nadiya: 'nadiya123', mahfuz: 'mahfuz123',
};

export default function Login({ onLogin }) {
  const [role, setRole] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    const response = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, password }),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.message);
    localStorage.setItem('financeSession', JSON.stringify(result));
    onLogin(result);
  }

  function chooseRole(nextRole) {
    setRole(nextRole);
    setPassword('');
    setError('');
  }

  return (
    <main className="login">
      <section className="brand-panel">
        <div className="logo"><Building2 /> Cherie's Finance</div>
        <div>
          <span className="eyebrow">SMART COMPANY FINANCE</span>
          <h1>Money decisions,<br /><em>made together.</em></h1>
          <p>Invest, request and approve company funds from one secure dashboard.</p>
        </div>
        <small>© 2026 Cherie's Finance</small>
      </section>
      <section className="login-panel">
        <form onSubmit={submit}>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your workspace</h2>
          <p>Choose your access profile to continue.</p>
          <div className="role-grid">
            {ROLES.map(([id, name, description]) => (
              <button type="button" className={role === id ? 'role active' : 'role'} onClick={() => chooseRole(id)} key={id}>
                <b>{name}</b><small>{description}</small>
              </button>
            ))}
          </div>
          <label>Password<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>
          {error && <div className="error">{error}</div>}
          <button className="primary">Sign in <ArrowUpRight size={18} /></button>
          <p className="hint">Initial demo password: {DEMO_PASSWORDS[role]}</p>
        </form>
      </section>
    </main>
  );
}

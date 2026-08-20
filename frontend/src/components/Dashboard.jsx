import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { API } from '../api';
import AccountSettings from './AccountSettings';
import FinanceModals from './FinanceModals';
import InvestmentsTable from './InvestmentsTable';
import ManagementModals from './ManagementModals';
import ProductCatalog from './ProductCatalog';
import RequestsTable from './RequestsTable';
import Sidebar from './Sidebar';
import StatsGrid from './StatsGrid';
import TeamManagement from './TeamManagement';
import WorkPlan from './WorkPlan';

export default function Dashboard({ session, logout }) {
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [notice, setNotice] = useState('');
  const [activePage, setActivePage] = useState('overview');
  const role = session.user.role;
  const writable = ['admin', 'nadiya', 'mahfuz'].includes(role);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` };

  async function load() {
    const response = await fetch(`${API}/dashboard`, { headers });
    if (response.status === 401) return logout();
    setData(await response.json());
  }

  useEffect(() => { load(); }, []);

  async function send(path, body, method = 'POST') {
    const response = await fetch(`${API}${path}`, { method, headers, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) { setNotice(result.message); return false; }
    setModal(null); setNotice(result.message || 'Saved successfully'); await load();
    setTimeout(() => setNotice(''), 2500);
    return true;
  }

  async function changePassword(body, validationMessage) {
    if (validationMessage) { setNotice(validationMessage); return false; }
    return send('/account/password', body, 'PATCH');
  }

  function showNotice(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 2800);
  }

  function deleteRequest(request) {
    if (window.confirm(`Delete the ${request.status} request for BDT ${Number(request.amount).toLocaleString('en-BD')}?`)) send(`/requests/${request.id}`, {}, 'DELETE');
  }

  function deleteInvestment(investment) {
    if (window.confirm(`Delete the BDT ${Number(investment.amount).toLocaleString('en-BD')} investment?`)) send(`/investments/${investment.id}`, {}, 'DELETE');
  }

  if (!data) return <div className="loading">Loading finance workspace…</div>;
  const currentUser = data.team?.find((member) => member.role === role) || session.user;

  return (
    <div className="shell">
      <Sidebar user={currentUser} role={role} activePage={activePage} onNavigate={setActivePage} logout={logout} />
      <main className="content">
        {activePage === 'overview' && <><header>
          <div><span className="eyebrow">FINANCE OVERVIEW</span><h1>Good day, {currentUser.name}.</h1><p>Track every taka and approve decisions from one dashboard.</p></div>
          {writable && <div className="actions">
            {['nadiya', 'mahfuz'].includes(role) && <button onClick={() => setModal('request')}>Request money</button>}
            <button className="primary" onClick={() => setModal('investment')}><Plus /> Add investment</button>
          </div>}
        </header>
        {notice && <div className="notice">{notice}</div>}
        <StatsGrid stats={data.stats} />
        <RequestsTable requests={data.requests} role={role} onReview={(id, status) => send(`/requests/${id}`, { status }, 'PATCH')} onEdit={setEditingRequest} onDelete={deleteRequest} />
        <InvestmentsTable investments={data.investments || []} user={currentUser} onEdit={setEditingInvestment} onDelete={deleteInvestment} />
        </>}
        {activePage === 'plan' && <>
          <header><div><span className="eyebrow">TEAM OPERATIONS</span><h1>Our shared work plan</h1><p>Plan for yourself or each other with notes, date and time.</p></div></header>
          {notice && <div className="notice">{notice}</div>}
          <WorkPlan tasks={data.tasks || []} role={role} onCreate={(task) => send('/tasks', task)} onUpdate={(id, status) => send(`/tasks/${id}`, { status }, 'PATCH')} />
        </>}
        {activePage === 'products' && <>
          <header><div><span className="eyebrow">PRODUCT & INVENTORY</span><h1>Product catalog</h1><p>Organize categories, stock products and record every sale.</p></div></header>
          {notice && <div className="notice">{notice}</div>}
          <ProductCatalog session={session} logout={logout} notify={showNotice} refreshDashboard={load} />
        </>}
        {activePage === 'team' && <>
          <header><div><span className="eyebrow">TEAM RESPONSIBILITIES</span><h1>Who is responsible for what?</h1><p>Keep every designation and area of ownership clear to the whole team.</p></div></header>
          {notice && <div className="notice">{notice}</div>}
          <TeamManagement team={data.team || []} role={role} onAssign={(id, assignment) => send(`/team/${id}`, assignment, 'PATCH')} />
        </>}
        {activePage === 'settings' && <>
          <header><div><span className="eyebrow">ACCOUNT SECURITY</span><h1>Account settings</h1><p>Manage your profile credentials securely.</p></div></header>
          {notice && <div className="notice">{notice}</div>}
          <AccountSettings user={currentUser} role={role} onChangePassword={changePassword} />
        </>}
      </main>
      <FinanceModals modal={modal} onClose={() => setModal(null)} onSend={send} />
      <ManagementModals request={editingRequest} investment={editingInvestment} onClose={() => { setEditingRequest(null); setEditingInvestment(null); }} onSend={send} />
    </div>
  );
}

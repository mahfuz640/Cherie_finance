import { Building2, KeyRound, LayoutDashboard, ListTodo, LogOut, ShoppingBag, UsersRound } from 'lucide-react';

export default function Sidebar({ user, role, activePage, onNavigate, logout }) {
  return (
    <aside>
      <div className="logo"><Building2 /> Cherie's</div>
      <nav>
        <button className={activePage === 'overview' ? 'selected' : ''} onClick={() => onNavigate('overview')}><LayoutDashboard /> Overview</button>
        <button className={activePage === 'products' ? 'selected' : ''} onClick={() => onNavigate('products')}><ShoppingBag /> Products</button>
        <button className={activePage === 'plan' ? 'selected' : ''} onClick={() => onNavigate('plan')}><ListTodo /> Work plan</button>
        <button className={activePage === 'team' ? 'selected' : ''} onClick={() => onNavigate('team')}><UsersRound /> Team</button>
        <button className={activePage === 'settings' ? 'selected' : ''} onClick={() => onNavigate('settings')}><KeyRound /> Password</button>
      </nav>
      <div className="profile">
        <span>{user.name[0]}</span>
        <div><b>{user.name}</b><small>{user.designation || role.toUpperCase()}</small></div>
        <button onClick={logout} aria-label="Log out"><LogOut /></button>
      </div>
    </aside>
  );
}

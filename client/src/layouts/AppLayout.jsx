import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, CreditCard, Home, LogOut, Menu, Users, WalletCards, Bell, Send, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationCenter from '../components/NotificationCenter.jsx';

const nav = {
  MEMBER: [
    ['/', 'Dashboard', Home],
    ['/member/loans', 'Loans', CreditCard],
    ['/member/statements', 'Statements', WalletCards],
    ['/member/notify-deposit', 'Notify Deposit', Send],
    ['/member/profile', 'Profile', Users],
    ['/member/withdraw', 'Withdraw', WalletCards],
    ['/notifications', 'Notifications', Bell],
  ],
  TREASURER: [
    ['/', 'Treasurer Dashboard', Home],
    ['/treasurer/members', 'Members', Users],
    ['/treasurer/savings', 'Savings', WalletCards],
    ['/treasurer/confirm-deposits', 'Confirm Deposits', WalletCards],
    ['/treasurer/confirm-loans', 'Confirm Loans', CreditCard],
    ['/treasurer/loans', 'Loans', CreditCard],
    ['/treasurer/withdrawals', 'Withdrawals', WalletCards],
    ['/treasurer/reports', 'Reports', BarChart3],
    ['/notifications', 'Notifications', Bell],
  ],
  CHAIRMAN: [
    ['/', 'Dashboard', Home],
    ['/chairman/analytics', 'Analytics', BarChart3],
    ['/chairman/reports', 'Reports', WalletCards],
    ['/notifications', 'Notifications', Bell],
  ],
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarRef = useRef(null);
  const items = nav[user.role_code] || [];

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close menu when clicking outside on mobile
  useEffect(() => {
    function handleClick(e) {
      if (menuOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [menuOpen]);

  // Prevent body scroll when menu is open on mobile
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  function signOut() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      {/* Mobile overlay backdrop */}
      {menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside ref={sidebarRef} className={`sidebar${menuOpen ? ' sidebar--open' : ''}`}>
        <div className="brand">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong>Bodax SACCO</strong>
              <span>Mbarara</span>
            </div>
            {/* Close button inside sidebar on mobile */}
            <button
              className="sidebar-close-btn"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <nav>
          {items.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={19} style={{ pointerEvents: 'none', flexShrink: 0 }} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={signOut}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          {/* Hamburger button — only visible on mobile */}
          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div className="topbar-brand">
            <strong>Bodax SACCO</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            <NotificationCenter />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{user.role_name}</span>
              <strong style={{ fontSize: '0.9rem' }}>{user.full_name || user.email}</strong>
            </div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

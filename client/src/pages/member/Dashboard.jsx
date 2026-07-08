import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Wallet, CreditCard, Clock, ArrowUpRight, Bell, ChevronRight } from 'lucide-react';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import { money, shortDate } from '../../utils/format.js';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';

function MetricCard({ icon: Icon, label, value, sub, tone = 'default', to }) {
  const tones = {
    default: { bg: 'linear-gradient(135deg,#0d9488 0%,#0f766e 100%)', text: '#fff', muted: 'rgba(255,255,255,0.75)' },
    warn:    { bg: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)', text: '#fff', muted: 'rgba(255,255,255,0.75)' },
    info:    { bg: 'linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)', text: '#fff', muted: 'rgba(255,255,255,0.75)' },
    neutral: { bg: '#ffffff', text: '#0f172a', muted: '#64748b', border: '1px solid #e2e8f0' },
  };
  const t = tones[tone] || tones.default;
  const inner = (
    <div style={{
      background: t.bg, border: t.border, borderRadius: 16, padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      cursor: to ? 'pointer' : 'default', transition: 'transform 0.15s,box-shadow 0.15s',
      position: 'relative', overflow: 'hidden',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 }}>
          <Icon size={18} color={t.text} />
        </div>
        {to && <ChevronRight size={16} color={t.muted} />}
      </div>
      <strong style={{ color: t.text, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{value}</strong>
      <span style={{ color: t.muted, fontSize: '0.8rem', fontWeight: 500 }}>{label}</span>
      {sub && <span style={{ color: t.muted, fontSize: '0.75rem' }}>{sub}</span>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function QuickAction({ to, label, sub, icon: Icon }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all 0.15s', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,148,136,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
      >
        <div style={{ background: '#f0fdfa', borderRadius: 10, padding: 10 }}>
          <Icon size={18} color="#0d9488" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{label}</div>
          {sub && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{sub}</div>}
        </div>
        <ArrowUpRight size={14} color="#94a3b8" style={{ marginLeft: 'auto' }} />
      </div>
    </Link>
  );
}

export default function MemberDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({});
  const [statement, setStatement] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  const [overdueReminder, setOverdueReminder] = useState(null);
  const previousSavingsRef = useRef(null);
  const shownReminderIdsRef = useRef(new Set());

  async function fetchDashboardData() {
    const { data: dashboardData } = await api.get('/reports/dashboard/member');
    const currentSavings = Number(dashboardData.total_savings || 0);
    const previousSavings = previousSavingsRef.current;

    if (previousSavings !== null && currentSavings > previousSavings) {
      setNotificationData({ amount: currentSavings - previousSavings, date: new Date().toISOString().slice(0, 10) });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 10000);
    }
    previousSavingsRef.current = currentSavings;
    setData(dashboardData);
    setLastUpdated(new Date());

    const overdueReminders = (dashboardData.loan_reminders || []).filter(r => r.status === 'overdue');
    const newOverdue = overdueReminders.find(r => !shownReminderIdsRef.current.has(r.id));
    if (newOverdue) {
      shownReminderIdsRef.current.add(newOverdue.id);
      setOverdueReminder(newOverdue);
      setTimeout(() => setOverdueReminder(null), 12000);
    }

    const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    const { data: statementData } = await api.get(`/savings/statement?from=${from}&to=${to}`);
    setStatement(statementData);
  }

  const { loading, error, onRetry } = useDelayedAsync(fetchDashboardData, [], {
    errorMessage: 'Failed to load member dashboard',
  });

  const activeLoan = data.pending_loans?.[0];

  return (
    <LoadingRetry loading={loading} error={error} onRetry={onRetry}>
      <div style={{ display: 'grid', gap: 24 }}>

        {/* Toast alerts */}
        {overdueReminder && (
          <div style={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)', color: '#fff', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(239,68,68,0.3)' }}>
            <div><strong>⚠ Loan Overdue</strong><p style={{ margin: '4px 0 0', fontSize: '0.875rem', opacity: 0.9 }}>Your repayment of <strong>{money(overdueReminder.remaining_balance)}</strong> was due {shortDate(overdueReminder.due_date)}. Please repay immediately.</p></div>
            <button onClick={() => setOverdueReminder(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        {showNotification && notificationData && (
          <div style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}>
            <div><strong>✅ Savings Received</strong><p style={{ margin: '4px 0 0', fontSize: '0.875rem', opacity: 0.9 }}>Your deposit of <strong>{money(notificationData.amount)}</strong> was confirmed. Thank you for saving!</p></div>
            <button onClick={() => setShowNotification(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>Member #{user?.member_number} {lastUpdated && `· Last updated ${lastUpdated.toLocaleTimeString()}`}</p>
          </div>
          <Link to="/notifications" style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: '#0d9488' }}>
            <Bell size={15} /> Notifications
          </Link>
        </div>

        {/* Metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
          <MetricCard icon={Wallet} label="Total Savings" value={money(data.total_savings)} sub="Confirmed balance" />
          <MetricCard icon={TrendingUp} label="This Month" value={money(data.month_savings)} sub="Month-to-date" tone="info" />
          <MetricCard icon={TrendingUp} label="This Week" value={money(data.week_savings)} sub="Week deposits" tone="neutral" />
          <MetricCard icon={CreditCard} label="Loan Balance" value={money(data.active_loan_balance)} sub="Outstanding" tone="warn" />
        </div>

        {/* Active loan banner */}
        {activeLoan && (
          <div style={{ background: 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)', borderRadius: 16, padding: '20px 24px', color: '#fff', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 16, boxShadow: '0 8px 30px rgba(15,23,42,0.2)' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Loan</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0', letterSpacing: '-0.02em' }}>{money(activeLoan.remaining_balance)}</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Remaining · Due {shortDate(activeLoan.due_date)} · {money(activeLoan.installment_amount)}/installment</div>
            </div>
            <StatusBadge status={activeLoan.status} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
          {/* Quick actions */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700 }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <QuickAction to="/member/loans" label="Apply for Loan" sub="Check eligibility & apply" icon={CreditCard} />
              <QuickAction to="/member/notify-deposit" label="Notify a Deposit" sub="Report mobile money payment" icon={ArrowUpRight} />
              <QuickAction to="/member/withdraw" label="Request Withdrawal" sub="Withdraw your savings" icon={Wallet} />
              <QuickAction to="/member/statements" label="My Statement" sub="View full history" icon={TrendingUp} />
            </div>
          </div>

          {/* Recent transactions */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Recent Transactions</h2>
              <Link to="/member/statements" style={{ fontSize: '0.8rem', color: '#0d9488', fontWeight: 600 }}>View all</Link>
            </div>
            {statement.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {statement.slice(0, 5).map((tx, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={16} color="#0d9488" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{tx.type}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{shortDate(tx.date)}</div>
                      </div>
                    </div>
                    <strong style={{ fontSize: '0.9rem', color: '#0d9488' }}>{money(tx.amount)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '24px 0', fontSize: '0.875rem' }}>No transactions this month</p>
            )}
          </div>
        </div>

        {/* Loan requests table */}
        {data.loan_requests?.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Loan Requests</h2>
              <Link to="/member/loans" style={{ fontSize: '0.8rem', color: '#0d9488', fontWeight: 600 }}>Apply for another</Link>
            </div>
            <DataTable
              rows={data.loan_requests}
              columns={[
                { key: 'requested_amount', label: 'Amount', render: r => money(r.requested_amount) },
                { key: 'purpose', label: 'Purpose', render: r => r.purpose || '—' },
                { key: 'due_date', label: 'Due Date', render: r => shortDate(r.due_date) },
                { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
              ]}
            />
          </div>
        )}

        {/* Repayment reminders */}
        {data.loan_reminders?.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="#f59e0b" /> Repayment Reminders
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.loan_reminders.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: r.status === 'overdue' ? '#fef2f2' : '#f8fafc', borderRadius: 10, border: `1px solid ${r.status === 'overdue' ? '#fecaca' : '#e2e8f0'}` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: r.status === 'overdue' ? '#dc2626' : '#0f172a' }}>{r.text}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Due {shortDate(r.due_date)}</div>
                  </div>
                  <strong style={{ color: r.status === 'overdue' ? '#dc2626' : '#0f172a' }}>{money(r.remaining_balance)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </LoadingRetry>
  );
}
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, DollarSign, CreditCard, TrendingUp, AlertTriangle, CheckCircle, Clock, ArrowUpRight } from 'lucide-react';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';
import api from '../../api/client.js';
import { money } from '../../utils/format.js';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';

function MetricCard({ icon: Icon, label, value, sub, gradient, to }) {
  const inner = (
    <div
      style={{ background: gradient, borderRadius: 16, padding: '20px 24px', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', transition: 'transform 0.15s,box-shadow 0.15s', cursor: to ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', gap: 6 }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'; }}
    >
      <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8, width: 'fit-content' }}>
        <Icon size={18} color="#fff" />
      </div>
      <strong style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{value}</strong>
      <span style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 600 }}>{label}</span>
      {sub && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{sub}</span>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function ActionCard({ to, label, sub, icon: Icon, color = '#0d9488' }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 4px 16px ${color}22`; e.currentTarget.style.transform = 'translateX(4px)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = ''; }}
      >
        <div style={{ background: `${color}15`, borderRadius: 10, padding: 10, flexShrink: 0 }}>
          <Icon size={18} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{label}</div>
          {sub && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{sub}</div>}
        </div>
        <ArrowUpRight size={14} color="#94a3b8" />
      </div>
    </Link>
  );
}

export default function TreasurerDashboard() {
  const [dashData, setDashData] = useState({});
  const [overdueData, setOverdueData] = useState([]);

  async function loadAll() {
    const [dashRes, overdueRes] = await Promise.all([
      api.get('/reports/dashboard/treasurer'),
      api.get('/reports/overdue-loans'),
    ]);
    setDashData(dashRes.data);
    setOverdueData(overdueRes.data);
  }

  const { loading, error, onRetry } = useDelayedAsync(loadAll, [], {
    delay: 200,
    errorMessage: 'Failed to load treasurer dashboard',
  });

  const data = dashData;
  const overdueList = overdueData;

  const today = new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <LoadingRetry loading={loading} error={error} onRetry={onRetry}>
      <div style={{ display: 'grid', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Treasurer Dashboard</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>{today}</p>
          </div>
          {(data.pending_loan_requests > 0 || data.pending_withdrawals > 0) && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>
              <AlertTriangle size={14} />
              {(data.pending_loan_requests || 0) + (data.pending_withdrawals || 0)} items need review
            </div>
          )}
        </div>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
          <MetricCard icon={Users} label="Active Members" value={data.active_members || 0} gradient="linear-gradient(135deg,#0d9488,#0f766e)" />
          <MetricCard icon={DollarSign} label="Today's Collections" value={money(data.daily_collections)} sub="Confirmed deposits" gradient="linear-gradient(135deg,#3b82f6,#1d4ed8)" />
          <MetricCard icon={TrendingUp} label="This Week" value={money(data.weekly_collections)} gradient="linear-gradient(135deg,#8b5cf6,#6d28d9)" />
          <MetricCard icon={TrendingUp} label="This Month" value={money(data.monthly_collections)} gradient="linear-gradient(135deg,#10b981,#059669)" />
          <MetricCard icon={CreditCard} label="Active Loans" value={data.active_loans || 0} gradient="linear-gradient(135deg,#f59e0b,#d97706)" to="/treasurer/loans" />
          <MetricCard icon={Clock} label="Pending Requests" value={(data.pending_loan_requests || 0) + (data.pending_withdrawals || 0)} sub="Loans & withdrawals" gradient="linear-gradient(135deg,#ef4444,#dc2626)" to="/treasurer/confirm-loans" />
        </div>

        {/* Alert banners */}
        {data.pending_loan_requests > 0 && (
          <div style={{ background: 'linear-gradient(135deg,#fffbeb,#fef9c3)', border: '1px solid #fde68a', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#fde68a', borderRadius: 10, padding: 8 }}><Clock size={18} color="#92400e" /></div>
              <div>
                <div style={{ fontWeight: 700, color: '#92400e' }}>{data.pending_loan_requests} Loan Request{data.pending_loan_requests !== 1 ? 's' : ''} Pending</div>
                <div style={{ fontSize: '0.8rem', color: '#78350f' }}>Members are waiting for your review</div>
              </div>
            </div>
            <Link to="/treasurer/confirm-loans" style={{ background: '#f59e0b', color: '#fff', padding: '8px 18px', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>Review Now →</Link>
          </div>
        )}

        {overdueList.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: '1px solid #fecaca', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#fecaca', borderRadius: 10, padding: 8 }}><AlertTriangle size={18} color="#dc2626" /></div>
              <div>
                <div style={{ fontWeight: 700, color: '#dc2626' }}>{overdueList.length} Overdue Loan{overdueList.length !== 1 ? 's' : ''}</div>
                <div style={{ fontSize: '0.8rem', color: '#991b1b' }}>Members are past their repayment date</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
          {/* Quick actions */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700 }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ActionCard to="/treasurer/savings" label="Record Savings" sub="Manually record member deposits" icon={DollarSign} />
              <ActionCard to="/treasurer/confirm-deposits" label="Confirm Deposits" sub="Review mobile money notifications" icon={CheckCircle} color="#10b981" />
              <ActionCard to="/treasurer/confirm-loans" label="Review Loan Requests" sub="Approve or reject applications" icon={CreditCard} color="#f59e0b" />
              <ActionCard to="/treasurer/members" label="Register Member" sub="Add a new SACCO member" icon={Users} color="#8b5cf6" />
              <ActionCard to="/treasurer/loans" label="Issue / Manage Loans" sub="Create and track loan repayments" icon={TrendingUp} color="#3b82f6" />
              <ActionCard to="/treasurer/withdrawals" label="Process Withdrawals" sub="Approve withdrawal requests" icon={ArrowUpRight} color="#ef4444" />
            </div>
          </div>

          {/* Overdue loans */}
          {overdueList.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} /> Overdue Loans
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...overdueList].sort((a, b) => b.days_overdue - a.days_overdue).slice(0, 5).map((loan, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>{loan.full_name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>#{loan.member_number} · {money(loan.amount_overdue)}</div>
                    </div>
                    <span style={{ background: loan.days_overdue > 30 ? '#dc2626' : '#f59e0b', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {loan.days_overdue}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </LoadingRetry>
  );
}

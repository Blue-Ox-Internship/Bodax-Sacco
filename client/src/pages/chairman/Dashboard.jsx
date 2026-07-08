import { Users, DollarSign, CreditCard, TrendingUp, AlertTriangle, BarChart3, Shield, Calendar } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { money } from '../../utils/format.js';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import { Link } from 'react-router-dom';

function KpiCard({ icon: Icon, label, value, sub, gradient, change }) {
  return (
    <div
      style={{ background: gradient, borderRadius: 16, padding: '22px 24px', color: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', transition: 'transform 0.15s,box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,0,0,0.18)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.12)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 }}>
          <Icon size={18} color="#fff" />
        </div>
        {change != null && (
          <span style={{ background: change >= 0 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <strong style={{ fontSize: '1.75rem', fontWeight: 800, display: 'block', letterSpacing: '-0.03em' }}>{value}</strong>
      <div style={{ fontSize: '0.82rem', opacity: 0.85, fontWeight: 600, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function HealthBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
        <span style={{ fontWeight: 600, color: '#374151' }}>{label}</span>
        <span style={{ color: '#6b7280' }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function ChairmanDashboard() {
  const { data, loading, error, onRetry } = useApi('/reports/dashboard/chairman', {});
  const overdue = useApi('/reports/overdue-loans', []);
  const retryAll = () => { onRetry(); overdue.onRetry(); };

  const totalOutstanding = Number(data.outstanding_loan_balance || 0);
  const totalSavings = Number(data.total_savings || 0);
  const arrears = Number(data.loan_arrears || 0);
  const recoveryRate = totalOutstanding > 0 ? ((totalOutstanding - arrears) / totalOutstanding) * 100 : 100;
  const loanToSavings = totalSavings > 0 ? (totalOutstanding / totalSavings) * 100 : 0;

  const today = new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <LoadingRetry loading={loading || overdue.loading} error={error || overdue.error} onRetry={retryAll}>
      <div style={{ display: 'grid', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Chairman Overview</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>{today}</p>
          </div>
          <Link to="/chairman/reports" style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)', color: '#fff', borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <BarChart3 size={14} /> Full Report
          </Link>
        </div>

        {/* KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 16 }}>
          <KpiCard icon={Users} label="Total Members" value={data.members || 0} gradient="linear-gradient(135deg,#0d9488,#065f46)" />
          <KpiCard icon={DollarSign} label="Total Savings" value={money(data.total_savings)} gradient="linear-gradient(135deg,#3b82f6,#1e40af)" />
          <KpiCard icon={CreditCard} label="Active Loans" value={data.active_loans || 0} sub={money(data.outstanding_loan_balance)} gradient="linear-gradient(135deg,#8b5cf6,#4c1d95)" />
          <KpiCard icon={TrendingUp} label="Monthly Collections" value={money(data.monthly_collections)} sub="This month" gradient="linear-gradient(135deg,#10b981,#064e3b)" />
          <KpiCard icon={Calendar} label="Weekly Collections" value={money(data.weekly_collections)} sub="This week" gradient="linear-gradient(135deg,#f59e0b,#92400e)" />
          <KpiCard icon={AlertTriangle} label="Loan Arrears" value={money(data.loan_arrears)} sub={`${overdue.data.length} overdue loans`} gradient={arrears > 0 ? 'linear-gradient(135deg,#ef4444,#7f1d1d)' : 'linear-gradient(135deg,#10b981,#064e3b)'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
          {/* Portfolio health */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={16} color="#0d9488" /> Portfolio Health
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <HealthBar label="Loan Recovery Rate" value={recoveryRate} max={100} color="linear-gradient(90deg,#10b981,#059669)" />
              <HealthBar label="Loan-to-Savings Ratio" value={loanToSavings} max={100} color={loanToSavings > 80 ? 'linear-gradient(90deg,#ef4444,#dc2626)' : 'linear-gradient(90deg,#f59e0b,#d97706)'} />
              <HealthBar label="Active Member Rate" value={data.members || 0} max={Math.max(data.members || 0, 1)} color="linear-gradient(90deg,#3b82f6,#1d4ed8)" />
            </div>
            <div style={{ marginTop: 20, padding: '12px 16px', background: recoveryRate >= 90 ? '#ecfdf5' : '#fef2f2', borderRadius: 10, border: `1px solid ${recoveryRate >= 90 ? '#a7f3d0' : '#fecaca'}` }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: recoveryRate >= 90 ? '#065f46' : '#dc2626' }}>
                {recoveryRate >= 90 ? '✅ Portfolio is healthy' : '⚠ Portfolio needs attention'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>
                Recovery rate: {recoveryRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Overdue table */}
          {overdue.data.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} /> Loan Arrears ({overdue.data.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...overdue.data].sort((a, b) => b.days_overdue - a.days_overdue).slice(0, 6).map((loan, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{loan.full_name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{money(loan.amount_overdue)} overdue</div>
                    </div>
                    <span style={{ background: loan.days_overdue > 30 ? '#dc2626' : '#f59e0b', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {loan.days_overdue}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: '#ecfdf5', borderRadius: 16, padding: 32, border: '1px solid #a7f3d0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem' }}>🏆</div>
              <div style={{ fontWeight: 700, color: '#065f46', fontSize: '1rem' }}>No Overdue Loans!</div>
              <div style={{ color: '#047857', fontSize: '0.875rem' }}>All active loans are being repaid on time.</div>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700 }}>Navigation</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
            {[
              { to: '/chairman/analytics', label: 'Analytics', icon: BarChart3, color: '#3b82f6' },
              { to: '/chairman/reports', label: 'Full Reports', icon: TrendingUp, color: '#10b981' },
              { to: '/notifications', label: 'Notifications', icon: AlertTriangle, color: '#f59e0b' },
            ].map(({ to, label, icon: Icon, color }) => (
              <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                <div style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${color}20`; e.currentTarget.style.borderColor = color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${color}10`; e.currentTarget.style.borderColor = `${color}30`; }}
                >
                  <Icon size={18} color={color} />
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </LoadingRetry>
  );
}
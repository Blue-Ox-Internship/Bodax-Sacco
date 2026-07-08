import { useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import api from '../../api/client.js';
import { formatAmountInput, stripCommas, money } from '../../utils/format.js';
import { positiveAmount, runValidation } from '../../utils/validate.js';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';

const STATUS_STYLES = {
  pending:  { bg: '#fffbeb', color: '#92400e', border: '#fde68a', label: '⏳ Pending Verification' },
  approved: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', label: '✅ Approved'            },
  rejected: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', label: '❌ Rejected'            },
};

function StatusChip({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: '99px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

export default function NotifyDeposit() {
  const [form, setForm] = useState({ amount: '', transaction_id: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [apiError, setApiError] = useState('');
  const [history, setHistory] = useState([]);

  async function loadHistory() {
    const { data } = await api.get('/deposits/my');
    setHistory(data);
  }

  const { loading: historyLoading, error: historyError, onRetry } = useDelayedAsync(loadHistory, [], {
    errorMessage: 'Could not load deposit history',
  });

  function validate() {
    const trimmedTxId = form.transaction_id.trim();
    return runValidation({
      amount: positiveAmount(stripCommas(form.amount), 'Amount'),
      transaction_id: trimmedTxId.length > 0 && trimmedTxId.length < 4
        ? 'Transaction ID must be at least 4 characters (e.g. MM12345678)'
        : null,
    });
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setApiError('');

    const { errors: fieldErrors, isValid } = validate();
    setErrors(fieldErrors);
    if (!isValid) return;

    setSubmitting(true);
    try {
      await api.post('/deposits', {
        amount: stripCommas(form.amount),
        transaction_id: form.transaction_id.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setMessage('Deposit notification sent to the Treasurer for verification. You will receive a notification once it is reviewed.');
      setForm({ amount: '', transaction_id: '', notes: '' });
      setErrors({});
      onRetry(); // refresh history
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to submit notification. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <h1>Notify Deposit</h1>

      <Panel title="Report a Mobile Money or Bank Deposit">
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
          Paid via Mobile Money or Bank? Notify your Treasurer here. They will verify
          the transaction and update your savings balance.
        </p>

        {message && (
          <div role="status" style={{ background: 'var(--success-light)', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)', padding: '14px 16px', color: '#065f46', fontSize: '0.95rem' }}>
            ✅ {message}
          </div>
        )}
        {apiError && <p className="alert" role="alert">{apiError}</p>}

        <form className="form-grid" onSubmit={submit} noValidate>
          <FormField
            id="deposit-amount"
            label="Amount (UGX)"
            type="text"
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: formatAmountInput(e.target.value) })}
            error={errors.amount}
            required
            placeholder="e.g. 50,000"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <FormField
              id="deposit-txn-id"
              label="Transaction ID / Receipt Number"
              value={form.transaction_id}
              onChange={(e) => setForm({ ...form, transaction_id: e.target.value })}
              placeholder="e.g. MM12345678 or TXN-98765"
              maxLength="60"
              error={errors.transaction_id}
            />
            <small style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
              From your Mobile Money confirmation SMS or bank receipt. Recommended — helps the Treasurer verify faster.
            </small>
          </div>

          <FormField
            id="deposit-notes"
            label="Additional Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="E.g. MTN MoMo deposit for March savings"
            maxLength="200"
          />

          <Button id="deposit-submit-btn" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Notification'}
          </Button>
        </form>
      </Panel>

      <Panel title="My Deposit History">
        <LoadingRetry loading={historyLoading} error={historyError} onRetry={onRetry}>
          {history.length === 0 ? (
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>
              No deposit notifications submitted yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((dep) => (
                <div
                  key={dep.id}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px 16px',
                    display: 'grid',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <strong style={{ fontSize: '1.1rem' }}>{money(dep.amount)}</strong>
                    <StatusChip status={dep.status} />
                  </div>
                  {dep.transaction_id && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                      Tx ID: <strong>{dep.transaction_id}</strong>
                    </p>
                  )}
                  {dep.notes && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                      {dep.notes}
                    </p>
                  )}
                  <small style={{ color: 'var(--muted)' }}>
                    Submitted: {new Date(dep.created_at).toLocaleString()}
                    {dep.reviewed_at && ` · Reviewed: ${new Date(dep.reviewed_at).toLocaleString()}`}
                  </small>
                </div>
              ))}
            </div>
          )}
        </LoadingRetry>
      </Panel>
    </div>
  );
}

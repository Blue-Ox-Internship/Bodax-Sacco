import { useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import DataTable from '../../components/DataTable.jsx';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import api from '../../api/client.js';
import { formatAmountInput, stripCommas, money } from '../../utils/format.js';
import { requiredField, positiveAmount, notFutureDate, dateRequired, runValidation } from '../../utils/validate.js';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';

export default function ConfirmDeposits() {
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [receiptConfirmed, setReceiptConfirmed] = useState(true);
  const [selectedMemberSummary, setSelectedMemberSummary] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [reviewForm, setReviewForm] = useState({ id: null, action: 'approve' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [form, setForm] = useState({
    member_id: '',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  async function loadData() {
    const [membersRes, notifsRes] = await Promise.all([
      api.get('/members?limit=100'),
      api.get('/deposits?status=pending')
    ]);
    setMembers(membersRes.data.data);
    setNotifications(notifsRes.data);
  }

  const { loading, error: loadError, onRetry } = useDelayedAsync(loadData, [], {
    errorMessage: 'Failed to load data',
  });

  async function loadMemberSummary(memberId) {
    if (!memberId) {
      setSelectedMemberSummary(null);
      return;
    }
    try {
      const { data } = await api.get(`/savings/members/${memberId}/summary`);
      setSelectedMemberSummary(data);
    } catch {
      setSelectedMemberSummary(null);
    }
  }

  function handleMemberChange(e) {
    const memberId = e.target.value;
    setForm((current) => ({ ...current, member_id: memberId }));
    if (memberId) loadMemberSummary(memberId);
    else setSelectedMemberSummary(null);
  }

  function validate() {
    return runValidation({
      member_id: requiredField(form.member_id, 'Member'),
      amount: positiveAmount(stripCommas(form.amount), 'Amount'),
      transaction_date: dateRequired(form.transaction_date, 'Date') || notFutureDate(form.transaction_date, 'Date'),
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
      await api.post('/savings', { ...form, amount: stripCommas(form.amount), confirmed: receiptConfirmed });
      setMessage('Savings deposit confirmed and recorded successfully.');
      setForm({
        member_id: '',
        amount: '',
        transaction_date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setErrors({});
      setSelectedMemberSummary(null);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to confirm deposit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReviewNotification(event, reqId) {
    event.preventDefault();
    setMessage('');
    setApiError('');
    setReviewSubmitting(true);
    try {
      await api.patch(`/deposits/${reqId}/review`, { action: reviewForm.action });
      setMessage(`Deposit notification ${reviewForm.action}d successfully.`);
      setReviewForm({ id: null, action: 'approve' });
      onRetry();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to process notification.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <h1>Confirm Savings Deposit</h1>
      
      <Panel title="Pending Deposit Notifications from Members">
        <LoadingRetry loading={loading} error={loadError} onRetry={onRetry}>
            <DataTable
              rows={notifications}
              columns={[
                {
                  key: 'member',
                  label: 'Member',
                  render: (notif) => (
                    <>
                      {notif.full_name} <br/>
                      <small>{notif.phone_number} | {notif.member_number}</small>
                    </>
                  )
                },
                {
                  key: 'amount',
                  label: 'Amount',
                  render: (notif) => <span style={{ fontWeight: 'bold' }}>{money(notif.amount)}</span>
                },
                {
                  key: 'notes',
                  label: 'Notes/Transaction ID',
                  render: (notif) => (
                    <>
                      {notif.transaction_id && <div><strong>Tx ID:</strong> {notif.transaction_id}</div>}
                      {notif.notes && <div><em>{notif.notes}</em></div>}
                    </>
                  )
                },
                {
                  key: 'date',
                  label: 'Date',
                  render: (notif) => new Date(notif.created_at).toLocaleString()
                },
                {
                  key: 'action',
                  label: 'Action',
                  render: (notif) => (
                    reviewForm.id === notif.id ? (
                      <form onSubmit={(e) => handleReviewNotification(e, notif.id)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select value={reviewForm.action} onChange={e => setReviewForm({ ...reviewForm, action: e.target.value })}>
                          <option value="approve">Approve</option>
                          <option value="reject">Reject</option>
                        </select>
                        <Button type="submit" disabled={reviewSubmitting}>Submit</Button>
                        <button type="button" onClick={() => setReviewForm({ id: null, action: 'approve' })} className="btn-secondary">Cancel</button>
                      </form>
                    ) : (
                      <Button onClick={() => setReviewForm({ id: notif.id, action: 'approve' })}>Review</Button>
                    )
                  )
                }
              ]}
              empty="No pending deposit notifications."
            />
        </LoadingRetry>
      </Panel>

      <Panel title="Record Manual Savings Receipt">
        <LoadingRetry loading={loading} error={loadError} onRetry={onRetry}>
          {message && <p className="success">{message}</p>}
          {apiError && <p className="alert">{apiError}</p>}
          <form className="form-grid" onSubmit={submit} noValidate>
            <label className={`field${errors.member_id ? ' select-error' : ''}`}>
              <span>Member</span>
              <select
                value={form.member_id}
                onChange={handleMemberChange}
                required
              >
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} - {member.member_number}
                  </option>
                ))}
              </select>
              {selectedMemberSummary && (
                <small>Savings balance: <strong>{money(selectedMemberSummary.total_savings)}</strong></small>
              )}
              {errors.member_id && <small className="field-error-msg">{errors.member_id}</small>}
            </label>
            <FormField
              label="Amount Saved (UGX)"
              type="text"
              inputMode="numeric"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: formatAmountInput(e.target.value) })}
              error={errors.amount}
              required
            />
            <FormField
              label="Date"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              error={errors.transaction_date}
              required
            />
            <FormField
              label="Notes"
              maxLength="200"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={receiptConfirmed}
                onChange={(e) => setReceiptConfirmed(e.target.checked)}
              />
              <span>Send SMS confirmation to the member</span>
            </label>
            <Button disabled={submitting}>{submitting ? 'Confirming...' : 'Confirm deposit'}</Button>
          </form>
        </LoadingRetry>
      </Panel>
    </div>
  );
}
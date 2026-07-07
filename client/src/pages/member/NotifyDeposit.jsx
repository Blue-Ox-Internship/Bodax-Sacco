import { useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import api from '../../api/client.js';
import { formatAmountInput, stripCommas } from '../../utils/format.js';
import { positiveAmount, runValidation } from '../../utils/validate.js';

export default function NotifyDeposit() {
  const [form, setForm] = useState({ amount: '', transaction_id: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [apiError, setApiError] = useState('');

  function validate() {
    return runValidation({
      amount: positiveAmount(stripCommas(form.amount), 'Amount'),
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
      await api.post('/savings/deposit-notifications', {
        ...form,
        amount: stripCommas(form.amount),
      });
      setMessage('Deposit notification sent to the Treasurer for verification.');
      setForm({ amount: '', transaction_id: '', notes: '' });
      setErrors({});
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to submit notification.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <h1>Notify Deposit</h1>
      <Panel title="Report a Mobile Money or Bank Deposit">
        {message && <p className="success">{message}</p>}
        {apiError && <p className="alert">{apiError}</p>}
        
        <form className="form-grid" onSubmit={submit} noValidate>
          <FormField
            label="Amount (UGX)"
            type="text"
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: formatAmountInput(e.target.value) })}
            error={errors.amount}
            required
            placeholder="e.g. 50,000"
          />
          
          <FormField
            label="Transaction ID / Receipt Number"
            value={form.transaction_id}
            onChange={(e) => setForm({ ...form, transaction_id: e.target.value })}
            placeholder="e.g. MM12345678"
            maxLength="50"
          />

          <FormField
            label="Additional Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any other details..."
            maxLength="200"
          />

          <Button disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Notification'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}

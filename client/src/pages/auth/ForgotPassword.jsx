import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import api from '../../api/client.js';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/forgot-password', { identifier });
      setSuccess('Your password reset request has been sent to the Treasurer. Please contact them for approval.');
      setIdentifier('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div>
          <strong>Bodax SACCO</strong>
          <span>Password Reset Request</span>
        </div>
        
        {error && <p className="alert">{error}</p>}
        {success && <p className="success" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '0.75rem', borderRadius: '4px' }}>{success}</p>}
        
        {!success && (
          <>
            <div>
              <FormField label="Phone number or Number Plate" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '-8px', marginBottom: '16px' }}>Enter your registered details to request a reset.</p>
            </div>
            
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Request Password Reset'}
            </Button>
          </>
        )}
        
        <p className="secondary-action">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import api from '../../api/client.js';

export default function ForgotPassword() {
  const [saccoCode, setSaccoCode] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!saccoCode.trim()) { setError('SACCO Code is required'); return; }
    if (!identifier.trim()) { setError('Phone number or number plate is required'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/forgot-password', { sacco_code: saccoCode.trim().toUpperCase(), identifier: identifier.trim() });
      setSuccess('success');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit request. Check your SACCO Code and identifier.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="login-screen">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem' }}>✅</div>
          <strong style={{ fontSize: '1.4rem' }}>Request Submitted</strong>
          <p style={{ color: 'var(--muted)', lineHeight: '1.6' }}>
            Your password reset request has been sent to your SACCO Treasurer.
            They will verify your identity and set a new password for you.
          </p>
          <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', textAlign: 'left', fontSize: '0.9rem' }}>
            <strong>What happens next?</strong>
            <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>Treasurer receives a notification</li>
              <li>Treasurer verifies your identity</li>
              <li>Treasurer sets a new password</li>
              <li>You receive a confirmation notification</li>
              <li>Log in with the new password</li>
            </ol>
          </div>
          <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center' }}>
            Back to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit} noValidate>
        <div>
          <strong>Forgot Password</strong>
          <span>Your Treasurer will reset it for you</span>
        </div>

        {error && <p className="alert" role="alert">{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <FormField
            id="forgot-sacco-code"
            label="SACCO Code"
            value={saccoCode}
            onChange={(e) => setSaccoCode(e.target.value.toUpperCase())}
            placeholder="e.g. BODAX"
            autoCapitalize="characters"
            required
          />
          <small style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
            The code for your SACCO (e.g. BODAX)
          </small>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <FormField
            id="forgot-identifier"
            label="Phone Number or Number Plate"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. 0701234567 or UFE 123A"
            autoComplete="tel"
            required
          />
          <small style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
            Use the phone or plate you registered with
          </small>
        </div>

        <Button type="submit" disabled={loading} id="forgot-submit-btn">
          {loading ? 'Submitting...' : 'Request Password Reset'}
        </Button>

        <p className="secondary-action">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const [saccoCode, setSaccoCode] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(saccoCode.trim().toUpperCase(), identifier.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>

        {/* Brand header */}
        <div style={{ textAlign: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '20px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '16px',
            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 4px 16px rgba(13,148,136,0.3)',
          }}>
            <span style={{ fontSize: '1.6rem' }}>🏍️</span>
          </div>
          <strong style={{ display: 'block', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Bodax SACCO
          </strong>
          <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Mbarara Boda Boda savings and loans
          </span>
        </div>

        {/* Error alert */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
            padding: '12px 16px', color: '#dc2626', fontSize: '0.875rem', fontWeight: 500
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* SACCO Code */}
        <div className="field">
          <label htmlFor="sacco-code" style={{ fontWeight: 700, fontSize: '0.875rem', color: '#374151' }}>
            SACCO Code
          </label>
          <input
            id="sacco-code"
            type="text"
            value={saccoCode}
            onChange={(e) => setSaccoCode(e.target.value.toUpperCase())}
            required
            autoComplete="off"
            style={{
              width: '100%', height: 48, border: '1.5px solid var(--line)',
              borderRadius: 10, padding: '0 14px', fontSize: '1rem',
              fontWeight: 700, letterSpacing: '0.05em', color: 'var(--primary-hover)',
              outline: 'none', background: 'var(--primary-light)',
            }}
          />
        </div>

        {/* Phone / Number Plate / Email */}
        <div className="field">
          <label htmlFor="identifier" style={{ fontWeight: 700, fontSize: '0.875rem', color: '#374151' }}>
            Phone Number or Number Plate
          </label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            style={{
              width: '100%', height: 48, border: '1.5px solid var(--line)',
              borderRadius: 10, padding: '0 14px', fontSize: '0.95rem', outline: 'none',
            }}
          />

        </div>

        {/* Password */}
        <div className="field">
          <label htmlFor="password" style={{ fontWeight: 700, fontSize: '0.875rem', color: '#374151' }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              width: '100%', height: 48, border: '1.5px solid var(--line)',
              borderRadius: 10, padding: '0 14px', fontSize: '0.95rem', outline: 'none',
            }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', height: 52, fontSize: '1rem', fontWeight: 700, borderRadius: 12 }}
        >
          {loading ? '⏳ Signing in...' : '🔓 Sign In'}
        </button>

        <p style={{ textAlign: 'center', margin: 0, fontSize: '0.875rem', color: 'var(--muted)' }}>
          Forgot your password?{' '}
          <Link to="/forgot-password" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Request reset
          </Link>
        </p>

      </form>
    </main>
  );
}


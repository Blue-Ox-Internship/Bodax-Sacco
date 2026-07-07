import { useState, useEffect } from 'react';

export default function SuperAdminRoot() {
  const [secret, setSecret] = useState(localStorage.getItem('super_admin_secret') || '');
  const [saccos, setSaccos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [newSaccoName, setNewSaccoName] = useState('');
  
  const [userForm, setUserForm] = useState({ saccoId: '', email: '', password: '', role_code: 'TREASURER' });

  useEffect(() => {
    if (secret) {
      fetchSaccos();
    }
  }, [secret]);

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(`http://localhost:4000/api/admin/saccos${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-super-admin-secret': secret,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Request failed');
    }
    return res.json();
  };

  const fetchSaccos = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('');
      setSaccos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSacco = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('', {
        method: 'POST',
        body: JSON.stringify({ name: newSaccoName }),
      });
      setNewSaccoName('');
      fetchSaccos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await apiFetch(`/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      fetchSaccos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/${userForm.saccoId}/users`, {
        method: 'POST',
        body: JSON.stringify({
          email: userForm.email,
          password: userForm.password,
          role_code: userForm.role_code,
        }),
      });
      alert('User created successfully');
      setUserForm({ saccoId: '', email: '', password: '', role_code: 'TREASURER' });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: 'red' }}>[HIDDEN] Super Admin Root</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <label>Super Admin Secret: </label>
        <input 
          type="password" 
          value={secret} 
          onChange={(e) => {
            setSecret(e.target.value);
            localStorage.setItem('super_admin_secret', e.target.value);
          }} 
          style={{ padding: '0.5rem', width: '300px' }}
        />
        <button onClick={fetchSaccos} style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}>Connect</button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>Error: {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h2>SACCOs</h2>
          {loading ? <p>Loading...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>Name</th>
                  <th style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>Status</th>
                  <th style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {saccos.map(s => (
                  <tr key={s.id}>
                    <td style={{ padding: '0.5rem 0' }}>{s.name} <br/><small style={{color:'#666'}}>{s.id}</small></td>
                    <td>{s.status}</td>
                    <td>
                      {s.status === 'active' ? (
                        <button onClick={() => handleUpdateStatus(s.id, 'suspended')}>Suspend</button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(s.id, 'active')}>Activate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <form onSubmit={handleCreateSacco} style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5' }}>
            <h3>Register New SACCO</h3>
            <input 
              required
              placeholder="SACCO Name" 
              value={newSaccoName} 
              onChange={e => setNewSaccoName(e.target.value)} 
              style={{ padding: '0.5rem', width: '200px', marginRight: '1rem' }}
            />
            <button type="submit" style={{ padding: '0.5rem 1rem' }}>Create</button>
          </form>
        </div>

        <div>
          <h2>Setup SACCO Managers</h2>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: '#f5f5f5' }}>
            <select required value={userForm.saccoId} onChange={e => setUserForm({...userForm, saccoId: e.target.value})} style={{ padding: '0.5rem' }}>
              <option value="">-- Select SACCO --</option>
              {saccos.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select required value={userForm.role_code} onChange={e => setUserForm({...userForm, role_code: e.target.value})} style={{ padding: '0.5rem' }}>
              <option value="TREASURER">Treasurer</option>
              <option value="CHAIRMAN">Chairman</option>
            </select>
            <input 
              required
              type="email" 
              placeholder="Email" 
              value={userForm.email} 
              onChange={e => setUserForm({...userForm, email: e.target.value})} 
              style={{ padding: '0.5rem' }}
            />
            <input 
              required
              type="password" 
              placeholder="Temporary Password" 
              value={userForm.password} 
              onChange={e => setUserForm({...userForm, password: e.target.value})} 
              style={{ padding: '0.5rem' }}
            />
            <button type="submit" style={{ padding: '0.5rem 1rem' }}>Create User</button>
          </form>
        </div>
      </div>
    </div>
  );
}

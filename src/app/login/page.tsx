'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (data.role === 'EMPLOYEE') {
        router.push('/employee/dashboard');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '70vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 className="page-title" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Staff Login</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Access admin or employee dashboard.
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', top: '16px', left: '14px', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Username (admin or employee)" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required 
              />
            </div>
          </div>

          <div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '16px', left: '14px', color: 'var(--text-secondary)' }} />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required 
              />
            </div>
          </div>

          {error && (
             <div style={{ color: 'var(--danger)', fontSize: '0.9rem', textAlign: 'center' }}>
               {error}
             </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
             {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.85rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent)', textAlign: 'center' }}>Automated System Credentials</p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', textAlign: 'center' }}>Tickets are automatically assigned to these accounts by region.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong>Local Roads:</strong> employee_local <span style={{ color: 'var(--border)' }}>/</span> password</li>
            <li><strong>State Roads:</strong> employee_state <span style={{ color: 'var(--border)' }}>/</span> password</li>
            <li><strong>National Highways:</strong> employee_national <span style={{ color: 'var(--border)' }}>/</span> password</li>
            <li style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}><strong>Admin Dashboard:</strong> admin <span style={{ color: 'var(--border)' }}>/</span> admin</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

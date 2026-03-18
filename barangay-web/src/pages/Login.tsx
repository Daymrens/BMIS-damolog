import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { post } from '../api';
import type { AuthUser } from '../auth';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await post<AuthUser>('/api/auth/login', { username, password });
      login(user);
      nav('/');
    } catch {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logos">
          <img src="/logo.png" alt="Barangay Damolog" onError={e => (e.currentTarget.style.display = 'none')} />
          <img src="/sogod-logo.png" alt="Municipality of Sogod" onError={e => (e.currentTarget.style.display = 'none')} />
        </div>
        <div className="login-title">Barangay Damolog</div>
        <div className="login-sub">Municipality of Sogod, Cebu</div>
        <div className="login-system">Management System</div>

        <form onSubmit={submit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <div className="form-group">
            <label>Username</label>
            <input
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button className="btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : '🔐 Sign In'}
          </button>
        </form>

        
      </div>
    </div>
  );
}

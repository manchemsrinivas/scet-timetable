import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/login', formData);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <style>{`
        .auth-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }
        .auth-card {
          width: 100%;
          max-width: 400px;
          background: white;
          padding: 2.5rem;
          border-radius: var(--radius-xl);
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
        }
      `}</style>
      <div className="auth-card">
        <h2 className="font-bold text-2xl mb-2 text-center">Welcome Back</h2>
        <p className="text-muted text-center mb-8">Sign in to your SCET Portal account</p>
        
        {error && <div className="badge badge-danger w-full text-center py-2 mb-4" style={{background: '#fee2e2', color: '#b91c1c', borderRadius: '8px'}}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Email Address</label>
            <input 
              type="email" 
              className="input" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="name@scet.edu" 
              required 
            />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input 
              type="password" 
              className="input" 
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••" 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary w-full py-3 mt-2" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-muted">
          Don't have an account? <Link to="/register" className="text-primary font-semibold text-decoration-none">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

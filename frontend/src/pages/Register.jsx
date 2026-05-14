import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'faculty',
    department: 'CSE'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', formData);
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
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
          max-width: 450px;
          background: white;
          padding: 2.5rem;
          border-radius: var(--radius-xl);
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
        }
      `}</style>
      <div className="auth-card">
        <h2 className="font-bold text-2xl mb-2 text-center">Create Account</h2>
        <p className="text-muted text-center mb-8">Join the SCET Timetable Management System</p>
        
        {error && <div className="badge badge-danger w-full text-center py-2 mb-4" style={{background: '#fee2e2', color: '#b91c1c', borderRadius: '8px'}}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Full Name</label>
            <input 
              type="text" 
              className="input" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="John Doe" 
              required 
            />
          </div>
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
          <div className="flex gap-4">
            <div className="form-group flex-1">
              <label className="label">Role</label>
              <select 
                className="select" 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {formData.role === 'faculty' && (
              <div className="form-group flex-1">
                <label className="label">Department</label>
                <select 
                  className="select" 
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                >
                  {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
          </div>
          <button type="submit" className="btn btn-primary w-full py-3 mt-2" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account? <Link to="/login" className="text-primary font-semibold text-decoration-none">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

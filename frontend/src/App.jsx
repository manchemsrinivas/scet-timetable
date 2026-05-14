import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api from './api/axios';
import Sidebar from './components/Sidebar';

// Pages (to be created)
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import TimetableGrid from './pages/TimetableGrid';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
    } catch (err) {
      console.error('Logout failed');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <Router>
      <div className="app-container">
        {user && <Sidebar user={user} onLogout={handleLogout} />}
        <main className={user ? 'main-content' : 'w-full'}>
          <Routes>
            <Route path="/login" element={!user ? <Login onLogin={checkAuth} /> : <Navigate to={user.role === 'admin' ? '/admin' : '/faculty'} />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
            
            {/* Protected Admin Routes */}
            <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
            <Route path="/admin/sections" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
            <Route path="/admin/mapping" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
            <Route path="/admin/labs" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
            <Route path="/admin/timetables" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
            <Route path="/admin/faculty-timetables" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
            <Route path="/admin/timetable/grid/:sectionId" element={user?.role === 'admin' ? <TimetableGrid /> : <Navigate to="/login" />} />
            
            {/* Protected Faculty Routes */}
            <Route path="/faculty" element={user?.role === 'faculty' ? <FacultyDashboard /> : <Navigate to="/login" />} />

            <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/faculty') : '/login'} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;

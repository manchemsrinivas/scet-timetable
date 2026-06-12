import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  FlaskConical, 
  CalendarDays, 
  LogOut
} from 'lucide-react';

const Sidebar = ({ user, onLogout }) => {
  const isAdmin = user?.role === 'admin';

  const adminLinks = [
    { to: '/admin', icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { to: '/admin/sections', icon: <Layers size={20} />, label: 'Sections' },
    { to: '/admin/mapping', icon: <Users size={20} />, label: 'Assignments' },
    { to: '/admin/labs', icon: <FlaskConical size={20} />, label: 'Labs' },
    { to: '/admin/timetables', icon: <CalendarDays size={20} />, label: 'Timetables' },
  ];

  const facultyLinks = [
    { to: '/faculty', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/faculty/willingness', icon: <Users size={20} />, label: 'Willingness Form' },
  ];

  const links = isAdmin ? adminLinks : facultyLinks;

  return (
    <aside className="sidebar">
      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          position: fixed;
          background: white;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem 0;
          z-index: 50;
        }
        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2.5rem;
          width: 100%;
        }
        .logo-icon {
          background: var(--primary);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          align-items: center;
          flex: 1;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          color: var(--text-muted);
          text-decoration: none;
          transition: all 0.2s;
        }
        .sidebar-link:hover {
          background: var(--bg-main);
          color: var(--primary);
          transform: translateY(-2px);
        }
        .sidebar-link.active {
          background: var(--primary-light);
          color: var(--primary);
        }
        .user-profile {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 100%;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
        }
        .logout-btn {
          width: 48px;
          height: 48px;
          border: none;
          background: #fee2e2;
          color: var(--danger);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .logout-btn:hover {
          background: #fca5a5;
          transform: translateY(-2px);
        }
      `}</style>

      <div className="logo" title="SCET Portal">
        <div className="logo-icon"><CalendarDays size={24} /></div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink 
            key={link.to} 
            to={link.to} 
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            end={link.to === '/admin' || link.to === '/faculty'}
            title={link.label}
          >
            {link.icon}
          </NavLink>
        ))}
      </nav>

      <div className="user-profile">
        <div 
          title={`${user?.name} (${user?.role})`} 
          style={{
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: 'var(--primary-light)', 
            color: 'var(--primary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: 'bold',
            fontSize: '14px',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            cursor: 'help'
          }}
        >
          {user?.name?.charAt(0) || 'U'}
        </div>
        <button onClick={onLogout} className="logout-btn" title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

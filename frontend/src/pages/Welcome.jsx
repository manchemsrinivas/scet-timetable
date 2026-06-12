
import { Link } from 'react-router-dom';

const Welcome = () => {
  return (
    <div className="welcome-wrapper">
      <style>{`
        .welcome-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top right, #4f46e5, transparent),
                      radial-gradient(circle at bottom left, #818cf8, transparent),
                      #f8fafc;
          padding: 2rem;
          text-align: center;
        }
        .welcome-card {
          max-width: 800px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          padding: 4rem 2rem;
          border-radius: 2rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .welcome-logo {
          font-size: 4rem;
          margin-bottom: 1.5rem;
        }
        .welcome-title {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(to right, #4f46e5, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1rem;
        }
        .welcome-subtitle {
          font-size: 1.25rem;
          color: #475569;
          margin-bottom: 3rem;
          line-height: 1.6;
        }
        .cta-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .btn-welcome {
          padding: 1rem 2.5rem;
          font-size: 1.1rem;
          border-radius: 1rem;
          transition: transform 0.2s;
        }
        .btn-welcome:hover {
          transform: translateY(-2px);
        }
      `}</style>
      
      <div className="welcome-card">
        <div className="welcome-logo">📅</div>
        <h1 className="welcome-title">SCET Timetable Management</h1>
        <p className="welcome-subtitle">
          Efficient, conflict-free scheduling for faculty and students. <br/>
          Streamline your department's academic planning with our intelligent GA engine.
        </p>
        
        <div className="cta-group">
          <Link to="/login" className="btn btn-primary btn-welcome">
            Sign In to Portal
          </Link>
          <Link to="/register" className="btn btn-outline btn-welcome">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Welcome;

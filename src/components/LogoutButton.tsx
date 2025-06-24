import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../Database/firebase';

const LogoutButton: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      navigate('/');
    } catch (error: any) {
      alert('Logout failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      style={{
        ...styles.button,
        ...(isHovered ? styles.buttonHover : {}),
        ...(isLoading ? styles.buttonLoading : {})
      }}
    >
      <div style={styles.buttonContent}>
        {isLoading ? (
          <>
            <div style={styles.spinner}></div>
            <span style={styles.text}>Signing out...</span>
          </>
        ) : (
          <>
            <svg 
              style={styles.icon} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span style={styles.text}>Sign Out</span>
          </>
        )}
      </div>
    </button>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  button: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    padding: '12px 20px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    zIndex: 1000,
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    minWidth: '120px',
    overflow: 'hidden',
  },
  buttonHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.6)',
    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
  },
  buttonLoading: {
    cursor: 'not-allowed',
    opacity: 0.8,
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  icon: {
    width: '16px',
    height: '16px',
    transition: 'transform 0.3s ease',
  },
  text: {
    whiteSpace: 'nowrap' as const,
    letterSpacing: '0.5px',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Add keyframes for spinner animation
const styleSheet = document.createElement('style');
styleSheet.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default LogoutButton;
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App'; // Import the useAuth hook from your App.tsx

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Get the current user from auth context

  const links = [
    { name: 'Dashboard', path: '/home', icon: '📊' },
    { name: 'Residents', path: '/residents', icon: '👥' },
    { name: 'Households', path: '/households', icon: '🏠' },
    { name: 'Users', path: '/users', icon: '👤' },
    { name: 'Documents', path: '/documents', icon: '📄' },
    { name: 'Blotter Reports', path: '/blotter', icon: '📋' },
  ];

  // Helper function to format role display
  const formatRole = (role: string) => {
    if (role === 'secretary') return 'Secretary';
    if (role === 'clerk') return 'BSPO';
    return role;
  };

  // Helper function to get role icon
  const getRoleIcon = (role: string) => {
    if (role === 'secretary') return '👑';
    if (role === 'clerk') return '📝';
    return '👤';
  };

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <div style={styles.logo}>🏛️</div>
        <h2 style={styles.title}>Caridad BPS</h2>
        <p style={styles.subtitle}>Barangay Portal System</p>
      </div>
      
      {/* User Info Section */}
      {user && (
        <div style={styles.userInfo}>
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>
              {getRoleIcon(user.role)}
            </div>
            <div style={styles.userDetails}>        
              <div style={styles.userEmail}>
                {user.email}
              </div>
              <div style={styles.userRole}>
                <span style={styles.roleIcon}>{getRoleIcon(user.role)}</span>
                {formatRole(user.role)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <nav style={styles.nav}>
        {links.map(link => (
          <div
            key={link.path}
            onClick={() => navigate(link.path)}
            style={{
              ...styles.link,
              ...(location.pathname === link.path ? styles.activeLink : {})
            }}
          >
            <span style={styles.icon}>{link.icon}</span>
            <span style={styles.linkText}>{link.name}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  sidebar: {
    width: '260px',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '0',
    boxSizing: 'border-box',
    position: 'fixed',
    top: 0,
    left: 0,
    boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '30px 20px 20px',
    textAlign: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logo: {
    fontSize: '32px',
    marginBottom: '10px',
  },
  title: {
    margin: '0 0 5px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: 'white',
  },
  subtitle: {
    margin: '0',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '300',
  },
  userInfo: {
    padding: '20px 15px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '12px',
    backdropFilter: 'blur(10px)',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    marginRight: '12px',
    flexShrink: 0,
  },
  userDetails: {
    flex: 1,
    overflow: 'hidden',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    marginBottom: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  roleIcon: {
    marginRight: '4px',
    fontSize: '12px',
  },
  nav: {
    padding: '10px 10px 0',
    flex: 1,
    overflow: 'auto',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 15px',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.8)',
    borderRadius: '8px',
    margin: '2px 0',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    fontWeight: '400',
  },
  activeLink: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: 'white',
    fontWeight: '500',
    transform: 'translateX(5px)',
  },
  icon: {
    marginRight: '12px',
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },
  linkText: {
    flex: 1,
  }
};

export default Sidebar;
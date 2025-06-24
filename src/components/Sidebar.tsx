import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { name: 'Dashboard', path: '/home', icon: '📊' },
    { name: 'Residents', path: '/residents', icon: '👥' },
    { name: 'Households', path: '/households', icon: '🏠' },
    { name: 'Users', path: '/users', icon: '👤' },
    { name: 'Documents', path: '/documents', icon: '📄' },
    { name: 'Blotter Reports', path: '/blotter', icon: '📋' },
  ];

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <div style={styles.logo}>🏛️</div>
        <h2 style={styles.title}>Caridad BPS</h2>
        <p style={styles.subtitle}>Barangay Portal System</p>
      </div>
      
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
  },
  header: {
    padding: '30px 20px',
    textAlign: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '20px',
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
  nav: {
    padding: '0 10px',
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
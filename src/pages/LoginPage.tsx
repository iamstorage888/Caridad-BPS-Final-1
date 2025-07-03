import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../Database/firebase';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const isNavigatingRef = useRef(false);
  const componentMountedRef = useRef(true);

  const validateForm = () => {
    const newErrors = { email: '', password: '', general: '' };
    let isValid = true;

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || isNavigatingRef.current || loading) return;

    setLoading(true);
    setErrors({ email: '', password: '', general: '' });

    try {
      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      if (!componentMountedRef.current) return;
      
      // Fetch user data from Firestore to get role information
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!componentMountedRef.current) return;
      
      if (!userDocSnap.exists()) {
        throw new Error('User profile not found. Please contact administrator.');
      }
      
      const userData = userDocSnap.data();
      
      // Validate that user has a role
      if (!userData.role || !['secretary', 'clerk'].includes(userData.role)) {
        throw new Error('Invalid user role. Please contact administrator.');
      }
      
      // Store user data in localStorage for role-based routing
      const userInfo = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: userData.role,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        displayName: userData.displayName || `${userData.firstName} ${userData.lastName}` || firebaseUser.email,
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem('user', JSON.stringify(userInfo));
      
      // Set navigation flag to prevent multiple navigations
      isNavigatingRef.current = true;
      
      // Navigate immediately without delay to prevent glitching
      if (componentMountedRef.current) {
        navigate('/home', { replace: true });
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (!componentMountedRef.current) return;
      
      let errorMessage = '';
      if (error.message && error.message.includes('User profile not found')) {
        errorMessage = error.message;
      } else if (error.message && error.message.includes('Invalid user role')) {
        errorMessage = error.message;
      } else {
        errorMessage = getFirebaseErrorMessage(error.code);
      }
      
      setErrors({ 
        email: '', 
        password: '', 
        general: errorMessage
      });
      
      setLoading(false);
    }
  };

  const getFirebaseErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again';
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled. Contact administrator';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return 'Login failed. Please check your credentials and try again';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && !isNavigatingRef.current) {
      handleLogin(e as any);
    }
  };

  // Cleanup and prevent memory leaks
  useEffect(() => {
    componentMountedRef.current = true;
    
    return () => {
      componentMountedRef.current = false;
    };
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    if (isNavigatingRef.current) return;
    
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.role && componentMountedRef.current && !isNavigatingRef.current) {
          isNavigatingRef.current = true;
          navigate('/home', { replace: true });
        }
      } catch (error) {
        // Invalid user data, clear localStorage
        localStorage.removeItem('user');
      }
    }
  }, [navigate]);

  // Prevent rendering if navigating
  if (isNavigatingRef.current) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Background Pattern */}
      <div style={styles.backgroundPattern}></div>
      
      {/* Main Content */}
      <div style={styles.container}>
        {/* Header Section */}
        <div style={styles.header}>
          <div style={styles.logo}>🏛️</div>
          <h1 style={styles.title}>Caridad BPS</h1>
          <p style={styles.subtitle}>Barangay Portal System</p>
          <div style={styles.divider}></div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={styles.form}>
          <h2 style={styles.formTitle}>Welcome Back</h2>
          <p style={styles.formSubtitle}>Sign in to access your dashboard</p>

          {errors.general && (
            <div style={styles.errorAlert}>
              <span style={styles.errorIcon}>⚠️</span>
              {errors.general}
            </div>
          )}

          {/* Email Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>📧</span>
              Email Address
            </label>
            <div style={styles.inputContainer}>
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{
                  ...styles.input,
                  ...(errors.email ? styles.inputError : {})
                }}
                disabled={loading}
                autoComplete="email"
              />
              <span style={styles.inputIcon}>👤</span>
            </div>
            {errors.email && (
              <span style={styles.fieldError}>{errors.email}</span>
            )}
          </div>

          {/* Password Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>🔒</span>
              Password
            </label>
            <div style={styles.inputContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{
                  ...styles.input,
                  ...(errors.password ? styles.inputError : {})
                }}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.togglePassword}
                disabled={loading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && (
              <span style={styles.fieldError}>{errors.password}</span>
            )}
          </div>

          {/* Login Button */}
          <button 
            type="submit" 
            style={styles.loginButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <span style={styles.buttonSpinner}></span>
                Signing In...
              </>
            ) : (
              <>
                <span style={styles.buttonIcon}>🚀</span>
                Sign In
              </>
            )}
          </button>

          {/* Role Information */}
          <div style={styles.roleInfo}>
            <div style={styles.roleInfoHeader}>
              <span style={styles.roleInfoIcon}>ℹ️</span>
              Access Levels
            </div>
            <div style={styles.roleList}>
              <div style={styles.roleItem}>
                <span style={styles.roleIcon}>👑</span>
                <div>
                  <strong>Secretary:</strong> Full system access
                </div>
              </div>
              <div style={styles.roleItem}>
                <span style={styles.roleIcon}>📝</span>
                <div>
                  <strong>BSPO:</strong> Residents & households management
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            © 2025 Caridad Barangay Portal System
          </p>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.1,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  },
  container: {
    width: '100%',
    maxWidth: '440px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
  },
  loadingText: {
    margin: '16px 0 0 0',
    color: '#64748b',
    fontSize: '16px',
  },
  header: {
    textAlign: 'center',
    padding: '40px 30px 30px',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
    borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
  },
  logo: {
    fontSize: '48px',
    marginBottom: '16px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0',
    fontWeight: '400',
  },
  divider: {
    width: '60px',
    height: '3px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    margin: '20px auto 0',
    borderRadius: '2px',
  },
  form: {
    padding: '40px 30px 30px',
  },
  formTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 30px 0',
    textAlign: 'center',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '20px',
  },
  errorIcon: {
    marginRight: '8px',
    fontSize: '16px',
  },
  inputGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  labelIcon: {
    marginRight: '8px',
    fontSize: '16px',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '14px 16px 14px 48px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    color: '#374151',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
    color: '#9ca3af',
  },
  togglePassword: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: '#6b7280',
    padding: '4px',
    borderRadius: '4px',
    transition: 'color 0.2s ease',
  },
  fieldError: {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px',
    display: 'block',
  },
  loginButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
    marginBottom: '24px',
  },
  buttonIcon: {
    marginRight: '8px',
    fontSize: '18px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  buttonSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
  },
  roleInfo: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  roleInfoHeader: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },
  roleInfoIcon: {
    marginRight: '8px',
    fontSize: '16px',
  },
  roleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  roleItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    color: '#64748b',
  },
  roleIcon: {
    marginRight: '8px',
    fontSize: '16px',
  },
  footer: {
    textAlign: 'center',
    padding: '20px 30px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    color: '#64748b',
    fontSize: '12px',
    margin: '0',
  },
};

// Create stylesheet only once and ensure it's not duplicated
const createStyleSheet = () => {
  // Remove existing stylesheet if it exists
  const existingSheet = document.getElementById('login-page-styles');
  if (existingSheet) {
    existingSheet.remove();
  }

  const styleSheet = document.createElement('style');
  styleSheet.id = 'login-page-styles';
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    input:focus {
      outline: none !important;
      border-color: #667eea !important;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
    }
    
    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
    }
    
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }
    
    button[type="button"]:hover:not(:disabled) {
      color: #374151 !important;
      background-color: #f3f4f6 !important;
    }
  `;
  document.head.appendChild(styleSheet);
};

// Initialize stylesheet  
createStyleSheet();

export default LoginPage;
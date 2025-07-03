import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../Database/firebase';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';

const AddUser: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.role) {
      setError('All fields are required');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    // Store the current user before creating a new one
    const currentUser = auth.currentUser;

    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Add user data to Firestore with role
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: formData.email,
        role: formData.role,
        createdAt: new Date().toISOString()
      });

      // Sign out the newly created user to prevent auto-login
      await signOut(auth);

      // If there was a current user before, they would need to sign back in
      // Note: This is a limitation of the client-side approach
      // For production, consider using Firebase Admin SDK on the backend

      setSuccess(`User created successfully with ${formData.role} role!`);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        role: ''
      });

      // Navigate back to users page after a short delay
      setTimeout(() => {
        navigate('/users');
      }, 2000);

    } catch (error: any) {
      console.error('Error creating user:', error);
      
      // Handle specific Firebase Auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/weak-password':
          setError('Password is too weak');
          break;
        default:
          setError('Failed to create user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/users');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <LogoutButton />
        </div>
        
        <div style={styles.contentWrapper}>
          <div style={styles.floatingCard}>
            <div style={styles.cardHeader}>
              <div style={styles.headerContent}>
                <button style={styles.backButton} onClick={handleCancel}>
                  <div style={styles.backIcon}>←</div>
                </button>
                <div style={styles.titleSection}>
                  <h1 style={styles.title}>Create New User</h1>
                  <p style={styles.subtitle}>Add a new team member to your workspace</p>
                </div>
              </div>
              <div style={styles.decorativeElement}></div>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="email">
                    <span style={styles.labelIcon}>✉</span>
                    Email Address
                  </label>
                  <div style={styles.inputWrapper}>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        ...styles.input,
                        ...(focusedField === 'email' ? styles.inputFocused : {})
                      }}
                      placeholder="john.doe@company.com"
                      disabled={loading}
                    />
                    <div style={styles.inputUnderline}></div>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="role">
                    <span style={styles.labelIcon}>👤</span>
                    User Role
                  </label>
                  <div style={styles.inputWrapper}>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      onFocus={() => setFocusedField('role')}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        ...styles.select,
                        ...(focusedField === 'role' ? styles.inputFocused : {})
                      }}
                      disabled={loading}
                    >
                      <option value="">Select a role...</option>
                      <option value="secretary">Secretary (Full Access)</option>
                      <option value="clerk">BSPO (Household & Residency Only)</option>
                    </select>
                    <div style={styles.inputUnderline}></div>
                  </div>
                  <div style={styles.roleDescription}>
                    {formData.role === 'secretary' && (
                      <p style={styles.roleDescText}>
                        <span style={styles.roleDescIcon}>🔐</span>
                        Full access to all features including users, documents, and blotter reports
                      </p>
                    )}
                    {formData.role === 'clerk' && (
                      <p style={styles.roleDescText}>
                        <span style={styles.roleDescIcon}>🏠</span>
                        Limited access to household and residency management only
                      </p>
                    )}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="password">
                    <span style={styles.labelIcon}>🔒</span>
                    Password
                  </label>
                  <div style={styles.inputWrapper}>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        ...styles.input,
                        ...styles.passwordInput,
                        ...(focusedField === 'password' ? styles.inputFocused : {})
                      }}
                      placeholder="Minimum 6 characters"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      style={styles.eyeButton}
                      disabled={loading}
                    >
                      <span style={styles.eyeIcon}>
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </span>
                    </button>
                    <div style={styles.inputUnderline}></div>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="confirmPassword">
                    <span style={styles.labelIcon}>🔐</span>
                    Confirm Password
                  </label>
                  <div style={styles.inputWrapper}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        ...styles.input,
                        ...styles.passwordInput,
                        ...(focusedField === 'confirmPassword' ? styles.inputFocused : {})
                      }}
                      placeholder="Re-enter password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={toggleConfirmPasswordVisibility}
                      style={styles.eyeButton}
                      disabled={loading}
                    >
                      <span style={styles.eyeIcon}>
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </span>
                    </button>
                    <div style={styles.inputUnderline}></div>
                  </div>
                </div>
              </div>

              {error && (
                <div style={styles.errorMessage}>
                  <div style={styles.messageIcon}>⚠</div>
                  <div style={styles.messageContent}>
                    <strong>Oops!</strong>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {success && (
                <div style={styles.successMessage}>
                  <div style={styles.messageIcon}>🎉</div>
                  <div style={styles.messageContent}>
                    <strong>Success!</strong>
                    <span>{success}</span>
                  </div>
                </div>
              )}

              <div style={styles.buttonSection}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={styles.cancelButton}
                  disabled={loading}
                >
                  <span style={styles.buttonIcon}>←</span>
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? (
                    <div style={styles.loadingContent}>
                      <div style={styles.spinner}></div>
                      <span>Creating User...</span>
                    </div>
                  ) : (
                    <>
                      <span style={styles.buttonIcon}>✨</span>
                      <span>Create User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Background decorative elements */}
          <div style={styles.bgDecoration1}></div>
          <div style={styles.bgDecoration2}></div>
          <div style={styles.bgDecoration3}></div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginLeft: '220px',
    padding: '20px',
    width: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '24px',
    position: 'relative',
    zIndex: 10
  },
  contentWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 120px)',
    position: 'relative',
    zIndex: 5
  },
  floatingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '0',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 32px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    maxWidth: '600px',
    width: '100%',
    overflow: 'hidden',
    transform: 'translateY(0px)',
    transition: 'transform 0.3s ease'
  },
  cardHeader: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '32px',
    position: 'relative',
    overflow: 'hidden'
  },
  headerContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    position: 'relative',
    zIndex: 2
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    color: 'white'
  },
  backIcon: {
    fontSize: '20px',
    fontWeight: '700'
  },
  titleSection: {
    flex: 1
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '32px',
    fontWeight: '700',
    color: 'white',
    letterSpacing: '-0.5px',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },
  subtitle: {
    margin: 0,
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
    lineHeight: '1.5'
  },
  decorativeElement: {
    position: 'absolute',
    top: '-50px',
    right: '-50px',
    width: '150px',
    height: '150px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    zIndex: 1
  },
  form: {
    padding: '40px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '32px'
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '28px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '4px'
  },
  labelIcon: {
    fontSize: '18px'
  },
  inputWrapper: {
    position: 'relative'
  },
  input: {
    width: '100%',
    padding: '16px 20px',
    border: 'none',
    borderBottom: '2px solid #e1e8ed',
    borderRadius: '12px 12px 0 0',
    fontSize: '16px',
    backgroundColor: '#f8fafc',
    transition: 'all 0.3s ease',
    outline: 'none',
    fontWeight: '500',
    boxSizing: 'border-box'
  },
  passwordInput: {
    paddingRight: '60px'
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '40px',
    height: '40px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    zIndex: 10
  },
  eyeIcon: {
    fontSize: '18px',
    color: '#64748b',
    transition: 'color 0.2s ease'
  },
  select: {
    width: '100%',
    padding: '16px 20px',
    border: 'none',
    borderBottom: '2px solid #e1e8ed',
    borderRadius: '12px 12px 0 0',
    fontSize: '16px',
    backgroundColor: '#f8fafc',
    transition: 'all 0.3s ease',
    outline: 'none',
    fontWeight: '500',
    boxSizing: 'border-box',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '18px'
  },
  inputFocused: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#667eea',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
    transform: 'translateY(-2px)'
  },
  inputUnderline: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    height: '2px',
    width: '0%',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
    transition: 'width 0.3s ease'
  },
  roleDescription: {
    marginTop: '8px'
  },
  roleDescText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '12px 16px',
    borderRadius: '8px',
    margin: 0,
    fontWeight: '500',
    border: '1px solid #e2e8f0'
  },
  roleDescIcon: {
    fontSize: '16px'
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    backgroundColor: '#fee2e2',
    borderLeft: '4px solid #ef4444',
    padding: '16px 20px',
    borderRadius: '12px',
    animation: 'slideIn 0.3s ease'
  },
  successMessage: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    backgroundColor: '#dcfce7',
    borderLeft: '4px solid #22c55e',
    padding: '16px 20px',
    borderRadius: '12px',
    animation: 'slideIn 0.3s ease'
  },
  messageIcon: {
    fontSize: '20px',
    marginTop: '2px'
  },
  messageContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  },
  buttonSection: {
    display: 'flex',
    gap: '16px',
    marginTop: '8px'
  },
  cancelButton: {
    flex: '0 0 140px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px 24px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: '2px solid #e2e8f0',
    borderRadius: '16px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  submitButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
    position: 'relative',
    overflow: 'hidden'
  },
  buttonIcon: {
    fontSize: '16px'
  },
  loadingContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  // Background decorations
  bgDecoration1: {
    position: 'absolute',
    top: '10%',
    left: '5%',
    width: '120px',
    height: '120px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    zIndex: 1
  },
  bgDecoration2: {
    position: 'absolute',
    bottom: '15%',
    right: '8%',
    width: '80px',
    height: '80px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '50%',
    zIndex: 1
  },
  bgDecoration3: {
    position: 'absolute',
    top: '60%',
    left: '2%',
    width: '60px',
    height: '60px',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '50%',
    zIndex: 1
  }
};

// Enhanced CSS animations and effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes slideIn {
    0% { opacity: 0; transform: translateY(-10px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  /* Input focus effects */
  input:focus + .input-underline,
  select:focus + .input-underline {
    width: 100% !important;
  }

  input:disabled,
  select:disabled {
    background-color: #f1f5f9 !important;
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* Eye button hover effects */
  button[type="button"]:hover .eye-icon {
    color: #667eea !important;
  }

  button[type="button"]:hover {
    background-color: rgba(102, 126, 234, 0.1) !important;
  }

  /* Button hover effects */
  button:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  /* Submit button hover */
  button[type="submit"]:hover:not(:disabled) {
    box-shadow: 0 12px 32px rgba(102, 126, 234, 0.4) !important;
    transform: translateY(-3px);
  }

  button[type="submit"]:active:not(:disabled) {
    transform: translateY(-1px);
  }

  /* Cancel button hover */
  button[type="button"]:hover:not(:disabled) {
    background-color: #e2e8f0 !important;
    border-color: #cbd5e1 !important;
    color: #475569 !important;
  }

  /* Back button hover */
  .back-button:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.3) !important;
    transform: translateY(-2px);
  }

  /* Card hover effect */
  .floating-card:hover {
    transform: translateY(-5px) !important;
    box-shadow: 0 25px 70px rgba(0, 0, 0, 0.2), 0 12px 40px rgba(0, 0, 0, 0.15) !important;
  }

  /* Background animation */
  .bg-decoration {
    animation: float 6s ease-in-out infinite;
  }

  /* Ripple effect for submit button */
  button[type="submit"]:before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  button[type="submit"]:active:before {
    width: 300px;
    height: 300px;
  }

  /* Select dropdown styling */
  select option {
    padding: 12px;
    background: white;
    color: #2c3e50;
  }

  select option:hover {
    background: #f8fafc;
  }

  /* Eye button specific styling */
  .eye-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .eye-button:disabled:hover {
    background-color: transparent !important;
  }

  .eye-button:disabled .eye-icon {
    color: #94a3b8 !important;
  }
`;
document.head.appendChild(styleSheet);

export default AddUser;
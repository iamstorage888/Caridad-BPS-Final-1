import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

interface Household {
  id?: string;
  householdNumber: string;
  householdName: string;
  purok: string;
}

const AddHousehold: React.FC = () => {
  const [formData, setFormData] = useState<Household>({
    householdNumber: '',
    householdName: '',
    purok: ''
  });

  const [existingHouseholds, setExistingHouseholds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const navigate = useNavigate();

  const puroks = [
    'Purok 1',
    'Purok 2',
    'Purok 3',
    'Purok 4',
    'Purok 5',
    'Purok 6',
    'Purok 7',
  ];

  // Fetch existing households with error handling
  const fetchHouseholds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const snapshot = await getDocs(collection(db, 'households'));
      const numbers = snapshot.docs
        .map(doc => doc.data().householdNumber)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      
      setExistingHouseholds(numbers);
    } catch (err) {
      console.error('Error fetching households:', err);
      setError('Failed to load existing households. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHouseholds();
  }, [fetchHouseholds]);

  // Generate smart suggestions for household numbers
  const generateSuggestions = useCallback(() => {
    if (existingHouseholds.length === 0) return ['HH-001', 'HH-002', 'HH-003'];
    
    const numericNumbers = existingHouseholds
      .map(num => {
        const match = num.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0)
      .sort((a, b) => b - a);

    const highest = numericNumbers[0] || 0;
    const suggestions = [];
    
    for (let i = 1; i <= 3; i++) {
      const nextNum = highest + i;
      suggestions.push(`HH-${nextNum.toString().padStart(3, '0')}`);
    }
    
    return suggestions;
  }, [existingHouseholds]);

  useEffect(() => {
    if (!loading) {
      setSuggestions(generateSuggestions());
    }
  }, [loading, generateSuggestions]);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Validate household number
    if (!formData.householdNumber.trim()) {
      newErrors.householdNumber = 'Household number is required';
    } else if (existingHouseholds.includes(formData.householdNumber.trim())) {
      newErrors.householdNumber = 'This household number already exists';
    } else if (formData.householdNumber.trim().length < 2) {
      newErrors.householdNumber = 'Household number must be at least 2 characters';
    }

    // Validate household name
    if (!formData.householdName.trim()) {
      newErrors.householdName = 'Household name is required';
    } else if (formData.householdName.trim().length < 2) {
      newErrors.householdName = 'Household name must be at least 2 characters';
    }

    // Validate purok
    if (!formData.purok) {
      newErrors.purok = 'Please select a Purok';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({ ...prev, householdNumber: suggestion }));
    if (errors.householdNumber) {
      setErrors(prev => ({ ...prev, householdNumber: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const householdData = {
        ...formData,
        householdNumber: formData.householdNumber.trim(),
        householdName: formData.householdName.trim(),
        createdAt: new Date().toISOString(),
      };
      
      await addDoc(collection(db, 'households'), householdData);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/households'); // Adjust route as needed
      }, 2000);
      
    } catch (error: any) {
      console.error('Error adding household:', error);
      setError('Failed to add household. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({ householdNumber: '', householdName: '', purok: '' });
    setErrors({});
    setError(null);
  };

  if (success) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.successTitle}>Household Added Successfully!</h2>
            <p style={styles.successMessage}>
              The new household has been created and saved to the database.
            </p>
            <p style={styles.redirectMessage}>
              Redirecting to households page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button 
              onClick={() => navigate('/households')} 
              style={styles.backButton}
            >
              ← Back to Households
            </button>
            <h1 style={styles.title}>Add New Household</h1>
            <p style={styles.subtitle}>
              Create a new household record for the barangay
            </p>
          </div>
          <div style={styles.headerRight}>
            <LogoutButton />
          </div>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            <span style={styles.errorIcon}>⚠</span>
            <span>{error}</span>
            <button 
              onClick={() => setError(null)} 
              style={styles.dismissButton}
            >
              ×
            </button>
          </div>
        )}

        <div style={styles.formContainer}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>
                🏠 Household Information
              </h3>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  🔢 Household Number *
                </label>
                <input
                  type="text"
                  name="householdNumber"
                  value={formData.householdNumber}
                  onChange={handleChange}
                  placeholder="Enter unique household number (e.g., HH-001)"
                  style={{
                    ...styles.input,
                    ...(errors.householdNumber ? styles.inputError : {})
                  }}
                  disabled={submitting}
                />
                {errors.householdNumber && (
                  <span style={styles.errorText}>{errors.householdNumber}</span>
                )}
                
                {!formData.householdNumber && suggestions.length > 0 && (
                  <div style={styles.suggestionsContainer}>
                    <span style={styles.suggestionsLabel}>Suggested numbers:</span>
                    <div style={styles.suggestions}>
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          style={styles.suggestionButton}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  👨‍👩‍👧‍👦 Household Name *
                </label>
                <input
                  type="text"
                  name="householdName"
                  value={formData.householdName}
                  onChange={handleChange}
                  placeholder="Enter household/family name"
                  style={{
                    ...styles.input,
                    ...(errors.householdName ? styles.inputError : {})
                  }}
                  disabled={submitting}
                />
                {errors.householdName && (
                  <span style={styles.errorText}>{errors.householdName}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  📍 Purok *
                </label>
                <select
                  name="purok"
                  value={formData.purok}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    ...(errors.purok ? styles.inputError : {})
                  }}
                  disabled={submitting}
                >
                  <option value="">Select Purok</option>
                  {puroks.map(purok => (
                    <option key={purok} value={purok}>{purok}</option>
                  ))}
                </select>
                {errors.purok && (
                  <span style={styles.errorText}>{errors.purok}</span>
                )}
              </div>
            </div>

            {existingHouseholds.length > 0 && (
              <div style={styles.infoSection}>
                <div style={styles.infoCard}>
                  <h4 style={styles.infoTitle}>📊 Household Statistics</h4>
                  <div style={styles.statsGrid}>
                    <div style={styles.statItem}>
                      <span style={styles.statNumber}>{existingHouseholds.length}</span>
                      <span style={styles.statLabel}>Total Households</span>
                    </div>
                    <div style={styles.statItem}>
                      <span style={styles.statNumber}>
                        {new Set(existingHouseholds.map(h => {
                          // Try to extract purok info if stored in household number
                          return 'Various';
                        })).size}
                      </span>
                      <span style={styles.statLabel}>Puroks Covered</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={styles.formActions}>
              <button 
                type="button" 
                onClick={handleReset}
                style={styles.resetButton}
                disabled={submitting}
              >
                🔄 Reset Form
              </button>
              <button 
                type="submit" 
                style={{
                  ...styles.submitButton,
                  ...(submitting ? styles.submitButtonDisabled : {})
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span style={styles.spinner}></span>
                    Adding Household...
                  </>
                ) : (
                  <>
                    💾 Add Household
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  mainContent: {
    marginLeft: '260px',
    padding: '24px',
    width: 'calc(100% - 260px)',
    maxWidth: '800px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
  } as React.CSSProperties,
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: '16px',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#6c757d',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '16px',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
  } as React.CSSProperties,
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#212529',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6c757d',
    margin: 0,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '8px',
    marginBottom: '24px',
  } as React.CSSProperties,
  errorIcon: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  dismissButton: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#721c24',
    padding: '0 4px',
  },
  successContainer: {
    textAlign: 'center',
    padding: '64px 24px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
    marginTop: '64px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  } as React.CSSProperties,
  successIcon: {
    fontSize: '64px',
    color: '#28a745',
    marginBottom: '16px',
    display: 'block',
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#28a745',
    margin: '16px 0 8px 0',
  },
  successMessage: {
    fontSize: '16px',
    color: '#6c757d',
    marginBottom: '12px',
    lineHeight: '1.5',
  },
  redirectMessage: {
    fontSize: '14px',
    color: '#495057',
    fontStyle: 'italic',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  form: {
    padding: '32px',
  },
  formSection: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #f8f9fa',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#495057',
    marginBottom: '20px',
  } as React.CSSProperties,
  formGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057',
    marginBottom: '8px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    display: 'block',
    fontSize: '12px',
    color: '#dc3545',
    marginTop: '4px',
  },
  suggestionsContainer: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e9ecef',
  },
  suggestionsLabel: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: '500',
    display: 'block',
    marginBottom: '8px',
  },
  suggestions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  suggestionButton: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  infoSection: {
    marginBottom: '32px',
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#495057',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '16px',
  },
  statItem: {
    textAlign: 'center',
  } as React.CSSProperties,
  statNumber: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#007bff',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: '500',
  },
  formActions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    paddingTop: '24px',
    borderTop: '1px solid #f8f9fa',
    marginTop: '32px',
  } as React.CSSProperties,
  resetButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#6c757d',
    border: '2px solid #dee2e6',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Add CSS for animations and hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .back-button:hover {
    background-color: #e9ecef !important;
    color: #495057 !important;
    transform: translateX(-2px);
  }
  
  .reset-button:hover {
    background-color: #f8f9fa !important;
    color: #495057 !important;
  }
  
  .submit-button:hover:not(:disabled) {
    background-color: #218838 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(40,167,69,0.3);
  }
  
  .suggestion-button:hover {
    background-color: #0056b3 !important;
    transform: translateY(-1px);
  }
  
  input:focus, select:focus {
    border-color: #007bff !important;
    box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
  }
`;
document.head.appendChild(styleSheet);

export default AddHousehold;
import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
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

  const [officialHouseholds, setOfficialHouseholds] = useState<string[]>([]);
  const [unofficialHouseholds, setUnofficialHouseholds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [newHouseholdNumber, setNewHouseholdNumber] = useState('');
  const [householdOption, setHouseholdOption] = useState<'new' | 'existing'>('new');
  const [unofficialHouseholdDetails, setUnofficialHouseholdDetails] = useState<{ number: string; residents: string[] }[]>([]);

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

  // Generate the next household number
  const generateNextHouseholdNumber = useCallback((existingNumbers: string[]) => {
    if (existingNumbers.length === 0) return 'HH-001';
    
    const numericNumbers = existingNumbers
      .map(num => {
        const match = num.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0);

    const highest = Math.max(...numericNumbers, 0);
    const nextNum = highest + 1;
    return `HH-${nextNum.toString().padStart(3, '0')}`;
}, []);

// Fetch official households and residents with household numbers
const fetchHouseholdData = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Get official households
    const householdSnapshot = await getDocs(collection(db, 'households'));
    const officialNumbers = householdSnapshot.docs
      .map(doc => doc.data().householdNumber)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    
    setOfficialHouseholds(officialNumbers);

    // Get residents with household numbers that aren't official yet
    const residentsSnapshot = await getDocs(collection(db, 'residents'));
    const allHouseholdNumbers = residentsSnapshot.docs
      .map(doc => doc.data().householdNumber)
      .filter(Boolean);
    
    const unofficialNumbers = Array.from(new Set(allHouseholdNumbers))
      .filter(num => !officialNumbers.includes(num))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    setUnofficialHouseholds(unofficialNumbers);

    // Build details: for each unofficial number, find who belongs to it
    const details = unofficialNumbers.map(num => {
      const residents = residentsSnapshot.docs
        .filter(doc => doc.data().householdNumber === num)
        .map(doc => {
          const d = doc.data();
          return `${d.firstName || ''} ${d.middleName || ''} ${d.lastName || ''}`.replace(/\s+/g, ' ').trim();
        });
      return { number: num, residents };
    });

    setUnofficialHouseholdDetails(details);

      // Generate next household number
      const nextNumber = generateNextHouseholdNumber(officialNumbers);
      setNewHouseholdNumber(nextNumber);
      setFormData(prev => ({ ...prev, householdNumber: nextNumber }));

    } catch (err) {
      console.error('Error fetching household data:', err);
      setError('Failed to load household data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [generateNextHouseholdNumber]);

  useEffect(() => {
    fetchHouseholdData();
  }, [fetchHouseholdData]);

  // Update household number when option changes
  useEffect(() => {
    if (householdOption === 'new') {
      setFormData(prev => ({ ...prev, householdNumber: newHouseholdNumber }));
    } else {
      setFormData(prev => ({ ...prev, householdNumber: '' }));
    }
  }, [householdOption, newHouseholdNumber]);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Validate household number
    if (!formData.householdNumber.trim()) {
      newErrors.householdNumber = 'Household number is required';
    } else if (householdOption === 'new' && officialHouseholds.includes(formData.householdNumber.trim())) {
      newErrors.householdNumber = 'This household number already exists as an official household';
    } else if (householdOption === 'existing' && !unofficialHouseholds.includes(formData.householdNumber.trim())) {
      newErrors.householdNumber = 'Please select a valid unofficial household';
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
        isOfficial: true,
        membersCount: 0,
        source: householdOption === 'new' ? 'newly_created' : 'from_residents'
      };
      
      await addDoc(collection(db, 'households'), householdData);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/households');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error adding household:', error);
      setError('Failed to add household. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({ 
      householdNumber: householdOption === 'new' ? newHouseholdNumber : '', 
      householdName: '', 
      purok: '' 
    });
    setErrors({});
    setError(null);
    setHouseholdOption('new');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading household data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.successTitle}>Household Added Successfully!</h2>
            <p style={styles.successMessage}>
              The household has been {householdOption === 'new' ? 'created' : 'made official'} and saved to the database.
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
              Create a new official household record or make an unofficial one official
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
            {/* Household Information Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>🏠</span>
                Household Information
              </h3>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Household Assignment</label>
                
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="householdOption"
                      value="new"
                      checked={householdOption === 'new'}
                      onChange={(e) => setHouseholdOption(e.target.value as 'new' | 'existing')}
                      style={styles.radioInput}
                    />
                    <span style={styles.radioText}>
                      🆕 Create New Household
                      {householdOption === 'new' && (
                        <span style={styles.autoNumber}>({newHouseholdNumber})</span>
                      )}
                    </span>
                  </label>
                  
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="householdOption"
                      value="existing"
                      checked={householdOption === 'existing'}
                      onChange={(e) => setHouseholdOption(e.target.value as 'new' | 'existing')}
                      style={styles.radioInput}
                      disabled={unofficialHouseholds.length === 0}
                    />
                    <span style={styles.radioText}>
                      🏠 Make Unofficial Household Official
                      {unofficialHouseholds.length === 0 && (
                        <span style={styles.disabledText}> (No unofficial households)</span>
                      )}
                    </span>
                  </label>
                </div>

                {householdOption === 'new' ? (
                  <div style={styles.householdDisplay}>
                    <input
                      type="text"
                      value={formData.householdNumber}
                      readOnly
                      style={{
                        ...styles.input,
                        ...styles.readOnlyInput
                      }}
                      placeholder="Auto-generated household number"
                    />
                    <small style={styles.householdHint}>
                      ✨ Household number will be automatically assigned: <strong>{newHouseholdNumber}</strong>
                    </small>
                  </div>
                ) : (
                  <select
  value={formData.householdNumber}
  onChange={handleChange}
  name="householdNumber"
  style={styles.input}
>
  <option value="">Select unofficial household to make official</option>
  {unofficialHouseholdDetails.map((detail, idx) => (
    <option key={idx} value={detail.number}>
      {detail.number} — {detail.residents.length > 0 ? detail.residents.join(', ') : 'No residents found'}
    </option>
  ))}
</select>

                )}
                {errors.householdNumber && (
                  <span style={styles.errorText}>{errors.householdNumber}</span>
                )}
              </div>

              <div style={styles.row}>
                <div style={styles.fieldGroup}>
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

                <div style={styles.fieldGroup}>
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
            </div>

            {/* Statistics Section */}
            <div style={styles.infoSection}>
              <div style={styles.infoCard}>
                <h4 style={styles.infoTitle}>📊 Household Statistics</h4>
                <div style={styles.statsGrid}>
                  <div style={styles.statItem}>
                    <span style={styles.statNumber}>{officialHouseholds.length}</span>
                    <span style={styles.statLabel}>Official Households</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statNumber}>{unofficialHouseholds.length}</span>
                    <span style={styles.statLabel}>Unofficial Households</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statNumber}>{puroks.length}</span>
                    <span style={styles.statLabel}>Total Puroks</span>
                  </div>
                </div>
              </div>
            </div>

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
                    <span style={styles.buttonSpinner}></span>
                    {householdOption === 'new' ? 'Creating Household...' : 'Making Household Official...'}
                  </>
                ) : (
                  <>
                    💾 {householdOption === 'new' ? 'Create Household' : 'Make Household Official'}
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

// Updated styles with new components
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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px',
  } as React.CSSProperties,
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
  section: {
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
  sectionIcon: {
    fontSize: '20px',
  },
  fieldGroup: {
    marginBottom: '24px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
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
  readOnlyInput: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
    cursor: 'not-allowed',
  },
  errorText: {
    display: 'block',
    fontSize: '12px',
    color: '#dc3545',
    marginTop: '4px',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  } as React.CSSProperties,
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  radioInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  radioText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#495057',
  },
  autoNumber: {
    color: '#007bff',
    fontWeight: '600',
    marginLeft: '8px',
  },
  disabledText: {
    color: '#6c757d',
    fontSize: '12px',
    fontStyle: 'italic',
  },
  householdDisplay: {
    marginBottom: '16px',
  },
  householdHint: {
    display: 'block',
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '4px',
    fontStyle: 'italic',
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
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  buttonSpinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default AddHousehold;
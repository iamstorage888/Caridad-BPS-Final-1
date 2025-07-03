import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

interface AddBlotter {
  id?: string;
  complainant: string;
  respondent: string;
  incidentType: string;
  incidentDate: string;
  location: string;
  details: string;
}

interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
}

const AddBlotter: React.FC = () => {
  const [formData, setFormData] = useState<AddBlotter>({
    complainant: '',
    respondent: '',
    incidentType: '',
    incidentDate: '',
    location: '',
    details: '',
  });

  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

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

  const incidentTypes = [
    'Theft',
    'Assault',
    'Vandalism',
    'Noise Complaint',
    'Property Dispute',
    'Domestic Violence',
    'Public Disturbance',
    'Harassment',
    'Other'
  ];

  // Fetch residents with error handling
  const fetchResidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const querySnapshot = await getDocs(collection(db, 'residents'));
      const fetchedResidents: Resident[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          middleName: data.middleName || '',
        };
      });
      
      // Sort residents alphabetically by last name
      fetchedResidents.sort((a, b) => a.lastName.localeCompare(b.lastName));
      setResidents(fetchedResidents);
    } catch (err) {
      console.error('Error fetching residents:', err);
      setError('Failed to load residents. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.complainant.trim()) {
      newErrors.complainant = 'Complainant is required';
    }
    if (!formData.respondent.trim()) {
      newErrors.respondent = 'Respondent is required';
    }
    if (!formData.incidentType.trim()) {
      newErrors.incidentType = 'Incident type is required';
    }
    if (!formData.incidentDate) {
      newErrors.incidentDate = 'Incident date is required';
    } else {
      const selectedDate = new Date(formData.incidentDate);
      const today = new Date();
      if (selectedDate > today) {
        newErrors.incidentDate = 'Incident date cannot be in the future';
      }
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!formData.details.trim()) {
      newErrors.details = 'Incident details are required';
    } else if (formData.details.trim().length < 10) {
      newErrors.details = 'Please provide more detailed information (at least 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      
      // Add timestamp for creation
      const blotterData = {
        ...formData,
        createdAt: new Date().toISOString(),
        status: 'Pending'
      };
      
      await addDoc(collection(db, 'blotters'), blotterData);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/blotter');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error submitting blotter:', error);
      setError('Failed to submit blotter report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatResidentName = (resident: Resident): string => {
    const middleInitial = resident.middleName ? ` ${resident.middleName.charAt(0)}.` : '';
    return `${resident.lastName}, ${resident.firstName}${middleInitial}`;
  };

  if (success) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.successTitle}>Report Submitted Successfully!</h2>
            <p style={styles.successMessage}>
              Your blotter report has been saved and is now pending review.
            </p>
            <p style={styles.redirectMessage}>
              Redirecting to reports page...
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
              onClick={() => navigate('/blotter')} 
              style={styles.backButton}
            >
              ← Back to Reports
            </button>
            <h1 style={styles.title}>Add Blotter Report</h1>
            <p style={styles.subtitle}>
              Fill out the form below to create a new blotter report
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
                👥 Involved Parties
              </h3>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    👤 Complainant *
                  </label>
                  <select
                    name="complainant"
                    value={formData.complainant}
                    onChange={handleChange}
                    style={{
                      ...styles.input,
                      ...(errors.complainant ? styles.inputError : {})
                    }}
                    disabled={loading}
                  >
                    <option value="">
                      {loading ? 'Loading residents...' : 'Select Complainant'}
                    </option>
                    {residents.map(resident => (
                      <option key={resident.id} value={formatResidentName(resident)}>
                        {formatResidentName(resident)}
                      </option>
                    ))}
                  </select>
                  {errors.complainant && (
                    <span style={styles.errorText}>{errors.complainant}</span>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    👤 Respondent *
                  </label>
                  <input
                    name="respondent"
                    type="text"
                    value={formData.respondent}
                    onChange={handleChange}
                    placeholder="Enter respondent name"
                    style={{
                      ...styles.input,
                      ...(errors.respondent ? styles.inputError : {})
                    }}
                  />
                  {errors.respondent && (
                    <span style={styles.errorText}>{errors.respondent}</span>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>
                📄 Incident Information
              </h3>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    ⚠ Type of Incident *
                  </label>
                  <select
                    name="incidentType"
                    value={formData.incidentType}
                    onChange={handleChange}
                    style={{
                      ...styles.input,
                      ...(errors.incidentType ? styles.inputError : {})
                    }}
                  >
                    <option value="">Select incident type</option>
                    {incidentTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.incidentType && (
                    <span style={styles.errorText}>{errors.incidentType}</span>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    📅 Date of Incident *
                  </label>
                  <input
                    name="incidentDate"
                    type="date"
                    value={formData.incidentDate}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    style={{
                      ...styles.input,
                      ...(errors.incidentDate ? styles.inputError : {})
                    }}
                  />
                  {errors.incidentDate && (
                    <span style={styles.errorText}>{errors.incidentDate}</span>
                  )}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  📍 Location *
                </label>
                <select
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    ...(errors.location ? styles.inputError : {})
                  }}
                >
                  <option value="">Select Purok</option>
                  {puroks.map(purok => (
                    <option key={purok} value={purok}>{purok}</option>
                  ))}
                </select>
                {errors.location && (
                  <span style={styles.errorText}>{errors.location}</span>
                )}
              </div>
            </div>

            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>
                📝 Details
              </h3>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Incident Details *
                </label>
                <textarea
                  name="details"
                  value={formData.details}
                  onChange={handleChange}
                  placeholder="Provide detailed information about the incident..."
                  style={{
                    ...styles.textarea,
                    ...(errors.details ? styles.inputError : {})
                  }}
                />
                <div style={styles.charCount}>
                  {formData.details.length} characters
                  {formData.details.length < 10 && formData.details.length > 0 && (
                    <span style={styles.charCountWarning}> (minimum 10)</span>
                  )}
                </div>
                {errors.details && (
                  <span style={styles.errorText}>{errors.details}</span>
                )}
              </div>
            </div>

            <div style={styles.formActions}>
              <button 
                type="button" 
                onClick={() => navigate('/blotter-reports')}
                style={styles.cancelButton}
                disabled={submitting}
              >
                Cancel
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
                    Submitting...
                  </>
                ) : (
                  <>
                    💾 Submit Report
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
    marginLeft: '260px', // Updated to match sidebar width
    padding: '24px',
    width: 'calc(100% - 260px)', // Updated to match sidebar width
    maxWidth: '1000px',
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
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  } as React.CSSProperties,
  formGroup: {
    marginBottom: '20px',
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
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    backgroundColor: '#fff',
    minHeight: '120px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  charCount: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '4px',
    textAlign: 'right',
  } as React.CSSProperties,
  charCountWarning: {
    color: '#dc3545',
    fontWeight: '500',
  },
  errorText: {
    display: 'block',
    fontSize: '12px',
    color: '#dc3545',
    marginTop: '4px',
  },
  formActions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    paddingTop: '24px',
    borderTop: '1px solid #f8f9fa',
    marginTop: '32px',
  } as React.CSSProperties,
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#6c757d',
    border: '2px solid #dee2e6',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#007bff',
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

// Add CSS for animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .form-input:focus {
    border-color: #007bff !important;
    box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
  }
  
  .back-button:hover {
    background-color: #e9ecef !important;
    color: #495057 !important;
    transform: translateX(-2px);
  }
  
  .cancel-button:hover {
    background-color: #f8f9fa !important;
    color: #495057 !important;
  }
  
  .submit-button:hover:not(:disabled) {
    background-color: #0056b3 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,123,255,0.3);
  }
  
  .form-container {
    transition: all 0.3s ease;
  }
  
  .form-container:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important;
  }
`;
document.head.appendChild(styleSheet);

export default AddBlotter;
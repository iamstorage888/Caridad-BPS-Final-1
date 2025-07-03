import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const RequestDocument: React.FC = () => {
  const navigate = useNavigate();
  const [residents, setResidents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isForNonResident, setIsForNonResident] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    documentType: '',
    purpose: '',
  });

  // Additional form state for dry docking certificate (non-residents)
  const [dryDockingForm, setDryDockingForm] = useState({
    fullName: '',
    boatNumber: '',
    address: '',
  });

  // Form state for dry docking certificate (barangay residents)
  const [residentDryDockingForm, setResidentDryDockingForm] = useState({
    boatNumber: '',
  });

  const documentTypes = [
    { value: 'Brgy Clearance', label: 'Barangay Clearance', icon: '📋' },
    { value: 'Brgy Residency', label: 'Barangay Residency', icon: '🏠' },
    { value: 'Brgy Permit', label: 'Barangay Permit', icon: '📄' },
    { value: 'Certificate of Indigency', label: 'Certificate of Indigency', icon: '💼' },
    { value: 'Certificate Dry Docking', label: 'Certificate Dry Docking', icon: '⚓' },
    { value: 'Certificate of Attestation', label: 'Certificate of Attestation', icon: '✅' },
  ];

  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'residents'));
        const names = snapshot.docs.map(doc => {
          const data = doc.data();
          return `${data.firstName} ${data.middleName || ''} ${data.lastName}`.trim();
        });
        setResidents(names);
      } catch (error) {
        console.error('Error fetching residents:', error);
      }
    };

    fetchResidents();
  }, []);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // For dry docking certificates, validation depends on whether it's for a resident or non-resident
    if (form.documentType === 'Certificate Dry Docking') {
      if (isForNonResident) {
        // Non-resident validation
        if (!dryDockingForm.fullName.trim()) {
          newErrors.dryDockingFullName = 'Please enter full name';
        }
        if (!dryDockingForm.boatNumber.trim()) {
          newErrors.boatNumber = 'Please enter boat number';
        }
        if (!dryDockingForm.address.trim()) {
          newErrors.address = 'Please enter address';
        }
      } else {
        // Resident validation
        if (!form.fullName.trim()) {
          newErrors.fullName = 'Please select a resident';
        }
        if (!residentDryDockingForm.boatNumber.trim()) {
          newErrors.boatNumber = 'Please enter boat number';
        }
      }
    } else {
      // For all other document types, require resident selection
      if (!form.fullName.trim()) {
        newErrors.fullName = 'Please select a resident';
      }
    }

    if (!form.documentType.trim()) {
      newErrors.documentType = 'Please select a document type';
    }
    if (!form.purpose.trim()) {
      newErrors.purpose = 'Please provide a purpose';
    } else if (form.purpose.trim().length < 10) {
      newErrors.purpose = 'Purpose must be at least 10 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Reset dry docking forms when document type changes
    if (name === 'documentType') {
      if (value !== 'Certificate Dry Docking') {
        setDryDockingForm({
          fullName: '',
          boatNumber: '',
          address: '',
        });
        setResidentDryDockingForm({
          boatNumber: '',
        });
        setIsForNonResident(false);
      }
    }
  };

  const handleResidentDryDockingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setResidentDryDockingForm(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDryDockingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setDryDockingForm(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNonResidentToggle = () => {
    setIsForNonResident(!isForNonResident);
    // Clear form data when switching
    setForm(prev => ({ ...prev, fullName: '' }));
    setDryDockingForm({
      fullName: '',
      boatNumber: '',
      address: '',
    });
    setResidentDryDockingForm({
      boatNumber: '',
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const documentData: any = {
        ...form,
        status: 'Pending',
        createdAt: new Date(),
      };

      // Add dry docking specific data if applicable
      if (form.documentType === 'Certificate Dry Docking') {
        if (isForNonResident) {
          documentData.fullName = dryDockingForm.fullName;
          documentData.dryDockingDetails = {
            isNonResident: true,
            boatNumber: dryDockingForm.boatNumber,
            address: dryDockingForm.address,
          };
        } else {
          documentData.dryDockingDetails = {
            isNonResident: false,
            boatNumber: residentDryDockingForm.boatNumber,
          };
        }
      }

      const docRef = await addDoc(collection(db, 'documentRequests'), documentData);
      
      // Show success message
      alert('Document request submitted successfully!');
      navigate(`/documents/view/${docRef.id}`);
    } catch (err: any) {
      alert('Failed to submit request: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
    },
    mainContent: {
      flex: 1,
      marginLeft: '250px',
      padding: '0',
    },
    header: {
      display: 'flex',
      justifyContent: 'flex-end',
      padding: '1rem',
      backgroundColor: '#fff',
      borderBottom: '1px solid #e0e0e0',
    },
    contentWrapper: {
      padding: '2rem',
    },
    pageHeader: {
      marginBottom: '2rem',
    },
    pageTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.5rem',
    },
    pageIcon: {
      fontSize: '2rem',
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      color: '#333',
      margin: 0,
    },
    subtitle: {
      fontSize: '1.1rem',
      color: '#666',
      margin: 0,
    },
    formContainer: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '2rem',
      alignItems: 'start',
    },
    form: {
      backgroundColor: '#fff',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    },
    fieldGroup: {
      marginBottom: '1.5rem',
    },
    label: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '1rem',
      fontWeight: '500',
      color: '#333',
      marginBottom: '0.5rem',
    },
    labelIcon: {
      fontSize: '1.2rem',
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '1rem',
      boxSizing: 'border-box' as const,
    },
    textarea: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '1rem',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const,
    },
    inputError: {
      borderColor: '#f44336',
    },
    errorText: {
      color: '#f44336',
      fontSize: '0.875rem',
      marginTop: '0.25rem',
      display: 'block',
    },
    charCount: {
      fontSize: '0.875rem',
      color: '#666',
      marginTop: '0.25rem',
    },
    toggleContainer: {
      backgroundColor: '#f9f9f9',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      padding: '1rem',
    },
    toggleLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      cursor: 'pointer',
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
    },
    checkboxLabel: {
      fontSize: '1rem',
      color: '#333',
    },
    conditionalFormContainer: {
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '6px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
    },
    conditionalFormHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '1rem',
    },
    conditionalFormIcon: {
      fontSize: '1.5rem',
    },
    conditionalFormTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#333',
      margin: 0,
    },
    submitButton: {
      backgroundColor: '#4CAF50',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '4px',
      fontSize: '1rem',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      transition: 'background-color 0.2s',
    },
    submitButtonDisabled: {
      backgroundColor: '#cccccc',
      cursor: 'not-allowed',
    },
    buttonIcon: {
      fontSize: '1.2rem',
    },
    spinner: {
      fontSize: '1rem',
    },
    infoCard: {
      backgroundColor: '#fff',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      height: 'fit-content',
    },
    infoHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '1rem',
    },
    infoIcon: {
      fontSize: '1.5rem',
    },
    infoTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#333',
      margin: 0,
    },
    infoList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <LogoutButton />
        </div>
        
        <div style={styles.contentWrapper}>
          <div style={styles.pageHeader}>
            <div style={styles.pageTitle}>
              <span style={styles.pageIcon}>📄</span>
              <h1 style={styles.title}>Request Document</h1>
            </div>
            <p style={styles.subtitle}>
              Submit a request for official barangay documents
            </p>
          </div>

          <div style={styles.formContainer}>
            <form onSubmit={handleSubmit} style={styles.form}>
              
              {/* Document Type Field - Show first for dry docking */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>📋</span>
                  Document Type
                </label>
                <select
                  name="documentType"
                  value={form.documentType}
                  onChange={handleChange}
                  required
                  style={{
                    ...styles.input,
                    ...(errors.documentType ? styles.inputError : {})
                  }}
                >
                  <option value="">Select Document Type</option>
                  {documentTypes.map((doc) => (
                    <option key={doc.value} value={doc.value}>
                      {doc.icon} {doc.label}
                    </option>
                  ))}
                </select>
                {errors.documentType && (
                  <span style={styles.errorText}>{errors.documentType}</span>
                )}
              </div>

              {/* Toggle for Dry Docking Certificate */}
              {form.documentType === 'Certificate Dry Docking' && (
                <div style={styles.fieldGroup}>
                  <div style={styles.toggleContainer}>
                    <label style={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={isForNonResident}
                        onChange={handleNonResidentToggle}
                        style={styles.checkbox}
                      />
                      <span style={styles.checkboxLabel}>
                        This is for a non-resident (not from this barangay)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Conditional Full Name Field */}
              {form.documentType !== 'Certificate Dry Docking' || !isForNonResident ? (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelIcon}>👤</span>
                    Resident Name
                  </label>
                  <select
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                    style={{
                      ...styles.input,
                      ...(errors.fullName ? styles.inputError : {})
                    }}
                  >
                    <option value="">Select Resident</option>
                    {residents.map((name, index) => (
                      <option key={index} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {errors.fullName && (
                    <span style={styles.errorText}>{errors.fullName}</span>
                  )}
                </div>
              ) : null}

              {/* Conditional Dry Docking Forms */}
              {form.documentType === 'Certificate Dry Docking' && (
                <>
                  {!isForNonResident ? (
                    /* Form for Barangay Residents */
                    <div style={styles.conditionalFormContainer}>
                      <div style={styles.conditionalFormHeader}>
                        <span style={styles.conditionalFormIcon}>🏠</span>
                        <h3 style={styles.conditionalFormTitle}>Barangay Resident Details</h3>
                      </div>
                      
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>
                          <span style={styles.labelIcon}>🚢</span>
                          Boat Number
                        </label>
                        <input
                          type="text"
                          name="boatNumber"
                          value={residentDryDockingForm.boatNumber}
                          onChange={handleResidentDryDockingChange}
                          placeholder="Enter boat number"
                          style={{
                            ...styles.input,
                            ...(errors.boatNumber ? styles.inputError : {})
                          }}
                        />
                        {errors.boatNumber && (
                          <span style={styles.errorText}>{errors.boatNumber}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Form for Non-Residents */
                    <div style={styles.conditionalFormContainer}>
                      <div style={styles.conditionalFormHeader}>
                        <span style={styles.conditionalFormIcon}>⚓</span>
                        <h3 style={styles.conditionalFormTitle}>Non-Resident Details</h3>
                      </div>
                      
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>
                          <span style={styles.labelIcon}>👤</span>
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={dryDockingForm.fullName}
                          onChange={handleDryDockingChange}
                          placeholder="Enter full name"
                          style={{
                            ...styles.input,
                            ...(errors.dryDockingFullName ? styles.inputError : {})
                          }}
                        />
                        {errors.dryDockingFullName && (
                          <span style={styles.errorText}>{errors.dryDockingFullName}</span>
                        )}
                      </div>

                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>
                          <span style={styles.labelIcon}>🚢</span>
                          Boat Number
                        </label>
                        <input
                          type="text"
                          name="boatNumber"
                          value={dryDockingForm.boatNumber}
                          onChange={handleDryDockingChange}
                          placeholder="Enter boat number"
                          style={{
                            ...styles.input,
                            ...(errors.boatNumber ? styles.inputError : {})
                          }}
                        />
                        {errors.boatNumber && (
                          <span style={styles.errorText}>{errors.boatNumber}</span>
                        )}
                      </div>

                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>
                          <span style={styles.labelIcon}>📍</span>
                          Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={dryDockingForm.address}
                          onChange={handleDryDockingChange}
                          placeholder="Enter complete address"
                          style={{
                            ...styles.input,
                            ...(errors.address ? styles.inputError : {})
                          }}
                        />
                        {errors.address && (
                          <span style={styles.errorText}>{errors.address}</span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Purpose Field */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>📝</span>
                  Purpose
                </label>
                <textarea
                  name="purpose"
                  value={form.purpose}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Please specify the purpose for requesting this document..."
                  style={{
                    ...styles.textarea,
                    ...(errors.purpose ? styles.inputError : {})
                  }}
                />
                <div style={styles.charCount}>
                  {form.purpose.length} characters
                </div>
                {errors.purpose && (
                  <span style={styles.errorText}>{errors.purpose}</span>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isLoading}
                style={{
                  ...styles.submitButton,
                  ...(isLoading ? styles.submitButtonDisabled : {})
                }}
              >
                {isLoading ? (
                  <>
                    <span style={styles.spinner}>⏳</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span style={styles.buttonIcon}>📤</span>
                    Submit Request
                  </>
                )}
              </button>
            </form>

            {/* Info Card */}
            <div style={styles.infoCard}>
              <div style={styles.infoHeader}>
                <span style={styles.infoIcon}>ℹ️</span>
                <h3 style={styles.infoTitle}>Processing Information</h3>
              </div>
              <ul style={styles.infoList}>
                <li>Processing time: 3-5 business days</li>
                <li>You will receive a notification once ready</li>
                <li>Bring valid ID when claiming documents</li>
                <li>Some documents may require additional fees</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  mainContent: {
    marginLeft: '260px',
    width: 'calc(100% - 260px)',
    minHeight: '100vh',
  },
  header: {
    padding: '20px 30px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  contentWrapper: {
    padding: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  pageHeader: {
    marginBottom: '30px',
  },
  pageTitle: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
  },
  pageIcon: {
    fontSize: '32px',
    marginRight: '15px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
  },
  subtitle: {
    margin: 0,
    fontSize: '16px',
    color: '#64748b',
    fontWeight: '400',
  },
  formContainer: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '30px',
    alignItems: 'start',
  },
  form: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
    border: '1px solid #e2e8f0',
  },
  fieldGroup: {
    marginBottom: '25px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  labelIcon: {
    marginRight: '8px',
    fontSize: '16px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  charCount: {
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'right',
    marginTop: '4px',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px',
    display: 'block',
  },
  conditionalFormContainer: {
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '25px',
  },
  conditionalFormHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid #e2e8f0',
  },
  conditionalFormIcon: {
    fontSize: '24px',
    marginRight: '12px',
  },
  conditionalFormTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  },
  submitButtonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
    transform: 'none',
  },
  buttonIcon: {
    fontSize: '18px',
  },
  spinner: {
    fontSize: '16px',
    animation: 'spin 1s linear infinite',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
    border: '1px solid #e2e8f0',
    height: 'fit-content',
  },
  infoHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
  },
  infoIcon: {
    fontSize: '20px',
    marginRight: '10px',
  },
  infoTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#64748b',
    lineHeight: '1.6',
  },


  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '10px',
  },

  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
  },

  checkbox: {
    marginRight: '8px',
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },

  checkboxLabel: {
    fontSize: '14px',
    color: '#374151',
  },
  
};

export default RequestDocument;
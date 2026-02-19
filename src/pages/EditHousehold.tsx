import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface HouseholdData {
  householdName: string;
  householdNumber: string;
  purok: string;
}

const EditHousehold: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<HouseholdData>({
    householdName: '',
    householdNumber: '',
    purok: '',
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<HouseholdData>>({});
  const [originalData, setOriginalData] = useState<HouseholdData | null>(null);

  useEffect(() => {
    const fetchHousehold = async () => {
      if (!id) {
        navigate('/households');
        return;
      }

      setIsLoading(true);
      try {
        const docRef = doc(db, 'households', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as HouseholdData;
          setFormData(data);
          setOriginalData(data);
        } else {
          alert('❌ Household not found');
          navigate('/households');
        }
      } catch (error) {
        console.error('Error fetching household:', error);
        alert('❌ Failed to load household data');
        navigate('/households');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHousehold();
  }, [id, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Partial<HouseholdData> = {};

    if (!formData.householdName.trim()) {
      newErrors.householdName = 'Household name is required';
    } else if (formData.householdName.trim().length < 2) {
      newErrors.householdName = 'Household name must be at least 2 characters';
    }

    if (!formData.purok) {
      newErrors.purok = 'Purok selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasChanges = (): boolean => {
    if (!originalData) return false;
    return (
      formData.householdName !== originalData.householdName ||
      formData.purok !== originalData.purok
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name as keyof HouseholdData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!hasChanges()) {
      alert('ℹ️ No changes detected');
      return;
    }

    if (!id) return;

    setIsSubmitting(true);
    
    try {
      const updatedData = {
        ...formData,
        householdName: formData.householdName.trim(),
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'households', id), updatedData);
      alert('✅ Household updated successfully!');
      navigate('/households');
    } catch (error: any) {
      console.error('Error updating household:', error);
      alert('❌ Failed to update household: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      const confirmCancel = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmCancel) return;
    }
    navigate('/households');
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}>⏳</div>
            <p style={styles.loadingText}>Loading household data...</p>
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
            <div style={styles.breadcrumb}>
              <span style={styles.breadcrumbItem}>Households</span>
              <span style={styles.breadcrumbSeparator}>›</span>
              <span style={styles.breadcrumbActive}>Edit Household</span>
            </div>
            <h1 style={styles.pageTitle}>🏠 Edit Household</h1>
            <p style={styles.pageSubtitle}>Update household information</p>
          </div>
          <LogoutButton />
        </div>

        <div style={styles.formContainer}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>📋</span>
                Household Information
              </h3>

              {/* Household Number - Read Only */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Household Number</label>
                <div style={styles.readOnlyDisplay}>
                  🏷️ {formData.householdNumber}
                </div>
                <small style={styles.readOnlyHint}>
                  Household number cannot be changed
                </small>
              </div>

              {/* Household Name */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  Household Name <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="householdName"
                  value={formData.householdName}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    ...(errors.householdName ? styles.inputError : {})
                  }}
                  placeholder="Enter household name"
                  required
                />
                {errors.householdName && (
                  <span style={styles.errorText}>{errors.householdName}</span>
                )}
              </div>

              {/* Purok */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  Purok <span style={styles.required}>*</span>
                </label>
                <select
                  name="purok"
                  value={formData.purok}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    ...(errors.purok ? styles.inputError : {})
                  }}
                  required
                >
                  <option value="">Select Purok</option>
                  {[1, 2, 3, 4, 5, 6, 7].map(n => (
                    <option key={n} value={`Purok ${n}`}>
                      Purok {n}
                    </option>
                  ))}
                </select>
                {errors.purok && (
                  <span style={styles.errorText}>{errors.purok}</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={styles.actionSection}>
              <div style={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={styles.cancelButton}
                  disabled={isSubmitting}
                >
                  <span style={styles.buttonIcon}>❌</span>
                  Cancel
                </button>
                
                <button
                  type="submit"
                  style={{
                    ...styles.submitButton,
                    ...(isSubmitting || !hasChanges() ? styles.submitButtonDisabled : {})
                  }}
                  disabled={isSubmitting || !hasChanges()}
                >
                  {isSubmitting ? (
                    <>
                      <span style={styles.spinner}>⏳</span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <span style={styles.buttonIcon}>💾</span>
                      Update Household
                    </>
                  )}
                </button>
              </div>
              
              {!hasChanges() && originalData && (
                <p style={styles.noChangesText}>
                  ℹ️ Make changes to enable the update button
                </p>
              )}
            </div>
          </form>
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
    flex: 1,
    padding: '0',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '30px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  headerLeft: {
    flex: 1,
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '14px',
    opacity: 0.8,
  },
  breadcrumbItem: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  breadcrumbSeparator: {
    margin: '0 8px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  breadcrumbActive: {
    color: 'white',
    fontWeight: '500',
  },
  pageTitle: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    fontWeight: '600',
  },
  pageSubtitle: {
    margin: '0',
    fontSize: '16px',
    opacity: 0.8,
    fontWeight: '300',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
  },
  loadingText: {
    marginTop: '16px',
    fontSize: '16px',
    color: '#6b7280',
  },
  formContainer: {
    flex: 1,
    padding: '40px',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  },
  form: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    margin: '0 0 24px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
  },
  sectionIcon: {
    marginRight: '12px',
    fontSize: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '20px',
  },
  label: {
    fontWeight: '600',
    marginBottom: '6px',
    color: '#374151',
    fontSize: '14px',
  },
  required: {
    color: '#ef4444',
    marginLeft: '2px',
  },
  input: {
    padding: '12px 16px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px',
    fontWeight: '500',
  },
  readOnlyDisplay: {
    padding: '12px 16px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  readOnlyHint: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px',
    fontStyle: 'italic',
  },
  actionSection: {
    paddingTop: '32px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  buttonGroup: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  cancelButton: {
    background: '#f3f4f6',
    color: '#374151',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  buttonIcon: {
    marginRight: '8px',
    fontSize: '14px',
  },
  spinner: {
    marginRight: '8px',
    animation: 'spin 1s linear infinite',
  },
  noChangesText: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    margin: '0',
  },
};

export default EditHousehold;
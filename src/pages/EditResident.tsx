import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

const EditResident: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    sex: '',
    birthday: '',
    occupation: '',
    status: '',
    address: '',
    education: '',
    religion: '',
    householdNumber: '',
    isFamilyHead: false,
  });

  const [households, setHouseholds] = useState<string[]>([]);
  const [hasFamilyHead, setHasFamilyHead] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const residentDoc = await getDoc(doc(db, 'residents', id));
        if (residentDoc.exists()) {
          const data = residentDoc.data();
          setFormData(data as typeof formData);
        }

        const snapshot = await getDocs(collection(db, 'households'));
        const list = snapshot.docs.map(doc => doc.data().householdNumber);
        setHouseholds(list);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    const checkFamilyHead = async () => {
      if (!formData.householdNumber) return;
      const q = query(
        collection(db, 'residents'),
        where('householdNumber', '==', formData.householdNumber),
        where('isFamilyHead', '==', true)
      );
      const snapshot = await getDocs(q);
      setHasFamilyHead(!snapshot.empty && snapshot.docs[0].id !== id);
    };

    checkFamilyHead();
  }, [formData.householdNumber, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' && (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await updateDoc(doc(db, 'residents', id!), formData);
      
      // Show success message with better UX
      const successMessage = document.createElement('div');
      successMessage.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 500;
        ">
          ✅ Resident updated successfully!
        </div>
      `;
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        document.body.removeChild(successMessage);
        navigate('/residents');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error updating resident:', error);
      alert('Failed to update resident: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/residents');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.content}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading resident data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.breadcrumb}>
            <span style={styles.breadcrumbItem} onClick={() => navigate('/residents')}>
              Residents
            </span>
            <span style={styles.breadcrumbSeparator}>›</span>
            <span style={styles.breadcrumbCurrent}>Edit Resident</span>
          </div>
          <LogoutButton />
        </div>

        <div style={styles.pageTitle}>
          <h1 style={styles.title}>✏️ Edit Resident</h1>
          <p style={styles.subtitle}>Update resident information and household details</p>
        </div>

        <div style={styles.formCard}>
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Personal Information Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>👤 Personal Information</h3>
              <div style={styles.row}>
                {[
                  ['Last Name', 'lastName', '👤'],
                  ['First Name', 'firstName', '👤'],
                  ['Middle Name', 'middleName', '👤'],
                ].map(([label, name, icon]) => (
                  <div key={name} style={styles.inputGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelIcon}>{icon}</span>
                      {label}
                    </label>
                    <input
                      name={name}
                      value={(formData as any)[name]}
                      onChange={handleChange}
                      style={styles.input}
                      placeholder={`Enter ${label.toLowerCase()}`}
                      required
                    />
                  </div>
                ))}
              </div>

              <div style={styles.row}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelIcon}>⚤</span>
                    Sex
                  </label>
                  <select 
                    name="sex" 
                    value={formData.sex} 
                    onChange={handleChange} 
                    style={styles.select} 
                    required
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelIcon}>🎂</span>
                    Birthday
                  </label>
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contact & Address Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📍 Contact & Address</h3>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>🏠</span>
                  Address
                </label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Enter complete address"
                  required
                />
              </div>
            </div>

            {/* Professional Information Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>💼 Professional Information</h3>
              <div style={styles.row}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelIcon}>💼</span>
                    Occupation
                  </label>
                  <input
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Enter occupation"
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelIcon}>📊</span>
                    Status
                  </label>
                  <input
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Enter status"
                    required
                  />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelIcon}>🎓</span>
                    Highest Educational Attainment
                  </label>
                  <input
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Enter educational attainment"
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelIcon}>⛪</span>
                    Religion
                  </label>
                  <input
                    name="religion"
                    value={formData.religion}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Enter religion"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Household Information Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🏘️ Household Information</h3>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>🏠</span>
                  Household Number
                </label>
                <select
                  name="householdNumber"
                  value={formData.householdNumber}
                  onChange={handleChange}
                  style={styles.select}
                  required
                >
                  <option value="">Select household number</option>
                  {households.map((num, idx) => (
                    <option key={idx} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div style={styles.checkboxContainer}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="isFamilyHead"
                    checked={formData.isFamilyHead}
                    onChange={handleChange}
                    disabled={hasFamilyHead}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkboxText}>
                    👨‍👩‍👧‍👦 Are you a Family Head?
                  </span>
                  {hasFamilyHead && (
                    <span style={styles.disabledText}>
                      (This household already has a family head)
                    </span>
                  )}
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={styles.buttonContainer}>
              <button 
                type="button" 
                onClick={handleCancel}
                style={styles.cancelButton}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={styles.submitButton}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span style={styles.buttonSpinner}></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <span style={styles.buttonIcon}>💾</span>
                    Update Resident
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

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  content: {
    marginLeft: '260px',
    flex: 1,
    padding: '0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#64748b',
  },
  breadcrumbItem: {
    cursor: 'pointer',
    color: '#667eea',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  },
  breadcrumbSeparator: {
    margin: '0 8px',
    color: '#cbd5e1',
  },
  breadcrumbCurrent: {
    color: '#475569',
    fontWeight: '500',
  },
  pageTitle: {
    padding: '30px 30px 20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
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
  formCard: {
    margin: '0 30px 30px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  form: {
    padding: '30px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '20px',
    paddingBottom: '8px',
    borderBottom: '2px solid #f3f4f6',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },
  labelIcon: {
    marginRight: '8px',
    fontSize: '16px',
  },
  input: {
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  select: {
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    cursor: 'pointer',
  },
  checkboxContainer: {
    marginTop: '20px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    marginRight: '12px',
    marginTop: '2px',
    accentColor: '#667eea',
  },
  checkboxText: {
    fontWeight: '500',
    lineHeight: '1.5',
  },
  disabledText: {
    color: '#9ca3af',
    fontSize: '12px',
    fontStyle: 'italic',
    marginLeft: '8px',
  },
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '24px',
    borderTop: '1px solid #f3f4f6',
    marginTop: '32px',
  },
  cancelButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.25)',
  },
  buttonIcon: {
    marginRight: '8px',
    fontSize: '16px',
  },
  buttonSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: '500',
  },
};

// Add CSS animation for spinners
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  input:focus, select:focus {
    outline: none;
    border-color: #667eea !important;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 12px -2px rgba(102, 126, 234, 0.25) !important;
  }
  
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;
document.head.appendChild(styleSheet);

export default EditResident;
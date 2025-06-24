import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

const EditDocumentRequest: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [residents, setResidents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [form, setForm] = useState({
    fullName: '',
    documentType: '',
    purpose: '',
    status: 'Pending',
  });

  const documentTypes = [
    { value: 'Brgy Clearance', label: 'Barangay Clearance', icon: '📋' },
    { value: 'Brgy Residency', label: 'Barangay Residency', icon: '🏠' },
    { value: 'Brgy Permit', label: 'Barangay Permit', icon: '📄' },
    { value: 'Certificate of Indigency', label: 'Certificate of Indigency', icon: '💼' },
    { value: 'Certificate Dry Docking', label: 'Certificate Dry Docking', icon: '⚓' },
    { value: 'Certificate of Attestation', label: 'Certificate of Attestation', icon: '✅' },
  ];

  const statusOptions = [
    { value: 'Pending', label: 'Pending', icon: '⏳' },
    { value: 'In Progress', label: 'In Progress', icon: '🔄' },
    { value: 'Approved', label: 'Approved', icon: '✅' },
    { value: 'Rejected', label: 'Rejected', icon: '❌' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch residents
        const residentsSnapshot = await getDocs(collection(db, 'residents'));
        const names = residentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return `${data.firstName} ${data.middleName || ''} ${data.lastName}`.trim();
        });
        setResidents(names);

        // Fetch document request
        if (id) {
          const docRef = doc(db, 'documentRequests', id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setForm({
              fullName: data.fullName || '',
              documentType: data.documentType || '',
              purpose: data.purpose || '',
              status: data.status || 'Pending',
            });
          } else {
            alert('Document request not found');
            navigate('/documents');
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Error loading data');
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = 'Please select a resident';
    }
    if (!form.documentType.trim()) {
      newErrors.documentType = 'Please select a document type';
    }
    if (!form.purpose.trim()) {
      newErrors.purpose = 'Please provide a purpose';
    } else if (form.purpose.trim().length < 10) {
      newErrors.purpose = 'Purpose must be at least 10 characters long';
    }
    if (!form.status.trim()) {
      newErrors.status = 'Please select a status';
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (id) {
        const docRef = doc(db, 'documentRequests', id);
        await updateDoc(docRef, {
          ...form,
          updatedAt: new Date(),
        });
        
        alert('Document request updated successfully!');
        navigate(`/documents/view/${id}`);
      }
    } catch (err: any) {
      alert('Failed to update request: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.header}>
            <LogoutButton />
          </div>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading document request...</p>
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
          <LogoutButton />
        </div>
        
        <div style={styles.contentWrapper}>
          <div style={styles.pageHeader}>
            <div style={styles.breadcrumb}>
              <button 
                onClick={() => navigate('/documents')}
                style={styles.breadcrumbLink}
              >
                📋 Documents
              </button>
              <span style={styles.breadcrumbSeparator}>›</span>
              <span style={styles.breadcrumbCurrent}>Edit Request</span>
            </div>
            
            <div style={styles.pageTitle}>
              <span style={styles.pageIcon}>✏️</span>
              <h1 style={styles.title}>Edit Document Request</h1>
            </div>
            <p style={styles.subtitle}>
              Update the details of this document request
            </p>
          </div>

          <div style={styles.formContainer}>
            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Full Name Field */}
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

              {/* Document Type Field */}
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

              {/* Status Field */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>📊</span>
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  required
                  style={{
                    ...styles.input,
                    ...(errors.status ? styles.inputError : {})
                  }}
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.icon} {status.label}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <span style={styles.errorText}>{errors.status}</span>
                )}
              </div>

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

              {/* Action Buttons */}
              <div style={styles.buttonGroup}>
                <button 
                  type="button"
                  onClick={() => navigate('/documents')}
                  style={styles.cancelButton}
                >
                  <span style={styles.buttonIcon}>❌</span>
                  Cancel
                </button>
                
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
                      Updating...
                    </>
                  ) : (
                    <>
                      <span style={styles.buttonIcon}>💾</span>
                      Update Request
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Info Card */}
            <div style={styles.infoCard}>
              <div style={styles.infoHeader}>
                <span style={styles.infoIcon}>ℹ️</span>
                <h3 style={styles.infoTitle}>Edit Information</h3>
              </div>
              <ul style={styles.infoList}>
                <li>Changes will be saved immediately</li>
                <li>Status updates may trigger notifications</li>
                <li>Original creation date will be preserved</li>
                <li>Update timestamp will be recorded</li>
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
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    fontSize: '14px',
  },
  breadcrumbLink: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'none',
    padding: '0',
  },
  breadcrumbSeparator: {
    margin: '0 8px',
    color: '#94a3b8',
  },
  breadcrumbCurrent: {
    color: '#64748b',
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
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '30px',
  },
  cancelButton: {
    flex: 1,
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#64748b',
    background: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  submitButton: {
    flex: 1,
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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    gap: '16px',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '16px',
    margin: 0,
  },
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (!document.head.querySelector('style[data-spinner]')) {
  styleSheet.setAttribute('data-spinner', 'true');
  document.head.appendChild(styleSheet);
}

export default EditDocumentRequest;
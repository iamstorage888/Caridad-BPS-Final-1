import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../Database/firebase';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';

interface Resident {
  id: string;
  lastName: string;
  firstName: string;
  middleName: string;
  address: string;
  birthday?: any;
  createdAt?: any;
  education?: string;
  householdNumber?: string;
  isFamilyHead?: boolean;
  movedInDate?: any;
  occupation?: string;
  religion?: string;
  sex?: string;
  status?: string;
}

const ResidentView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResident = async () => {
    if (!id) {
      setError('No resident ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const docRef = doc(db, 'residents', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setResident({
          id: docSnap.id,
          ...docSnap.data()
        } as Resident);
      } else {
        setError('Resident not found');
      }
    } catch (error) {
      console.error('Error fetching resident:', error);
      setError('Failed to fetch resident details');
    } finally {
      setLoading(false);
    }
  };

const handleBack = () => {
  navigate(-1);
};


  const handleEdit = () => {
    navigate(`/edit-resident/${id}`);
  };

  const formatDate = (date: any) => {
    if (!date) return 'Not specified';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const calculateAge = (birthday: any) => {
    if (!birthday) return 'Not specified';
    try {
      const birth = birthday.toDate ? birthday.toDate() : new Date(birthday);
      const today = new Date();
      const age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        return age - 1;
      }
      return age;
    } catch (error) {
      return 'Invalid date';
    }
  };

  useEffect(() => {
    fetchResident();
  }, [id]);

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading resident details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.errorContainer}>
            <span style={styles.errorIcon}>⚠️</span>
            <h2 style={styles.errorTitle}>Error</h2>
            <p style={styles.errorText}>{error}</p>
            <button style={styles.backButton} onClick={handleBack}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.errorContainer}>
            <span style={styles.errorIcon}>👤</span>
            <h2 style={styles.errorTitle}>Resident Not Found</h2>
            <p style={styles.errorText}>The resident you're looking for doesn't exist.</p>
            <button style={styles.backButton} onClick={handleBack}>
              ← Back 
            </button>
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
            <button style={styles.backButton} onClick={handleBack}>
              ← Back to Residents
            </button>
            <div style={styles.titleSection}>
              <h1 style={styles.title}>Resident Details</h1>
              <p style={styles.subtitle}>View resident information</p>
            </div>
          </div>
          <div style={styles.headerRight}>
            <button style={styles.editButton} onClick={handleEdit}>
              ✏️ Edit Resident
            </button>
            <LogoutButton />
          </div>
        </div>

        <div style={styles.contentContainer}>
          {/* Main Info Card */}
          <div style={styles.mainInfoCard}>
            <div style={styles.profileSection}>
              <div style={styles.avatar}>👤</div>
              <div style={styles.profileInfo}>
                <h2 style={styles.fullName}>
                  {`${resident.firstName} ${resident.middleName} ${resident.lastName}`}
                </h2>
                <div style={styles.statusContainer}>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: resident.status === 'Active' ? '#dcfce7' : '#fee2e2',
                    color: resident.status === 'Active' ? '#166534' : '#991b1b'
                  }}>
                    {resident.status || 'Not specified'}
                  </span>
                  {resident.isFamilyHead && (
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: '#ddd6fe',
                      color: '#5b21b6',
                      marginLeft: '8px'
                    }}>
                      Family Head
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div style={styles.detailsGrid}>
            {/* Personal Information */}
            <div style={styles.detailCard}>
              <h3 style={styles.cardTitle}>Personal Information</h3>
              <div style={styles.detailsList}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>First Name:</span>
                  <span style={styles.detailValue}>{resident.firstName}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Middle Name:</span>
                  <span style={styles.detailValue}>{resident.middleName || 'Not specified'}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Last Name:</span>
                  <span style={styles.detailValue}>{resident.lastName}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Gender:</span>
                  <span style={styles.detailValue}>{resident.sex || 'Not specified'}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Birth Date:</span>
                  <span style={styles.detailValue}>{formatDate(resident.birthday)}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Age:</span>
                  <span style={styles.detailValue}>{calculateAge(resident.birthday)}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Education:</span>
                  <span style={styles.detailValue}>{resident.education || 'Not specified'}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Occupation:</span>
                  <span style={styles.detailValue}>{resident.occupation || 'Not specified'}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Religion:</span>
                  <span style={styles.detailValue}>{resident.religion || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {/* Contact & Household Information */}
            <div style={styles.detailCard}>
              <h3 style={styles.cardTitle}>Contact & Household Information</h3>
              <div style={styles.detailsList}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Address:</span>
                  <span style={styles.detailValue}>{resident.address}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Household Number:</span>
                  <span style={styles.detailValue}>{resident.householdNumber || 'Not specified'}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Family Head:</span>
                  <span style={styles.detailValue}>{resident.isFamilyHead ? 'Yes' : 'No'}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Moved In Date:</span>
                  <span style={styles.detailValue}>{formatDate(resident.movedInDate)}</span>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div style={styles.detailCard}>
              <h3 style={styles.cardTitle}>System Information</h3>
              <div style={styles.detailsList}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Resident ID:</span>
                  <span style={styles.detailValue}>{resident.id}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Date Added:</span>
                  <span style={styles.detailValue}>{formatDate(resident.createdAt)}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Status:</span>
                  <span style={styles.detailValue}>{resident.status || 'Not specified'}</span>
                </div>
              </div>
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
    padding: '30px',
    width: 'calc(100% - 260px)',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a202c',
    margin: '0 0 5px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0',
  },
  backButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
    alignSelf: 'flex-start',
  },
  editButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
    marginRight: '150px',
    boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)',
  },
  contentContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  mainInfoCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  profileSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  avatar: {
    fontSize: '48px',
    backgroundColor: '#e2e8f0',
    padding: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '88px',
    minHeight: '88px',
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  fullName: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#1a202c',
    margin: '0',
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  statusBadge: {
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a202c',
    margin: '0 0 20px 0',
    paddingBottom: '12px',
    borderBottom: '2px solid #e2e8f0',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  detailLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
    minWidth: '120px',
    flexShrink: 0,
  },
  detailValue: {
    fontSize: '14px',
    color: '#1a202c',
    fontWeight: '400',
    textAlign: 'right',
    wordBreak: 'break-word',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    color: '#64748b',
    fontSize: '14px',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px',
  },
  errorIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1a202c',
    margin: '0',
  },
  errorText: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0',
    textAlign: 'center',
  },
};

export default ResidentView;
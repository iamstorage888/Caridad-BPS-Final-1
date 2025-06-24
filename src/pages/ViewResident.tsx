import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../Database/firebase';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';

interface ResidentData {
  lastName: string;
  firstName: string;
  middleName: string;
  sex: string;
  birthday: string;
  occupation: string;
  status: string;
  address: string;
  education: string;
  religion: string;
  householdNumber: string;
  isFamilyHead: boolean;
}

const ViewResident: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resident, setResident] = useState<ResidentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResident = async () => {
      if (!id) {
        setError('Invalid resident ID.');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'residents', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setResident(docSnap.data() as ResidentData);
        } else {
          setError('Resident not found.');
        }
      } catch (error) {
        console.error('Error fetching resident:', error);
        setError('Failed to fetch resident data.');
      } finally {
        setLoading(false);
      }
    };

    fetchResident();
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const calculateAge = (birthday: string) => {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>Loading resident information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>⚠️</div>
            <h3 style={styles.errorTitle}>Error</h3>
            <p style={styles.errorMessage}>{error}</p>
            <button 
              onClick={() => navigate('/residents')} 
              style={styles.backButton}
            >
              Back to Residents
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!resident) {
    return null;
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button 
              onClick={() => navigate('/residents')} 
              style={styles.backBtn}
            >
              ← Back
            </button>
            <div style={styles.headerInfo}>
              <h1 style={styles.pageTitle}>Resident Profile</h1>
              <p style={styles.pageSubtitle}>Detailed information about the resident</p>
            </div>
          </div>
          <LogoutButton />
        </div>

        <div style={styles.profileContainer}>
          <div style={styles.profileHeader}>
            <div style={styles.avatar}>
              <span style={styles.avatarText}>
                {resident.firstName.charAt(0)}{resident.lastName.charAt(0)}
              </span>
            </div>
            <div style={styles.profileInfo}>
              <h2 style={styles.fullName}>
                {resident.firstName} {resident.middleName} {resident.lastName}
              </h2>
              <div style={styles.badges}>
                <span style={styles.badge}>
                  {resident.sex === 'M' ? '👨 Male' : '👩 Female'}
                </span>
                <span style={styles.badge}>
                  🎂 {calculateAge(resident.birthday)} years old
                </span>
                {resident.isFamilyHead && (
                  <span style={styles.badgeSpecial}>
                    👑 Family Head
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={styles.detailsGrid}>
            <div style={styles.detailCard}>
              <h3 style={styles.cardTitle}>📋 Personal Information</h3>
              <div style={styles.cardContent}>
                <div style={styles.detailRow}>
                  <span style={styles.label}>Birthday:</span>
                  <span style={styles.value}>{formatDate(resident.birthday)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.label}>Civil Status:</span>
                  <span style={styles.value}>{resident.status}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.label}>Religion:</span>
                  <span style={styles.value}>{resident.religion}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.label}>Educational Attainment:</span>
                  <span style={styles.value}>{resident.education}</span>
                </div>
              </div>
            </div>

            <div style={styles.detailCard}>
              <h3 style={styles.cardTitle}>💼 Professional Information</h3>
              <div style={styles.cardContent}>
                <div style={styles.detailRow}>
                  <span style={styles.label}>Occupation:</span>
                  <span style={styles.value}>{resident.occupation}</span>
                </div>
              </div>
            </div>

            <div style={styles.detailCard}>
              <h3 style={styles.cardTitle}>🏠 Household Information</h3>
              <div style={styles.cardContent}>
                <div style={styles.detailRow}>
                  <span style={styles.label}>Address:</span>
                  <span style={styles.value}>{resident.address}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.label}>Household Number:</span>
                  <span style={styles.value}>{resident.householdNumber}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.label}>Role in Household:</span>
                  <span style={styles.value}>
                    {resident.isFamilyHead ? 'Family Head' : 'Family Member'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.actionButtons}>
            <button 
              onClick={() => navigate(`/residents/edit/${id}`)}
              style={styles.editButton}
            >
              ✏️ Edit Resident
            </button>
            <button 
              onClick={() => navigate('/residents')}
              style={styles.listButton}
            >
              📋 View All Residents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  mainContent: {
    marginLeft: '260px',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    backgroundColor: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    borderBottom: '1px solid #e0e6ed',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  backBtn: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  pageTitle: {
    margin: '0',
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
  },
  pageSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#718096',
  },
  profileContainer: {
    padding: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    marginBottom: '30px',
    border: '1px solid #e0e6ed',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
  },
  avatarText: {
    color: 'white',
    fontSize: '28px',
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  fullName: {
    margin: '0 0 12px 0',
    fontSize: '28px',
    fontWeight: '600',
    color: '#2d3748',
  },
  badges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
  },
  badgeSpecial: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    border: '1px solid #e0e6ed',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  cardTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    paddingBottom: '12px',
    borderBottom: '2px solid #e0e6ed',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f7fafc',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
    flex: '0 0 auto',
    marginRight: '16px',
  },
  value: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#2d3748',
    textAlign: 'right',
    flex: '1',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  editButton: {
    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(72, 187, 120, 0.3)',
  },
  listButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    gap: '20px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '16px',
    color: '#4a5568',
    fontWeight: '500',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    gap: '16px',
    padding: '40px',
    backgroundColor: 'white',
    margin: '40px',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  errorIcon: {
    fontSize: '48px',
  },
  errorTitle: {
    margin: '0',
    fontSize: '24px',
    fontWeight: '600',
    color: '#e53e3e',
  },
  errorMessage: {
    margin: '0',
    fontSize: '16px',
    color: '#4a5568',
    textAlign: 'center',
  },
  backButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  },
};

export default ViewResident;
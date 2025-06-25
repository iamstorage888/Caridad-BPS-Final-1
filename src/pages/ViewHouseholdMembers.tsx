
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Resident {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  sex: string;
  birthday: string;
  occupation: string;
  isFamilyHead: boolean;
  age?: number;
  householdNumber: string;
}

const ViewHouseholdMembers: React.FC = () => {
  const { householdNumber } = useParams<{ householdNumber: string }>();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  
  const handleEdit = (id: string) => {
    navigate(`/edit-household/${id}`);
  };

  const handleViewResident = (residentId: string) => {
    // Navigate to view resident with the resident ID
    navigate(`/view-resident/${residentId}`);
  };

  const handleEditResident = (residentId: string) => {
    // Navigate to edit resident with the resident ID
    navigate(`/edit-resident/${residentId}`);
  };

  // Calculate age from birthday
  const calculateAge = (birthday: string): number => {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    const fetchResidents = async () => {
      if (!householdNumber) {
        setError('Household number not provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First get the household document to get its ID
        const householdQuery = query(
          collection(db, 'households'),
          where('householdNumber', '==', householdNumber)
        );
        const householdSnapshot = await getDocs(householdQuery);

        if (!householdSnapshot.empty) {
          setHouseholdId(householdSnapshot.docs[0].id);
        } else {
          setError('Household not found');
          setLoading(false);
          return;
        }

        // Then get the residents as before
        const q = query(
          collection(db, 'residents'),
          where('householdNumber', '==', householdNumber)
        );
        const snapshot = await getDocs(q);

        const data = snapshot.docs.map(doc => {
          const residentData = { id: doc.id, ...doc.data() } as Resident;
          if (residentData.birthday) {
            residentData.age = calculateAge(residentData.birthday);
          }
          return residentData;
        });

        const sortedData = data.sort((a, b) => {
          if (a.isFamilyHead && !b.isFamilyHead) return -1;
          if (!a.isFamilyHead && b.isFamilyHead) return 1;
          return (b.age || 0) - (a.age || 0);
        });

        setResidents(sortedData);
      } catch (err) {
        console.error('Error fetching residents:', err);
        setError('Failed to load household members. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResidents();
  }, [householdNumber]);

  const familyHead = residents.find(r => r.isFamilyHead);

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading household members...</p>
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
            <div style={styles.errorIcon}>⚠️</div>
            <h2 style={styles.errorTitle}>Error Loading Data</h2>
            <p style={styles.errorMessage}>{error}</p>
            <button
              onClick={() => navigate('/households')}
              style={styles.errorButton}
            >
              ← Back to Households
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (residents.length === 0) {
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
                <span style={styles.backArrow}>←</span>
                <span>Back to Households</span>
              </button>
              <h1 style={styles.title}>Household #{householdNumber}</h1>
            </div>
            <LogoutButton />
          </div>

          <div style={styles.emptyContainer}>
            <div style={styles.emptyIcon}>👥</div>
            <h2 style={styles.emptyTitle}>No Members Found</h2>
            <p style={styles.emptyMessage}>
              This household doesn't have any registered members yet.
            </p>
            <button
              onClick={() => navigate(`/add-resident/${householdNumber}`)}
              style={styles.addButton}
            >
              ➕ Add First Member
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
        {/* Header Section */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              onClick={() => navigate('/households')}
              style={styles.backButton}
            >
              <span style={styles.backArrow}>←</span>
              <span>Back to Households</span>
            </button>

            <div style={styles.titleSection}>
              <div style={styles.householdIcon}>
                <span style={styles.iconEmoji}>🏠</span>
              </div>
              <div>
                <h1 style={styles.title}>Household #{householdNumber}</h1>
                <p style={styles.subtitle}>
                  {residents.length} member{residents.length !== 1 ? 's' : ''} registered
                </p>
              </div>
            </div>
          </div>
          <LogoutButton />
        </div>

        {/* Family Head Card */}
        {familyHead && (
          <div style={styles.familyHeadCard}>
            <div style={styles.cardHeader}>
              <span style={styles.headerIcon}>👑</span>
              <h2 style={styles.cardTitle}>Family Head</h2>
            </div>
            <div style={styles.familyHeadInfo}>
              <div style={styles.familyHeadName}>
                {`${familyHead.firstName} ${familyHead.middleName} ${familyHead.lastName}`}
              </div>
              <div style={styles.familyHeadDetails}>
                <span style={styles.badge}>
                  {familyHead.sex === 'Male' ? '♂️' : '♀️'} {familyHead.sex}
                </span>
                <span style={styles.badge}>
                  🎂 Age {familyHead.age || 'Unknown'}
                </span>
                <span style={styles.badge}>
                  💼 {familyHead.occupation}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <span style={styles.statIcon}>👥</span>
            <div>
              <div style={styles.statNumber}>{residents.length}</div>
              <div style={styles.statLabel}>Total Members</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statIcon}>👨</span>
            <div>
              <div style={styles.statNumber}>
                {residents.filter(r => r.sex === 'Male').length}
              </div>
              <div style={styles.statLabel}>Male</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statIcon}>👩</span>
            <div>
              <div style={styles.statNumber}>
                {residents.filter(r => r.sex === 'Female').length}
              </div>
              <div style={styles.statLabel}>Female</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statIcon}>💼</span>
            <div>
              <div style={styles.statNumber}>
                {residents.filter(r => r.occupation && r.occupation !== 'Student').length}
              </div>
              <div style={styles.statLabel}>Working</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statIcon}>🎓</span>
            <div>
              <div style={styles.statNumber}>
                {residents.filter(r => r.occupation === 'Student').length}
              </div>
              <div style={styles.statLabel}>Students</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionButtons}>
          <button
            onClick={() => householdId && handleEdit(householdId)}
            style={styles.editButton}
          >
            <span style={styles.buttonIcon}>✏️</span>
            Edit Household
          </button>
        </div>

        {/* Members Section */}
        <div style={styles.membersSection}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>👥</span>
            <h2 style={styles.sectionTitle}>Household Members</h2>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>
                    <div style={styles.thContent}>
                      <span style={styles.thIcon}>👤</span>
                      <span>Full Name</span>
                    </div>
                  </th>
                  <th style={styles.th}>Gender</th>
                  <th style={styles.th}>
                    <div style={styles.thContent}>
                      <span style={styles.thIcon}>📅</span>
                      <span>Birthday</span>
                    </div>
                  </th>
                  <th style={styles.th}>Age</th>
                  <th style={styles.th}>
                    <div style={styles.thContent}>
                      <span style={styles.thIcon}>💼</span>
                      <span>Occupation</span>
                    </div>
                  </th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((resident, index) => (
                  <tr
                    key={resident.id}
                    style={{
                      ...styles.tableRow,
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>
                          {resident.firstName.charAt(0)}{resident.lastName.charAt(0)}
                        </div>
                        <span style={styles.fullName}>
                          {`${resident.firstName} ${resident.middleName} ${resident.lastName}`}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.genderBadge,
                        backgroundColor: resident.sex === 'Male' ? '#e3f2fd' : '#fce4ec',
                        color: resident.sex === 'Male' ? '#1976d2' : '#c2185b'
                      }}>
                        {resident.sex === 'Male' ? '♂️' : '♀️'} {resident.sex}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {resident.birthday ? new Date(resident.birthday).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.ageBadge}>{resident.age || 'N/A'}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.occupationBadge}>
                        {resident.occupation === 'Student' ? '🎓' : '💼'} {resident.occupation || 'N/A'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {resident.isFamilyHead ? (
                        <span style={styles.familyHeadBadge}>👑 Family Head</span>
                      ) : (
                        <span style={styles.memberBadge}>👤 Member</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionCell}>
                        <button
                          onClick={() => handleEditResident(resident.id)}
                          style={styles.editActionButton}
                          title="Edit member"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleViewResident(resident.id)}
                          style={styles.viewActionButton}
                          title="View details"
                        >
                          👁️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    backgroundColor: '#f8f9fa',
  },
  mainContent: {
    marginLeft: '260px',
    padding: '30px',
    width: 'calc(100% - 260px)',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '70vh',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '20px',
    color: '#666',
    fontSize: '18px',
    fontWeight: '500',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '60px 30px',
    backgroundColor: 'white',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginTop: '50px',
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: '10px',
  },
  errorMessage: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px',
  },
  errorButton: {
    padding: '12px 24px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  emptyContainer: {
    textAlign: 'center',
    padding: '60px 30px',
    backgroundColor: 'white',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginTop: '30px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '10px',
  },
  emptyMessage: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px',
  },
  addButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
  },
  headerLeft: {
    flex: 1,
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: 'white',
    border: '2px solid #667eea',
    borderRadius: '10px',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  backArrow: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  householdIcon: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  iconEmoji: {
    fontSize: '32px',
  },
  title: {
    margin: '0',
    fontSize: '32px',
    fontWeight: '700',
    color: '#2c3e50',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    margin: '5px 0 0 0',
    color: '#666',
    fontSize: '16px',
    fontWeight: '500',
  },
  familyHeadCard: {
    backgroundColor: 'white',
    borderRadius: '15px',
    padding: '25px',
    marginBottom: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '2px solid #667eea',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  cardTitle: {
    margin: '0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c3e50',
  },
  familyHeadInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  familyHeadName: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2c3e50',
  },
  familyHeadDetails: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  badge: {
    padding: '8px 16px',
    backgroundColor: '#f8f9fa',
    border: '2px solid #667eea',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#667eea',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer',
  },
  statIcon: {
    fontSize: '24px',
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500',
  },
  actionButtons: {
    display: 'flex',
    gap: '15px',
    marginBottom: '30px',
    flexWrap: 'wrap',
  },
  addMemberButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 10px rgba(40, 167, 69, 0.3)',
  },
  editButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 10px rgba(0, 123, 255, 0.3)',
  },
  buttonIcon: {
    fontSize: '16px',
  },
  membersSection: {
    backgroundColor: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '25px',
  },
  sectionIcon: {
    fontSize: '24px',
  },
  sectionTitle: {
    margin: '0',
    fontSize: '24px',
    fontWeight: '600',
    color: '#2c3e50',
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '10px',
    border: '1px solid #e9ecef',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  tableHeader: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
    borderBottom: 'none',
  },
  thContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  thIcon: {
    fontSize: '16px',
  },
  tableRow: {
    transition: 'all 0.3s ease',
    animation: 'fadeInUp 0.6s ease-out forwards',
    opacity: 0,
    transform: 'translateY(20px)',
  },
  td: {
    padding: '16px',
    borderBottom: '1px solid #e9ecef',
    fontSize: '14px',
    color: '#495057',
  },
  nameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#667eea',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
  },
  fullName: {
    fontWeight: '500',
    color: '#2c3e50',
  },
  genderBadge: {
    padding: '6px 12px',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: '500',
  },
  ageBadge: {
    padding: '6px 12px',
    backgroundColor: '#e8f5e8',
    color: '#2e7d32',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: '500',
  },
  occupationBadge: {
    padding: '6px 12px',
    backgroundColor: '#fff3e0',
    color: '#e65100',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: '500',
  },
  familyHeadBadge: {
    padding: '6px 12px',
    backgroundColor: '#fff3e0',
    color: '#f57c00',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid #ffcc02',
  },
  memberBadge: {
    padding: '6px 12px',
    backgroundColor: '#f3e5f5',
    color: '#7b1fa2',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: '500',
  },
  actionCell: {
    display: 'flex',
    gap: '8px',
  },
  editActionButton: {
    padding: '6px 10px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  viewActionButton: {
    padding: '6px 10px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};

// Add CSS animations and hover effects
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  table tbody tr:hover {
    background-color: #f8f9fa !important;
    transform: translateX(5px) !important;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
  }
  
  button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(0,0,0,0.2) !important;
  }
  
  .stat-card:hover {
    transform: translateY(-5px) !important;
    box-shadow: 0 8px 30px rgba(0,0,0,0.15) !important;
  }
  
  .back-button:hover {
    background-color: #667eea !important;
    color: white !important;
  }
  
  .add-member-button:hover {
    background-color: #218838 !important;
  }
  
  .edit-button:hover {
    background-color: #0056b3 !important;
  }
  
  .edit-action-button:hover {
    background-color: #0056b3 !important;
  }
  
  .view-action-button:hover {
    background-color: #545b62 !important;
  }
`;
document.head.appendChild(styleSheet);

export default ViewHouseholdMembers;
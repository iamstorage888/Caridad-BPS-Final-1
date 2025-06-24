import React, { useEffect, useState } from 'react';

const ViewHouseholdMembers: React.FC = () => {
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const householdNumber = "12345"; // Replace with useParams in your actual implementation

  // Mock navigation function - replace with useNavigate in your actual implementation
  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}`);
  };

  useEffect(() => {
    const fetchResidents = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data - replace with your Firebase logic
        const mockData = [
          {
            id: '1',
            firstName: 'Juan',
            middleName: 'Santos',
            lastName: 'Dela Cruz',
            sex: 'Male',
            birthday: '1975-03-15',
            occupation: 'Teacher',
            isFamilyHead: true,
            age: 49
          },
          {
            id: '2',
            firstName: 'Maria',
            middleName: 'Garcia',
            lastName: 'Dela Cruz',
            sex: 'Female',
            birthday: '1978-07-22',
            occupation: 'Nurse',
            isFamilyHead: false,
            age: 46
          },
          {
            id: '3',
            firstName: 'Jose',
            middleName: 'Santos',
            lastName: 'Dela Cruz',
            sex: 'Male',
            birthday: '2005-11-10',
            occupation: 'Student',
            isFamilyHead: false,
            age: 19
          },
          {
            id: '4',
            firstName: 'Ana',
            middleName: 'Santos',
            lastName: 'Dela Cruz',
            sex: 'Female',
            birthday: '2010-09-08',
            occupation: 'Student',
            isFamilyHead: false,
            age: 14
          }
        ];
        
        setResidents(mockData);
      } catch (error) {
        console.error('Error fetching residents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResidents();
  }, []);

  const familyHead = residents.find(r => r.isFamilyHead);

  if (loading) {
    return (
      <div style={{ marginLeft: '260px', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading household members...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: '260px', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <div style={styles.container}>
        {/* Header Section */}
        <div style={styles.header}>
          <button onClick={() => handleNavigation('/households')} style={styles.backButton}>
            <span style={styles.backArrow}>←</span>
            <span>Back to Households</span>
          </button>
          
          <div style={styles.titleSection}>
            <div style={styles.householdIcon}>
              <span style={styles.iconEmoji}>🏠</span>
            </div>
            <div>
              <h1 style={styles.title}>Household #{householdNumber}</h1>
              <p style={styles.subtitle}>{residents.length} member{residents.length !== 1 ? 's' : ''} registered</p>
            </div>
          </div>
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
                <span style={styles.badge}>{familyHead.sex}</span>
                <span style={styles.badge}>Age {familyHead.age}</span>
                <span style={styles.badge}>{familyHead.occupation}</span>
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
              <div style={styles.statNumber}>{residents.filter(r => r.sex === 'Male').length}</div>
              <div style={styles.statLabel}>Male</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statIcon}>👩</span>
            <div>
              <div style={styles.statNumber}>{residents.filter(r => r.sex === 'Female').length}</div>
              <div style={styles.statLabel}>Female</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statIcon}>💼</span>
            <div>
              <div style={styles.statNumber}>{residents.filter(r => r.occupation !== 'Student').length}</div>
              <div style={styles.statLabel}>Working</div>
            </div>
          </div>
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
                </tr>
              </thead>
              <tbody>
                {residents.map((resident, index) => (
                  <tr key={resident.id} style={{
                    ...styles.tableRow,
                    animationDelay: `${index * 0.1}s`
                  }}>
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
                    <td style={styles.td}>{resident.birthday}</td>
                    <td style={styles.td}>
                      <span style={styles.ageBadge}>{resident.age}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.occupationBadge}>
                        {resident.occupation === 'Student' ? '🎓' : '💼'} {resident.occupation}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {resident.isFamilyHead ? (
                        <span style={styles.familyHeadBadge}>👑 Family Head</span>
                      ) : (
                        <span style={styles.memberBadge}>👤 Member</span>
                      )}
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
    padding: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '20px',
    color: '#666',
    fontSize: '16px',
  },
  header: {
    marginBottom: '30px',
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
    fontSize: '18px',
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
  },
  familyHeadCard: {
    backgroundColor: 'white',
    borderRadius: '15px',
    padding: '25px',
    marginBottom: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '2px solid #667eea',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
    transition: 'transform 0.3s ease',
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
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#495057',
    fontSize: '14px',
    borderBottom: '2px solid #dee2e6',
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
  },
  fullName: {
    fontWeight: '500',
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
};

// Add CSS animations
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
    box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
  }
  
  button:hover {
    background-color: #667eea !important;
    color: white !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3) !important;
  }
  
  .stat-card:hover {
    transform: translateY(-5px) !important;
    box-shadow: 0 8px 30px rgba(0,0,0,0.15) !important;
  }
`;
document.head.appendChild(styleSheet);

export default ViewHouseholdMembers;
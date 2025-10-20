import React, { act, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { collection, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';

interface DocumentRequest {
  id: string;
  fullName: string;
  documentType: string;
  purpose: string;
  status: string;
  createdAt: Date;
  dryDockingDetails?: {
    isNonResident: boolean;
    boatNumber: string;
    address?: string;
  };
}

const Documents: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'nonResident'>('all');

  const fetchRequests = async () => {
    try {
      setError(null);
      const snapshot = await getDocs(collection(db, 'documentRequests'));
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          fullName: data.fullName || 'Unknown',
          documentType: data.documentType || 'Unknown Document',
          purpose: data.purpose || 'No purpose specified',
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate?.() || new Date(),
          dryDockingDetails: data.dryDockingDetails || null,
        };
      });
      setRequests(docs);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to load document requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleView = async (id: string) => {
    try {
      const docRef = doc(db, 'documentRequests', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        navigate(`/documents/view/${id}`);
      } else {
        alert('Document not found. It may have been deleted.');
        fetchRequests();
      }
    } catch (error) {
      console.error('Error checking document:', error);
      alert('Error accessing document. Please try again.');
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const docRef = doc(db, 'documentRequests', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        navigate(`/documents/edit/${id}`);
      } else {
        alert('Document not found. It may have been deleted.');
        fetchRequests();
      }
    } catch (error) {
      console.error('Error checking document:', error);
      alert('Error accessing document. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      try {
        const docRef = doc(db, 'documentRequests', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          await deleteDoc(docRef);
          setRequests(prev => prev.filter(req => req.id !== id));
          alert('Document request deleted successfully.');
        } else {
          alert('Document not found. It may have already been deleted.');
          fetchRequests();
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Error deleting document. Please try again.');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#ffc107';
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      case 'in progress': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'in progress': return '🔄';
      default: return '📄';
    }
  };

  const getDocumentIcon = (type: string) => {
    const iconMap: { [key: string]: string } = {
      'birth certificate': '👶',
      'marriage certificate': '💒',
      'death certificate': '⚰️',
      'business permit': '🏢',
      'id': '🆔',
      'clearance': '📋',
      'certificate': '📜',
      'certificate dry docking': '⚓',
      default: '📄'
    };
    return iconMap[type.toLowerCase()] || iconMap.default;
  };

  // Filter requests based on active tab
  const getFilteredRequests = () => {
    let filtered = requests;
    
    if (activeTab === 'nonResident') {
      // Show only non-resident dry dock certificates
      filtered = requests.filter(req => 
        req.documentType === 'Certificate Dry Docking' && 
        req.dryDockingDetails?.isNonResident === true
      );
    } else {
      // Show all requests
      filtered = requests;
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status.toLowerCase() === filterStatus);
    }

    return filtered;
  };

  const filteredRequests = getFilteredRequests();

  // Get counts for tabs
  const allRequestsCount = requests.length;
  const nonResidentDryDockCount = requests.filter(req => 
    req.documentType === 'Certificate Dry Docking' && 
    req.dryDockingDetails?.isNonResident === true
  ).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', width: '100%' }}>
        <Sidebar />
        <div style={styles.container}>
          <LogoutButton />
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading document requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <LogoutButton />
        </div>

        <div style={styles.content}>
          <div style={styles.titleSection}>
            <div>
              <h1 style={styles.title}>Document Requests</h1>
              <p style={styles.subtitle}>Manage and track all document requests</p>
            </div>
            <div style={styles.stats}>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>{allRequestsCount}</span>
                <span style={styles.statLabel}>Total Requests</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>{nonResidentDryDockCount}</span>
                <span style={styles.statLabel}>Non-Resident Dry Dock</span>
              </div>
            </div>
          </div>

          {error && (
            <div style={styles.errorMessage}>
              <span style={styles.errorIcon}>⚠️</span>
              <span>{error}</span>
              <button 
                onClick={fetchRequests} 
                style={styles.retryButton}
              >
                Retry
              </button>
            </div>
          )}

{/* Tab Navigation */}
<div style={styles.tabContainer}>
  <button
    onClick={() => setActiveTab('all')}
    style={{
      ...styles.tab,
      ...(activeTab === 'all' ? styles.inactiveTab : styles.activeTab)
    }}
  >
    <span style={styles.tabIcon}>📋</span>
    All Requests ({allRequestsCount})
  </button>
  <button
    onClick={() => setActiveTab('nonResident')}
    style={{
      ...styles.tab,
      ...(activeTab === 'nonResident' ? styles.activeTab : styles.inactiveTab)
    }}
  >
    <span style={styles.tabIcon}>⚓</span>
    Non-Resident Dry Dock ({nonResidentDryDockCount})
  </button>
</div>

          <div style={styles.controls}>
            <button
              onClick={() => navigate('/documents/request')}
              style={styles.primaryButton}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            >
              <span style={styles.buttonIcon}>+</span>
              Request Document
            </button>

            <div style={styles.filterContainer}>
              <label style={styles.filterLabel}>Filter by status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="in progress">In Progress</option>
              </select>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <h3 style={styles.emptyTitle}>
                {activeTab === 'nonResident' 
                  ? 'No non-resident dry dock requests found'
                  : filterStatus === 'all' 
                    ? 'No document requests found' 
                    : `No ${filterStatus} requests found`}
              </h3>
              <p style={styles.emptyText}>
                {activeTab === 'nonResident'
                  ? 'No non-resident dry dock certificate requests have been submitted yet.'
                  : filterStatus === 'all' 
                    ? 'Get started by creating your first document request.' 
                    : 'Try selecting a different status filter.'}
              </p>
              {filterStatus === 'all' && activeTab === 'all' && (
                <button
                  onClick={() => navigate('/documents/request')}
                  style={styles.emptyButton}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
                >
                  Create Request
                </button>
              )}
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.headerRow}>
                      <th style={styles.headerCell}>
                        {activeTab === 'nonResident' ? 'Applicant' : 'Requester'}
                      </th>
                      <th style={styles.headerCell}>Document</th>
                      {activeTab === 'nonResident' && (
                        <>
                          <th style={styles.headerCell}>Boat Number</th>
                          <th style={styles.headerCell}>Address</th>
                        </>
                      )}
                      <th style={styles.headerCell}>Purpose</th>
                      <th style={styles.headerCell}>Status</th>
                      <th style={styles.headerCell}>Date</th>
                      <th style={styles.headerCell}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req, index) => (
                      <tr 
                        key={req.id}
                        style={{
                          ...styles.row,
                          backgroundColor: index % 2 === 0 ? '#fafafa' : '#ffffff'
                        }}
                      >
                        <td style={styles.cell}>
                          <div style={styles.requesterInfo}>
                            <div style={styles.avatar}>
                              {req.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <span style={styles.fullName}>{req.fullName}</span>
                          </div>
                        </td>
                        <td style={styles.cell}>
                          <div style={styles.documentInfo}>
                            <span style={styles.docIcon}>{getDocumentIcon(req.documentType)}</span>
                            <span style={styles.docType}>{req.documentType}</span>
                          </div>
                        </td>
                        {activeTab === 'nonResident' && (
                          <>
                            <td style={styles.cell}>
                              <span style={styles.boatNumber}>
                                🚢 {req.dryDockingDetails?.boatNumber || 'N/A'}
                              </span>
                            </td>
                            <td style={styles.cell}>
                              <span style={styles.address}>
                                📍 {req.dryDockingDetails?.address || 'N/A'}
                              </span>
                            </td>
                          </>
                        )}  
                        <td style={styles.cell}>
                          <span style={styles.purpose}>{req.purpose}</span>
                        </td>
                        <td style={styles.cell}>
                          <div style={styles.statusContainer}>
                            <span style={styles.statusIcon}>{getStatusIcon(req.status)}</span>
                            <span 
                              style={{
                                ...styles.statusBadge,
                                backgroundColor: getStatusColor(req.status)
                              }}
                            >
                              {req.status}
                            </span>
                          </div>
                        </td>
                        <td style={styles.cell}>
                          <span style={styles.date}>{req.createdAt.toLocaleDateString()}</span>
                        </td>
                        <td style={styles.cell}>
                          <div style={styles.actionButtons}>
                            <button 
                              style={styles.viewButton} 
                              onClick={() => handleView(req.id)}
                              title="View Details"
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#138496'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#17a2b8'}
                            >
                              👁️
                            </button>
                            <button 
                              style={styles.editButton} 
                              onClick={() => handleEdit(req.id)}
                              title="Edit Request"
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e0a800'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffc107'}
                            >
                              ✏️
                            </button>
                            <button 
                              style={styles.deleteButton} 
                              onClick={() => handleDelete(req.id)}
                              title="Delete Request"
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    flex: 1,
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    overflowX: 'auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '24px'
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e9ecef',
    width: '100%',
    boxSizing: 'border-box'
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '32px',
    paddingBottom: '20px',
    borderBottom: '2px solid #f1f3f4',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '600',
    color: '#2c3e50',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '16px',
    color: '#6c757d',
    fontWeight: '400'
  },
  stats: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },

  statCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#e3f2fd',
    borderRadius: '8px',
    minWidth: '100px'
  },

  statNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1976d2'
  },

  statLabel: {
    fontSize: '12px',
    color: '#1976d2',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginTop: '4px'
  },

  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },

  errorIcon: {
    fontSize: '18px'
  },

  retryButton: {
    padding: '4px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },

  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px',
    flexWrap: 'wrap'
  },

  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 123, 255, 0.3)'
  },

  buttonIcon: {
    fontSize: '18px',
    fontWeight: 'bold'
  },

  filterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  filterLabel: {
    fontSize: '14px',
    color: '#495057',
    fontWeight: '500'
  },

  select: {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer'
  },

  tableWrapper: {
    width: '100%',
    overflowX: 'auto'
  },

  tableContainer: {
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e9ecef',
    minWidth: '1000px'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },

  headerRow: {
    backgroundColor: '#f8f9fa'
  },

  headerCell: {
    padding: '16px 12px',
    textAlign: 'left' as const,
    fontWeight: '600',
    color: '#495057',
    fontSize: '14px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    borderBottom: '2px solid #dee2e6',
    whiteSpace: 'nowrap',
    marginLeft:90,
  },

  row: {
    transition: 'background-color 0.2s ease'
  },

  cell: {
    padding: '16px 12px',
    borderBottom: '1px solid #f1f3f4',
    verticalAlign: 'middle'
  },

  requesterInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#6c757d',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    flexShrink: 0
  },

  fullName: {
    fontSize: '15px',
    color: '#495057',
    fontWeight: '500'
  },

  documentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  docIcon: {
    fontSize: '20px'
  },

  docType: {
    fontSize: '14px',
    color: '#495057',
    fontWeight: '500'
  },

  purpose: {
    fontSize: '14px',
    color: '#6c757d',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  },

  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  statusIcon: {
    fontSize: '16px'
  },

  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize' as const
  },

  date: {
    fontSize: '14px',
    color: '#6c757d'
  },

  actionButtons: {
    display: 'flex',
    gap: '4px'
  },

  viewButton: {
    padding: '8px',
    backgroundColor: '#17a2b8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  },

  editButton: {
    padding: '8px',
    backgroundColor: '#ffc107',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  },

  deleteButton: {
    padding: '8px',
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '60px 20px',
    textAlign: 'center' as const
  },

  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5
  },

  emptyTitle: {
    fontSize: '20px',
    color: '#495057',
    margin: '0 0 8px 0',
    fontWeight: '600'
  },

  emptyText: {
    fontSize: '16px',
    color: '#6c757d',
    margin: '0 0 24px 0',
    maxWidth: '400px'
  },

  emptyButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500'
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    gap: '16px'
  },

  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  
  loadingText: {
    color: '#6c757d',
    fontSize: '16px',
    margin: 0
  },

  activeTab: {
  border:'3px solid #15ff00ff',
  marginLeft:'250px',
  },


  inactiveTab: {
  border:'3px solid #007bff',
  marginLeft:'250px',
  },
    tabContainer: {
      display: 'flex',
      gap: '8px',
      marginBottom: '20px',
      borderBottom: '2px solid #e0e0e0',
    },
    tab: {
      padding: '12px 16px',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },

    tabIcon: {
      fontSize: '16px',
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
document.head.appendChild(styleSheet);

export default Documents;
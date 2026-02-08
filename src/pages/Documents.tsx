import React, { useEffect, useState } from 'react';
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

type SortField = 'date' | 'name' | 'documentType' | 'status';
type SortOrder = 'asc' | 'desc';

const Documents: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'nonResident'>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);

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

  // --- Status helpers ---
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':     return { bg: '#fef3c7', text: '#92400e' };
      case 'approved':    return { bg: '#dcfce7', text: '#166534' };
      case 'rejected':    return { bg: '#fee2e2', text: '#991b1b' };
      case 'in progress': return { bg: '#dbeafe', text: '#1e40af' };
      default:            return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':     return '⏳';
      case 'approved':    return '✅';
      case 'rejected':    return '❌';
      case 'in progress': return '🔄';
      default:            return '📄';
    }
  };

  const getDocumentIcon = (type: string) => {
    const map: { [key: string]: string } = {
      'brgy clearance': '📋',
      'brgy residency': '🏠',
      'brgy permit': '📄',
      'certificate of indigency': '💼',
      'certificate dry docking': '⚓',
      'certificate of attestation': '✅',
      'birth certificate': '👶',
      'marriage certificate': '💒',
      'death certificate': '⚰️',
      'business permit': '🏢',
      'id': '🆔',
      'clearance': '📋',
      'certificate': '📜',
    };
    return map[type.toLowerCase()] || '📄';
  };

  // --- Sorting function ---
  const sortRequests = (requests: DocumentRequest[]) => {
    return [...requests].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'name':
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case 'documentType':
          comparison = a.documentType.localeCompare(b.documentType);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // --- Filtering and searching ---
  const getFilteredRequests = () => {
    let filtered = requests;
    
    // Tab filter
    if (activeTab === 'nonResident') {
      filtered = filtered.filter(req =>
        req.documentType === 'Certificate Dry Docking' &&
        req.dryDockingDetails?.isNonResident === true
      );
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status.toLowerCase() === filterStatus);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req =>
        req.fullName.toLowerCase().includes(query) ||
        req.documentType.toLowerCase().includes(query) ||
        req.purpose.toLowerCase().includes(query) ||
        req.status.toLowerCase().includes(query) ||
        (req.dryDockingDetails?.boatNumber?.toLowerCase().includes(query)) ||
        (req.dryDockingDetails?.address?.toLowerCase().includes(query))
      );
    }
    
    return sortRequests(filtered);
  };

  const filteredRequests = getFilteredRequests();
  const nonResidentCount = requests.filter(req =>
    req.documentType === 'Certificate Dry Docking' &&
    req.dryDockingDetails?.isNonResident === true
  ).length;

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '⇅';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  // --- Render ---
  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Documents</h1>
            <p style={styles.subtitle}>Manage and track all document requests</p>
          </div>
          <LogoutButton />
        </div>

        {/* Stat cards */}
        <div style={styles.statsContainer}>
          {[
            { label: 'Total Requests',        value: requests.length,   icon: '📋', color: '#667eea' },
            { label: 'Non-Resident Dry Dock', value: nonResidentCount,  icon: '⚓',  color: '#764ba2' },
            { label: 'Pending',               value: requests.filter(r => r.status.toLowerCase() === 'pending').length,     icon: '⏳', color: '#f5576c' },
            { label: 'Approved',              value: requests.filter(r => r.status.toLowerCase() === 'approved').length,    icon: '✅', color: '#43e97b' },
          ].map((card, i) => (
            <div key={i} style={{ ...styles.statCard, borderLeft: `4px solid ${card.color}` }}>
              <div style={styles.statCardContent}>
                <div>
                  <h3 style={styles.statValue}>{card.value.toLocaleString()}</h3>
                  <p style={styles.statLabel}>{card.label}</p>
                </div>
                <div style={{ ...styles.statIcon, color: card.color }}>{card.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div style={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button style={styles.retryBtn} onClick={fetchRequests}>Retry</button>
          </div>
        )}

        {/* Tab bar */}
        <div style={styles.tabBar}>
          {(['all', 'nonResident'] as const).map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.tab,
                  borderBottom: isActive ? '3px solid #667eea' : '3px solid transparent',
                  color: isActive ? '#667eea' : '#64748b',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <span>{tab === 'all' ? '📋' : '⚓'}</span>
                {tab === 'all' ? `All Requests (${requests.length})` : `Non-Resident Dry Dock (${nonResidentCount})`}
              </button>
            );
          })}
        </div>

        {/* Toolbar: search, filter, sort, delete toggle, and action button */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            {/* Search bar */}
            <div style={styles.searchContainer}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search by name, document type, purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status filter */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="in progress">In Progress</option>
              </select>
            </div>

            {/* Sort options */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Sort by:</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                style={styles.filterSelect}
              >
                <option value="date">Date</option>
                <option value="name">Requester Name</option>
                <option value="documentType">Document Type</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Sort order toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              style={styles.sortOrderBtn}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>

            {/* Delete toggle */}
            <div style={styles.deleteToggleContainer}>
              <label style={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={showDeleteButtons}
                  onChange={(e) => setShowDeleteButtons(e.target.checked)}
                  style={styles.toggleCheckbox}
                />
                <span style={styles.toggleSlider}></span>
                <span style={styles.toggleText}>Show Delete</span>
              </label>
            </div>
          </div>

          <button style={styles.addButton} onClick={() => navigate('/documents/request')}>
            <span>➕</span> Request Document
          </button>
        </div>

        {/* Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading document requests...</p>
            </div>
          ) : (
            <>
              {/* Results count bar */}
              <div style={styles.tableHeaderBar}>
                <span style={styles.resultsCount}>
                  {filteredRequests.length} of {requests.length} requests
                  {activeTab === 'nonResident' && ' • Filtered: Non-Resident Dry Dock'}
                  {filterStatus !== 'all' && ` • Status: ${filterStatus}`}
                  {searchQuery && ` • Search: "${searchQuery}"`}
                </span>
              </div>

              {filteredRequests.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>
                    {searchQuery ? '🔍' : activeTab === 'nonResident' ? '⚓' : '📋'}
                  </span>
                  <p style={styles.emptyTitle}>
                    {searchQuery
                      ? 'No results found'
                      : activeTab === 'nonResident'
                        ? 'No non-resident dry dock requests found'
                        : filterStatus !== 'all'
                          ? `No ${filterStatus} requests found`
                          : 'No document requests yet'}
                  </p>
                  <p style={styles.emptySubtitle}>
                    {searchQuery
                      ? 'Try adjusting your search terms or filters.'
                      : activeTab === 'nonResident'
                        ? 'Non-resident dry dock certificate requests will appear here.'
                        : filterStatus !== 'all'
                          ? 'Try selecting a different status filter.'
                          : 'Create your first document request to get started.'}
                  </p>
                  {filterStatus === 'all' && activeTab === 'all' && !searchQuery && (
                    <button style={styles.addButton} onClick={() => navigate('/documents/request')}>
                      <span>➕</span> Request Document
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th
                          style={{ ...styles.tableHeaderCell, ...styles.sortableHeader }}
                          onClick={() => handleSortChange('name')}
                        >
                          Requester {getSortIcon('name')}
                        </th>
                        <th
                          style={{ ...styles.tableHeaderCell, ...styles.sortableHeader }}
                          onClick={() => handleSortChange('documentType')}
                        >
                          Document {getSortIcon('documentType')}
                        </th>
                        {activeTab === 'nonResident' && <th style={styles.tableHeaderCell}>Boat No.</th>}
                        {activeTab === 'nonResident' && <th style={styles.tableHeaderCell}>Address</th>}
                        <th style={styles.tableHeaderCell}>Purpose</th>
                        <th
                          style={{ ...styles.tableHeaderCell, ...styles.sortableHeader }}
                          onClick={() => handleSortChange('status')}
                        >
                          Status {getSortIcon('status')}
                        </th>
                        <th
                          style={{ ...styles.tableHeaderCell, ...styles.sortableHeader }}
                          onClick={() => handleSortChange('date')}
                        >
                          Date {getSortIcon('date')}
                        </th>
                        <th style={styles.tableHeaderCell}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((req, index) => {
                        const statusStyle = getStatusColor(req.status);
                        return (
                          <tr
                            key={req.id}
                            style={{
                              ...styles.tableRow,
                              backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                            }}
                          >
                            {/* Name */}
                            <td style={styles.tableCell}>
                              <div style={styles.nameCell}>
                                <span style={styles.avatar}>
                                  {req.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </span>
                                <span style={styles.fullName}>{req.fullName}</span>
                              </div>
                            </td>

                            {/* Doc type */}
                            <td style={styles.tableCell}>
                              <div style={styles.docCell}>
                                <span style={styles.docIcon}>{getDocumentIcon(req.documentType)}</span>
                                <span style={styles.docType}>{req.documentType}</span>
                              </div>
                            </td>

                            {/* Dry dock extras */}
                            {activeTab === 'nonResident' && (
                              <td style={styles.tableCell}>
                                <span style={styles.metaText}>🚢 {req.dryDockingDetails?.boatNumber || 'N/A'}</span>
                              </td>
                            )}
                            {activeTab === 'nonResident' && (
                              <td style={styles.tableCell}>
                                <span style={styles.metaText}>📍 {req.dryDockingDetails?.address || 'N/A'}</span>
                              </td>
                            )}

                            {/* Purpose */}
                            <td style={styles.tableCell}>
                              <span style={styles.purposeText}>{req.purpose}</span>
                            </td>

                            {/* Status */}
                            <td style={styles.tableCell}>
                              <span style={{
                                ...styles.statusBadge,
                                backgroundColor: statusStyle.bg,
                                color: statusStyle.text,
                              }}>
                                {getStatusIcon(req.status)} {req.status}
                              </span>
                            </td>

                            {/* Date */}
                            <td style={styles.tableCell}>
                              <span style={styles.dateText}>
                                {req.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={styles.tableCell}>
                              <div style={styles.actionButtons}>
                                <button onClick={() => handleView(req.id)} style={styles.viewButton}>👁️ View</button>
                                <button onClick={() => handleEdit(req.id)} style={styles.editButton}>✏️ Edit</button>
                                {showDeleteButtons && (
                                  <button onClick={() => handleDelete(req.id)} style={styles.deleteButton}>🗑️ Delete</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles: { [key: string]: React.CSSProperties } = {
  // Layout
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

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
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

  // Stat cards
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statCardContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
    margin: '0 0 4px 0',
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0',
    fontWeight: '500',
  },
  statIcon: {
    fontSize: '32px',
    opacity: 0.8,
  },

  // Error
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 18px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  retryBtn: {
    padding: '6px 14px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },

  // Tabs
  tabBar: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    borderBottom: '1px solid #e2e8f0',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: 'none',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#64748b',
    transition: 'color 0.2s, border-color 0.2s',
    borderRadius: '8px 8px 0 0',
  },

  // Toolbar
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '20px',
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    flexWrap: 'wrap',
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: '1 1 300px',
    minWidth: '200px',
    maxWidth: '400px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    fontSize: '16px',
    color: '#64748b',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '10px 36px 10px 36px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#374151',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'color 0.2s, background-color 0.2s',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  filterSelect: {
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#374151',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '140px',
  },
  sortOrderBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#374151',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  deleteToggleContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    position: 'relative',
  },
  toggleCheckbox: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  toggleSlider: {
    width: '40px',
    height: '20px',
    backgroundColor: '#cbd5e0',
    borderRadius: '20px',
    position: 'relative',
    transition: 'background-color 0.3s ease',
    display: 'inline-block',
  },
  toggleText: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#64748b',
    whiteSpace: 'nowrap',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 2px 4px rgba(16,185,129,0.2)',
    whiteSpace: 'nowrap',
  },

  // Table container
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tableHeaderBar: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  resultsCount: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeaderRow: {
    backgroundColor: '#f1f5f9',
  },
  tableHeaderCell: {
    padding: '14px 20px',
    textAlign: 'left' as const,
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e2e8f0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
  },
  sortableHeader: {
    cursor: 'pointer',
    userSelect: 'none' as const,
    transition: 'background-color 0.2s',
  },
  tableRow: {
    transition: 'background-color 0.1s ease',
  },
  tableCell: {
    padding: '16px 20px',
    fontSize: '14px',
    color: '#374151',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
  },

  // Cell internals
  nameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '600',
    flexShrink: 0,
  },
  fullName: {
    fontWeight: '500',
    color: '#1a202c',
    fontSize: '14px',
  },
  docCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  docIcon: {
    fontSize: '18px',
  },
  docType: {
    fontWeight: '500',
    color: '#1a202c',
    fontSize: '14px',
  },
  metaText: {
    fontSize: '13px',
    color: '#64748b',
  },
  purposeText: {
    fontSize: '13px',
    color: '#64748b',
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    display: 'block',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  dateText: {
    fontSize: '13px',
    color: '#64748b',
  },

  // Action buttons
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  viewButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },

  // Loading
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
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

  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '60px 20px',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  emptyTitle: {
    color: '#1a202c',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: '14px',
    margin: '0',
    maxWidth: '360px',
    textAlign: 'center' as const,
  },
};

// Spinner keyframes and toggle styles
const styleTag = document.createElement('style');
styleTag.textContent = `
  @keyframes spin { 
    to { transform: rotate(360deg); } 
  }
  
  .searchInput:focus {
    border-color: #667eea;
  }
  
  .clearSearchBtn:hover {
    color: #475569;
    background-color: #f1f5f9;
  }
  
  .sortOrderBtn:hover {
    background-color: #f8fafc;
    border-color: #cbd5e1;
  }
  
  .sortableHeader:hover {
    background-color: #e2e8f0;
  }
  
  .addButton:hover {
    background-color: #059669;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(16,185,129,0.3);
  }
  
  .viewButton:hover {
    background-color: #2563eb;
  }
  
  .editButton:hover {
    background-color: #d97706;
  }
  
  .deleteButton:hover {
    background-color: #dc2626;
  }

  /* Toggle switch styles */
  input[type="checkbox"]:checked + span {
    background-color: #ef4444 !important;
  }

  input[type="checkbox"]:checked + span:after {
    transform: translateX(20px);
  }

  input[type="checkbox"] + span:after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.3s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;
document.head.appendChild(styleTag);

export default Documents;
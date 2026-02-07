import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../Database/firebase';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { migrateResidentsToNumericalIds } from '../Database/migration';

interface Resident {
  createdAt: any;
  id: string;
  lastName: string;
  firstName: string;
  middleName: string;
  address: string;
  status: string;
  dateAdded?: any;
  sex?: string;
  dateOfBirth?: string;
  birthDate?: string;
  date_of_birth?: string;
  birth_date?: string;
  birthday?: string;
  [key: string]: any; // allow dynamic field access
}

type SortOption = 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest';

// --- Reusable helpers (same logic as HomePage) ---

const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;

  const today = new Date();
  let birthDate: Date;

  if (dateOfBirth.includes('/')) {
    const parts = dateOfBirth.split('/');
    if (parts.length === 3) {
      birthDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    } else {
      return 0;
    }
  } else if (dateOfBirth.includes('-')) {
    birthDate = new Date(dateOfBirth);
  } else {
    birthDate = new Date(dateOfBirth);
  }

  if (isNaN(birthDate.getTime())) return 0;
  if (birthDate > today) return 0;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

const getBirthDate = (data: Resident): string | null => {
  const possibleDateFields = ['dateOfBirth', 'birthDate', 'date_of_birth', 'birth_date', 'birthday'];
  for (const field of possibleDateFields) {
    if (data[field]) return data[field];
  }
  return null;
};

// FIXED: Updated to match HomePage's logic for new ID format
const hasVoterOrNationalID = (data: Resident): boolean => {
  // NEW FORMAT: Check for front/back ID URLs (priority)
  if (data.nationalIdFrontUrl || data.nationalIdBackUrl) {
    return true;
  }
  
  if (data.votersIdFrontUrl || data.votersIdBackUrl) {
    return true;
  }

  // OLD FORMAT: Check for single ID URL
  if (data.nationalIdUrl && typeof data.nationalIdUrl === 'string' && data.nationalIdUrl.startsWith('http')) {
    return true;
  }
  
  if (data.votersIdUrl && typeof data.votersIdUrl === 'string' && data.votersIdUrl.startsWith('http')) {
    return true;
  }

  // LEGACY FORMAT: Check for old field names
  const voterIdFields = [
    'voterID', 'voter_id', 'voterId', 'votersId', 'voters_id',
    'voterIdPicture', 'voter_id_picture', 'voterIdImage', 'voter_id_image'
  ];
  
  const nationalIdFields = [
    'nationalID', 'national_id', 'nationalId', 'nationalIdPicture', 
    'national_id_picture', 'nationalIdImage', 'national_id_image',
    'philId', 'phil_id', 'philsysId', 'philsys_id'
  ];

  // Check for any voter ID fields
  for (const field of voterIdFields) {
    if (data[field] && data[field] !== '' && data[field] !== null) {
      // Only count if it's a URL (not just a filename)
      if (typeof data[field] === 'string' && data[field].startsWith('http')) {
        return true;
      }
    }
  }

  // Check for any national ID fields
  for (const field of nationalIdFields) {
    if (data[field] && data[field] !== '' && data[field] !== null) {
      // Only count if it's a URL (not just a filename)
      if (typeof data[field] === 'string' && data[field].startsWith('http')) {
        return true;
      }
    }
  }

  // Check isRegisteredVoter flag as fallback
  if (data.isRegisteredVoter === true) {
    return true;
  }

  return false;
};

// --- Filter config driven by the URL param ---

type ActiveFilter = 'male' | 'female' | 'senior' | 'voters' | null;

const FILTER_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  male:    { label: 'Male Residents',      icon: '👨', color: '#4facfe' },
  female:  { label: 'Female Residents',    icon: '👩', color: '#f093fb' },
  senior:  { label: 'Senior Citizens (60+)', icon: '👴', color: '#f5576c' },
  voters:  { label: 'Registered Voters',   icon: '🗳️', color: '#764ba2' },
};

const Residents: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');

  // Derive active filter from URL
  const rawFilter = searchParams.get('filter');
  const activeFilter: ActiveFilter = (() => {
    if (rawFilter === 'male') return 'male';
    if (rawFilter === 'female') return 'female';
    if (rawFilter === 'senior') return 'senior';
    // The HomePage passes a messy string for voters; catch any value that starts with "voter"
    if (rawFilter && rawFilter.toLowerCase().startsWith('voter')) return 'voters';
    return null;
  })();

  // ---- Fetch ----
  const fetchResidents = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'residents'));
      const data: Resident[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Resident[];
      setResidents(data);
    } catch (error) {
      console.error('Error fetching residents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  // ---- Sort ----
  const sortResidents = (list: Resident[], sortOption: SortOption): Resident[] => {
  const sorted = [...list];

  switch (sortOption) {
    case 'name-asc':
      return sorted.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
    
    case 'name-desc':
      return sorted.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameB.localeCompare(nameA);
      });
    
    case 'date-newest':
      return sorted.sort((a, b) => {
        // Get date from either createdAt or dateAdded field
        const getDate = (resident: Resident) => {
          const dateField = resident.createdAt || resident.dateAdded;
          if (!dateField) return new Date(0); // Put residents without date at the end
          
          // Handle Firestore Timestamp
          if (dateField.toDate) {
            return dateField.toDate();
          }
          
          // Handle ISO string or regular Date
          return new Date(dateField);
        };

        const dateA = getDate(a);
        const dateB = getDate(b);
        
        // Newest first (descending order)
        return dateB.getTime() - dateA.getTime();
      });
    
    case 'date-oldest':
      return sorted.sort((a, b) => {
        // Get date from either createdAt or dateAdded field
        const getDate = (resident: Resident) => {
          const dateField = resident.createdAt || resident.dateAdded;
          if (!dateField) return new Date(); // Put residents without date at the end
          
          // Handle Firestore Timestamp
          if (dateField.toDate) {
            return dateField.toDate();
          }
          
          // Handle ISO string or regular Date
          return new Date(dateField);
        };

        const dateA = getDate(a);
        const dateB = getDate(b);
        
        // Oldest first (ascending order)
        return dateA.getTime() - dateB.getTime();
      });
    
    default:
      return sorted;
  }
};

  // ---- Filter by active dashboard filter ----
  const applyDashboardFilter = (list: Resident[]): Resident[] => {
    if (!activeFilter) return list;

    switch (activeFilter) {
      case 'male':
        return list.filter(r => r.sex === 'Male');

      case 'female':
        return list.filter(r => r.sex === 'Female');

      case 'senior':
        return list.filter(r => {
          const dob = getBirthDate(r);
          if (!dob) return false;
          return calculateAge(dob) >= 60;
        });

      case 'voters':
        return list.filter(r => hasVoterOrNationalID(r));

      default:
        return list;
    }
  };

  // ---- Search filter (name / address / status) ----
  const applySearchFilter = (list: Resident[]): Resident[] => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(r =>
      `${r.firstName} ${r.lastName} ${r.middleName}`.toLowerCase().includes(term) ||
      (r.address || '').toLowerCase().includes(term) ||
      (r.status || '').toLowerCase().includes(term)
    );
  };

  // ---- Compose filters then sort ----
  const displayedResidents = sortResidents(
    applySearchFilter(applyDashboardFilter(residents)),
    sortBy
  );

  // ---- Handlers ----
  const handleAddResident = () => navigate('/add-resident');
  const handleView    = (id: string) => navigate(`/resident/${id}`);
  const handleEdit    = (id: string) => navigate(`/edit-resident/${id}`);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this resident?')) {
      try {
        await deleteDoc(doc(db, 'residents', id));
        fetchResidents();
      } catch (error) {
        console.error('Error deleting resident:', error);
        alert('Failed to delete resident. Please try again.');
      }
    }
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortOption);
  };

  const handleMigrate = () => {
    migrateResidentsToNumericalIds().then(() => fetchResidents());
  };

  // ---- Render ----
  const filterInfo = activeFilter ? FILTER_LABELS[activeFilter] : null;

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Residents</h1>
            <p style={styles.subtitle}>Manage barangay residents information</p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.migrateButton} onClick={handleMigrate}>
              🔄 Assign Numerical IDs
            </button>
            <LogoutButton />
          </div>
        </div>

        {/* Active filter badge (shown when navigated from dashboard) */}
        {filterInfo && (
          <div style={styles.filterBadgeRow}>
            <div style={{ ...styles.filterBadge, borderColor: filterInfo.color, backgroundColor: filterInfo.color + '15' }}>
              <span style={{ marginRight: '6px' }}>{filterInfo.icon}</span>
              <span style={{ ...styles.filterBadgeText, color: filterInfo.color }}>
                Showing: {filterInfo.label}
              </span>
              <button
                style={styles.filterBadgeClear}
                onClick={() => navigate('/residents')}
                title="Clear filter"
              >
                ✕
              </button>
            </div>
            <span style={styles.filterCount}>
              {displayedResidents.length} resident{displayedResidents.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.searchContainer}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search residents by name, address, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.sortContainer}>
            <label style={styles.sortLabel}>Sort by:</label>
            <select value={sortBy} onChange={handleSortChange} style={styles.sortSelect}>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="date-newest">Date Added (Newest)</option>
              <option value="date-oldest">Date Added (Oldest)</option>
            </select>
          </div>

          <button style={styles.addButton} onClick={handleAddResident}>
            <span style={styles.buttonIcon}>➕</span>
            Add Resident
          </button>
        </div>

        {/* Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading residents...</p>
            </div>
          ) : (
            <>
              <div style={styles.tableHeader}>
                <span style={styles.resultsCount}>
                  {displayedResidents.length} of {residents.length} residents
                  {activeFilter && ` • Filtered by: ${filterInfo?.label}`}
                </span>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeaderCell}>Full Name</th>
                    <th style={styles.tableHeaderCell}>Address</th>
                    <th style={styles.tableHeaderCell}>Status</th>
                    <th style={styles.tableHeaderCell}>Date Added</th>
                    <th style={styles.tableHeaderCell}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedResidents.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={styles.emptyState}>
                        <div style={styles.emptyStateContent}>
                          <span style={styles.emptyStateIcon}>
                            {filterInfo ? filterInfo.icon : '👥'}
                          </span>
                          <p style={styles.emptyStateText}>
                            {activeFilter
                              ? `No ${filterInfo?.label.toLowerCase()} found.`
                              : searchTerm
                                ? 'No residents found matching your search.'
                                : 'No residents found.'}
                          </p>
                          {!activeFilter && !searchTerm && (
                            <button style={styles.addButton} onClick={handleAddResident}>
                              Add First Resident
                            </button>
                          )}
                          {activeFilter && (
                            <button
                              style={{ ...styles.addButton, backgroundColor: '#667eea' }}
                              onClick={() => navigate('/residents')}
                            >
                              Show All Residents
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedResidents.map((resident, index) => (
                      <tr key={resident.id} style={{
                        ...styles.tableRow,
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc'
                      }}>
                        <td style={styles.tableCell}>
                          <div style={styles.nameCell}>
                            <span style={styles.avatar}>👤</span>
                            <div>
                              <div style={styles.fullName}>
                                {`${resident.firstName} ${resident.middleName} ${resident.lastName}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={styles.tableCell}>{resident.address}</td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: resident.status === 'Active' ? '#dcfce7' : '#fee2e2',
                            color: resident.status === 'Active' ? '#166534' : '#991b1b'
                          }}>
                            {resident.status}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          {resident.createdAt ? (
                            <span style={styles.dateText}>
                              {(resident.createdAt.toDate ? resident.createdAt.toDate() : new Date(resident.createdAt)).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          ) : (
                            <span style={styles.noDateText}>No date</span>
                          )}
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.actionButtons}>
                            <button onClick={() => handleView(resident.id)} style={styles.viewButton}>👁️ View</button>
                            <button onClick={() => handleEdit(resident.id)} style={styles.editButton}>✏️ Edit</button>
                            <button onClick={() => handleDelete(resident.id)} style={styles.deleteButton}>🗑️ Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
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
    marginBottom: '24px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
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
  migrateButton: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
    boxShadow: '0 2px 4px rgba(139, 92, 246, 0.2)',
    marginRight: '190px',
  },

  // --- Filter badge ---
  filterBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  filterBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '24px',
    border: '1px solid',
  },
  filterBadgeText: {
    fontSize: '14px',
    fontWeight: '600',
  },
  filterBadgeClear: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#64748b',
    padding: '0 0 0 6px',
    lineHeight: 1,
  },
  filterCount: {
    fontSize: '13px',
    color: '#64748b',
  },

  // --- Toolbar ---
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '20px',
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
    maxWidth: '400px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '16px',
    color: '#64748b',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 40px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  sortContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sortLabel: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  sortSelect: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#374151',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '160px',
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
    transition: 'background-color 0.2s ease',
    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
    whiteSpace: 'nowrap',
  },
  buttonIcon: {
    fontSize: '14px',
  },

  // --- Table ---
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tableHeader: {
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
    padding: '16px 20px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e2e8f0',
  },
  tableRow: {
    transition: 'background-color 0.1s ease',
  },
  tableCell: {
    padding: '16px 20px',
    fontSize: '14px',
    color: '#374151',
    borderBottom: '1px solid #f1f5f9',
  },
  nameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    fontSize: '20px',
    backgroundColor: '#e2e8f0',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullName: {
    fontWeight: '500',
    color: '#1a202c',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
  },
  dateText: {
    fontSize: '13px',
    color: '#64748b',
  },
  noDateText: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
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
    transition: 'background-color 0.2s ease',
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
    transition: 'background-color 0.2s ease',
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
    transition: 'background-color 0.2s ease',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
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
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyStateContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  emptyStateIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: '16px',
    margin: '0',
  },
};

export default Residents;
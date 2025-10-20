import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../Database/firebase';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { migrateResidentsToNumericalIds } from '../Database/migration'; // Import the migration function

interface Resident {
  createdAt: any;
  id: string;
  lastName: string;
  firstName: string;
  middleName: string;
  address: string;
  status: string;
  dateAdded?: any;
}

type SortOption = 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest';

const Residents: React.FC = () => {
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');

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

  const sortResidents = (residents: Resident[], sortOption: SortOption): Resident[] => {
    const sorted = [...residents];
    
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
          const dateA = a.dateAdded ? (a.dateAdded.toDate ? a.dateAdded.toDate() : new Date(a.dateAdded)) : new Date(0);
          const dateB = b.dateAdded ? (b.dateAdded.toDate ? b.dateAdded.toDate() : new Date(b.dateAdded)) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      
      case 'date-oldest':
        return sorted.sort((a, b) => {
          const dateA = a.dateAdded ? (a.dateAdded.toDate ? a.dateAdded.toDate() : new Date(a.dateAdded)) : new Date(0);
          const dateB = b.dateAdded ? (b.dateAdded.toDate ? b.dateAdded.toDate() : new Date(b.dateAdded)) : new Date(0);
          return dateA.getTime() - dateB.getTime();
        });
      
      default:
        return sorted;
    }
  };

  const handleAddResident = () => {
    navigate('/add-resident');
  };

  const handleView = (id: string) => {
    navigate(`/resident/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/edit-resident/${id}`);
  };

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
    migrateResidentsToNumericalIds().then(() => {
      // Refresh the residents list after migration
      fetchResidents();
    });
  };

  const filteredResidents = residents.filter(resident =>
    `${resident.firstName} ${resident.lastName} ${resident.middleName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    resident.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedAndFilteredResidents = sortResidents(filteredResidents, sortBy);

  useEffect(() => {
    fetchResidents();
  }, []);

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>
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
            <select 
              value={sortBy} 
              onChange={handleSortChange}
              style={styles.sortSelect}
            >
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
                  {sortedAndFilteredResidents.length} of {residents.length} residents
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
                  {sortedAndFilteredResidents.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={styles.emptyState}>
                        <div style={styles.emptyStateContent}>
                          <span style={styles.emptyStateIcon}>👥</span>
                          <p style={styles.emptyStateText}>
                            {searchTerm ? 'No residents found matching your search.' : 'No residents found.'}
                          </p>
                          {!searchTerm && (
                            <button style={styles.addButton} onClick={handleAddResident}>
                              Add First Resident
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedAndFilteredResidents.map((resident, index) => (
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
                            <button onClick={() => handleView(resident.id)} style={styles.viewButton}>
                              👁️ View
                            </button>
                            <button onClick={() => handleEdit(resident.id)} style={styles.editButton}>
                              ✏️ Edit
                            </button>
                            <button onClick={() => handleDelete(resident.id)} style={styles.deleteButton}>
                              🗑️ Delete
                            </button>
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
    marginBottom: '30px',
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
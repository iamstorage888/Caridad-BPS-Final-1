import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { useNavigate } from 'react-router-dom';
import { db } from '../Database/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface Household {
  id: string;
  householdName: string;
  householdNumber: string;
  purok: string;
}

const Households: React.FC = () => {
  const navigate = useNavigate();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);

  useEffect(() => {
    const fetchHouseholds = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'households'));
        const data = snapshot.docs.map((doc) => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as Household[];
        setHouseholds(data);
      } catch (error) {
        console.error('Error fetching households:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHouseholds();
  }, []);

  const handleAddHousehold = () => {
    navigate('/add-household');
  };

  const handleView = (householdNumber: string) => {
    navigate(`/household/${householdNumber}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/edit-household/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this household?')) {
      try {
        await deleteDoc(doc(db, 'households', id));
        setHouseholds(prev => prev.filter(h => h.id !== id));
      } catch (error) {
        console.error('Error deleting household:', error);
        alert('Failed to delete household. Please try again.');
      }
    }
  };

  const filteredHouseholds = households.filter(household =>
    household.householdName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    household.householdNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    household.purok?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Households</h1>
            <p style={styles.subtitle}>Manage barangay household information</p>
          </div>
          <LogoutButton />
        </div>

        <div style={styles.toolbar}>
  <div style={styles.searchContainer}>
    <span style={styles.searchIcon}>🔍</span>
    <input
      type="text"
      placeholder="Search households by name, number, or purok..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      style={styles.searchInput}
    />
  </div>
  
  {/* DELETE TOGGLE - NEW */}
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
  
  <button style={styles.addButton} onClick={handleAddHousehold}>
    <span style={styles.buttonIcon}>🏠</span>
    Add Household
  </button>
</div>

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading households...</p>
            </div>
          ) : (
            <>
              <div style={styles.tableHeader}>
                <span style={styles.resultsCount}>
                  {filteredHouseholds.length} of {households.length} households
                </span>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeaderCell}>Household Name</th>
                    <th style={styles.tableHeaderCell}>Household Number</th>
                    <th style={styles.tableHeaderCell}>Purok</th>
                    <th style={styles.tableHeaderCell}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHouseholds.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={styles.emptyState}>
                        <div style={styles.emptyStateContent}>
                          <span style={styles.emptyStateIcon}>🏠</span>
                          <p style={styles.emptyStateText}>
                            {searchTerm ? 'No households found matching your search.' : 'No households found.'}
                          </p>
                          {!searchTerm && (
                            <button style={styles.addButton} onClick={handleAddHousehold}>
                              Add First Household
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredHouseholds.map((household, index) => (
                      <tr key={household.id} style={{
                        ...styles.tableRow,
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc'
                      }}>
                        <td style={styles.tableCell}>
                          <div style={styles.householdCell}>
                            <span style={styles.householdIcon}>🏡</span>
                            <div>
                              <div style={styles.householdName}>
                                {household.householdName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={styles.householdNumber}>
                            #{household.householdNumber}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={styles.purokBadge}>
                            📍 {household.purok}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
  <div style={styles.actionButtons}>
    <button 
      onClick={() => handleView(household.householdNumber)} 
      style={styles.viewButton}
    >
      👁️ View
    </button>
    <button 
      onClick={() => handleEdit(household.id)} 
      style={styles.editButton}
    >
      ✏️ Edit
    </button>
    {showDeleteButtons && (
      <button 
        onClick={() => handleDelete(household.id)} 
        style={styles.deleteButton}
      >
        🗑️ Delete
      </button>
    )}
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
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#0ea5e9',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
    boxShadow: '0 2px 4px rgba(14, 165, 233, 0.2)',
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
  householdCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  householdIcon: {
    fontSize: '20px',
    backgroundColor: '#e2e8f0',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  householdName: {
    fontWeight: '500',
    color: '#1a202c',
  },
  householdNumber: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
  },
  purokBadge: {
    backgroundColor: '#f0fdf4',
    color: '#166534',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
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

  deleteToggleContainer: {
  display: 'flex',
  alignItems: 'center',
  marginLeft: 'auto',
  marginRight: '12px',
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

};

export default Households;
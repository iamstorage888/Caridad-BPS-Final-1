import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

interface Blotter {
  id?: string;
  complainant: string;
  respondent: string;
  incidentType: string;
  incidentDate: string;
  location: string;
  details: string;
  status?: string;
}

const BlotterReports: React.FC = () => {
  const [blotters, setBlotters] = useState<Blotter[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  const statusOptions = [
    { value: 'filed', label: 'Filed / Logged / Recorded', color: '#8B4513' },
    { value: 'investigating', label: 'Under Investigation', color: '#FF6347' },
    { value: 'referred', label: 'Referred / Endorsed', color: '#4169E1' },
    { value: 'mediation', label: 'For Mediation', color: '#32CD32' },
    { value: 'settled', label: 'Settled / Resolved', color: '#FF1493' },
    { value: 'ongoing', label: 'Unresolved / Ongoing', color: '#00CED1' },
    { value: 'dismissed', label: 'Dismissed / Dropped', color: '#FFD700' },
    { value: 'escalated', label: 'Escalated / Elevated', color: '#9932CC' },
    { value: 'closed', label: 'Closed / Completed', color: '#FF4500' },
    { value: 'Unscheduled', label: 'Unscheduled/Cases', color: '#2E8B57' },
    { value: 'Scheduled', label: 'Scheduled/Cases', color: '#DC143C' }
  ];

  const fetchBlotters = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'blotters'));
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || 'filed'
      })) as Blotter[];
      setBlotters(list);
    } catch (error) {
      console.error('Error fetching blotters:', error);
    } finally {
      setLoading(false);
    }
  };

  // This is now a standalone function that takes a fully-formed blotter object.
  // It does exactly two things in order: write to archived_blotters, then delete from blotters.
  const archiveBlotter = async (blotter: Blotter) => {
    if (!blotter.id) return;

    try {
      await addDoc(collection(db, 'archived_blotters'), {
        complainant: blotter.complainant,
        respondent: blotter.respondent,
        incidentType: blotter.incidentType,
        incidentDate: blotter.incidentDate,
        location: blotter.location,
        details: blotter.details,
        status: blotter.status,
        archivedDate: new Date().toISOString()
      });

      await deleteDoc(doc(db, 'blotters', blotter.id));

      // Remove from local state after both Firestore operations succeed
      setBlotters(prev => prev.filter(b => b.id !== blotter.id));

      alert('Report has been archived successfully. You can find it in the Archives section.');
    } catch (error) {
      console.error('Error archiving blotter:', error);
      alert('Failed to archive report. Please try again.');
    }
  };

  const updateBlotterStatus = async (blotterId: string, newStatus: string) => {
    if (!blotterId) return;

    setUpdatingStatus(blotterId);
    try {
      // 1. Write the new status to Firestore first
      await updateDoc(doc(db, 'blotters', blotterId), {
        status: newStatus
      });

      // 2. Build the updated blotter object right here — no stale closure
      const currentBlotter = blotters.find(b => b.id === blotterId);
      if (!currentBlotter) return;

      const updatedBlotter: Blotter = { ...currentBlotter, status: newStatus };

      // 3. Update local state
      setBlotters(prev => prev.map(b =>
        b.id === blotterId ? updatedBlotter : b
      ));

      // 4. If closed or settled, archive immediately with the correct data.
      //    No setTimeout, no stale state — we already have the correct object above.
      if (newStatus === 'closed' || newStatus === 'settled') {
        await archiveBlotter(updatedBlotter);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  useEffect(() => {
    fetchBlotters();
  }, []);

  const toggleExpand = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index));
  };

  const getIncidentIcon = (incidentType: string) => {
    const iconMap: { [key: string]: string } = {
      'theft': '🔓',
      'assault': '👊',
      'vandalism': '🔨',
      'noise complaint': '🔊',
      'domestic dispute': '🏠',
      'fraud': '💳',
      'harassment': '😡',
      'trespassing': '🚫',
      'property damage': '🏚️',
      'other': '📋',
      default: '⚠️'
    };
    return iconMap[incidentType.toLowerCase()] || iconMap.default;
  };

  const getSeverityLevel = (incidentType: string): 'high' | 'medium' | 'low' => {
    const highSeverity = ['assault', 'theft', 'fraud', 'property damage'];
    const mediumSeverity = ['vandalism', 'harassment', 'trespassing'];

    if (highSeverity.some(type => incidentType.toLowerCase().includes(type))) return 'high';
    if (mediumSeverity.some(type => incidentType.toLowerCase().includes(type))) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
    }
  };

  const getStatusInfo = (status: string) => {
    const statusInfo = statusOptions.find(opt => opt.value === status);
    return statusInfo || { value: status, label: status, color: '#6c757d' };
  };

  const filteredBlotters = filterType === 'all'
    ? blotters
    : blotters.filter(b => getSeverityLevel(b.incidentType) === filterType);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div style={styles.container}>
          <LogoutButton />
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading blotter reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <LogoutButton />
        </div>

        <div style={styles.content}>
          <div style={styles.titleSection}>
            <div>
              <h1 style={styles.title}>Blotter Reports</h1>
              <p style={styles.subtitle}>Incident reports and complaint management with status tracking</p>
            </div>
            <div style={styles.stats}>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>{blotters.length}</span>
                <span style={styles.statLabel}>Active Reports</span>
              </div>
              <div style={{ ...styles.statCard, backgroundColor: '#ffebee' }}>
                <span style={{ ...styles.statNumber, color: '#c62828' }}>
                  {blotters.filter(b => getSeverityLevel(b.incidentType) === 'high').length}
                </span>
                <span style={{ ...styles.statLabel, color: '#c62828' }}>High Priority</span>
              </div>
              <div style={{ ...styles.statCard, backgroundColor: '#fff3e0' }}>
                <span style={{ ...styles.statNumber, color: '#ef6c00' }}>
                  {blotters.filter(b => b.status === 'investigating' || b.status === 'ongoing').length}
                </span>
                <span style={{ ...styles.statLabel, color: '#ef6c00' }}>In Progress</span>
              </div>
            </div>
          </div>

          <div style={styles.controls}>
            <div style={styles.leftControls}>
              <button onClick={() => navigate('/add-blotter')} style={styles.primaryButton}>
                <span style={styles.buttonIcon}>+</span>
                Add Blotter Report
              </button>
              <button onClick={() => navigate('/archives')} style={styles.archiveButton}>
                <span style={styles.buttonIcon}>📁</span>
                Archives
              </button>
            </div>

            <div style={styles.filterContainer}>
              <label style={styles.filterLabel}>Filter by priority:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Priority</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          {filteredBlotters.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <h3 style={styles.emptyTitle}>
                {filterType === 'all' ? 'No active blotter reports found' : `No ${filterType} priority reports found`}
              </h3>
              <p style={styles.emptyText}>
                {filterType === 'all'
                  ? 'Start by adding your first incident report.'
                  : 'Try selecting a different priority filter.'}
              </p>
              {filterType === 'all' && (
                <button onClick={() => navigate('/add-blotter')} style={styles.emptyButton}>
                  Add Report
                </button>
              )}
            </div>
          ) : (
            <div style={styles.reportsGrid}>
              {filteredBlotters.map((b, i) => {
                const severity = getSeverityLevel(b.incidentType);
                const isExpanded = expandedIndex === i;
                const statusInfo = getStatusInfo(b.status || 'filed');
                const isUpdating = updatingStatus === b.id;

                return (
                  <div key={b.id || i} style={styles.card}>
                    <div style={styles.cardHeader}>
                      <div style={styles.incidentInfo}>
                        <div style={styles.incidentIcon}>
                          {getIncidentIcon(b.incidentType)}
                        </div>
                        <div>
                          <h3 style={styles.incidentType}>{b.incidentType}</h3>
                          <div style={styles.dateLocation}>
                            <span style={styles.date}>📅 {formatDate(b.incidentDate)}</span>
                            <span style={styles.location}>📍 {b.location}</span>
                          </div>
                        </div>
                      </div>

                      <div style={styles.cardActions}>
                        <div style={{ ...styles.priorityBadge, backgroundColor: getSeverityColor(severity) }}>
                          {severity.toUpperCase()}
                        </div>
                        <button onClick={() => toggleExpand(i)} style={styles.toggleButton}>
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Status Section */}
                    <div style={styles.statusSection}>
                      <div style={styles.statusContainer}>
                        <span style={styles.statusLabel}>📊 Status:</span>
                        <div style={styles.statusDropdownContainer}>
                          <select
                            value={b.status || 'filed'}
                            onChange={(e) => updateBlotterStatus(b.id!, e.target.value)}
                            style={{ ...styles.statusSelect, opacity: isUpdating ? 0.6 : 1 }}
                            disabled={isUpdating}
                          >
                            {statusOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {isUpdating && <div style={styles.statusSpinner}></div>}
                        </div>
                        <div style={{ ...styles.statusBadge, backgroundColor: statusInfo.color }}>
                          {statusInfo.label}
                        </div>
                      </div>
                      {(b.status === 'closed' || b.status === 'settled') && (
                        <div style={styles.archiveNotice}>
                          ℹ️ This report will be automatically archived
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div style={styles.expandedContent}>
                        <div style={styles.divider}></div>
                        <div style={styles.detailsGrid}>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>👤 Complainant:</span>
                            <span style={styles.detailValue}>{b.complainant}</span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>🎯 Respondent:</span>
                            <span style={styles.detailValue}>{b.respondent}</span>
                          </div>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>📝 Details:</span>
                            <p style={styles.detailDescription}>{b.details}</p>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div style={styles.actionButtonsContainer}>
                          <button 
                            onClick={() => navigate(`/edit-blotter/${b.id}`)}
                            style={styles.editButton}
                            className="edit-button"
                          >
                            <span style={styles.buttonIcon}>✏️</span>
                            Edit Report
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginLeft: '220px',
    padding: '20px',
    width: '100%',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh'
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
    border: '1px solid #e9ecef'
  },
  titleSection: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '32px',
    paddingBottom: '20px',
    borderBottom: '2px solid #f1f3f4'
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
    gap: '16px'
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
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px'
  },
  leftControls: {
    display: 'flex',
    gap: '12px'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(40, 167, 69, 0.3)'
  },
  archiveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#7b1fa2',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(123, 31, 162, 0.3)'
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
  reportsGrid: {
    display: 'grid',
    gap: '16px'
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e9ecef',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#fafafa'
  },
  incidentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  incidentIcon: {
    fontSize: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '50px',
    height: '50px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    border: '2px solid #e9ecef'
  },
  incidentType: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50',
    textTransform: 'capitalize' as const
  },
  dateLocation: {
    display: 'flex',
    gap: '16px',
    marginTop: '4px'
  },
  date: {
    fontSize: '14px',
    color: '#6c757d',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  location: {
    fontSize: '14px',
    color: '#6c757d',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  priorityBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'white',
    letterSpacing: '0.5px'
  },
  toggleButton: {
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background-color 0.2s ease'
  },
  statusSection: {
    padding: '16px 20px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e9ecef'
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const
  },
  statusLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  statusDropdownContainer: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center'
  },
  statusSelect: {
    padding: '6px 10px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '13px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    minWidth: '200px'
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'white',
    letterSpacing: '0.5px',
    marginLeft: 'auto'
  },
  statusSpinner: {
    position: 'absolute' as const,
    right: '8px',
    width: '16px',
    height: '16px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  archiveNotice: {
    fontSize: '12px',
    color: '#7b1fa2',
    fontStyle: 'italic' as const,
    marginTop: '8px',
    padding: '6px 10px',
    backgroundColor: '#f3e5f5',
    borderRadius: '4px',
    border: '1px solid #e1bee7'
  },
  expandedContent: {
    backgroundColor: '#ffffff'
  },
  divider: {
    height: '1px',
    backgroundColor: '#e9ecef'
  },
  detailsGrid: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  },
  detailLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  detailValue: {
    fontSize: '15px',
    color: '#2c3e50',
    fontWeight: '500',
    marginLeft: '20px'
  },
  detailDescription: {
    fontSize: '15px',
    color: '#2c3e50',
    lineHeight: '1.5',
    margin: '0',
    marginLeft: '20px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e9ecef'
  },
  actionButtonsContainer: {
    padding: '16px 20px',
    borderTop: '1px solid #e9ecef',
    backgroundColor: '#fafafa',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  editButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 123, 255, 0.3)'
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
    backgroundColor: '#28a745',
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
    borderTop: '3px solid #28a745',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: '#6c757d',
    fontSize: '16px',
    margin: 0
  }
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .edit-button:hover {
    background-color: #0056b3 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 123, 255, 0.4) !important;
  }
`;
document.head.appendChild(styleSheet);

export default BlotterReports;
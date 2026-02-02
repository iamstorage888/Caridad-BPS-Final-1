import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

interface ArchivedBlotter {
  id?: string;
  complainant: string;
  respondent: string;
  incidentType: string;
  incidentDate: string;
  location: string;
  details: string;
  status: string;
  archivedDate: string;
}

const Archives: React.FC = () => {
  const [archivedBlotters, setArchivedBlotters] = useState<ArchivedBlotter[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchArchivedBlotters = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'archived_blotters'));
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ArchivedBlotter[];

      // Sort by archived date (newest first)
      list.sort((a, b) => new Date(b.archivedDate).getTime() - new Date(a.archivedDate).getTime());
      setArchivedBlotters(list);
    } catch (error) {
      console.error('Error fetching archived blotters:', error);
      alert('Failed to load archived reports. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const permanentlyDeleteBlotter = async (blotterId: string) => {
    if (!blotterId) {
      alert('Invalid report ID. Cannot delete.');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this archived report? This action cannot be undone.'
    );
    if (!confirmed) return;

    setDeletingId(blotterId);
    try {
      await deleteDoc(doc(db, 'archived_blotters', blotterId));

      // Remove from local state only after Firestore confirms deletion
      setArchivedBlotters(prev => prev.filter(b => b.id !== blotterId));
      setExpandedIndex(null);

      alert('Report permanently deleted successfully.');
    } catch (error: any) {
      console.error('Error deleting archived blotter:', error);
      if (error.code === 'permission-denied') {
        alert('Permission denied. Please check your Firebase security rules.');
      } else if (error.code === 'not-found') {
        alert('Report not found. It may have already been deleted.');
        await fetchArchivedBlotters();
      } else {
        alert('Failed to delete report. Please try again.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchArchivedBlotters();
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

  const filteredBlotters = filterType === 'all'
    ? archivedBlotters
    : archivedBlotters.filter(b => getSeverityLevel(b.incidentType) === filterType);

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

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
            <p style={styles.loadingText}>Loading archived reports...</p>
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
              <h1 style={styles.title}>📁 Archived Reports</h1>
              <p style={styles.subtitle}>Completed and closed blotter reports archive</p>
            </div>
            <div style={styles.stats}>
              <div style={styles.statCard}>
                <span style={styles.statNumber}>{archivedBlotters.length}</span>
                <span style={styles.statLabel}>Archived Reports</span>
              </div>
              <div style={{ ...styles.statCard, backgroundColor: '#e8f5e8' }}>
                <span style={{ ...styles.statNumber, color: '#2e7d32' }}>
                  {archivedBlotters.filter(b => b.status === 'closed').length}
                </span>
                <span style={{ ...styles.statLabel, color: '#2e7d32' }}>Closed Cases</span>
              </div>
              <div style={{ ...styles.statCard, backgroundColor: '#fff3e0' }}>
                <span style={{ ...styles.statNumber, color: '#ef6c00' }}>
                  {archivedBlotters.filter(b => b.status === 'settled').length}
                </span>
                <span style={{ ...styles.statLabel, color: '#ef6c00' }}>Settled Cases</span>
              </div>
            </div>
          </div>

          <div style={styles.controls}>
            <button onClick={() => navigate('/blotter')} style={styles.backButton}>
              <span style={styles.buttonIcon}>←</span>
              Back to Active Reports
            </button>

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
              <div style={styles.emptyIcon}>🗃️</div>
              <h3 style={styles.emptyTitle}>
                {filterType === 'all' ? 'No archived reports found' : `No ${filterType} priority archived reports found`}
              </h3>
              <p style={styles.emptyText}>
                {filterType === 'all'
                  ? 'Closed and completed reports will appear here automatically.'
                  : 'Try selecting a different priority filter.'}
              </p>
            </div>
          ) : (
            <div style={styles.reportsGrid}>
              {filteredBlotters.map((b, i) => {
                const severity = getSeverityLevel(b.incidentType);
                const isExpanded = expandedIndex === i;
                const isDeleting = deletingId === b.id;

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
                        <button
                          onClick={() => toggleExpand(i)}
                          style={styles.toggleButton}
                          disabled={isDeleting}
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Archive Info Section */}
                    <div style={styles.archiveSection}>
                      <div style={styles.archiveInfo}>
                        <span style={styles.archiveLabel}>🗄️ Status:</span>
                        <div style={styles.statusBadge}>
                          {b.status === 'closed' ? 'CLOSED / COMPLETED' : 'SETTLED / RESOLVED'}
                        </div>
                        <span style={styles.archiveDate}>
                          📆 Archived: {formatDateTime(b.archivedDate)}
                        </span>
                      </div>
                      <button
                        onClick={() => permanentlyDeleteBlotter(b.id!)}
                        style={{
                          ...styles.deleteButton,
                          opacity: isDeleting ? 0.6 : 1,
                          cursor: isDeleting ? 'not-allowed' : 'pointer'
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? '🔄 Deleting...' : '🗑️ Delete'}
                      </button>
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
    backgroundColor: '#f3e5f5',
    borderRadius: '8px',
    minWidth: '100px'
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#7b1fa2'
  },
  statLabel: {
    fontSize: '12px',
    color: '#7b1fa2',
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
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(108, 117, 125, 0.3)'
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
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    opacity: 0.95
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
  archiveSection: {
    padding: '16px 20px',
    backgroundColor: '#f1f3f4',
    borderTop: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  archiveInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const
  },
  archiveLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'white',
    letterSpacing: '0.5px',
    backgroundColor: '#28a745'
  },
  archiveDate: {
    fontSize: '13px',
    color: '#6c757d',
    fontStyle: 'italic' as const
  },
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
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
    borderTop: '3px solid #7b1fa2',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: '#6c757d',
    fontSize: '16px',
    margin: 0
  }
};

export default Archives;
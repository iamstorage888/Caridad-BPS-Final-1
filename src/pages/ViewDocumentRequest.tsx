import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, collection, updateDoc } from 'firebase/firestore';
import { db } from '../Database/firebase';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import DocumentTemplate from '../components/DocumentTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Define the Resident type for typing and code clarity
interface Resident {
  firstName: string;
  middleName?: string;
  lastName: string;
  birthday?: string;
  address?: string;
  occupation?: string;
  status?: string;
  movedInDate?: string;
  sex?: string;
}

interface DocumentRequest {
  fullName: string;
  purpose: string;
  documentType: DocumentTemplateProps['documentType'] | string;
  status?: string;
  createdAt?: any;
}

export interface DocumentTemplateProps {
  fullName: string;
  purpose: string;
  documentType:
    | 'Brgy Clearance'
    | 'Brgy Residency'
    | 'Brgy Permit'
    | 'Certificate of Indigency'
    | 'Certificate Dry Docking'
    | 'Certificate of Attestation';
  sex?: string;
  birthday?: string;
  address?: string;
  occupation?: string;
  status?: string;
  movedInDate?: string;
}

// Helper function to safely convert Firestore timestamp to date string
const formatFirestoreDate = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  
  try {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString();
    }
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }
    return 'N/A';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

const ViewDocument: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DocumentRequest & Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<string>('Pending');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) {
        setError('Document ID is required');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'documentRequests', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError('Document not found');
          setLoading(false);
          return;
        }

        const requestData = docSnap.data() as DocumentRequest;
        setDocumentStatus(requestData.status || 'Pending');

        const residentsSnap = await getDocs(collection(db, 'residents'));
        const residents = residentsSnap.docs.map(doc => doc.data() as Resident);

        const matchedResident = residents.find((r: Resident) =>
          `${r.firstName} ${r.middleName || ''} ${r.lastName}`.trim().toLowerCase() ===
          requestData.fullName.trim().toLowerCase()
        );

        if (!matchedResident) {
          console.warn('⚠️ No matching resident found for', requestData.fullName);
        }

        if (matchedResident) {
          setData({
            ...requestData,
            ...matchedResident,
          });
        } else {
          setData({
            ...requestData,
            firstName: '',
            lastName: '',
            middleName: '',
            birthday: '',
            address: '',
            occupation: '',
            status: '',
            movedInDate: '',
            sex: '',
          });
        }
      } catch (error) {
        console.error('🔥 Error fetching document or resident:', error);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  const approveDocument = async () => {
    if (!id) return;

    setIsApproving(true);
    setShowApproveModal(false);
    try {
      const docRef = doc(db, 'documentRequests', id);
      await updateDoc(docRef, {
        status: 'Approved',
        approvedAt: new Date(),
      });
      
      setDocumentStatus('Approved');
      alert('Document approved successfully!');
    } catch (error) {
      console.error('Error approving document:', error);
      alert('Failed to approve document');
    } finally {
      setIsApproving(false);
    }
  };

  const downloadPDF = async () => {
    if (!contentRef.current) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${data?.documentType?.replace(/\s+/g, '_')}_${data?.fullName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':  return '#10b981';
      case 'rejected':  return '#ef4444';
      case 'pending':
      default:          return '#f59e0b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':  return '✅';
      case 'rejected':  return '❌';
      case 'pending':
      default:          return '⏳';
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.header}>
            <LogoutButton />
          </div>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}>⏳</div>
            <p style={styles.loadingText}>Loading document...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.header}>
            <LogoutButton />
          </div>
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>❌</div>
            <h2 style={styles.errorTitle}>Document Not Found</h2>
            <p style={styles.errorText}>{error || 'The requested document could not be found.'}</p>
            <button onClick={() => navigate('/documents')} style={styles.backButton}>
              ← Back to Documents
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main ──────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <LogoutButton />
        </div>
        
        <div style={styles.contentWrapper}>
          {/* Page Header */}
          <div style={styles.pageHeader}>
            <div style={styles.titleSection}>
              <button onClick={() => navigate('/documents')} style={styles.backBtn}>
                ← Back
              </button>
              <div style={styles.pageTitle}>
                <span style={styles.pageIcon}>📄</span>
                <div>
                  <h1 style={styles.title}>Document Preview</h1>
                  <p style={styles.subtitle}>Review and manage document request</p>
                </div>
              </div>
            </div>
            
            <div style={styles.statusBadge}>
              <span style={styles.statusIcon}>{getStatusIcon(documentStatus)}</span>
              <span style={{ ...styles.statusText, color: getStatusColor(documentStatus) }}>
                {documentStatus}
              </span>
            </div>
          </div>

          {/* Info Card */}
          <div style={styles.infoCard}>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>👤 Resident:</span>
                <span style={styles.infoValue}>{data.fullName}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>📋 Document Type:</span>
                <span style={styles.infoValue}>{data.documentType}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>📝 Purpose:</span>
                <span style={styles.infoValue}>{data.purpose}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>📅 Requested:</span>
                <span style={styles.infoValue}>{formatFirestoreDate(data.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Document Preview */}
          <div style={styles.documentContainer}>
            <div style={styles.documentHeader}>
              <h3 style={styles.documentTitle}>Document Preview</h3>
              <div style={styles.previewBadge}>📖 Preview Mode</div>
            </div>
            
            <div style={styles.documentWrapper}>
              <div ref={contentRef} style={styles.documentContent}>
                <DocumentTemplate
                  fullName={data.fullName}
                  documentType={
                    [
                      'Brgy Clearance',
                      'Brgy Residency',
                      'Brgy Permit',
                      'Certificate of Indigency',
                      'Certificate Dry Docking',
                      'Certificate of Attestation',
                    ].includes(data.documentType)
                      ? (data.documentType as DocumentTemplateProps['documentType'])
                      : 'Brgy Clearance'
                  }
                  purpose={data.purpose}
                  sex={data.sex}
                  birthday={data.birthday}
                  address={data.address}
                  occupation={data.occupation}
                  status={data.status}
                  movedInDate={data.movedInDate}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actionsContainer}>
            <div style={styles.actionButtons}>
              {documentStatus === 'Pending' && (
                <button
                  onClick={() => setShowApproveModal(true)}
                  disabled={isApproving}
                  style={styles.approveButton}
                >
                  <span style={styles.buttonIcon}>✅</span>
                  Approve Document
                </button>
              )}
              {/* Add this button between Approve and Download */}
<button
  onClick={() => navigate(`/documents/edit/${id}`)}
  style={styles.editButton}
>
  <span style={styles.buttonIcon}>✏️</span>
  Edit
</button>

              <button
                onClick={downloadPDF}
                disabled={isDownloading}
                style={styles.downloadButton}
              >
                {isDownloading ? (
                  <>
                    <span style={styles.spinner}>⏳</span>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <span style={styles.buttonIcon}>📥</span>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Approve Confirmation Modal ──────────────────────────────────────── */}
      {showApproveModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            {/* Icon */}
            <div style={styles.modalIconWrap}>
              <span style={styles.modalIcon}>✅</span>
            </div>

            {/* Text */}
            <h2 style={styles.modalTitle}>Approve Document?</h2>
            <p style={styles.modalDescription}>
              You are about to approve the <strong>{data.documentType}</strong> request for{' '}
              <strong>{data.fullName}</strong>. This action cannot be undone.
            </p>

            {/* Buttons */}
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowApproveModal(false)}
                style={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={approveDocument}
                disabled={isApproving}
                style={styles.modalConfirmBtn}
              >
                {isApproving ? 'Approving...' : 'Yes, Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
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
    width: 'calc(100% - 260px)',
    minHeight: '100vh',
  },
  header: {
    padding: '20px 30px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  contentWrapper: {
    padding: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  backBtn: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
    transition: 'all 0.2s ease',
  },
  pageTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  pageIcon: {
    fontSize: '32px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
  },
  subtitle: {
    margin: 0,
    fontSize: '16px',
    color: '#64748b',
    fontWeight: '400',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  statusIcon: {
    fontSize: '16px',
  },
  statusText: {
    fontSize: '14px',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
    border: '1px solid #e2e8f0',
    marginBottom: '30px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: '16px',
    color: '#1a202c',
    fontWeight: '600',
  },
  documentContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
    border: '1px solid #e2e8f0',
    marginBottom: '30px',
    overflow: 'hidden',
  },
  documentHeader: {
    padding: '20px 25px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  documentTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
  },
  previewBadge: {
    padding: '4px 12px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    fontSize: '12px',
    fontWeight: '500',
    borderRadius: '12px',
  },
  documentWrapper: {
    padding: '30px',
    backgroundColor: '#ffffff',
  },
  documentContent: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  actionsContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '30px',
  },
  actionButtons: {
    display: 'flex',
    gap: '15px',
  },
  approveButton: {
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
  },
  downloadButton: {
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  },
  buttonIcon: {
    fontSize: '18px',
  },
  spinner: {
    fontSize: '16px',
    animation: 'spin 1s linear infinite',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
  },
  loadingText: {
    fontSize: '18px',
    color: '#64748b',
    marginTop: '10px',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: '10px',
  },
  errorText: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '30px',
  },
  backButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#667eea',
    backgroundColor: 'white',
    border: '2px solid #667eea',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // ─── Modal ───────────────────────────────────────────────────────────────────
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '40px 36px 32px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.18)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  modalIconWrap: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#dcfce7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  modalIcon: {
    fontSize: '28px',
  },
  modalTitle: {
    margin: '0 0 10px 0',
    fontSize: '22px',
    fontWeight: '700',
    color: '#1a202c',
  },
  modalDescription: {
    margin: '0 0 28px 0',
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
    maxWidth: '340px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    padding: '11px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  modalConfirmBtn: {
    flex: 1,
    padding: '11px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
  },

  editButton: {
  padding: '14px 28px',
  fontSize: '16px',
  fontWeight: '600',
  color: 'white',
  backgroundColor: '#f59e0b',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
},

};

export default ViewDocument;
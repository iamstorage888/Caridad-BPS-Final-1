import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../Database/firebase';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';

interface Resident {
  id: string;
  residentNumber?: string;
  lastName: string;
  firstName: string;
  middleName: string;
  // Full address string (legacy / fallback)
  address: string;
  // Structured address fields (new format)
  addressRegion?: string;
  addressProvince?: string;
  addressCity?: string;
  addressBarangay?: string;
  addressStreet?: string;
  addressZipCode?: string;
  birthday?: any;
  createdAt?: any;
  education?: string;
  householdNumber?: string;
  isFamilyHead?: boolean;
  movedInDate?: any;
  occupation?: string;
  religion?: string;
  sex?: string;
  status?: string;
  [key: string]: any;
}

const ResidentView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voterIdUrl, setVoterIdUrl] = useState<string | null>(null);
  const [nationalIdUrl, setNationalIdUrl] = useState<string | null>(null);

  // ── ID helpers ──────────────────────────────────────────────────────────────
  const hasNationalId = (data: any): boolean => {
    if (data.nationalIdFrontUrl || data.nationalIdBackUrl) return true;
    if (data.nationalIdUrl?.startsWith('http')) return true;
    for (const field of ['nationalID', 'national_id', 'nationalId']) {
      if (data[field]?.startsWith('http')) return true;
    }
    return false;
  };

  const hasVotersId = (data: any): boolean => {
    if (data.votersIdFrontUrl || data.votersIdBackUrl) return true;
    if (data.votersIdUrl?.startsWith('http')) return true;
    for (const field of ['voterID', 'voter_id', 'voterId', 'votersId']) {
      if (data[field]?.startsWith('http')) return true;
    }
    return false;
  };

  const findVoterIdUrl = (data: any): string | null => {
    if (data.votersIdFrontUrl?.startsWith('http')) return data.votersIdFrontUrl;
    if (data.votersIdUrl?.startsWith('http')) return data.votersIdUrl;
    for (const field of ['voterID', 'voter_id', 'voterId', 'votersId']) {
      if (data[field]?.startsWith('http')) return data[field];
    }
    return null;
  };

  const findNationalIdUrl = (data: any): string | null => {
    if (data.nationalIdFrontUrl?.startsWith('http')) return data.nationalIdFrontUrl;
    if (data.nationalIdUrl?.startsWith('http')) return data.nationalIdUrl;
    for (const field of ['nationalID', 'national_id', 'nationalId']) {
      if (data[field]?.startsWith('http')) return data[field];
    }
    return null;
  };

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchResident = async () => {
    if (!id) { setError('No resident ID provided'); setLoading(false); return; }
    try {
      setLoading(true);
      const docSnap = await getDoc(doc(db, 'residents', id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setResident({ id: docSnap.id, ...data } as Resident);
        setVoterIdUrl(findVoterIdUrl(data));
        setNationalIdUrl(findNationalIdUrl(data));
      } else {
        setError('Resident not found');
      }
    } catch (err) {
      console.error('Error fetching resident:', err);
      setError('Failed to fetch resident details');
    } finally {
      setLoading(false);
    }
  };

  // ── Date / age helpers ──────────────────────────────────────────────────────
  const formatDate = (date: any) => {
    if (!date) return 'Not specified';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return 'Invalid date'; }
  };

  const calculateAge = (birthday: any) => {
    if (!birthday) return 'Not specified';
    try {
      const birth = birthday.toDate ? birthday.toDate() : new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    } catch { return 'Invalid date'; }
  };

  useEffect(() => { fetchResident(); }, [id]);

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading resident details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !resident) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.errorContainer}>
            <span style={styles.errorIcon}>{error ? '⚠️' : '👤'}</span>
            <h2 style={styles.errorTitle}>{error ? 'Error' : 'Resident Not Found'}</h2>
            <p style={styles.errorText}>{error || "The resident you're looking for doesn't exist."}</p>
            <button style={styles.backButton} onClick={() => navigate(-1)}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  const hasAnyId = voterIdUrl || nationalIdUrl;
  const hasStructuredAddress = !!(resident.addressRegion || resident.addressCity || resident.addressBarangay);

  // ── Address block ───────────────────────────────────────────────────────────
  const renderAddress = () => {
    if (!hasStructuredAddress) {
      // Older records that only have the plain string
      return (
        <div style={styles.addressBlock}>
          <span style={{ fontSize: '13px', color: '#1a202c' }}>{resident.address || 'Not specified'}</span>
        </div>
      );
    }

    const parts: { label: string; value?: string }[] = [
      { label: 'Street / House No.', value: resident.addressStreet },
      { label: 'Barangay',           value: resident.addressBarangay },
      { label: 'City / Municipality',value: resident.addressCity },
      { label: 'Province',           value: resident.addressProvince },
      { label: 'Region',             value: resident.addressRegion },
      { label: 'ZIP Code',           value: resident.addressZipCode },
    ].filter(p => !!p.value);

    return (
      <div style={styles.addressBlock}>
        {parts.map(({ label, value }) => (
          <div key={label} style={styles.addressRow}>
            <span style={styles.addressPartLabel}>{label}</span>
            <span style={styles.addressPartValue}>{value}</span>
          </div>
        ))}
      </div>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.backButton} onClick={() => navigate(-1)}>← Back to Residents</button>
            <div style={styles.titleSection}>
              <h1 style={styles.title}>Resident Details</h1>
              <p style={styles.subtitle}>View resident information</p>
            </div>
          </div>
          <div style={styles.headerRight}>
            <button style={styles.editButton} onClick={() => navigate(`/edit-resident/${id}`)}>
              ✏️ Edit Resident
            </button>
            <LogoutButton />
          </div>
        </div>

        <div style={styles.contentContainer}>

          {/* Profile card */}
          <div style={styles.mainInfoCard}>
            <div style={styles.profileSection}>
              <div style={styles.avatar}>👤</div>
              <div style={styles.profileInfo}>
                <h2 style={styles.fullName}>
                  {`${resident.firstName}${resident.middleName ? ' ' + resident.middleName : ''} ${resident.lastName}`}
                </h2>
                <div style={styles.statusContainer}>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: resident.status === 'Active' ? '#dcfce7' : '#fee2e2',
                    color: resident.status === 'Active' ? '#166534' : '#991b1b',
                  }}>
                    {resident.status || 'Not specified'}
                  </span>
                  {resident.isFamilyHead && (
                    <span style={{ ...styles.statusBadge, backgroundColor: '#ddd6fe', color: '#5b21b6' }}>
                      Family Head
                    </span>
                  )}
                  {hasAnyId && (
                    <span style={{ ...styles.statusBadge, backgroundColor: '#dbeafe', color: '#1e40af' }}>
                      🗳️ Registered Voter
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ID documents */}
          {hasAnyId && (
            <div style={styles.idImagesCard}>
              <h3 style={styles.cardTitle}>📋 Identification Documents</h3>
              <div style={styles.idImagesGrid}>
                {[
                  { url: resident.nationalIdFrontUrl, label: '🆔 National ID (Front)', alt: 'National ID Front' },
                  { url: resident.nationalIdBackUrl,  label: '🆔 National ID (Back)',  alt: 'National ID Back'  },
                  { url: resident.votersIdFrontUrl,   label: "🗳️ Voter's ID (Front)", alt: "Voter's ID Front"  },
                  { url: resident.votersIdBackUrl,    label: "🗳️ Voter's ID (Back)",  alt: "Voter's ID Back"   },
                  // Legacy single-photo support
                  ...(!resident.nationalIdFrontUrl && !resident.nationalIdBackUrl && resident.nationalIdUrl
                    ? [{ url: resident.nationalIdUrl, label: '🆔 National ID', alt: 'National ID' }] : []),
                  ...(!resident.votersIdFrontUrl && !resident.votersIdBackUrl && resident.votersIdUrl
                    ? [{ url: resident.votersIdUrl, label: "🗳️ Voter's ID", alt: "Voter's ID" }] : []),
                ]
                  .filter(item => !!item.url)
                  .map((item, idx) => (
                    <div key={idx} style={styles.idImageContainer}>
                      <div style={styles.idImageHeader}>
                        <span style={styles.idImageTitle}>{item.label}</span>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={styles.viewFullButton}>
                          🔍 View Full Size
                        </a>
                      </div>
                      <div style={styles.idImageWrapper}>
                        <img
                          src={item.url}
                          alt={item.alt}
                          style={styles.idImage}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) parent.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">Failed to load image</div>';
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Details grid */}
          <div style={styles.detailsGrid}>

            {/* Personal Information */}
            <div style={styles.detailCard}>
              <h3 style={styles.cardTitle}>Personal Information</h3>
              <div style={styles.detailsList}>
                {[
                  { label: 'First Name',  value: resident.firstName },
                  { label: 'Middle Name', value: resident.middleName || 'Not specified' },
                  { label: 'Last Name',   value: resident.lastName },
                  { label: 'Gender',      value: resident.sex || 'Not specified' },
                  { label: 'Birth Date',  value: formatDate(resident.birthday) },
                  { label: 'Age',         value: String(calculateAge(resident.birthday)) },
                  { label: 'Education',   value: resident.education || 'Not specified' },
                  { label: 'Occupation',  value: resident.occupation || 'Not specified' },
                  { label: 'Religion',    value: resident.religion || 'Not specified' },
                ].map(({ label, value }) => (
                  <div key={label} style={styles.detailItem}>
                    <span style={styles.detailLabel}>{label}:</span>
                    <span style={styles.detailValue}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact & Household */}
            <div style={styles.detailCard}>
              <h3 style={styles.cardTitle}>Contact & Household Information</h3>
              <div style={styles.detailsList}>

                {/* Address — rendered as a structured sub-block */}
                <div style={styles.addressSection}>
                  <span style={styles.detailLabel}>Address:</span>
                  {renderAddress()}
                </div>

                {[
                  { label: 'Contact Number',   value: resident.contactNumber || 'Not specified' },
                  { label: 'Household Number', value: resident.householdNumber || 'Not specified' },
                  { label: 'Family Head',      value: resident.isFamilyHead ? 'Yes' : 'No' },
                  { label: 'Moved In Date',    value: formatDate(resident.movedInDate) },
                ].map(({ label, value }) => (
                  <div key={label} style={styles.detailItem}>
                    <span style={styles.detailLabel}>{label}:</span>
                    <span style={styles.detailValue}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* System Information */}
            <div style={styles.detailCard}>
              <h3 style={styles.cardTitle}>System Information</h3>
              <div style={styles.detailsList}>
                {[
                  { label: 'Resident ID', value: resident.residentNumber || resident.id },
                  { label: 'Date Added',  value: formatDate(resident.createdAt) },
                  { label: 'Status',      value: resident.status || 'Not specified' },
                ].map(({ label, value }) => (
                  <div key={label} style={styles.detailItem}>
                    <span style={styles.detailLabel}>{label}:</span>
                    <span style={styles.detailValue}>{value}</span>
                  </div>
                ))}
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Voter Registration:</span>
                  <span style={styles.detailValue}>
                    {hasAnyId
                      ? <span style={{ color: '#10b981', fontWeight: '600' }}>✓ Verified</span>
                      : <span style={{ color: '#64748b' }}>No ID on file</span>}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const styles: { [key: string]: React.CSSProperties } = {
  container: { display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' },
  mainContent: { marginLeft: '260px', padding: '30px', width: 'calc(100% - 260px)', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' },
  headerLeft: { display: 'flex', alignItems: 'flex-start', gap: '20px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  titleSection: { display: 'flex', flexDirection: 'column' },
  title: { fontSize: '32px', fontWeight: '700', color: '#1a202c', margin: '0 0 5px 0' },
  subtitle: { fontSize: '16px', color: '#64748b', margin: '0' },
  backButton: {
    backgroundColor: '#6b7280', color: 'white', border: 'none',
    padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
    fontSize: '14px', fontWeight: '500', alignSelf: 'flex-start',
  },
  editButton: {
    backgroundColor: '#f59e0b', color: 'white', border: 'none',
    padding: '12px 20px', borderRadius: '8px', cursor: 'pointer',
    fontSize: '14px', fontWeight: '500', marginRight: '150px',
    boxShadow: '0 2px 4px rgba(245,158,11,0.2)',
  },
  contentContainer: { display: 'flex', flexDirection: 'column', gap: '24px' },

  // Profile card
  mainInfoCard: { backgroundColor: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  profileSection: { display: 'flex', alignItems: 'center', gap: '20px' },
  avatar: {
    fontSize: '48px', backgroundColor: '#e2e8f0', padding: '20px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '88px', minHeight: '88px',
  },
  profileInfo: { display: 'flex', flexDirection: 'column', gap: '12px' },
  fullName: { fontSize: '28px', fontWeight: '600', color: '#1a202c', margin: '0' },
  statusContainer: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
  statusBadge: { padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '500' },

  // ID images
  idImagesCard: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  idImagesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginTop: '16px' },
  idImageContainer: { display: 'flex', flexDirection: 'column', gap: '12px' },
  idImageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' },
  idImageTitle: { fontSize: '16px', fontWeight: '600', color: '#1a202c' },
  viewFullButton: { fontSize: '13px', color: '#667eea', textDecoration: 'none', fontWeight: '500' },
  idImageWrapper: {
    width: '100%', minHeight: '200px', backgroundColor: '#f8fafc', borderRadius: '8px',
    overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  idImage: { width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain', display: 'block' },

  // Details grid
  detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' },
  detailCard: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  cardTitle: { fontSize: '18px', fontWeight: '600', color: '#1a202c', margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0' },
  detailsList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  detailItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' },
  detailLabel: { fontSize: '14px', color: '#64748b', fontWeight: '500', minWidth: '130px', flexShrink: 0 },
  detailValue: { fontSize: '14px', color: '#1a202c', fontWeight: '400', textAlign: 'right', wordBreak: 'break-word' },

  // Address sub-block
  addressSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f1f5f9',
  },
  addressBlock: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  addressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  addressPartLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '500',
    minWidth: '140px',
    flexShrink: 0,
  },
  addressPartValue: {
    fontSize: '13px',
    color: '#1a202c',
    fontWeight: '500',
    textAlign: 'right',
    wordBreak: 'break-word',
  },

  // Loading / error
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' },
  spinner: { width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  loadingText: { marginTop: '16px', color: '#64748b', fontSize: '14px' },
  errorContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' },
  errorIcon: { fontSize: '48px', opacity: 0.5 },
  errorTitle: { fontSize: '24px', fontWeight: '600', color: '#1a202c', margin: '0' },
  errorText: { fontSize: '16px', color: '#64748b', margin: '0', textAlign: 'center' },
};

export default ResidentView;
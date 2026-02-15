import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../Database/firebase';
import { getAuth } from 'firebase/auth';

// Extended interface that now carries the loginAt timestamp
interface User {
  uid: string;
  email: string;
  role?: string;
  loginAt?: string; // present = online, absent = offline
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getAuth().currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const data = snapshot.docs.map(doc => doc.data() as User);
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleAddUser = () => navigate('/add-user');

  // ── Online status helpers ────────────────────────────────────────────────
  // A user is "online" if their Firestore doc has a loginAt field.
  // LoginPage writes it on login; LogoutButton deletes it on logout.
  const isOnline = (user: User): boolean => !!user.loginAt;

  const formatLoginTime = (loginAt?: string): string => {
    if (!loginAt) return '';
    try {
      return new Date(loginAt).toLocaleString('en-PH', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return ''; }
  };
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div style={styles.container}>
          <LogoutButton />
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  const onlineCount = users.filter(isOnline).length;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <LogoutButton />
        </div>

        <div style={styles.content}>
          <div style={styles.titleSection}>
            <div style={styles.titleContainer}>
              <h1 style={styles.title}>Users</h1>
              <div style={styles.userCount}>
                {users.length} {users.length === 1 ? 'user' : 'users'}
              </div>
              {/* Live online badge */}
              {onlineCount > 0 && (
                <div style={styles.onlineBadge}>
                  <span style={styles.onlinePulseDot}></span>
                  {onlineCount} online
                </div>
              )}
            </div>
            <button style={styles.addButton} onClick={handleAddUser}>
              <span style={styles.addButtonIcon}>+</span>
              Add User
            </button>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.headerRow}>
                  <th style={styles.headerCell}>Email</th>
                  <th style={styles.headerCell}>Role</th>
                  <th style={styles.headerCell}>Status</th>
                  <th style={styles.headerCell}>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const online = isOnline(user);
                  const isYou = currentUser?.uid === user.uid;

                  return (
                    <tr
                      key={user.uid}
                      style={{
                        ...styles.row,
                        backgroundColor: index % 2 === 0 ? '#fafafa' : '#ffffff'
                      }}
                    >
                      {/* Email + avatar */}
                      <td style={styles.cell}>
                        <div style={styles.emailContainer}>
                          <div style={{
                            ...styles.avatar,
                            background: online
                              ? 'linear-gradient(135deg, #667eea, #764ba2)'
                              : '#adb5bd',
                          }}>
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <span style={styles.email}>{user.email}</span>
                          {isYou && <span style={styles.youLabel}>You</span>}
                        </div>
                      </td>

                      {/* Role */}
                      <td style={styles.cell}>
                        <span style={{
                          ...styles.roleBadge,
                          backgroundColor: user.role === 'secretary' ? '#e9d8fd' : '#bee3f8',
                          color: user.role === 'secretary' ? '#553c9a' : '#2a69ac',
                        }}>
                          {user.role === 'secretary' ? '👑 Secretary' : '📝 BSPO'}
                        </span>
                      </td>

                      {/* Status dot */}
                      <td style={styles.cell}>
                        <div style={styles.statusContainer}>
                          <span
                            style={online ? styles.activeDot : styles.inactiveDot}
                            title={online ? 'Online' : 'Offline'}
                          ></span>
                          <span style={{
                            ...styles.statusText,
                            color: online ? '#28a745' : '#6c757d',
                            fontWeight: online ? '600' : '500',
                          }}>
                            {online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </td>

                      {/* Last login time */}
                      <td style={styles.cell}>
                        <span style={styles.loginTime}>
                          {user.loginAt ? formatLoginTime(user.loginAt) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { marginLeft: '220px', padding: '20px', width: '100%', backgroundColor: '#f8f9fa', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' },
  content: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', border: '1px solid #e9ecef' },
  titleSection: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #f1f3f4' },
  titleContainer: { display: 'flex', alignItems: 'center', gap: '16px' },
  title: { margin: 0, fontSize: '28px', fontWeight: '600', color: '#2c3e50', letterSpacing: '-0.5px' },
  userCount: { backgroundColor: '#e3f2fd', color: '#1976d2', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '500' },
  onlineBadge: {
    display: 'flex', alignItems: 'center', gap: '6px',
    backgroundColor: '#d4edda', color: '#155724',
    padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
  },
  onlinePulseDot: {
    display: 'inline-block', width: '8px', height: '8px',
    borderRadius: '50%', backgroundColor: '#28a745',
    boxShadow: '0 0 0 0 rgba(40,167,69,0.4)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  addButton: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)', marginRight: '150px' },
  addButtonIcon: { fontSize: '16px', fontWeight: '700' },
  tableContainer: { borderRadius: '8px', overflow: 'hidden', border: '1px solid #e9ecef' },
  table: { width: '100%', borderCollapse: 'collapse' },
  headerRow: { backgroundColor: '#f8f9fa' },
  headerCell: { padding: '16px 20px', textAlign: 'left' as const, fontWeight: '600', color: '#495057', fontSize: '14px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', borderBottom: '2px solid #dee2e6' },
  row: { transition: 'background-color 0.2s ease', cursor: 'default' },
  cell: { padding: '16px 20px', borderBottom: '1px solid #f1f3f4' },
  emailContainer: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600' },
  email: { fontSize: '15px', color: '#495057', fontWeight: '500' },
  youLabel: { backgroundColor: '#28a745', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' as const },
  roleBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  statusContainer: { display: 'flex', alignItems: 'center', gap: '8px' },
  activeDot: {
    display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
    backgroundColor: '#28a745', boxShadow: '0 0 0 3px rgba(40, 167, 69, 0.2)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  inactiveDot: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ced4da' },
  statusText: { fontSize: '14px' },
  loginTime: { fontSize: '13px', color: '#6c757d' },
  loadingContainer: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '200px', gap: '16px' },
  spinner: { width: '32px', height: '32px', border: '3px solid #f3f3f3', borderTop: '3px solid #007bff', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  loadingText: { color: '#6c757d', fontSize: '16px', margin: 0 },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.5); }
    70%  { box-shadow: 0 0 0 6px rgba(40, 167, 69, 0); }
    100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
  }
  button:hover { background-color: #0056b3 !important; box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3) !important; transform: translateY(-1px); }
`;
document.head.appendChild(styleSheet);

export default Users;
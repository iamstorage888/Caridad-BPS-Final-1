import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './Database/firebase';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';

import Residents from './pages/Residents';
import Households from './pages/Households';
import Users from './pages/Users';
import Documents from './pages/Documents';
import Blotter from './pages/BlotterReports';
import AddResiidents from './pages/AddResident';
import ViewResident from './pages/ViewResident';
import AddHousehold from './pages/AddHousehold';
import ViewHouseholdMembers from './pages/ViewHouseholdMembers';
import EditResident from './pages/EditResident';
import EditHousehold from './pages/EditHousehold';
import RequestDocument from './pages/RequestDocument';
import ViewDocumentRequest from './pages/ViewDocumentRequest';
import AddBlotter from './pages/AddBlotter';
import EditDocumentRequest from './pages/EditDocumentRequest';
import AddUser from './pages/RegisterPage';
import Archive from './pages/Archives';

// Auth Context
interface AuthContextType {
  user: any;
  logout: () => Promise<void>;
  isLoading: boolean;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  logout: async () => {},
  isLoading: true,
  isInitialized: false,
});

export const useAuth = () => useContext(AuthContext);

// Auth Provider Component
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      
      if (firebaseUser) {
        try {
          // First check if we already have valid user data in localStorage
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              // Validate stored user data
              if (userData.uid === firebaseUser.uid && userData.role && userData.email === firebaseUser.email) {
                if (isMounted) {
                  setUser(userData);
                  setIsLoading(false);
                  setIsInitialized(true);
                }
                return;
              }
            } catch (error) {
              console.error('Invalid stored user data:', error);
              localStorage.removeItem('user');
            }
          }

          // Fetch fresh user data from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (!isMounted) return;
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            
            // Validate role
            if (userData.role && ['secretary', 'clerk'].includes(userData.role)) {
              const userInfo = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: userData.role,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                displayName: userData.displayName || `${userData.firstName} ${userData.lastName}` || firebaseUser.email,
                loginTime: new Date().toISOString()
              };
              
              localStorage.setItem('user', JSON.stringify(userInfo));
              setUser(userInfo);
            } else {
              console.error('Invalid user role:', userData.role);
              setUser(null);
              localStorage.removeItem('user');
            }
          } else {
            console.error('User document not found');
            setUser(null);
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          if (isMounted) {
            setUser(null);
            localStorage.removeItem('user');
          }
        }
      } else {
        // User is signed out
        if (isMounted) {
          setUser(null);
          localStorage.removeItem('user');
        }
      }
      
      if (isMounted) {
        setIsLoading(false);
        setIsInitialized(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always cleanup local state
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, logout, isLoading, isInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles = [] }) => {
  const { user, isLoading, isInitialized } = useAuth();
  
  // Show loading while checking auth state
  if (!isInitialized || isLoading) {
    return <LoadingPage />;
  }
  
  // Check if user is logged in
  if (!user || !user.role) {
    return <Navigate to="/" replace />;
  }
  
  // Check if user has required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
};

// Unauthorized Access Component
const UnauthorizedPage = () => {
  const { user, logout } = useAuth();
  
  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    window.location.href = '/home';
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '24px'
        }}>
          🚫
        </div>
        <h2 style={{
          margin: '0 0 16px 0',
          color: '#1e293b',
          fontSize: '24px'
        }}>
          Access Denied
        </h2>
        <p style={{
          margin: '0 0 24px 0',
          color: '#64748b',
          fontSize: '16px',
          lineHeight: '1.5'
        }}>
          You don't have permission to access this page. Your current role: <strong>{user?.role || 'Unknown'}</strong>
        </p>
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleGoBack}
            style={{
              padding: '12px 24px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#475569',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← Go Back
          </button>
          <button
            onClick={handleGoHome}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🏠 Go to Home
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '12px 24px',
              background: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
};

// Loading Component
const LoadingPage = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: 'system-ui'
  }}>
    <div style={{
      background: 'white',
      padding: '32px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      textAlign: 'center'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #667eea',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px'
      }}></div>
      <p style={{ margin: 0, color: '#64748b' }}>Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

// Separate component for routes to use auth context
const AppRoutes = () => {
  const { user, isLoading, isInitialized } = useAuth();

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return <LoadingPage />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/" 
        element={
          user ? <Navigate to="/home" replace /> : <LoginPage />
        } 
      />
      <Route 
        path="/register" 
        element={
          user ? <Navigate to="/home" replace /> : <RegisterPage />
        } 
      />
      
      {/* Home - Accessible to all authenticated users */}
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } 
      />
      
      {/* Household & Residency Routes - Accessible to both secretary and clerk users */}
      <Route 
        path="/residents" 
        element={
          <ProtectedRoute allowedRoles={['secretary', 'clerk']}>
            <Residents />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/households" 
        element={
          <ProtectedRoute allowedRoles={['secretary', 'clerk']}>
            <Households />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/add-resident" 
        element={
          <ProtectedRoute allowedRoles={['secretary', 'clerk']}>
            <AddResiidents />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/resident/:id" 
        element={
          <ProtectedRoute allowedRoles={['secretary', 'clerk']}>
            <ViewResident />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/add-household" 
        element={
          <ProtectedRoute allowedRoles={['secretary', 'clerk']}>
            <AddHousehold />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/household/:householdNumber" 
        element={
          <ProtectedRoute allowedRoles={['secretary', 'clerk']}>
            <ViewHouseholdMembers />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/edit-resident/:id" 
        element={
          <ProtectedRoute allowedRoles={['secretary', 'clerk']}>
            <EditResident />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/edit-household/:id" 
        element={
          <ProtectedRoute allowedRoles={['secretary', 'clerk']}>
            <EditHousehold />
          </ProtectedRoute>
        } 
      />
      
      {/* Secretary Only Routes (Full Access) */}
      <Route 
        path="/users" 
        element={
          <ProtectedRoute allowedRoles={['secretary']}>
            <Users />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/add-user" 
        element={
          <ProtectedRoute allowedRoles={['secretary']}>
            <AddUser />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/documents" 
        element={
          <ProtectedRoute allowedRoles={['secretary']}>
            <Documents />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/blotter" 
        element={
          <ProtectedRoute allowedRoles={['secretary']}>
            <Blotter />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/documents/request" 
        element={
          <ProtectedRoute allowedRoles={['secretary']}>
            <RequestDocument />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/documents/view/:id" 
        element={
          <ProtectedRoute allowedRoles={['secretary']}>
            <ViewDocumentRequest />
          </ProtectedRoute>
        } 
      />

            <Route 
        path="/archives" 
        element={
          <ProtectedRoute allowedRoles={['secretary']}>
            <Archive />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/add-blotter" 
        element={
          <ProtectedRoute allowedRoles={['secretary']}>
            <AddBlotter />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/documents/edit/:id" 
        element={
          <ProtectedRoute allowedRoles={['secretary']}>
            <EditDocumentRequest />
          </ProtectedRoute>
        } 
      />
      
      {/* Unauthorized Route */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      
      {/* Catch all route - redirect based on auth state */}
      <Route 
        path="*" 
        element={
          <Navigate 
            to={user ? '/home' : '/'} 
            replace 
          />
        } 
      />
    </Routes>
  );
};

// Add CSS for loading spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default App;
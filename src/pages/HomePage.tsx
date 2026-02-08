import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../Database/firebase';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

import { useNavigate } from "react-router-dom";


const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#ff6b6b', '#feca57'];

const HomePage: React.FC = () => {
  const [totalResidents, setTotalResidents] = useState(0);
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [seniorCitizenCount, setSeniorCitizenCount] = useState(0);
  const [registeredVotersCount, setRegisteredVotersCount] = useState(0);
  const [householdCount, setHouseholdCount] = useState(0);
  const [blotterCount, setBlotterCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0); // NEW: Added document count state
  const [occupationData, setOccupationData] = useState<any[]>([]);
  const [purokData, setPurokData] = useState<any[]>([]);
  const [blotterStatusData, setBlotterStatusData] = useState<any[]>([]);

  // Status options that match your BlotterReports component
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

  // Function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) {
      console.log('No date of birth provided');
      return 0;
    }

    const today = new Date();
    let birthDate: Date;

    // Handle different date formats
    if (dateOfBirth.includes('/')) {
      // Handle MM/DD/YYYY or DD/MM/YYYY format
      const parts = dateOfBirth.split('/');
      if (parts.length === 3) {
        // Assuming MM/DD/YYYY format, adjust if your format is different
        birthDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      } else {
        console.log('Invalid date format:', dateOfBirth);
        return 0;
      }
    } else if (dateOfBirth.includes('-')) {
      // Handle YYYY-MM-DD format
      birthDate = new Date(dateOfBirth);
    } else {
      // Try to parse as is
      birthDate = new Date(dateOfBirth);
    }

    // Check if date is valid
    if (isNaN(birthDate.getTime())) {
      console.log('Invalid date:', dateOfBirth);
      return 0;
    }

    // Check if birth date is in the future
    if (birthDate > today) {
      console.log('Birth date is in the future:', dateOfBirth);
      return 0;
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  // Function to check if resident has voter/national ID - UPDATED FOR NEW FORMAT
  const hasVoterOrNationalID = (data: any): boolean => {
    // NEW FORMAT: Check for front/back ID URLs (priority)
    if (data.nationalIdFrontUrl || data.nationalIdBackUrl) {
      console.log(`✅ Found National ID (new format - front/back)`);
      return true;
    }
    
    if (data.votersIdFrontUrl || data.votersIdBackUrl) {
      console.log(`✅ Found Voter's ID (new format - front/back)`);
      return true;
    }

    // OLD FORMAT: Check for single ID URL
    if (data.nationalIdUrl && typeof data.nationalIdUrl === 'string' && data.nationalIdUrl.startsWith('http')) {
      console.log(`✅ Found National ID (old format - single URL)`);
      return true;
    }
    
    if (data.votersIdUrl && typeof data.votersIdUrl === 'string' && data.votersIdUrl.startsWith('http')) {
      console.log(`✅ Found Voter's ID (old format - single URL)`);
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
          console.log(`✅ Found voter ID in legacy field: ${field}`);
          return true;
        }
      }
    }

    // Check for any national ID fields
    for (const field of nationalIdFields) {
      if (data[field] && data[field] !== '' && data[field] !== null) {
        // Only count if it's a URL (not just a filename)
        if (typeof data[field] === 'string' && data[field].startsWith('http')) {
          console.log(`✅ Found national ID in legacy field: ${field}`);
          return true;
        }
      }
    }

    // Check isRegisteredVoter flag as fallback
    if (data.isRegisteredVoter === true) {
      console.log(`✅ Found via isRegisteredVoter flag`);
      return true;
    }

    return false;
  };

  useEffect(() => {
    // Enhanced fetchResidents function with voter ID check
    const fetchResidents = async () => {
      const residentSnapshot = await getDocs(collection(db, 'residents'));
      const householdSnapshot = await getDocs(collection(db, 'households'));

      let total = 0;
      let males = 0;
      let females = 0;
      let seniors = 0;
      let voters = 0;

      const occupationMap: { [key: string]: number } = {};
      const purokMap: { [key: string]: number } = {};

      // Map householdNumber -> purok
      const householdPurokMap: { [key: string]: string } = {};
      householdSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.householdNumber && data.purok) {
          householdPurokMap[data.householdNumber] = data.purok;
        }
      });

      // Debug: Log some sample data
      console.log('=== DEBUGGING RESIDENT CALCULATIONS (NEW ID FORMAT) ===');
      console.log('Total residents found:', residentSnapshot.size);
      
      // Track all possible ID field names
      const idFields = new Set();
      let votersWithIdCount = 0;
      let votersWithoutIdCount = 0;
      
      let index = 0;
      residentSnapshot.forEach((doc) => {
        total++;
        const data = doc.data();

        // Check all possible ID field names in the first few documents
        if (index < 10) {
          Object.keys(data).forEach(key => {
            if (key.toLowerCase().includes('id') || key.toLowerCase().includes('voter') || key.toLowerCase().includes('national')) {
              idFields.add(key);
            }
          });
        }

        // Debug: Log first few residents' data with ID fields
        if (index < 3) {
          console.log(`=== Resident ${index + 1} (${doc.id}) ===`);
          console.log('All fields:', Object.keys(data));
          console.log('ID-related fields:', Object.keys(data).filter(key => 
            key.toLowerCase().includes('id') || key.toLowerCase().includes('voter') || key.toLowerCase().includes('national')
          ).map(key => ({ [key]: data[key] })));
          console.log('Sex:', data.sex);
          console.log('isRegisteredVoter flag:', data.isRegisteredVoter);
        }

        if (data.sex === 'Male') males++;
        if (data.sex === 'Female') females++;

        // Check for voter/national ID submission (UPDATED FUNCTION)
        const hasValidId = hasVoterOrNationalID(data);
        if (hasValidId) {
          voters++;
          votersWithIdCount++;
          if (index < 10) {
            console.log(`🗳️ REGISTERED VOTER: ${data.firstName} ${data.lastName}`);
          }
        } else {
          votersWithoutIdCount++;
          if (index < 10) {
            console.log(`❌ No ID found for: ${data.firstName} ${data.lastName}`);
          }
        }

        // Calculate age for senior citizens
        const possibleDateFields = ['dateOfBirth', 'birthDate', 'date_of_birth', 'birth_date', 'birthday'];
        let birthDate = null;

        for (const field of possibleDateFields) {
          if (data[field]) {
            birthDate = data[field];
            break;
          }
        }

        if (birthDate) {
          const age = calculateAge(birthDate);
          
          // Count senior citizens (60+)
          if (age >= 60) {
            seniors++;
          }
        }

        const occupation = data.occupation || 'Unknown';
        occupationMap[occupation] = (occupationMap[occupation] || 0) + 1;

        const hhNumber = data.householdNumber;
        const purok = householdPurokMap[hhNumber] || 'Unspecified';
        purokMap[purok] = (purokMap[purok] || 0) + 1;
        
        index++;
      });

      console.log('=== SUMMARY (UPDATED ID DETECTION) ===');
      console.log('ID fields found in database:', Array.from(idFields));
      console.log('✅ Residents with voter/national ID:', votersWithIdCount);
      console.log('❌ Residents without voter/national ID:', votersWithoutIdCount);
      console.log('Final counts:', {
        total,
        males,
        females,
        seniors,
        voters,
        seniorPercentage: total > 0 ? ((seniors / total) * 100).toFixed(1) + '%' : '0%',
        voterPercentage: total > 0 ? ((voters / total) * 100).toFixed(1) + '%' : '0%'
      });

      setTotalResidents(total);
      setMaleCount(males);
      setFemaleCount(females);
      setSeniorCitizenCount(seniors);
      setRegisteredVotersCount(voters);
      setOccupationData(Object.entries(occupationMap).map(([name, value]) => ({ name, value })));
      setPurokData(Object.entries(purokMap).map(([name, value]) => ({ name, value })));
    };

    const fetchHouseholds = async () => {
      const snapshot = await getDocs(collection(db, 'households'));
      setHouseholdCount(snapshot.size);
    };

    const fetchBlotters = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'blotters'));
        setBlotterCount(snapshot.size);

        // Process blotter status data
        const statusMap: { [key: string]: number } = {};

        snapshot.forEach(doc => {
          const data = doc.data();
          const status = data.status || 'filed';
          statusMap[status] = (statusMap[status] || 0) + 1;
        });

        // Convert to chart data with proper labels and colors
        const chartData = Object.entries(statusMap).map(([status, count]) => {
          const statusOption = statusOptions.find(opt => opt.value === status);
          return {
            name: statusOption ? statusOption.label : status,
            value: count,
            status: status,
            color: statusOption ? statusOption.color : '#6c757d'
          };
        });

        setBlotterStatusData(chartData);
      } catch (error) {
        console.error('Error fetching blotter reports:', error);
        setBlotterCount(0);
        setBlotterStatusData([]);
      }
    };

    // NEW: Fetch document requests count
    const fetchDocuments = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'documentRequests'));
        setDocumentCount(snapshot.size);
      } catch (error) {
        console.error('Error fetching documents:', error);
        setDocumentCount(0);
      }
    };

    fetchResidents();
    fetchHouseholds();
    fetchBlotters();
    fetchDocuments(); // NEW: Added document fetch
  }, []);

  

  const statCards = [
    { title: 'Total Residents', value: totalResidents, icon: '👥', color: '#667eea', path: '/residents' },
    { title: 'Male', value: maleCount, icon: '👨', color: '#4facfe', path: '/residents?filter=male' },
    { title: 'Female', value: femaleCount, icon: '👩', color: '#f093fb', path: '/residents?filter=female' },
    { title: 'Senior Citizens', value: seniorCitizenCount, icon: '👴', color: '#f5576c', path: '/residents?filter=senior' },
    { 
      title: 'Registered Voters',
      value: registeredVotersCount,
      icon: '🗳️',
      color: '#764ba2',
      subtitle: 'With Valid ID',
      path: '/residents?filter=voters'
    },
    { title: 'Total Households', value: householdCount, icon: '🏠', color: '#43e97b', path: '/households' },
    { title: 'Blotter Reports', value: blotterCount, icon: '📋', color: '#ff6b6b', path: '/blotter' },
    { title: 'Documents', value: documentCount, icon: '📄', color: '#6bffabff', path: '/documents' }, // FIXED: Using documentCount
  ];

  // Custom tooltip for blotter status pie chart
  const BlotterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#1a202c' }}>
            {data.name}
          </p>
          <p style={{ margin: '0', color: '#64748b' }}>
            Count: <span style={{ fontWeight: '600', color: data.color }}>{data.value}</span>
          </p>
          <p style={{ margin: '0', color: '#64748b' }}>
            Percentage: <span style={{ fontWeight: '600', color: data.color }}>
              {((data.value / blotterCount) * 100).toFixed(1)}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>Welcome to the Barangay System Dashboard</p>
          </div>
          <LogoutButton />
        </div>

        <div style={styles.statsContainer}>
          {statCards.map((card, index) => (
            <div
              key={index}
              style={{
                ...styles.card,
                borderLeft: `4px solid ${card.color}`,
                cursor: "pointer"
              }}
              onClick={() => navigate(card.path)}
            >
              <div style={styles.cardContent}>
                <div style={styles.cardInfo}>
                  <h3 style={styles.cardValue}>{card.value.toLocaleString()}</h3>
                  <p style={styles.cardTitle}>{card.title}</p>
                  {card.subtitle && (
                    <p style={styles.cardSubtitle}>{card.subtitle}</p>
                  )}
                </div>
                <div style={{ ...styles.cardIcon, color: card.color }}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.chartsContainer}>
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>Occupation Distribution</h2>
            <div style={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={occupationData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {occupationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>Residents per Purok</h2>
            <div style={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={purokData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                   <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="url(#barGradient)"
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#764ba2" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New Blotter Status Pie Chart */}
          {blotterStatusData.length > 0 && (
            <div style={styles.chartCard}>
              <h2 style={styles.chartTitle}>
                <span style={{ marginRight: '8px' }}>📊</span>
                Blotter Reports by Status
              </h2>
              <div style={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={blotterStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percent, value }) =>
                        `${name.split(' / ')[0]} (${value}) ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {blotterStatusData.map((entry, index) => (
                        <Cell key={`blotter-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<BlotterTooltip />} />
                    <Legend
                      formatter={(value, entry: any) => (
                        <span style={{ color: entry.color, fontSize: '12px' }}>
                          {value.split(' / ')[0]} ({entry.payload.value})
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.chartSummary}>
                <p style={styles.summaryText}>
                  Total Reports: <strong>{blotterCount}</strong> •
                  Resolved: <strong>
                    {blotterStatusData
                      .filter(item => item.status === 'settled' || item.status === 'closed')
                      .reduce((sum, item) => sum + item.value, 0)
                    }
                  </strong> •
                  Active: <strong>
                    {blotterStatusData
                      .filter(item => item.status !== 'settled' && item.status !== 'closed' && item.status !== 'dismissed')
                      .reduce((sum, item) => sum + item.value, 0)
                    }
                  </strong>
                </p>
              </div>
            </div>
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
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer',
  },
  cardContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
    margin: '0 0 5px 0',
  },
  cardTitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0',
    fontWeight: '500',
  },
  cardSubtitle: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '2px 0 0 0',
    fontWeight: '400',
    fontStyle: 'italic',
  },
  cardIcon: {
    fontSize: '32px',
    opacity: 0.8,
  },
  chartsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '30px',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  chartTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: '20px',
    marginTop: '0',
    display: 'flex',
    alignItems: 'center',
  },
  chartWrapper: {
    width: '100%',
    height: '350px',
  },
  chartSummary: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  summaryText: {
    margin: '0',
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center' as const,
  },
};

export default HomePage;
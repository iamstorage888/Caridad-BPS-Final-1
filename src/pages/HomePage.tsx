import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../Database/firebase';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b'];

const HomePage: React.FC = () => {
  const [totalResidents, setTotalResidents] = useState(0);
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [seniorCitizenCount, setSeniorCitizenCount] = useState(0);
  const [householdCount, setHouseholdCount] = useState(0);
  const [blotterCount, setBlotterCount] = useState(0);
  const [occupationData, setOccupationData] = useState<any[]>([]);
  const [purokData, setPurokData] = useState<any[]>([]);

  // Function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  useEffect(() => {
    const fetchResidents = async () => {
      const residentSnapshot = await getDocs(collection(db, 'residents'));
      const householdSnapshot = await getDocs(collection(db, 'households'));

      let total = 0;
      let males = 0;
      let females = 0;
      let seniors = 0;

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

      residentSnapshot.forEach(doc => {
        total++;
        const data = doc.data();

        if (data.sex === 'Male') males++;
        if (data.sex === 'Female') females++;

        // Calculate age and check if senior citizen (60 years or older)
        if (data.dateOfBirth) {
          const age = calculateAge(data.dateOfBirth);
          if (age >= 60) {
            seniors++;
          }
        }

        const occupation = data.occupation || 'Unknown';
        occupationMap[occupation] = (occupationMap[occupation] || 0) + 1;

        const hhNumber = data.householdNumber;
        const purok = householdPurokMap[hhNumber] || 'Unspecified';
        purokMap[purok] = (purokMap[purok] || 0) + 1;
      });

      setTotalResidents(total);
      setMaleCount(males);
      setFemaleCount(females);
      setSeniorCitizenCount(seniors);
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
      } catch (error) {
        console.error('Error fetching blotter reports:', error);
        setBlotterCount(0);
      }
    };

    fetchResidents();
    fetchHouseholds();
    fetchBlotters();
  }, []);

  const statCards = [
    { title: 'Total Residents', value: totalResidents, icon: '👥', color: '#667eea' },
    { title: 'Male', value: maleCount, icon: '👨', color: '#4facfe' },
    { title: 'Female', value: femaleCount, icon: '👩', color: '#f093fb' },
    { title: 'Senior Citizens', value: seniorCitizenCount, icon: '👴', color: '#f5576c' },
    { title: 'Total Households', value: householdCount, icon: '🏠', color: '#43e97b' },
    { title: 'Blotter Reports', value: blotterCount, icon: '📋', color: '#ff6b6b' },
  ];

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
            <div key={index} style={{ ...styles.card, borderLeft: `4px solid ${card.color}` }}>
              <div style={styles.cardContent}>
                <div style={styles.cardInfo}>
                  <h3 style={styles.cardValue}>{card.value.toLocaleString()}</h3>
                  <p style={styles.cardTitle}>{card.title}</p>
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
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#764ba2" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
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
  },
  chartWrapper: {
    width: '100%',
    height: '350px',
  },
};

export default HomePage;
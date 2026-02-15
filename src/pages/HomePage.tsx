import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../Database/firebase';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { useNavigate } from "react-router-dom";

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#ff6b6b', '#feca57', '#a29bfe', '#fd79a8', '#00b894', '#e17055', '#0984e3'];

const HomePage: React.FC = () => {
  const [totalResidents, setTotalResidents] = useState(0);
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [seniorCitizenCount, setSeniorCitizenCount] = useState(0);
  const [registeredVotersCount, setRegisteredVotersCount] = useState(0);
  const [householdCount, setHouseholdCount] = useState(0);
  const [blotterCount, setBlotterCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [occupationData, setOccupationData] = useState<any[]>([]);
  const [purokData, setPurokData] = useState<any[]>([]);
  const [blotterStatusData, setBlotterStatusData] = useState<any[]>([]);
  const [incidentTypeData, setIncidentTypeData] = useState<any[]>([]); // NEW

  const statusOptions = [
    { value: 'filed',        label: 'Filed / Logged / Recorded',  color: '#8B4513' },
    { value: 'investigating',label: 'Under Investigation',         color: '#FF6347' },
    { value: 'referred',     label: 'Referred / Endorsed',         color: '#4169E1' },
    { value: 'mediation',    label: 'For Mediation',               color: '#32CD32' },
    { value: 'settled',      label: 'Settled / Resolved',          color: '#FF1493' },
    { value: 'ongoing',      label: 'Unresolved / Ongoing',        color: '#00CED1' },
    { value: 'dismissed',    label: 'Dismissed / Dropped',         color: '#FFD700' },
    { value: 'escalated',    label: 'Escalated / Elevated',        color: '#9932CC' },
    { value: 'closed',       label: 'Closed / Completed',          color: '#FF4500' },
    { value: 'Unscheduled',  label: 'Unscheduled/Cases',           color: '#2E8B57' },
    { value: 'Scheduled',    label: 'Scheduled/Cases',             color: '#DC143C' },
  ];

  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    let birthDate: Date;
    if (dateOfBirth.includes('/')) {
      const parts = dateOfBirth.split('/');
      if (parts.length === 3) {
        birthDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      } else return 0;
    } else if (dateOfBirth.includes('-')) {
      birthDate = new Date(dateOfBirth);
    } else {
      birthDate = new Date(dateOfBirth);
    }
    if (isNaN(birthDate.getTime()) || birthDate > today) return 0;
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const hasVoterOrNationalID = (data: any): boolean => {
    if (data.nationalIdFrontUrl || data.nationalIdBackUrl) return true;
    if (data.votersIdFrontUrl  || data.votersIdBackUrl)   return true;
    if (data.nationalIdUrl && typeof data.nationalIdUrl === 'string' && data.nationalIdUrl.startsWith('http')) return true;
    if (data.votersIdUrl   && typeof data.votersIdUrl   === 'string' && data.votersIdUrl.startsWith('http'))   return true;
    const voterIdFields    = ['voterID','voter_id','voterId','votersId','voters_id','voterIdPicture','voter_id_picture','voterIdImage','voter_id_image'];
    const nationalIdFields = ['nationalID','national_id','nationalId','nationalIdPicture','national_id_picture','nationalIdImage','national_id_image','philId','phil_id','philsysId','philsys_id'];
    for (const field of [...voterIdFields, ...nationalIdFields]) {
      if (data[field] && typeof data[field] === 'string' && data[field].startsWith('http')) return true;
    }
    if (data.isRegisteredVoter === true) return true;
    return false;
  };

  useEffect(() => {
    const fetchResidents = async () => {
      const residentSnapshot  = await getDocs(collection(db, 'residents'));
      const householdSnapshot = await getDocs(collection(db, 'households'));

      let total = 0, males = 0, females = 0, seniors = 0, voters = 0;
      const occupationMap: { [key: string]: number } = {};
      const purokMap:      { [key: string]: number } = {};
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
        if (data.sex === 'Male')   males++;
        if (data.sex === 'Female') females++;
        if (hasVoterOrNationalID(data)) voters++;

        const possibleDateFields = ['dateOfBirth','birthDate','date_of_birth','birth_date','birthday'];
        let birthDate = null;
        for (const field of possibleDateFields) { if (data[field]) { birthDate = data[field]; break; } }
        if (birthDate && calculateAge(birthDate) >= 60) seniors++;

        const occupation = data.occupation || 'Unknown';
        occupationMap[occupation] = (occupationMap[occupation] || 0) + 1;

        const purok = householdPurokMap[data.householdNumber] || 'Unspecified';
        purokMap[purok] = (purokMap[purok] || 0) + 1;
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

        const statusMap:       { [key: string]: number } = {};
        const incidentTypeMap: { [key: string]: number } = {};

        snapshot.forEach(doc => {
          const data = doc.data();

          // Status distribution
          const status = data.status || 'filed';
          statusMap[status] = (statusMap[status] || 0) + 1;

          // Incident type distribution (reflects any custom types saved by AddBlotter)
          const itype = data.incidentType || 'Unknown';
          incidentTypeMap[itype] = (incidentTypeMap[itype] || 0) + 1;
        });

        // Blotter status chart data
        const chartData = Object.entries(statusMap).map(([status, count]) => {
          const opt = statusOptions.find(o => o.value === status);
          return {
            name:   opt ? opt.label : status,
            value:  count,
            status,
            color:  opt ? opt.color : '#6c757d',
          };
        });
        setBlotterStatusData(chartData);

        // Incident type chart data
        const typeChartData = Object.entries(incidentTypeMap)
          .sort((a, b) => b[1] - a[1])   // most common first
          .map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] }));
        setIncidentTypeData(typeChartData);

      } catch (error) {
        console.error('Error fetching blotter reports:', error);
        setBlotterCount(0);
        setBlotterStatusData([]);
        setIncidentTypeData([]);
      }
    };

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
    fetchDocuments();
  }, []);

  const statCards = [
    { title: 'Total Residents',    value: totalResidents,       icon: '👥', color: '#667eea', path: '/residents' },
    { title: 'Male',               value: maleCount,            icon: '👨', color: '#4facfe', path: '/residents?filter=male' },
    { title: 'Female',             value: femaleCount,          icon: '👩', color: '#f093fb', path: '/residents?filter=female' },
    { title: 'Senior Citizens',    value: seniorCitizenCount,   icon: '👴', color: '#f5576c', path: '/residents?filter=senior' },
    { title: 'Registered Voters',  value: registeredVotersCount,icon: '🗳️', color: '#764ba2', subtitle: 'With Valid ID', path: '/residents?filter=voters' },
    { title: 'Total Households',   value: householdCount,       icon: '🏠', color: '#43e97b', path: '/households' },
    { title: 'Blotter Reports',    value: blotterCount,         icon: '📋', color: '#ff6b6b', path: '/blotter' },
    { title: 'Documents',          value: documentCount,        icon: '📄', color: '#6bffabff', path: '/documents' },
  ];

  const BlotterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'white', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#1a202c' }}>{data.name}</p>
          <p style={{ margin: '0', color: '#64748b' }}>Count: <span style={{ fontWeight: '600', color: data.color }}>{data.value}</span></p>
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

  const IncidentTypeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'white', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#1a202c' }}>{data.name}</p>
          <p style={{ margin: '0', color: '#64748b' }}>Count: <span style={{ fontWeight: '600', color: data.color }}>{data.value}</span></p>
          <p style={{ margin: '0', color: '#64748b' }}>
            Percentage: <span style={{ fontWeight: '600', color: data.color }}>
              {blotterCount > 0 ? ((data.value / blotterCount) * 100).toFixed(1) : 0}%
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

        {/* ── Stat cards ── */}
        <div style={styles.statsContainer}>
          {statCards.map((card, index) => (
            <div
              key={index}
              style={{ ...styles.card, borderLeft: `4px solid ${card.color}`, cursor: 'pointer' }}
              onClick={() => navigate(card.path)}
            >
              <div style={styles.cardContent}>
                <div style={styles.cardInfo}>
                  <h3 style={styles.cardValue}>{card.value.toLocaleString()}</h3>
                  <p style={styles.cardTitle}>{card.title}</p>
                  {card.subtitle && <p style={styles.cardSubtitle}>{card.subtitle}</p>}
                </div>
                <div style={{ ...styles.cardIcon, color: card.color }}>{card.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Charts ── */}
        <div style={styles.chartsContainer}>
          {/* Occupation Distribution */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>Occupation Distribution</h2>
            <div style={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={occupationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {occupationData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Residents per Purok */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>Residents per Purok</h2>
            <div style={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={purokData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#666" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#666" />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#667eea" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#764ba2" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Blotter Status */}
          {blotterStatusData.length > 0 && (
            <div style={styles.chartCard}>
              <h2 style={styles.chartTitle}>
                <span style={{ marginRight: '8px' }}>📊</span>
                Blotter Reports by Status
              </h2>
              <div style={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={blotterStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120}
                      label={({ name, percent, value }) => `${name.split(' / ')[0]} (${value}) ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {blotterStatusData.map((entry, index) => (
                        <Cell key={`blotter-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<BlotterTooltip />} />
                    <Legend formatter={(value, entry: any) => (
                      <span style={{ color: entry.color, fontSize: '12px' }}>
                        {value.split(' / ')[0]} ({entry.payload.value})
                      </span>
                    )} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.chartSummary}>
                <p style={styles.summaryText}>
                  Total Reports: <strong>{blotterCount}</strong> •
                  Resolved: <strong>
                    {blotterStatusData.filter(i => i.status === 'settled' || i.status === 'closed').reduce((s, i) => s + i.value, 0)}
                  </strong> •
                  Active: <strong>
                    {blotterStatusData.filter(i => i.status !== 'settled' && i.status !== 'closed' && i.status !== 'dismissed').reduce((s, i) => s + i.value, 0)}
                  </strong>
                </p>
              </div>
            </div>
          )}

          {/* ── NEW: Incident Type Distribution ── */}
          {incidentTypeData.length > 0 && (
            <div style={styles.chartCard}>
              <h2 style={styles.chartTitle}>
                <span style={{ marginRight: '8px' }}>⚠️</span>
                Blotter Reports by Incident Type
              </h2>
              <div style={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={incidentTypeData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                      width={140}
                    />
                    <Tooltip content={<IncidentTypeTooltip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {incidentTypeData.map((entry, index) => (
                        <Cell key={`type-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.chartSummary}>
                <p style={styles.summaryText}>
                  {incidentTypeData.length} incident type{incidentTypeData.length !== 1 ? 's' : ''} recorded •
                  Most common: <strong>{incidentTypeData[0]?.name}</strong> ({incidentTypeData[0]?.value} case{incidentTypeData[0]?.value !== 1 ? 's' : ''})
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
  container:      { display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' },
  mainContent:    { marginLeft: '260px', padding: '30px', width: 'calc(100% - 260px)', minHeight: '100vh' },
  header:         { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' },
  title:          { fontSize: '32px', fontWeight: '700', color: '#1a202c', margin: '0 0 5px 0' },
  subtitle:       { fontSize: '16px', color: '#64748b', margin: '0' },
  statsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' },
  card:           { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'pointer' },
  cardContent:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo:       { flex: 1 },
  cardValue:      { fontSize: '28px', fontWeight: '700', color: '#1a202c', margin: '0 0 5px 0' },
  cardTitle:      { fontSize: '14px', color: '#64748b', margin: '0', fontWeight: '500' },
  cardSubtitle:   { fontSize: '12px', color: '#9ca3af', margin: '2px 0 0 0', fontWeight: '400', fontStyle: 'italic' },
  cardIcon:       { fontSize: '32px', opacity: 0.8 },
  chartsContainer:{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '30px' },
  chartCard:      { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  chartTitle:     { fontSize: '20px', fontWeight: '600', color: '#1a202c', marginBottom: '20px', marginTop: '0', display: 'flex', alignItems: 'center' },
  chartWrapper:   { width: '100%', height: '350px' },
  chartSummary:   { marginTop: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' },
  summaryText:    { margin: '0', fontSize: '14px', color: '#64748b', textAlign: 'center' as const },
};

export default HomePage;
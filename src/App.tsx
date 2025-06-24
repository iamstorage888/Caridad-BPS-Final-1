import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/residents" element={<Residents />} />
        <Route path="/households" element={<Households />} />
        <Route path="/users" element={<Users />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/blotter" element={<Blotter />} />
        <Route path="/add-resident" element={<AddResiidents />} />
         <Route path="/resident/:id" element={<ViewResident />} />
         <Route path="/add-household" element={<AddHousehold />} />
         <Route path="/household/:householdNumber" element={<ViewHouseholdMembers />} />
         <Route path="/edit-resident/:id" element={<EditResident />} />
         <Route path="/edit-household/:id" element={<EditHousehold />} />
         <Route path="/documents/request" element={<RequestDocument />} />
         <Route path="/documents/view/:id" element={<ViewDocumentRequest />} />
         <Route path="/add-blotter" element={<AddBlotter />} />
         <Route path="/documents/edit/:id" element={<EditDocumentRequest />} />

      </Routes>
    </Router>
  );
}

export default App;

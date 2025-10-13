import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import Profile from './pages/Profile'; // Import Profile page

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Dashboard Route */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Residents Route */}
        <Route path="/residents" element={<Residents />} />
        
        {/* Profile Route */}
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
}
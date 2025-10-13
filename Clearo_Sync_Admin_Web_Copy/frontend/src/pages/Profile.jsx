import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar'; // Reuse Navbar component

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const userData = location.state?.userData;

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-screen bg-green-50">
        <div className="text-center">
          <p className="text-gray-600">No user data available.</p>
          <button
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            onClick={() => navigate('/')}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-green-50">
      <Navbar selectedView="/profile" /> {/* Use Navbar component */}

      <main className="flex-1 overflow-y-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-green-700 mb-4">User Profile</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 font-medium">Name:</p>
              <p className="text-gray-800">{userData.name}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Email:</p>
              <p className="text-gray-800">{userData.email}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Position:</p>
              <p className="text-gray-800">{userData.position || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Phone:</p>
              <p className="text-gray-800">{userData.phone || 'N/A'}</p>
            </div>
          </div>
          <button
            className="mt-6 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            onClick={() => navigate('/')}
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navbar from '../components/Navbar'; // Import Navbar

export default function Residents() {
  const [residents, setResidents] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);

  useEffect(() => {
    const fetchResidents = async () => {
      try {
        setResidentsLoading(true);
        const querySnapshot = await getDocs(collection(db, 'residents'));
        const residentsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setResidents(residentsData);
      } catch (err) {
        console.error('Error fetching residents:', err);
      } finally {
        setResidentsLoading(false);
      }
    };

    fetchResidents();
  }, []);

  return (
    <div className="flex h-screen bg-green-50">
      <Navbar selectedView="/residents" /> {/* Use Navbar component */}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-green-700 mb-4">Residents Management</h2>
          {residentsLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : residents.length > 0 ? (
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-green-100 text-left">
                  <th className="py-2 px-4 border-b">Name</th>
                  <th className="py-2 px-4 border-b">Email</th>
                  <th className="py-2 px-4 border-b">Address</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((resident) => (
                  <tr key={resident.id} className="hover:bg-green-50">
                    <td className="py-2 px-4 border-b">{resident.name}</td>
                    <td className="py-2 px-4 border-b">{resident.email}</td>
                    <td className="py-2 px-4 border-b">{resident.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600">No residents found.</p>
          )}
        </div>
      </main>
    </div>
  );
}

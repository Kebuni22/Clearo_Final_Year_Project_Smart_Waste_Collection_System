import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { createPickupRequestNotification } from '../../utils/notificationHelper';

const PickupRequestForm = ({ user }) => {
  const [formData, setFormData] = useState({
    wasteType: 'General Waste',
    pickupDate: '',
    pickupTime: '',
    address: '',
    phone: '',
    isUrgent: false
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create pickup request
      const requestRef = await addDoc(collection(db, 'pickupRequests'), {
        ...formData,
        userId: user.uid,
        userName: user.displayName || user.email,
        userEmail: user.email,
        status: 'pending',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      console.log('Pickup request created:', requestRef.id);

      // 2. Create notification for admin
      await createPickupRequestNotification(
        {
          id: requestRef.id,
          ...formData,
        },
        {
          uid: user.uid,
          name: user.displayName || user.email,
          email: user.email,
          phone: formData.phone,
        }
      );

      alert('✅ Pickup request submitted! You will hear notification sound.');
      
      // Reset form
      setFormData({
        wasteType: 'General Waste',
        pickupDate: '',
        pickupTime: '',
        address: '',
        phone: '',
        isUrgent: false
      });

    } catch (error) {
      console.error('Error submitting pickup request:', error);
      alert('❌ Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg mx-auto mt-8">
      <h2 className="text-2xl font-bold text-center text-green-700 mb-4">Request Pickup</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="wasteType">
            Waste Type
          </label>
          <select
            id="wasteType"
            name="wasteType"
            value={formData.wasteType}
            onChange={(e) => setFormData({ ...formData, wasteType: e.target.value })}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
          >
            <option value="General Waste">General Waste</option>
            <option value="Recyclables">Recyclables</option>
            <option value="Organic Waste">Organic Waste</option>
            <option value="Hazardous Waste">Hazardous Waste</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="pickupDate">
              Pickup Date
            </label>
            <input
              type="date"
              id="pickupDate"
              name="pickupDate"
              value={formData.pickupDate}
              onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
              className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="pickupTime">
              Pickup Time
            </label>
            <input
              type="time"
              id="pickupTime"
              name="pickupTime"
              value={formData.pickupTime}
              onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
              className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="address">
            Address
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
            placeholder="Enter pickup address"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
            placeholder="Enter your phone number"
            required
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isUrgent"
            name="isUrgent"
            checked={formData.isUrgent}
            onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700" htmlFor="isUrgent">
            Mark as urgent
          </label>
        </div>

        <div className="flex justify-center">
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            ) : (
              'Submit Pickup Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PickupRequestForm;
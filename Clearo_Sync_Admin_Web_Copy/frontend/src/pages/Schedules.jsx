import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay } from 'date-fns';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newSchedule, setNewSchedule] = useState({ wasteType: '', time: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const wasteTypes = ['Plastic', 'Food Waste', 'Hazardous Waste', 'E-Waste', 'Other'];
  const timeSlots = ['8 AM - 10 AM', '10 AM - 12 PM', '12 PM - 2 PM', '2 PM - 4 PM'];

  const fetchSchedules = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const schedulesSnapshot = await getDocs(collection(db, 'wasteSchedules'));
      const schedulesData = schedulesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: new Date(doc.data().date),
      }));
      setSchedules(schedulesData);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Failed to load schedules. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!newSchedule.wasteType || !newSchedule.time) {
      setError('Please select both waste type and time slot');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const scheduleData = {
        date: selectedDate.toISOString(),
        wasteType: newSchedule.wasteType,
        time: newSchedule.time,
      };

      const docRef = await addDoc(collection(db, 'wasteSchedules'), scheduleData);

      setSchedules((prev) => [
        ...prev,
        {
          id: docRef.id,
          ...scheduleData,
          date: new Date(scheduleData.date),
        },
      ]);

      setNewSchedule({ wasteType: '', time: '' });
    } catch (err) {
      console.error('Error adding schedule:', err);
      setError('Failed to add schedule. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTileClassName = ({ date }) => {
    return schedules.some((schedule) => isSameDay(date, schedule.date))
      ? 'bg-green-100 text-green-800 rounded-full'
      : '';
  };

  const filteredSchedules = schedules.filter((schedule) =>
    isSameDay(selectedDate, schedule.date)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Waste Collection Schedules
          </h1>
          <p className="mt-3 text-xl text-gray-500">
            Manage and schedule your waste pickups
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Calendar Section */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Select a Date</h2>
            <div className="flex justify-center">
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileClassName={getTileClassName}
                className="border-0 rounded-lg shadow-sm"
                minDetail="month"
                next2Label={null}
                prev2Label={null}
              />
            </div>
          </div>

          {/* Selected Date Info */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {format(selectedDate, 'MMMM d, yyyy')}
            </h3>
            <p className="text-sm text-gray-500">
              {filteredSchedules.length > 0
                ? `${filteredSchedules.length} scheduled pickup(s)`
                : 'No pickups scheduled'}
            </p>
          </div>

          {/* Schedule List */}
          <div className="p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Scheduled Pickups</h4>

            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : filteredSchedules.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {filteredSchedules.map((schedule) => (
                  <li key={schedule.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {schedule.wasteType}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{schedule.time}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No pickups scheduled for this date.</p>
              </div>
            )}
          </div>

          {/* Add New Schedule Form */}
          <div className="bg-gray-50 px-6 py-4">
            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Schedule New Pickup</h4>
              </div>

              <div>
                <label htmlFor="wasteType" className="block text-sm font-medium text-gray-700 mb-1">
                  Waste Type
                </label>
                <select
                  id="wasteType"
                  value={newSchedule.wasteType}
                  onChange={(e) => setNewSchedule({ ...newSchedule, wasteType: e.target.value })}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                >
                  <option value="">Select waste type</option>
                  {wasteTypes.map((type, idx) => (
                    <option key={idx} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="timeSlot" className="block text-sm font-medium text-gray-700 mb-1">
                  Time Slot
                </label>
                <select
                  id="timeSlot"
                  value={newSchedule.time}
                  onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                >
                  <option value="">Select time slot</option>
                  {timeSlots.map((slot, idx) => (
                    <option key={idx} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                    isLoading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? 'Processing...' : 'Schedule Pickup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
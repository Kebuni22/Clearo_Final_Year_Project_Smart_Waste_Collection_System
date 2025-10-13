import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaClock, FaMapMarkerAlt, FaCheck, FaMinus } from 'react-icons/fa';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const Schedules = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [roads, setRoads] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRoadModal, setShowRoadModal] = useState(false);
  const [editingRoad, setEditingRoad] = useState(null);
  
  // Enhanced schedule form state
  const [selectedWasteType, setSelectedWasteType] = useState('');
  const [selectedRoads, setSelectedRoads] = useState([]);
  const [roadTimeSlots, setRoadTimeSlots] = useState({});

  // Road form state
  const [roadForm, setRoadForm] = useState({
    name: '',
    area: '',
    priority: 'medium'
  });

  const wasteTypes = [
    { name: 'General Waste', color: 'bg-gray-500', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    { name: 'Recyclables', color: 'bg-blue-500', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    { name: 'Organic Waste', color: 'bg-green-500', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    { name: 'Hazardous Waste', color: 'bg-red-500', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    { name: 'E-Waste', color: 'bg-purple-500', bgColor: 'bg-purple-100', textColor: 'text-purple-800' }
  ];

  const timeSlots = [
    '8:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '12:00 PM - 2:00 PM',
    '2:00 PM - 4:00 PM',
    '4:00 PM - 6:00 PM',
    'Custom Time'
  ];

  const priorities = ['high', 'medium', 'low'];

  useEffect(() => {
    fetchRoads();
    fetchSchedules();
  }, []);

  const fetchRoads = async () => {
    try {
      const roadsSnapshot = await getDocs(collection(db, 'roads'));
      setRoads(roadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching roads:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
      setSchedules(schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  // Calendar functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getSchedulesForDate = (date) => {
    const dateStr = formatDate(date);
    return schedules.filter(schedule => schedule.date === dateStr);
  };

  const handleDateClick = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(clickedDate);
    setSelectedWasteType('');
    setSelectedRoads([]);
    setRoadTimeSlots({});
    setShowScheduleModal(true);
  };

  const handleWasteTypeSelect = (wasteType) => {
    setSelectedWasteType(wasteType);
    setSelectedRoads([]);
    setRoadTimeSlots({});
  };

  const handleAddRoad = (road) => {
    if (!selectedRoads.find(r => r.id === road.id)) {
      setSelectedRoads([...selectedRoads, road]);
      setRoadTimeSlots({
        ...roadTimeSlots,
        [road.id]: ''
      });
    }
  };

  const handleRemoveRoad = (roadId) => {
    setSelectedRoads(selectedRoads.filter(r => r.id !== roadId));
    const newTimeSlots = { ...roadTimeSlots };
    delete newTimeSlots[roadId];
    setRoadTimeSlots(newTimeSlots);
  };

  const handleTimeSlotChange = (roadId, timeSlot) => {
    setRoadTimeSlots({
      ...roadTimeSlots,
      [roadId]: timeSlot
    });
  };

  const handleCreateSchedule = async () => {
    try {
      const schedulePromises = selectedRoads.map(road => {
        const scheduleData = {
          roadId: road.id,
          roadName: road.name,
          wasteType: selectedWasteType,
          timeSlot: roadTimeSlots[road.id],
          date: formatDate(selectedDate),
          createdAt: new Date()
        };
        return addDoc(collection(db, 'schedules'), scheduleData);
      });

      await Promise.all(schedulePromises);
      await fetchSchedules();
      
      // Reset form
      setShowScheduleModal(false);
      setSelectedWasteType('');
      setSelectedRoads([]);
      setRoadTimeSlots({});
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const getWasteTypeInfo = (wasteTypeName) => {
    return wasteTypes.find(wt => wt.name === wasteTypeName) || wasteTypes[0];
  };

  const getTimeSlotSummary = () => {
    const distribution = {};
    Object.values(roadTimeSlots).forEach(slot => {
      if (slot) {
        distribution[slot] = (distribution[slot] || 0) + 1;
      }
    });
    return distribution;
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      const scheduleData = {
        ...scheduleForm,
        date: formatDate(selectedDate),
        createdAt: new Date()
      };

      await addDoc(collection(db, 'schedules'), scheduleData);
      await fetchSchedules();
      setShowScheduleModal(false);
      setScheduleForm({ roadId: '', wasteType: '', timeSlot: '', specialNote: '' });
    } catch (error) {
      console.error('Error adding schedule:', error);
    }
  };

  const handleRoadSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRoad) {
        await updateDoc(doc(db, 'roads', editingRoad.id), {
          ...roadForm,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'roads'), {
          ...roadForm,
          createdAt: new Date()
        });
      }
      
      await fetchRoads();
      setShowRoadModal(false);
      setRoadForm({ name: '', area: '', priority: 'medium' });
      setEditingRoad(null);
    } catch (error) {
      console.error('Error saving road:', error);
    }
  };

  const handleEditRoad = (road) => {
    setEditingRoad(road);
    setRoadForm({
      name: road.name,
      area: road.area || '',
      priority: road.priority || 'medium'
    });
    setShowRoadModal(true);
  };

  const handleDeleteRoad = async (roadId) => {
    if (window.confirm('Are you sure you want to delete this road?')) {
      try {
        await deleteDoc(doc(db, 'roads', roadId));
        await fetchRoads();
      } catch (error) {
        console.error('Error deleting road:', error);
      }
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await deleteDoc(doc(db, 'schedules', scheduleId));
        await fetchSchedules();
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-200"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const daySchedules = getSchedulesForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      
      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-2 cursor-pointer hover:bg-blue-50 transition-colors ${
            isToday ? 'bg-blue-100' : ''
          }`}
          onClick={() => handleDateClick(day)}
        >
          <div className={`font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="mt-1 space-y-1">
            {daySchedules.slice(0, 2).map((schedule, idx) => {
              const road = roads.find(r => r.id === schedule.roadId);
              return (
                <div
                  key={idx}
                  className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded truncate"
                  title={`${road?.name || 'Unknown Road'} - ${schedule.wasteType}`}
                >
                  {road?.name || 'Unknown Road'}
                </div>
              );
            })}
            {daySchedules.length > 2 && (
              <div className="text-xs text-gray-500">+{daySchedules.length - 2} more</div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <h2 className="text-2xl font-bold text-green-700 mb-6 flex items-center">
        <FaCalendarAlt className="mr-3" />
        Waste Collection Schedules
      </h2>

      <div className="bg-green-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-green-600 mb-2">Schedule Management</h3>
        <p className="text-gray-600">Manage waste collection schedules and routes for different areas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <h4 className="text-lg font-bold text-blue-800 mb-3">Today's Collections</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-blue-700">Residential Areas</span>
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">8 AM - 12 PM</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-700">Commercial District</span>
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">2 PM - 6 PM</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <h4 className="text-lg font-bold text-green-800 mb-3">This Week</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-green-700">Total Scheduled</span>
              <span className="font-bold text-green-800">42 routes</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-700">Completed</span>
              <span className="font-bold text-green-800">38 routes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Collection Calendar</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 text-gray-600 hover:text-gray-800"
            >
              ←
            </button>
            <span className="font-semibold text-lg">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 text-gray-600 hover:text-gray-800"
            >
              →
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center font-semibold text-gray-700 border-b border-gray-200">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {renderCalendar()}
          </div>
        </div>
      </div>

      {/* Roads Management Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Road Management</h3>
          <button
            onClick={() => setShowRoadModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
          >
            <FaPlus className="mr-2" />
            Add Road
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Road Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roads.map((road) => (
                <tr key={road.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900">{road.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {road.area || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(road.priority)}`}>
                      {road.priority || 'medium'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditRoad(road)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteRoad(road.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header - Fixed */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Create Schedule Plan</h2>
                  <p className="text-green-100 mt-1">
                    {selectedDate?.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-green-100 hover:text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Select Waste Type */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold">1</div>
                  Select Waste Type
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {wasteTypes.map((wasteType) => (
                    <button
                      key={wasteType.name}
                      onClick={() => handleWasteTypeSelect(wasteType.name)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        selectedWasteType === wasteType.name
                          ? `${wasteType.bgColor} border-current ${wasteType.textColor} scale-105 shadow-lg`
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className={`w-4 h-4 ${wasteType.color} rounded-full mx-auto mb-2`}></div>
                      <div className="text-sm font-semibold text-center">{wasteType.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Roads */}
              {selectedWasteType && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold">2</div>
                    Available Roads
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {roads.filter(road => !selectedRoads.find(sr => sr.id === road.id)).map((road) => (
                        <div key={road.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="text-gray-400 mr-2" />
                            <div>
                              <div className="font-medium text-gray-900">{road.name}</div>
                              <div className="text-sm text-gray-500">{road.area || 'No area specified'}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddRoad(road)}
                            className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors"
                          >
                            <FaPlus className="text-sm" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Selected Roads */}
                  {selectedRoads.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h4 className="font-semibold text-blue-800 mb-3">Selected Roads ({selectedRoads.length})</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedRoads.map((road) => (
                          <div key={road.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
                            <div className="flex items-center">
                              <FaCheck className="text-green-500 mr-2" />
                              <div>
                                <div className="font-medium text-gray-900">{road.name}</div>
                                <div className="text-sm text-gray-500">{road.area || 'No area specified'}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveRoad(road.id)}
                              className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors flex-shrink-0"
                            >
                              <FaMinus className="text-sm" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Set Time Slots */}
              {selectedRoads.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold">3</div>
                    Schedule Plan ({selectedRoads.length} roads)
                  </h3>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {selectedRoads.map((road) => (
                      <div key={road.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="text-gray-400 mr-2" />
                            <span className="font-semibold text-gray-900">{road.name}</span>
                          </div>
                          <FaClock className="text-gray-400" />
                        </div>
                        <select
                          value={roadTimeSlots[road.id] || ''}
                          onChange={(e) => handleTimeSlotChange(road.id, e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select Time Slot</option>
                          {timeSlots.map((slot) => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Summary */}
              {selectedWasteType && selectedRoads.length > 0 && Object.keys(roadTimeSlots).some(key => roadTimeSlots[key]) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold">4</div>
                    Schedule Summary
                  </h3>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Date:</span>
                          <span className="text-gray-900">{selectedDate?.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Waste Type:</span>
                          <div className="flex items-center">
                            <div className={`w-3 h-3 ${getWasteTypeInfo(selectedWasteType).color} rounded-full mr-2`}></div>
                            <span className="text-gray-900">{selectedWasteType}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Total Roads:</span>
                          <span className="text-gray-900 font-semibold">{selectedRoads.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Assigned Time Slots:</span>
                          <span className="text-gray-900 font-semibold">
                            {Object.values(roadTimeSlots).filter(slot => slot).length}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Time Slot Distribution:</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {Object.entries(getTimeSlotSummary()).map(([slot, count]) => (
                            <div key={slot} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 truncate mr-2">{slot}:</span>
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium flex-shrink-0">
                                {count} road{count > 1 ? 's' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Fixed */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSchedule}
                  disabled={!selectedWasteType || selectedRoads.length === 0 || !Object.values(roadTimeSlots).some(slot => slot)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
                >
                  <FaSave className="mr-2" />
                  Create Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Road Modal */}
      {showRoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                {editingRoad ? 'Edit Road' : 'Add New Road'}
              </h3>
              <button
                onClick={() => {
                  setShowRoadModal(false);
                  setEditingRoad(null);
                  setRoadForm({ name: '', area: '', priority: 'medium' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleRoadSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Road Name</label>
                  <input
                    type="text"
                    value={roadForm.name}
                    onChange={(e) => setRoadForm({...roadForm, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                  <input
                    type="text"
                    value={roadForm.area}
                    onChange={(e) => setRoadForm({...roadForm, area: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Downtown, Residential Area"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={roadForm.priority}
                    onChange={(e) => setRoadForm({...roadForm, priority: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoadModal(false);
                    setEditingRoad(null);
                    setRoadForm({ name: '', area: '', priority: 'medium' });
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                >
                  <FaSave className="mr-2" />
                  {editingRoad ? 'Update Road' : 'Add Road'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedules;
import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaClock, FaMapMarkerAlt, FaCheck, FaMinus, FaRecycle, FaTag } from 'react-icons/fa';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const Schedules = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [roads, setRoads] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRoadModal, setShowRoadModal] = useState(false);
  const [editingRoad, setEditingRoad] = useState(null);
  
  // Enhanced schedule form state
  const [selectedWasteType, setSelectedWasteType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRoads, setSelectedRoads] = useState([]);
  const [roadTimeSlots, setRoadTimeSlots] = useState({});
  const [customTimeSlots, setCustomTimeSlots] = useState({});
  const [showCustomTimeModal, setShowCustomTimeModal] = useState(false);
  const [customTimeForRoad, setCustomTimeForRoad] = useState(null);
  const [customTimeForm, setCustomTimeForm] = useState({
    startTime: '',
    endTime: ''
  });

  // Road form state
  const [roadForm, setRoadForm] = useState({
    name: '',
    priority: 'medium',
    categoryId: ''
  });

  // Road categories state
  const [roadCategories, setRoadCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', color: 'bg-gray-200' });
  const [editingCategory, setEditingCategory] = useState(null);

  // Schedule editing and notes state
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editScheduleData, setEditScheduleData] = useState({});
  const [editingWasteTypeForDate, setEditingWasteTypeForDate] = useState(false);
  const [selectedDateWasteType, setSelectedDateWasteType] = useState('');
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportNotes, setReportNotes] = useState('');
  const [reportPhotos, setReportPhotos] = useState([]);

  // Special plans state
  const [specialPlans, setSpecialPlans] = useState([]);
  const [showSpecialPlanModal, setShowSpecialPlanModal] = useState(false);
  const [specialPlanForm, setSpecialPlanForm] = useState({
    title: '',
    description: '',
    date: '',
    priority: 'medium'
  });

  // Date-specific plans and notes
  const [dateSpecialPlans, setDateSpecialPlans] = useState([]);
  const [showDateSpecialPlanModal, setShowDateSpecialPlanModal] = useState(false);
  const [dateSpecialPlanForm, setDateSpecialPlanForm] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });
  const [dateNotes, setDateNotes] = useState('');
  const [savedDateNotes, setSavedDateNotes] = useState({});

  // Waste type management state
  const [showWasteTypeModal, setShowWasteTypeModal] = useState(false);
  const [editingWasteType, setEditingWasteType] = useState(null);
  const [wasteTypeForm, setWasteTypeForm] = useState({
    name: '',
    color: 'bg-gray-500',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800'
  });

  // Weekly and monthly reports state
  const [showWeeklyReportModal, setShowWeeklyReportModal] = useState(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);
  const [weeklyReportData, setWeeklyReportData] = useState(null);
  const [monthlyReportData, setMonthlyReportData] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const [wasteTypes, setWasteTypes] = useState([
    { name: 'Plastic', color: 'bg-blue-500', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    { name: 'Food Waste', color: 'bg-green-500', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    { name: 'Hazardous', color: 'bg-red-500', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    { name: 'E-Waste', color: 'bg-purple-500', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
    { name: 'Paper', color: 'bg-yellow-500', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    { name: 'Glass', color: 'bg-cyan-500', bgColor: 'bg-cyan-100', textColor: 'text-cyan-800' },
    { name: 'Metal', color: 'bg-gray-600', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    { name: 'Other', color: 'bg-indigo-500', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' }
  ]);

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
    fetchSpecialPlans();
    fetchWasteTypes();
    fetchRoadCategories();
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

  const fetchSpecialPlans = async () => {
    try {
      const plansSnapshot = await getDocs(collection(db, 'specialPlans'));
      // normalize completed flag to boolean
      setSpecialPlans(plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), completed: !!doc.data().completed })));
    } catch (error) {
      console.error('Error fetching special plans:', error);
    }
  };

  const fetchWasteTypes = async () => {
    try {
      const wasteTypesSnapshot = await getDocs(collection(db, 'wasteTypes'));
      if (wasteTypesSnapshot.docs.length > 0) {
        setWasteTypes(wasteTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.error('Error fetching waste types:', error);
    }
  };

  // NEW: fetch road categories
  const fetchRoadCategories = async () => {
    try {
      const snap = await getDocs(collection(db, 'roadCategories'));
      setRoadCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching road categories:', error);
    }
  };

  const handleWasteTypeSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWasteType) {
        await updateDoc(doc(db, 'wasteTypes', editingWasteType.id), {
          ...wasteTypeForm,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'wasteTypes'), {
          ...wasteTypeForm,
          createdAt: new Date()
        });
      }
      
      await fetchWasteTypes();
      setShowWasteTypeModal(false);
      setWasteTypeForm({ name: '', color: 'bg-gray-500', bgColor: 'bg-gray-100', textColor: 'text-gray-800' });
      setEditingWasteType(null);
    } catch (error) {
      console.error('Error saving waste type:', error);
    }
  };

  const handleEditWasteType = (wasteType) => {
    setEditingWasteType(wasteType);
    setWasteTypeForm({
      name: wasteType.name,
      color: wasteType.color,
      bgColor: wasteType.bgColor,
      textColor: wasteType.textColor
    });
    setShowWasteTypeModal(true);
  };

  const handleDeleteWasteType = async (wasteTypeId) => {
    if (window.confirm('Are you sure you want to delete this waste type?')) {
      try {
        await deleteDoc(doc(db, 'wasteTypes', wasteTypeId));
        await fetchWasteTypes();
      } catch (error) {
        console.error('Error deleting waste type:', error);
      }
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'roadCategories', editingCategory.id), {
          ...categoryForm,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'roadCategories'), {
          ...categoryForm,
          createdAt: new Date()
        });
      }
      await fetchRoadCategories();
      setShowCategoryModal(false);
      setCategoryForm({ name: '', color: 'bg-gray-200' });
      setEditingCategory(null);
    } catch (err) {
      console.error('Error saving category:', err);
    }
  };

  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name || '', color: cat.color || 'bg-gray-200' });
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await deleteDoc(doc(db, 'roadCategories', catId));
      await fetchRoadCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const colorOptions = [
    { name: 'Blue', color: 'bg-blue-500', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    { name: 'Green', color: 'bg-green-500', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    { name: 'Red', color: 'bg-red-500', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    { name: 'Purple', color: 'bg-purple-500', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
    { name: 'Yellow', color: 'bg-yellow-500', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    { name: 'Cyan', color: 'bg-cyan-500', bgColor: 'bg-cyan-100', textColor: 'text-cyan-800' },
    { name: 'Gray', color: 'bg-gray-600', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    { name: 'Orange', color: 'bg-orange-500', bgColor: 'bg-orange-100', textColor: 'text-orange-800' }
  ];

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Replace ISO-based formatting (UTC-shift) with local YYYY-MM-DD formatting
  const formatDate = (date) => {
    const d = new Date(date);
    // normalize to local midnight to avoid timezone shifts
    d.setHours(0, 0, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getSchedulesForDate = (date) => {
    const dateStr = formatDate(date);
    return schedules.filter(schedule => schedule.date === dateStr);
  };

  // Ensure today's date is normalized (local) when fetching today's schedules
  // Duplicate getTodaySchedules function removed to fix redeclaration error.

  const handleDateClick = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if selected date is in the past
    if (clickedDate < today) {
      alert('Cannot create schedule for past dates. Please select today or a future date.');
      return;
    }
    
    setSelectedDate(clickedDate);
    setSelectedCalendarDate(clickedDate);
    setSelectedWasteType('');
    setSelectedCategory(''); // reset category
    setSelectedRoads([]);
    setRoadTimeSlots({});
    setShowScheduleModal(true);
  };

  // Add function to handle clicking on calendar date for summary view
  const handleCalendarDateSelect = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedCalendarDate(clickedDate);
  };

  const handleWasteTypeSelect = (wasteType) => {
    setSelectedWasteType(wasteType);
    setSelectedCategory(''); // reset category when waste type changes
    setSelectedRoads([]);
    setRoadTimeSlots({});
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
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
      setSelectedCategory(''); // reset category
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
      // resolve categoryName from categoryId before saving
      const categoryName = roadCategories.find(c => c.id === roadForm.categoryId)?.name || '';

      if (editingRoad) {
        await updateDoc(doc(db, 'roads', editingRoad.id), {
          ...roadForm,
          categoryName,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'roads'), {
          ...roadForm,
          categoryName,
          createdAt: new Date()
        });
      }
      
      await fetchRoads();
      setShowRoadModal(false);
      setRoadForm({ name: '', priority: 'medium', categoryId: '' });
      setEditingRoad(null);
    } catch (error) {
      console.error('Error saving road:', error);
    }
  };

  const handleEditRoad = (road) => {
    setEditingRoad(road);
    setRoadForm({
      name: road.name,
      priority: road.priority || 'medium',
      categoryId: road.categoryId || '' // populate category when editing
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

  const handleSpecialPlanSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'specialPlans'), {
        ...specialPlanForm,
        date: formatDate(new Date()), // Set to today's date
        completed: false, // new plans start as not completed
        createdAt: new Date()
      });
      
      await fetchSpecialPlans();
      setShowSpecialPlanModal(false);
      setSpecialPlanForm({ title: '', description: '', date: '', priority: 'medium' });
    } catch (error) {
      console.error('Error saving special plan:', error);
    }
  };

  const handleDateSpecialPlanSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'specialPlans'), {
        ...dateSpecialPlanForm,
        date: formatDate(selectedCalendarDate),
        createdAt: new Date()
      });
      
      await fetchSpecialPlans();
      setShowDateSpecialPlanModal(false);
      setDateSpecialPlanForm({ title: '', description: '', priority: 'medium' });
    } catch (error) {
      console.error('Error saving date special plan:', error);
    }
  };

  // NEW: toggle completion state for a special plan
  const toggleSpecialPlanCompletion = async (plan) => {
    try {
      await updateDoc(doc(db, 'specialPlans', plan.id), {
        completed: !plan.completed,
        completedAt: !plan.completed ? new Date() : null,
        updatedAt: new Date()
      });
      await fetchSpecialPlans();
    } catch (error) {
      console.error('Error toggling plan completion:', error);
    }
  };

  const getDateSpecialPlans = (date) => {
    const dateStr = formatDate(date);
    return specialPlans.filter(plan => plan.date === dateStr);
  };

  const handleSaveDateNotes = async () => {
    const dateStr = formatDate(selectedCalendarDate);
    setSavedDateNotes({
      ...savedDateNotes,
      [dateStr]: dateNotes
    });
    // Optionally save to Firestore here
    // await addDoc(collection(db, 'dateNotes'), { date: dateStr, notes: dateNotes });
  };

  const getTodaySchedules = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return getSchedulesForDate(today);
  };

  const getTodaySpecialPlans = () => {
    const today = formatDate(new Date());
    return specialPlans.filter(plan => plan.date === today);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
      const isSelected = selectedCalendarDate && date.toDateString() === selectedCalendarDate.toDateString();
      
      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-2 cursor-pointer transition-colors ${
            isToday ? 'bg-blue-100' : ''
          } ${isSelected ? 'bg-green-100 border-green-300' : 'hover:bg-blue-50'}`}
          onClick={() => handleCalendarDateSelect(day)}
          onDoubleClick={() => handleDateClick(day)}
        >
          <div className={`font-semibold ${isToday ? 'text-blue-600' : isSelected ? 'text-green-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="mt-1 space-y-1">
            {daySchedules.slice(0, 2).map((schedule, idx) => {
              const road = roads.find(r => r.id === schedule.roadId);
              const wasteTypeInfo = getWasteTypeInfo(schedule.wasteType);
              return (
                <div
                  key={idx}
                  className={`text-xs px-1 py-0.5 rounded truncate ${wasteTypeInfo.bgColor} ${wasteTypeInfo.textColor}`}
                  title={`${road?.name || 'Unknown Road'} - ${schedule.wasteType} - ${schedule.timeSlot}`}
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

  // Add function to handle waste type edit for all schedules on a date
  const handleEditDateWasteType = () => {
    if (selectedCalendarDate) {
      const daySchedules = getSchedulesForDate(selectedCalendarDate);
      if (daySchedules.length > 0) {
        setSelectedDateWasteType(daySchedules[0].wasteType);
        setEditingWasteTypeForDate(true);
      }
    }
  };

  const handleSaveDateWasteType = async () => {
    try {
      const daySchedules = getSchedulesForDate(selectedCalendarDate);
      const updatePromises = daySchedules.map(schedule => 
        updateDoc(doc(db, 'schedules', schedule.id), {
          wasteType: selectedDateWasteType,
          updatedAt: new Date()
        })
      );
      
      await Promise.all(updatePromises);
      await fetchSchedules();
      setEditingWasteTypeForDate(false);
      setSelectedDateWasteType('');
    } catch (error) {
      console.error('Error updating waste type:', error);
    }
  };

  // duplicate weekly/monthly report state removed (already declared above)

  const downloadWeeklyPDF = () => {
    if (!weeklyReportData) return;

    const htmlContent = `
      <html>
        <head>
          <title>Weekly Collection Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
            .header h1 { color: #007bff; margin-bottom: 10px; }
            .stats { 
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin: 30px 0;
              padding: 20px;
              background-color: #f8f9fa;
              border-radius: 8px;
            }
            .stat-item { 
              text-align: center;
              padding: 15px;
              background: white;
              border-radius: 6px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .stat-number {
              font-size: 24px;
              font-weight: bold;
              color: #007bff;
            }
            .stat-label {
              font-size: 12px;
              color: #666;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 30px;
              background: white;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f8f9fa; 
              font-weight: bold;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Weekly Collection Report</h1>
            <h3>${weeklyReportData.period}</h3>
          </div>
          
          <div class="stats">
            <div class="stat-item">
              <div class="stat-number">${weeklyReportData.statistics.totalRoutes}</div>
              <div class="stat-label">Total Routes</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${weeklyReportData.statistics.completedRoutes}</div>
              <div class="stat-label">Completed</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${weeklyReportData.statistics.pendingRoutes}</div>
              <div class="stat-label">Pending</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${weeklyReportData.statistics.completionRate}%</div>
              <div class="stat-label">Completion Rate</div>
            </div>
          </div>

          <h3>Waste Type Distribution</h3>
          <table>
            <thead>
              <tr>
                <th>Waste Type</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(weeklyReportData.statistics.wasteTypeStats).map(([type, count]) => {
                const percentage = Math.round((count / weeklyReportData.statistics.totalRoutes) * 100);
                return `
                  <tr>
                    <td>${type}</td>
                    <td>${count}</td>
                    <td>${percentage}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <h3>Road Performance</h3>
          <table>
            <thead>
              <tr>
                <th>Road Name</th>
                <th>Collections</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(weeklyReportData.statistics.roadStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([road, count]) => `
                  <tr>
                    <td>${road}</td>
                    <td>${count}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 50px; padding: 20px; background: #f8f9fa; border-radius: 6px; text-align: center; font-size: 12px; color: #666;">
            <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
            <p>Clearo Sync - Weekly Collection Report</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => printWindow.close(), 1000);
        }, 500);
      };
    }
  };

  const downloadMonthlyPDF = () => {
    if (!monthlyReportData) return;

    const htmlContent = `
      <html>
        <head>
          <title>Monthly Collection Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #28a745; padding-bottom: 20px; }
            .header h1 { color: #28a745; margin-bottom: 10px; }
            .stats { 
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin: 20px 0;
              padding: 20px;
              background-color: #f8f9fa;
              border-radius: 8px;
            }
            .stat-item { 
              text-align: center;
              padding: 15px;
              background: white;
              border-radius: 6px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .stat-number {
              font-size: 24px;
              font-weight: bold;
              color: #28a745;
            }
            .stat-label {
              font-size: 12px;
              color: #666;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 15px;
              background: white;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 10px 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f8f9fa; 
              font-weight: bold;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Monthly Collection Report</h1>
            <h3>${monthlyReportData.monthName} ${monthlyReportData.year}</h3>
            <p style="color: #666; margin-top: 10px;">Comprehensive Monthly Analysis</p>
          </div>
          
          <div class="stats">
            <div class="stat-item">
              <div class="stat-number">${monthlyReportData.statistics.totalRoutes}</div>
              <div class="stat-label">Total Routes</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${monthlyReportData.statistics.completedRoutes}</div>
              <div class="stat-label">Completed Routes</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${monthlyReportData.statistics.completionRate}%</div>
              <div class="stat-label">Completion Rate</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${monthlyReportData.statistics.activeDays}</div>
              <div class="stat-label">Active Days</div>
            </div>
          </div>

          <h3>Weekly Breakdown</h3>
          <table>
            <thead>
              <tr><th>Week</th><th>Total Routes</th><th>Completion Status</th></tr>
            </thead>
            <tbody>
              ${Object.entries(monthlyReportData.weeklyData).map(([week, data]) => {
                const completed = data.schedules.filter(s => new Date(s.date) < new Date()).length;
                return `
                  <tr>
                    <td>${week}</td>
                    <td>${data.schedules.length}</td>
                    <td>${completed}/${data.schedules.length} (${data.schedules.length > 0 ? Math.round((completed/data.schedules.length)*100) : 0}%)</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <h3>Waste Type Analysis</h3>
          <table>
            <thead>
              <tr><th>Waste Type</th><th>Collections</th><th>Percentage</th></tr>
            </thead>
            <tbody>
              ${Object.entries(monthlyReportData.statistics.wasteTypeStats)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count]) => `
                  <tr>
                    <td>${type}</td>
                    <td>${count}</td>
                    <td>${Math.round((count / monthlyReportData.statistics.totalRoutes) * 100)}%</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 50px; padding: 20px; background: #f8f9fa; border-radius: 6px; text-align: center; font-size: 12px; color: #666;">
            <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
            <p>Clearo Sync - Monthly Collection Analysis Report</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => printWindow.close(), 1000);
        }, 500);
      };
    }
  };

  // Helper: parse Firestore timestamps / Date / string / number to Date or null
  const parseTimestamp = (val) => {
    if (!val && val !== 0) return null;
    // Firestore Timestamp (has toDate)
    if (val && typeof val.toDate === 'function') {
      try { return val.toDate(); } catch { return null; }
    }
    // Native Date
    if (val instanceof Date) return val;
    // Numeric (ms) or ISO string
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatTimestamp = (val) => {
    const d = parseTimestamp(val);
    return d ? d.toLocaleString() : 'Unknown';
  };

  // Helper function to check if time slot has passed for today
  const isTimeSlotPassed = (timeSlot, selectedDate) => {
    if (!selectedDate || !timeSlot) return false;
    
    const now = new Date();
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);

    // Only check for today's date (local)
    const todayOnly = new Date();
    todayOnly.setHours(0, 0, 0, 0);
    if (selectedDateOnly.getTime() !== todayOnly.getTime()) {
      return false;
    }

    // Extract time from timeSlot (e.g., "8:00 AM - 10:00 AM" or custom format)
    const timeMatch = timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) return false;

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3].toUpperCase();

    // Convert to 24-hour format
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    // Build slot time on the selected date (local)
    const slotTime = new Date(selectedDateOnly);
    slotTime.setHours(hours, minutes, 0, 0);

    return slotTime <= now;
  };

  // Helper function to get current time status for a time slot
  const getTimeSlotStatus = (timeSlot, dateArg = null) => {
    const now = new Date();
    const baseDate = dateArg ? new Date(dateArg) : new Date();
    baseDate.setHours(0, 0, 0, 0);

    // Extract start and end times from timeSlot (e.g., "8:00 AM - 10:00 AM")
    const timeRangeMatch = timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeRangeMatch) return 'upcoming';

    // Parse start time
    let startHours = parseInt(timeRangeMatch[1], 10);
    const startMinutes = parseInt(timeRangeMatch[2], 10);
    const startAmpm = timeRangeMatch[3].toUpperCase();
    if (startAmpm === 'PM' && startHours !== 12) startHours += 12;
    if (startAmpm === 'AM' && startHours === 12) startHours = 0;

    // Parse end time
    let endHours = parseInt(timeRangeMatch[4], 10);
    const endMinutes = parseInt(timeRangeMatch[5], 10);
    const endAmpm = timeRangeMatch[6].toUpperCase();
    if (endAmpm === 'PM' && endHours !== 12) endHours += 12;
    if (endAmpm === 'AM' && endHours === 12) endHours = 0;

    // Create time objects on the provided date (local)
    const startTime = new Date(baseDate);
    startTime.setHours(startHours, startMinutes, 0, 0);
    
    const endTime = new Date(baseDate);
    endTime.setHours(endHours, endMinutes, 0, 0);

    // Determine status based on current time
    if (now < startTime) {
      return 'upcoming';
    } else if (now >= startTime && now <= endTime) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  };

  const handleCustomTimeSubmit = () => {
    if (!customTimeForm.startTime || !customTimeForm.endTime) {
      alert('Please select both start and end times');
      return;
    }

    const startTime = new Date(`2000-01-01T${customTimeForm.startTime}`);
    const endTime = new Date(`2000-01-01T${customTimeForm.endTime}`);

    if (endTime <= startTime) {
      alert('End time must be after start time');
      return;
    }

    // Format custom time slot
    const formatTime = (time) => {
      return time.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    };

    const customSlot = `${formatTime(startTime)} - ${formatTime(endTime)}`;
    
    // Set the custom time slot for the road
    handleTimeSlotChange(customTimeForRoad, customSlot);
    setCustomTimeSlots({
      ...customTimeSlots,
      [customTimeForRoad]: customSlot
    });

    // Close modal and reset form
    setShowCustomTimeModal(false);
    setCustomTimeForRoad(null);
    setCustomTimeForm({ startTime: '', endTime: '' });
  };

  // Edit schedule handler
  const handleEditSchedule = (schedule) => {
    setEditingScheduleId(schedule.id);
    setEditScheduleData({
      wasteType: schedule.wasteType,
      timeSlot: schedule.timeSlot,
      roadId: schedule.roadId,
    });
  };

  const handleSaveScheduleEdit = async (scheduleId) => {
    try {
      await updateDoc(doc(db, 'schedules', scheduleId), {
        wasteType: editScheduleData.wasteType,
        timeSlot: editScheduleData.timeSlot,
        roadId: editScheduleData.roadId,
        roadName: roads.find(r => r.id === editScheduleData.roadId)?.name || 'Unknown Road',
        updatedAt: new Date(),
      });
      setEditingScheduleId(null);
      setEditScheduleData({});
      await fetchSchedules();
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  // Generate report for completed schedule
  const handleGenerateReport = () => {
    setShowReportModal(true);
  };

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setReportPhotos(prev => [...prev, {
              id: Date.now() + Math.random(),
              file: file,
              preview: e.target.result,
              name: file.name
            }]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const handleRemovePhoto = (photoId) => {
    setReportPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const handleDownloadPDF = () => {
    // Create PDF content
    const reportContent = {
      title: `${getSchedulesForDate(selectedCalendarDate)[0]?.wasteType || 'Waste'} Collection Report`,
      date: selectedCalendarDate?.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      schedules: getSchedulesForDate(selectedCalendarDate),
      notes: reportNotes || notes,
      photos: reportPhotos,
      stats: {
        totalRoutes: getSchedulesForDate(selectedCalendarDate).length,
        completed: getSchedulesForDate(selectedCalendarDate).length,
        pending: 0,
        issues: 0
      }
    };

    // Create a simple HTML for PDF generation
    const htmlContent = `
      <html>
        <head>
          <title>Collection Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #007bff;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #007bff;
              margin-bottom: 10px;
            }
            .stats { 
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin: 30px 0;
              padding: 20px;
              background-color: #f8f9fa;
              border-radius: 8px;
            }
            .stat-item { 
              text-align: center;
              padding: 15px;
              background: white;
              border-radius: 6px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .stat-item h2 {
              margin: 0 0 5px 0;
              font-size: 24px;
              color: #007bff;
            }
            .stat-item p {
              margin: 0;
              font-size: 12px;
              color: #666;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 30px;
              background: white;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f8f9fa; 
              font-weight: bold;
              color: #333;
            }
            .section-title {
              color: #007bff;
              border-bottom: 2px solid #007bff;
              padding-bottom: 10px;
              margin-bottom: 20px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportContent.title}</h1>
            <h3>${reportContent.date}</h3>
          </div>
          
          <div class="stats">
            <div class="stat-item">
              <div class="stat-number">${reportContent.stats.totalRoutes}</div>
              <div class="stat-label">Total Routes</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${reportContent.stats.completed}</div>
              <div class="stat-label">Completed</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${reportContent.stats.pending}</div>
              <div class="stat-label">Pending</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${reportContent.stats.issues}</div>
              <div class="stat-label">Issues</div>
            </div>
          </div>

          <h3 class="section-title">📋 Schedule Details</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Road Name</th>
                <th style="width: 35%;">Assigned Time Slot</th>
                <th style="width: 25%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportContent.schedules.map(schedule => {
                const road = roads.find(r => r.id === schedule.roadId);
                return `
                  <tr>
                    <td><strong>${road?.name || 'Unknown Road'}</strong></td>
                    <td>${schedule.timeSlot}</td>
                    <td><span style="background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-size: 11px;">✅ Completed</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div style="margin-top: 50px; padding: 20px; background: #f8f9fa; border-radius: 6px; text-align: center; font-size: 12px; color: #666;">
            <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
            <p>Clearo Sync - Waste Collection Management System</p>
          </div>
        </body>
      </html>
    `;

    // Create and download PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for images to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          
          // Clean up
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 500);
      };
    }

    setShowReportModal(false);
    setReportNotes('');
    setReportPhotos([]);
  };

  // Helper functions for weekly and monthly reports
  const getWeekRange = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day; // First day is Sunday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  };

  const getMonthRange = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  };

  const generateWeeklyReport = () => {
    const { start, end } = getWeekRange(selectedWeek);
    const weekSchedules = schedules.filter(schedule => {
      const schedDate = new Date(schedule.date);
      return schedDate >= start && schedDate <= end;
    });

    // Group by date
    const dailyData = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
      dailyData[dateStr] = {
        date: new Date(d),
        schedules: weekSchedules.filter(s => s.date === dateStr),
        dayName: d.toLocaleDateString('en-US', { weekday: 'long' })
      };
    }

    // Calculate statistics
    const wasteTypeStats = {};
    const roadStats = {};
    const categoryStats = {};
    let completedRoutes = 0;
    let totalRoutes = weekSchedules.length;

    weekSchedules.forEach(schedule => {
      // Waste type stats
      wasteTypeStats[schedule.wasteType] = (wasteTypeStats[schedule.wasteType] || 0) + 1;
      
      // Road stats
      const road = roads.find(r => r.id === schedule.roadId);
      if (road) {
        roadStats[road.name] = (roadStats[road.name] || 0) + 1;
        
        // Category stats
        const category = road.categoryId ? 
          (roadCategories.find(c => c.id === road.categoryId)?.name || 'Uncategorized') : 
          'Uncategorized';
        categoryStats[category] = (categoryStats[category] || 0) + 1;
      }
      
      // Check if completed (assume past dates are completed)
      const schedDate = new Date(schedule.date);
      if (schedDate < new Date()) {
        completedRoutes++;
      }
    });

    return {
      period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      dailyData,
      statistics: {
        totalRoutes,
        completedRoutes,
        pendingRoutes: totalRoutes - completedRoutes,
        completionRate: totalRoutes > 0 ? Math.round((completedRoutes / totalRoutes) * 100) : 0,
        wasteTypeStats,
        roadStats,
        categoryStats,
        activeDays: Object.values(dailyData).filter(day => day.schedules.length > 0).length
      }
    };
  };

  const generateMonthlyReport = () => {
    const { start, end } = getMonthRange(selectedMonth);
    const monthSchedules = schedules.filter(schedule => {
      const schedDate = new Date(schedule.date);
      return schedDate >= start && schedDate <= end;
    });

    // Group by week
    const weeklyData = {};
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
      const weekStart = new Date(d);
      const weekEnd = new Date(d);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      if (weekEnd > end) weekEnd.setTime(end.getTime());
      
      const weekKey = `Week of ${weekStart.toLocaleDateString()}`;
      
      weeklyData[weekKey] = {
        start: weekStart,
        end: weekEnd,
        schedules: monthSchedules.filter(schedule => {
          const schedDate = new Date(schedule.date);
          return schedDate >= weekStart && schedDate <= weekEnd;
        })
      };
    }s

    // Calculate comprehensive statistics
    const wasteTypeStats = {};
    const roadStats = {};
    const categoryStats = {};
    const dailyStats = {};
    let completedRoutes = 0;
    let totalRoutes = monthSchedules.length;
    let issues = 0;

    monthSchedules.forEach(schedule => {
      // Waste type stats
      wasteTypeStats[schedule.wasteType] = (wasteTypeStats[schedule.wasteType] || 0) + 1;
      
      // Road stats
      const road = roads.find(r => r.id === schedule.roadId);
      if (road) {
        roadStats[road.name] = (roadStats[road.name] || 0) + 1;
        
        // Category stats
        const category = road.categoryId ? 
          (roadCategories.find(c => c.id === road.categoryId)?.name || 'Uncategorized') : 
          'Uncategorized';
        categoryStats[category] = (categoryStats[category] || 0) + 1;
      }
      
      // Daily stats
      const dayName = new Date(schedule.date).toLocaleDateString('en-US', { weekday: 'long' });
      dailyStats[dayName] = (dailyStats[dayName] || 0) + 1;
      
      // Check completion
      const schedDate = new Date(schedule.date);
      if (schedDate < new Date()) {
        completedRoutes++;
      }
    });

    // Get special plans for the month
    const monthSpecialPlans = specialPlans.filter(plan => {
      const planDate = new Date(plan.date);
      return planDate >= start && planDate <= end;
    });

    return {
      period: `${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      monthName: start.toLocaleDateString('en-US', { month: 'long' }),
      year: start.getFullYear(),
      weeklyData,
      statistics: {
        totalRoutes,
        completedRoutes,
        pendingRoutes: totalRoutes - completedRoutes,
        completionRate: totalRoutes > 0 ? Math.round((completedRoutes / totalRoutes) * 100) : 0,
        wasteTypeStats,
        roadStats,
        categoryStats,
        dailyStats,
        activeDays: new Set(monthSchedules.map(s => s.date)).size,
        totalSpecialPlans: monthSpecialPlans.length,
        completedSpecialPlans: monthSpecialPlans.filter(p => p.completed).length,
        issues: issues
      }
    };
  };

  const handleGenerateWeeklyReport = () => {
    const reportData = generateWeeklyReport();
    setWeeklyReportData(reportData);
    setShowWeeklyReportModal(true);
  };

  const handleGenerateMonthlyReport = () => {
    const reportData = generateMonthlyReport();
    setMonthlyReportData(reportData);
    setShowMonthlyReportModal(true);
  };

  // Add function to render schedule summary
  const renderScheduleSummary = () => {
    if (!selectedCalendarDate) return null;

    const daySchedules = getSchedulesForDate(selectedCalendarDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(selectedCalendarDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    const isToday = selectedDateOnly.getTime() === today.getTime();
    const isPast = selectedDateOnly < today;
    const isFuture = selectedDateOnly > today;

    return (
      <div className="mt-8 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        <div className={`p-6 border-b border-gray-200 ${
          isPast ? 'bg-gradient-to-r from-gray-50 to-gray-100' :
          isToday ? 'bg-gradient-to-r from-blue-50 to-blue-100' :
          'bg-gradient-to-r from-green-50 to-emerald-50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
            {/* ...existing content inside this div... */}
            </div>
            {/* ...existing content inside this div... */}
            <h3 className="text-xl font-bold text-gray-800">
              Schedule Summary for {selectedCalendarDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {isPast ? (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                  Past Schedule - Completed
                </span>
              ) : isToday ? (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                  Today's Schedule
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Upcoming Schedule - Planned
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              daySchedules.length > 0 ? 
                isPast ? 'bg-gray-100 text-gray-800' :
                isToday ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
            }`}>
              {daySchedules.length} Schedule{daySchedules.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Notes for previous day */}
        {isPast && (
          <div className="p-6 border-b border-gray-100 bg-yellow-50">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-yellow-800">Schedule Management for {selectedCalendarDate.toLocaleDateString()}</h4>
              <button
                onClick={handleGenerateReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <FaEdit className="mr-2" />
                Generate Report
              </button>
            </div>
          </div>
        )}

        {/* Notes Section for Future dates only */}
        {isFuture && (
          <div className="p-6 border-b border-gray-100 bg-blue-50">
            <div className="grid grid-cols-1 gap-6">
              {/* Notes Section Only */}
              <div>
                <h4 className="font-semibold text-blue-800 mb-4">Notes for this Date</h4>
                <div className="space-y-3">
                  <textarea
                    value={dateNotes}
                    onChange={(e) => setDateNotes(e.target.value)}
                    className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                    rows="4"
                    placeholder="Add notes for this scheduled date..."
                  />
                  <button
                    onClick={handleSaveDateNotes}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm"
                  >
                    <FaSave className="mr-2" />
                    Save Notes
                  </button>
                  {savedDateNotes[formatDate(selectedCalendarDate)] && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 text-sm font-medium">✓ Notes saved successfully</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {daySchedules.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-4 h-4 ${getWasteTypeInfo(daySchedules[0]?.wasteType).color} rounded-full mr-2`}></div>
                  {editingWasteTypeForDate ? (
                    <div className="flex items-center space-x-3">
                      <select
                        value={selectedDateWasteType}
                        onChange={(e) => setSelectedDateWasteType(e.target.value)}
                        className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {wasteTypes.map(wasteType => (
                          <option key={wasteType.name} value={wasteType.name}>{wasteType.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleSaveDateWasteType}
                        className="text-green-600 hover:text-green-700 p-1"
                        title="Save waste type change"
                      >
                        <FaSave />
                      </button>
                      <button
                        onClick={() => {
                          setEditingWasteTypeForDate(false);
                          setSelectedDateWasteType('');
                        }}
                        className="text-gray-500 hover:text-gray-700 p-1"
                        title="Cancel"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <h4 className="text-lg font-semibold text-gray-800">
                        {daySchedules[0]?.wasteType} Collection Schedule
                      </h4>
                      {/* Show category information in schedule summary */}
                      {(() => {
                        // Get unique categories from the day's schedules
                        const categoryIds = [...new Set(daySchedules.map(schedule => {
                          const road = roads.find(r => r.id === schedule.roadId);
                          return road?.categoryId || 'uncategorized';
                        }))];
                        
                        if (categoryIds.length === 1) {
                          const categoryId = categoryIds[0];
                          if (categoryId === 'uncategorized') {
                            return (
                              <div className="flex items-center mt-1">
                                <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
                                <span className="text-sm text-gray-600">Category: Uncategorized</span>
                              </div>
                            );
                          } else {
                            const category = roadCategories.find(c => c.id === categoryId);
                            return (
                              <div className="flex items-center mt-1">
                                <div className={`w-3 h-3 ${category?.color || 'bg-gray-300'} rounded-full mr-2`}></div>
                                <span className="text-sm text-gray-600">Category: {category?.name || 'Unknown'}</span>
                              </div>
                            );
                          }
                        } else if (categoryIds.length > 1) {
                          return (
                            <div className="flex items-center mt-1">
                              <div className="flex -space-x-1 mr-2">
                                {categoryIds.slice(0, 3).map((catId, idx) => {
                                  const category = roadCategories.find(c => c.id === catId);
                                  return (
                                    <div 
                                      key={idx}
                                      className={`w-3 h-3 ${catId === 'uncategorized' ? 'bg-gray-300' : (category?.color || 'bg-gray-300')} rounded-full border border-white`}
                                    ></div>
                                  );
                                })}
                                {categoryIds.length > 3 && (
                                  <div className="w-3 h-3 bg-gray-400 rounded-full border border-white flex items-center justify-center">
                                    <span className="text-xs text-white">+</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-sm text-gray-600">
                                Categories: {categoryIds.length} mixed
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
                {!isPast && !editingWasteTypeForDate && (
                  <button
                    onClick={handleEditDateWasteType}
                    className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit waste type for all schedules on this date"
                  >
                    <FaEdit className="text-sm" />
                  </button>
                )}
              </div>
              {editingWasteTypeForDate && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center text-sm text-blue-800">
                    <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                    <span className="font-medium">Editing waste type for all {daySchedules.length} schedule{daySchedules.length > 1 ? 's' : ''} on this date</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Schedule Details</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Road Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned Time Slot
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {daySchedules.map((schedule, index) => {
                      const road = roads.find(r => r.id === schedule.roadId);
                      return (
                        <tr key={schedule.id || index}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <div className="flex items-center">
                              <FaMapMarkerAlt className="text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">
                                {road?.name || 'Unknown Road'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <div className="flex items-center">
                              <FaClock className="text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">{schedule.timeSlot}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                              Completed
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className={`text-6xl mb-4 ${
              isPast ? 'text-gray-300' : 'text-gray-300'
            }`}>
              <FaCalendarAlt className="mx-auto" />
            </div>
            
            {isPast ? (
              <div>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">No Past Schedule Found</h4>
                <p className="text-gray-500 mb-6">
                  There were no waste collection schedules for this past date.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                  <div className="flex items-center">
                    <div className="text-yellow-600 mr-3">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-yellow-800">Cannot Schedule Past Dates</p>
                      <p className="text-xs text-yellow-700 mt-1">Schedules can only be created for today or future dates.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">No Schedule Found</h4>
                <p className="text-gray-500 mb-6">
                  There are no waste collection schedules for this date. Create a new schedule to get started.
                </p>
                <button
                  onClick={() => handleDateClick(selectedCalendarDate.getDate())}
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <FaPlus className="mr-2" />
                  Create Schedule
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <h2 className="text-2xl font-bold text-green-700 mb-6 flex items-center">
          <FaCalendarAlt className="mr-3" />
          Waste Collection Schedules
        </h2>

        <div className="bg-green-50 p-6 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-green-600 mb-2">Schedule Management</h3>
              <p className="text-gray-600">Manage waste collection schedules and routes for different areas.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleGenerateWeeklyReport}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <FaCalendarAlt className="mr-2" />
                Weekly Report
              </button>
              <button
                onClick={handleGenerateMonthlyReport}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
              >
                <FaCalendarAlt className="mr-2" />
                Monthly Report
              </button>
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <h4 className="text-lg font-bold text-blue-800 mb-3">Today's Collections</h4>
          <div className="space-y-2">
            {getTodaySchedules().length > 0 ? (
              <>
                {/* Waste Type Label */}
                <div className="flex items-center mb-3 p-2 bg-white rounded-lg border border-blue-200">
                  <div className={`w-4 h-4 ${getWasteTypeInfo(getTodaySchedules()[0]?.wasteType).color} rounded-full mr-2`}></div>
                  <span className="text-blue-800 font-medium">{getTodaySchedules()[0]?.wasteType} Collection</span>
                </div>
                
                {getTodaySchedules().map((schedule, index) => {
                  const road = roads.find(r => r.id === schedule.roadId);
                  return (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <FaMapMarkerAlt className="text-blue-400 mr-2" />
                        <span className="text-blue-700">{road?.name}</span>
                      </div>
                      <span className="bg-blue-300 text-white px-2 py-1 rounded text-sm">{schedule.timeSlot}</span>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-blue-600">No collections scheduled for today</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-bold text-green-800">Today's Special Plans</h4>
            <button
              onClick={() => setShowSpecialPlanModal(true)}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center"
            >
              <FaPlus className="mr-1 text-xs" />
              Add Plan
            </button>
          </div>
          <div className="space-y-2">
            {getTodaySpecialPlans().length > 0 ? (
            getTodaySpecialPlans().map((plan, index) => (
                <div
                  key={index}
                  className={`bg-white p-3 rounded-lg border border-green-200 shadow-sm flex items-start justify-between ${
                    plan.completed ? 'opacity-80' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={!!plan.completed}
                      onChange={() => toggleSpecialPlanCompletion(plan)}
                      className="mt-1 h-4 w-4 text-green-600 rounded"
                      aria-label={`Mark ${plan.title} as completed`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <h5 className={`font-semibold ${plan.completed ? 'line-through text-gray-500' : 'text-green-800'}`}>{plan.title}</h5>
                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(plan.priority)}`}>
                          {plan.priority}
                        </span>
                      </div>
                      {plan.description && (
                        <p className={`text-sm leading-relaxed ${plan.completed ? 'text-gray-400 line-through' : 'text-green-600'}`}>{plan.description}</p>
                      )}
                      {plan.completed && (
                        <p className="text-xs text-gray-500 mt-2">
                          Completed on: {formatTimestamp(plan.completedAt || plan.updatedAt || plan.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setShowSpecialPlanModal(true);
                        setSpecialPlanForm({ title: plan.title, description: plan.description, priority: plan.priority });
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded"
                      title="Edit Plan"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Delete this special plan?')) {
                          try {
                            await deleteDoc(doc(db, 'specialPlans', plan.id));
                            await fetchSpecialPlans();
                          } catch (err) {
                            console.error('Error deleting plan:', err);
                          }
                        }
                      }}
                      className="text-red-600 hover:text-red-800 p-1 rounded"
                      title="Delete Plan"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
            ))
            ) : (
              <div>
                <p className="text-green-600 font-medium">No special plans for today</p>
                <p className="text-green-500 text-sm mt-1">Click "Add Plan" to create one</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Collection Calendar</h3>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Click</span> to view • <span className="font-medium">Double-click</span> to create schedule
            </div>
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

        {/* Waste Type Color Legend */}
        <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Waste Type Color Legend</h4>
            <span className="text-xs text-gray-500">Calendar color coding reference</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {wasteTypes.map((wasteType, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${wasteType.color} flex-shrink-0`}></div>
                <span className="text-xs text-gray-600 truncate">{wasteType.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Summary Section */}
      {renderScheduleSummary()}

      {/* Roads Management Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Road Management</h3>
            <p className="text-gray-600 text-sm mt-1">Manage collection routes and road priorities</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center text-sm"
              title="Manage Categories"
            >
              Categories
            </button>
            <button
              onClick={() => setShowRoadModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center shadow-md hover:shadow-lg transition-all"
            >
              <FaPlus className="mr-2" />
              Add Road
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Road Information
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Priority Level
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roads.length > 0 ? (
                  roads.map((road) => (
                    <tr key={road.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <FaMapMarkerAlt className="text-green-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{road.name}</div>
                            <div className="text-xs text-gray-500">
                              {road.categoryName || (road.categoryId ? (roadCategories.find(c => c.id === road.categoryId)?.name || 'Uncategorized') : 'Uncategorized')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(road.priority)}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            road.priority === 'high' ? 'bg-red-500' :
                            road.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}></div>
                          {(road.priority || 'medium').charAt(0).toUpperCase() + (road.priority || 'medium').slice(1)} Priority
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {road.categoryId ? (
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${roadCategories.find(c => c.id === road.categoryId)?.color || 'bg-gray-300'} mr-2`}></div>
                            <span className="text-sm text-gray-900">{roadCategories.find(c => c.id === road.categoryId)?.name || 'Unknown Category'}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No category assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEditRoad(road)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Road"
                          >
                            <FaEdit className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoad(road.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Road"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FaMapMarkerAlt className="text-gray-400 text-2xl" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Roads Added Yet</h3>
                        <p className="text-gray-500 mb-4">Start by adding your first collection route</p>
                        <button
                          onClick={() => setShowRoadModal(true)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                        >
                          <FaPlus className="mr-2" />
                          Add First Road
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Waste Type Management Section - Enhanced Horizontal Cards */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <FaRecycle className="mr-2 text-green-600" />
              Waste Types Management
            </h3>
            <p className="text-gray-600 text-sm mt-1">Manage different types of waste for collection scheduling</p>
          </div>
          <button
            onClick={() => setShowWasteTypeModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-md hover:shadow-lg transition-all"
          >
            <FaPlus className="mr-2" />
            Add Waste Type
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {wasteTypes.length > 0 ? (
            <div className="p-6">
              <div className="flex flex-wrap gap-4 justify-start">
                {wasteTypes.map((wasteType, index) => (
                  <div 
                    key={wasteType.id || index} 
                    className={`relative group flex items-center ${wasteType.bgColor} ${wasteType.textColor} px-6 py-4 rounded-xl border-2 border-transparent hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md min-w-[180px] cursor-pointer`}
                  >
                    {/* Colored Circle Indicator */}
                    <div className={`w-5 h-5 ${wasteType.color} rounded-full mr-3 flex-shrink-0 shadow-sm`}></div>
                    
                    {/* Waste Type Name */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-base">{wasteType.name}</h4>
                      <p className="text-xs opacity-75 mt-1">Collection Type</p>
                    </div>

                    {/* Action Buttons - Show on Hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                      {wasteType.id && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditWasteType(wasteType);
                            }}
                            className="p-1.5 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full text-blue-600 hover:text-blue-700 transition-colors shadow-sm"
                            title="Edit Waste Type"
                          >
                            <FaEdit className="text-xs" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWasteType(wasteType.id);
                            }}
                            className="p-1.5 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full text-red-600 hover:text-red-700 transition-colors shadow-sm"
                            title="Delete Waste Type"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Usage Count Badge */}
                    <div className="absolute -top-2 -right-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-gray-400 rounded-full shadow-sm">
                        {schedules.filter(s => s.wasteType === wasteType.name).length}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{wasteTypes.length}</div>
                    <div className="text-sm text-gray-600">Total Waste Types</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {wasteTypes.filter(wt => schedules.some(s => s.wasteType === wt.name)).length}
                    </div>
                    <div className="text-sm text-gray-600">Active Types</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {schedules.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Schedules</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FaRecycle className="text-gray-400 text-2xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Waste Types Added Yet</h3>
                <p className="text-gray-500 mb-4">Start by adding your first waste type for collection scheduling</p>
                <button
                  onClick={() => setShowWasteTypeModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center shadow-md hover:shadow-lg transition-all"
                >
                  <FaPlus className="mr-2" />
                  Add First Waste Type
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Road Categories Management Section */}
      <div className="mt-8 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <FaTag className="mr-2 text-purple-600" />
              Road Categories
            </h3>
            <p className="text-gray-600 text-sm mt-1">Organize roads into categories for better management</p>
          </div>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center shadow-md hover:shadow-lg transition-all"
          >
            <FaPlus className="mr-2" />
            Add Category
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {roadCategories.length > 0 ? (
            <div className="p-6">
              <div className="flex flex-wrap gap-4 justify-start">
                {roadCategories.map((category) => (
                  <div 
                    key={category.id} 
                    className="relative group flex items-center bg-gray-50 hover:bg-gray-100 px-6 py-4 rounded-xl border-2 border-transparent hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md min-w-[160px] cursor-pointer"
                  >
                    {/* Colored Circle Indicator */}
                    <div className={`w-5 h-5 ${category.color || 'bg-gray-300'} rounded-full mr-3 flex-shrink-0 shadow-sm`}></div>
                    
                    {/* Category Name */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-base text-gray-900">{category.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {roads.filter(r => r.categoryId === category.id).length} roads
                      </p>
                    </div>

                    {/* Action Buttons - Show on Hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCategory(category);
                        }}
                        className="p-1.5 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full text-blue-600 hover:text-blue-700 transition-colors shadow-sm"
                        title="Edit Category"
                      >
                        <FaEdit className="text-xs" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id);
                        }}
                        className="p-1.5 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full text-red-600 hover:text-red-700 transition-colors shadow-sm"
                        title="Delete Category"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Uncategorized Roads Card */}
                {roads.filter(r => !r.categoryId).length > 0 && (
                  <div className="flex items-center bg-gray-50 px-6 py-4 rounded-xl border-2 border-dashed border-gray-300 min-w-[160px]">
                    <div className="w-5 h-5 bg-gray-300 rounded-full mr-3 flex-shrink-0"></div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-base text-gray-700">Uncategorized</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {roads.filter(r => !r.categoryId).length} roads
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <FaTag className="text-gray-400 text-xl" />
                </div>
                <h3 className="text-md font-semibold text-gray-700 mb-1">No Categories Yet</h3>
                <p className="text-gray-500 text-sm mb-3">Create categories to organize your roads</p>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center text-sm"
                >
                  <FaPlus className="mr-1" />
                  Add Category
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Schedule Modal - SCROLLABLE */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh] relative">
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
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-6 space-y-8">
                {/* Step 1: Select Waste Type */}
                <div>
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

                {/* Step 2: Select Category */}
                {selectedWasteType && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold">2</div>
                      Select Road Category
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {roadCategories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategorySelect(category.id)}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                            selectedCategory === category.id
                              ? `bg-blue-100 border-blue-500 text-blue-800 scale-105 shadow-lg`
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-md'
                          }`}
                        >
                          <div className={`w-4 h-4 ${category.color || 'bg-gray-300'} rounded-full mx-auto mb-2`}></div>
                          <div className="text-sm font-semibold text-center">{category.name}</div>
                          <div className="text-xs text-gray-500 text-center mt-1">
                            {roads.filter(road => road.categoryId === category.id).length} roads
                          </div>
                        </button>
                      ))}
                      {/* Option for uncategorized roads */}
                      <button
                        onClick={() => handleCategorySelect('uncategorized')}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                          selectedCategory === 'uncategorized'
                            ? `bg-gray-100 border-gray-500 text-gray-800 scale-105 shadow-lg`
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto mb-2"></div>
                        <div className="text-sm font-semibold text-center">Uncategorized</div>
                        <div className="text-xs text-gray-500 text-center mt-1">
                          {roads.filter(road => !road.categoryId).length} roads
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Select Roads (filtered by category) */}
                {selectedWasteType && selectedCategory && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold">3</div>
                      Available Roads
                      {selectedCategory !== 'uncategorized' && (
                        <span className="ml-2 text-sm text-gray-600">
                          ({roadCategories.find(c => c.id === selectedCategory)?.name})
                        </span>
                      )}
                    </h3>
                    
                    {/* Available Roads Section - filtered by category */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {roads
                          .filter(road => {
                            if (selectedCategory === 'uncategorized') {
                              return !road.categoryId && !selectedRoads.find(sr => sr.id === road.id);
                            }
                            return road.categoryId === selectedCategory && !selectedRoads.find(sr => sr.id === road.id);
                          })
                          .map((road) => (
                          <div key={road.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center flex-1 min-w-0">
                              <FaMapMarkerAlt className="text-gray-400 mr-2 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate">{road.name}</div>
                                <div className="text-sm text-gray-500 truncate">
                                  {road.categoryName || (road.categoryId ? (roadCategories.find(c => c.id === road.categoryId)?.name || 'Unknown') : 'Uncategorized')}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddRoad(road)}
                              className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors flex-shrink-0 ml-2"
                            >
                              <FaPlus className="text-sm" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {roads.filter(road => {
                        if (selectedCategory === 'uncategorized') {
                          return !road.categoryId && !selectedRoads.find(sr => sr.id === road.id);
                        }
                        return road.categoryId === selectedCategory && !selectedRoads.find(sr => sr.id === road.id);
                      }).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          {selectedRoads.length > 0 ? 'All roads in this category have been selected' : 'No roads found in this category'}
                        </div>
                      )}
                    </div>

                    {/* Selected Roads */}
                    {selectedRoads.length > 0 && (
                      <div className="bg-blue-50 rounded-xl p-4">
                        <h4 className="font-semibold text-blue-800 mb-3">Selected Roads ({selectedRoads.length})</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedRoads.map((road) => (
                            <div key={road.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
                              <div className="flex items-center flex-1 min-w-0">
                                <FaCheck className="text-green-500 mr-2 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 truncate">{road.name}</div>
                                  <div className="text-sm text-gray-500 truncate">
                                    {road.categoryName || (road.categoryId ? (roadCategories.find(c => c.id === road.categoryId)?.name || 'Unknown') : 'Uncategorized')}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveRoad(road.id)}
                                className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors flex-shrink-0 ml-2"
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

                {/* Step 4: Set Time Slots (updated step number) */}
                {selectedRoads.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold">4</div>
                      Schedule Plan ({selectedRoads.length} roads)
                    </h3>
                    <div className="space-y-4 max-h-72 overflow-y-auto">
                      {selectedRoads.map((road) => (
                        <div key={road.id} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center flex-1 min-w-0">
                              <FaMapMarkerAlt className="text-gray-400 mr-2 flex-shrink-0" />
                              <span className="font-semibold text-gray-900 truncate">{road.name}</span>
                            </div>
                            <FaClock className="text-gray-400 flex-shrink-0" />
                          </div>
                          <div className="space-y-3">
                            {/* Time Slot Selection */}
                            {roadTimeSlots[road.id] === 'Custom Time' ? (
                              <div className="flex flex-col md:flex-row md:items-center gap-2">
                                <input
                                  type="time"
                                  value={customTimeSlots[road.id]?.startTime || ''}
                                  onChange={e => {
                                    setCustomTimeSlots(prev => ({
                                      ...prev,
                                      [road.id]: {
                                        ...prev[road.id],
                                        startTime: e.target.value
                                      }
                                    }));
                                  }}
                                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Start Time"
                                />
                                <span className="mx-2 text-gray-500">to</span>
                                <input
                                  type="time"
                                  value={customTimeSlots[road.id]?.endTime || ''}
                                  onChange={e => {
                                    setCustomTimeSlots(prev => ({
                                      ...prev,
                                      [road.id]: {
                                        ...prev[road.id],
                                        endTime: e.target.value
                                      }
                                    }));
                                  }}
                                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="End Time"
                                  min={customTimeSlots[road.id]?.startTime || ''}
                                />
                                <button
                                  className="ml-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                  disabled={
                                    !customTimeSlots[road.id]?.startTime ||
                                    !customTimeSlots[road.id]?.endTime ||
                                    customTimeSlots[road.id]?.endTime <= customTimeSlots[road.id]?.startTime
                                  }
                                  onClick={() => {
                                    // Format custom time slot and set as time slot
                                    const start = new Date(`2000-01-01T${customTimeSlots[road.id]?.startTime}`);
                                    const end = new Date(`2000-01-01T${customTimeSlots[road.id]?.endTime}`);
                                    const formatTime = (time) =>
                                      time.toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true,
                                      });
                                    const customSlot = `${formatTime(start)} - ${formatTime(end)}`;
                                    handleTimeSlotChange(road.id, customSlot);
                                    setCustomTimeSlots(prev => ({
                                      ...prev,
                                      [road.id]: {
                                        startTime: customTimeSlots[road.id]?.startTime,
                                        endTime: customTimeSlots[road.id]?.endTime,
                                        formatted: customSlot
                                      }
                                    }));
                                  }}
                                >
                                  Set
                                </button>
                                <button
                                  className="ml-2 px-2 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                  onClick={() => {
                                    handleTimeSlotChange(road.id, '');
                                    setCustomTimeSlots(prev => {
                                      const updated = { ...prev };
                                      delete updated[road.id];
                                      return updated;
                                    });
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <select
                                value={roadTimeSlots[road.id] || ''}
                                onChange={(e) => {
                                  if (e.target.value === 'Custom Time') {
                                    handleTimeSlotChange(road.id, 'Custom Time');
                                  } else {
                                    handleTimeSlotChange(road.id, e.target.value);
                                  }
                                }}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              >
                                <option value="">Select Time Slot</option>
                                {timeSlots.map((slot) => {
                                  const isPassed = isTimeSlotPassed(slot, selectedDate);
                                  return (
                                    <option 
                                      key={slot} 
                                      value={slot}
                                      disabled={isPassed}
                                      style={isPassed ? { color: '#9CA3AF', backgroundColor: '#F3F4F6' } : {}}
                                    >
                                      {slot} {isPassed ? '(Passed)' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            )}

                            {/* Show warning for passed time slots */}
                            {roadTimeSlots[road.id] && isTimeSlotPassed(roadTimeSlots[road.id], selectedDate) && (
                              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="text-yellow-600 mr-2">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div className="text-sm">
                                  <p className="font-medium text-yellow-800">Time slot has passed</p>
                                  <p className="text-yellow-700">This time slot is no longer available for today. Please select a future time or use custom time.</p>
                                </div>
                              </div>
                            )}

                            {/* Show custom time slot summary if set */}
                            {customTimeSlots[road.id]?.formatted && (
                              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg mt-2">
                                <div className="flex items-center">
                                  <FaClock className="text-blue-600 mr-2" />
                                  <span className="text-sm font-medium text-blue-800">
                                    Custom Time: {customTimeSlots[road.id]?.formatted}
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    handleTimeSlotChange(road.id, '');
                                    setCustomTimeSlots(prev => {
                                      const updated = { ...prev };
                                      delete updated[road.id];
                                      return updated;
                                    });
                                  }}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 5: Schedule Summary (updated step number) */}
                {selectedWasteType && selectedCategory && selectedRoads.length > 0 && Object.keys(roadTimeSlots).some(key => roadTimeSlots[key]) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold">5</div>
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
                            <span className="font-medium text-gray-700">Category:</span>
                            <div className="flex items-center">
                              {selectedCategory === 'uncategorized' ? (
                                <>
                                  <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
                                  <span className="text-gray-900">Uncategorized</span>
                                </>
                              ) : (
                                <>
                                  <div className={`w-3 h-3 ${roadCategories.find(c => c.id === selectedCategory)?.color || 'bg-gray-300'} rounded-full mr-2`}></div>
                                  <span className="text-gray-900">{roadCategories.find(c => c.id === selectedCategory)?.name}</span>
                                </>
                              )}
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
                          <div className="space-y-2 max-h-40 overflow-y-auto">
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
                  disabled={!selectedWasteType || !selectedCategory || selectedRoads.length === 0 || !Object.values(roadTimeSlots).some(slot => slot)}
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

      {/* Custom Time Modal - always in front of schedule modal */}
      {showCustomTimeModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-black bg-opacity-50 absolute inset-0"></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Set Custom Time</h3>
                  <p className="text-blue-100 text-sm mt-1">Choose your preferred time slot</p>
                </div>
                <button
                  onClick={() => {
                    setShowCustomTimeModal(false);
                    setCustomTimeForRoad(null);
                    setCustomTimeForm({ startTime: '', endTime: '' });
                  }}
                  className="text-blue-100 hover:text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={customTimeForm.startTime}
                    onChange={(e) => setCustomTimeForm({ ...customTimeForm, startTime: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Start Time"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={customTimeForm.endTime}
                    onChange={(e) => setCustomTimeForm({ ...customTimeForm, endTime: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="End Time"
                    min={customTimeForm.startTime || new Date().toTimeString().slice(0, 5)}
                  />
                </div>

                {/* Time validation message */}
                {customTimeForm.startTime && customTimeForm.endTime && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <FaClock className="text-green-600 mr-2" />
                      <span className="text-sm text-green-800 font-medium">
                        Duration: {(() => {
                          const start = new Date(`2000-01-01T${customTimeForm.startTime}`);
                          const end = new Date(`2000-01-01T${customTimeForm.endTime}`);
                          const diff = (end - start) / (1000 * 60);
                          const hours = Math.floor(diff / 60);
                          const minutes = diff % 60;
                          return `${hours}h ${minutes}m`;
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCustomTimeModal(false);
                    setCustomTimeForRoad(null);
                    setCustomTimeForm({ startTime: '', endTime: '' });
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomTimeSubmit}
                  disabled={!customTimeForm.startTime || !customTimeForm.endTime}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <FaSave className="mr-2" />
                  Set Time
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Road Modal */}
      {showRoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <FaMapMarkerAlt className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {editingRoad ? 'Edit Road' : 'Add New Road'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {editingRoad ? 'Update road information' : 'Add a new collection route'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRoadModal(false);
                  setEditingRoad(null);
                  setRoadForm({ name: '', priority: 'medium', categoryId: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleRoadSubmit}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Road Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roadForm.name}
                    onChange={(e) => setRoadForm({...roadForm, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Main Street, Park Avenue, Highway 101"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority Level</label>
                  <select
                    value={roadForm.priority}
                    onChange={(e) => setRoadForm({...roadForm, priority: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="high">High Priority - Critical Route</option>
                    <option value="medium">Medium Priority - Standard Route</option>
                    <option value="low">Low Priority - Optional Route</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Priority determines scheduling order and resource allocation
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    value={roadForm.categoryId}
                    onChange={(e) => setRoadForm({...roadForm, categoryId: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select Category</option>
                    {roadCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Assign a category to this road for better organization
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoadModal(false);
                    setEditingRoad(null);
                    setRoadForm({ name: '', priority: 'medium', categoryId: '' });
                  }}
                  className="px-5 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
                >
                  <FaSave className="mr-2" />
                  {editingRoad ? 'Update Road' : 'Add Road'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Special Plan Modal */}
      {showSpecialPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-green-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <FaCalendarAlt className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    Add Special Plan
                  </h3>
                  <p className="text-sm text-gray-500">
                    For {selectedCalendarDate?.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSpecialPlanModal(false);
                  setSpecialPlanForm({ title: '', description: '', date: '', priority: 'medium' });
                }}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSpecialPlanSubmit}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Plan Title</label>
                  <input
                    type="text"
                    value={specialPlanForm.title}
                    onChange={(e) => setSpecialPlanForm({...specialPlanForm, title: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Emergency Collection, Holiday Schedule"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={specialPlanForm.description}
                    onChange={(e) => setSpecialPlanForm({...specialPlanForm, description: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows="4"
                    placeholder="Describe the special plan details, requirements, or instructions..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority Level</label>
                  <select
                    value={specialPlanForm.priority}
                    onChange={(e) => setSpecialPlanForm({...specialPlanForm, priority: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowSpecialPlanModal(false);
                    setSpecialPlanForm({ title: '', description: '', date: '', priority: 'medium' });
                  }}
                  className="px-5 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
                >
                  <FaSave className="mr-2" />
                  Add Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh] relative">
            {/* Header - Fixed */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Collection Report</h2>
                  <p className="text-blue-100 mt-1">
                    {selectedCalendarDate?.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-blue-100 hover:text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-6 space-y-6">
                {/* Report Header */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {getSchedulesForDate(selectedCalendarDate)[0]?.wasteType || 'Waste'} Collection Report
                  </h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{getSchedulesForDate(selectedCalendarDate).length}</div>
                        <div className="text-sm text-gray-600">Total Routes</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{getSchedulesForDate(selectedCalendarDate).length}</div>
                        <div className="text-sm text-gray-600">Completed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600">0</div>
                        <div className="text-sm text-gray-600">Pending</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">0</div>
                        <div className="text-sm text-gray-600">Issues</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Note for Report:
                  </label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Write any notes or remarks for this completed schedule report..."
                    value={reportNotes || notes}
                    onChange={e => setReportNotes(e.target.value)}
                  />
                </div>

                {/* Photo Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attach Photographs:
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      id="photo-upload"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium text-blue-600 hover:text-blue-500">Click to upload photos</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                      </div>
                    </label>
                  </div>

                  {/* Photo Preview Grid */}
                  {reportPhotos.length > 0 && (
                    <div className="mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {reportPhotos.map((photo) => (
                          <div key={photo.id} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={photo.preview}
                                alt={photo.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              onClick={() => handleRemovePhoto(photo.id)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              title="Remove photo"
                            >
                              <FaTimes className="w-3 h-3" />
                            </button>
                            <p className="text-xs text-gray-500 mt-1 truncate" title={photo.name}>
                              {photo.name}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        {reportPhotos.length} photo{reportPhotos.length !== 1 ? 's' : ''} attached
                      </p>
                    </div>
                  )}
                </div>

                {/* Schedule Details Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">
                          Road Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">
                          Assigned Time Slot
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getSchedulesForDate(selectedCalendarDate).map((schedule, index) => {
                        const road = roads.find(r => r.id === schedule.roadId);
                        return (
                          <tr key={schedule.id || index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap border-b">
                              <div className="flex items-center">
                                <FaMapMarkerAlt className="text-gray-400 mr-2" />
                                <span className="text-sm font-medium text-gray-900">
                                  {road?.name || 'Unknown Road'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-b">
                              <div className="flex items-center">
                                <FaClock className="text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900">{schedule.timeSlot}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-b">
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                                Completed
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
                >
                  <FaSave className="mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Report Modal */}
      {showWeeklyReportModal && weeklyReportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-8 flex flex-col max-h-[90vh] relative">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Weekly Collection Report</h2>
                  <p className="text-blue-100 mt-1">{weeklyReportData.period}</p>
                </div>
                <button
                  onClick={() => setShowWeeklyReportModal(false)}
                  className="text-blue-100 hover:text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-6 space-y-6">
                {/* Weekly Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{weeklyReportData.statistics.totalRoutes}</div>
                    <div className="text-sm text-gray-600">Total Routes</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{weeklyReportData.statistics.completedRoutes}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-600">{weeklyReportData.statistics.pendingRoutes}</div>
                    <div className="text-sm text-gray-600">Pending</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">{weeklyReportData.statistics.completionRate}%</div>
                    <div className="text-sm text-gray-600">Completion Rate</div>
                  </div>
                </div>

                {/* Daily Overview */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Overview</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {Object.entries(weeklyReportData.dailyData).map(([date, data]) => (
                      <div key={date} className={`p-3 rounded-lg border text-center ${
                        data.schedules.length > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="font-semibold text-sm">{data.dayName}</div>
                        <div className="text-xs text-gray-600">{new Date(date).toLocaleDateString()}</div>
                        <div className="text-lg font-bold text-blue-600 mt-1">{data.schedules.length}</div>
                        <div className="text-xs text-gray-600">routes</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Waste Type Distribution */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Waste Type Distribution</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Waste Type
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                                  Count
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Percentage
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {Object.entries(weeklyReportData.statistics.wasteTypeStats).map(([type, count]) => (
                          <tr key={type}>
                            <td className="px-4 py-2 text-sm text-gray-900">{type}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{count}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {Math.round((count / weeklyReportData.statistics.totalRoutes) * 100)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Road Performance */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Road Performance</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Road Name
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Collections
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {Object.entries(weeklyReportData.statistics.roadStats)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 10)
                          .map(([road, count]) => (
                            <tr key={road}>
                              <td className="px-4 py-2 text-sm text-gray-900">{road}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{count}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowWeeklyReportModal(false)}
                  className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={downloadWeeklyPDF}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <FaSave className="mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Report Modal */}
      {showMonthlyReportModal && monthlyReportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl my-8 flex flex-col max-h-[90vh] relative">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-2xl flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Monthly Collection Report</h2>
                  <p className="text-purple-100 mt-1">{monthlyReportData.monthName} {monthlyReportData.year}</p>
                </div>
                <button
                  onClick={() => setShowMonthlyReportModal(false)}
                  className="text-purple-100 hover:text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-6 space-y-6">
                {/* Monthly Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{monthlyReportData.statistics.totalRoutes}</div>
                    <div className="text-sm text-gray-600">Total Routes</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{monthlyReportData.statistics.completedRoutes}</div>
                    <div className="text-sm text-gray-600">Completed Routes</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">{monthlyReportData.statistics.completionRate}%</div>
                    <div className="text-sm text-gray-600">Completion Rate</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">{monthlyReportData.statistics.activeDays}</div>
                    <div className="text-sm text-gray-600">Active Days</div>
                  </div>
                </div>

                {/* Weekly Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Week
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Routes
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completion
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {Object.entries(monthlyReportData.weeklyData).map(([week, data]) => {
                          const completed = data.schedules.filter(s => new Date(s.date) < new Date()).length;
                          return (
                            <tr key={week}>
                              <td className="px-4 py-2 text-sm text-gray-900">{week}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{data.schedules.length}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {completed}/{data.schedules.length} ({data.schedules.length > 0 ? Math.round((completed/data.schedules.length)*100) : 0}%)
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Comprehensive Analytics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Waste Type Analysis</h3>
                    <div className="space-y-2">
                      {Object.entries(monthlyReportData.statistics.wasteTypeStats)
                        .sort(([,a], [,b]) => b - a)
                        .map(([type, count]) => (
                          <div key={type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{type}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">{count}</span>
                              <span className="text-xs text-gray-500">
                                ({Math.round((count / monthlyReportData.statistics.totalRoutes) * 100)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Category Performance</h3>
                    <div className="space-y-2">
                      {Object.entries(monthlyReportData.statistics.categoryStats)
                        .sort(([,a], [,b]) => b - a)
                        .map(([category, count]) => (
                          <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{category}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">{count}</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                count > (monthlyReportData.statistics.totalRoutes * 0.2) ? 'bg-green-100 text-green-800' :
                                count > (monthlyReportData.statistics.totalRoutes * 0.1) ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {count > (monthlyReportData.statistics.totalRoutes * 0.2) ? 'High' :
                                 count > (monthlyReportData.statistics.totalRoutes * 0.1) ? 'Medium' : 'Low'}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowMonthlyReportModal(false)}
                  className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={downloadMonthlyPDF}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
                >
                  <FaSave className="mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Waste Type Modal */}
      {showWasteTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <FaRecycle className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {editingWasteType ? 'Edit Waste Type' : 'Add New Waste Type'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {editingWasteType ? 'Update waste type details' : 'Define a new type of waste'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWasteTypeModal(false);
                  setEditingWasteType(null);
                  setWasteTypeForm({ name: '', color: 'bg-gray-500', bgColor: 'bg-gray-100', textColor: 'text-gray-800' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleWasteTypeSubmit}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Waste Type Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={wasteTypeForm.name}
                    onChange={(e) => setWasteTypeForm({...wasteTypeForm, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Plastic, Organic, Electronic"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Color Code</label>
                  <div className="flex items-center gap-3">
                    {colorOptions.map(color => (
                      <div
                        key={color.name}
                        onClick={() => setWasteTypeForm({...wasteTypeForm, color: color.color, bgColor: color.bgColor, textColor: color.textColor})}
                        className={`w-10 h-10 rounded-full cursor-pointer flex items-center justify-center border-2 transition-all duration-200 ${
                          wasteTypeForm.color === color.color ? 'ring-2 ring-offset-2 ring-green-500' : 'border-transparent'
                        }`}
                        title={color.name}
                      >
                        <div className={`w-8 h-8 rounded-full ${color.bgColor} flex items-center justify-center`}>
                          {wasteTypeForm.color === color.color && (
                            <FaCheck className={`text-white text-xs`} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowWasteTypeModal(false);
                    setEditingWasteType(null);
                    setWasteTypeForm({ name: '', color: 'bg-gray-500', bgColor: 'bg-gray-100', textColor: 'text-gray-800' });
                  }}
                  className="px-5 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
                >
                  <FaSave className="mr-2" />
                  {editingWasteType ? 'Update Waste Type' : 'Add Waste Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Road Categories Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <FaTag className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {editingCategory ? 'Update category details' : 'Define a new category for roads'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  setCategoryForm({ name: '', color: 'bg-gray-200' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Residential, Commercial, Hazardous"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Color Code</label>
                  <div className="flex items-center gap-3">
                    {colorOptions.map(color => (
                      <div
                        key={color.name}
                        onClick={() => setCategoryForm({...categoryForm, color: color.color})}
                        className={`w-10 h-10 rounded-full cursor-pointer flex items-center justify-center border-2 transition-all duration-200 ${
                          categoryForm.color === color.color ? 'ring-2 ring-offset-2 ring-green-500' : 'border-transparent'
                        }`}
                        title={color.name}
                      >
                        <div className={`w-8 h-8 rounded-full ${color.bgColor} flex items-center justify-center`}>
                          {categoryForm.color === color.color && (
                            <FaCheck className={`text-white text-xs`} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setCategoryForm({ name: '', color: 'bg-gray-200' });
                  }}
                  className="px-5 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center"
                >
                  <FaSave className="mr-2" />
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Schedules;

// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import {
  FaChartBar,
  FaTrashAlt,
  FaTruck,
  FaUsers,
  FaCogs,
  FaUserCircle,
  FaSignOutAlt,
  FaExclamationCircle,
  FaClipboardList,
  FaBars,
  FaTimes,
  FaLeaf,
  FaChevronDown,
  FaChevronRight,
  FaEnvelope,
  FaEdit,
  FaCalendarAlt,
  FaBell,
  FaRecycle,
  FaShareAlt,
  FaSeedling,
} from 'react-icons/fa';

// Import component sections
import Overview from '../components/dashboard/Overview';
import VehicleFleet from '../components/dashboard/VehicleFleet';
import SmartBins from '../components/dashboard/SmartBins';
import Residents from '../components/dashboard/Residents';
import Drivers from '../components/dashboard/Drivers';
import ReportedIssues from '../components/dashboard/ReportedIssues';
import SharedItems from '../components/dashboard/SharedItems';
import BinRequests from '../components/dashboard/BinRequests';
import ImmediatePickups from '../components/dashboard/ImmediatePickups';
import Schedules from '../components/dashboard/Schedules';
import BinStatus from '../components/dashboard/BinStatus';
import AwarenessZone from '../components/dashboard/AwarenessZone';
import RecyclingInfo from '../components/dashboard/RecyclingInfo';
import Notifications from '../components/dashboard/Notifications';
import Administration from '../components/dashboard/Administration';
import CollectionReports from '../components/dashboard/CollectionReports';
import UserActivity from '../components/dashboard/UserActivity';
import RecyclingProgress from '../components/dashboard/RecyclingProgress';
import TodayTasks from '../components/dashboard/TodayTasks';
import ClearoBins from '../components/dashboard/ClearoBins';

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState(0);
  const [selectedView, setSelectedView] = useState('overview');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserData, setEditUserData] = useState(null);

  // Overview data states
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeBins, setActiveBins] = useState(0);
  const [binRequests, setBinRequests] = useState([]);
  const [reportedIssues, setReportedIssues] = useState([]);

  // Residents data states
  const [residents, setResidents] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);

  // Shared items data states
  const [sharedItems, setSharedItems] = useState([]);
  const [sharedItemsLoading, setSharedItemsLoading] = useState(false);

  // Vehicles data states
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  // Drivers data states
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);

  // Smart bins data states
  const [smartBins, setSmartBins] = useState([]);
  const [smartBinsLoading, setSmartBinsLoading] = useState(false);

  // Immediate pickups data states
  const [immediatePickups, setImmediatePickups] = useState([]);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoad, setSelectedRoad] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [smartBinSearch, setSmartBinSearch] = useState('');
  
  // Vehicle management states
  const [newVehicle, setNewVehicle] = useState({ 
    vehicleNumber: '', 
    type: '', 
    customType: '', 
    capacity: '', 
    customCapacity: '',
    driverName: '',
    status: 'Available'
  });
  
  // Driver management states
  const [newDriver, setNewDriver] = useState({ name: '', phone: '', employeeNumber: '', email: '' });
  const [editDriverId, setEditDriverId] = useState(null);
  const [editDriverData, setEditDriverData] = useState({ name: '', phone: '', employeeNumber: '', email: '' });
  
  // Dialog states
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [selectedPickupForDriver, setSelectedPickupForDriver] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueReply, setIssueReply] = useState('');
  const [issueAction, setIssueAction] = useState('');

  const vehicleTypes = ['Garbage Truck', 'Compactor', 'Recycling Truck', 'Collection Van', 'Other'];
  const vehicleCapacities = ['1000', '2000', '3000', '5000', 'Other'];
  const vehicleStatuses = ['Available', 'In Use', 'Maintenance', 'Out of Service'];

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        setIsLoading(true);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          console.error('No user data found');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  // Fetch overview data
  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        // Fetch total users count
        const usersSnapshot = await getDocs(collection(db, 'users'));
        setTotalUsers(usersSnapshot.size);

        // Fetch active bins count
        const binsSnapshot = await getDocs(collection(db, 'bins'));
        setActiveBins(binsSnapshot.size);

        // Fetch bin requests
        const requestsSnapshot = await getDocs(collection(db, 'binRequests'));
        setBinRequests(requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch reported issues
        const issuesSnapshot = await getDocs(collection(db, 'reportedIssues'));
        const issuesData = issuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReportedIssues(issuesData);
        
        console.log('Reported Issues Count:', issuesData.length);
        console.log('Reported Issues Data:', issuesData);
      } catch (err) {
        console.error('Error fetching overview data:', err);
      }
    };

    fetchOverviewData();
  }, []);

  // Add additional useEffect to fetch data based on selected view
  useEffect(() => {
    const fetchData = async () => {
      switch (selectedView) {
        case 'residents':
          await fetchResidents();
          break;
        case 'sharedItems':
          await fetchSharedItems();
          break;
        case 'vehicles':
          await fetchVehicles();
          break;
        case 'drivers':
          await fetchDrivers();
          break;
        case 'smartBins':
          await fetchSmartBins();
          break;
        case 'immediatePickups':
          await fetchImmediatePickups();
          break;
        // case 'reportedIssues':
        //   await fetchReportedIssues();
        //   break;
        case 'binRequests':
          await fetchBinRequests();
          break;
        case 'todayTasks':
          // No need to fetch, TodayTasks component handles its own data
          break;
        default:
          break;
      }
    };

    fetchData();
  }, [selectedView]);

  // Fetch functions
  const fetchResidents = async () => {
    try {
      setResidentsLoading(true);
      const querySnapshot = await getDocs(collection(db, 'users'));
      const residentsData = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => !!user.address && typeof user.address === 'string' && user.address.trim() !== '');
      setResidents(residentsData);
    } catch (err) {
      console.error('Error fetching residents:', err);
    } finally {
      setResidentsLoading(false);
    }
  };

  const fetchSharedItems = async () => {
    try {
      setSharedItemsLoading(true);
      const querySnapshot = await getDocs(collection(db, 'sharedItems'));
      const itemsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSharedItems(itemsData);
    } catch (err) {
      console.error('Error fetching shared items:', err);
    } finally {
      setSharedItemsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      setVehiclesLoading(true);
      const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
      setVehicles(vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setVehiclesLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      setDriversLoading(true);
      const driversSnapshot = await getDocs(collection(db, 'drivers'));
      setDrivers(driversSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching drivers:', err);
    } finally {
      setDriversLoading(false);
    }
  };

  const fetchSmartBins = async () => {
    try {
      setSmartBinsLoading(true);
      const smartBinsSnapshot = await getDocs(collection(db, 'smart_bins'));
      setSmartBins(smartBinsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching smart bins:', err);
    } finally {
      setSmartBinsLoading(false);
    }
  };

  const fetchImmediatePickups = async () => {
    try {
      const pickupsSnapshot = await getDocs(collection(db, 'immediate_pickups'));
      setImmediatePickups(pickupsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching immediate pickups:', err);
    }
  };

  const fetchReportedIssues = async () => {
    try {
      const issuesSnapshot = await getDocs(collection(db, 'reportedIssues'));
      setReportedIssues(issuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching reported issues:', err);
    }
  };

  const fetchBinRequests = async () => {
    try {
      const requestsSnapshot = await getDocs(collection(db, 'binRequests'));
      setBinRequests(requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching bin requests:', err);
    }
  };

  const logout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleCategory = (index) => {
    setExpandedCategory(expandedCategory === index ? null : index);
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
  };

  const handleEditUser = () => {
    setEditUserData(userData);
    setIsEditing(true);
  };

  const handleSaveUser = async () => {
    if (!editUserData) return;

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), editUserData);
      setUserData(editUserData);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving user data:', err);
    }
  };

  const navCategories = [
    {
      title: 'Dashboard',
      icon: <FaChartBar />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      items: [{ icon: <FaChartBar />, label: 'Overview', view: 'overview' }],
    },
    {
      title: 'Collection Management',
      icon: <FaRecycle />,
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600',
      items: [
        { icon: <FaClipboardList />, label: 'Today Tasks', view: 'todayTasks' },
        { icon: <FaCalendarAlt />, label: 'Schedules', view: 'schedules' },
        { icon: <FaTrashAlt />, label: 'Bin Status', view: 'binStatus' },
        { icon: <FaTruck />, label: 'Immediate Pickups', view: 'immediatePickups' },
        { icon: <FaClipboardList />, label: 'Bin Requests', view: 'binRequests' },
        { icon: <FaCogs />, label: 'Clea~Ro Smart Bins', view: 'smartBins' },
      ],
    },
    {
      title: 'Community Hub',
      icon: <FaSeedling />,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      items: [
        { icon: <FaShareAlt />, label: 'Sharing Hub', view: 'sharedItems' },
        { icon: <FaBell />, label: 'Awareness Zone', view: 'awarenessZone' },
        { icon: <FaRecycle />, label: 'Recycling Info', view: 'recyclingInfo' },
      ],
    },
    {
      title: 'Issue Management',
      icon: <FaExclamationCircle />,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      items: [
        { icon: <FaExclamationCircle />, label: 'Reported Issues', view: 'reportedIssues' },
        { icon: <FaBell />, label: 'Notifications', view: 'notifications' },
      ],
    },
    {
      title: 'Fleet & Drivers',
      icon: <FaTruck />,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      items: [
        { icon: <FaTruck />, label: 'Vehicle Fleet', view: 'vehicles' },
        { icon: <FaUsers />, label: 'Drivers', view: 'drivers' },
      ],
    },
    {
      title: 'User Management',
      icon: <FaUsers />,
      items: [
        { label: 'Residents', icon: <FaUsers />, view: 'residents' },
        { label: 'Drivers', icon: <FaTruck />, view: 'drivers' },
        { label: 'Clea~Ro Bins', icon: <FaTrashAlt />, view: 'clearoBins' },
      ],
    },
    {
      title: 'Analytics & Reports',
      icon: <FaChartBar />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      items: [
        { icon: <FaChartBar />, label: 'Collection Reports', view: 'reports' },
        { icon: <FaChartBar />, label: 'User Activity', view: 'activity' },
        { icon: <FaChartBar />, label: 'Recycling Progress', view: 'progress' },
      ],
    },
  ];

  const renderNavigation = () => (
    <nav className="p-6 flex-grow">
      <div className="space-y-3">
        {navCategories.map((category, idx) => (
          <div key={idx} className="group">
            {/* Main category button */}
            <button
              onClick={() => toggleCategory(idx)}
              className={`flex items-center justify-between w-full px-4 py-3 text-sm rounded-xl transition-all duration-300 group ${
                expandedCategory === idx
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg scale-[1.02]'
                  : 'hover:bg-gray-50 text-gray-700 hover:shadow-md'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${
                    expandedCategory === idx 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : `${category.iconBg} group-hover:scale-110`
                  }`}
                >
                  <span
                    className={`text-lg transition-all duration-300 ${
                      expandedCategory === idx ? 'text-white' : category.iconColor
                    }`}
                  >
                    {category.icon}
                  </span>
                </div>
                <span className="font-semibold tracking-wide text-left">{category.title}</span>
              </div>
              <div className="flex items-center space-x-2">
                {category.items.length > 1 && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    expandedCategory === idx 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {category.items.length}
                  </span>
                )}
                <span className="text-sm transition-transform duration-300">
                  {expandedCategory === idx ? <FaChevronDown /> : <FaChevronRight />}
                </span>
              </div>
            </button>

            {/* Submenu with smooth animation */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                expandedCategory === idx 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}
            >
              <div className="ml-4 space-y-1 border-l-2 border-green-100 pl-4">
                {category.items.map((item, itemIdx) => (
                  <button
                    key={itemIdx}
                    onClick={() => item.view && setSelectedView(item.view)}
                    className={`flex items-center space-x-3 w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 group/item text-left ${
                      selectedView === item.view
                        ? 'bg-green-50 text-green-700 border border-green-200 font-medium shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                    }`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 flex-shrink-0 ${
                      selectedView === item.view
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-500 group-hover:item:bg-green-50 group-hover:item:text-green-600'
                    }`}>
                      <span className="text-sm">
                        {item.icon}
                      </span>
                    </div>
                    <span className="font-medium tracking-wide flex-1 text-left">{item.label}</span>
                    {selectedView === item.view && (
                      <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Section */}
      <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
          <span className="text-left">Quick Stats</span>
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 text-left flex-1">Active Users</span>
            <span className="text-sm font-bold text-green-600 text-right">{totalUsers}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 text-left flex-1">Total Bins</span>
            <span className="text-sm font-bold text-blue-600 text-right">{activeBins}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 text-left flex-1">Pending Issues</span>
            <span className="text-sm font-bold text-red-600 text-right">{reportedIssues.length}</span>
          </div>
        </div>
      </div>
    </nav>
  );

  const renderUserDetails = () => (
    <div className="p-6 space-y-5">
      {isEditing ? (
        <div className="space-y-4">
          <input
            type="text"
            value={editUserData?.name || ''}
            onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
            placeholder="Name"
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            value={editUserData?.phone || ''}
            onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value })}
            placeholder="Phone"
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveUser}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Name</p>
              <p className="text-base font-medium text-gray-800">{userData?.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Phone</p>
              <p className="text-base font-medium text-gray-800">{userData?.phone || 'Not provided'}</p>
            </div>
          </div>
          {/* Removed duplicate Edit button - now only in footer */}
        </div>
      )}
    </div>
  );

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  const handleRoadChange = (e) => {
    setSelectedRoad(e.target.value);
  };

  const handleAddVehicle = async () => {
    const vehicleType = newVehicle.type === 'Other' ? newVehicle.customType : newVehicle.type;
    const vehicleCapacity = newVehicle.capacity === 'Other' ? newVehicle.customCapacity : newVehicle.capacity;
    
    if (!newVehicle.vehicleNumber || !vehicleType || !vehicleCapacity || !newVehicle.driverName) return;
    
    try {
      const docRef = await addDoc(collection(db, 'vehicles'), {
        vehicleNumber: newVehicle.vehicleNumber,
        type: vehicleType,
        capacity: vehicleCapacity,
        driverName: newVehicle.driverName,
        status: newVehicle.status,
        createdAt: new Date(),
      });
      
      setVehicles(prev => [...prev, { 
        id: docRef.id, 
        vehicleNumber: newVehicle.vehicleNumber, 
        type: vehicleType, 
        capacity: vehicleCapacity,
        driverName: newVehicle.driverName,
        status: newVehicle.status,
        createdAt: new Date(),
      }]);
      
      setNewVehicle({ 
        vehicleNumber: '', 
        type: '', 
        customType: '', 
        capacity: '', 
        customCapacity: '',
        driverName: '',
        status: 'Available'
      });
    } catch (err) {
      console.error('Error adding vehicle:', err);
    }
  };

  const handleUpdateVehicleStatus = async (vehicleId, newStatus) => {
    try {
      await updateDoc(doc(db, 'vehicles', vehicleId), { status: newStatus });
      setVehicles(prev => prev.map(vehicle => 
        vehicle.id === vehicleId ? { ...vehicle, status: newStatus } : vehicle
      ));
    } catch (err) {
      console.error('Error updating vehicle status:', err);
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      setVehicles(prev => prev.filter(vehicle => vehicle.id !== vehicleId));
    } catch (err) {
      console.error('Error deleting vehicle:', err);
    }
  };

  const handleAddDriver = async () => {
    if (!newDriver.name || !newDriver.phone || !newDriver.employeeNumber || !newDriver.email) return;
    try {
      const docRef = await addDoc(collection(db, 'drivers'), newDriver);
      setDrivers((prev) => [...prev, { id: docRef.id, ...newDriver }]);
      setNewDriver({ name: '', phone: '', employeeNumber: '', email: '' });
    } catch (err) {
      console.error('Error adding driver:', err);
    }
  };

  const handleEditDriver = (driver) => {
    setEditDriverId(driver.id);
    setEditDriverData(driver);
  };

  const handleSaveDriver = async () => {
    if (!editDriverId || !editDriverData.name || !editDriverData.phone || !editDriverData.employeeNumber || !editDriverData.email) return;
    try {
      await updateDoc(doc(db, 'drivers', editDriverId), editDriverData);
      setDrivers(prev => prev.map(driver => 
        driver.id === editDriverId ? { ...driver, ...editDriverData } : driver
      ));
      setEditDriverId(null);
      setEditDriverData({ name: '', phone: '', employeeNumber: '', email: '' });
    } catch (err) {
      console.error('Error updating driver:', err);
    }
  };

  const handleDeleteDriver = async (driverId) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    try {
      await deleteDoc(doc(db, 'drivers', driverId));
      setDrivers((prev) => prev.filter((d) => d.id !== driverId));
      if (editDriverId === driverId) setEditDriverId(null);
    } catch (err) {
      console.error('Error deleting driver:', err);
    }
  };

  const removeItem = async (itemId) => {
    try {
      await deleteDoc(doc(db, 'sharedItems', itemId));
      setSharedItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
      setSelectedItem(null);
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  const openIssueDialog = (issue) => {
    setSelectedIssue(issue);
    setIssueReply(issue.reply || '');
    setIssueAction(issue.action || '');
    setShowIssueDialog(true);
  };

  const handleSaveIssueResponse = async () => {
    if (!selectedIssue || !issueReply || !issueAction) return;

    try {
      await updateDoc(doc(db, 'reportedIssues', selectedIssue.id), {
        reply: issueReply,
        action: issueAction,
      });

      setReportedIssues((prev) =>
        prev.map((issue) =>
          issue.id === selectedIssue.id
            ? { ...issue, reply: issueReply, action: issueAction }
            : issue
        )
      );
      setShowIssueDialog(false);
      setSelectedIssue(null);
      setIssueReply('');
      setIssueAction('');
    } catch (err) {
      console.error('Error saving issue response:', err);
    }
  };

  const openEditDialog = (request) => {
    // Handle bin request editing
    console.log('Edit request:', request);
  };

  const handleAssignDriver = async () => {
    if (!selectedDriver || !selectedPickupForDriver) return;

    try {
      await updateDoc(doc(db, 'immediate_pickups', selectedPickupForDriver.id), {
        driver: selectedDriver,
      });

      setImmediatePickups((prev) =>
        prev.map((pickup) =>
          pickup.id === selectedPickupForDriver.id
            ? { ...pickup, driver: selectedDriver }
            : pickup
        )
      );
      setShowAssignDriver(false);
      setSelectedPickupForDriver(null);
      setSelectedDriver('');
    } catch (err) {
      console.error('Error assigning driver:', err);
    }
  };

  // Filter functions
  const filteredSharedItems = sharedItems.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchQuery) ||
      item.owner?.toLowerCase().includes(searchQuery);
    return matchesSearch;
  });

  const renderContent = () => {
    if (selectedView === 'overview') {
      return (
        <Overview 
          userData={userData}
          totalUsers={totalUsers}
          activeBins={activeBins}
          binRequests={binRequests}
          reportedIssues={reportedIssues}
          setSelectedView={setSelectedView}
        />
      );
    }
    
    if (selectedView === 'todayTasks') {
      return <TodayTasks />;
    }
    if (selectedView === 'schedules') {
      return <Schedules />;
    }
    if (selectedView === 'binStatus') {
      return <BinStatus />;
    }
    if (selectedView === 'immediatePickups') {
      return (
        <ImmediatePickups
          immediatePickups={immediatePickups}
          setSelectedPickupForDriver={setSelectedPickupForDriver}
          setShowAssignDriver={setShowAssignDriver}
          fetchDrivers={fetchDrivers}
          showAssignDriver={showAssignDriver}
          selectedPickupForDriver={selectedPickupForDriver}
          selectedDriver={selectedDriver}
          setSelectedDriver={setSelectedDriver}
          drivers={drivers}
          handleAssignDriver={handleAssignDriver}
        />
      );
    }
    if (selectedView === 'binRequests') {
      return (
        <BinRequests
          binRequests={binRequests}
          openEditDialog={openEditDialog}
        />
      );
    }
    if (selectedView === 'smartBins') {
      return (
        <SmartBins
          smartBinSearch={smartBinSearch}
          setSmartBinSearch={setSmartBinSearch}
          // Remove smartBins, smartBinsLoading, and fetchSmartBins props
          // SmartBins component now handles its own real-time data
        />
      );
    }
    if (selectedView === 'sharedItems') {
      return (
        <SharedItems
          sharedItems={sharedItems}
          sharedItemsLoading={sharedItemsLoading}
          filteredSharedItems={filteredSharedItems}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          removeItem={removeItem}
        />
      );
    }
    if (selectedView === 'awarenessZone') {
      return <AwarenessZone />;
    }
    if (selectedView === 'recyclingInfo') {
      return <RecyclingInfo />;
    }
    if (selectedView === 'reportedIssues') {
      // Remove passing reportedIssues and openIssueDialog as props
      // The ReportedIssues component should fetch and manage its own data
      return <ReportedIssues />;
    }
    if (selectedView === 'notifications') {
      return <Notifications />;
    }
    if (selectedView === 'vehicles') {
      return (
        <VehicleFleet
          vehicles={vehicles}
          vehiclesLoading={vehiclesLoading}
          vehicleSearch={vehicleSearch}
          setVehicleSearch={setVehicleSearch}
          newVehicle={newVehicle}
          setNewVehicle={setNewVehicle}
          vehicleTypes={vehicleTypes}
          vehicleCapacities={vehicleCapacities}
          vehicleStatuses={vehicleStatuses}
          handleAddVehicle={handleAddVehicle}
          handleUpdateVehicleStatus={handleUpdateVehicleStatus}
          handleDeleteVehicle={handleDeleteVehicle}
        />
      );
    }
    if (selectedView === 'drivers') {
      return (
        <Drivers
          drivers={drivers}
          driversLoading={driversLoading}
          newDriver={newDriver}
          setNewDriver={setNewDriver}
          editDriverId={editDriverId}
          editDriverData={editDriverData}
          setEditDriverData={setEditDriverData}
          setEditDriverId={setEditDriverId}
          handleAddDriver={handleAddDriver}
          handleEditDriver={handleEditDriver}
          handleSaveDriver={handleSaveDriver}
          handleDeleteDriver={handleDeleteDriver}
        />
      );
    }
    if (selectedView === 'residents') {
      return (
        <Residents
          residents={residents}
          residentsLoading={residentsLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedRoad={selectedRoad}
          setSelectedRoad={setSelectedRoad}
          handleSearchChange={handleSearchChange}
          handleRoadChange={handleRoadChange}
        />
      );
    }
    if (selectedView === 'administration') {
      return <Administration />;
    }
    if (selectedView === 'reports') {
      return <CollectionReports />;
    }
    if (selectedView === 'activity') {
      return <UserActivity />;
    }
    if (selectedView === 'progress') {
      return <RecyclingProgress />;
    }
    if (selectedView === 'clearoBins') {
      return <ClearoBins />;
    }
    // ...existing code for fallback...
    return (
      <div className="flex flex-col items-center justify-center mt-20 p-8">
        <div className="text-6xl text-green-200 mb-4">
          <FaLeaf />
        </div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Coming Soon</h2>
        <p className="text-gray-500 text-center max-w-md">
          This section is under development. Please select "Overview" from the navigation menu.
        </p>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-green-50">
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed z-20 top-4 left-4 p-3 rounded-full bg-green-600 text-white shadow-lg"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar/Navigation */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:relative inset-y-0 left-0 z-10 w-80 transition-transform duration-300 ease-in-out bg-white shadow-2xl lg:translate-x-0 overflow-y-auto flex flex-col`}
      >
        {/* Enhanced Logo area */}
        <div className="relative h-20 px-6 flex items-center bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full translate-y-12 -translate-x-12"></div>
          </div>
          
          <div className="relative z-10 flex items-center space-x-3">
            <div className="p-2.5 bg-white rounded-xl shadow-lg">
              <FaLeaf className="text-2xl text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Clearo Sync</h1>
              <p className="text-xs text-green-100 font-medium">Waste Management System</p>
            </div>
          </div>
        </div>

        {/* Enhanced User info */}
        {userData && (
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-green-50">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                  {userData.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                  <FaUserCircle className="text-green-500 text-xs" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="font-bold text-gray-800 text-base cursor-pointer hover:text-green-600 transition-colors truncate"
                  onClick={openModal}
                >
                  {userData.name}
                </p>
                <p className="text-sm text-green-600 font-medium">{userData.position}</p>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                  <span className="text-xs text-gray-500">Online</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        {renderNavigation()}

        {/* Enhanced footer with logout */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={logout}
            className="flex items-center justify-center w-full px-4 py-3 text-sm bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <FaSignOutAlt className="mr-2" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Content Area */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading dashboard...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              {renderContent()}
            </div>
          )}
        </div>
      </main>

      {/* User Profile Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
            onClick={closeModal}
          />
          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 animate-fade-in-up overflow-hidden">
            {/* Header with User Identity */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {userData.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                    <FaUserCircle className="text-green-500 text-xs" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-800 truncate">{userData.name}</h2>
                  <p className="text-sm text-gray-600 truncate flex items-center">
                    <FaEnvelope className="mr-1.5 text-green-500 text-opacity-80" size={12} />
                    {userData.email}
                  </p>
                </div>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-200/50"
                onClick={closeModal}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Details Section */}
            {renderUserDetails()}

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
              {/* Only show Edit button if not already editing */}
              {!isEditing && (
                <button
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm flex items-center"
                  onClick={handleEditUser}
                >
                  <FaEdit className="mr-2" size={14} />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Issue Reply Dialog */}
      {showIssueDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setShowIssueDialog(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Reply to Issue</h3>
            <p className="text-gray-600 mb-4">
              Issue ID: <strong>{selectedIssue?.id}</strong>
            </p>
            <textarea
              value={issueReply}
              onChange={(e) => setIssueReply(e.target.value)}
              placeholder="Enter your reply"
              className="w-full p-3 border border-gray-300 rounded-lg mb-4"
            />
            <textarea
              value={issueAction}
              onChange={(e) => setIssueAction(e.target.value)}
              placeholder="Enter the action to be taken"
              className="w-full p-3 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowIssueDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveIssueResponse}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
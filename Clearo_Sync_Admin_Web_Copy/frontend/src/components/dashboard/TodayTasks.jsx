import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  FaClipboardList,
  FaTruck,
  FaMapMarkerAlt,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUser,
  FaCalendarCheck,
  FaRoute,
  FaSpinner,
  FaFilter,
  FaSortAmountDown,
  FaEye,
  FaTrash,
  FaRecycle,
  FaLeaf,
  FaMap,
  FaBatteryFull,
  FaBatteryHalf,
  FaBatteryEmpty,
  FaPlay,
  FaPause,
  FaStop,
  FaUserPlus,
  FaEdit,
  FaRoad,
  FaClipboard
} from 'react-icons/fa';

// Google Maps component
const MapComponent = ({ routes, bins, trucks }) => {
  const mapRef = React.useRef(null);
  const [map, setMap] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    // Load Google Maps script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDtfueebmq-XAr53g5JvZk13F7WCPZqC3M&libraries=geometry`;
      script.onload = () => setIsLoaded(true);
      script.onerror = () => console.error('Failed to load Google Maps script');
      document.head.appendChild(script);
    } else {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && mapRef.current && !map) {
      const googleMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 7.8731, lng: 80.7718 }, // Sri Lanka center
        zoom: 12,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });
      setMap(googleMap);
    }
  }, [isLoaded, map]);

  useEffect(() => {
    if (map) {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      setMarkers([]);
      const newMarkers = [];

      // Smart bin markers with accurate location and thresholds
      if (bins && bins.length > 0) {
        bins.forEach((bin) => {
          const lat = Number(bin.lat);
          const lng = Number(bin.lng);
          if (Number.isNaN(lat) || Number.isNaN(lng)) return;

          const pct = Math.max(0, Math.min(100, Number(bin.fillPercentage ?? 0)));
          const t = bin.thresholds || {};
          const full = typeof t.full_threshold === 'number' ? t.full_threshold : 85;
          const high = typeof t.high_threshold === 'number' ? t.high_threshold : 70;

          const color = pct >= full ? '#ef4444' : pct >= high ? '#f59e0b' : '#10b981';

          const marker = new window.google.maps.Marker({
            position: { lat, lng },
            map,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 11,
              fillColor: color,
              fillOpacity: 0.95,
              strokeWeight: 2,
              strokeColor: '#ffffff'
            },
            label: `${Math.round(pct)}%`,
            title: `${bin.location || 'Smart Bin'} - ${Math.round(pct)}%`
          });

          const lastUpdateStr =
            bin.lastUpdate && typeof bin.lastUpdate?.toDate === 'function'
              ? bin.lastUpdate.toDate().toLocaleString()
              : (typeof bin.lastUpdate === 'string' ? bin.lastUpdate : '');

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div class="p-3">
                <h3 class="font-bold text-lg">${bin.location || 'Smart Bin'}</h3>
                ${bin.binId ? `<p><strong>ID:</strong> ${bin.binId}</p>` : ''}
                <p><strong>Fill:</strong> ${Math.round(pct)}% ${bin.fillLevel ? `(${bin.fillLevel})` : ''}</p>
                <p><strong>Bin Status:</strong> ${bin.binStatus || 'N/A'}</p>
                <p><strong>Device Status:</strong> ${bin.status || 'N/A'}</p>
                ${lastUpdateStr ? `<p><strong>Last Update:</strong> ${lastUpdateStr}</p>` : ''}
                ${bin.gps?.status ? `<p><strong>GPS:</strong> ${bin.gps.status} (${bin.gps.satellites || 0} sats)</p>` : ''}
              </div>
            `
          });
          marker.addListener('click', () => infoWindow.open(map, marker));
          newMarkers.push(marker);
        });
      }

      // Truck markers from real-time driver locations (enriched with vehicle info if available)
      if (trucks && trucks.length > 0) {
        trucks.forEach(truck => {
          const { currentLocation } = truck || {};
          if (!currentLocation?.lat || !currentLocation?.lng) return;

          const truckIcon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 17h2l.5-2h13l.5 2h2v-5h-3V7H3v10z" fill="${truck.status === 'in-progress' ? '#2563eb' : '#059669'}"/>
                <circle cx="7" cy="19" r="2" fill="#374151"/>
                <circle cx="17" cy="19" r="2" fill="#374151"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(30, 30)
          };

          const marker = new window.google.maps.Marker({
            position: { lat: parseFloat(currentLocation.lat), lng: parseFloat(currentLocation.lng) },
            map,
            icon: truckIcon,
            title: `${truck.vehicleNumber || 'Truck'} - ${truck.driverName || 'Driver'}`
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div class="p-3">
                <h3 class="font-bold text-lg">${truck.vehicleNumber || 'Truck'}</h3>
                <p><strong>Driver:</strong> ${truck.driverName || 'Unknown'}</p>
                <p><strong>Status:</strong> ${truck.status || 'Unknown'}</p>
                ${truck.assignedRoute ? `<p><strong>Route:</strong> ${truck.assignedRoute}</p>` : ''}
                ${truck.type ? `<p><strong>Type:</strong> ${truck.type}</p>` : ''}
                ${truck.capacity ? `<p><strong>Capacity:</strong> ${truck.capacity}</p>` : ''}
                ${truck.currentLocation?.timestamp ? `<p><strong>Updated:</strong> ${new Date(truck.currentLocation.timestamp?.seconds ? truck.currentLocation.timestamp.seconds * 1000 : truck.currentLocation.timestamp).toLocaleTimeString()}</p>` : ''}
              </div>
            `
          });
          marker.addListener('click', () => infoWindow.open(map, marker));
          newMarkers.push(marker);
        });
      }

      setMarkers(newMarkers);
    }
  }, [map, bins, trucks]);

  return <div ref={mapRef} className="w-full h-96 rounded-lg border" />;
};

export default function TodayTasks() {
  const [tasks, setTasks] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bins, setBins] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWasteType, setFilterWasteType] = useState('all');
  const [sortBy, setSortBy] = useState('time');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [selectedTaskForDriver, setSelectedTaskForDriver] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  // Remove selectedVehicleId state

  // Add roads schedule state
  const [roadsSchedule, setRoadsSchedule] = useState([]);
  const [vehiclesLookup, setVehiclesLookup] = useState({});

  const wasteTypes = ['General', 'Recyclable', 'Organic', 'Hazardous'];
  
  useEffect(() => {
    fetchTodayData();
  }, []);

  // Real-time streams for smart bins and driver locations
  useEffect(() => {
    // Smart bins stream with accurate mapping
    const unsubBins = onSnapshot(
      collection(db, 'smart_bins'),
      (snapshot) => {
        const binsData = snapshot.docs.map((d) => {
          const data = d.data();
          const locName = data.location || data.location_name || data.locationName;
          const gps = data.location_data || data.locationData || {};
          const lat = gps?.latitude ?? data.coordinates?.lat ?? data.location?.lat;
          const lng = gps?.longitude ?? data.coordinates?.lng ?? data.location?.lng;

          const fd = data.fill_data || {};
          const fillPct =
            typeof fd.fill_percentage === 'number'
              ? fd.fill_percentage
              : typeof data.fill_percentage === 'number'
              ? data.fill_percentage
              : 0;

          return {
            id: d.id,
            binId: data.bin_id,
            location: locName || 'Unknown Location',
            lat,
            lng,
            fillPercentage: fillPct,
            fillLevel: fd.fill_level,          // e.g., 'MEDIUM'
            binStatus: fd.bin_status,          // e.g., 'HALF_FULL'
            status: data.status,               // device status e.g., 'ERROR'
            thresholds: data.thresholds || {},
            lastUpdate: data.system?.last_update || data.timestamp,
            gps: {
              status: gps?.status,
              satellites: gps?.satellites
            }
          };
        }).filter(b => typeof b.lat === 'number' && typeof b.lng === 'number');

        setBins(binsData);
      },
      (err) => console.error('smart_bins onSnapshot error:', err)
    );

    // Driver locations stream
    const unsubDrivers = onSnapshot(collection(db, 'driver_locations'), (snapshot) => {
      const driverLocs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // Build trucks from driver locations + vehicles info (if available)
      const trucksFromDrivers = driverLocs.map((dl) => {
        const vById = vehiclesLookup[dl.vehicleId || ''] || {};
        const vByDriver = vehiclesLookup[`driver:${dl.driverName || ''}`] || {};
        const enriched = vById.vehicleNumber ? vById : vByDriver.vehicleNumber ? vByDriver : {};
        return {
          id: dl.id,
          driverId: dl.driverId,
          driverName: dl.driverName,
          status: dl.status || 'in-progress',
          assignedRoute: dl.assignedRoute,
          vehicleNumber: dl.vehicleNumber || enriched.vehicleNumber,
          type: enriched.type,
          capacity: enriched.capacity,
          currentLocation: {
            lat: dl.latitude ?? dl.lat,
            lng: dl.longitude ?? dl.lng,
            timestamp: dl.timestamp || dl.updatedAt
          }
        };
      });
      setTrucks(trucksFromDrivers);
    }, (err) => console.error('driver_locations onSnapshot error:', err));

    return () => {
      unsubBins();
      unsubDrivers();
    };
  }, [db, vehiclesLookup]);

  const fetchTodayData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Fetch today's schedules from 'schedules' collection
      const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
      const todaySchedules = schedulesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(schedule => {
          // Check if schedule date matches today
          const scheduleDate = schedule.date || schedule.scheduledDate;
          if (scheduleDate) {
            // Handle different date formats
            let scheduleDateStr;
            if (scheduleDate.seconds) {
              // Firestore Timestamp
              scheduleDateStr = new Date(scheduleDate.seconds * 1000).toISOString().split('T')[0];
            } else if (typeof scheduleDate === 'string') {
              scheduleDateStr = scheduleDate;
            } else if (scheduleDate instanceof Date) {
              scheduleDateStr = scheduleDate.toISOString().split('T')[0];
            }
            return scheduleDateStr === todayStr;
          }
          return false;
        });
      
      setRoutes(todaySchedules);

      // Fetch driver locations from 'driver_locations' collection
      const driverLocationsSnapshot = await getDocs(collection(db, 'driver_locations'));
      const driverLocationsData = driverLocationsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      // Fetch drivers data
      const driversSnapshot = await getDocs(collection(db, 'drivers'));
      const driversData = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrivers(driversData);

      // Fetch bins with location data from smart_bins collection
      const binsSnapshot = await getDocs(collection(db, 'smart_bins'));
      const binsData = binsSnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          location: data.address || data.location || 'Unknown Location',
          lat: data.coordinates?.lat || data.location?.lat || 7.8731 + (Math.random() - 0.5) * 0.1,
          lng: data.coordinates?.lng || data.location?.lng || 80.7718 + (Math.random() - 0.5) * 0.1,
          fillLevel: data.fill_level || data.fillLevel || Math.floor(Math.random() * 100),
          wasteType: data.waste_type || data.wasteType || 'General',
          lastCollected: data.last_collected || data.lastCollected || null
        };
      });
      setBins(binsData);

      // Build vehicles lookup once for enrichment
      const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
      const vehiclesData = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const lookup = vehiclesData.reduce((acc, v) => {
        acc[v.id] = v;
        if (v.vehicleNumber) acc[v.vehicleNumber] = v;
        if (v.driverName) acc[`driver:${v.driverName}`] = v;
        return acc;
      }, {});
      setVehiclesLookup(lookup);

      // Optional: initial trucks from vehicles (before real-time driver locations arrive)
      // setTrucks(vehiclesData.map(v => ({ ...v, currentLocation: v.currentLocation || null })));

      // Fetch roads schedule from 'roads_schedule' collection or derive from schedules
      const roadsSnapshot = await getDocs(collection(db, 'roads_schedule'));
      const todayRoadsSchedule = roadsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(road => {
          const scheduleDate = road.date || road.scheduledDate;
          if (scheduleDate) {
            let scheduleDateStr;
            if (scheduleDate.seconds) {
              scheduleDateStr = new Date(scheduleDate.seconds * 1000).toISOString().split('T')[0];
            } else if (typeof scheduleDate === 'string') {
              scheduleDateStr = scheduleDate;
            } else if (scheduleDate instanceof Date) {
              scheduleDateStr = scheduleDate.toISOString().split('T')[0];
            }
            return scheduleDateStr === todayStr;
          }
          return false;
        });

      // If no separate roads collection, derive from schedules with proper road names
      if (todayRoadsSchedule.length === 0) {
        const derivedRoads = todaySchedules.map((schedule, index) => {
          // Generate proper road names based on route or use meaningful names
          let roadName = schedule.roadName || schedule.routeName;
          if (!roadName || roadName.includes('Route') || roadName.includes('Schedule')) {
            // Generate meaningful road names
            const roadNames = [
              'Colombo Main Road',
              'Galle Road',
              'Kandy Road',
              'Negombo Road',
              'High Level Road',
              'Baseline Road',
              'Parliament Road',
              'Marine Drive',
              'Bauddhaloka Mawatha',
              'Independence Avenue'
            ];
            roadName = roadNames[index % roadNames.length];
          }

          return {
            id: schedule.id,
            roadName: roadName,
            routeCode: schedule.id?.substring(0, 8) || `RT${(index + 1).toString().padStart(3, '0')}`,
            areas: schedule.areas || schedule.locations || [],
            wasteType: schedule.wasteType || 'General',
            assignedDriver: schedule.driverName || 'Unassigned',
            driverId: schedule.driverId,
            startTime: schedule.startTime || '08:00',
            endTime: schedule.endTime || '17:00',
            status: schedule.status || 'pending',
            priority: schedule.priority || 'medium',
            estimatedDuration: schedule.estimatedDuration || '8 hours',
            completedBins: schedule.completedLocations?.length || 0,
            totalBins: schedule.locations?.length || 5
          };
        });
        setRoadsSchedule(derivedRoads);
      } else {
        setRoadsSchedule(todayRoadsSchedule);
      }

      // Generate tasks from today's schedules
      const generatedTasks = todaySchedules.map(schedule => {
        // Find assigned driver details
        const assignedDriver = driversData.find(driver => 
          driver.id === schedule.driverId || 
          driver.name === schedule.driverName ||
          driver.employeeNumber === schedule.assignedDriver
        );

        // Calculate bins in route
        const routeBins = binsData.filter(bin => 
          schedule.locations?.includes(bin.location) ||
          schedule.areas?.includes(bin.area) ||
          schedule.routes?.includes(bin.route)
        );

        return {
          id: schedule.id,
          type: 'route',
          title: schedule.routeName || schedule.title || `Schedule ${schedule.id}`,
          routeName: schedule.routeName || schedule.route || `Route ${schedule.id}`,
          wasteType: schedule.wasteType || schedule.waste_type || 'General',
          driver: assignedDriver?.name || schedule.driverName || schedule.assignedDriver || 'Unassigned',
          driverId: assignedDriver?.id || schedule.driverId,
          startTime: schedule.startTime || schedule.start_time || '08:00',
          endTime: schedule.endTime || schedule.end_time || '17:00',
          estimatedDuration: schedule.estimatedDuration || schedule.duration || '8 hours',
          locations: schedule.locations || schedule.areas || [],
          areas: schedule.areas || schedule.locations || [],
          status: schedule.status || 'pending',
          priority: schedule.priority || 'medium',
          totalBins: routeBins.length || schedule.totalBins || 0,
          completedBins: schedule.completedLocations?.length || schedule.completed || 0,
          description: schedule.description || schedule.notes || '',
          createdAt: schedule.createdAt,
          scheduledDate: schedule.date || schedule.scheduledDate
        };
      });

      setTasks(generatedTasks);
    } catch (error) {
      console.error('Error fetching today data:', error);
      // Set empty arrays on error to prevent crashes
      setRoutes([]);
      setTasks([]);
      setDrivers([]);
      setBins([]);
      setTrucks([]);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, 'schedules', taskId), {
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'in-progress' && { startedAt: new Date() }),
        ...(newStatus === 'completed' && { completedAt: new Date() })
      });

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      // Also update the routes state
      setRoutes(prev => prev.map(route => 
        route.id === taskId ? { ...route, status: newStatus } : route
      ));
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const assignDriver = async () => {
    if (!selectedTaskForDriver || !selectedDriverId) return;

    try {
      const selectedDriver = drivers.find(d => d.id === selectedDriverId);

      await updateDoc(doc(db, 'schedules', selectedTaskForDriver.id), {
        driverId: selectedDriverId,
        driverName: selectedDriver?.name,
        assignedDriver: selectedDriver?.name,
        updatedAt: new Date()
      });

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === selectedTaskForDriver.id 
          ? { 
              ...task, 
              driver: selectedDriver?.name || 'Unassigned',
              driverId: selectedDriverId
            } 
          : task
      ));

      setRoutes(prev => prev.map(route => 
        route.id === selectedTaskForDriver.id 
          ? { 
              ...route, 
              driverId: selectedDriverId,
              driverName: selectedDriver?.name
            } 
          : route
      ));

      // Update roads schedule
      setRoadsSchedule(prev => prev.map(road => 
        road.id === selectedTaskForDriver.id 
          ? { 
              ...road, 
              assignedDriver: selectedDriver?.name,
              driverId: selectedDriverId
            } 
          : road
      ));

      // Close modal
      setShowAssignDriver(false);
      setSelectedTaskForDriver(null);
      setSelectedDriverId('');
    } catch (error) {
      console.error('Error assigning driver:', error);
    }
  };

  const openAssignDriverModal = (task) => {
    setSelectedTaskForDriver(task);
    setSelectedDriverId(task.driverId || '');
    setShowAssignDriver(true);
  };

  const getWasteTypeIcon = (wasteType) => {
    switch (wasteType?.toLowerCase()) {
      case 'recyclable': return <FaRecycle className="text-blue-500" />;
      case 'organic': return <FaLeaf className="text-green-500" />;
      case 'hazardous': return <FaExclamationTriangle className="text-red-500" />;
      default: return <FaTrash className="text-gray-500" />;
    }
  };

  const getBinFillIcon = (fillLevel) => {
    if (fillLevel > 80) return <FaBatteryFull className="text-red-500" />;
    if (fillLevel > 40) return <FaBatteryHalf className="text-yellow-500" />;
    return <FaBatteryEmpty className="text-green-500" />;
  };

  const filteredTasks = tasks.filter(task => {
    const statusMatch = filterStatus === 'all' || task.status === filterStatus;
    const wasteTypeMatch = filterWasteType === 'all' || task.wasteType === filterWasteType;
    return statusMatch && wasteTypeMatch;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'time':
        return (a.startTime || '').localeCompare(b.startTime || '');
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      case 'route':
        return (a.routeName || '').localeCompare(b.routeName || '');
      default:
        return 0;
    }
  });

  const openTaskDetails = (task) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading today's routes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <FaRoute className="text-2xl text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Today's Collection Routes</h1>
              <p className="text-gray-600">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
          
          {/* Stats and Map Toggle */}
          <div className="flex items-center space-x-4">
            <div className="flex space-x-4 text-center">
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{routes.length}</p>
                <p className="text-xs text-blue-600">Total Routes</p>
              </div>
              <div className="bg-yellow-50 px-4 py-2 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {tasks.filter(t => t.status === 'pending').length}
                </p>
                <p className="text-xs text-yellow-600">Pending</p>
              </div>
              <div className="bg-green-50 px-4 py-2 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
                <p className="text-xs text-green-600">Completed</p>
              </div>
            </div>
            <button
              onClick={() => setShowMapView(!showMapView)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                showMapView 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaMap />
              <span>{showMapView ? 'Hide Map' : 'Show Map'}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={filterWasteType}
              onChange={(e) => setFilterWasteType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Waste Types</option>
              {wasteTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <FaSortAmountDown className="text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="time">Sort by Time</option>
              <option value="priority">Sort by Priority</option>
              <option value="route">Sort by Route</option>
            </select>
          </div>
        </div>
      </div>

      {/* Today's Roads Schedule Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FaRoad className="text-2xl text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Today's Roads Schedule</h2>
              <p className="text-gray-600 text-sm">Collection slots organized by roads</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{roadsSchedule.length}</p>
              <p className="text-xs text-blue-600">Roads</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {roadsSchedule.filter(r => r.status === 'completed').length}
              </p>
              <p className="text-xs text-green-600">Completed</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roadsSchedule.map((road) => (
            <div key={road.id} className={`bg-white rounded-lg border-2 hover:shadow-lg transition-all duration-200 ${
              road.status === 'completed' ? 'border-green-200 bg-green-50' :
              road.status === 'in-progress' ? 'border-blue-200 bg-blue-50' :
              road.status === 'paused' ? 'border-yellow-200 bg-yellow-50' :
              'border-gray-200 hover:border-blue-300'
            }`}>
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">
                      {road.roadName}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono">
                      Route {road.routeCode}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(road.status)}`}>
                    {road.status || 'pending'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  {getWasteTypeIcon(road.wasteType)}
                  <span className="font-medium text-gray-700">{road.wasteType}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Driver Assignment */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaUser className={road.assignedDriver !== 'Unassigned' ? 'text-green-500' : 'text-red-500'} size={14} />
                    <span className="text-sm font-medium text-gray-600">Driver:</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-semibold ${
                      road.assignedDriver === 'Unassigned' ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {road.assignedDriver}
                    </span>
                    <button
                      onClick={() => openAssignDriverModal(road)}
                      className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                      title="Assign Driver"
                    >
                      <FaUserPlus size={12} />
                    </button>
                  </div>
                </div>

                {/* Time Slot */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaClock className="text-blue-500" size={14} />
                    <span className="text-sm font-medium text-gray-600">Time Slot:</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {road.startTime} - {road.endTime}
                  </span>
                </div>

                {/* Duration */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Duration:</span>
                  <span className="text-sm font-semibold text-gray-900">{road.estimatedDuration}</span>
                </div>

                {/* Progress Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Route Progress</span>
                    <span>{Math.round((road.completedBins / road.totalBins) * 100) || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        road.status === 'completed' ? 'bg-green-500' :
                        road.status === 'in-progress' ? 'bg-blue-500' :
                        road.status === 'paused' ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${(road.completedBins / road.totalBins) * 100 || 0}%` }}
                    ></div>
                </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-4 pb-4">
                {road.status !== 'completed' && (
                  <div className="flex space-x-2">
                    {road.status === 'pending' && (
                      <button
                        onClick={() => updateTaskStatus(road.id, 'in-progress')}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                      >
                        <FaPlay size={12} />
                        <span>Start</span>
                      </button>
                    )}
                    {road.status === 'in-progress' && (
                      <>
                        <button
                          onClick={() => updateTaskStatus(road.id, 'paused')}
                          className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                        >
                          <FaPause size={12} />
                          <span>Pause</span>
                        </button>
                        <button
                          onClick={() => updateTaskStatus(road.id, 'completed')}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                        >
                          <FaCheckCircle size={12} />
                          <span>Complete</span>
                        </button>
                      </>
                    )}
                    {road.status === 'paused' && (
                      <button
                        onClick={() => updateTaskStatus(road.id, 'in-progress')}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                      >
                        <FaPlay size={12} />
                        <span>Resume</span>
                      </button>
                    )}
                  </div>
                )}
                {road.status === 'completed' && (
                  <div className="flex items-center justify-center text-green-600 py-2">
                    <FaCheckCircle className="mr-2" />
                    <span className="text-sm font-semibold">Route Completed</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {roadsSchedule.length === 0 && (
          <div className="text-center py-12">
            <FaRoad className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No roads scheduled for today</h3>
            <p className="text-gray-500">All road collections are completed or no roads are scheduled for today.</p>
          </div>
        )}
      </div>

      {/* Map View */}
      {showMapView && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <FaMap className="mr-2 text-green-600" />
            Live Route Tracking & Bin Status
          </h2>
          <MapComponent routes={routes} bins={bins} trucks={trucks} />
          
          {/* Map Legend */}
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Low Fill (&lt;40%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Medium Fill (40-80%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>High Fill (&gt;80%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaTruck className="text-green-600" />
              <span>Active Trucks</span>
            </div>
          </div>
        </div>
      )}

      {/* Assign Driver Modal - Remove vehicle selection */}
      {showAssignDriver && selectedTaskForDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setShowAssignDriver(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <FaUserPlus className="mr-2 text-blue-600" />
                Assign Driver
              </h3>
              <button
                onClick={() => setShowAssignDriver(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Route Info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800">{selectedTaskForDriver.routeName || selectedTaskForDriver.roadName}</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                  {getWasteTypeIcon(selectedTaskForDriver.wasteType)}
                  <span>{selectedTaskForDriver.wasteType}</span>
                  <span>•</span>
                  <span>{selectedTaskForDriver.startTime}</span>
                </div>
              </div>

              {/* Driver Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Driver
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a driver...</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} - {driver.employeeNumber}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Assignment Display */}
              {selectedTaskForDriver.driver && selectedTaskForDriver.driver !== 'Unassigned' && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Currently Assigned Driver:</strong><br />
                    {selectedTaskForDriver.driver}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAssignDriver(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={assignDriver}
                disabled={!selectedDriverId}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  selectedDriverId
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Assign Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showTaskDetails && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setShowTaskDetails(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Task Details</h3>
              <button
                onClick={() => setShowTaskDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                <p className="text-gray-900 capitalize">{selectedTask.type}</p>
              </div>
              
              {selectedTask.location && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <p className="text-gray-900">{selectedTask.location}</p>
                </div>
              )}
              
              {selectedTask.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900">{selectedTask.description}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTask.status)}`}>
                  {selectedTask.status || 'pending'}
                </span>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowTaskDetails(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

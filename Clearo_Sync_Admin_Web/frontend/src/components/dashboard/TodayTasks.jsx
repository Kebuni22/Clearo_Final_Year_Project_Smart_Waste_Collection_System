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

// Import custom images
import truckImage from '../../assets/truck.png';
import binImage from '../../assets/bin.png';

// Google Maps component with custom images
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
      script.onload = () => {
        console.log('✅ Google Maps loaded in TodayTasks');
        setIsLoaded(true);
      };
      script.onerror = () => console.error('❌ Failed to load Google Maps script');
      document.head.appendChild(script);
    } else {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && mapRef.current && !map) {
      const googleMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 6.9271, lng: 79.8612 }, // Colombo, Sri Lanka
        zoom: 13,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });
      console.log('🗺️ Map initialized');
      setMap(googleMap);
    }
  }, [isLoaded, map]);

  useEffect(() => {
    if (map) {
      console.log('🎨 Rendering markers - Bins:', bins?.length || 0, 'Trucks:', trucks?.length || 0);
      
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      setMarkers([]);
      const newMarkers = [];

      // Render Bin markers with custom bin.png and status indicator circle
      if (bins && bins.length > 0) {
        bins.forEach((bin, idx) => {
          // Get coordinates - handle multiple field names
          const lat = Number(bin.latitude || bin.lat || bin.coordinates?.lat);
          const lng = Number(bin.longitude || bin.lng || bin.coordinates?.lng);
          
          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            console.warn(`❌ Invalid bin coordinates for ${bin.binId || bin.bin_id}:`, lat, lng);
            return;
          }

          console.log(`✅ Rendering bin ${idx + 1}: ${bin.binId || bin.bin_id} at ${lat}, ${lng}`);

          // Get fill percentage
          const fillPct = Math.max(0, Math.min(100, 
            Number(bin.fillPercentage || bin.fill_percentage || bin.fillLevel || 0)
          ));

          // Determine size and color based on fill level
          const size = fillPct >= 80 ? 45 : fillPct >= 50 ? 40 : 35;
          const statusColor = fillPct >= 80 ? '#EF4444' : // Red
                             fillPct >= 50 ? '#F59E0B' : // Yellow/Orange
                             '#10B981'; // Green

          // Load bin image as base64 or use direct path
          // Create marker with bin image and status circle overlay
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = size + 20;
          canvas.height = size + 20;

          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Draw bin image
            ctx.drawImage(img, 10, 10, size, size);
            
            // Draw status indicator circle (top right)
            ctx.beginPath();
            ctx.arc(size + 10, 10, 10, 0, 2 * Math.PI);
            ctx.fillStyle = statusColor;
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Draw percentage text in circle
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.round(fillPct), size + 10, 10);

            // Create marker with composed image
            const marker = new window.google.maps.Marker({
              position: { lat, lng },
              map,
              icon: {
                url: canvas.toDataURL(),
                scaledSize: new window.google.maps.Size(size + 20, size + 20),
                anchor: new window.google.maps.Point((size + 20) / 2, (size + 20) / 2)
              },
              title: `${bin.location || bin.binId || 'Bin'} - ${Math.round(fillPct)}% Full`,
              zIndex: 900
            });

            // Info window with color-coded status
            const statusBadgeColor = fillPct >= 80 ? 'bg-red-100 text-red-800' :
                                    fillPct >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800';

            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div class="p-3">
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="font-bold text-lg">${bin.location || bin.binId || 'Smart Bin'}</h3>
                    <span class="px-2 py-1 rounded-full text-xs font-bold ${statusBadgeColor}">
                      ${Math.round(fillPct)}%
                    </span>
                  </div>
                  ${bin.binId || bin.bin_id ? `<p class="text-sm"><strong>ID:</strong> ${bin.binId || bin.bin_id}</p>` : ''}
                  <div class="mt-2 flex items-center space-x-2">
                    <div class="w-3 h-3 rounded-full" style="background-color: ${statusColor}"></div>
                    <p class="text-sm"><strong>Status:</strong> 
                      ${fillPct >= 80 ? 'Critical - Needs Emptying' :
                        fillPct >= 50 ? 'Medium - Monitor' :
                        'Good - Low Fill'}
                    </p>
                  </div>
                  ${bin.binStatus || bin.bin_status ? `<p class="text-sm mt-1"><strong>Bin Status:</strong> ${bin.binStatus || bin.bin_status}</p>` : ''}
                  ${bin.wasteType || bin.waste_type ? `<p class="text-sm"><strong>Waste Type:</strong> ${bin.wasteType || bin.waste_type}</p>` : ''}
                  <div class="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full" style="width: ${fillPct}%; background-color: ${statusColor}"></div>
                  </div>
                  <p class="text-xs text-gray-500 mt-2">📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                </div>
              `
            });
            
            marker.addListener('click', () => {
              console.log('🗑️ Bin clicked:', bin);
              infoWindow.open(map, marker);
            });
            
            newMarkers.push(marker);
            setMarkers(prev => [...prev, marker]);
          };
          img.src = binImage;
        });
      }

      // Render Truck markers with custom truck.png and complete details
      if (trucks && trucks.length > 0) {
        trucks.forEach((truck, idx) => {
          // Get coordinates from current location
          const location = truck.currentLocation || truck.location;
          const lat = Number(location?.lat || location?.latitude);
          const lng = Number(location?.lng || location?.longitude);

          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            console.warn(`❌ Invalid truck coordinates for ${truck.vehicleNumber}:`, lat, lng);
            return;
          }

          console.log(`✅ Rendering truck ${idx + 1}: ${truck.vehicleNumber} at ${lat}, ${lng}, Driver: ${truck.driverName}`);

          // Determine status with more details
          const isOnline = truck.status === 'in-progress' || truck.isOnline;
          const statusColor = isOnline ? '#10B981' : '#6B7280'; // Green or Gray
          const statusText = truck.status === 'in-progress' ? 'In Progress' :
                            truck.status === 'completed' ? 'Completed' :
                            truck.isOnline ? 'Online' : 'Offline';

          // Get driver name - handle multiple sources
          const driverName = truck.driverName || truck.driver_name || truck.driver || 'Unknown Driver';
          const driverId = truck.driverId || truck.driver_id || truck.uid || 'N/A';
          const vehicleNumber = truck.vehicleNumber || truck.vehicle_number || truck.vehicleNo || 'Unknown Vehicle';

          // Create marker with truck image and status circle
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 60;
          canvas.height = 60;

          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Draw truck image
            ctx.drawImage(img, 10, 10, 40, 40);
            
            // Draw status indicator circle (top right)
            ctx.beginPath();
            ctx.arc(50, 10, 10, 0, 2 * Math.PI);
            ctx.fillStyle = statusColor;
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Draw checkmark or dot for status
            if (isOnline) {
              // Draw checkmark
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(46, 10);
              ctx.lineTo(48, 12);
              ctx.lineTo(54, 6);
              ctx.stroke();
            } else {
              // Draw dot
              ctx.beginPath();
              ctx.arc(50, 10, 3, 0, 2 * Math.PI);
              ctx.fillStyle = '#FFFFFF';
              ctx.fill();
            }

            // Create marker with composed image
            const marker = new window.google.maps.Marker({
              position: { lat, lng },
              map,
              icon: {
                url: canvas.toDataURL(),
                scaledSize: new window.google.maps.Size(60, 60),
                anchor: new window.google.maps.Point(30, 30)
              },
              title: `${vehicleNumber} - ${driverName}`,
              zIndex: 1000
            });

            // Enhanced info window with complete truck details
            const statusBadge = isOnline ? 
              'bg-green-100 text-green-800' : 
              'bg-gray-100 text-gray-800';

            // Format timestamp
            const lastUpdate = truck.currentLocation?.timestamp || truck.timestamp || truck.updatedAt;
            let lastUpdateStr = 'N/A';
            if (lastUpdate) {
              try {
                if (lastUpdate.seconds) {
                  lastUpdateStr = new Date(lastUpdate.seconds * 1000).toLocaleString();
                } else if (lastUpdate.toDate) {
                  lastUpdateStr = lastUpdate.toDate().toLocaleString();
                } else if (typeof lastUpdate === 'number') {
                  lastUpdateStr = new Date(lastUpdate).toLocaleString();
                } else if (typeof lastUpdate === 'string') {
                  lastUpdateStr = new Date(lastUpdate).toLocaleString();
                }
              } catch (e) {
                console.warn('Error parsing timestamp:', e);
                lastUpdateStr = 'N/A';
              }
            }

            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div class="p-4 min-w-[320px]">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex-1">
                      <h3 class="font-bold text-xl text-gray-900">${vehicleNumber}</h3>
                      <p class="text-sm text-gray-600 mt-1">ID: ${driverId}</p>
                    </div>
                    <span class="px-3 py-1.5 rounded-full text-xs font-bold ${statusBadge} ml-2">
                      ${statusText}
                    </span>
                  </div>
                  
                  <div class="space-y-3 mb-3">
                    <div class="flex items-center space-x-2 pb-2 border-b border-gray-100">
                      <div class="w-3 h-3 rounded-full ${isOnline ? 'animate-pulse' : ''}" style="background-color: ${statusColor}"></div>
                      <span class="text-sm font-semibold ${isOnline ? 'text-green-600' : 'text-gray-600'}">
                        ${statusText}
                      </span>
                    </div>
                    
                    <div class="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div class="flex items-center space-x-2">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <div>
                          <p class="text-xs text-blue-600 font-medium">Driver Name</p>
                          <p class="text-base font-bold text-gray-900">${driverName}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3 text-sm">
                      ${truck.type ? `
                        <div class="bg-gray-50 rounded-lg p-2">
                          <p class="text-gray-500 text-xs mb-1">Vehicle Type</p>
                          <p class="font-semibold text-gray-900">${truck.type}</p>
                        </div>
                      ` : ''}
                      
                      ${truck.capacity ? `
                        <div class="bg-gray-50 rounded-lg p-2">
                          <p class="text-gray-500 text-xs mb-1">Capacity</p>
                          <p class="font-semibold text-gray-900">${truck.capacity}</p>
                        </div>
                      ` : ''}
                      
                      ${truck.assignedRoute ? `
                        <div class="bg-gray-50 rounded-lg p-2 col-span-2">
                          <p class="text-gray-500 text-xs mb-1">Assigned Route</p>
                          <p class="font-semibold text-gray-900">${truck.assignedRoute}</p>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                  
                  <div class="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-600 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Location
                      </span>
                      <span class="font-mono text-xs text-gray-900">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
                    </div>
                    
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-600 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Last Update
                      </span>
                      <span class="text-xs text-gray-900">${lastUpdateStr}</span>
                    </div>
                    
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-600 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        Driver ID
                      </span>
                      <span class="text-xs text-gray-900 font-mono">${driverId}</span>
                    </div>
                  </div>
                  
                  ${isOnline ? `
                    <div class="mt-3 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                      <p class="text-xs text-green-800 text-center font-semibold flex items-center justify-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Vehicle is actively collecting waste
                      </p>
                    </div>
                  ` : `
                    <div class="mt-3 p-3 bg-gray-100 border-2 border-gray-300 rounded-lg">
                      <p class="text-xs text-gray-600 text-center font-medium flex items-center justify-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Vehicle is currently offline
                      </p>
                    </div>
                  `}
                </div>
              `
            });

            marker.addListener('click', () => {
              console.log('🚛 Truck clicked:', {
                vehicleNumber: vehicleNumber,
                driverName: driverName,
                driverId: driverId,
                status: truck.status,
                location: { lat, lng },
                assignedRoute: truck.assignedRoute,
                type: truck.type,
                capacity: truck.capacity,
                lastUpdate: lastUpdateStr
              });
              infoWindow.open(map, marker);
            });

            newMarkers.push(marker);
            setMarkers(prev => [...prev, marker]);
          };
          img.src = truckImage;
        });
      }

      console.log(`✓ Rendered ${newMarkers.length} total markers`);
    }
  }, [map, bins, trucks]);

  return (
    <div>
      <div ref={mapRef} className="w-full h-96 rounded-lg border-2 border-gray-200" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <div className="text-center">
            <FaSpinner className="animate-spin text-3xl text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
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

      // Fetch drivers data and create lookup by uid
      const driversSnapshot = await getDocs(collection(db, 'drivers'));
      const driversData = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrivers(driversData);

      // Create driver lookup by uid for real-time matching
      const driversByUid = {};
      driversData.forEach(driver => {
        if (driver.uid) {
          driversByUid[driver.uid] = driver;
        }
      });

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
        if (v.uid) acc[`uid:${v.uid}`] = v;
        return acc;
      }, {});
      setVehiclesLookup(lookup);

      // Store for real-time listener
      window.driversByUid = driversByUid;

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

          // Get time from schedule - prioritize timeSlot field, then fallback to individual fields
          let startTime = '08:00';
          let endTime = '17:00';
          
          if (schedule.timeSlot) {
            // Parse timeSlot format: "12:00 PM - 2:00 PM"
            const timeSlotParts = schedule.timeSlot.split(' - ');
            if (timeSlotParts.length === 2) {
              startTime = convertTo24Hour(timeSlotParts[0].trim());
              endTime = convertTo24Hour(timeSlotParts[1].trim());
            }
          } else {
            // Fallback to individual time fields
            startTime = schedule.startTime || schedule.start_time || schedule.time || '08:00';
            endTime = schedule.endTime || schedule.end_time || schedule.time_end || '17:00';
          }

          return {
            id: schedule.id,
            roadName: roadName,
            routeCode: schedule.id?.substring(0, 8) || `RT${(index + 1).toString().padStart(3, '0')}`,
            areas: schedule.areas || schedule.locations || [],
            wasteType: schedule.wasteType || 'General',
            assignedDriver: schedule.driverName || 'Unassigned',
            driverId: schedule.driverId,
            startTime: startTime,
            endTime: endTime,
            timeSlot: schedule.timeSlot || `${startTime} - ${endTime}`,
            status: schedule.status || 'pending',
            priority: schedule.priority || 'medium',
            estimatedDuration: schedule.estimatedDuration || schedule.duration || calculateDuration(startTime, endTime),
            completedBins: schedule.completedLocations?.length || 0,
            totalBins: schedule.locations?.length || 5
          };
        });
        setRoadsSchedule(derivedRoads);
      } else {
        // Use roads from roads_schedule collection with their assigned times
        const enrichedRoads = todayRoadsSchedule.map(road => {
          let startTime = '08:00';
          let endTime = '17:00';
          
          if (road.timeSlot) {
            // Parse timeSlot format: "12:00 PM - 2:00 PM"
            const timeSlotParts = road.timeSlot.split(' - ');
            if (timeSlotParts.length === 2) {
              startTime = convertTo24Hour(timeSlotParts[0].trim());
              endTime = convertTo24Hour(timeSlotParts[1].trim());
            }
          } else {
            startTime = road.startTime || road.start_time || road.time || '08:00';
            endTime = road.endTime || road.end_time || road.time_end || '17:00';
          }

          return {
            ...road,
            startTime: startTime,
            endTime: endTime,
            timeSlot: road.timeSlot || `${startTime} - ${endTime}`,
            estimatedDuration: road.estimatedDuration || road.duration || calculateDuration(startTime, endTime)
          };
        });
        setRoadsSchedule(enrichedRoads);
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

  // Helper function to convert 12-hour format to 24-hour format
  const convertTo24Hour = (time12h) => {
    try {
      const [time, modifier] = time12h.split(' ');
      let [hours, minutes] = time.split(':');
      
      hours = parseInt(hours, 10);
      
      if (modifier === 'PM' && hours !== 12) {
        hours += 12;
      } else if (modifier === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    } catch (error) {
      console.error('Error converting time:', error);
      return '08:00';
    }
  };

  // Helper function to calculate duration between two times
  const calculateDuration = (startTime, endTime) => {
    try {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const durationMinutes = endMinutes - startMinutes;
      
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours} hours`;
      } else {
        return `${minutes} minutes`;
      }
    } catch (error) {
      return '2 hours';
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

  // Real-time streams for smart bins and driver locations
  useEffect(() => {
    console.log('🔄 Setting up real-time data streams...');
    
    // Smart bins stream with proper coordinate handling
    const unsubBins = onSnapshot(
      collection(db, 'smart_bins'),
      (snapshot) => {
        console.log('📦 Smart bins snapshot:', snapshot.size, 'documents');
        
        const binsData = snapshot.docs.map((d) => {
          const data = d.data();
          
          // Handle multiple coordinate field structures with priority order
          const lat = Number(data.latitude || data.coordinates?.lat || data.location?.lat || data.lat || 0);
          const lng = Number(data.longitude || data.coordinates?.lng || data.location?.lng || data.lng || 0);
          
          // Handle fill percentage from multiple sources
          const fillPct = Number(data.fill_percentage || 
                         data.fillPercentage || 
                         data.fill_data?.fill_percentage || 
                         0);

          const bin = {
            id: d.id,
            binId: data.bin_id || d.id,
            location: data.location || data.location_name || data.address || `Bin ${d.id.substring(0, 8)}`,
            latitude: lat,
            longitude: lng,
            fillPercentage: Math.round(fillPct),
            fillLevel: data.fill_level || data.fill_data?.fill_level || 'UNKNOWN',
            binStatus: data.bin_status || data.fill_data?.bin_status || 'UNKNOWN',
            wasteType: data.waste_type || 'General',
            status: data.status || 'active',
            lastUpdate: data.timestamp || data.last_updated || data.system?.last_update,
            has_gps: data.has_gps,
            location_set_by_resident: data.location_set_by_resident,
            is_online: data.is_online || false
          };

          console.log(`✓ Processed bin ${bin.binId}: lat=${bin.latitude}, lng=${bin.longitude}, fill=${bin.fillPercentage}%`);
          return bin;
        }).filter(b => {
          // Only filter out bins with explicitly invalid coordinates (0,0 or NaN)
          // But keep bins with valid GPS coordinates
          const hasValidCoords = !isNaN(b.latitude) && 
                                 !isNaN(b.longitude) && 
                                 b.latitude !== 0 && 
                                 b.longitude !== 0;
          
          if (!hasValidCoords) {
            console.warn(`⚠️ Filtered out bin ${b.binId} - Invalid coordinates: ${b.latitude}, ${b.longitude}`);
          }
          
          return hasValidCoords;
        });

        console.log(`✅ Loaded ${binsData.length} valid bins with GPS coordinates out of ${snapshot.size} total`);
        
        // Log bins that were filtered out
        const filteredCount = snapshot.size - binsData.length;
        if (filteredCount > 0) {
          console.warn(`⚠️ ${filteredCount} bins filtered out due to invalid/missing GPS coordinates`);
        }
        
        setBins(binsData);
      },
      (err) => console.error('❌ smart_bins onSnapshot error:', err)
    );

    // Driver locations stream with proper uid matching
    const unsubDrivers = onSnapshot(
      collection(db, 'driver_locations'),
      (snapshot) => {
        console.log('📦 Driver locations snapshot:', snapshot.size, 'documents');
        
        const driverLocs = snapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Get coordinates
          const lat = Number(data.latitude || data.lat);
          const lng = Number(data.longitude || data.lng);

          // Get driver details from drivers collection using uid
          const driverDetails = window.driversByUid?.[data.uid] || {};

          console.log('Processing driver location:', {
            uid: data.uid,
            driverFromLookup: driverDetails.name,
            lat,
            lng,
            isOnline: data.isOnline
          });
          
          return { 
            id: doc.id,
            uid: data.uid,
            latitude: lat,
            longitude: lng,
            isOnline: data.isOnline,
            timestamp: data.timestamp,
            // Merge driver details
            driverName: driverDetails.name || 'Unknown Driver',
            employeeNumber: driverDetails.employeeNumber,
            phone: driverDetails.phone,
            email: driverDetails.email
          };
        });

        // Enrich with vehicle data
        const trucksFromDrivers = driverLocs.map((dl) => {
          const vByUid = vehiclesLookup[`uid:${dl.uid}`] || {};
          const vById = vehiclesLookup[dl.vehicleId || ''] || {};
          const vByDriver = vehiclesLookup[`driver:${dl.driverName || ''}`] || {};
          const enriched = vByUid.vehicleNumber ? vByUid : 
                          vById.vehicleNumber ? vById : 
                          vByDriver.vehicleNumber ? vByDriver : {};
          
          const truck = {
            id: dl.id,
            driverId: dl.uid,
            uid: dl.uid,
            driverName: dl.driverName,
            employeeNumber: dl.employeeNumber,
            phone: dl.phone,
            email: dl.email,
            status: dl.isOnline ? 'in-progress' : 'offline',
            isOnline: dl.isOnline,
            vehicleNumber: enriched.vehicleNumber || 'Unknown Vehicle',
            type: enriched.type,
            capacity: enriched.capacity,
            assignedRoute: enriched.assignedRoute,
            currentLocation: {
              lat: dl.latitude,
              lng: dl.longitude,
              timestamp: dl.timestamp
            }
          };

          console.log('✓ Processed truck:', {
            vehicleNumber: truck.vehicleNumber,
            driverName: truck.driverName,
            uid: truck.uid,
            isOnline: truck.isOnline,
            location: { lat: truck.currentLocation.lat, lng: truck.currentLocation.lng }
          });
          return truck;
        }).filter(t => {
          const isValid = t.currentLocation.lat && 
                         t.currentLocation.lng && 
                         !isNaN(t.currentLocation.lat) && 
                         !isNaN(t.currentLocation.lng) &&
                         t.currentLocation.lat !== 0 && 
                         t.currentLocation.lng !== 0;
          if (!isValid) {
            console.warn('⚠️ Filtered out truck with invalid coordinates:', t.vehicleNumber, t.driverName);
          }
          return isValid;
        });

        console.log(`✓ Loaded ${trucksFromDrivers.length} valid trucks with driver details`);
        setTrucks(trucksFromDrivers);
      },
      (err) => console.error('❌ driver_locations onSnapshot error:', err)
    );

    return () => {
      console.log('🔄 Cleaning up real-time streams');
      unsubBins();
      unsubDrivers();
    };
  }, [db, vehiclesLookup]);

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

                {/* Time Slot - Display the timeSlot directly */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaClock className="text-blue-500" size={14} />
                    <span className="text-sm font-medium text-gray-600">Time Slot:</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {road.timeSlot || `${road.startTime} - ${road.endTime}`}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <FaMap className="mr-2 text-green-600" />
              Live Route Tracking & All Bin Locations
            </h2>
            <div className="flex items-center space-x-4 text-sm">
              <div className="bg-purple-50 px-3 py-1 rounded-full">
                <span className="font-semibold text-purple-600">🚛 {trucks.length} Trucks</span>
              </div>
              <div className="bg-blue-50 px-3 py-1 rounded-full">
                <span className="font-semibold text-blue-600">🗑️ {bins.length} Smart Bins</span>
              </div>
            </div>
          </div>

          {/* Map Component */}
          <MapComponent routes={routes} bins={bins} trucks={trucks} />
          
          {/* Enhanced Map Legend */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Map Legend</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs relative">
                  <FaTrash size={10} />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-600 rounded-full border-2 border-white"></div>
                </div>
                <span className="text-gray-700">Low (&lt;50%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs relative">
                  <FaTrash size={11} />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-600 rounded-full border-2 border-white"></div>
                </div>
                <span className="text-gray-700">Medium (50-80%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs relative">
                  <FaTrash size={12} />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white"></div>
                </div>
                <span className="text-gray-700">Critical (&gt;80%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <FaTruck className="text-purple-600 text-xl" />
                <span className="text-gray-700">Active Trucks</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-700">Live Updates</span>
              </div>
            </div>
          </div>

          {/* Enhanced Map Data Status */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total Bins</p>
                  <p className="text-2xl font-bold text-blue-700">{bins.length}</p>
                </div>
                <FaTrash className="text-3xl text-blue-300" />
              </div>
            </div>
            
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Online Bins</p>
                  <p className="text-2xl font-bold text-green-700">
                    {bins.filter(b => b.is_online).length}
                  </p>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">Critical Bins</p>
                  <p className="text-2xl font-bold text-red-700">
                    {bins.filter(b => b.fillPercentage >= 80).length}
                  </p>
                </div>
                <FaExclamationTriangle className="text-2xl text-red-300" />
              </div>
            </div>
          </div>

          {/* GPS Status Info */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <div className="flex items-center space-x-2">
              <FaMapMarkerAlt className="text-yellow-600" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-900">GPS Coverage Status:</p>
                <p className="text-yellow-800 text-xs mt-1">
                  {bins.filter(b => b.has_gps === true).length} bins with built-in GPS • 
                  {bins.filter(b => b.has_gps === false && b.location_set_by_resident).length} bins with resident-set locations • 
                  {bins.filter(b => b.has_gps === false && !b.location_set_by_resident).length} bins pending location setup
                </p>
              </div>
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

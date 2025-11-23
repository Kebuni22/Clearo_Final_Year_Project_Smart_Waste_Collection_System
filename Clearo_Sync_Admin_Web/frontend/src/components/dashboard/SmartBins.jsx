import React, { useEffect, useState } from 'react';
import { FaCogs, FaTrash, FaSync, FaWifi, FaExclamationTriangle } from 'react-icons/fa';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

const SmartBins = ({
  smartBinSearch = '',
  setSmartBinSearch = () => {},
}) => {
  const [smartBins, setSmartBins] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [initialLoading, setInitialLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [recheckTrigger, setRecheckTrigger] = useState(0);

  // Periodic recheck of online status every 30 seconds
  useEffect(() => {
    const recheckInterval = setInterval(() => {
      console.log('⏰ Rechecking bin online status...');
      setRecheckTrigger(prev => prev + 1);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(recheckInterval);
  }, []);

  // Real-time listener for smart bins - updates automatically without loading state
  useEffect(() => {
    if (!autoRefresh) {
      setConnectionStatus('paused');
      return;
    }

    console.log('🔄 Setting up real-time listener for Smart Bins');
    setConnectionStatus('connecting');

    const unsubscribe = onSnapshot(
      collection(db, 'smart_bins'),
      (snapshot) => {
        console.log('📦 Smart bins real-time update:', snapshot.size, 'documents');
        
        const now = new Date();
        const binsData = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Use connection_status, is_online, timestamp, and last_updated from Firebase
          const isOnline = checkBinOnlineStatus(
            data.timestamp, 
            data.last_updated, 
            data.connection_status,
            data.is_online
          );
          
          console.log(`Bin ${data.bin_id}: Firebase says ${data.connection_status} / ${data.is_online}, Actual: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
          
          return {
            id: doc.id,
            ...data,
            isOnline, // Override with calculated status
            lastChecked: now
          };
        });

        setSmartBins(binsData);
        setLastRefresh(new Date());
        setInitialLoading(false);
        setConnectionStatus('connected');
        
        const onlineCount = binsData.filter(b => b.isOnline).length;
        console.log(`✅ Smart Bins updated - Total: ${binsData.length}, Online: ${onlineCount}`);
      },
      (error) => {
        console.error('❌ Error in smart_bins listener:', error);
        setInitialLoading(false);
        setConnectionStatus('error');
      }
    );

    // Cleanup listener on unmount or when autoRefresh is disabled
    return () => {
      console.log('🛑 Cleaning up Smart Bins real-time listener');
      unsubscribe();
    };
  }, [autoRefresh]);

  // Recheck online status when recheckTrigger changes
  useEffect(() => {
    if (recheckTrigger > 0 && smartBins.length > 0) {
      console.log('🔍 Rechecking online status for all bins...');
      const updatedBins = smartBins.map(bin => {
        const wasOnline = bin.isOnline;
        const isOnline = checkBinOnlineStatus(
          bin.timestamp, 
          bin.last_updated, 
          bin.connection_status,
          bin.is_online
        );
        
        if (wasOnline !== isOnline) {
          console.log(`🔄 Bin ${bin.bin_id} status changed: ${wasOnline ? 'ONLINE' : 'OFFLINE'} → ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
        }
        
        return {
          ...bin,
          isOnline,
          lastChecked: new Date()
        };
      });
      
      setSmartBins(updatedBins);
      const onlineCount = updatedBins.filter(b => b.isOnline).length;
      console.log(`✅ Recheck complete - ${onlineCount}/${updatedBins.length} bins online`);
    }
  }, [recheckTrigger]);

  // Check if bin is online based on last update timestamp - 1 MINUTE TIMEOUT
  const checkBinOnlineStatus = (timestamp, lastUpdated, connectionStatus, isOnline) => {
    // First check: Use connection_status and is_online fields from Firebase
    if (connectionStatus?.toUpperCase() === 'ONLINE' && isOnline === true) {
      // Double check with timestamp - must be within last 1 minute
      if (!timestamp && !lastUpdated) return false;
      
      try {
        // Use last_updated or timestamp
        const lastUpdate = lastUpdated || timestamp;
        const updateTime = lastUpdate.toDate ? lastUpdate.toDate() : new Date(lastUpdate);
        const now = new Date();
        const diffSeconds = (now - updateTime) / 1000;
        
        // Consider OFFLINE if no update for more than 60 seconds (1 minute)
        const isActuallyOnline = diffSeconds < 60;
        
        if (!isActuallyOnline) {
          console.log(`⚠️ Bin marked ONLINE in Firebase but timestamp is ${diffSeconds.toFixed(0)}s old - marking as OFFLINE`);
        }
        
        return isActuallyOnline;
      } catch (e) {
        console.error('❌ Error checking timestamp:', e);
        return false;
      }
    }
    
    // If connection_status is not ONLINE, bin is offline
    return false;
  };

  // Defensive: ensure smartBins is always an array
  const binsArray = Array.isArray(smartBins) ? smartBins : [];

  // Filter smart bins based on search (case-insensitive, fallback to empty string)
  const filteredSmartBins = binsArray.filter(bin =>
    (bin.binId?.toString().toLowerCase().includes(smartBinSearch?.toLowerCase() || '') ||
     bin.bin_id?.toString().toLowerCase().includes(smartBinSearch?.toLowerCase() || '') ||
     bin.location?.toString().toLowerCase().includes(smartBinSearch?.toLowerCase() || '') ||
     bin.homeNumber?.toString().toLowerCase().includes(smartBinSearch?.toLowerCase() || ''))
  );

  // Helper to get color based on fill percentage
  const getFillColor = (percent) => {
    if (percent >= 90) return 'bg-red-600';
    if (percent >= 80) return 'bg-red-500';
    if (percent >= 60) return 'bg-orange-500';
    if (percent >= 40) return 'bg-yellow-500';
    if (percent >= 20) return 'bg-green-400';
    return 'bg-green-500';
  };

  // Helper to get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper to get fill status text and color
  const getFillStatus = (percent) => {
    if (percent >= 90) return { text: 'Critical', color: 'bg-red-100 text-red-700 border-red-200', icon: '🚨' };
    if (percent >= 80) return { text: 'Full', color: 'bg-red-100 text-red-800 border-red-200', icon: '⚠️' };
    if (percent >= 60) return { text: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '⬆️' };
    if (percent >= 40) return { text: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '➡️' };
    if (percent >= 20) return { text: 'Low', color: 'bg-green-100 text-green-700 border-green-200', icon: '⬇️' };
    return { text: 'Empty', color: 'bg-green-100 text-green-800 border-green-200', icon: '✓' };
  };

  // Helper to extract data using correct Firebase field names
  const extractBinData = (bin) => {
    // Use exact field names from Firebase
    let fill_percentage = Number(bin.fill_percentage) || 0;
    const bin_status = bin.bin_status || 'Unknown';
    const fill_level = bin.fill_level || 'Unknown';
    const location = bin.location || 'Unknown Location';
    const bin_id = bin.bin_id || bin.id;
    
    // System status - use correct field names
    const sensor_working = bin.sensor_working !== false;
    const wifi_connected = bin.wifi_connected !== false;
    const wifi_signal_strength = bin.wifi_signal_strength || 0;
    const is_critical = bin.is_critical || false;
    const is_full = bin.is_full || false;
    const needs_emptying = bin.needs_emptying || false;
    const connection_status = bin.connection_status || 'OFFLINE';
    
    // Physical measurements
    const distance_cm = Number(bin.distance_cm) || 0;
    const waste_height_cm = Number(bin.waste_height_cm) || 0;
    const bin_height_cm = Number(bin.bin_height_cm) || 30;
    const avg_distance = Number(bin.avg_distance) || 0;
    
    // GPS data
    const latitude = Number(bin.latitude) || 0;
    const longitude = Number(bin.longitude) || 0;
    const altitude_m = Number(bin.altitude_m) || 0;
    const gps_status = bin.gps_status || 'NONE';
    const satellites = Number(bin.satellites) || 0;
    
    // Device info
    const device_type = bin.device_type || 'Unknown';
    const firmware_version = bin.firmware_version || 'Unknown';
    const power_source = bin.power_source || 'Unknown';
    const uptime_seconds = Number(bin.uptime_seconds) || 0;
    
    // Timestamps - use last_updated or timestamp
    const last_updated = bin.last_updated;
    const timestamp = bin.timestamp;
    const lastUpdateTime = last_updated || timestamp;
    
    // Data counts
    const data_count = Number(bin.data_count) || 0;
    const error_count = Number(bin.error_count) || 0;
    
    // Ensure percentage is between 0-100
    fill_percentage = Math.max(0, Math.min(100, Math.round(fill_percentage)));
    
    // Calculate online status
    const isOnline = bin.isOnline !== undefined ? bin.isOnline : checkBinOnlineStatus(
      timestamp, 
      last_updated, 
      connection_status,
      bin.is_online
    );
    
    return {
      fill_percentage,
      bin_status,
      fill_level,
      location,
      bin_id,
      sensor_working,
      wifi_connected,
      wifi_signal_strength,
      is_critical,
      is_full,
      needs_emptying,
      connection_status,
      distance_cm,
      waste_height_cm,
      bin_height_cm,
      avg_distance,
      latitude,
      longitude,
      altitude_m,
      gps_status,
      satellites,
      device_type,
      firmware_version,
      power_source,
      uptime_seconds,
      timestamp: lastUpdateTime,
      data_count,
      error_count,
      isOnline
    };
  };

  // Format relative time for offline bins
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'Never';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } catch (e) {
      return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
          <FaTrash className="text-blue-600" />
          Clea~Ro Smart Bins
        </h2>
        
        {/* Enhanced Auto-refresh Control */}
        <div className="flex items-center space-x-3">
          {/* Auto-refresh toggle */}
          <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 font-medium">Real-time Updates</span>
          </label>

          {/* Connection Status indicator */}
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
            connectionStatus === 'connected' ? 'bg-green-50' :
            connectionStatus === 'connecting' ? 'bg-yellow-50' :
            connectionStatus === 'error' ? 'bg-red-50' : 'bg-gray-50'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
            }`}></div>
            <span className={`text-sm font-medium ${
              connectionStatus === 'connected' ? 'text-green-700' :
              connectionStatus === 'connecting' ? 'text-yellow-700' :
              connectionStatus === 'error' ? 'text-red-700' : 'text-gray-600'
            }`}>
              {connectionStatus === 'connected' ? 'Live' :
               connectionStatus === 'connecting' ? 'Connecting...' :
               connectionStatus === 'error' ? 'Error' : 'Paused'}
            </span>
          </div>

          {/* Online/Offline count with real-time indicator */}
          <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-blue-700">
                {filteredSmartBins.length} / {binsArray.length} Bins
              </span>
              <div className="h-4 w-px bg-blue-300"></div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  binsArray.filter(b => b.isOnline).length > 0 
                    ? 'bg-green-500 animate-pulse' 
                    : 'bg-gray-400'
                }`}></div>
                <span className={`text-xs font-bold ${
                  binsArray.filter(b => b.isOnline).length > 0 
                    ? 'text-green-700' 
                    : 'text-gray-600'
                }`}>
                  {binsArray.filter(b => b.isOnline).length} Online
                </span>
              </div>
            </div>
          </div>

          {/* Last update time with recheck indicator */}
          <div className="flex items-center space-x-2 text-xs text-gray-500 px-2">
            <FaSync className={connectionStatus === 'connected' ? 'animate-spin-slow' : ''} />
            <span>Checked: {lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
      
      {/* Search input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by Bin ID, Location, or Home Number..."
          value={smartBinSearch}
          onChange={e => setSmartBinSearch(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
      </div>

      {/* Smart Bins Grid/Table */}
      {initialLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading smart bins...</p>
        </div>
      ) : filteredSmartBins.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl text-blue-200 mb-4 flex justify-center">
            <FaCogs />
          </div>
          <p className="text-gray-600 text-lg">No smart bins found.</p>
          {smartBinSearch && (
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search criteria</p>
          )}
          {binsArray.length > 0 && (
            <p className="text-gray-400 text-sm mt-2">
              ({binsArray.length} total bins available)
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gradient-to-r from-blue-100 to-blue-50">
                <th className="py-4 px-6 border-b font-semibold text-blue-700 text-left">Bin ID</th>
                <th className="py-4 px-6 border-b font-semibold text-blue-700 text-left">Location</th>
                <th className="py-4 px-6 border-b font-semibold text-blue-700 text-center">Fill Level</th>
                <th className="py-4 px-6 border-b font-semibold text-blue-700 text-center">Status</th>
                <th className="py-4 px-6 border-b font-semibold text-blue-700 text-center">System Health</th>
              </tr>
            </thead>
            <tbody>
              {filteredSmartBins.map((bin, index) => {
                const binData = extractBinData(bin);
                const fillColor = getFillColor(binData.fill_percentage);
                const statusColor = getStatusColor(binData.bin_status);
                const fillStatus = getFillStatus(binData.fill_percentage);

                return (
                  <tr 
                    key={bin.id || binData.bin_id || index} 
                    className={`transition-all duration-300 border-b border-gray-100 animate-fadeIn ${
                      !binData.isOnline ? 'bg-gray-50 opacity-80' : 
                      binData.is_critical ? 'bg-red-50' : 
                      'hover:bg-blue-50 bg-white'
                    }`}
                  >
                    {/* Bin ID with Real-time Online Status Indicator */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <FaTrash className={binData.isOnline ? 'text-blue-500' : 'text-gray-400'} />
                            {/* Real-time Online/Offline indicator dot */}
                            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-sm transition-all duration-300 ${
                              binData.isOnline 
                                ? 'bg-green-500 animate-pulse' 
                                : 'bg-gray-400'
                            }`}></div>
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-semibold ${binData.isOnline ? 'text-gray-800' : 'text-gray-500'}`}>
                              {binData.bin_id}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {/* Online/Offline Badge */}
                          {binData.isOnline ? (
                            <span className="text-xs text-green-700 font-semibold flex items-center gap-1 bg-green-100 px-2 py-0.5 rounded border border-green-300">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                              Online
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600 font-medium flex items-center gap-1 bg-gray-200 px-2 py-0.5 rounded border border-gray-300">
                              ⚫ Offline
                            </span>
                          )}
                          
                          {binData.is_critical && (
                            <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                              <FaExclamationTriangle className="text-xs" />
                              Critical
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Location - Distance removed */}
                    <td className="py-4 px-6">
                      <div className="text-gray-700 font-medium">{binData.location}</div>
                    </td>
                    
                    {/* Enhanced Bin Visualization with Real-time Status */}
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-4">
                        {/* 3D-style bin container with real-time status overlay */}
                        <div className={`relative w-16 h-32 bg-gradient-to-b from-gray-300 to-gray-400 rounded-lg shadow-lg border-2 overflow-hidden transition-all duration-300 ${
                          binData.isOnline ? 'border-green-400 shadow-green-200' : 'border-gray-500 opacity-60'
                        }`}>
                          {/* ...existing bin visualization code... */}
                          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-gray-600 to-gray-500 rounded-t-lg border-b-2 border-gray-700 z-10"></div>
                          <div className="absolute top-3 left-1 right-1 bottom-1 bg-gray-100 rounded-b overflow-hidden">
                            <div
                              className={`absolute bottom-0 left-0 right-0 ${fillColor} transition-all duration-700 ease-in-out rounded-b`}
                              style={{ height: `${binData.fill_percentage}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
                              <div className="absolute inset-0 opacity-30">
                                <div className="w-full h-full" style={{
                                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
                                }}></div>
                              </div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                              <span className="text-lg font-bold text-gray-800 bg-white bg-opacity-90 px-2 py-1 rounded shadow-sm">
                                {binData.fill_percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="absolute top-3 left-0 right-0 bottom-1 pointer-events-none z-5">
                            {[25, 50, 75].map(level => (
                              <div
                                key={level}
                                className="absolute left-0 right-0 border-t border-dashed border-gray-400 opacity-30"
                                style={{ bottom: `${level}%` }}
                              ></div>
                            ))}
                          </div>
                          
                          {/* Real-time status overlay */}
                          {!binData.isOnline && (
                            <div className="absolute inset-0 bg-gray-900 bg-opacity-40 flex items-center justify-center z-30 backdrop-blur-[1px]">
                              <div className="bg-gray-700 px-2 py-1 rounded shadow-lg">
                                <span className="text-white text-xs font-bold">OFFLINE</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Live indicator for online bins */}
                          {binData.isOnline && (
                            <div className="absolute top-1 right-1 z-30">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-400"></div>
                            </div>
                          )}
                        </div>
                        
                        {/* Details */}
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="font-medium text-gray-700">
                            Waste: {binData.waste_height_cm} cm
                          </div>
                          <div className="text-gray-500">
                            Height: {binData.bin_height_cm} cm
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${fillStatus.color}`}>
                            <span>{fillStatus.icon}</span>
                            <span>{binData.fill_level}</span>
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Status */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColor} transition-all duration-300`}>
                          {binData.bin_status}
                        </span>
                        {binData.needs_emptying && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full border border-orange-200 font-medium">
                            Needs Emptying
                          </span>
                        )}
                        {binData.is_full && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full border border-red-200 font-medium">
                            Full
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* System Health with Real-time Indicators */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-2">
                        {/* WiFi with real-time status */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded transition-all duration-300 ${
                          !binData.isOnline ? 'bg-gray-200 border border-gray-300' :
                          binData.wifi_connected ? 'bg-green-100 border border-green-300 shadow-sm' : 'bg-red-100 border border-red-300'
                        }`}>
                          <FaWifi className={
                            !binData.isOnline ? 'text-gray-500' :
                            binData.wifi_connected ? 'text-green-600' : 'text-red-600'
                          } />
                          <span className={`text-sm font-medium ${
                            binData.isOnline ? 'text-gray-800' : 'text-gray-600'
                          }`}>
                            {!binData.isOnline ? 'Offline' : 
                             binData.wifi_connected ? 'Connected' : 'Disconnected'}
                          </span>
                          {binData.isOnline && binData.wifi_connected && (
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        
                        {/* Sensor with real-time status */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded transition-all duration-300 ${
                          !binData.isOnline ? 'bg-gray-200 border border-gray-300' :
                          binData.sensor_working ? 'bg-green-100 border border-green-300 shadow-sm' : 'bg-red-100 border border-red-300'
                        }`}>
                          <span className={`text-sm font-medium ${
                            !binData.isOnline ? 'text-gray-600' :
                            binData.sensor_working ? 'text-green-700' : 'text-red-700'
                          }`}>
                            Sensor: {!binData.isOnline ? 'N/A' :
                                    binData.sensor_working ? '✓ Working' : '✗ Error'}
                          </span>
                          {binData.isOnline && binData.sensor_working && (
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SmartBins;
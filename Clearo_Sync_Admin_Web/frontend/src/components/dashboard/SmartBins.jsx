import React, { useEffect } from 'react';
import { FaCogs, FaTrash } from 'react-icons/fa';

const SmartBins = ({
  smartBins,
  smartBinsLoading,
  smartBinSearch,
  setSmartBinSearch,
  fetchSmartBins
}) => {
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

  // Helper to extract fill_percentage and bin_status from fill_data field
  const extractFillData = (bin) => {
    const fillData = bin.fill_data || {};
    let fill_percentage = 0;
    let bin_status = 'Unknown';
    if (fillData) {
      fill_percentage = Number(fillData.fill_percentage) || 0;
      bin_status = fillData.bin_status || 'Unknown';
    }
    // If fill_percentage is between 0 and 1, treat as fraction
    if (fill_percentage > 0 && fill_percentage <= 1) {
      fill_percentage = Math.round(fill_percentage * 100);
    } else {
      fill_percentage = Math.round(fill_percentage);
    }
    return { fill_percentage, bin_status };
  };

  // Auto-refresh fill levels every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof fetchSmartBins === 'function' && !smartBinsLoading) {
        fetchSmartBins();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchSmartBins, smartBinsLoading]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
          <FaTrash className="text-blue-600" />
          Clea~Ro Smart Bins
        </h2>
        <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-blue-700 font-medium">Auto-refreshing every 5s</span>
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
      {smartBinsLoading ? (
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
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gradient-to-r from-blue-100 to-blue-50">
                <th className="py-4 px-6 border-b font-semibold text-blue-700 text-left">Bin ID</th>
                <th className="py-4 px-6 border-b font-semibold text-blue-700 text-center">Fill Level</th>
                <th className="py-4 px-6 border-b font-semibold text-blue-700 text-center">Fill Status</th>
                <th className="py-4 px-6 border-b font-semibold text-blue-700 text-center">Bin Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSmartBins.map((bin, index) => {
                // Defensive: fallback to bin.binId, bin.bin_id, bin.id
                const binId = bin.binId || bin.bin_id || bin.id || '';
                const { fill_percentage, bin_status } = extractFillData(bin);
                const fillColor = getFillColor(fill_percentage);
                const statusColor = getStatusColor(bin_status);
                const fillStatus = getFillStatus(fill_percentage);

                return (
                  <tr 
                    key={bin.id || binId || index} 
                    className="hover:bg-blue-50 transition-colors border-b border-gray-100"
                  >
                    <td className="py-4 px-6 text-gray-800 font-medium">
                      <div className="flex items-center gap-2">
                        <FaTrash className="text-gray-400" />
                        <span>{binId}</span>
                      </div>
                    </td>
                    
                    {/* Enhanced Bin Visualization */}
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-4">
                        {/* 3D-style bin container */}
                        <div className="relative w-16 h-32 bg-gradient-to-b from-gray-300 to-gray-400 rounded-lg shadow-lg border-2 border-gray-500 overflow-hidden">
                          {/* Bin lid */}
                          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-gray-600 to-gray-500 rounded-t-lg border-b-2 border-gray-700 z-10"></div>
                          
                          {/* Inner bin area */}
                          <div className="absolute top-3 left-1 right-1 bottom-1 bg-gray-100 rounded-b overflow-hidden">
                            {/* Fill level with animation */}
                            <div
                              className={`absolute bottom-0 left-0 right-0 ${fillColor} transition-all duration-700 ease-in-out rounded-b`}
                              style={{ height: `${fill_percentage}%` }}
                            >
                              {/* Animated shine effect */}
                              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
                              
                              {/* Waste texture */}
                              <div className="absolute inset-0 opacity-30">
                                <div className="w-full h-full" style={{
                                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
                                }}></div>
                              </div>
                            </div>
                            
                            {/* Percentage label */}
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                              <span className="text-lg font-bold text-gray-800 bg-white bg-opacity-90 px-2 py-1 rounded shadow-sm">
                                {fill_percentage}%
                              </span>
                            </div>
                          </div>
                          
                          {/* Level markers */}
                          <div className="absolute top-3 left-0 right-0 bottom-1 pointer-events-none z-5">
                            {[25, 50, 75].map(level => (
                              <div
                                key={level}
                                className="absolute left-0 right-0 border-t border-dashed border-gray-400 opacity-30"
                                style={{ bottom: `${level}%` }}
                              ></div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Percentage bar (alternative view) */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-20 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                            <div
                              className={`h-full ${fillColor} transition-all duration-700 ease-in-out rounded-full`}
                              style={{ width: `${fill_percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 font-medium">{fill_percentage}%</span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Fill Status Badge */}
                    <td className="py-4 px-6">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${fillStatus.color}`}>
                          <span>{fillStatus.icon}</span>
                          <span>{fillStatus.text}</span>
                        </span>
                      </div>
                    </td>
                    
                    {/* Bin Status */}
                    <td className="py-4 px-6">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColor}`}>
                          {bin_status}
                        </span>
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
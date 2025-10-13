import React, { useState, useEffect } from 'react';
import { FaTrashAlt, FaSearch, FaMapMarkerAlt, FaExclamationTriangle, FaSync } from 'react-icons/fa';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

const BinStatus = () => {
  const [bins, setBins] = useState([]);
  const [filteredBins, setFilteredBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Fetch bins from Firebase
  const fetchBins = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching bins from "bins" collection...');
      
      const snapshot = await getDocs(collection(db, 'bins'));
      console.log('Bins collection - Documents found:', snapshot.size);
      
      const binsData = [];
      
      snapshot.docs.forEach(doc => {
        try {
          const data = doc.data();
          console.log('Processing bin document:', doc.id, data);
          
          // Calculate fill percentage
          const capacity = data.capacity || 120;
          const fillLevel = data.fillLevel || 0;
          const fillPercentage = capacity > 0 ? Math.round((fillLevel / capacity) * 100) : 0;
          
          // Determine status based on fill level and immediatelyWant flag
          let status = data.status || 'Normal';
          if (data.immediatelyWant || data.immediately_want || data.urgent) {
            status = 'Critical';
          } else if (fillPercentage >= 80) {
            status = 'Full';
          } else if (fillPercentage >= 50) {
            status = 'Half';
          } else if (fillPercentage < 30) {
            status = 'Empty';
          } else {
            status = 'Normal';
          }
          
          const bin = {
            id: doc.id,
            binId: data.id || doc.id,
            location: data.location || data.address || data.place || 'Unknown Location',
            homeNumber: data.homeNumber || data.home_number || data.houseNumber || '',
            fillLevel: fillLevel,
            capacity: capacity,
            fillPercentage: fillPercentage,
            status: status,
            type: data.type || data.binType || data.wasteType || 'General',
            lastEmptied: data.lastEmptied || data.last_emptied || data.lastCollection || 'Never',
            immediatelyWant: Boolean(data.immediatelyWant || data.immediately_want || data.urgent),
            ...data
          };
          
          binsData.push(bin);
          console.log('Successfully processed bin:', bin);
        } catch (docError) {
          console.error('Error processing bin document:', doc.id, docError);
        }
      });
      
      console.log('Final bins data:', binsData);
      console.log(`Total bins found: ${binsData.length}`);
      
      if (binsData.length === 0) {
        console.warn('⚠️ No bins found in "bins" collection.');
        setError('No bins found in the database');
      }
      
      // Sort by critical status and fill level
      binsData.sort((a, b) => {
        if (a.immediatelyWant && !b.immediatelyWant) return -1;
        if (!a.immediatelyWant && b.immediatelyWant) return 1;
        return b.fillPercentage - a.fillPercentage;
      });
      
      setBins(binsData);
      setFilteredBins(binsData);
    } catch (err) {
      console.error('❌ Error fetching bins:', err);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      setError('Failed to load bins: ' + err.message);
      setBins([]);
      setFilteredBins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchBins, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter bins based on search and filters
  useEffect(() => {
    let filtered = [...bins];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(bin => 
        bin.binId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bin.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bin.homeNumber && bin.homeNumber.toString().includes(searchTerm))
      );
    }

    // Type filter
    if (selectedType) {
      filtered = filtered.filter(bin => 
        bin.type.toLowerCase() === selectedType.toLowerCase()
      );
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(bin => 
        bin.status.toLowerCase() === selectedStatus.toLowerCase()
      );
    }

    setFilteredBins(filtered);
  }, [searchTerm, selectedType, selectedStatus, bins]);

  // Calculate statistics
  const stats = {
    critical: bins.filter(b => b.status === 'Critical' || b.fillPercentage >= 80).length,
    half: bins.filter(b => b.fillPercentage >= 50 && b.fillPercentage < 80 && b.status !== 'Critical').length,
    low: bins.filter(b => b.fillPercentage < 50).length,
    total: bins.length
  };

  // Get unique types for filter
  const binTypes = [...new Set(bins.map(b => b.type))];

  const getFillColor = (level) => {
    if (level >= 80) return 'bg-red-500';
    if (level >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Full':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Half':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Empty':
      case 'Normal':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'Never') return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Loading state
  if (loading && bins.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <div className="flex flex-col items-center justify-center py-12">
          <FaTrashAlt className="w-12 h-12 text-green-600 animate-bounce mb-4" />
          <span className="text-lg text-gray-600 font-medium">Loading bin data...</span>
          <span className="text-sm text-gray-400 mt-2">Please wait while we fetch the information</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-green-700 flex items-center gap-2">
          <FaTrashAlt className="w-7 h-7" />
          Bin Status Monitoring
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({filteredBins.length} {filteredBins.length === 1 ? 'bin' : 'bins'})
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700 font-medium">Live updates</span>
          </div>
          <button
            onClick={fetchBins}
            disabled={loading}
            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh bins"
          >
            <FaSync className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 p-6 rounded-lg mb-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-700 mb-2 flex items-center gap-2">
          <FaTrashAlt className="w-5 h-5" />
          Real-time Bin Monitoring
        </h3>
        <p className="text-gray-700">Monitor fill levels and status of all bins across the city in real-time.</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <FaExclamationTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Error Loading Bins</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={fetchBins}
              className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by bin ID, location, or home number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
          />
        </div>
        <select 
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
        >
          <option value="">All Types</option>
          {binTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select 
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
        >
          <option value="">All Status</option>
          <option value="Critical">Critical</option>
          <option value="Full">Full</option>
          <option value="Half">Half</option>
          <option value="Normal">Normal</option>
          <option value="Empty">Empty</option>
        </select>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-red-100 to-red-200 p-5 rounded-lg border border-red-300 shadow-sm">
          <h4 className="text-sm font-semibold text-red-700 mb-1">Critical/Full</h4>
          <p className="text-3xl font-bold text-red-800">{stats.critical}</p>
          <p className="text-xs text-red-600 mt-1">Requires immediate attention</p>
        </div>
        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-5 rounded-lg border border-yellow-300 shadow-sm">
          <h4 className="text-sm font-semibold text-yellow-700 mb-1">Half Full</h4>
          <p className="text-3xl font-bold text-yellow-800">{stats.half}</p>
          <p className="text-xs text-yellow-600 mt-1">Monitor closely</p>
        </div>
        <div className="bg-gradient-to-r from-green-100 to-green-200 p-5 rounded-lg border border-green-300 shadow-sm">
          <h4 className="text-sm font-semibold text-green-700 mb-1">Low/Empty</h4>
          <p className="text-3xl font-bold text-green-800">{stats.low}</p>
          <p className="text-xs text-green-600 mt-1">Optimal condition</p>
        </div>
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-5 rounded-lg border border-blue-300 shadow-sm">
          <h4 className="text-sm font-semibold text-blue-700 mb-1">Total Bins</h4>
          <p className="text-3xl font-bold text-blue-800">{stats.total}</p>
          <p className="text-xs text-blue-600 mt-1">Active monitoring</p>
        </div>
      </div>

      {/* Bins Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gradient-to-r from-green-100 to-green-50">
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-left">Bin ID</th>
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-left">Location</th>
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-center">Type</th>
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-center">Fill Level</th>
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-center">Status</th>
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-center">Capacity</th>
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-center">Last Emptied</th>
            </tr>
          </thead>
          <tbody>
            {filteredBins.length > 0 ? (
              filteredBins.map((bin) => (
                <tr key={bin.id} className="hover:bg-green-50 transition-colors border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-800">
                    <div className="flex items-center gap-2">
                      {bin.immediatelyWant && (
                        <FaExclamationTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                      )}
                      <div>
                        <div className="font-semibold text-sm">{bin.binId}</div>
                        {bin.homeNumber && (
                          <div className="text-xs text-gray-500">Home: {bin.homeNumber}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-700">
                    <div className="flex items-center gap-2">
                      <FaMapMarkerAlt className="text-green-500 flex-shrink-0" />
                      <span className="text-sm">{bin.location}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold border border-blue-300">
                      {bin.type}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getFillColor(bin.fillPercentage)}`}
                          style={{ width: `${Math.min(bin.fillPercentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{bin.fillPercentage}%</span>
                      <span className="text-xs text-gray-500">{bin.fillLevel}L</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(bin.status)}`}>
                      {bin.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-sm font-medium text-gray-700">{bin.capacity}L</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-xs text-gray-600">{formatDate(bin.lastEmptied)}</span>
                  </td>
                </tr>
              ))
            ) : (
              !loading && (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FaTrashAlt className="w-20 h-20 text-gray-300 mb-4" />
                      <p className="text-xl font-semibold text-gray-500 mb-2">
                        {searchTerm || selectedType || selectedStatus ? 'No bins match your filters' : 'No bins found'}
                      </p>
                      <p className="text-sm text-gray-400">
                        {searchTerm || selectedType || selectedStatus 
                          ? 'Try adjusting your search or filter criteria' 
                          : 'No bin data available in the system'}
                      </p>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Results info */}
      {filteredBins.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredBins.length} of {bins.length} bins
          {(searchTerm || selectedType || selectedStatus) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('');
                setSelectedStatus('');
              }}
              className="ml-3 text-green-600 hover:text-green-700 font-medium underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BinStatus;
import React, { useState, useEffect } from 'react';
import { FaTrashAlt, FaSearch, FaMapMarkerAlt, FaExclamationTriangle, FaSync, FaEye, FaTimes } from 'react-icons/fa';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

const BinStatus = () => {
  const [bins, setBins] = useState([]);
  const [filteredBins, setFilteredBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [selectedBin, setSelectedBin] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch bins from Firebase
  const fetchBins = async () => {
    setLoading(true);
    
    try {
      const snapshot = await getDocs(collection(db, 'bins'));
      
      const binsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const capacity = data.capacity || 120;
        const fillLevel = data.fillLevel || 0;
        const fillPercentage = Math.round((fillLevel / capacity) * 100);
        
        return {
          id: doc.id,
          binId: data.id || doc.id,
          location: data.location || 'Unknown',
          fillLevel: fillLevel,
          fillPercentage: fillPercentage,
          capacity: capacity,
          type: data.type || 'General',
          urgent: Boolean(data.immediatelyWant || data.urgent),
          homeNumber: data.homeNumber || data.home_number || 'N/A',
          lastEmptied: data.lastEmptied || data.last_emptied || 'Never',
          status: data.status || 'Active',
          wasteType: data.wasteType || data.waste_type || data.type || 'General'
        };
      }).sort((a, b) => {
        if (a.urgent && !b.urgent) return -1;
        if (!a.urgent && b.urgent) return 1;
        return b.fillPercentage - a.fillPercentage;
      });
      
      setBins(binsData);
      setFilteredBins(binsData);
    } catch (err) {
      console.error('Error fetching bins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
    const interval = setInterval(fetchBins, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter bins
  useEffect(() => {
    let filtered = [...bins];

    if (searchTerm) {
      filtered = filtered.filter(bin => 
        bin.binId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bin.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterLevel !== 'all') {
      filtered = filtered.filter(bin => {
        if (filterLevel === 'critical') return bin.fillPercentage >= 80 || bin.urgent;
        if (filterLevel === 'high') return bin.fillPercentage >= 50 && bin.fillPercentage < 80;
        if (filterLevel === 'low') return bin.fillPercentage < 50;
        return true;
      });
    }

    setFilteredBins(filtered);
  }, [searchTerm, filterLevel, bins]);

  // Statistics
  const stats = {
    total: bins.length,
    critical: bins.filter(b => b.fillPercentage >= 80 || b.urgent).length,
    high: bins.filter(b => b.fillPercentage >= 50 && b.fillPercentage < 80).length,
    low: bins.filter(b => b.fillPercentage < 50).length
  };

  const getFillColor = (level) => {
    if (level >= 80) return 'bg-red-500';
    if (level >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (bin) => {
    if (bin.urgent || bin.fillPercentage >= 80) {
      return 'bg-red-100 text-red-700 border-red-300';
    }
    if (bin.fillPercentage >= 50) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
    return 'bg-green-100 text-green-700 border-green-300';
  };

  const openDetailsModal = (bin) => {
    setSelectedBin(bin);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setSelectedBin(null);
    setShowDetailsModal(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bins...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <FaTrashAlt className="text-2xl text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Bin Status</h1>
              <p className="text-gray-600">Real-time monitoring of all bins</p>
            </div>
          </div>
          <button
            onClick={fetchBins}
            disabled={loading}
            className="p-3 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Total Bins</p>
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">Critical</p>
            <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600 font-medium">High Level</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.high}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Low Level</p>
            <p className="text-2xl font-bold text-green-700">{stats.low}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Bin ID or Location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select 
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Levels</option>
            <option value="critical">Critical (&gt;80%)</option>
            <option value="high">High (50-80%)</option>
            <option value="low">Low (&lt;50%)</option>
          </select>
        </div>
      </div>

      {/* Bins Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Bins Overview ({filteredBins.length})
        </h2>

        {filteredBins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Bin ID</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBins.map((bin) => (
                  <tr key={bin.id} className="hover:bg-gray-50 transition-colors">
                    {/* Bin ID */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          {bin.urgent && (
                            <FaExclamationTriangle className="text-red-500 animate-pulse" size={14} />
                          )}
                          <span className="font-semibold text-gray-900">{bin.binId}</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-1">ID: {bin.id}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <FaMapMarkerAlt className="text-green-500" size={14} />
                        <span className="text-gray-700">{bin.location}</span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-4 px-4 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {bin.type}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(bin)}`}>
                        {bin.urgent || bin.fillPercentage >= 80 ? 'Critical' :
                         bin.fillPercentage >= 50 ? 'High' : 'Low'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => openDetailsModal(bin)}
                        className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors text-sm font-medium flex items-center space-x-1 mx-auto"
                      >
                        <FaEye size={14} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FaTrashAlt className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No bins found</p>
            <p className="text-gray-500 text-sm mt-2">
              {searchTerm || filterLevel !== 'all' 
                ? 'Try adjusting your filters' 
                : 'No bin data available'}
            </p>
          </div>
        )}
      </div>

      {/* Details Modal - Fully Scrollable */}
      {showDetailsModal && selectedBin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Fixed Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <FaTrashAlt className="text-2xl" />
                <div>
                  <h2 className="text-2xl font-bold">Bin Details</h2>
                  <p className="text-green-100 text-sm">{selectedBin.binId}</p>
                </div>
              </div>
              <button
                onClick={closeDetailsModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6" style={{ maxHeight: 'calc(90vh - 160px)' }}>
              {/* Status Alert */}
              {(selectedBin.urgent || selectedBin.fillPercentage >= 80) && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <FaExclamationTriangle className="text-red-500 text-xl" />
                    <div>
                      <p className="font-semibold text-red-800">Critical Status</p>
                      <p className="text-sm text-red-700">This bin requires immediate attention</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Bin ID</p>
                    <p className="font-semibold text-gray-900">{selectedBin.binId}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Home Number</p>
                    <p className="font-semibold text-gray-900">{selectedBin.homeNumber}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Location</p>
                    <div className="flex items-center space-x-2">
                      <FaMapMarkerAlt className="text-green-500" />
                      <p className="font-semibold text-gray-900">{selectedBin.location}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fill Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Fill Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Fill Percentage</span>
                    <span className="text-2xl font-bold text-gray-900">{selectedBin.fillPercentage}%</span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getFillColor(selectedBin.fillPercentage)}`}
                      style={{ width: `${selectedBin.fillPercentage}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-sm text-gray-600">Current Level</p>
                      <p className="font-semibold text-gray-900">{selectedBin.fillLevel} L</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Capacity</p>
                      <p className="font-semibold text-gray-900">{selectedBin.capacity} L</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Waste Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Waste Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Waste Type</p>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {selectedBin.wasteType}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <p className="font-semibold text-gray-900">{selectedBin.status}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Last Emptied</p>
                    <p className="font-semibold text-gray-900">{selectedBin.lastEmptied}</p>
                  </div>
                </div>
              </div>

              {/* Priority Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Priority</h3>
                <div className={`p-4 rounded-lg border-2 ${
                  selectedBin.urgent 
                    ? 'bg-red-50 border-red-300' 
                    : 'bg-green-50 border-green-300'
                }`}>
                  <p className={`font-semibold ${
                    selectedBin.urgent ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {selectedBin.urgent ? '⚠️ Urgent Collection Required' : '✓ Normal Priority'}
                  </p>
                </div>
              </div>
            </div>

            {/* Fixed Modal Footer */}
            <div className="flex-shrink-0 flex justify-end p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={closeDetailsModal}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BinStatus;
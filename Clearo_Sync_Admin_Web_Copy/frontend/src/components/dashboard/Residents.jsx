import React from 'react';
import { FaUsers, FaSearch, FaHome, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

const Residents = ({
  residents,
  residentsLoading,
  searchQuery,
  setSearchQuery,
  selectedRoad,
  setSelectedRoad,
  handleSearchChange,
  handleRoadChange
}) => {
  const filteredResidents = residents.filter((resident) => {
    return resident.homeNumber && resident.homeNumber.trim() !== '' &&
      (
        resident.name?.toLowerCase().includes(searchQuery) ||
        resident.email?.toLowerCase().includes(searchQuery) ||
        resident.homeNumber?.toLowerCase().includes(searchQuery)
      ) &&
      (
        !selectedRoad || resident.address?.toLowerCase().includes(selectedRoad.toLowerCase())
      );
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <FaUsers className="text-green-600" />
              </div>
              Residents Management
            </h2>
            <p className="text-gray-600 mt-2">Manage and view all registered residents</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">{filteredResidents.length}</div>
            <div className="text-sm text-gray-500">Total Residents</div>
          </div>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or home number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <FaMapMarkerAlt className="text-gray-400" />
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              value={selectedRoad}
              onChange={handleRoadChange}
            >
              <option value="">All Roads</option>
              {[...new Set(residents.filter(r => r.homeNumber).map((resident) => resident.address?.split(',')[0]))]
                .filter(Boolean)
                .map((road, idx) => (
                  <option key={idx} value={road}>
                    {road}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Loading State */}
      {residentsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
          <span className="ml-4 text-gray-600">Loading residents...</span>
        </div>
      ) : filteredResidents.length > 0 ? (
        /* Residents Table */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <FaHome className="text-green-600" />
                      <span>Home No.</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <FaUsers className="text-green-600" />
                      <span>Resident Name</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <FaMapMarkerAlt className="text-green-600" />
                      <span>Address</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <FaEnvelope className="text-green-600" />
                      <span>Email</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <FaPhone className="text-green-600" />
                      <span>Phone</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredResidents.map((resident, index) => (
                  <tr key={resident.id} className="hover:bg-green-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-green-700 font-bold text-sm">{resident.homeNumber}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{resident.name}</div>
                      <div className="text-sm text-gray-500">Resident #{index + 1}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={resident.address}>
                        {resident.address || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{resident.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{resident.phone || 'N/A'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaUsers className="text-gray-400 text-3xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Residents Found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || selectedRoad
              ? 'Try adjusting your search or filter criteria.'
              : 'No residents have been registered yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Residents;

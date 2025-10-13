import React from 'react';
import { FaTruck, FaUsers } from 'react-icons/fa';

const VehicleFleet = ({ 
  vehicles, 
  vehiclesLoading, 
  vehicleSearch, 
  setVehicleSearch,
  newVehicle,
  setNewVehicle,
  vehicleTypes,
  vehicleCapacities,
  vehicleStatuses,
  handleAddVehicle,
  handleUpdateVehicleStatus,
  handleDeleteVehicle
}) => {
  const filteredVehicles = vehicles.filter(vehicle =>
    (vehicle.vehicleNumber?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
     vehicle.type?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
     vehicle.driverName?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
     vehicle.status?.toLowerCase().includes(vehicleSearch.toLowerCase()))
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in use':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'out of service':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl p-8 mt-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className="p-3 bg-purple-100 rounded-xl mr-4">
            <FaTruck className="text-2xl text-purple-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-purple-800">Vehicle Fleet Management</h2>
            <p className="text-gray-600 mt-1">Manage and track your waste collection vehicles</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Vehicles</p>
          <p className="text-2xl font-bold text-purple-600">{vehicles.length}</p>
        </div>
      </div>
      
      {/* Search and Filter Section */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Vehicles</label>
            <input
              type="text"
              placeholder="Search by vehicle number, type, driver, or status..."
              value={vehicleSearch}
              onChange={e => setVehicleSearch(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>
          <div className="lg:w-auto flex items-end">
            <div className="bg-white px-4 py-3 rounded-xl border border-gray-200">
              <span className="text-sm text-gray-600">Filtered Results: </span>
              <span className="font-bold text-purple-600">{filteredVehicles.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Vehicle Form */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 mb-8 border border-purple-200">
        <h3 className="text-xl font-bold text-purple-800 mb-6 flex items-center">
          <div className="p-2 bg-purple-200 rounded-lg mr-3">
            <FaTruck className="text-purple-600" />
          </div>
          Add New Vehicle
        </h3>
        
        <form onSubmit={(e) => { e.preventDefault(); handleAddVehicle(); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
            {/* Vehicle Number */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-purple-700">
                Vehicle Number *
              </label>
              <input
                type="text"
                placeholder="e.g. WM-001"
                value={newVehicle.vehicleNumber}
                onChange={(e) => setNewVehicle({ ...newVehicle, vehicleNumber: e.target.value })}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                required
              />
            </div>

            {/* Vehicle Type */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-purple-700">
                Vehicle Type *
              </label>
              <select
                value={newVehicle.type}
                onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value, customType: '' })}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                required
              >
                <option value="">Select Type</option>
                {vehicleTypes.map((type, idx) => (
                  <option key={idx} value={type}>{type}</option>
                ))}
              </select>
              {newVehicle.type === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter custom type"
                  value={newVehicle.customType}
                  onChange={(e) => setNewVehicle({ ...newVehicle, customType: e.target.value })}
                  className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-400 mt-2"
                  required
                />
              )}
            </div>

            {/* Capacity */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-purple-700">
                Capacity (kg) *
              </label>
              <select
                value={newVehicle.capacity}
                onChange={(e) => setNewVehicle({ ...newVehicle, capacity: e.target.value, customCapacity: '' })}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                required
              >
                <option value="">Select Capacity</option>
                {vehicleCapacities.map((cap, idx) => (
                  <option key={idx} value={cap}>{cap} kg</option>
                ))}
              </select>
              {newVehicle.capacity === 'Other' && (
                <input
                  type="number"
                  placeholder="Enter capacity"
                  value={newVehicle.customCapacity || ''}
                  onChange={(e) => setNewVehicle({ ...newVehicle, customCapacity: e.target.value })}
                  className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-400 mt-2"
                  required
                  min="0"
                />
              )}
            </div>

            {/* Driver Name */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-purple-700">
                Driver Name *
              </label>
              <input
                type="text"
                placeholder="Enter driver name"
                value={newVehicle.driverName}
                onChange={(e) => setNewVehicle({ ...newVehicle, driverName: e.target.value })}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                required
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-purple-700">
                Initial Status
              </label>
              <select
                value={newVehicle.status}
                onChange={(e) => setNewVehicle({ ...newVehicle, status: e.target.value })}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
              >
                {vehicleStatuses.map((status, idx) => (
                  <option key={idx} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center"
            >
              <FaTruck className="mr-2" />
              Add Vehicle
            </button>
          </div>
        </form>
      </div>

      {/* Vehicles Table */}
      {vehiclesLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading vehicles...</p>
          </div>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-20">
          <div className="mb-6">
            <FaTruck className="text-6xl text-purple-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Vehicles Found</h3>
            <p className="text-gray-600">
              {vehicles.length === 0 
                ? "Start by adding your first vehicle to the fleet" 
                : "Try adjusting your search criteria"}
            </p>
          </div>
          {vehicles.length === 0 && (
            <button
              onClick={() => document.querySelector('input[placeholder*="WM-"]').focus()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-all"
            >
              Add First Vehicle
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <FaTruck className="mr-2" />
              Fleet Overview ({filteredVehicles.length} vehicles)
            </h3>
          </div>
          
          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-purple-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                    Vehicle Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                    Specifications
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-purple-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVehicles.map((vehicle, index) => (
                  <tr key={vehicle.id} className="hover:bg-purple-50 transition-colors duration-200">
                    {/* Vehicle Details */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <FaTruck className="text-purple-600 text-lg" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-lg font-bold text-gray-900">{vehicle.vehicleNumber}</div>
                          <div className="text-sm text-gray-500">Vehicle #{index + 1}</div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Specifications */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-gray-900">{vehicle.type}</div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                          {vehicle.capacity} kg capacity
                        </div>
                      </div>
                    </td>
                    
                    {/* Driver */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                          <FaUsers className="text-gray-600 text-sm" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{vehicle.driverName}</div>
                          <div className="text-xs text-gray-500">Assigned Driver</div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={vehicle.status}
                        onChange={(e) => handleUpdateVehicleStatus(vehicle.id, e.target.value)}
                        className={`px-3 py-2 rounded-full text-xs font-bold border-2 cursor-pointer transition-all hover:shadow-md ${getStatusColor(vehicle.status)}`}
                      >
                        {vehicleStatuses.map((status, idx) => (
                          <option key={idx} value={status}>{status}</option>
                        ))}
                      </select>
                      <div className="text-xs text-gray-500 mt-1">
                        Click to change
                      </div>
                    </td>
                    
                    {/* Added Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="space-y-1">
                        <div>
                          {vehicle.createdAt ? 
                            new Date(vehicle.createdAt.seconds ? vehicle.createdAt.toDate() : vehicle.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'Unknown'
                          }
                        </div>
                        <div className="text-xs text-gray-400">
                          {vehicle.createdAt ? 
                            new Date(vehicle.createdAt.seconds ? vehicle.createdAt.toDate() : vehicle.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : ''
                          }
                        </div>
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        className="inline-flex items-center px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 focus:ring-4 focus:ring-red-300 transition-all duration-300 transform hover:scale-105"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{filteredVehicles.length}</span> of <span className="font-semibold">{vehicles.length}</span> vehicles
              </div>
              <div className="flex items-center space-x-4">
                {/* Status Summary */}
                <div className="flex items-center space-x-3">
                  {vehicleStatuses.map(status => {
                    const count = filteredVehicles.filter(v => v.status === status).length;
                    if (count === 0) return null;
                    return (
                      <div key={status} className="flex items-center space-x-1">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(status).includes('green') ? 'bg-green-400' : 
                          getStatusColor(status).includes('blue') ? 'bg-blue-400' :
                          getStatusColor(status).includes('yellow') ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                        <span className="text-xs font-medium text-gray-600">{status}: {count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleFleet;

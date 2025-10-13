import React, { useState } from 'react';
import { 
  FaTruck, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSave, 
  FaTimes, 
  FaUser, 
  FaPhone, 
  FaIdCard, 
  FaEnvelope,
  FaSearch
} from 'react-icons/fa';

const Drivers = ({
  drivers,
  driversLoading,
  newDriver,
  setNewDriver,
  editDriverId,
  editDriverData,
  setEditDriverData,
  setEditDriverId,
  handleAddDriver,
  handleEditDriver,
  handleSaveDriver,
  handleDeleteDriver
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDrivers = drivers.filter(driver =>
    driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSubmit = (e) => {
    e.preventDefault();
    handleAddDriver();
    setShowAddForm(false);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    handleSaveDriver();
  };

  const handleCancelEdit = () => {
    setEditDriverId(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <FaTruck className="text-blue-600" />
              </div>
              Drivers Management
            </h2>
            <p className="text-gray-600 mt-2">Manage and track all delivery drivers</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{filteredDrivers.length}</div>
            <div className="text-sm text-gray-500">Active Drivers</div>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search drivers by name, email, or employee number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center font-medium"
          >
            <FaPlus className="mr-2" />
            Add New Driver
          </button>
        </div>
      </div>

      {/* Add Driver Form */}
      {showAddForm && (
        <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <FaPlus className="mr-2 text-blue-600" />
            Add New Driver
          </h3>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaUser className="inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter driver's full name"
                value={newDriver.name}
                onChange={e => setNewDriver({ ...newDriver, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaPhone className="inline mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="Enter phone number"
                value={newDriver.phone}
                onChange={e => setNewDriver({ ...newDriver, phone: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaIdCard className="inline mr-2" />
                Employee Number
              </label>
              <input
                type="text"
                placeholder="Enter employee number"
                value={newDriver.employeeNumber}
                onChange={e => setNewDriver({ ...newDriver, employeeNumber: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaEnvelope className="inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                value={newDriver.email}
                onChange={e => setNewDriver({ ...newDriver, email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
              >
                <FaSave className="mr-2" />
                Add Driver
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Driver Form */}
      {editDriverId && (
        <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <FaEdit className="mr-2 text-yellow-600" />
            Edit Driver Information
          </h3>
          <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaUser className="inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter driver's full name"
                value={editDriverData.name}
                onChange={e => setEditDriverData({ ...editDriverData, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaPhone className="inline mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="Enter phone number"
                value={editDriverData.phone}
                onChange={e => setEditDriverData({ ...editDriverData, phone: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaIdCard className="inline mr-2" />
                Employee Number
              </label>
              <input
                type="text"
                placeholder="Enter employee number"
                value={editDriverData.employeeNumber}
                onChange={e => setEditDriverData({ ...editDriverData, employeeNumber: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaEnvelope className="inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                value={editDriverData.email}
                onChange={e => setEditDriverData({ ...editDriverData, email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                required
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center"
              >
                <FaTimes className="mr-2" />
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center"
              >
                <FaSave className="mr-2" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Drivers Table */}
      {driversLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-gray-600">Loading drivers...</span>
        </div>
      ) : filteredDrivers.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <FaUser className="text-blue-600" />
                      <span>Driver Name</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <FaPhone className="text-blue-600" />
                      <span>Phone</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <FaIdCard className="text-blue-600" />
                      <span>Employee ID</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <FaEnvelope className="text-blue-600" />
                      <span>Email</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredDrivers.map((driver, index) => (
                  <tr key={driver.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-700 font-bold text-sm">
                            {driver.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                          <div className="text-sm text-gray-500">Driver #{index + 1}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{driver.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                        {driver.employeeNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{driver.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEditDriver(driver)}
                          className="bg-yellow-100 text-yellow-600 p-2 rounded-lg hover:bg-yellow-200 transition-colors"
                          title="Edit Driver"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteDriver(driver.id)}
                          className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors"
                          title="Delete Driver"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaTruck className="text-gray-400 text-3xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Drivers Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? 'Try adjusting your search criteria.'
              : 'No drivers have been added yet. Click "Add New Driver" to get started.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Drivers;

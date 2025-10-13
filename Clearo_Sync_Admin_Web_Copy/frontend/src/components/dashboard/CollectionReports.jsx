import React, { useState } from 'react';
import { FaChartBar, FaDownload, FaCalendarAlt, FaTruck, FaRecycle } from 'react-icons/fa';

const CollectionReports = () => {
  const [reportType, setReportType] = useState('daily');

  const mockStats = {
    totalCollections: 342,
    totalWaste: '18.7 tons',
    recycledMaterial: '12.3 tons',
    routesCompleted: 24,
    averageTime: '3.2 hours',
    fuelConsumption: '245 liters'
  };

  const recentReports = [
    { date: '2024-01-15', type: 'Daily', collections: 45, waste: '2.3 tons', status: 'Completed' },
    { date: '2024-01-14', type: 'Daily', collections: 52, waste: '2.8 tons', status: 'Completed' },
    { date: '2024-01-13', type: 'Daily', collections: 38, waste: '1.9 tons', status: 'Completed' },
    { date: '2024-01-12', type: 'Daily', collections: 41, waste: '2.1 tons', status: 'Completed' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <h2 className="text-2xl font-bold text-green-700 mb-6 flex items-center">
        <FaChartBar className="mr-3" />
        Collection Reports & Analytics
      </h2>

      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-blue-600 mb-2">Report Generation</h3>
        <p className="text-gray-600">Generate detailed reports on waste collection activities and performance metrics.</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Generate New Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Report Type</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="daily">Daily Reports</option>
              <option value="weekly">Weekly Summary</option>
              <option value="monthly">Monthly Report</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div className="flex items-end">
            <button className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center">
              <FaChartBar className="mr-2" />
              Generate
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Total Collections</p>
              <p className="text-xl font-bold text-blue-800">{mockStats.totalCollections}</p>
            </div>
            <FaTruck className="text-blue-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Total Waste</p>
              <p className="text-xl font-bold text-green-800">{mockStats.totalWaste}</p>
            </div>
            <FaRecycle className="text-green-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700">Recycled</p>
              <p className="text-xl font-bold text-purple-800">{mockStats.recycledMaterial}</p>
            </div>
            <FaRecycle className="text-purple-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Routes</p>
              <p className="text-xl font-bold text-yellow-800">{mockStats.routesCompleted}</p>
            </div>
            <FaCalendarAlt className="text-yellow-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-100 to-red-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Avg Time</p>
              <p className="text-xl font-bold text-red-800">{mockStats.averageTime}</p>
            </div>
            <FaChartBar className="text-red-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-700">Fuel Used</p>
              <p className="text-xl font-bold text-indigo-800">{mockStats.fuelConsumption}</p>
            </div>
            <FaTruck className="text-indigo-600 text-2xl" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Recent Reports</h3>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
            <FaDownload className="mr-2" />
            Export All
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Collections</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Waste Collected</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentReports.map((report, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">{report.date}</td>
                  <td className="py-3 px-4 text-gray-600">{report.type}</td>
                  <td className="py-3 px-4 text-gray-600">{report.collections}</td>
                  <td className="py-3 px-4 text-gray-600">{report.waste}</td>
                  <td className="py-3 px-4">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      {report.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">View</button>
                    <button className="text-green-600 hover:text-green-800">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CollectionReports;

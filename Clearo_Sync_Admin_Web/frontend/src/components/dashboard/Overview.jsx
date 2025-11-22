import React from 'react';
import { FaUsers, FaTrashAlt, FaClipboardList, FaExclamationCircle, FaCogs, FaCalendarAlt, FaTruck, FaLeaf, FaTasks } from 'react-icons/fa';

const Overview = ({ userData, totalUsers, activeBins, binRequests, reportedIssues, setSelectedView }) => {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {greeting}, {userData?.name}! 👋
              </h1>
              <p className="text-xl text-green-100 font-medium">{userData?.position}</p>
            </div>
            <p className="text-green-50 text-lg max-w-2xl leading-relaxed">
              Welcome to your comprehensive waste management dashboard. Monitor operations, track progress, and manage your community efficiently.
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-3xl flex items-center justify-center backdrop-blur-sm">
              <FaLeaf className="text-6xl text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-green-200 transform hover:-translate-y-1 cursor-pointer"
          onClick={() => setSelectedView('residents')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300">
              <FaUsers className="text-3xl text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Total Users</h3>
            <p className="text-3xl font-bold text-green-600">{totalUsers}</p>
            <p className="text-sm text-gray-500 mt-2">Active community members</p>
          </div>
        </div>

        <div 
          className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-blue-200 transform hover:-translate-y-1 cursor-pointer"
          onClick={() => setSelectedView('binStatus')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300">
              <FaTrashAlt className="text-3xl text-blue-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Total Bins</h3>
            <p className="text-3xl font-bold text-blue-600">{activeBins}</p>
            <p className="text-sm text-gray-500 mt-2">Deployed across city</p>
          </div>
        </div>

        <div 
          className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-yellow-200 transform hover:-translate-y-1 cursor-pointer"
          onClick={() => setSelectedView('binRequests')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-4 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl group-hover:from-yellow-200 group-hover:to-yellow-300 transition-all duration-300">
              <FaClipboardList className="text-3xl text-yellow-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Bin Requests</h3>
            <p className="text-3xl font-bold text-yellow-600">{binRequests?.length || 0}</p>
            <p className="text-sm text-gray-500 mt-2">
              {binRequests?.length === 0 ? (
                <span className="text-green-600">✓ All requests processed</span>
              ) : binRequests?.length === 1 ? (
                'Awaiting approval'
              ) : (
                'Awaiting approval'
              )}
            </p>
          </div>
        </div>

        {/* Reported Issues Card */}
        <div 
          className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-red-200 transform hover:-translate-y-1 cursor-pointer"
          onClick={() => setSelectedView('reportedIssues')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-4 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl group-hover:from-red-200 group-hover:to-red-300 transition-all duration-300">
              <FaExclamationCircle className="text-3xl text-red-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Reported Issues</h3>
            <p className="text-3xl font-bold text-red-600">{reportedIssues?.length || 0}</p>
            <p className="text-sm text-gray-500 mt-2">
              {reportedIssues?.length === 0 ? (
                <span className="text-green-600">✓ No pending issues</span>
              ) : reportedIssues?.length === 1 ? (
                'Needs attention'
              ) : (
                'Need attention'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
            <FaCogs className="text-green-600" />
          </div>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setSelectedView('todayTasks')}
            className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-300 group border border-blue-200 hover:border-blue-300"
          >
            <FaTasks className="text-3xl text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-gray-800">Today Tasks</div>
          </button>
          <button
            onClick={() => setSelectedView('schedules')}
            className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-300 group border border-green-200 hover:border-green-300"
          >
            <FaCalendarAlt className="text-3xl text-green-600 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-gray-800">Manage Schedules</div>
          </button>
          <button
            onClick={() => setSelectedView('immediatePickups')}
            className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all duration-300 group border border-purple-200 hover:border-purple-300"
          >
            <FaTruck className="text-3xl text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-gray-800">Immediate Pickups</div>
          </button>
          <button
            onClick={() => setSelectedView('reportedIssues')}
            className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl hover:from-red-100 hover:to-red-200 transition-all duration-300 group border border-red-200 hover:border-red-300"
          >
            <FaExclamationCircle className="text-3xl text-red-600 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-gray-800">Handle Issues</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Overview;

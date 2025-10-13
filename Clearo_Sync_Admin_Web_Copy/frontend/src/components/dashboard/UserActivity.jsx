import React, { useState } from 'react';
import { FaUsers, FaEye, FaCalendarAlt, FaChartLine, FaUserPlus } from 'react-icons/fa';

const UserActivity = () => {
  const [timeRange, setTimeRange] = useState('today');

  const activityStats = {
    totalUsers: 1247,
    activeToday: 89,
    newRegistrations: 12,
    averageSession: '24 min',
    mostUsedFeature: 'Bin Requests',
    totalSessions: 156
  };

  const recentActivity = [
    { user: 'John Doe', action: 'Submitted bin request', time: '5 minutes ago', type: 'request' },
    { user: 'Jane Smith', action: 'Reported an issue', time: '12 minutes ago', type: 'issue' },
    { user: 'Mike Johnson', action: 'Shared an item', time: '18 minutes ago', type: 'sharing' },
    { user: 'Sarah Wilson', action: 'Updated profile', time: '25 minutes ago', type: 'profile' },
    { user: 'David Brown', action: 'Scheduled pickup', time: '31 minutes ago', type: 'schedule' },
    { user: 'Lisa Garcia', action: 'Viewed recycling info', time: '45 minutes ago', type: 'info' },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'request': return '📋';
      case 'issue': return '⚠️';
      case 'sharing': return '🤝';
      case 'profile': return '👤';
      case 'schedule': return '📅';
      case 'info': return '💡';
      default: return '📊';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'request': return 'bg-blue-50 border-blue-200';
      case 'issue': return 'bg-red-50 border-red-200';
      case 'sharing': return 'bg-green-50 border-green-200';
      case 'profile': return 'bg-purple-50 border-purple-200';
      case 'schedule': return 'bg-yellow-50 border-yellow-200';
      case 'info': return 'bg-indigo-50 border-indigo-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <h2 className="text-2xl font-bold text-green-700 mb-6 flex items-center">
        <FaUsers className="mr-3" />
        User Activity Dashboard
      </h2>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-purple-600 mb-2">Activity Overview</h3>
        <p className="text-gray-600">Monitor user engagement, activity patterns, and system usage analytics.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {['today', 'week', 'month', 'custom'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === range
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Total Users</p>
              <p className="text-xl font-bold text-blue-800">{activityStats.totalUsers}</p>
            </div>
            <FaUsers className="text-blue-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Active Today</p>
              <p className="text-xl font-bold text-green-800">{activityStats.activeToday}</p>
            </div>
            <FaEye className="text-green-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700">New Users</p>
              <p className="text-xl font-bold text-purple-800">{activityStats.newRegistrations}</p>
            </div>
            <FaUserPlus className="text-purple-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Avg Session</p>
              <p className="text-xl font-bold text-yellow-800">{activityStats.averageSession}</p>
            </div>
            <FaCalendarAlt className="text-yellow-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-100 to-red-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Sessions</p>
              <p className="text-xl font-bold text-red-800">{activityStats.totalSessions}</p>
            </div>
            <FaChartLine className="text-red-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-700">Top Feature</p>
              <p className="text-sm font-bold text-indigo-800">{activityStats.mostUsedFeature}</p>
            </div>
            <FaChartLine className="text-indigo-600 text-2xl" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Recent User Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.map((activity, index) => (
            <div key={index} className={`p-4 border-l-4 ${getActivityColor(activity.type)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{activity.user}</p>
                    <p className="text-gray-600">{activity.action}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserActivity;

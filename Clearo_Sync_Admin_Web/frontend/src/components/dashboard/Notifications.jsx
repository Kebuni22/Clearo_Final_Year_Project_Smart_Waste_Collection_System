import React, { useState } from 'react';
import { FaBell, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTrash } from 'react-icons/fa';

const Notifications = () => {
  const [filter, setFilter] = useState('all');

  const mockNotifications = [
    {
      id: 1,
      type: 'warning',
      title: 'High Fill Level Alert',
      message: 'Bin BIN-001 on Main Street is 95% full and needs immediate attention',
      time: '5 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'info',
      title: 'Schedule Update',
      message: 'Collection schedule for Oak Road has been updated to 2 PM today',
      time: '1 hour ago',
      read: false
    },
    {
      id: 3,
      type: 'success',
      title: 'Collection Completed',
      message: 'Waste collection for Pine Street area has been completed successfully',
      time: '2 hours ago',
      read: true
    },
    {
      id: 4,
      type: 'error',
      title: 'System Alert',
      message: 'Smart bin sensor malfunction detected in residential area',
      time: '3 hours ago',
      read: true
    },
  ];

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
      case 'error':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'success':
        return <FaCheckCircle className="text-green-500" />;
      default:
        return <FaInfoCircle className="text-blue-500" />;
    }
  };

  const getBackgroundColor = (type, read) => {
    const baseColor = read ? 'opacity-60' : '';
    switch (type) {
      case 'warning':
      case 'error':
        return `bg-red-50 border-red-200 ${baseColor}`;
      case 'success':
        return `bg-green-50 border-green-200 ${baseColor}`;
      default:
        return `bg-blue-50 border-blue-200 ${baseColor}`;
    }
  };

  const filteredNotifications = mockNotifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <FaBell className="text-2xl text-green-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-green-700">Notifications</h2>
            <p className="text-gray-600">You have {unreadCount} unread notifications</p>
          </div>
        </div>
        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
          {unreadCount} New
        </div>
      </div>

      <div className="flex space-x-2 mb-6">
        {[{
          key: 'all',
          label: 'All',
          count: mockNotifications.length
        },
        {
          key: 'unread',
          label: 'Unread',
          count: unreadCount
        },
        {
          key: 'read',
          label: 'Read',
          count: mockNotifications.length - unreadCount
        }
        ].map((filterOption) => (
          <button
            key={filterOption.key}
            onClick={() => setFilter(filterOption.key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              filter === filterOption.key
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{filterOption.label}</span>
            <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
              {filterOption.count}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getBackgroundColor(notification.type, notification.read)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-800">{notification.title}</h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{notification.message}</p>
                    <p className="text-sm text-gray-500">{notification.time}</p>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  {!notification.read && (
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Mark as Read
                    </button>
                  )}
                  <button className="text-red-600 hover:text-red-800">
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <FaBell className="text-4xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No notifications found for the selected filter.</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Showing {filteredNotifications.length} of {mockNotifications.length} notifications
          </span>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Mark All as Read
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;

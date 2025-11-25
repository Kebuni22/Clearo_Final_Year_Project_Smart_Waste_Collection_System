import React, { useState, useEffect } from 'react';
import { FaUsers, FaChartLine, FaSync } from 'react-icons/fa';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';

const UserActivity = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityStats, setActivityStats] = useState({
    totalUsers: 0,
    mostUsedFeature: 'N/A',
    totalSessions: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchUserActivity();
  }, []);

  const fetchUserActivity = async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Fetch all users and create a map for quick lookup
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersMap = {};
      const usersData = usersSnapshot.docs.map(doc => {
        const userData = {
          id: doc.id,
          ...doc.data()
        };
        // Create map with userId as key
        usersMap[doc.id] = userData.name || userData.displayName || userData.email || 'Unknown User';
        return userData;
      });

      // Count new registrations today
      const newToday = usersData.filter(user => {
        if (user.createdAt) {
          const createdDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
          return createdDate >= todayStart;
        }
        return false;
      }).length;

      // Fetch recent activities from multiple collections
      const activities = [];

      // Fetch login attempts (suspicious activity)
      try {
        const loginAttemptsSnapshot = await getDocs(
          query(collection(db, 'login_attempts'), orderBy('timestamp', 'desc'), limit(20))
        );
        
        // Group login attempts by user and detect multiple attempts
        const loginAttemptsByUser = {};
        loginAttemptsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const userId = data.userId || data.email;
          const userName = data.userName || usersMap[data.userId] || data.email || 'Unknown User';
          
          if (!loginAttemptsByUser[userId]) {
            loginAttemptsByUser[userId] = {
              userName,
              attempts: [],
              failed: 0,
              success: 0
            };
          }
          
          loginAttemptsByUser[userId].attempts.push(data);
          if (data.success === false || data.status === 'failed') {
            loginAttemptsByUser[userId].failed++;
          } else if (data.success === true || data.status === 'success') {
            loginAttemptsByUser[userId].success++;
          }
        });

        // Add activities for users with multiple login attempts or failed logins
        Object.entries(loginAttemptsByUser).forEach(([userId, data]) => {
          const totalAttempts = data.attempts.length;
          const latestAttempt = data.attempts[0];
          const timestamp = latestAttempt.timestamp?.toDate ? latestAttempt.timestamp.toDate() : new Date(latestAttempt.timestamp || Date.now());
          
          if (data.failed >= 3) {
            activities.push({
              user: data.userName,
              action: `⚠️ Multiple failed login attempts (${data.failed} failed)`,
              time: getTimeAgo(timestamp),
              type: 'warning',
              timestamp: timestamp,
              priority: 'high'
            });
          } else if (totalAttempts >= 5) {
            activities.push({
              user: data.userName,
              action: `🔄 Multiple login sessions (${totalAttempts} attempts)`,
              time: getTimeAgo(timestamp),
              type: 'info',
              timestamp: timestamp
            });
          } else if (data.success > 0) {
            activities.push({
              user: data.userName,
              action: '✓ Logged in successfully',
              time: getTimeAgo(timestamp),
              type: 'profile',
              timestamp: timestamp
            });
          }
        });
      } catch (loginErr) {
        console.warn('Login attempts collection not found or error:', loginErr);
      }

      // Fetch bin requests
      const binRequestsSnapshot = await getDocs(
        query(collection(db, 'bin_requests'), orderBy('timestamp', 'desc'), limit(15))
      );
      binRequestsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const userName = data.userName || usersMap[data.userId] || data.name || data.email || 'Unknown User';
        activities.push({
          user: userName,
          action: `📋 Submitted bin request - ${data.binType || 'Standard'} bin`,
          time: getTimeAgo(data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)),
          type: 'request',
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
        });
      });

      // Fetch reported issues
      const issuesSnapshot = await getDocs(
        query(collection(db, 'issues'), orderBy('timestamp', 'desc'), limit(15))
      );
      issuesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const userName = data.userName || usersMap[data.userId] || data.name || data.email || 'Unknown User';
        activities.push({
          user: userName,
          action: `⚠️ Reported issue: ${data.title || data.category}`,
          time: getTimeAgo(data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)),
          type: 'issue',
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
        });
      });

      // Fetch immediate pickups
      const pickupsSnapshot = await getDocs(
        query(collection(db, 'immediate_pickups'), orderBy('timestamp', 'desc'), limit(15))
      );
      pickupsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const userName = data.userName || usersMap[data.userId] || data.name || data.email || 'Unknown User';
        activities.push({
          user: userName,
          action: '📅 Requested immediate pickup',
          time: getTimeAgo(data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)),
          type: 'schedule',
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
        });
      });

      // Fetch sharing posts (sharedItems collection)
      try {
        const sharingSnapshot = await getDocs(
          query(collection(db, 'sharedItems'), orderBy('createdAt', 'desc'), limit(15))
        );
        sharingSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const userName = data.owner || usersMap[data.ownerId] || data.userName || 'Unknown User';
          activities.push({
            user: userName,
            action: `🤝 Shared: ${data.title || 'an item'}`,
            time: getTimeAgo(data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)),
            type: 'sharing',
            timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
          });
        });
      } catch (sharingErr) {
        console.warn('sharedItems collection error:', sharingErr);
      }

      // Fetch user profile updates
      try {
        const profileUpdatesSnapshot = await getDocs(
          query(collection(db, 'profile_updates'), orderBy('timestamp', 'desc'), limit(10))
        );
        profileUpdatesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const userName = data.userName || usersMap[data.userId] || 'Unknown User';
          activities.push({
            user: userName,
            action: '👤 Updated profile information',
            time: getTimeAgo(data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)),
            type: 'profile',
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
          });
        });
      } catch (profileErr) {
        console.warn('Profile updates collection not found:', profileErr);
      }

      // Fetch feedback/reviews
      try {
        const feedbackSnapshot = await getDocs(
          query(collection(db, 'feedback'), orderBy('timestamp', 'desc'), limit(10))
        );
        feedbackSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const userName = data.userName || usersMap[data.userId] || 'Unknown User';
          activities.push({
            user: userName,
            action: `💬 Submitted feedback - ${data.rating ? `${data.rating}⭐` : 'Review'}`,
            time: getTimeAgo(data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)),
            type: 'info',
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
          });
        });
      } catch (feedbackErr) {
        console.warn('Feedback collection not found:', feedbackErr);
      }

      // Sort activities by timestamp and get most recent
      activities.sort((a, b) => b.timestamp - a.timestamp);
      const topActivities = activities.slice(0, 20);

      // Calculate active users today (users who performed actions today)
      const activeToday = new Set(
        activities
          .filter(a => a.timestamp >= todayStart)
          .map(a => a.user)
      ).size;

      // Calculate most used feature
      const featureCounts = {
        'Bin Requests': binRequestsSnapshot.docs.length,
        'Issue Reports': issuesSnapshot.docs.length,
        'Pickup Requests': pickupsSnapshot.docs.length,
        'Item Sharing': activities.filter(a => a.type === 'sharing').length
      };
      const mostUsedFeature = Object.keys(featureCounts).reduce((a, b) => 
        featureCounts[a] > featureCounts[b] ? a : b
      );

      setActivityStats({
        totalUsers: usersData.length,
        mostUsedFeature: mostUsedFeature,
        totalSessions: activities.length
      });

      setRecentActivity(topActivities);
      setLoading(false);

      console.log('✅ User activity loaded:', {
        totalUsers: usersData.length,
        activities: activities.length,
        activeToday: activeToday,
        topActivities: topActivities.length
      });

    } catch (err) {
      console.error('Error fetching user activity:', err);
      setError('Failed to load user activity: ' + err.message);
      setLoading(false);
    }
  };

  const getTimeAgo = (date) => {
    if (!date || !(date instanceof Date)) return 'Unknown';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'request': return '📋';
      case 'issue': return '⚠️';
      case 'sharing': return '🤝';
      case 'profile': return '👤';
      case 'schedule': return '📅';
      case 'info': return '💡';
      case 'warning': return '🚨';
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
      case 'warning': return 'bg-orange-50 border-orange-300';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <div className="flex flex-col items-center justify-center py-12">
          <FaSync className="w-12 h-12 text-green-600 animate-spin mb-4" />
          <span className="text-lg text-gray-600 font-medium">Loading user activity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-green-700 flex items-center">
          <FaUsers className="mr-3" />
          User Activity Dashboard
        </h2>
        <button
          onClick={fetchUserActivity}
          className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
        >
          <FaSync className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-purple-600 mb-2">Activity Overview</h3>
        <p className="text-gray-600">Monitor user engagement, activity patterns, and system usage analytics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Total Users</p>
              <p className="text-xl font-bold text-blue-800">{activityStats.totalUsers}</p>
            </div>
            <FaUsers className="text-blue-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-100 to-red-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Activities</p>
              <p className="text-xl font-bold text-red-800">{activityStats.totalSessions}</p>
            </div>
            <FaChartLine className="text-red-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-700">Top Feature</p>
              <p className="text-xs font-bold text-indigo-800">{activityStats.mostUsedFeature}</p>
            </div>
            <FaChartLine className="text-indigo-600 text-2xl" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Recent User Activity</h3>
          <p className="text-sm text-gray-500 mt-1">Latest {recentActivity.length} user actions and events</p>
        </div>
        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className={`p-4 border-l-4 ${getActivityColor(activity.type)} hover:bg-gray-50 transition-colors`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{activity.user}</p>
                      <p className="text-gray-600">{activity.action}</p>
                      {activity.priority === 'high' && (
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          High Priority
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <FaUsers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No recent activity</p>
              <p className="text-sm text-gray-400 mt-1">User activities will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserActivity;

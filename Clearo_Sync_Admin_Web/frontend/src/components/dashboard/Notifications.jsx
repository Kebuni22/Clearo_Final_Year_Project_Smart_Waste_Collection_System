import React, { useState, useEffect, useRef } from 'react';
import { FaBell, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTrash, FaSync } from 'react-icons/fa';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

const Notifications = () => {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevNotificationsRef = useRef([]);
  const audioRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio('/notification-sound.mp3');
    audioRef.current.volume = 0.7;
    audioRef.current.preload = 'auto';

    // Test load the audio file
    audioRef.current.addEventListener('canplaythrough', () => {
      console.log('✅ Notification sound loaded successfully');
    });

    // Fallback: Use Web Audio API to generate beep sound if file not found
    audioRef.current.onerror = (e) => {
      console.warn('⚠️ Audio file not found, using Web Audio API fallback');
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Function to play notification sound
  const playNotificationSound = () => {
    if (!soundEnabled) {
      console.log('🔇 Sound is disabled');
      return;
    }

    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => {
          console.log('Audio play failed:', err);
          // Fallback to system beep
          playSystemBeep();
        });
      } else {
        playSystemBeep();
      }
    } catch (err) {
      console.error('Error playing sound:', err);
      playSystemBeep();
    }
  };

  // Fallback system beep using Web Audio API
  const playSystemBeep = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.error('Web Audio API failed:', err);
    }
  };

  // Test sound function
  const testSound = () => {
    console.log('🔊 Testing notification sound...');
    playNotificationSound();
    showBrowserNotification({
      id: 'test',
      message: 'This is a test notification with sound!',
      title: 'Test Notification'
    });
  };

  // Show browser notification
  const showBrowserNotification = (notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 Urgent Request - Clearo', {
        body: notification.message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: notification.id,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch notifications from Firestore with real-time updates
  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        orderBy('timestamp', 'desc')
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notificationsData = snapshot.docs.map((doc) => {
            const data = doc.data();
            
            // Handle different timestamp formats
            let timestamp = '';
            if (data.timestamp?.toDate) {
              timestamp = data.timestamp.toDate();
            } else if (data.createdAt?.toDate) {
              timestamp = data.createdAt.toDate();
            } else if (data.date?.toDate) {
              timestamp = data.date.toDate();
            } else {
              timestamp = new Date();
            }

            return {
              id: doc.id,
              type: data.type || 'info',
              title: data.title || 'Notification',
              message: data.message || '',
              time: getTimeAgo(timestamp),
              timestamp: timestamp,
              read: data.read || false,
              userId: data.userId || '',
              userName: data.userName || '',
              issueId: data.issueId || '',
              issueTitle: data.issueTitle || '',
              issueCategory: data.issueCategory || '',
              isUrgent: data.isUrgent || false,
              isAdminNotification: data.isAdminNotification || false,
              isImmediate: data.isImmediate || false,
              isAchievement: data.isAchievement || false,
              achievementType: data.achievementType || '',
              priority: data.priority || 'normal',
              // Check if it's a pickup request
              isPickupRequest: data.type === 'pickup_request' || data.issueCategory === 'Pickup Request',
              ...data
            };
          })
          // ✅ FILTER: Only show admin-related notifications
          .filter(notification => {
            // Exclude resident achievement notifications
            if (notification.isAchievement && notification.achievementType === 'top_contributor') {
              return false; // Don't show resident achievements in admin panel
            }
            
            // Show these types of notifications:
            // 1. Admin notifications (isAdminNotification = true)
            // 2. New issues reported by residents
            // 3. Pickup requests
            // 4. Urgent/immediate requests
            // 5. Issue replies
            return (
              notification.isAdminNotification === true ||
              notification.type === 'new_issue' ||
              notification.type === 'pickup_request' ||
              notification.isPickupRequest ||
              notification.isUrgent ||
              notification.isImmediate ||
              notification.type === 'issue_reply'
            );
          });

          // Check for new urgent/immediate notifications
          if (prevNotificationsRef.current.length > 0) {
            const newNotifications = notificationsData.filter(newNotif => 
              !prevNotificationsRef.current.some(oldNotif => oldNotif.id === newNotif.id)
            );

            // Play sound for: urgent, immediate, admin notifications (new issues), and pickup requests
            newNotifications.forEach(notification => {
              const shouldPlaySound = 
                notification.isUrgent || 
                notification.isImmediate || 
                notification.priority === 'urgent' ||
                notification.isAdminNotification || // New issue reported
                notification.isPickupRequest; // Pickup request
              
              if (shouldPlaySound) {
                console.log('🚨 New admin notification detected:', notification.title);
                console.log('Type:', notification.type, '| Category:', notification.issueCategory);
                playNotificationSound();
                showBrowserNotification(notification);
              }
            });
          }

          // Update refs
          prevNotificationsRef.current = notificationsData;
          
          // Set notifications (already filtered for admin)
          setNotifications(notificationsData);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching notifications:', err);
          setError('Failed to load notifications: ' + err.message);
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up notifications listener:', err);
      setError('Failed to set up notifications: ' + err.message);
      setLoading(false);
    }
  }, [soundEnabled]); // Added soundEnabled as dependency

  // Get time ago string
  const getTimeAgo = (date) => {
    if (!date) return 'Unknown';
    
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

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      alert('Failed to mark notification as read');
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const updatePromises = unreadNotifications.map(notification =>
        updateDoc(doc(db, 'notifications', notification.id), { read: true })
      );
      await Promise.all(updatePromises);
      alert('All notifications marked as read');
    } catch (err) {
      console.error('Error marking all as read:', err);
      alert('Failed to mark all notifications as read');
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
      alert('Failed to delete notification');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
      case 'error':
      case 'urgent':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'success':
      case 'resolved':
        return <FaCheckCircle className="text-green-500" />;
      case 'issue_reply':
        return <FaBell className="text-blue-500" />;
      default:
        return <FaInfoCircle className="text-blue-500" />;
    }
  };

  const getBackgroundColor = (type, read) => {
    const baseColor = read ? 'opacity-60' : '';
    switch (type) {
      case 'warning':
      case 'error':
      case 'urgent':
        return `bg-red-50 border-red-200 ${baseColor}`;
      case 'success':
      case 'resolved':
        return `bg-green-50 border-green-200 ${baseColor}`;
      case 'immediate':
        return `bg-orange-50 border-orange-200 ${baseColor} animate-pulse`;
      default:
        return `bg-blue-50 border-blue-200 ${baseColor}`;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // Loading state
  if (loading && notifications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <div className="flex flex-col items-center justify-center py-12">
          <FaSync className="w-12 h-12 text-green-600 animate-spin mb-4" />
          <span className="text-lg text-gray-600 font-medium">Loading notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center">
          <FaBell className="text-2xl text-green-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-green-700">Notifications</h2>
            <p className="text-gray-600">You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-colors ${
              soundEnabled 
                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${soundEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium">{soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF'}</span>
          </button>
          
          <button
            onClick={testSound}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            title="Test notification sound"
          >
            <FaBell className="text-sm" />
            <span className="text-sm font-medium">Test Sound</span>
          </button>

          {unreadCount > 0 && (
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
              {unreadCount} New
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <FaExclamationTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Error Loading Notifications</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-2 mb-6 flex-wrap gap-2">
        {[{
          key: 'all',
          label: 'All',
          count: notifications.length
        },
        {
          key: 'unread',
          label: 'Unread',
          count: unreadCount
        },
        {
          key: 'read',
          label: 'Read',
          count: notifications.length - unreadCount
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
            <span className={`px-2 py-1 rounded-full text-xs ${
              filter === filterOption.key
                ? 'bg-white bg-opacity-20'
                : 'bg-gray-200'
            }`}>
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
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      )}
                      {(notification.isUrgent || notification.isImmediate) && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-300 animate-pulse">
                          🚨 {notification.isImmediate ? 'IMMEDIATE' : 'URGENT'}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{notification.message}</p>
                    
                    {/* Show issue details for new issue notifications */}
                    {notification.isAdminNotification && notification.issueId && (
                      <div className="bg-white bg-opacity-60 p-3 rounded-lg mt-2 border border-gray-200">
                        <div className="text-sm space-y-1">
                          {notification.userName && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">Reported by:</span>
                              <span className="text-gray-600">{notification.userName}</span>
                            </div>
                          )}
                          {notification.issueCategory && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">Category:</span>
                              <span className="text-gray-600">{notification.issueCategory}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {notification.replyMessage && (
                      <div className="bg-white bg-opacity-50 p-2 rounded mt-2 border border-gray-300">
                        <p className="text-sm text-gray-700 italic">{notification.replyMessage}</p>
                      </div>
                    )}
                    <p className="text-sm text-gray-500 mt-2">{notification.time}</p>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  {!notification.read && (
                    <button 
                      onClick={() => markAsRead(notification.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
                    >
                      Mark as Read
                    </button>
                  )}
                  <button 
                    onClick={() => deleteNotification(notification.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <FaBell className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-500 mb-2">No notifications found</p>
            <p className="text-sm text-gray-400">
              {filter === 'all' 
                ? 'You have no notifications at this time.' 
                : `You have no ${filter} notifications.`}
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {notifications.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </span>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Mark All as Read
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;

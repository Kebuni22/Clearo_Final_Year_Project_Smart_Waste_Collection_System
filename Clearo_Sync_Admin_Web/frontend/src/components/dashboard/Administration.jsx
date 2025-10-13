import React, { useState, useEffect } from 'react';
import { FaUserCircle, FaUsers, FaEnvelope, FaPhone, FaBriefcase, FaSearch, FaPlus, FaEdit, FaTrash, FaCrown, FaSignInAlt, FaTimes, FaPaperPlane, FaInbox, FaEye } from 'react-icons/fa';
import { collection, getDocs, query, where, addDoc, orderBy } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';

const Administration = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [currentUserData, setCurrentUserData] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showMessagesSection, setShowMessagesSection] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messages, setMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [user] = useAuthState(auth);

  // Administrative positions that should be shown
  const adminPositions = [
    'Admin',
    'Public Health Officer',
    'Health Supervisor',
    'Health Inspector',
    'Operations Manager',
    'System Administrator',
    'Department Head'
  ];

  const departments = ['All', 'Operations', 'Health & Safety', 'Public Health', 'IT Support', 'Management'];

  useEffect(() => {
    fetchAdministrativeUsers();
    if (user) {
      fetchCurrentUserData();
      fetchMessages();
    }
  }, [user]);

  const fetchAdministrativeUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const adminUsers = [];
      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        
        // Check if user has an administrative position
        if (userData.position && adminPositions.some(pos => 
          userData.position.toLowerCase().includes(pos.toLowerCase())
        )) {
          adminUsers.push({
            id: doc.id,
            name: userData.name || userData.firstName + ' ' + (userData.lastName || '') || userData.displayName || 'Unknown Admin',
            position: userData.position,
            email: userData.email || 'No email',
            phone: userData.phone || userData.phoneNumber || 'No phone',
            department: userData.department || getDepartmentFromPosition(userData.position),
            status: userData.status || 'Active',
            createdAt: userData.createdAt,
            lastLogin: userData.lastLogin,
            ...userData
          });
        }
      });

      setAdmins(adminUsers);
    } catch (error) {
      console.error('Error fetching administrative users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserData = async () => {
    if (!user) return;
    
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.email === user.email) {
          setCurrentUserData({
            id: doc.id,
            name: userData.name || userData.firstName + ' ' + (userData.lastName || '') || userData.displayName || 'Current User',
            position: userData.position || 'Administrator',
            email: userData.email,
            phone: userData.phone || userData.phoneNumber || 'No phone',
            department: userData.department || getDepartmentFromPosition(userData.position),
            status: userData.status || 'Active',
            lastLogin: new Date(),
            ...userData
          });
        }
      });
    } catch (error) {
      console.error('Error fetching current user data:', error);
    }
  };

  const fetchMessages = async () => {
    if (!user) return;
    
    try {
      setLoadingMessages(true);
      const messagesRef = collection(db, 'adminMessages');
      const q = query(
        messagesRef,
        where('recipientEmail', '==', user.email),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const messagesData = [];
      snapshot.docs.forEach(doc => {
        messagesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const getDepartmentFromPosition = (position) => {
    if (!position) return 'Operations';
    
    const pos = position.toLowerCase();
    if (pos.includes('health') || pos.includes('inspector')) return 'Health & Safety';
    if (pos.includes('public')) return 'Public Health';
    if (pos.includes('system') || pos.includes('it')) return 'IT Support';
    if (pos.includes('manager') || pos.includes('head')) return 'Management';
    return 'Operations';
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.position?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'All' || admin.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastLogin = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewProfile = (admin) => {
    setSelectedAdmin(admin);
    setShowProfileModal(true);
  };

  const handleContactAdmin = (admin) => {
    setSelectedAdmin(admin);
    setMessageSubject('');
    setMessageText('');
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageText.trim() || !selectedAdmin || !currentUserData) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setSendingMessage(true);
      
      await addDoc(collection(db, 'adminMessages'), {
        senderName: currentUserData.name,
        senderEmail: currentUserData.email,
        senderPosition: currentUserData.position,
        recipientName: selectedAdmin.name,
        recipientEmail: selectedAdmin.email,
        subject: messageSubject,
        message: messageText,
        timestamp: new Date(),
        read: false
      });

      alert('Message sent successfully!');
      setShowMessageModal(false);
      setMessageSubject('');
      setMessageText('');
      setSelectedAdmin(null);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
          <span className="ml-4 text-gray-600">Loading administrative users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
      {/* Current User Info Banner */}
      {currentUserData && (
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-white text-xl font-bold">
                <FaCrown className="text-yellow-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Welcome, {currentUserData.name}</h3>
                <p className="text-green-100">{currentUserData.position}</p>
                <p className="text-green-100 text-sm">{currentUserData.department} Department</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center text-green-100 mb-2">
                <FaSignInAlt className="mr-2" />
                <span className="text-sm">Last Login: {formatLastLogin(currentUserData.lastLogin)}</span>
              </div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                currentUserData.status?.toLowerCase() === 'active' 
                  ? 'bg-green-400 text-green-800' 
                  : 'bg-yellow-400 text-yellow-800'
              }`}>
                {currentUserData.status}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <FaUserCircle className="text-green-600" />
              </div>
              Administration
            </h2>
            <p className="text-gray-600 mt-2">Manage administrative users and their roles</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">{filteredAdmins.length}</div>
            <div className="text-sm text-gray-500">Admin Users</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or position..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <FaBriefcase className="text-gray-400" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept} Department{dept !== 'All' ? '' : 's'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Messages Section Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowMessagesSection(!showMessagesSection)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FaInbox className="mr-2" />
          Messages ({messages.filter(m => !m.read).length} unread)
        </button>
      </div>

      {/* Messages Section */}
      {showMessagesSection && (
        <div className="mb-8 bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <FaInbox className="mr-2 text-blue-600" />
            Your Messages
          </h3>
          
          {loadingMessages ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map(message => (
                <div key={message.id} className={`bg-white p-4 rounded-lg border ${!message.read ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-800">{message.subject}</h4>
                      <p className="text-sm text-gray-600">From: {message.senderName} ({message.senderPosition})</p>
                    </div>
                    <span className="text-xs text-gray-500">{formatMessageDate(message.timestamp)}</span>
                  </div>
                  <p className="text-gray-700 text-sm">{message.message}</p>
                  {!message.read && (
                    <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      New
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No messages yet.</p>
          )}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Total Admins</p>
              <p className="text-2xl font-bold text-blue-800">{admins.length}</p>
            </div>
            <FaUsers className="text-blue-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Active Users</p>
              <p className="text-2xl font-bold text-green-800">
                {admins.filter(a => a.status?.toLowerCase() === 'active').length}
              </p>
            </div>
            <FaUserCircle className="text-green-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700">Health Officers</p>
              <p className="text-2xl font-bold text-purple-800">
                {admins.filter(a => a.position?.toLowerCase().includes('health')).length}
              </p>
            </div>
            <FaBriefcase className="text-purple-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Public Health</p>
              <p className="text-2xl font-bold text-yellow-800">
                {admins.filter(a => a.position?.toLowerCase().includes('public')).length}
              </p>
            </div>
            <FaUserCircle className="text-yellow-600 text-2xl" />
          </div>
        </div>
      </div>

      {/* Admin Cards */}
      {filteredAdmins.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredAdmins.map((admin) => (
            <div key={admin.id} className={`bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border shadow-lg hover:shadow-xl transition-all duration-300 ${
              currentUserData && admin.email === currentUserData.email 
                ? 'border-green-300 ring-2 ring-green-200' 
                : 'border-gray-200'
            }`}>
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {admin.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  {currentUserData && admin.email === currentUserData.email && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <FaCrown className="text-yellow-800 text-xs" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {admin.name}
                    {currentUserData && admin.email === currentUserData.email && (
                      <span className="text-green-600 text-sm ml-2">(You)</span>
                    )}
                  </h3>
                  <p className="text-sm text-green-600 font-medium">{admin.position}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(admin.status)}`}>
                    {admin.status}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <FaEnvelope className="mr-3 text-green-500 flex-shrink-0" />
                  <span className="text-sm truncate">{admin.email}</span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <FaPhone className="mr-3 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{admin.phone}</span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <FaBriefcase className="mr-3 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{admin.department}</span>
                </div>

                {admin.createdAt && (
                  <div className="flex items-center text-gray-600">
                    <FaUserCircle className="mr-3 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Joined: {formatDate(admin.createdAt)}</span>
                  </div>
                )}

                {admin.lastLogin && (
                  <div className="flex items-center text-gray-600">
                    <FaSignInAlt className="mr-3 text-blue-500 flex-shrink-0" />
                    <span className="text-sm">Last Login: {formatLastLogin(admin.lastLogin)}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleViewProfile(admin)}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    View Profile
                  </button>
                  {currentUserData && admin.email !== currentUserData.email && (
                    <button 
                      onClick={() => handleContactAdmin(admin)}
                      className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      Contact
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 mb-8">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaUserCircle className="text-gray-400 text-3xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Administrative Users Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedDepartment !== 'All'
              ? 'Try adjusting your search or filter criteria.'
              : 'No users with administrative positions found in the system.'}
          </p>
        </div>
      )}

      {/* Department Overview */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Department Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {departments.filter(dept => dept !== 'All').map((dept) => {
            const deptCount = admins.filter(a => a.department === dept).length;
            return (
              <div key={dept} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-gray-800 mb-2">{dept}</h4>
                <p className="text-sm text-gray-600">{deptCount} member{deptCount !== 1 ? 's' : ''}</p>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${admins.length > 0 ? (deptCount / admins.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-t-2xl relative">
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
              <h2 className="text-2xl font-bold pr-12">Admin Profile</h2>
            </div>

            <div className="p-6">
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {selectedAdmin.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{selectedAdmin.name}</h3>
                  <p className="text-lg text-green-600 font-medium">{selectedAdmin.position}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getStatusColor(selectedAdmin.status)}`}>
                    {selectedAdmin.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Contact Information</h4>
                  
                  <div className="flex items-center text-gray-600">
                    <FaEnvelope className="mr-3 text-green-500 flex-shrink-0" />
                    <span>{selectedAdmin.email}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <FaPhone className="mr-3 text-green-500 flex-shrink-0" />
                    <span>{selectedAdmin.phone}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <FaBriefcase className="mr-3 text-green-500 flex-shrink-0" />
                    <span>{selectedAdmin.department}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Administrative Details</h4>
                  
                  {selectedAdmin.createdAt && (
                    <div className="flex items-center text-gray-600">
                      <FaUserCircle className="mr-3 text-green-500 flex-shrink-0" />
                      <span>Joined: {formatDate(selectedAdmin.createdAt)}</span>
                    </div>
                  )}

                  {selectedAdmin.lastLogin && (
                    <div className="flex items-center text-gray-600">
                      <FaSignInAlt className="mr-3 text-blue-500 flex-shrink-0" />
                      <span>Last Login: {formatLastLogin(selectedAdmin.lastLogin)}</span>
                    </div>
                  )}

                  <div className="flex items-center text-gray-600">
                    <FaUsers className="mr-3 text-purple-500 flex-shrink-0" />
                    <span>User ID: {selectedAdmin.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-t-2xl relative">
              <button
                onClick={() => setShowMessageModal(false)}
                className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
              <h2 className="text-2xl font-bold pr-12">Send Message</h2>
              <p className="text-blue-100 mt-1">To: {selectedAdmin.name}</p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="Enter message subject"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={sendingMessage}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageSubject.trim() || !messageText.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Administration;

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FaTruck, 
  FaClock, 
  FaEye, 
  FaEdit, 
  FaCheck, 
  FaTimes, 
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaUser,
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaFilter,
  FaSearch,
  FaSort
} from 'react-icons/fa';
import { doc, updateDoc, collection, getDocs, addDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const ImmediatePickups = ({
  immediatePickups = [],
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Modal states
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAssignDriverModal, setShowAssignDriverModal] = useState(false);
  const [showEditStatusModal, setShowEditStatusModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Driver assignment states
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assigningDriver, setAssigningDriver] = useState(false);
  
  // Status editing states
  const [editingStatus, setEditingStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Cancellation states
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState(null);
  
  // Loading state
  const [loading, setLoading] = useState(false);
  
  // User data state
  const [users, setUsers] = useState({});

  // Custom notification function
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch drivers from Firebase
  const fetchDrivers = async () => {
    try {
      const driversRef = collection(db, 'drivers');
      const snapshot = await getDocs(driversRef);
      const driversData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDrivers(driversData);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      showNotification('Error fetching drivers', 'error');
    }
  };

  // Fetch user details from Firebase
  const fetchUserDetails = async (userIds) => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersData = {};
      
      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userIds.includes(doc.id)) {
          usersData[doc.id] = {
            id: doc.id,
            name: userData.name || userData.firstName + ' ' + (userData.lastName || '') || userData.displayName || 'Unknown Customer',
            email: userData.email || 'No email',
            phone: userData.phone || userData.phoneNumber || 'No phone',
            ...userData
          };
        }
      });
      
      setUsers(prevUsers => ({ ...prevUsers, ...usersData }));
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  // Effect to fetch user details when pickups change
  useEffect(() => {
    const userIds = immediatePickups
      .map(pickup => pickup.userId)
      .filter(userId => userId && !users[userId]);
    
    if (userIds.length > 0) {
      fetchUserDetails(userIds);
    }
  }, [immediatePickups]);

  // Fetch confirmed pickups from DB
  const fetchConfirmedPickups = async () => {
    try {
      const snap = await getDocs(collection(db, 'confirmedPickups'));
      setConfirmedPickups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching confirmed pickups:', err);
    }
  };

  // Fetch confirmed/completed pickups on mount
  useEffect(() => {
    fetchConfirmedPickups();
  }, []);

  // Helper function to determine actual payment status based on payment method
  const getActualPaymentStatus = (pickup) => {
    const paymentMethod = pickup.paymentMethod?.toLowerCase();
    
    if (paymentMethod === 'cash on pickup' || paymentMethod === 'cash' || paymentMethod === 'cod') {
      // For cash on pickup, payment is pending until pickup is completed
      return pickup.status?.toLowerCase() === 'completed' ? 'Paid' : 'Pending';
    } else if (paymentMethod?.includes('credit') || paymentMethod?.includes('card') || 
               paymentMethod?.includes('wallet') || paymentMethod?.includes('online') || 
               paymentMethod?.includes('paypal')) {
      // For digital payments, check if payment was successful
      return pickup.paymentStatus === 'Failed' ? 'Failed' : 'Paid';
    } else {
      // Default case - use the stored payment status or pending
      return pickup.paymentStatus || 'Pending';
    }
  };

  // Helper function to get customer info from userId
  const getCustomerInfo = (pickup) => {
    const userData = users[pickup.userId];
    
    if (userData) {
      return {
        name: userData.name,
        phone: userData.phone,
        email: userData.email
      };
    }
    
    // Fallback to pickup data if user data not available
    return {
      name: pickup.customerName || pickup.userName || 'Loading...',
      phone: pickup.customerPhone || pickup.userPhone || 'No phone',
      email: pickup.customerEmail || pickup.userEmail || 'No email'
    };
  };

  // Helper function to format bins display
  const getBinsDisplay = (pickup) => {
    if (pickup.bins && Array.isArray(pickup.bins)) {
      return pickup.bins.join(', ');
    }
    return pickup.bin || 'Standard Pickup';
  };

  // Helper function to format pickup time display
  const getPickupTimeDisplay = (pickup) => {
    if (pickup.pickupDate && pickup.pickupTime) {
      return `${pickup.pickupDate} at ${pickup.pickupTime}`;
    }
    if (pickup.timestamp) {
      return pickup.timestamp.toDate ? pickup.timestamp.toDate().toLocaleString() : new Date(pickup.timestamp).toLocaleString();
    }
    return 'Time not specified';
  };

  // NEW: Use useMemo for activePickups to ensure correct filtering on refresh
  const activePickups = useMemo(() => {
    return immediatePickups
      .filter(pickup => {
        // Check if pickup time has passed
        const isTimePassed = (() => {
          if (pickup.pickupDate && pickup.pickupTime) {
            const pickupDateTime = new Date(`${pickup.pickupDate} ${pickup.pickupTime}`);
            return pickupDateTime < new Date();
          }
          return false;
        })();

        // Active pickups: not completed, not cancelled, and time hasn't passed
        return pickup.status !== 'Completed' && 
               pickup.status !== 'Cancelled' && 
               !isTimePassed;
      })
      .filter(pickup => {
        const binsText = getBinsDisplay(pickup).toLowerCase();
        const customerInfo = getCustomerInfo(pickup);
        
        const matchesSearch = binsText.includes(searchTerm.toLowerCase()) ||
                             customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             pickup.userId?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'All' || pickup.status === statusFilter;
        const actualPaymentStatus = getActualPaymentStatus(pickup);
        const matchesPayment = paymentFilter === 'All' || actualPaymentStatus === paymentFilter;
        
        return matchesSearch && matchesStatus && matchesPayment;
      })
      .sort((a, b) => {
        let aValue, bValue;
        switch (sortBy) {
          case 'timestamp':
            aValue = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
            bValue = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
            break;
          case 'customerName':
            aValue = getCustomerInfo(a).name;
            bValue = getCustomerInfo(b).name;
            break;
          case 'totalAmount':
            aValue = parseFloat(a.totalAmount) || 0;
            bValue = parseFloat(b.totalAmount) || 0;
            break;
          default:
            aValue = a[sortBy] || '';
            bValue = b[sortBy] || '';
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [immediatePickups, searchTerm, statusFilter, paymentFilter, sortBy, sortOrder]);

  // Combine completed pickups from the same collection
  const allCompletedPickups = useMemo(() => {
    return immediatePickups.filter(pickup => {
      const isTimePassed = (() => {
        if (pickup.pickupDate && pickup.pickupTime) {
          const pickupDateTime = new Date(`${pickup.pickupDate} ${pickup.pickupTime}`);
          return pickupDateTime < new Date();
        }
        return false;
      })();
      return pickup.status === 'Completed' || 
             pickup.status === 'Cancelled' || 
             (isTimePassed && pickup.status !== 'Cancelled');
    }).sort((a, b) => {
      // Sort by completedAt or cancelledAt descending
      const aTime = a.completedAt || a.cancelledAt || new Date(0);
      const bTime = b.completedAt || b.cancelledAt || new Date(0);
      return bTime - aTime;
    });
  }, [immediatePickups]);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <FaCheckCircle className="text-green-500" />;
      case 'confirmed':
        return <FaCheck className="text-blue-500" />;
      case 'assigned':
        return <FaTruck className="text-purple-500" />;
      case 'pending':
        return <FaHourglassHalf className="text-yellow-500" />;
      case 'cancelled':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaClock className="text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusIcon = (pickup) => {
    const actualStatus = getActualPaymentStatus(pickup);
    
    switch (actualStatus?.toLowerCase()) {
      case 'paid':
        return <FaCheckCircle className="text-green-500" />;
      case 'pending':
        return <FaHourglassHalf className="text-yellow-500" />;
      case 'failed':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaMoneyBillWave className="text-gray-400" />;
    }
  };

  const getPaymentStatusColor = (pickup) => {
    const actualStatus = getActualPaymentStatus(pickup);
    
    switch (actualStatus?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentMethodDisplay = (paymentMethod) => {
    switch (paymentMethod?.toLowerCase()) {
      case 'cash':
      case 'cash_on_pickup':
      case 'cod':
        return 'Cash on Pickup';
      case 'credit_card':
        return 'Credit Card';
      case 'debit_card':
        return 'Debit Card';
      case 'wallet':
      case 'digital_wallet':
        return 'Digital Wallet';
      case 'paypal':
        return 'PayPal';
      case 'online':
        return 'Online Payment';
      default:
        return paymentMethod || 'Not specified';
    }
  };

  const formatDate = (pickup) => {
    if (pickup.timestamp) {
      const date = pickup.timestamp.toDate ? pickup.timestamp.toDate() : new Date(pickup.timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return 'Date not available';
  };

  const handleViewDetails = (pickup) => {
    setSelectedPickup(pickup);
    setShowDetailModal(true);
  };

  // Confirm Pickup: update status, save to confirmedPickups collection, then open assign driver modal
  const handleConfirmPickup = async () => {
    if (!selectedPickup) {
      showNotification('No pickup selected', 'error');
      return;
    }
    try {
      setLoading(true);
      const pickupRef = doc(db, 'immediate_pickups', selectedPickup.id);
      await updateDoc(pickupRef, {
        status: 'Confirmed',
        confirmedAt: new Date(),
        confirmedBy: 'Admin'
      });
      // Save to confirmedPickups collection
      await setDoc(doc(db, 'confirmedPickups', selectedPickup.id), {
        ...selectedPickup,
        status: 'Confirmed',
        confirmedAt: new Date(),
        confirmedBy: 'Admin'
      });
      showNotification(`Pickup confirmed successfully!`, 'success');
      setShowConfirmModal(false);
      setSelectedPickup(null);
      await fetchConfirmedPickups();
      if (onRefresh) await onRefresh();
      // Immediately open assign driver modal for this pickup
      setTimeout(() => {
        openAssignDriverModal({ ...selectedPickup, status: 'Confirmed' });
      }, 300);
    } catch (error) {
      console.error('Error confirming pickup:', error);
      showNotification(`Error confirming pickup: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Assign Driver: update status, save driver assignment
  const handleAssignDriver = async () => {
    if (!selectedPickup) {
      showNotification('No pickup selected', 'error');
      return;
    }
    if (!selectedDriver) {
      showNotification('Please select a driver', 'error');
      return;
    }
    try {
      setAssigningDriver(true);
      const pickupRef = doc(db, 'immediate_pickups', selectedPickup.id);
      await updateDoc(pickupRef, {
        status: 'Assigned',
        assignedDriver: selectedDriver,
        assignedAt: new Date(),
        assignedBy: 'Admin'
      });
      // Update in confirmedPickups as well
      await setDoc(doc(db, 'confirmedPickups', selectedPickup.id), {
        ...selectedPickup,
        status: 'Assigned',
        assignedDriver: selectedDriver,
        assignedAt: new Date(),
        assignedBy: 'Admin'
      });
      showNotification(`Driver ${selectedDriver} assigned successfully!`, 'success');
      setShowAssignDriverModal(false);
      setSelectedDriver('');
      setSelectedPickup(null);
      await fetchConfirmedPickups();
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Error assigning driver:', error);
      showNotification(`Error assigning driver: ${error.message}`, 'error');
    } finally {
      setAssigningDriver(false);
    }
  };

  // Update Status: update status in immediate_pickups collection, no deletion
  const handleUpdateStatus = async () => {
    if (!selectedPickup) {
      showNotification('No pickup selected', 'error');
      return;
    }
    if (!editingStatus || editingStatus.trim() === '') {
      showNotification('Please select a status', 'error');
      return;
    }
    try {
      setUpdatingStatus(true);
      const pickupRef = doc(db, 'immediate_pickups', selectedPickup.id);
      await updateDoc(pickupRef, {
        status: editingStatus,
        lastUpdated: new Date(),
        updatedBy: 'Admin',
        ...(editingStatus === 'Completed' && { completedAt: new Date(), completedBy: 'Admin' }),
        ...(editingStatus === 'Cancelled' && { cancelledAt: new Date(), cancelledBy: 'Admin', cancellationReason: cancelReason, refundStatus: 'Pending' })
      });
      // Update in confirmedPickups as well
      await setDoc(doc(db, 'confirmedPickups', selectedPickup.id), {
        ...selectedPickup,
        status: editingStatus,
        lastUpdated: new Date(),
        updatedBy: 'Admin'
      });
      showNotification(`Status updated to ${editingStatus} successfully!`, 'success');
      setShowEditStatusModal(false);
      setEditingStatus('');
      setSelectedPickup(null);
      await fetchConfirmedPickups();
      if (onRefresh) await onRefresh();
      // REMOVED: Deletion and local removal, as we keep in one collection
    } catch (error) {
      console.error('Error updating status:', error);
      showNotification(`Error updating status: ${error.message}`, 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openAssignDriverModal = async (pickup) => {
    try {
      console.log('Opening assign driver modal for:', pickup.id);
      setSelectedPickup(pickup);
      setSelectedDriver('');
      setShowAssignDriverModal(true);
      await fetchDrivers();
    } catch (error) {
      console.error('Error opening assign driver modal:', error);
      showNotification('Error loading drivers', 'error');
    }
  };

  const openEditStatusModal = (pickup) => {
    try {
      console.log('Opening edit status modal for:', pickup.id);
      setSelectedPickup(pickup);
      setEditingStatus(pickup.status || 'Pending');
      setShowEditStatusModal(true);
    } catch (error) {
      console.error('Error opening edit status modal:', error);
      showNotification('Error opening status editor', 'error');
    }
  };

  const openConfirmModal = (pickup) => {
    try {
      console.log('Opening confirm modal for:', pickup.id);
      setSelectedPickup(pickup);
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error opening confirm modal:', error);
      showNotification('Error opening confirmation dialog', 'error');
    }
  };

  const openCancelModal = (pickup) => {
    setSelectedPickup(pickup);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const closeAllModals = () => {
    setShowDetailModal(false);
    setShowConfirmModal(false);
    setShowAssignDriverModal(false);
    setShowEditStatusModal(false);
    setShowCancelModal(false);
    setSelectedPickup(null);
    setSelectedDriver('');
    setEditingStatus('');
  };

  const handleCancelPickup = async () => {
    if (!selectedPickup) {
      showNotification('No pickup selected', 'error');
      return;
    }
    if (!cancelReason.trim()) {
      showNotification('Please provide a cancellation reason', 'error');
      return;
    }
    try {
      setCancelling(true);
      const pickupRef = doc(db, 'immediate_pickups', selectedPickup.id);
      await updateDoc(pickupRef, {
        status: 'Cancelled',
        cancelledAt: new Date(),
        cancelledBy: 'Admin',
        cancellationReason: cancelReason,
        refundStatus: 'Pending',
        lastUpdated: new Date(),
        updatedBy: 'Admin'
      });
      showNotification('Pickup cancelled successfully!', 'success');
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedPickup(null);
      if (onRefresh) await onRefresh();
      // REMOVED: Deletion and local removal, as we keep in one collection
    } catch (error) {
      console.error('Error cancelling pickup:', error);
      showNotification(`Error cancelling pickup: ${error.message}`, 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 ${
          notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
          'bg-yellow-50 border-yellow-500 text-yellow-800'
        } transition-all duration-300`}>
          <div className="flex items-center">
            {notification.type === 'success' && <FaCheckCircle className="mr-2" />}
            {notification.type === 'error' && <FaTimes className="mr-2" />}
            {notification.type === 'warning' && <FaExclamationTriangle className="mr-2" />}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                <FaTruck className="text-orange-600" />
              </div>
              Immediate Pickups
            </h2>
            <p className="text-gray-600 mt-2">Manage urgent waste collection requests</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-600">{activePickups.length}</div>
            <div className="text-sm text-gray-500">Active Pickups</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by bin, customer name, or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Pending – No driver available">Pending – No driver available</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Assigned">Assigned</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <FaMoneyBillWave className="text-gray-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="All">All Payment</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Payment Pending</option>
              <option value="Failed">Payment Failed</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <FaSort className="text-gray-400" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="timestamp-desc">Latest First</option>
              <option value="timestamp-asc">Earliest First</option>
              <option value="customerName-asc">Customer A-Z</option>
              <option value="totalAmount-desc">Highest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Immediate Pickup Requests Table */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-orange-700 mb-4 flex items-center">
          <FaTruck className="mr-2" /> Immediate Pickup Requests
        </h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto shadow-sm">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-orange-50 to-orange-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Bins</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Pickup Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activePickups.length > 0 ? activePickups.map((pickup) => {
                const customerInfo = getCustomerInfo(pickup);
                return (
                  <tr key={pickup.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{customerInfo.name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{getBinsDisplay(pickup)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">Rs. {pickup.totalAmount || '0.00'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {pickup.pickupDate && pickup.pickupTime ? (
                        <div>
                          <div>{pickup.pickupDate}</div>
                          <div className="text-xs text-gray-500">{pickup.pickupTime}</div>
                        </div>
                      ) : 'ASAP'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(pickup.status)}`}>
                        {pickup.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(pickup)}
                          className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 transition-colors"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        {pickup.status === 'Pending' && (
                          <button
                            onClick={() => openConfirmModal(pickup)}
                            className="bg-green-100 text-green-600 p-2 rounded-lg hover:bg-green-200 transition-colors"
                            title="Confirm"
                            disabled={loading}
                          >
                            <FaCheck />
                          </button>
                        )}
                        {pickup.status === 'Confirmed' && (
                          <button
                            onClick={() => openAssignDriverModal(pickup)}
                            className="bg-purple-100 text-purple-600 p-2 rounded-lg hover:bg-purple-200 transition-colors"
                            title="Assign Driver"
                            disabled={assigningDriver}
                          >
                            <FaTruck />
                          </button>
                        )}
                        <button
                          onClick={() => openEditStatusModal(pickup)}
                          className="bg-yellow-100 text-yellow-600 p-2 rounded-lg hover:bg-yellow-200 transition-colors"
                          title="Edit Status"
                          disabled={updatingStatus}
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openCancelModal(pickup)}
                          className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors"
                          title="Cancel Pickup"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <FaTruck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No active pickup requests</p>
                    <p className="text-gray-400 text-sm mt-1">All pickups are completed or cancelled</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completed Pickups Table */}
      <div className="mt-12">
        <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center">
          <FaCheckCircle className="mr-2" /> Completed & Cancelled Pickups
        </h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto shadow-sm">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-green-50 to-green-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Bins</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Completed At</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Refund</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allCompletedPickups.length > 0 ? allCompletedPickups.map((pickup) => (
                <tr key={pickup.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{pickup.customerName || pickup.userName || getCustomerInfo(pickup).name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{getBinsDisplay(pickup)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">Rs. {pickup.totalAmount || '0.00'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{pickup.assignedDriver || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(pickup.status)}`}>
                      {pickup.status === 'Cancelled' ? '❌ Cancelled' : '✓ Completed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {pickup.completedAt ? (
                      pickup.completedAt.toDate ? pickup.completedAt.toDate().toLocaleString() : new Date(pickup.completedAt).toLocaleString()
                    ) : pickup.cancelledAt ? (
                      pickup.cancelledAt.toDate ? pickup.cancelledAt.toDate().toLocaleString() : new Date(pickup.cancelledAt).toLocaleString()
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {pickup.status === 'Cancelled' ? (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        pickup.refundStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                        pickup.refundStatus === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {pickup.refundStatus || 'Pending'}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <FaCheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No completed pickups yet</p>
                    <p className="text-gray-400 text-sm mt-1">Completed and cancelled pickups will appear here</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Detail Modal */}
      {showDetailModal && selectedPickup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 flex flex-col max-h-[calc(100vh-2rem)]">
            {/* Fixed Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-2xl relative flex-shrink-0">
              <button
                onClick={() => setShowDetailModal(false)}
                className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-full transition-colors z-10"
              >
                <FaTimes className="text-xl" />
              </button>
              <h2 className="text-2xl font-bold pr-12">Pickup Request Details</h2>
              <p className="text-orange-100 mt-1">ID: {selectedPickup.id}</p>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <FaClock className="mx-auto text-2xl text-blue-600 mb-2" />
                  <p className="text-xs text-blue-600 font-medium">Request Time</p>
                  <p className="text-sm font-bold text-gray-900">{formatDate(selectedPickup)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <FaMoneyBillWave className="mx-auto text-2xl text-green-600 mb-2" />
                  <p className="text-xs text-green-600 font-medium">Total Amount</p>
                  <p className="text-lg font-bold text-gray-900">Rs. {selectedPickup.totalAmount || '0.00'}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <FaCheckCircle className="mx-auto text-2xl text-purple-600 mb-2" />
                  <p className="text-xs text-purple-600 font-medium">Status</p>
                  <p className="text-sm font-bold text-gray-900">{selectedPickup.status || 'Pending'}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <FaTruck className="mx-auto text-2xl text-yellow-600 mb-2" />
                  <p className="text-xs text-yellow-600 font-medium">Bins Count</p>
                  <p className="text-sm font-bold text-gray-900">{selectedPickup.binCount || (selectedPickup.bins?.length || 1)}</p>
                </div>
              </div>

              {/* Detailed Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Customer Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <FaUser className="mr-2 text-blue-600" />
                    Customer Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Customer ID</label>
                      <p className="text-gray-900 font-medium">{selectedPickup.userId || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Full Name</label>
                      <p className="text-gray-900 font-medium">{getCustomerInfo(selectedPickup).name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Phone Number</label>
                      <p className="text-gray-900 font-medium">{getCustomerInfo(selectedPickup).phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Email Address</label>
                      <p className="text-gray-900 font-medium break-all">{getCustomerInfo(selectedPickup).email}</p>
                    </div>
                  </div>
                </div>

                {/* Pickup Details */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <FaTruck className="mr-2 text-orange-600" />
                    Pickup Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Bins to Collect</label>
                      <p className="text-gray-900 font-medium">{getBinsDisplay(selectedPickup)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Total Bins</label>
                      <p className="text-gray-900 font-medium">{selectedPickup.binCount || (selectedPickup.bins?.length || 1)} bins</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Pickup Date</label>
                      <p className="text-gray-900 font-medium">{selectedPickup.pickupDate || 'ASAP'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Pickup Time</label>
                      <p className="text-gray-900 font-medium">{selectedPickup.pickupTime || 'Flexible'}</p>
                    </div>
                    {selectedPickup.assignedDriver && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 block">Assigned Driver</label>
                        <p className="text-gray-900 font-medium">{selectedPickup.assignedDriver}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <FaMoneyBillWave className="mr-2 text-green-600" />
                    Payment Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Payment Method</label>
                      <p className="text-gray-900 font-medium">{getPaymentMethodDisplay(selectedPickup.paymentMethod)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Payment Status</label>
                      <div className="flex items-center space-x-2 mt-1">
                        {getPaymentStatusIcon(selectedPickup)}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(selectedPickup)}`}>
                          {getActualPaymentStatus(selectedPickup)}
                        </span>
                      </div>
                      {selectedPickup.paymentMethod?.toLowerCase() === 'cash on pickup' && getActualPaymentStatus(selectedPickup) === 'Pending' && (
                        <p className="text-xs text-blue-600 mt-2">
                          💡 Payment will be collected during pickup
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Total Amount</label>
                      <p className="text-2xl font-bold text-green-600">Rs. {selectedPickup.totalAmount || '0.00'}</p>
                    </div>
                  </div>
                </div>

                {/* Service Status */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <FaCheckCircle className="mr-2 text-purple-600" />
                    Service Status
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Current Status</label>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusIcon(selectedPickup.status)}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedPickup.status)}`}>
                          {selectedPickup.status || 'Pending'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block">Request Created</label>
                      <p className="text-gray-900 font-medium">{formatDate(selectedPickup)}</p>
                    </div>
                    {selectedPickup.confirmedAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 block">Confirmed At</label>
                        <p className="text-gray-900 font-medium">{new Date(selectedPickup.confirmedAt.toDate()).toLocaleString()}</p>
                      </div>
                    )}
                    {selectedPickup.assignedAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 block">Driver Assigned At</label>
                        <p className="text-gray-900 font-medium">{new Date(selectedPickup.assignedAt.toDate()).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              {selectedPickup.instructions && (
                <div className="mt-8 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                  <h4 className="text-lg font-bold text-yellow-800 mb-3 flex items-center">
                    <FaExclamationTriangle className="mr-2" />
                    Special Instructions
                  </h4>
                  <p className="text-gray-700 leading-relaxed">{selectedPickup.instructions}</p>
                </div>
              )}
            </div>

            {/* Fixed Action Buttons Footer */}
            <div className="flex-shrink-0 bg-gray-50 p-6 rounded-b-2xl border-t border-gray-200">
              <div className="flex flex-wrap gap-3 justify-center">
                {selectedPickup.status === 'Pending' && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setTimeout(() => openConfirmModal(selectedPickup), 100);
                    }}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center font-medium"
                  >
                    <FaCheck className="mr-2" />
                    Confirm Pickup
                  </button>
                )}

                {selectedPickup.status === 'Confirmed' && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setTimeout(() => openAssignDriverModal(selectedPickup), 100);
                    }}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center font-medium"
                  >
                    <FaTruck className="mr-2" />
                    Assign Driver
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setTimeout(() => openEditStatusModal(selectedPickup), 100);
                  }}
                  className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center font-medium"
                >
                  <FaEdit className="mr-2" />
                  Edit Status
                </button>

                <button
                  onClick={closeAllModals}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Pickup Modal */}
      {showConfirmModal && selectedPickup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <FaCheck className="text-green-600 text-xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Confirm Pickup</h3>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">Pickup ID: <strong>{selectedPickup.id}</strong></p>
                <p className="text-gray-600 mb-2">Customer: <strong>{getCustomerInfo(selectedPickup).name}</strong></p>
                <p className="text-gray-600 mb-4">Bins: <strong>{getBinsDisplay(selectedPickup)}</strong></p>
                <p className="text-gray-600">Are you sure you want to confirm this pickup?</p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedPickup(null);
                  }}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPickup}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Confirming...
                    </>
                  ) : (
                    <>
                      <FaCheck className="mr-2" />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {showAssignDriverModal && selectedPickup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <FaTruck className="text-purple-600 text-xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Assign Driver</h3>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">Pickup ID: <strong>{selectedPickup.id}</strong></p>
                <p className="text-gray-600 mb-4">Bins: <strong>{getBinsDisplay(selectedPickup)}</strong></p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Driver
                </label>
                {drivers.length === 0 ? (
                  <p className="text-gray-500 text-sm">Loading drivers...</p>
                ) : (
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Choose a driver...</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.name || driver.id}>
                        {driver.name || driver.id} - {driver.vehicleType || 'Unknown Vehicle'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAssignDriverModal(false);
                    setSelectedDriver('');
                    setSelectedPickup(null);
                  }}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={assigningDriver}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignDriver}
                  disabled={assigningDriver || !selectedDriver}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigningDriver ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <FaTruck className="mr-2" />
                      Assign Driver
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {showEditStatusModal && selectedPickup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                  <FaEdit className="text-yellow-600 text-xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Edit Status</h3>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">Pickup ID: <strong>{selectedPickup.id}</strong></p>
                <p className="text-gray-600 mb-2">Current Status: <strong>{selectedPickup.status || 'Pending'}</strong></p>
                <p className="text-gray-600 mb-4">Bins: <strong>{getBinsDisplay(selectedPickup)}</strong></p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Status
                </label>
                <select
                  value={editingStatus}
                  onChange={(e) => setEditingStatus(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Pending – No driver available">Pending – No driver available</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditStatusModal(false);
                    setEditingStatus('');
                    setSelectedPickup(null);
                  }}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={updatingStatus}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updatingStatus || !editingStatus}
                  className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingStatus ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <FaEdit className="mr-2" />
                      Update Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Pickup Modal */}
      {showCancelModal && selectedPickup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <FaTimes className="text-red-600 text-xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Cancel Pickup</h3>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">Pickup ID: <strong>{selectedPickup.id}</strong></p>
                <p className="text-gray-600 mb-2">Customer: <strong>{getCustomerInfo(selectedPickup).name}</strong></p>
                <p className="text-gray-600 mb-4">Amount: <strong>Rs. {selectedPickup.totalAmount}</strong></p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-yellow-800 text-sm">⚠️ Customer will receive a refund for this cancellation.</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows="3"
                  placeholder="Enter reason for cancellation..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setSelectedPickup(null);
                  }}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={cancelling}
                >
                  Close
                </button>
                <button
                  onClick={handleCancelPickup}
                  disabled={cancelling || !cancelReason.trim()}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <FaTimes className="mr-2" />
                      Cancel Pickup
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

export default ImmediatePickups;

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Create a notification in Firestore
 * @param {Object} notificationData - The notification data
 * @returns {Promise<string>} - The notification ID
 */
export const createNotification = async (notificationData) => {
  try {
    const notificationRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      read: false,
    });
    
    console.log('✅ Notification created:', notificationRef.id);
    return notificationRef.id;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

/**
 * Create notification for new issue
 */
export const createIssueNotification = async (issueData, userData) => {
  const isUrgent = issueData.priority === 'urgent' || issueData.priority === 'immediate';
  
  return await createNotification({
    type: 'new_issue',
    title: `🚨 New Issue Reported${isUrgent ? ' - URGENT' : ''}`,
    message: `${userData.name || 'A user'} reported: ${issueData.title || issueData.category}`,
    
    // Issue details
    issueId: issueData.id,
    issueTitle: issueData.title || issueData.description?.substring(0, 50),
    issueCategory: issueData.category,
    issueDescription: issueData.description,
    issuePriority: issueData.priority || 'normal',
    
    // User details
    userId: userData.uid || userData.id,
    userName: userData.name || userData.displayName || 'Unknown User',
    userEmail: userData.email,
    
    // Flags for notification system
    isAdminNotification: true,
    isUrgent: isUrgent,
    isImmediate: issueData.priority === 'immediate',
    priority: issueData.priority || 'normal',
    
    // Location if available
    location: issueData.location || null,
  });
};

/**
 * Create notification for pickup request
 */
export const createPickupRequestNotification = async (requestData, userData) => {
  return await createNotification({
    type: 'pickup_request',
    title: '📦 New Pickup Request',
    message: `${userData.name || 'A user'} requested waste pickup`,
    
    // Request details
    requestId: requestData.id,
    wasteType: requestData.wasteType || 'General Waste',
    pickupDate: requestData.pickupDate,
    pickupTime: requestData.pickupTime,
    
    // User details
    userId: userData.uid || userData.id,
    userName: userData.name || userData.displayName || 'Unknown User',
    userEmail: userData.email,
    userPhone: userData.phone || requestData.phone,
    
    // Flags
    isAdminNotification: true,
    isPickupRequest: true,
    isUrgent: requestData.isUrgent || false,
    priority: requestData.isUrgent ? 'urgent' : 'normal',
    
    // Address
    address: requestData.address || userData.address,
    location: requestData.location || null,
  });
};

/**
 * Create notification for issue reply
 */
export const createReplyNotification = async (issueData, replyData, adminData) => {
  return await createNotification({
    type: 'issue_reply',
    title: '💬 Admin Reply to Your Issue',
    message: `Admin replied to your issue: ${issueData.title}`,
    
    // Reply details
    issueId: issueData.id,
    issueTitle: issueData.title,
    replyMessage: replyData.message,
    replyBy: adminData.name || 'Admin',
    
    // User to notify
    userId: issueData.userId,
    userName: issueData.userName,
    
    // Flags
    isAdminNotification: false, // This goes to user
    priority: 'normal',
  });
};

/**
 * Create notification for issue status update
 */
export const createStatusUpdateNotification = async (issueData, newStatus, adminData) => {
  const statusMessages = {
    'pending': '⏳ Your issue is pending review',
    'in-progress': '🔄 Your issue is being processed',
    'resolved': '✅ Your issue has been resolved',
    'rejected': '❌ Your issue has been rejected',
  };

  return await createNotification({
    type: 'status_update',
    title: 'Issue Status Update',
    message: statusMessages[newStatus] || `Status updated to: ${newStatus}`,
    
    // Issue details
    issueId: issueData.id,
    issueTitle: issueData.title,
    newStatus: newStatus,
    updatedBy: adminData.name || 'Admin',
    
    // User to notify
    userId: issueData.userId,
    userName: issueData.userName,
    
    // Flags
    isAdminNotification: false,
    priority: 'normal',
  });
};

/**
 * Create thank you notification for top contributor
 */
export const createTopContributorNotification = async (userData, rank, itemsShared) => {
  const rankMessages = {
    1: {
      title: '🥇 Congratulations! You are the #1 Top Contributor!',
      message: `Thank you for leading the way in waste reduction! You've shared ${itemsShared} items and made a huge impact on our community. Keep up the amazing work! 🌟`,
      emoji: '👑'
    },
    2: {
      title: '🥈 You are the #2 Top Contributor!',
      message: `Amazing work! You've shared ${itemsShared} items and are making a significant impact on waste reduction. Thank you for your dedication! 🎉`,
      emoji: '🌟'
    },
    3: {
      title: '🥉 You are the #3 Top Contributor!',
      message: `Excellent contribution! You've shared ${itemsShared} items and are helping create a sustainable community. Keep up the great work! 💚`,
      emoji: '⭐'
    }
  };

  const rankData = rankMessages[rank] || {
    title: `🏆 You are in Top ${rank} Contributors!`,
    message: `Thank you for your valuable contribution! You've shared ${itemsShared} items and are actively helping reduce waste in our community. Your efforts make a difference! 🌱`,
    emoji: '✨'
  };

  return await createNotification({
    type: 'achievement',
    title: rankData.title,
    message: rankData.message,
    
    // User details
    userId: userData.userId || userData.uid,
    userName: userData.name || userData.displayName,
    userEmail: userData.email,
    
    // Achievement details
    achievementType: 'top_contributor',
    rank: rank,
    itemsShared: itemsShared,
    emoji: rankData.emoji,
    
    // Flags
    isAdminNotification: false, // Goes to user
    isAchievement: true,
    priority: rank <= 3 ? 'high' : 'normal',
    
    // Additional data
    category: 'Community Achievement',
    timestamp: new Date(),
  });
};

/**
 * Create milestone notification for contributors
 */
export const createMilestoneNotification = async (userData, milestone) => {
  const milestones = {
    5: '🎯 First 5 Items Shared!',
    10: '🌟 10 Items Milestone!',
    25: '💚 25 Items Achievement!',
    50: '🏆 Half Century!',
    100: '👑 Century Club!'
  };

  const title = milestones[milestone] || `🎉 ${milestone} Items Shared!`;

  return await createNotification({
    type: 'milestone',
    title: title,
    message: `Congratulations! You've shared ${milestone} items in the Sharing Hub. Thank you for your continued commitment to waste reduction and sustainability! 🌱`,
    
    userId: userData.userId || userData.uid,
    userName: userData.name || userData.displayName,
    userEmail: userData.email,
    
    milestoneType: 'items_shared',
    milestoneValue: milestone,
    
    isAdminNotification: false,
    isAchievement: true,
    priority: 'normal',
  });
};

import React, { useState, useEffect } from 'react';
import { FaExclamationCircle } from 'react-icons/fa';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

const ReportedIssues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch issues from Firestore
  const fetchIssues = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching issues from "issues" collection...');
      
      const snapshot = await getDocs(collection(db, 'issues'));
      console.log('Issues collection - Documents found:', snapshot.size);
      
      // Also fetch users data to get user names
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersMap = {};
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        usersMap[doc.id] = userData.name || userData.fullName || userData.displayName || 'Unknown User';
      });
      console.log('Users data loaded:', Object.keys(usersMap).length, 'users');
      
      const issuesData = [];
      
      snapshot.docs.forEach(doc => {
        try {
          const data = doc.data();
          console.log('Processing document:', doc.id, data);
          
          // Handle different date field possibilities
          let createdAt = '';
          if (data.timestamp) {
            createdAt = data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp;
          } else if (data.createdAt) {
            createdAt = data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;
          } else if (data.dateCreated) {
            createdAt = data.dateCreated.toDate ? data.dateCreated.toDate().toISOString() : data.dateCreated;
          } else if (data.date) {
            createdAt = data.date.toDate ? data.date.toDate().toISOString() : data.date;
          } else {
            createdAt = new Date().toISOString();
          }
          
          // Get user name from users collection
          const userId = data.userId || data.user_id || data.reportedBy || data.reporterId || '';
          const userName = usersMap[userId] || 
                          data.userName || 
                          data.user_name || 
                          data.reporterName || 
                          data.name || 
                          data.fullName || 
                          'Anonymous User';
          
          const issue = {
            id: doc.id,
            title: data.title || data.issueTitle || data.subject || data.problemTitle || 'Untitled Issue',
            category: data.category || data.issueCategory || data.type || data.problemType || 'General',
            description: data.description || data.issueDescription || data.details || data.message || data.problemDescription || 'No description provided',
            status: data.status || data.issueStatus || 'pending',
            isUrgent: Boolean(data.isUrgent || data.urgent || data.priority === 'urgent' || data.priority === 'high'),
            userId: userId,
            userName: userName,
            email: data.email || data.userEmail || data.reporterEmail || '',
            createdAt: createdAt,
            attachments: Array.isArray(data.attachments) ? data.attachments : 
                        Array.isArray(data.images) ? data.images :
                        Array.isArray(data.files) ? data.files : 
                        Array.isArray(data.photos) ? data.photos : [],
            binName: data.binName || data.bin_name || data.location || data.binLocation || '',
            replies: Array.isArray(data.replies) ? data.replies : [],
            ...data
          };
          
          issuesData.push(issue);
          console.log('Successfully processed issue:', issue);
        } catch (docError) {
          console.error('Error processing document:', doc.id, docError);
        }
      });
      
      console.log('Final issues data:', issuesData);
      console.log(`Total issues found: ${issuesData.length}`);
      
      if (issuesData.length === 0) {
        console.warn('⚠️ No issues found in "issues" collection.');
        setError('No issues found in the database');
      }
      
      // Sort by urgency and date
      issuesData.sort((a, b) => {
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      setIssues(issuesData);
    } catch (err) {
      console.error('❌ Error fetching issues:', err);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      setError('Failed to load issues: ' + err.message);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    const interval = setInterval(fetchIssues, 30000);
    return () => clearInterval(interval);
  }, []);

  // Open reply dialog
  const openIssueDialog = (issue) => {
    setSelectedIssue(issue);
    setReplyDialogOpen(true);
    setReplyMessage('');
    setReplyStatus(issue.status || 'pending');
  };

  // Close dialog
  const closeDialog = () => {
    setReplyDialogOpen(false);
    setSelectedIssue(null);
    setReplyMessage('');
    setReplyStatus('');
  };

  // Submit reply and update status
  const handleSubmitReply = async () => {
    if (!replyMessage.trim()) {
      alert('Please enter a reply message');
      return;
    }

    setSubmitting(true);
    try {
      const issueRef = doc(db, 'issues', selectedIssue.id);
      
      const reply = {
        message: replyMessage.trim(),
        timestamp: serverTimestamp(),
        adminId: 'admin',
        adminName: 'Admin',
      };

      const currentIssue = issues.find(issue => issue.id === selectedIssue.id);
      const currentReplies = currentIssue?.replies || [];

      await updateDoc(issueRef, {
        status: replyStatus,
        replies: [...currentReplies, reply],
        lastUpdated: serverTimestamp(),
        lastReplyAt: serverTimestamp(),
      });

      try {
        await addDoc(collection(db, 'notifications'), {
          userId: selectedIssue.userId,
          issueId: selectedIssue.id,
          type: 'issue_reply',
          title: 'Reply to your reported issue',
          message: `Admin replied to your issue: "${selectedIssue.title}"`,
          replyMessage: replyMessage.trim(),
          status: replyStatus,
          timestamp: serverTimestamp(),
          read: false,
        });
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError);
      }

      console.log('Reply submitted successfully');

      await fetchIssues();
      closeDialog();
      alert('Reply sent successfully!');
      
    } catch (err) {
      console.error('Error submitting reply:', err);
      alert(`Failed to submit reply: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Loading state
  if (loading && issues.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <div className="flex flex-col items-center justify-center py-12">
          <FaExclamationCircle className="w-12 h-12 text-green-600 animate-spin mb-4" />
          <span className="text-lg text-gray-600 font-medium">Loading reported issues...</span>
          <span className="text-sm text-gray-400 mt-2">Please wait while we fetch the data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-green-700 flex items-center gap-2">
          <FaExclamationCircle className="w-7 h-7 text-red-500" /> 
          Reported Issues
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({issues.length} {issues.length === 1 ? 'issue' : 'issues'})
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700 font-medium">Live updates</span>
          </div>
          <button
            onClick={fetchIssues}
            disabled={loading}
            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh issues"
          >
            <FaExclamationCircle className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <FaExclamationCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Error Loading Issues</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={fetchIssues}
              className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Issues Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gradient-to-r from-green-100 to-green-50">
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-left">Issue</th>
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-center">Status</th>
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-center">Priority</th>
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-center">User</th>
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-center">Date</th>
              <th className="py-4 px-4 border-b-2 border-green-200 font-semibold text-green-700 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {issues.length > 0 ? (
              issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-green-50 transition-colors border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-800 font-medium">
                    <div className="flex items-center gap-2">
                      {issue.isUrgent && (
                        <FaExclamationCircle className="w-4 h-4 text-red-500 animate-pulse" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-sm line-clamp-1">{issue.title || 'Untitled Issue'}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{issue.category || 'General'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(issue.status)}`}>
                      {(issue.status || 'pending').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {issue.isUrgent ? (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold border border-red-300">
                        URGENT
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold border border-blue-300">
                        NORMAL
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="text-xs text-gray-700">
                      <div className="font-medium">{issue.userName}</div>
                      {issue.email && (
                        <div className="text-gray-500 text-xs">{issue.email}</div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-xs text-gray-600">
                      {formatDate(issue.createdAt)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => openIssueDialog(issue)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold shadow-sm hover:shadow-md transition-all text-sm"
                    >
                      View & Reply
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              !loading && (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FaExclamationCircle className="w-20 h-20 text-gray-300 mb-4" />
                      <p className="text-xl font-semibold text-gray-500 mb-2">No reported issues found</p>
                      <p className="text-sm text-gray-400">All clear! No issues reported at the moment.</p>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Reply Dialog Modal - Scrollable inline */}
      {replyDialogOpen && selectedIssue && (
        <div className="mt-8 mb-6 border-2 border-green-500 rounded-xl shadow-2xl bg-white">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <FaExclamationCircle className="w-6 h-6" />
                Issue Details & Reply
              </h3>
              <button
                onClick={closeDialog}
                disabled={submitting}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="p-6 max-h-[600px] overflow-y-auto">
            {/* Issue Details Card */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 mb-6 border border-gray-200">
              <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                <FaExclamationCircle className="w-5 h-5 text-green-600" />
                Issue Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700 block mb-1">Title:</span>
                  <span className="text-gray-600">{selectedIssue.title}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 block mb-1">Category:</span>
                  <span className="text-gray-600">{selectedIssue.category}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 block mb-1">User:</span>
                  <div className="text-gray-600">
                    <div className="font-medium">{selectedIssue.userName}</div>
                    {selectedIssue.email && (
                      <div className="text-sm text-gray-500">{selectedIssue.email}</div>
                    )}
                    {selectedIssue.userId && (
                      <div className="text-xs text-gray-400">ID: {selectedIssue.userId}</div>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 block mb-1">Date:</span>
                  <span className="text-gray-600">
                    {formatDate(selectedIssue.createdAt || selectedIssue.date)}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-semibold text-gray-700 block mb-1">Description:</span>
                  <div className="text-gray-600 bg-white p-3 rounded border">
                    {selectedIssue.description}
                  </div>
                </div>
                {selectedIssue.attachments && selectedIssue.attachments.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-semibold text-gray-700 block mb-2">Attachments:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedIssue.attachments.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          <img
                            src={url}
                            alt={`Attachment ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded border-2 border-gray-300 hover:border-green-500 transition-all shadow-sm"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Update */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Update Status *
              </label>
              <select
                value={replyStatus}
                onChange={(e) => setReplyStatus(e.target.value)}
                disabled={submitting}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all disabled:bg-gray-100"
              >
                <option value="pending">Pending</option>
                <option value="in progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Reply Message */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reply Message *
              </label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                disabled={submitting}
                rows="8"
                placeholder="Enter your reply to the user..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-2">
                {replyMessage.length} characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button
                onClick={closeDialog}
                disabled={submitting}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReply}
                disabled={submitting || !replyMessage.trim()}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                {submitting ? (
                  <>
                    <FaExclamationCircle className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FaExclamationCircle className="w-4 h-4" />
                    Send Reply
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportedIssues;
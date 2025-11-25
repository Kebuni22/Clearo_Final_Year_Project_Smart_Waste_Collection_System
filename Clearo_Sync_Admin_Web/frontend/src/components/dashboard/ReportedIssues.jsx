import React, { useState, useEffect } from 'react';
import { FaExclamationCircle, FaFileDownload, FaFilter, FaCalendarAlt } from 'react-icons/fa';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
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
  const [lastIssueCount, setLastIssueCount] = useState(0);
  
  // Report generation states
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    priority: 'all',
    category: 'all',
  });
  const [generatingReport, setGeneratingReport] = useState(false);

  // Fetch issues from Firestore with real-time updates
  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      console.log('Setting up real-time listener for issues...');
      
      const issuesQuery = query(
        collection(db, 'issues'),
        orderBy('timestamp', 'desc')
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        issuesQuery,
        async (snapshot) => {
          console.log('Issues snapshot received:', snapshot.size, 'documents');

          // Fetch users data to get user names
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const usersMap = {};
          usersSnapshot.docs.forEach(doc => {
            const userData = doc.data();
            usersMap[doc.id] = userData.name || userData.fullName || userData.displayName || 'Unknown User';
          });

          const issuesData = [];
          
          snapshot.docs.forEach(doc => {
            try {
              const data = doc.data();
              
              // Handle different date field possibilities
              let createdAt = '';
              if (data.timestamp?.toDate) {
                createdAt = data.timestamp.toDate().toISOString();
              } else if (data.createdAt?.toDate) {
                createdAt = data.createdAt.toDate().toISOString();
              } else if (data.dateCreated?.toDate) {
                createdAt = data.dateCreated.toDate().toISOString();
              } else if (data.date?.toDate) {
                createdAt = data.date.toDate().toISOString();
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
            } catch (docError) {
              console.error('Error processing document:', doc.id, docError);
            }
          });
          
          // Sort by urgency and date
          issuesData.sort((a, b) => {
            if (a.isUrgent && !b.isUrgent) return -1;
            if (!a.isUrgent && b.isUrgent) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
          });

          // Check for new issues and create admin notifications
          if (lastIssueCount > 0 && issuesData.length > lastIssueCount) {
            const newIssuesCount = issuesData.length - lastIssueCount;
            console.log(`Detected ${newIssuesCount} new issue(s), creating notifications...`);
            
            // Get the new issues (first n items after sorting)
            const newIssues = issuesData.slice(0, newIssuesCount);
            
            // Create notification for each new issue
            for (const newIssue of newIssues) {
              try {
                await addDoc(collection(db, 'notifications'), {
                  type: newIssue.isUrgent ? 'urgent' : 'warning',
                  title: 'New Issue Reported',
                  message: `${newIssue.userName} reported: "${newIssue.title}"`,
                  issueId: newIssue.id,
                  userId: newIssue.userId,
                  userName: newIssue.userName,
                  issueTitle: newIssue.title,
                  issueCategory: newIssue.category,
                  isUrgent: newIssue.isUrgent,
                  timestamp: serverTimestamp(),
                  read: false,
                  isAdminNotification: true
                });
                console.log(`Created admin notification for issue: ${newIssue.id}`);
              } catch (notifError) {
                console.error('Error creating admin notification:', notifError);
              }
            }
          }

          setLastIssueCount(issuesData.length);
          setIssues(issuesData);
          setLoading(false);
          
          if (issuesData.length === 0) {
            setError('No issues found in the database');
          }
        },
        (err) => {
          console.error('❌ Error in real-time listener:', err);
          setError('Failed to load issues: ' + err.message);
          setIssues([]);
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => {
        console.log('Cleaning up issues listener');
        unsubscribe();
      };
    } catch (err) {
      console.error('Error setting up issues listener:', err);
      setError('Failed to set up real-time updates: ' + err.message);
      setLoading(false);
    }
  }, [lastIssueCount]);

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
      
      // Create reply object with Date instead of serverTimestamp for array
      const reply = {
        message: replyMessage.trim(),
        timestamp: new Date(),
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

      closeDialog();
      alert('Reply sent successfully!');
      
    } catch (err) {
      console.error('Error submitting reply:', err);
      alert(`Failed to submit reply: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Get unique categories from issues
  const getUniqueCategories = () => {
    const categories = [...new Set(issues.map(issue => issue.category))];
    return categories.filter(Boolean);
  };

  // Filter issues based on report filters
  const getFilteredIssuesForReport = () => {
    return issues.filter(issue => {
      const issueDate = new Date(issue.createdAt);
      const startDate = reportFilters.startDate ? new Date(reportFilters.startDate) : null;
      const endDate = reportFilters.endDate ? new Date(reportFilters.endDate) : null;

      // Date filter
      if (startDate && issueDate < startDate) return false;
      if (endDate && issueDate > endDate) return false;

      // Status filter
      if (reportFilters.status !== 'all' && issue.status !== reportFilters.status) return false;

      // Priority filter
      if (reportFilters.priority === 'urgent' && !issue.isUrgent) return false;
      if (reportFilters.priority === 'normal' && issue.isUrgent) return false;

      // Category filter
      if (reportFilters.category !== 'all' && issue.category !== reportFilters.category) return false;

      return true;
    });
  };

  // Generate CSV report
  const generateCSVReport = () => {
    const filteredIssues = getFilteredIssuesForReport();
    
    if (filteredIssues.length === 0) {
      alert('No issues found with the selected filters');
      return;
    }

    setGeneratingReport(true);

    try {
      // CSV Headers
      const headers = ['Title', 'Category', 'Status', 'Priority', 'User Name', 'Email', 'Date Created', 'Description'];
      
      // CSV Rows
      const rows = filteredIssues.map(issue => [
        `"${issue.title.replace(/"/g, '""')}"`,
        issue.category,
        issue.status,
        issue.isUrgent ? 'URGENT' : 'NORMAL',
        `"${issue.userName.replace(/"/g, '""')}"`,
        issue.email || 'N/A',
        formatDate(issue.createdAt),
        `"${(issue.description || '').replace(/"/g, '""')}"`,
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `reported_issues_report_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`Report generated successfully! ${filteredIssues.length} issues exported.`);
      setShowReportDialog(false);
    } catch (error) {
      console.error('Error generating CSV report:', error);
      alert('Failed to generate report: ' + error.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Generate PDF report
  const generatePDFReport = () => {
    const filteredIssues = getFilteredIssuesForReport();
    
    if (filteredIssues.length === 0) {
      alert('No issues found with the selected filters');
      return;
    }

    setGeneratingReport(true);

    try {
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Reported Issues Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #16a34a; border-bottom: 3px solid #16a34a; padding-bottom: 10px; }
            .header { margin-bottom: 30px; }
            .stats { display: flex; gap: 20px; margin: 20px 0; }
            .stat-box { background: #f0fdf4; border: 2px solid #86efac; padding: 15px; border-radius: 8px; flex: 1; }
            .stat-box h3 { margin: 0; color: #16a34a; }
            .stat-box p { margin: 5px 0 0 0; font-size: 24px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #16a34a; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            tr:hover { background: #f0fdf4; }
            .urgent { color: #dc2626; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reported Issues Report</h1>
            <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
            ${reportFilters.startDate ? `<p><strong>Date Range:</strong> ${reportFilters.startDate} to ${reportFilters.endDate || 'Present'}</p>` : ''}
            ${reportFilters.status !== 'all' ? `<p><strong>Status Filter:</strong> ${reportFilters.status.toUpperCase()}</p>` : ''}
          </div>
          
          <div class="stats">
            <div class="stat-box">
              <h3>Total Issues</h3>
              <p>${filteredIssues.length}</p>
            </div>
            <div class="stat-box">
              <h3>Urgent</h3>
              <p>${filteredIssues.filter(i => i.isUrgent).length}</p>
            </div>
            <div class="stat-box">
              <h3>Resolved</h3>
              <p>${filteredIssues.filter(i => i.status === 'resolved').length}</p>
            </div>
            <div class="stat-box">
              <h3>Pending</h3>
              <p>${filteredIssues.filter(i => i.status === 'pending').length}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Priority</th>
                <th>User</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${filteredIssues.map(issue => `
                <tr>
                  <td><strong>${issue.title}</strong></td>
                  <td>${issue.category}</td>
                  <td>${issue.status.toUpperCase()}</td>
                  <td class="${issue.isUrgent ? 'urgent' : ''}">${issue.isUrgent ? 'URGENT' : 'NORMAL'}</td>
                  <td>${issue.userName}</td>
                  <td>${formatDate(issue.createdAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Clearo Sync - Waste Management System</p>
          </div>
        </body>
        </html>
      `;

      // Open in new window for printing/saving as PDF
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);

      setShowReportDialog(false);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Failed to generate report: ' + error.message);
    } finally {
      setGeneratingReport(false);
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
          <button
            onClick={() => setShowReportDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md font-medium"
          >
            <FaFileDownload className="w-4 h-4" />
            Generate Report
          </button>
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700 font-medium">Live updates</span>
          </div>
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
                      {(issue.status || 'pending').toUpperCase()
                    }</span>
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

      {/* Report Generation Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <FaFileDownload className="w-6 h-6" />
                  Generate Issues Report
                </h3>
                <button
                  onClick={() => setShowReportDialog(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-5">
                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={reportFilters.startDate}
                      onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                      End Date
                    </label>
                    <input
                      type="date"
                      value={reportFilters.endDate}
                      onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaFilter className="w-4 h-4 text-blue-600" />
                    Status Filter
                  </label>
                  <select
                    value={reportFilters.status}
                    onChange={(e) => setReportFilters({ ...reportFilters, status: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaExclamationCircle className="w-4 h-4 text-blue-600" />
                    Priority Filter
                  </label>
                  <select
                    value={reportFilters.priority}
                    onChange={(e) => setReportFilters({ ...reportFilters, priority: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent Only</option>
                    <option value="normal">Normal Only</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaFilter className="w-4 h-4 text-blue-600" />
                    Category Filter
                  </label>
                  <select
                    value={reportFilters.category}
                    onChange={(e) => setReportFilters({ ...reportFilters, category: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="all">All Categories</option>
                    {getUniqueCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Preview Stats */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-3">Report Preview</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white rounded p-3 border border-blue-200">
                      <div className="text-gray-600">Total Issues</div>
                      <div className="text-2xl font-bold text-blue-600">{getFilteredIssuesForReport().length}</div>
                    </div>
                    <div className="bg-white rounded p-3 border border-blue-200">
                      <div className="text-gray-600">Urgent Issues</div>
                      <div className="text-2xl font-bold text-red-600">{getFilteredIssuesForReport().filter(i => i.isUrgent).length}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowReportDialog(false)}
                  disabled={generatingReport}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={generateCSVReport}
                  disabled={generatingReport || getFilteredIssuesForReport().length === 0}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  <FaFileDownload className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={generatePDFReport}
                  disabled={generatingReport || getFilteredIssuesForReport().length === 0}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  <FaFileDownload className="w-4 h-4" />
                  Print PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
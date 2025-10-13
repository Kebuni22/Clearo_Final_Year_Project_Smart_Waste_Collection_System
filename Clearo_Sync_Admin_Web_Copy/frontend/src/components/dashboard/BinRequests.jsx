import React, { useState } from 'react';
import { 
  FaTrash, 
  FaMapMarkerAlt, 
  FaClock, 
  FaFilter, 
  FaSearch, 
  FaSort,
  FaEye,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaHourglassHalf,
  FaTimes,
  FaCheck,
  FaInfoCircle,
  FaDownload,
  FaPrint
} from 'react-icons/fa';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const BinRequests = ({
  binRequests = [],
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewingRequest, setViewingRequest] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [localBinRequests, setLocalBinRequests] = useState(binRequests);
  
  // Confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [pendingRequestId, setPendingRequestId] = useState(null);
  
  // Rejection modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // PDF generation states
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [showPDFOptions, setShowPDFOptions] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Approved bins management states
  const [showApprovedBinsSection, setShowApprovedBinsSection] = useState(false);
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState('');
  const [showBulkReportModal, setShowBulkReportModal] = useState(false);

  // Update local state when props change
  React.useEffect(() => {
    setLocalBinRequests(binRequests);
  }, [binRequests]);

  // Custom notification function
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter and sort requests using local state
  const filteredRequests = localBinRequests
    .filter(request => {
      const matchesSearch = request.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || request.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = a.createdAt?.toDate?.() || new Date(0);
          bValue = b.createdAt?.toDate?.() || new Date(0);
          break;
        case 'location':
          aValue = a.location || '';
          bValue = b.location || '';
          break;
        case 'capacity':
          aValue = parseInt(a.capacity) || 0;
          bValue = parseInt(b.capacity) || 0;
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

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <FaCheckCircle className="text-green-500" />;
      case 'pending':
        return <FaHourglassHalf className="text-yellow-500" />;
      case 'rejected':
        return <FaExclamationTriangle className="text-red-500" />;
      default:
        return <FaHourglassHalf className="text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getWasteTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'organic':
        return 'bg-green-100 text-green-800';
      case 'recyclable':
        return 'bg-blue-100 text-blue-800';
      case 'hazardous':
        return 'bg-red-100 text-red-800';
      case 'general':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'Unknown Date';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewRequest = (request) => {
    setViewingRequest(request);
    setShowViewModal(true);
  };

  const showConfirmDialog = (title, message, action, requestId) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setPendingRequestId(requestId);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    if (confirmAction) {
      confirmAction(pendingRequestId);
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
    setPendingRequestId(null);
  };

  const handleCancelAction = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setPendingRequestId(null);
  };

  const handleApproveRequest = async (requestId) => {
    try {
      setLoading(true);
      
      // Immediately update local state for instant UI feedback
      const updatedRequests = localBinRequests.map(request => 
        request.id === requestId 
          ? { 
              ...request, 
              status: 'Approved',
              updatedAt: new Date(),
              approvedBy: 'Admin',
              approvedDate: new Date()
            }
          : request
      );
      setLocalBinRequests(updatedRequests);
      
      // Update viewing request if it's the same one
      if (viewingRequest && viewingRequest.id === requestId) {
        setViewingRequest({
          ...viewingRequest,
          status: 'Approved',
          updatedAt: new Date(),
          approvedBy: 'Admin',
          approvedDate: new Date()
        });
      }
      
      // Update database
      const requestRef = doc(db, 'binRequests', requestId);
      await updateDoc(requestRef, {
        status: 'Approved',
        updatedAt: new Date(),
        approvedBy: 'Admin',
        approvedDate: new Date()
      });
      
      showNotification(`Request ${requestId} has been approved successfully!`, 'success');
      
      // Refresh data from server to ensure consistency
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error approving request:', error);
      
      // Revert local state on error
      setLocalBinRequests(binRequests);
      if (viewingRequest && viewingRequest.id === requestId) {
        const originalRequest = binRequests.find(req => req.id === requestId);
        if (originalRequest) {
          setViewingRequest(originalRequest);
        }
      }
      
      showNotification('Error approving request. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      setLoading(true);
      
      // Immediately update local state for instant UI feedback
      const updatedRequests = localBinRequests.map(request => 
        request.id === requestId 
          ? { 
              ...request, 
              status: 'Rejected',
              updatedAt: new Date(),
              rejectedBy: 'Admin',
              rejectedDate: new Date(),
              rejectionReason: rejectionReason || 'No reason provided'
            }
          : request
      );
      setLocalBinRequests(updatedRequests);
      
      // Update viewing request if it's the same one
      if (viewingRequest && viewingRequest.id === requestId) {
        setViewingRequest({
          ...viewingRequest,
          status: 'Rejected',
          updatedAt: new Date(),
          rejectedBy: 'Admin',
          rejectedDate: new Date(),
          rejectionReason: rejectionReason || 'No reason provided'
        });
      }
      
      // Update database
      const requestRef = doc(db, 'binRequests', requestId);
      await updateDoc(requestRef, {
        status: 'Rejected',
        updatedAt: new Date(),
        rejectedBy: 'Admin',
        rejectedDate: new Date(),
        rejectionReason: rejectionReason || 'No reason provided'
      });
      
      showNotification(`Request ${requestId} has been rejected.`, 'warning');
      
      // Refresh data from server to ensure consistency
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      
      // Revert local state on error
      setLocalBinRequests(binRequests);
      if (viewingRequest && viewingRequest.id === requestId) {
        const originalRequest = binRequests.find(req => req.id === requestId);
        if (originalRequest) {
          setViewingRequest(originalRequest);
        }
      }
      
      showNotification('Error rejecting request. Please try again.', 'error');
    } finally {
      setLoading(false);
      setShowRejectModal(false);
      setRejectionReason('');
    }
  };

  const initiateApprove = (requestId) => {
    showConfirmDialog(
      'Approve Request',
      'Are you sure you want to approve this bin request? This action will mark the request as approved and notify the requester.',
      handleApproveRequest,
      requestId
    );
  };

  const initiateReject = (requestId) => {
    setPendingRequestId(requestId);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = () => {
    if (pendingRequestId) {
      handleRejectRequest(pendingRequestId);
    }
  };

  const handleDownloadPDF = (request) => {
    setSelectedRequest(request);
    setShowPDFOptions(true);
  };

  const handlePrintView = async (request) => {
    try {
      setShowPDFModal(true);
      setShowPDFOptions(false);
      setPdfProgress(10);

      const updateProgress = (progress) => {
        setPdfProgress(progress);
        return new Promise(resolve => setTimeout(resolve, 200));
      };

      await updateProgress(30);

      // Create optimized print content
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bin Request Report - ${request.id}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: 'Arial', 'Helvetica', sans-serif; 
              line-height: 1.4;
              color: #333;
              background: #fff;
              font-size: 12px;
              padding: 0;
              margin: 0;
            }
            
            .print-container {
              max-width: 210mm;
              margin: 0 auto;
              padding: 15mm;
              background: white;
            }
            
            .header { 
              text-align: center; 
              margin-bottom: 25px; 
              border-bottom: 2px solid #22c55e;
              padding-bottom: 15px;
              page-break-inside: avoid;
            }
            
            .header h1 {
              color: #22c55e;
              font-size: 24px;
              margin-bottom: 8px;
              font-weight: bold;
            }
            
            .header .subtitle {
              font-size: 14px;
              color: #666;
              margin: 5px 0;
            }
            
            .company-info {
              background: #22c55e;
              color: white;
              padding: 12px;
              border-radius: 6px;
              margin: 15px 0;
              text-align: center;
              page-break-inside: avoid;
            }
            
            .info-section {
              margin: 20px 0;
              padding: 15px;
              background-color: #f9f9f9;
              border-radius: 6px;
              border-left: 3px solid #22c55e;
              page-break-inside: avoid;
            }
            
            .info-section h3 {
              color: #333;
              margin-bottom: 12px;
              font-size: 16px;
              font-weight: bold;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin: 12px 0;
            }
            
            .info-item {
              background: white;
              padding: 10px;
              border-radius: 4px;
              border: 1px solid #ddd;
            }
            
            .info-label {
              font-weight: bold;
              color: #555;
              font-size: 10px;
              margin-bottom: 3px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .info-value {
              color: #333;
              font-size: 12px;
              font-weight: 500;
            }
            
            .status-section {
              background: ${request.status?.toLowerCase() === 'approved' ? '#e7f5e7' : 
                           request.status?.toLowerCase() === 'rejected' ? '#ffeaea' : '#fff3cd'};
              border: 2px solid ${request.status?.toLowerCase() === 'approved' ? '#22c55e' : 
                                  request.status?.toLowerCase() === 'rejected' ? '#dc3545' : '#ffc107'};
              padding: 12px;
              border-radius: 6px;
              margin: 20px 0;
              page-break-inside: avoid;
            }
            
            .status-title {
              color: ${request.status?.toLowerCase() === 'approved' ? '#155724' : 
                       request.status?.toLowerCase() === 'rejected' ? '#721c24' : '#856404'};
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 6px;
            }
            
            .urgent-banner {
              background: #f8d7da;
              border: 2px solid #dc3545;
              padding: 10px;
              border-radius: 4px;
              margin: 12px 0;
              text-align: center;
              page-break-inside: avoid;
            }
            
            .urgent-text {
              color: #721c24;
              font-weight: bold;
              font-size: 12px;
            }
            
            .reason-section {
              background: #fff3cd;
              border: 1px solid #ffc107;
              border-left: 4px solid #ffc107;
              padding: 12px;
              margin: 20px 0;
              border-radius: 0 4px 4px 0;
              page-break-inside: avoid;
            }
            
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 10px;
              page-break-inside: avoid;
            }
            
            .footer .company-name {
              font-size: 12px;
              font-weight: bold;
              color: #22c55e;
              margin-bottom: 4px;
            }

            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #22c55e;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              font-weight: bold;
              box-shadow: 0 2px 5px rgba(0,0,0,0.2);
              z-index: 1000;
            }

            .print-button:hover {
              background: #16a34a;
            }
            
            @media print {
              body { 
                margin: 0; 
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .print-container {
                padding: 10mm;
                max-width: none;
              }
              
              .print-button {
                display: none !important;
              }
              
              .no-print { 
                display: none !important; 
              }
            }
            
            @page {
              margin: 10mm;
              size: A4;
            }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">🖨️ Print This Report</button>
          
          <div class="print-container">
            <div class="header">
              <h1>🗑️ Bin Request Report</h1>
              <div class="subtitle">Waste Collection Management System</div>
            </div>
            
            <div class="company-info">
              <h2 style="margin: 0; font-size: 16px;">Clearo Sync</h2>
              <p style="margin: 4px 0 0 0; font-size: 12px;">Smart Waste Management Solutions</p>
            </div>

            <div class="info-section">
              <h3>📋 Report Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Request ID</div>
                  <div class="info-value">${request.id}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Generated On</div>
                  <div class="info-value">${new Date().toLocaleString()}</div>
                </div>
              </div>
            </div>

            ${request.wantImmediately ? `
            <div class="urgent-banner">
              <div class="urgent-text">⚠️ URGENT REQUEST - IMMEDIATE ATTENTION REQUIRED</div>
            </div>
            ` : ''}

            <div class="info-section">
              <h3>📍 Request Details</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Request Date</div>
                  <div class="info-value">${formatDate(request.createdAt)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Location</div>
                  <div class="info-value">${request.location || 'Not specified'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Waste Type</div>
                  <div class="info-value">${request.type || 'General'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Capacity Required</div>
                  <div class="info-value">${request.capacity || 'N/A'} Liters</div>
                </div>
              </div>
            </div>

            <div class="status-section">
              <div class="status-title">📊 Current Status: ${request.status || 'Pending'}</div>
              <p style="margin: 0; color: #555; font-size: 11px;">
                ${request.status?.toLowerCase() === 'approved' ? 'This request has been approved and is ready for processing.' :
                  request.status?.toLowerCase() === 'rejected' ? 'This request has been rejected.' :
                  'This request is currently pending review.'}
              </p>
              ${request.approvedDate ? `<p style="margin: 6px 0 0 0; color: #155724; font-size: 11px;"><strong>Approved on:</strong> ${new Date(request.approvedDate.toDate()).toLocaleString()}</p>` : ''}
              ${request.rejectedDate ? `<p style="margin: 6px 0 0 0; color: #721c24; font-size: 11px;"><strong>Rejected on:</strong> ${new Date(request.rejectedDate.toDate()).toLocaleString()}</p>` : ''}
              ${request.rejectionReason ? `<p style="margin: 6px 0 0 0; color: #721c24; font-size: 11px;"><strong>Rejection Reason:</strong> ${request.rejectionReason}</p>` : ''}
            </div>

            ${request.reason ? `
            <div class="reason-section">
              <h4 style="margin-top: 0; color: #856404; font-size: 14px;">💭 Request Justification</h4>
              <p style="margin: 0; color: #333; font-style: italic; font-size: 11px;">"${request.reason}"</p>
            </div>
            ` : ''}

            <div class="footer">
              <div class="company-name">Clearo Sync</div>
              <div>Waste Collection Management System</div>
              <div style="margin-top: 6px;">
                Generated automatically on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await updateProgress(70);

      // Open print window
      const printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
      
      if (!printWindow) {
        throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
      }

      await updateProgress(90);

      printWindow.document.write(printContent);
      printWindow.document.close();

      await updateProgress(100);

      showNotification('📄 Print view opened successfully!', 'success');
      
      setTimeout(() => {
        setShowPDFModal(false);
        setPdfProgress(0);
      }, 1500);

    } catch (error) {
      console.error('Error opening print view:', error);
      showNotification(`❌ Error: ${error.message}`, 'error');
      setShowPDFModal(false);
      setPdfProgress(0);
    }
  };

  const handleDirectPDFDownload = async (request) => {
    try {
      setShowPDFModal(true);
      setShowPDFOptions(false);
      setPdfProgress(10);

      const updateProgress = (progress) => {
        setPdfProgress(progress);
        return new Promise(resolve => setTimeout(resolve, 300));
      };

      await updateProgress(30);

      // Create PDF content using jsPDF (you'll need to install: npm install jspdf)
      // For now, we'll create a downloadable HTML file that can be converted to PDF
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bin Request Report - ${request.id}</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              line-height: 1.4;
              color: #333;
              background: #fff;
              font-size: 12px;
            }
            .container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #22c55e; padding-bottom: 20px; }
            .header h1 { color: #22c55e; font-size: 24px; margin-bottom: 5px; }
            .company-info { background: #22c55e; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
            .info-section { margin: 25px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #22c55e; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
            .info-item { background: white; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
            .info-label { font-weight: bold; color: #555; font-size: 10px; text-transform: uppercase; margin-bottom: 5px; }
            .info-value { color: #333; font-size: 12px; }
            .status-section { 
              background: ${request.status?.toLowerCase() === 'approved' ? '#e7f5e7' : 
                           request.status?.toLowerCase() === 'rejected' ? '#ffeaea' : '#fff3cd'};
              border: 2px solid ${request.status?.toLowerCase() === 'approved' ? '#22c55e' : 
                                  request.status?.toLowerCase() === 'rejected' ? '#dc3545' : '#ffc107'};
              padding: 15px; border-radius: 5px; margin: 20px 0;
            }
            .urgent-banner { background: #f8d7da; border: 2px solid #dc3545; padding: 10px; text-align: center; margin: 15px 0; }
            .reason-section { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🗑️ Bin Request Report</h1>
              <p>Waste Collection Management System</p>
            </div>
            
            <div class="company-info">
              <h2 style="margin: 0;">Clearo Sync</h2>
              <p style="margin: 5px 0 0 0;">Smart Waste Management Solutions</p>
            </div>

            <div class="info-section">
              <h3>📋 Report Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Request ID</div>
                  <div class="info-value">${request.id}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Generated On</div>
                  <div class="info-value">${new Date().toLocaleString()}</div>
                </div>
              </div>
            </div>

            ${request.wantImmediately ? `
            <div class="urgent-banner">
              <strong style="color: #721c24;">⚠️ URGENT REQUEST - IMMEDIATE ATTENTION REQUIRED</strong>
            </div>
            ` : ''}

            <div class="info-section">
              <h3>📍 Request Details</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Request Date</div>
                  <div class="info-value">${formatDate(request.createdAt)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Location</div>
                  <div class="info-value">${request.location || 'Not specified'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Waste Type</div>
                  <div class="info-value">${request.type || 'General'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Capacity Required</div>
                  <div class="info-value">${request.capacity || 'N/A'} Liters</div>
                </div>
              </div>
            </div>

            <div class="status-section">
              <h4 style="margin-top: 0;">📊 Current Status: ${request.status || 'Pending'}</h4>
              <p style="margin: 5px 0;">${request.status?.toLowerCase() === 'approved' ? 'This request has been approved and is ready for processing.' :
                request.status?.toLowerCase() === 'rejected' ? 'This request has been rejected.' :
                'This request is currently pending review.'}</p>
              ${request.rejectedDate ? `<p><strong>Rejected on:</strong> ${new Date(request.rejectedDate.toDate()).toLocaleString()}</p>` : ''}
              ${request.rejectionReason ? `<p><strong>Rejection Reason:</strong> ${request.rejectionReason}</p>` : ''}
            </div>

            ${request.reason ? `
            <div class="reason-section">
              <h4 style="margin-top: 0;">💭 Request Justification</h4>
              <p style="font-style: italic;">"${request.reason}"</p>
            </div>
            ` : ''}

            <div class="footer">
              <div class="company-name">Clearo Sync</div>
              <div>Waste Collection Management System</div>
              <div style="margin-top: 6px;">
                Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await updateProgress(70);

      // Create and download the file
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      await updateProgress(90);

      const link = document.createElement('a');
      link.href = url;
      link.download = `bin-request-report-${request.id}-${new Date().toISOString().split('T')[0]}.html`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);

      await updateProgress(100);

      showNotification('📄 Report downloaded successfully! Open with browser and print to PDF.', 'success');
      
      setTimeout(() => {
        setShowPDFModal(false);
        setPdfProgress(0);
      }, 2000);

    } catch (error) {
      console.error('Error downloading PDF:', error);
      showNotification(`❌ Error: ${error.message}`, 'error');
      setShowPDFModal(false);
      setPdfProgress(0);
    }
  };

  // Get approved requests count
  const approvedRequests = localBinRequests.filter(request => 
    request.status?.toLowerCase() === 'approved'
  );

  const handleBulkReportGeneration = async () => {
    if (!selectedDeliveryDate) {
      showNotification('Please select a delivery date first.', 'error');
      return;
    }

    if (approvedRequests.length === 0) {
      showNotification('No approved requests found to generate report.', 'error');
      return;
    }

    try {
      setShowBulkReportModal(true);
      setPdfProgress(10);

      const updateProgress = (progress) => {
        setPdfProgress(progress);
        return new Promise(resolve => setTimeout(resolve, 300));
      };

      await updateProgress(30);

      // Calculate total capacity and group by waste type
      const totalCapacity = approvedRequests.reduce((sum, req) => sum + (parseInt(req.capacity) || 0), 0);
      const wasteTypeGroups = approvedRequests.reduce((groups, req) => {
        const type = req.type || 'General';
        if (!groups[type]) {
          groups[type] = { count: 0, totalCapacity: 0, requests: [] };
        }
        groups[type].count++;
        groups[type].totalCapacity += parseInt(req.capacity) || 0;
        groups[type].requests.push(req);
        return groups;
      }, {});

      await updateProgress(60);

      const bulkReportContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Approved Bin Requests - Bulk Report</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 30px;
              line-height: 1.5;
              color: #333;
              background: #fff;
              font-size: 12px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 3px solid #22c55e;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #22c55e;
              font-size: 28px;
              margin-bottom: 5px;
              font-weight: bold;
            }
            .header .subtitle {
              font-size: 16px;
              color: #666;
              margin: 5px 0;
            }
            .summary-section {
              background: #f0f9ff;
              border: 2px solid #0ea5e9;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin: 15px 0;
            }
            .summary-item {
              background: white;
              padding: 15px;
              border-radius: 6px;
              text-align: center;
              border: 1px solid #e0e7ff;
            }
            .summary-value {
              font-size: 24px;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 5px;
            }
            .summary-label {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .waste-type-section {
              margin: 25px 0;
              padding: 20px;
              background-color: #f9f9f9;
              border-radius: 8px;
              border-left: 4px solid #22c55e;
            }
            .waste-type-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin: 15px 0;
            }
            .waste-type-item {
              background: white;
              padding: 12px;
              border-radius: 6px;
              border: 1px solid #e0e0e0;
            }
            .requests-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              font-size: 11px;
            }
            .requests-table th {
              background: #22c55e;
              color: white;
              padding: 8px;
              text-align: left;
              font-weight: bold;
            }
            .requests-table td {
              padding: 6px 8px;
              border-bottom: 1px solid #e0e0e0;
            }
            .requests-table tr:nth-child(even) {
              background: #f9f9f9;
            }
            .urgent-row {
              background: #fef2f2 !important;
              color: #991b1b;
            }
            .approval-section {
              background: #fefce8;
              border: 2px solid #eab308;
              padding: 20px;
              border-radius: 8px;
              margin: 30px 0;
            }
            .signature-section {
              margin: 40px 0;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
            }
            .signature-box {
              border: 1px solid #ddd;
              padding: 30px 20px;
              text-align: center;
              background: #f9f9f9;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e0e0e0;
              text-align: center;
              color: #666;
              font-size: 10px;
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #22c55e;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              font-weight: bold;
              box-shadow: 0 2px 5px rgba(0,0,0,0.2);
              z-index: 1000;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .print-button { display: none !important; }
              .no-print { display: none !important; }
              .page-break { page-break-before: always; }
            }
            @page { margin: 10mm; size: A4; }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">🖨️ Print Report</button>
          
          <div class="header">
            <h1>📋 Approved Bin Requests - Bulk Report</h1>
            <div class="subtitle">Administrative Approval Document</div>
            <p style="margin-top: 15px; font-size: 14px; color: #22c55e; font-weight: bold;">
              Clearo Sync - Waste Collection Management System
            </p>
          </div>

          <div class="summary-section">
            <h3 style="margin-top: 0; color: #1e40af; text-align: center;">📊 Summary Overview</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-value">${approvedRequests.length}</div>
                <div class="summary-label">Total Approved Requests</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${totalCapacity.toLocaleString()}</div>
                <div class="summary-label">Total Capacity (Liters)</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${Object.keys(wasteTypeGroups).length}</div>
                <div class="summary-label">Waste Categories</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${approvedRequests.filter(r => r.wantImmediately).length}</div>
                <div class="summary-label">Urgent Requests</div>
              </div>
            </div>
            <div style="text-align: center; margin-top: 15px; padding: 10px; background: white; border-radius: 5px;">
              <strong>📅 Proposed Delivery Date: ${new Date(selectedDeliveryDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</strong>
            </div>
          </div>

          <div class="waste-type-section">
            <h3 style="margin-top: 0; color: #333;">🗂️ Breakdown by Waste Type</h3>
            <div class="waste-type-grid">
              ${Object.entries(wasteTypeGroups).map(([type, data]) => `
                <div class="waste-type-item">
                  <h4 style="margin: 0 0 8px 0; color: #22c55e;">${type} Waste</h4>
                  <p style="margin: 3px 0;"><strong>Requests:</strong> ${data.count}</p>
                  <p style="margin: 3px 0;"><strong>Total Capacity:</strong> ${data.totalCapacity.toLocaleString()} L</p>
                  <p style="margin: 3px 0;"><strong>Avg. per Bin:</strong> ${Math.round(data.totalCapacity / data.count)} L</p>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="margin: 30px 0;">
            <h3 style="color: #333; border-bottom: 2px solid #22c55e; padding-bottom: 8px;">📋 Detailed Request List</h3>
            <table class="requests-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Request ID</th>
                  <th>Location</th>
                  <th>Waste Type</th>
                  <th>Capacity (L)</th>
                  <th>Request Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${approvedRequests.map((request, index) => `
                  <tr ${request.wantImmediately ? 'class="urgent-row"' : ''}>
                    <td>${index + 1}</td>
                    <td style="font-weight: bold;">${request.id}</td>
                    <td>${request.location || 'Not specified'}</td>
                    <td>${request.type || 'General'}</td>
                    <td style="text-align: center; font-weight: bold;">${request.capacity || 'N/A'}</td>
                    <td>${formatDate(request.createdAt)}</td>
                    <td style="text-align: center;">
                      ${request.wantImmediately ? '<strong style="color: #dc2626;">URGENT</strong>' : 'Standard'}
                    </td>
                    <td style="color: #22c55e; font-weight: bold;">APPROVED</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="approval-section">
            <h3 style="margin-top: 0; color: #92400e;">⚠️ Administrative Approval Required</h3>
            <p style="margin: 10px 0;">
              This report contains <strong>${approvedRequests.length} approved bin requests</strong> 
              with a total capacity of <strong>${totalCapacity.toLocaleString()} liters</strong>.
            </p>
            <p style="margin: 10px 0;">
              The proposed delivery date is <strong>${new Date(selectedDeliveryDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</strong>.
            </p>
            <p style="margin: 10px 0; color: #dc2626;">
              <strong>Please review and provide administrative approval for procurement and deployment.</strong>
            </p>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <h4 style="margin-bottom: 20px;">Prepared By</h4>
              <div style="border-bottom: 1px solid #333; margin: 40px 20px 10px 20px;"></div>
              <p style="margin: 5px 0; font-size: 11px;">Admin Officer</p>
              <p style="margin: 5px 0; font-size: 11px;">Date: ${new Date().toLocaleDateString()}</p>
            </div>
            <div class="signature-box">
              <h4 style="margin-bottom: 20px;">Approved By</h4>
              <div style="border-bottom: 1px solid #333; margin: 40px 20px 10px 20px;"></div>
              <p style="margin: 5px 0; font-size: 11px;">Administration Officer</p>
              <p style="margin: 5px 0; font-size: 11px;">Date: _______________</p>
            </div>
          </div>

          <div class="footer">
            <div style="font-size: 12px; font-weight: bold; color: #22c55e; margin-bottom: 5px;">
              Clearo Sync - Waste Collection Management System
            </div>
            <div>Smart Waste Management Solutions</div>
            <div style="margin-top: 10px;">
              Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
            </div>
            <div style="margin-top: 5px; font-style: italic;">
              This is an official document for administrative approval purposes.
            </div>
          </div>
        </body>
        </html>
      `;

      await updateProgress(90);

      // Open print window
      const printWindow = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
      
      if (!printWindow) {
        throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
      }

      printWindow.document.write(bulkReportContent);
      printWindow.document.close();

      await updateProgress(100);

      showNotification(`📄 Bulk report generated for ${approvedRequests.length} approved requests!`, 'success');
      
      setTimeout(() => {
        setShowBulkReportModal(false);
        setPdfProgress(0);
      }, 2000);

    } catch (error) {
      console.error('Error generating bulk report:', error);
      showNotification(`❌ Error: ${error.message}`, 'error');
      setShowBulkReportModal(false);
      setPdfProgress(0);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 ${
          notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
          'bg-red-50 border-red-500 text-red-800'
        } transition-all duration-300`}>
          <div className="flex items-center">
            {notification.type === 'success' && <FaCheckCircle className="mr-2" />}
            {notification.type === 'warning' && <FaExclamationTriangle className="mr-2" />}
            {notification.type === 'error' && <FaTimes className="mr-2" />}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <FaTrash className="text-green-600" />
              </div>
              Bin Requests Management
            </h2>
            <p className="text-gray-600 mt-2">Manage and track waste bin placement requests</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">{filteredRequests.length}</div>
            <div className="text-sm text-gray-500">Total Requests</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by location, type, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
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
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="date-desc">Latest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="location-asc">Location A-Z</option>
              <option value="location-desc">Location Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      {filteredRequests.length > 0 ? (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                  <div className="flex items-center space-x-2">
                    <FaInfoCircle className="text-green-600" />
                    <span>Request ID</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                  <div className="flex items-center space-x-2">
                    <FaTrash className="text-green-600" />
                    <span>Type & Capacity</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">
                  <div className="flex items-center justify-center space-x-2">
                    <FaCheckCircle className="text-green-600" />
                    <span>Actions</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredRequests.map((request, index) => (
                <tr key={request.id} className="hover:bg-green-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-700 font-bold text-sm">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{request.id}</p>
                        {request.wantImmediately && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 mt-1">
                            <FaExclamationTriangle className="mr-1" />
                            URGENT
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getWasteTypeColor(request.type)}`}>
                        {request.type || 'General'}
                      </span>
                      <p className="text-lg font-semibold text-green-600">{request.capacity || 'N/A'} L</p>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {getStatusIcon(request.status)}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(request.status)}`}>
                        {request.status || 'Pending'}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleViewRequest(request)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title="View Details"
                      >
                        <FaEye className="text-sm" />
                      </button>

                      {request.status?.toLowerCase() === 'pending' && (
                        <>
                          <button
                            onClick={() => initiateApprove(request.id)}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                            title="Approve"
                            disabled={loading}
                          >
                            <FaCheck className="text-sm" />
                          </button>
                          <button
                            onClick={() => initiateReject(request.id)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            title="Reject"
                            disabled={loading}
                          >
                            <FaTimes className="text-sm" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDownloadPDF(request)}
                        className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                        title="Download PDF"
                      >
                        <FaDownload className="text-sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaTrash className="text-gray-400 text-3xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Bin Requests Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'All' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'No bin requests have been submitted yet.'}
          </p>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
              <button
                onClick={() => setShowViewModal(false)}
                className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
              <h2 className="text-2xl font-bold pr-12">Bin Request Details</h2>
              <p className="text-green-100 mt-1">Request ID: {viewingRequest.id}</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium mb-1">Request Date</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(viewingRequest.createdAt)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 font-medium mb-1">Capacity</p>
                  <p className="text-lg font-bold text-gray-900">{viewingRequest.capacity || 'N/A'} L</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-600 font-medium mb-1">Status</p>
                  <p className="text-sm font-semibold text-gray-900">{viewingRequest.status || 'Pending'}</p>
                </div>
              </div>

              {viewingRequest.wantImmediately && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center space-x-3">
                  <FaExclamationTriangle className="text-red-600 text-xl" />
                  <div>
                    <h4 className="text-lg font-bold text-red-800">URGENT REQUEST</h4>
                    <p className="text-red-700">This request requires immediate attention.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-green-200 pb-2">Location & Type</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Location</p>
                    <div className="flex items-center space-x-2">
                      <FaMapMarkerAlt className="text-green-600" />
                      <p className="text-gray-900">{viewingRequest.location || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Waste Type</p>
                    <span className={`inline-flex px-4 py-2 rounded-lg text-sm font-medium ${getWasteTypeColor(viewingRequest.type)}`}>
                      {viewingRequest.type || 'General'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-blue-200 pb-2">Status & Timeline</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-gray-600 mb-3">Current Status</p>
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(viewingRequest.status)}
                      <span className={`px-4 py-2 rounded-lg text-sm font-bold ${getStatusColor(viewingRequest.status)}`}>
                        {viewingRequest.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {viewingRequest.reason && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-yellow-800 mb-2">Request Reason</h4>
                  <p className="text-gray-700">{viewingRequest.reason}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-4 border-t">
                {viewingRequest.status?.toLowerCase() === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        initiateApprove(viewingRequest.id);
                        setShowViewModal(false);
                      }}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                      disabled={loading}
                    >
                      <FaCheck className="mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        initiateReject(viewingRequest.id);
                        setShowViewModal(false);
                      }}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                      disabled={loading}
                    >
                      <FaTimes className="mr-2" />
                      Reject
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => handleDownloadPDF(viewingRequest)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                >
                  <FaDownload className="mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <FaCheckCircle className="text-green-600 text-xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">{confirmTitle}</h3>
              </div>
              
              <p className="text-gray-600 mb-6 leading-relaxed">{confirmMessage}</p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelAction}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
                  disabled={loading}
                >
                  <FaCheck className="mr-2" />
                  {loading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <FaExclamationTriangle className="text-red-600 text-xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Reject Request</h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                Are you sure you want to reject this bin request? Please provide a reason for rejection.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  rows="3"
                  placeholder="Enter reason for rejection..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setPendingRequestId(null);
                  }}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center"
                  disabled={loading}
                >
                  <FaTimes className="mr-2" />
                  {loading ? 'Processing...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Options Modal */}
      {showPDFOptions && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <FaDownload className="text-purple-600 text-xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Generate Report</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Choose how you would like to generate the PDF report for request <strong>{selectedRequest.id}</strong>:
              </p>
              
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handlePrintView(selectedRequest)}
                  className="w-full p-4 text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors group"
                >
                  <div className="flex items-center">
                    <FaPrint className="text-blue-600 text-lg mr-3" />
                    <div>
                      <div className="font-semibold text-blue-800">Print View</div>
                      <div className="text-sm text-blue-600">Open in new window with print button</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleDirectPDFDownload(selectedRequest)}
                  className="w-full p-4 text-left bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors group"
                >
                  <div className="flex items-center">
                    <FaDownload className="text-green-600 text-lg mr-3" />
                    <div>
                      <div className="font-semibold text-green-800">Direct Download</div>
                      <div className="text-sm text-green-600">Download HTML file (convert to PDF in browser)</div>
                    </div>
                  </div>
                </button>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPDFOptions(false);
                    setSelectedRequest(null);
                  }}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Generation Modal */}
      {showPDFModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  {pdfProgress < 100 ? (
                    <FaDownload className="text-green-600 text-2xl animate-bounce" />
                  ) : (
                    <FaCheckCircle className="text-green-600 text-2xl" />
                  )}
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {pdfProgress < 100 ? 'Generating Report' : 'Report Ready!'}
                </h3>
                
                <p className="text-gray-600 mb-6">
                  {pdfProgress < 100 
                    ? 'Please wait while we prepare your report...'
                    : 'Your report has been generated successfully.'
                  }
                </p>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ease-out ${
                      pdfProgress === 100 
                        ? 'bg-gradient-to-r from-green-500 to-green-600' 
                        : 'bg-gradient-to-r from-purple-500 to-purple-600'
                    }`}
                    style={{ width: `${pdfProgress}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                  <span>Progress</span>
                  <span className="font-semibold">{pdfProgress}%</span>
                </div>
                
                {/* Status Messages */}
                <div className="text-sm text-gray-600">
                  {pdfProgress < 30 && (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                      Initializing report generation...
                    </div>
                  )}
                  {pdfProgress >= 30 && pdfProgress < 70 && (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                      Building document content...
                    </div>
                  )}
                  {pdfProgress >= 70 && pdfProgress < 90 && (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                      Formatting layout...
                    </div>
                  )}
                  {pdfProgress >= 90 && pdfProgress < 100 && (
                    <div className="flex items-center justify-center text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Finalizing...
                    </div>
                  )}
                  {pdfProgress === 100 && (
                    <div className="flex items-center justify-center text-green-600">
                      <FaCheckCircle className="mr-2" />
                      Report generated successfully!
                    </div>
                  )}
                </div>
                
                {pdfProgress < 100 && (
                  <button
                    onClick={() => {
                      setShowPDFModal(false);
                      setPdfProgress(0);
                    }}
                    className="mt-4 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approved Bins Management Section */}
      {approvedRequests.length > 0 && (
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <FaCheckCircle className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Approved Bins Management</h3>
                <p className="text-gray-600 mt-1">Generate administrative approval report for bin deployment</p>
              </div>
            </div>
            <button
              onClick={() => setShowApprovedBinsSection(!showApprovedBinsSection)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              {showApprovedBinsSection ? (
                <>
                  <FaTimes className="mr-2" />
                  Hide Section
                </>
              ) : (
                <>
                  <FaEye className="mr-2" />
                  Show Details
                </>
              )}
            </button>
          </div>

          {showApprovedBinsSection && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex items-center">
                    <FaCheckCircle className="text-green-500 text-2xl mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Approved Requests</p>
                      <p className="text-2xl font-bold text-green-600">{approvedRequests.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex items-center">
                    <FaTrash className="text-blue-500 text-2xl mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Total Capacity</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {approvedRequests.reduce((sum, req) => sum + (parseInt(req.capacity) || 0), 0).toLocaleString()} L
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex items-center">
                    <FaExclamationTriangle className="text-orange-500 text-2xl mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Urgent Requests</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {approvedRequests.filter(req => req.wantImmediately).length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex items-center">
                    <FaCalendarAlt className="text-purple-500 text-2xl mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Categories</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {[...new Set(approvedRequests.map(req => req.type || 'General'))].length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Date Selection */}
              <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <FaCalendarAlt className="text-blue-600 mr-2" />
                  Proposed Delivery Date
                </h4>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select the proposed date for bin delivery and installation:
                    </label>
                    <input
                      type="date"
                      value={selectedDeliveryDate}
                      onChange={(e) => setSelectedDeliveryDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">Selected Date:</p>
                    <p className="text-blue-600">
                      {selectedDeliveryDate 
                        ? new Date(selectedDeliveryDate).toLocaleDateString('en-US', { 
                            weekday: 'long',
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'No date selected'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Waste Type Breakdown */}
              <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <FaInfoCircle className="text-blue-600 mr-2" />
                  Breakdown by Waste Type
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...new Set(approvedRequests.map(req => req.type || 'General'))].map(type => {
                    const typeRequests = approvedRequests.filter(req => (req.type || 'General') === type);
                    const totalCapacity = typeRequests.reduce((sum, req) => sum + (parseInt(req.capacity) || 0), 0);
                    
                    return (
                      <div key={type} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mb-2 ${getWasteTypeColor(type)}`}>
                          {type}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">Requests: <span className="font-semibold">{typeRequests.length}</span></p>
                          <p className="text-sm text-gray-600">Capacity: <span className="font-semibold">{totalCapacity.toLocaleString()} L</span></p>
                          <p className="text-sm text-gray-600">Avg per bin: <span className="font-semibold">{Math.round(totalCapacity / typeRequests.length)} L</span></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Generate Report Button */}
              <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Administrative Approval Report</h4>
                    <p className="text-gray-600">
                      Generate a comprehensive report for administrative approval to proceed with bin procurement and deployment.
                    </p>
                    {!selectedDeliveryDate && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <FaExclamationTriangle className="mr-1" />
                        Please select a delivery date before generating the report.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleBulkReportGeneration}
                    disabled={!selectedDeliveryDate || approvedRequests.length === 0}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaDownload className="mr-2" />
                    Generate Administrative Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Report Generation Modal */}
      {showBulkReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  {pdfProgress < 100 ? (
                    <FaDownload className="text-green-600 text-2xl animate-bounce" />
                  ) : (
                    <FaCheckCircle className="text-green-600 text-2xl" />
                  )}
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {pdfProgress < 100 ? 'Generating Administrative Report' : 'Report Generated!'}
                </h3>
                
                <p className="text-gray-600 mb-6">
                  {pdfProgress < 100 
                    ? `Processing ${approvedRequests.length} approved requests...`
                    : 'Administrative approval report has been generated successfully.'
                  }
                </p>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ease-out ${
                      pdfProgress === 100 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                    }`}
                    style={{ width: `${pdfProgress}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                  <span>Progress</span>
                  <span className="font-semibold">{pdfProgress}%</span>
                </div>
                
                {/* Status Messages */}
                <div className="text-sm text-gray-600">
                  {pdfProgress < 30 && (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Analyzing approved requests...
                    </div>
                  )}
                  {pdfProgress >= 30 && pdfProgress < 60 && (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Calculating summaries and breakdowns...
                    </div>
                  )}
                  {pdfProgress >= 60 && pdfProgress < 90 && (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Formatting administrative document...
                    </div>
                  )}
                  {pdfProgress >= 90 && pdfProgress < 100 && (
                    <div className="flex items-center justify-center text-green-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                      Finalizing report...
                    </div>
                  )}
                  {pdfProgress === 100 && (
                    <div className="flex items-center justify-center text-green-600">
                      <FaCheckCircle className="mr-2" />
                      Administrative report ready for review!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BinRequests;
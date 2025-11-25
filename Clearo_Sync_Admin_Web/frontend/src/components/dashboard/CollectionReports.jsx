import React, { useState, useEffect } from 'react';
import { FaChartBar, FaDownload, FaCalendarAlt, FaTruck, FaRecycle, FaSync, FaRoad, FaMapMarkerAlt, FaFilePdf } from 'react-icons/fa';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';

const CollectionReports = () => {
  const [reportType, setReportType] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Real data states
  const [stats, setStats] = useState({
    totalCollections: 0,
    totalWaste: '0 tons',
    recycledMaterial: '0 tons',
    routesCompleted: 0,
    roadsCompleted: 0,
    averageTime: '0 hours',
    fuelConsumption: '0 liters'
  });
  
  const [reports, setReports] = useState([]);
  const [collections, setCollections] = useState([]);

  // Fetch collection data
  useEffect(() => {
    fetchCollectionData();
  }, []);

  const fetchCollectionData = async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      
      // Fetch immediate pickups (completed collections only)
      const pickupsSnapshot = await getDocs(collection(db, 'immediate_pickups'));
      const pickupsData = pickupsSnapshot.docs
        .map(doc => {
          const data = doc.data();
          let timestamp = new Date();
          
          if (data.timestamp) {
            if (typeof data.timestamp.toDate === 'function') {
              timestamp = data.timestamp.toDate();
            } else if (data.timestamp instanceof Date) {
              timestamp = data.timestamp;
            } else if (typeof data.timestamp === 'string') {
              timestamp = new Date(data.timestamp);
            }
          }
          
          return {
            id: doc.id,
            ...data,
            timestamp: timestamp,
            type: 'Immediate Pickup',
            location: data.location || data.address || 'N/A',
            road: data.road || extractRoadFromLocation(data.location || data.address) || 'N/A'
          };
        })
        .filter(pickup => {
          const isCompleted = pickup.status === 'completed' || pickup.driver;
          const isPastDate = pickup.timestamp <= now;
          return isCompleted && isPastDate;
        });

      // Fetch schedules (only past completed schedules)
      const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
      const schedulesData = schedulesSnapshot.docs
        .map(doc => {
          const data = doc.data();
          let date = new Date();
          
          if (data.date) {
            if (typeof data.date.toDate === 'function') {
              date = data.date.toDate();
            } else if (data.date instanceof Date) {
              date = data.date;
            } else if (typeof data.date === 'string') {
              date = new Date(data.date);
            }
          } else if (data.timestamp) {
            if (typeof data.timestamp.toDate === 'function') {
              date = data.timestamp.toDate();
            } else if (data.timestamp instanceof Date) {
              date = data.timestamp;
            } else if (typeof data.timestamp === 'string') {
              date = new Date(data.timestamp);
            }
          }
          
          return {
            id: doc.id,
            ...data,
            date: date,
            timestamp: date,
            type: 'Scheduled Collection',
            location: data.location || data.area || data.route || 'N/A',
            road: data.road || data.route || data.area || 'N/A'
          };
        })
        .filter(schedule => {
          const isPastDate = schedule.date <= now;
          const isValidDate = schedule.date.getFullYear() <= now.getFullYear();
          return isPastDate && isValidDate;
        });

      // Fetch vehicles to count active routes
      const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
      const activeVehicles = vehiclesSnapshot.docs.filter(doc => 
        doc.data().status === 'In Use'
      );

      // Calculate statistics
      const allCollections = [...pickupsData, ...schedulesData];
      const totalCollections = allCollections.length;
      
      // Count unique roads completed
      const uniqueRoads = new Set(
        allCollections
          .map(c => c.road)
          .filter(road => road && road !== 'N/A')
      );
      const roadsCompleted = uniqueRoads.size;
      
      // Calculate total waste
      const avgWastePerCollection = 0.054;
      const totalWasteTons = (totalCollections * avgWastePerCollection).toFixed(1);
      const recycledTons = (totalWasteTons * 0.65).toFixed(1);
      
      // Calculate average completion time
      let totalTime = 0;
      let timeCount = 0;
      
      pickupsData.forEach(pickup => {
        if (pickup.completedAt && pickup.timestamp) {
          try {
            const completedDate = pickup.completedAt instanceof Date 
              ? pickup.completedAt 
              : new Date(pickup.completedAt);
            const diff = completedDate - pickup.timestamp;
            if (diff > 0 && diff < 86400000) {
              totalTime += diff;
              timeCount++;
            }
          } catch (e) {
            console.warn('Error calculating time difference:', e);
          }
        }
      });
      
      const avgTimeHours = timeCount > 0 
        ? (totalTime / timeCount / (1000 * 60 * 60)).toFixed(1)
        : '0';

      const fuelPerVehiclePerDay = 8;
      const estimatedFuel = (activeVehicles.length * fuelPerVehiclePerDay).toFixed(0);

      setStats({
        totalCollections: totalCollections,
        totalWaste: `${totalWasteTons} tons`,
        recycledMaterial: `${recycledTons} tons`,
        routesCompleted: schedulesData.length,
        roadsCompleted: roadsCompleted,
        averageTime: `${avgTimeHours} hours`,
        fuelConsumption: `${estimatedFuel} liters`
      });

      // Generate detailed reports
      const reportsList = generateDetailedReports(allCollections);
      setReports(reportsList);
      setCollections(allCollections);

      console.log('✅ Loaded real data:', {
        pickups: pickupsData.length,
        schedules: schedulesData.length,
        total: totalCollections,
        uniqueRoads: roadsCompleted
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching collection data:', err);
      setError('Failed to load collection data: ' + err.message);
      setLoading(false);
    }
  };

  // Helper function to extract road from location string
  const extractRoadFromLocation = (location) => {
    if (!location) return null;
    const roadMatch = location.match(/([A-Za-z\s]+(?:Road|Street|Avenue|Lane|Drive|Way))/i);
    return roadMatch ? roadMatch[1] : null;
  };

  // Generate detailed reports grouped by date
  const generateDetailedReports = (collectionsData) => {
    const reportsByDate = {};
    const now = new Date();

    collectionsData.forEach(collection => {
      let dateStr;
      let collectionDate;
      
      try {
        if (collection.timestamp) {
          if (collection.timestamp instanceof Date) {
            collectionDate = collection.timestamp;
            dateStr = collection.timestamp.toISOString().split('T')[0];
          } else if (typeof collection.timestamp === 'string') {
            collectionDate = new Date(collection.timestamp);
            dateStr = collectionDate.toISOString().split('T')[0];
          }
        }
        else if (collection.date) {
          if (collection.date instanceof Date) {
            collectionDate = collection.date;
            dateStr = collection.date.toISOString().split('T')[0];
          } else if (typeof collection.date === 'string') {
            collectionDate = new Date(collection.date);
            dateStr = collectionDate.toISOString().split('T')[0];
          }
        }
        
        if (!dateStr || !collectionDate || collectionDate > now || collectionDate.getFullYear() > now.getFullYear()) {
          return;
        }
      } catch (e) {
        console.warn('Error parsing date:', e);
        return;
      }
      
      if (!reportsByDate[dateStr]) {
        reportsByDate[dateStr] = {
          date: dateStr,
          collections: 0,
          waste: 0,
          roads: new Set(),
          immediatePickups: 0,
          scheduledCollections: 0,
          status: 'Completed'
        };
      }
      
      reportsByDate[dateStr].collections++;
      reportsByDate[dateStr].waste += 0.054;
      
      // Add road if valid
      if (collection.road && collection.road !== 'N/A') {
        reportsByDate[dateStr].roads.add(collection.road);
      }
      
      // Count collection types
      if (collection.type === 'Immediate Pickup') {
        reportsByDate[dateStr].immediatePickups++;
      } else {
        reportsByDate[dateStr].scheduledCollections++;
      }
    });

    // Convert to array with formatted data
    return Object.values(reportsByDate)
      .map(report => ({
        date: report.date,
        collections: report.collections,
        waste: `${report.waste.toFixed(2)} tons`,
        roadsCompleted: report.roads.size,
        immediatePickups: report.immediatePickups,
        scheduledCollections: report.scheduledCollections,
        status: report.status
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 15); // Show last 15 reports
  };

  // Generate custom report
  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include end date fully

    const filteredCollections = collections.filter(collection => {
      let collectionDate = collection.timestamp || collection.date;
      
      // Ensure collectionDate is a Date object
      if (!(collectionDate instanceof Date)) {
        collectionDate = new Date(collectionDate);
      }
      
      return collectionDate >= start && collectionDate <= end;
    });

    const filteredReports = generateDetailedReports(filteredCollections);
    setReports(filteredReports);
    
    alert(`Generated report for ${startDate} to ${endDate}\nFound ${filteredCollections.length} collections`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (reports.length === 0) {
      alert('No reports to export');
      return;
    }

    // Create PDF content
    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Collection Reports - ${new Date().toISOString().split('T')[0]}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #16a34a;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #16a34a;
            margin: 0;
            font-size: 32px;
          }
          .header p {
            color: #666;
            margin: 10px 0 0 0;
          }
          .summary {
            background: #f0fdf4;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .summary h2 {
            color: #16a34a;
            margin-top: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: #16a34a;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
          }
          tr:hover {
            background-color: #f9fafb;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .status-badge {
            background: #dcfce7;
            color: #16a34a;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌱 Clearo Sync Collection Reports</h1>
          <p>Waste Management System</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary">
          <h2>Report Summary</h2>
          <p><strong>Total Reports:</strong> ${reports.length}</p>
          <p><strong>Date Range:</strong> ${reports[reports.length - 1]?.date} to ${reports[0]?.date}</p>
          <p><strong>Total Collections:</strong> ${reports.reduce((sum, r) => sum + r.collections, 0)}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th style="text-align: center;">Total Collections</th>
              <th style="text-align: center;">Scheduled</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${reports.map(report => `
              <tr>
                <td><strong>${report.date}</strong></td>
                <td style="text-align: center;"><strong>${report.collections}</strong></td>
                <td style="text-align: center;">${report.scheduledCollections}</td>
                <td style="text-align: center;">
                  <span class="status-badge">${report.status}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>© ${new Date().getFullYear()} Clearo Sync - Smart Waste Collection System</p>
          <p>This report is automatically generated and contains confidential information.</p>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="background: #16a34a; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; margin-right: 10px;">
            Print / Save as PDF
          </button>
          <button onclick="window.close()" style="background: #6b7280; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Download individual report as PDF
  const handleDownloadReport = (report) => {
    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Collection Report - ${report.date}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #16a34a;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #16a34a;
            margin: 0;
            font-size: 32px;
          }
          .report-details {
            background: #f0fdf4;
            padding: 30px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 15px 0;
            border-bottom: 1px solid #d1fae5;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: bold;
            color: #16a34a;
          }
          .value {
            color: #333;
            font-size: 18px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌱 Collection Report</h1>
          <p style="color: #666; margin: 10px 0;">Clearo Sync - Waste Management System</p>
        </div>

        <div class="report-details">
          <div class="detail-row">
            <span class="label">Report Date:</span>
            <span class="value">${report.date}</span>
          </div>
          <div class="detail-row">
            <span class="label">Total Collections:</span>
            <span class="value">${report.collections}</span>
          </div>
          <div class="detail-row">
            <span class="label">Scheduled Collections:</span>
            <span class="value">${report.scheduledCollections}</span>
          </div>
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value" style="color: #16a34a; font-weight: bold;">${report.status}</span>
          </div>
        </div>

        <div class="footer">
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>© ${new Date().getFullYear()} Clearo Sync - Smart Waste Collection System</p>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="background: #16a34a; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; margin-right: 10px;">
            Print / Save as PDF
          </button>
          <button onclick="window.close()" style="background: #6b7280; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <div className="flex flex-col items-center justify-center py-12">
          <FaSync className="w-12 h-12 text-green-600 animate-spin mb-4" />
          <span className="text-lg text-gray-600 font-medium">Loading collection reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-green-700 flex items-center">
          <FaChartBar className="mr-3" />
          Collection Reports & Analytics
        </h2>
        <button
          onClick={fetchCollectionData}
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

      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-blue-600 mb-2">Report Generation</h3>
        <p className="text-gray-600">Generate detailed reports on waste collection activities and performance metrics.</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Generate New Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Report Type</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="daily">Daily Reports</option>
              <option value="weekly">Weekly Summary</option>
              <option value="monthly">Monthly Report</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div className="flex items-end">
            <button 
              onClick={handleGenerateReport}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center"
            >
              <FaChartBar className="mr-2" />
              Generate
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Collection Reports</h3>
          <button 
            onClick={handleExportPDF}
            disabled={reports.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaFilePdf className="mr-2" />
            Export PDF
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">Total Collections</th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">Scheduled</th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.length > 0 ? (
                reports.map((report, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-900 font-medium">{report.date}</td>
                    <td className="py-3 px-4 text-center text-gray-900 font-semibold">{report.collections}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {report.scheduledCollections}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => handleDownloadReport(report)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium inline-flex items-center gap-1"
                      >
                        <FaFilePdf className="w-3 h-3" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FaChartBar className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No reports available</p>
                      <p className="text-sm text-gray-400 mt-1">Collection data will appear here when available</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CollectionReports;

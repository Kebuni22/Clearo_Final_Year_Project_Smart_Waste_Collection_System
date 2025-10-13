import React, { useState } from 'react';
import { FaShareAlt, FaUserCircle, FaCalendarAlt, FaDollarSign, FaTag } from 'react-icons/fa';

const getStatusBadge = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'available':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'expired':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'available':
      return '✓';
    case 'expired':
      return '✗';
    case 'pending':
      return '⏳';
    default:
      return '?';
  }
};

const getMonthlyReportData = (items, month, year) => {
  // Support Firebase timestamps (createdAt as string, number, or Timestamp object)
  return items.filter(item => {
    let dateObj;
    if (item.createdAt) {
      if (typeof item.createdAt === 'object' && item.createdAt.seconds) {
        // Firestore Timestamp object
        dateObj = new Date(item.createdAt.seconds * 1000);
      } else if (typeof item.createdAt === 'number') {
        // Milliseconds timestamp
        dateObj = new Date(item.createdAt);
      } else if (typeof item.createdAt === 'string') {
        dateObj = new Date(item.createdAt);
      }
    } else if (item.dateAdded) {
      dateObj = new Date(item.dateAdded);
    }
    if (!dateObj || isNaN(dateObj.getTime())) return false;
    return dateObj.getMonth() === month && dateObj.getFullYear() === year;
  })
  .sort((a, b) => (b.likes || 0) - (a.likes || 0));
};

const getTypeSummary = (items) => {
  // Use 'category' field from Firestore sharedItems collection if available, fallback to 'type'
  const summary = {};
  items.forEach(item => {
    const category = item.category || item.type || 'Unknown';
    summary[category] = (summary[category] || 0) + 1;
  });
  return summary;
};

const printMonthlyReport = (items, month, year) => {
  const reportData = getMonthlyReportData(items, month, year);
  const typeSummary = getTypeSummary(reportData);
  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });

  // Prepare sorted category summary for "most shared" category
  const sortedCategories = Object.entries(typeSummary)
    .sort(([, a], [, b]) => b - a);

  let html = `
    <html>
      <head>
        <title>Shared Items Report - ${monthName} ${year}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; max-width: 1200px; margin: 0 auto; }
          h2 { color: #16a34a; border-bottom: 3px solid #16a34a; padding-bottom: 10px; }
          h3 { margin-top: 32px; color: #166534; }
          .summary-box { background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; }
          .stat { display: inline-block; margin: 0 20px 10px 0; font-size: 18px; }
          .stat strong { color: #16a34a; font-size: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
          th { background: #bbf7d0; color: #166534; font-weight: bold; }
          tr:nth-child(even) { background: #f0fdf4; }
          tr:hover { background: #dcfce7; }
          .nodata { text-align:center; color:#888; font-size:18px; margin-top:40px; padding: 40px; background: #f9fafb; border-radius: 8px; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
          .highlight { background: #bbf7d0; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>🌍 Community Sharing Hub Report</h2>
        <p style="color: #666; font-size: 14px;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <div class="summary-box">
          <h3 style="margin-top: 0;">📊 ${monthName} ${year} Overview</h3>
          <div class="stat"><strong>${reportData.length}</strong> Total Items</div>
          <div class="stat"><strong>${sortedCategories.length}</strong> Categories</div>
          ${
            sortedCategories.length > 0
              ? `<div class="stat"><strong>${sortedCategories[0][0]}</strong> is the most shared category (${sortedCategories[0][1]} items)</div>`
              : ''
          }
        </div>
  `;

  if (reportData.length === 0) {
    html += `<div class="nodata">📭 No shared items found for this month.</div>`;
  } else {
    // Category summary table
    const categoryRows = sortedCategories.map(([category, count], idx) =>
      `<tr${idx === 0 ? ' class="highlight"' : ''}><td>${category}</td><td><strong>${count}</strong></td></tr>`
    ).join('');

    // Items table (show category column)
    const itemsRows = reportData.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${item.title || 'N/A'}</strong></td>
        <td>${item.category || item.type || 'Unknown'}</td>
        <td>${item.owner || 'N/A'}</td>
        <td>${item.price || 'Free'}</td>
        <td>${item.expiration || 'N/A'}</td>
        <td><span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; background: ${
          (item.status || '').toLowerCase() === 'available' ? '#bbf7d0' : 
          (item.status || '').toLowerCase() === 'expired' ? '#fecaca' : '#fef3c7'
        };">${item.status || 'N/A'}</span></td>
      </tr>
    `).join('');

    html += `
      <h3>📦 Category Summary (Most Shared Highlighted)</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Number of Items</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRows}
        </tbody>
      </table>
      <h3>🌟 All Shared Items</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Category</th>
            <th>Owner</th>
            <th>Price</th>
            <th>Expiration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    `;
  }

  html += `
      <div class="footer">
        <p>Clea~Ro Community Sharing Hub | Generated from Dashboard</p>
      </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
};

const SharedItems = ({
  sharedItems,
  sharedItemsLoading,
  filteredSharedItems,
  searchQuery,
  setSearchQuery,
  selectedItem,
  setSelectedItem,
  removeItem
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  // Calculate statistics
  const availableItems = filteredSharedItems.filter(item => (item.status || '').toLowerCase() === 'available').length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-green-700 flex items-center gap-2">
            <FaShareAlt className="text-green-500" /> Community Sharing Hub
          </h2>
          <p className="text-sm text-gray-600 mt-1">Share, discover, and connect with your community</p>
        </div>
        <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-700 font-medium">Live updates</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Total Items</p>
              <p className="text-3xl font-bold text-green-800">{filteredSharedItems.length}</p>
            </div>
            <FaShareAlt className="text-4xl text-green-400 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Available Now</p>
              <p className="text-3xl font-bold text-blue-800">{availableItems}</p>
            </div>
            <div className="text-4xl">✓</div>
          </div>
        </div>
      </div>

      {/* Search and Report Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <input
          type="text"
          placeholder="🔍 Search by title or owner name..."
          className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
        />
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500"
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
          >
            {months.map(m => (
              <option key={m} value={m}>
                {new Date(0, m).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 font-semibold shadow-md hover:shadow-lg transition-all"
            onClick={() => printMonthlyReport(sharedItems, selectedMonth, selectedYear)}
          >
            📄 Print Report
          </button>
        </div>
      </div>

      {/* Items Table */}
      {sharedItemsLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mb-4"></div>
          <p className="text-gray-600">Loading shared items...</p>
        </div>
      ) : filteredSharedItems.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gradient-to-r from-green-100 to-green-50">
                <th className="py-4 px-4 border-b font-semibold text-green-700 text-left">Image</th>
                <th className="py-4 px-4 border-b font-semibold text-green-700 text-left">Title</th>
                <th className="py-4 px-4 border-b font-semibold text-green-700 text-left">Owner</th>
                <th className="py-4 px-4 border-b font-semibold text-green-700 text-left">Price</th>
                <th className="py-4 px-4 border-b font-semibold text-green-700 text-left">Expiration</th>
                <th className="py-4 px-4 border-b font-semibold text-green-700 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSharedItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-green-50 transition-colors cursor-pointer border-b border-gray-100"
                  onClick={() => setSelectedItem(item)}
                >
                  <td className="py-3 px-4">
                    <div className="relative group">
                      <img
                        src={item.imageUrl || 'https://via.placeholder.com/60'}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 group-hover:border-green-400 transition-all shadow-sm"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-gray-800 font-semibold">{item.title || 'N/A'}</p>
                      {item.type && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <FaTag className="text-gray-400" />
                          {item.type}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FaUserCircle className="text-green-400 text-2xl" />
                      <span className="text-gray-700 font-medium">{item.owner || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-gray-700">
                      <FaDollarSign className="text-green-500" />
                      <span className="font-medium">{item.price || 'Free'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-gray-600 text-sm">
                      <FaCalendarAlt className="text-gray-400" />
                      <span>{item.expiration || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(item.status)}`}>
                        <span>{getStatusIcon(item.status)}</span>
                        <span>{item.status || 'N/A'}</span>
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-600 text-lg font-medium">No shared items found</p>
          <p className="text-gray-500 text-sm mt-2">Try adjusting your search criteria</p>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSelectedItem(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 flex flex-col items-center transform transition-all">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
              onClick={() => setSelectedItem(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            
            <div className="w-full">
              <div className="relative inline-block mb-4">
                <img
                  src={selectedItem.imageUrl || 'https://via.placeholder.com/150'}
                  alt={selectedItem.title}
                  className="w-48 h-48 object-cover rounded-xl border-4 border-green-200 shadow-lg mx-auto"
                />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">{selectedItem.title}</h3>
              
              <div className="flex justify-center mb-4">
                <span className={`px-4 py-1 rounded-full text-sm font-semibold border ${getStatusBadge(selectedItem.status)}`}>
                  {getStatusIcon(selectedItem.status)} {selectedItem.status || 'N/A'}
                </span>
              </div>
              
              <p className="text-gray-600 mb-6 text-center leading-relaxed">
                {selectedItem.description || 'No description available.'}
              </p>
              
              <div className="w-full bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <FaUserCircle className="text-green-500 text-2xl" />
                  <div>
                    <p className="text-xs text-gray-500">Owner</p>
                    <p className="text-gray-800 font-semibold">{selectedItem.owner || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <FaDollarSign className="text-green-500 text-2xl" />
                  <div>
                    <p className="text-xs text-gray-500">Price</p>
                    <p className="text-gray-800 font-semibold">{selectedItem.price || 'Free'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <FaCalendarAlt className="text-green-500 text-2xl" />
                  <div>
                    <p className="text-xs text-gray-500">Expiration</p>
                    <p className="text-gray-800 font-semibold">{selectedItem.expiration || 'N/A'}</p>
                  </div>
                </div>
                
                {selectedItem.type && (
                  <div className="flex items-center gap-3">
                    <FaTag className="text-green-500 text-2xl" />
                    <div>
                      <p className="text-xs text-gray-500">Category</p>
                      <p className="text-gray-800 font-semibold">{selectedItem.type}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedItem.status !== 'Available' && (
                <button
                  onClick={() => {
                    removeItem(selectedItem.id);
                    setSelectedItem(null);
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  Remove Item
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedItems;
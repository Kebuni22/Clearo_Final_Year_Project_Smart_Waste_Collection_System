import React, { useState, useEffect } from 'react';
import { FaRecycle, FaLeaf, FaTrophy, FaChartPie, FaSync, FaFilePdf } from 'react-icons/fa';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

const RecyclingProgress = () => {
  const [selectedMetric, setSelectedMetric] = useState('monthly');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [stats, setStats] = useState({
    totalUsersShared: '0',
    totalItems: '0',
    claimedItems: '0',
    availableItems: '0'
  });

  const [wasteTypeProgress, setWasteTypeProgress] = useState([]);
  const [communityLeaders, setCommunityLeaders] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    fetchRecyclingData();
  }, []);

  const fetchRecyclingData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch sharing items - USE CORRECT COLLECTION NAME: 'sharedItems'
      const sharingSnapshot = await getDocs(collection(db, 'sharedItems'));
      const sharingData = sharingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Store filtered data for reports
      setFilteredData(sharingData);

      // Calculate total items shared (representing recycled items)
      const totalItems = sharingData.length;
      
      // Calculate unique users who shared items
      const uniqueUsers = new Set(
        sharingData
          .map(item => item.ownerId || item.userId)
          .filter(id => id && id !== 'Unknown User')
      ).size;

      // Calculate claimed items
      const claimedItems = sharingData.filter(
        item => item.status === 'claimed' || item.status === 'Claimed' || item.status === 'completed'
      ).length;

      // Calculate available items
      const availableItems = sharingData.filter(
        item => item.status === 'available' || item.status === 'Available' || item.status === 'active'
      ).length;

      setStats({
        totalUsersShared: `${uniqueUsers}`,
        totalItems: `${totalItems}`,
        claimedItems: `${claimedItems}`,
        availableItems: `${availableItems}`
      });

      // Calculate waste type progress from sharing categories
      const categoryCounts = {};
      const categoryWeights = {};
      
      sharingData.forEach(item => {
        const category = item.category || 'Other';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        categoryWeights[category] = (categoryWeights[category] || 0) + 0.025; // Avg 25 kg per item
      });

      // Map categories to waste types
      const categoryMapping = {
        'Electronics': { type: 'Electronics', color: 'bg-blue-500' },
        'Furniture': { type: 'Furniture', color: 'bg-green-500' },
        'Books': { type: 'Paper', color: 'bg-cyan-500' },
        'Clothing': { type: 'Textiles', color: 'bg-purple-500' },
        'Kitchen Items': { type: 'Mixed Materials', color: 'bg-yellow-500' },
        'Other': { type: 'Other', color: 'bg-gray-500' }
      };

      const wasteProgress = Object.entries(categoryCounts).map(([category, count]) => {
        const weight = categoryWeights[category];
        const mapping = categoryMapping[category] || { type: category, color: 'bg-gray-500' };
        const percentage = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
        
        return {
          type: mapping.type,
          recycled: weight.toFixed(1),
          total: (weight * 1.3).toFixed(1), // Estimated total potential
          percentage: Math.min(percentage, 100),
          color: mapping.color,
          count: count
        };
      }).sort((a, b) => b.count - a.count);

      setWasteTypeProgress(wasteProgress);

      // Calculate community leaders based on user sharing activity
      const userStats = {};
      
      console.log('📊 Processing', sharingData.length, 'sharing items for leaderboard...');
      
      if (sharingData.length === 0) {
        console.warn('⚠️ No sharing items found in database!');
      }
      
      sharingData.forEach((item, index) => {
        // Get user information using CORRECT field names from your database
        const userName = 
          item.owner ||           // ✅ Your database uses "owner" field
          item.userName || 
          item.user || 
          item.displayName || 
          item.name ||
          'Unknown User';
          
        const userId = 
          item.ownerId ||         // ✅ Your database uses "ownerId" field
          item.userId || 
          item.uid ||
          userName;
        
        // Log first few items for debugging
        if (index < 5) {
          console.log(`📦 Item ${index + 1}:`, {
            id: item.id,
            title: item.title,
            owner: item.owner,
            ownerId: item.ownerId,
            category: item.category,
            status: item.status,
            price: item.price,
            createdAt: item.createdAt
          });
        }
        
        // Initialize user stats if not exists
        if (!userStats[userId]) {
          userStats[userId] = {
            name: userName,
            userId: userId,
            itemsShared: 0,
            itemsClaimed: 0,
            itemsAvailable: 0,
            totalWeight: 0
          };
        }
        
        // Count each item shared by this user
        userStats[userId].itemsShared++;
        userStats[userId].totalWeight += 0.025; // Avg 25 kg per item
        
        // Track status of items - match your database status values
        const status = (item.status || '').toLowerCase();
        if (status === 'claimed' || status === 'completed' || status === 'sold') {
          userStats[userId].itemsClaimed++;
        } else if (status === 'available' || status === 'active') {
          userStats[userId].itemsAvailable++;
        }
      });

      console.log('👥 Total unique users sharing items:', Object.keys(userStats).length);
      console.log('📊 User Statistics:', userStats);

      // Filter and sort leaders - only users who have shared items
      const leaders = Object.values(userStats)
        .filter(user => {
          // Must have shared at least 1 item and not be "Unknown User"
          return user.itemsShared > 0 && user.name !== 'Unknown User';
        })
        .map(user => {
          const successRate = user.itemsShared > 0 
            ? Math.round((user.itemsClaimed / user.itemsShared) * 100) 
            : 0;
          
          return {
            name: user.name,
            userId: user.userId,
            recycled: `${user.totalWeight.toFixed(2)} tons`,
            rate: `${successRate}%`,
            itemsShared: user.itemsShared,
            itemsClaimed: user.itemsClaimed,
            itemsAvailable: user.itemsAvailable
          };
        })
        .sort((a, b) => {
          // Primary sort: most items shared (descending)
          if (b.itemsShared !== a.itemsShared) {
            return b.itemsShared - a.itemsShared;
          }
          // Secondary sort: highest success rate (descending)
          const rateA = parseInt(a.rate);
          const rateB = parseInt(b.rate);
          if (rateB !== rateA) {
            return rateB - rateA;
          }
          // Tertiary sort: most claimed items (descending)
          return b.itemsClaimed - a.itemsClaimed;
        })
        .slice(0, 10) // Get top 10 contributors
        .map((user, index) => ({
          rank: index + 1,
          ...user
        }));

      setCommunityLeaders(leaders);

      // Send thank you notifications to top 10 contributors
      await sendTopContributorNotifications(leaders);

      console.log('🏆 Top Contributors Leaderboard:');
      console.table(leaders.map(l => ({
        Rank: l.rank,
        Name: l.name,
        Shared: l.itemsShared,
        Claimed: l.itemsClaimed,
        Rate: l.rate
      })));

      console.log('✅ Recycling data loaded from sharedItems collection:', {
        totalSharingItems: totalItems,
        totalUsersShared: uniqueUsers,
        claimedItems: claimedItems,
        availableItems: availableItems,
        categories: Object.keys(categoryCounts).length,
        totalUsers: Object.keys(userStats).length,
        topContributors: leaders.length,
        topUser: leaders[0] ? `${leaders[0].name} (${leaders[0].itemsShared} items)` : 'None'
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching recycling data:', err);
      setError('Failed to load recycling data: ' + err.message);
      setLoading(false);
    }
  };

  // Function to send notifications to top contributors
  const sendTopContributorNotifications = async (leaders) => {
    try {
      // Only send to top 10
      const topContributors = leaders.slice(0, 10);
      
      for (const leader of topContributors) {
        // Create a unique notification identifier
        const notificationKey = `${leader.userId}_rank_${leader.rank}`;
        
        // Check if notification already exists using multiple criteria
        const existingNotificationsQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', leader.userId),
          where('achievementType', '==', 'top_contributor')
        );
        
        const existingNotifications = await getDocs(existingNotificationsQuery);
        
        // Check if any existing notification matches this rank
        const alreadyExists = existingNotifications.docs.some(doc => {
          const data = doc.data();
          return data.rank === leader.rank && data.notificationKey === notificationKey;
        });
        
        if (alreadyExists) {
          console.log(`⏭️ Notification already exists for ${leader.name} (Rank #${leader.rank})`);
          continue;
        }

        // Create notification document
        const notificationData = {
          type: 'achievement',
          title: getNotificationTitle(leader.rank, leader.itemsShared),
          message: getNotificationMessage(leader.rank, leader.itemsShared),
          
          // User details
          userId: leader.userId,
          userName: leader.name,
          
          // Achievement details
          achievementType: 'top_contributor',
          rank: leader.rank,
          itemsShared: leader.itemsShared,
          itemsClaimed: leader.itemsClaimed,
          successRate: leader.rate,
          
          // Unique identifier to prevent duplicates
          notificationKey: notificationKey,
          
          // Flags
          isAdminNotification: false,
          isAchievement: true,
          priority: leader.rank <= 3 ? 'high' : 'normal',
          read: false,
          
          // Timestamps - use serverTimestamp for consistency
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
        };

        // Add to Firestore notifications collection
        await addDoc(collection(db, 'notifications'), notificationData);
        
        console.log(`✅ Sent thank you notification to ${leader.name} (Rank #${leader.rank})`);
      }
    } catch (error) {
      console.error('Error sending contributor notifications:', error);
    }
  };

  // Generate notification title based on rank
  const getNotificationTitle = (rank, itemsShared) => {
    switch (rank) {
      case 1:
        return `🥇 Congratulations! You are the #1 Top Contributor!`;
      case 2:
        return `🥈 You are the #2 Top Contributor!`;
      case 3:
        return `🥉 You are the #3 Top Contributor!`;
      default:
        return `🏆 You are in Top ${rank} Contributors!`;
    }
  };

  // Generate notification message based on rank
  const getNotificationMessage = (rank, itemsShared) => {
    const baseMessage = `Thank you for your valuable contribution to waste reduction! You've shared ${itemsShared} item${itemsShared > 1 ? 's' : ''} in the Community Sharing Hub.`;
    
    switch (rank) {
      case 1:
        return `${baseMessage} You are leading the way in creating a sustainable community! Your dedication inspires others. Keep up the amazing work! 👑🌟`;
      case 2:
        return `${baseMessage} You are making a significant impact! Your efforts are helping build a greener future. Thank you for your dedication! 🌟💚`;
      case 3:
        return `${baseMessage} Your contribution is making a real difference! Keep up the excellent work in promoting sustainability! ⭐🌱`;
      default:
        return `${baseMessage} Your efforts are helping reduce waste and promote sustainability in our community. Every item shared makes a difference! 🌱✨`;
    }
  };

  // Generate PDF Report
  const generatePDFReport = () => {
    // Apply date filtering
    let reportData = [...filteredData];
    
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      
      reportData = reportData.filter(item => {
        if (!item.createdAt) return false;
        const itemDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
        return itemDate >= startDate && itemDate <= endDate;
      });
    } else if (selectedMetric === 'monthly') {
      // Current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      reportData = reportData.filter(item => {
        if (!item.createdAt) return false;
        const itemDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
        return itemDate >= startOfMonth && itemDate <= endOfMonth;
      });
    }

    // Calculate statistics for filtered data
    const totalItems = reportData.length;
    const claimedItems = reportData.filter(item => 
      item.status === 'claimed' || item.status === 'Claimed' || item.status === 'completed'
    ).length;
    const availableItems = reportData.filter(item => 
      item.status === 'available' || item.status === 'Available'
    ).length;

    // Category-wise breakdown
    const categoryStats = {};
    reportData.forEach(item => {
      const category = item.category || 'Other';
      if (!categoryStats[category]) {
        categoryStats[category] = {
          total: 0,
          claimed: 0,
          available: 0
        };
      }
      categoryStats[category].total++;
      const status = (item.status || '').toLowerCase();
      if (status === 'claimed' || status === 'completed') {
        categoryStats[category].claimed++;
      } else if (status === 'available') {
        categoryStats[category].available++;
      }
    });

    // Sort categories by total items
    const sortedCategories = Object.entries(categoryStats)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([category, stats]) => ({
        category,
        ...stats,
        percentage: ((stats.total / totalItems) * 100).toFixed(1)
      }));

    // Top sharers in this period
    const userStats = {};
    reportData.forEach(item => {
      const owner = item.owner || 'Unknown';
      const ownerId = item.ownerId || owner;
      if (!userStats[ownerId]) {
        userStats[ownerId] = { name: owner, count: 0 };
      }
      userStats[ownerId].count++;
    });

    const topSharers = Object.values(userStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Generate HTML for PDF
    const printWindow = window.open('', '_blank');
    
    const reportPeriod = dateRange.start && dateRange.end 
      ? `${dateRange.start} to ${dateRange.end}`
      : selectedMetric === 'monthly' 
        ? `${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`
        : 'All Time';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Community Sharing Report - ${reportPeriod}</title>
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
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 15px;
          }
          .summary-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #16a34a;
          }
          .summary-card h3 {
            margin: 0;
            font-size: 32px;
            color: #16a34a;
          }
          .summary-card p {
            margin: 5px 0 0 0;
            color: #666;
            font-size: 14px;
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
          .section {
            margin-top: 40px;
          }
          .section h2 {
            color: #16a34a;
            border-bottom: 2px solid #16a34a;
            padding-bottom: 10px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .highlight {
            background: #fef3c7;
            padding: 2px 8px;
            border-radius: 4px;
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
          <h1>♻️ Community Sharing Report</h1>
          <p>Clearo Sync - Waste Management System</p>
          <p><strong>Report Period:</strong> ${reportPeriod}</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary">
          <h2 style="margin-top: 0;">📊 Overview Statistics</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>${totalItems}</h3>
              <p>Total Items Shared</p>
            </div>
            <div class="summary-card">
              <h3>${claimedItems}</h3>
              <p>Items Claimed</p>
            </div>
            <div class="summary-card">
              <h3>${availableItems}</h3>
              <p>Available Items</p>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>📦 Category-wise Breakdown</h2>
          <p><strong>Most Shared Category:</strong> <span class="highlight">${sortedCategories[0]?.category || 'N/A'} (${sortedCategories[0]?.total || 0} items)</span></p>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Category</th>
                <th>Total Items</th>
                <th>Claimed</th>
                <th>Available</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${sortedCategories.map((cat, index) => `
                <tr>
                  <td><strong>#${index + 1}</strong></td>
                  <td><strong>${cat.category}</strong></td>
                  <td>${cat.total}</td>
                  <td style="color: #16a34a;">${cat.claimed}</td>
                  <td style="color: #f59e0b;">${cat.available}</td>
                  <td>${cat.percentage}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>🏆 Top Contributors</h2>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Items Shared</th>
              </tr>
            </thead>
            <tbody>
              ${topSharers.map((user, index) => `
                <tr>
                  <td><strong>${['🥇', '🥈', '🥉', '#4', '#5'][index]}</strong></td>
                  <td>${user.name}</td>
                  <td><strong>${user.count}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} Clearo Sync - Smart Waste Collection System</p>
          <p>This report is automatically generated and contains detailed sharing statistics.</p>
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

  const updateProgress = () => {
    fetchRecyclingData();
  };

  const metrics = [
    { value: 'daily', label: 'Daily Progress' },
    { value: 'weekly', label: 'Weekly Summary' },
    { value: 'monthly', label: 'Monthly Report' },
    { value: 'yearly', label: 'Yearly Overview' }
  ];

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <div className="flex flex-col items-center justify-center py-12">
          <FaSync className="w-12 h-12 text-green-600 animate-spin mb-4" />
          <span className="text-lg text-gray-600 font-medium">Loading recycling data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-green-700 flex items-center">
          <FaRecycle className="mr-3" />
          Recycling Progress
        </h2>
        <button
          onClick={updateProgress}
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

      {/* Controls */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Report Type</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              {metrics.map(metric => (
                <option key={metric.value} value={metric.value}>{metric.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="mm/dd/yyyy"
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="mm/dd/yyyy"
            />
          </div>
          
          <div className="flex items-end gap-2">
            <button
              onClick={updateProgress}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <FaSync className="mr-2" />
              Refresh
            </button>
            <button
              onClick={generatePDFReport}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
              title="Generate PDF Report"
            >
              <FaFilePdf className="mr-2" />
              PDF Report
            </button>
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Total Users Shared</p>
              <p className="text-xl font-bold text-green-800">{stats.totalUsersShared}</p>
            </div>
            <FaRecycle className="text-green-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Total Items</p>
              <p className="text-xl font-bold text-blue-800">{stats.totalItems}</p>
            </div>
            <FaChartPie className="text-blue-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700">Claimed Items</p>
              <p className="text-xl font-bold text-purple-800">{stats.claimedItems}</p>
            </div>
            <FaLeaf className="text-purple-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Available Now</p>
              <p className="text-xl font-bold text-yellow-800">{stats.availableItems}</p>
            </div>
            <span className="text-yellow-600 text-2xl">🔄</span>
          </div>
        </div>
      </div>

      {/* Waste Type Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <FaRecycle className="mr-2 text-green-600" />
            Recycling Progress by Category
          </h3>
          {wasteTypeProgress.length > 0 ? (
            <div className="space-y-4">
              {wasteTypeProgress.map((waste) => (
                <div key={waste.type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">{waste.type}</span>
                    <span className="text-sm text-gray-600">{waste.recycled}t / {waste.total}t</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${waste.color} transition-all duration-500`}
                      style={{ width: `${waste.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">{waste.count} items</span>
                    <span className="text-sm font-semibold text-gray-800">{waste.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaRecycle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No recycling data available</p>
            </div>
          )}
        </div>

        {/* Community Leaderboard */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
            <FaTrophy className="mr-2 text-yellow-500" />
            Top Contributors (Residents)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            🏆 Ranking based on items shared in the Sharing Hub
          </p>
          {communityLeaders.length > 0 ? (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {communityLeaders.map((leader) => (
                <div 
                  key={leader.rank} 
                  className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 border ${
                    leader.rank <= 3 
                      ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 shadow-md' 
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`text-2xl flex-shrink-0 w-10 text-center ${
                      leader.rank === 1 ? 'animate-bounce' : ''
                    }`}>
                      {getRankIcon(leader.rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate flex items-center gap-2">
                        {leader.name}
                        {leader.rank === 1 && <span className="text-xs">👑</span>}
                      </p>
                      <div className="flex items-center gap-2 text-xs mt-1 flex-wrap">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                          📦 {leader.itemsShared} shared
                        </span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                          ✅ {leader.itemsClaimed} claimed
                        </span>
                        {leader.itemsAvailable > 0 && (
                          <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                            🔄 {leader.itemsAvailable} available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className={`font-bold text-lg ${
                      parseInt(leader.rate) >= 80 ? 'text-green-600' : 
                      parseInt(leader.rate) >= 50 ? 'text-yellow-600' : 
                      'text-gray-600'
                    }`}>
                      {leader.rate}
                    </p>
                    <p className="text-xs text-gray-500">success rate</p>
                    <p className="text-xs text-gray-400 mt-1 font-medium">{leader.recycled}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaTrophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No contributors yet</p>
              <p className="text-sm text-gray-400 mt-1">🎯 Share items in the Sharing Hub to appear here!</p>
              <p className="text-xs text-gray-400 mt-2">The more you share, the higher you rank! 🚀</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecyclingProgress;

import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaCalendarAlt, FaSave, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

const WeeklyReport = ({ onBack, initialWeek }) => {
  const [selectedWeek, setSelectedWeek] = useState(initialWeek || new Date());
  const [weeklyReportData, setWeeklyReportData] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [roads, setRoads] = useState([]);
  const [roadCategories, setRoadCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (schedules.length > 0 && roads.length > 0) {
      generateWeeklyReport();
    }
  }, [selectedWeek, schedules, roads, roadCategories]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesSnap, roadsSnap, categoriesSnap] = await Promise.all([
        getDocs(collection(db, 'schedules')),
        getDocs(collection(db, 'roads')),
        getDocs(collection(db, 'roadCategories'))
      ]);

      setSchedules(schedulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setRoads(roadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setRoadCategories(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekRange = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day;
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  };

  const formatDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const generateWeeklyReport = () => {
    const { start, end } = getWeekRange(selectedWeek);
    const weekSchedules = schedules.filter(schedule => {
      const schedDate = new Date(schedule.date);
      return schedDate >= start && schedDate <= end;
    });

    const dailyData = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
      dailyData[dateStr] = {
        date: new Date(d),
        schedules: weekSchedules.filter(s => s.date === dateStr),
        dayName: d.toLocaleDateString('en-US', { weekday: 'long' })
      };
    }

    const wasteTypeStats = {};
    const roadStats = {};
    const categoryStats = {};
    let completedRoutes = 0;
    let totalRoutes = weekSchedules.length;

    weekSchedules.forEach(schedule => {
      wasteTypeStats[schedule.wasteType] = (wasteTypeStats[schedule.wasteType] || 0) + 1;
      
      const road = roads.find(r => r.id === schedule.roadId);
      if (road) {
        roadStats[road.name] = (roadStats[road.name] || 0) + 1;
        
        const category = road.categoryId ? 
          (roadCategories.find(c => c.id === road.categoryId)?.name || 'Uncategorized') : 
          'Uncategorized';
        categoryStats[category] = (categoryStats[category] || 0) + 1;
      }
      
      const schedDate = new Date(schedule.date);
      if (schedDate < new Date()) {
        completedRoutes++;
      }
    });

    setWeeklyReportData({
      period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      dailyData,
      statistics: {
        totalRoutes,
        completedRoutes,
        pendingRoutes: totalRoutes - completedRoutes,
        completionRate: totalRoutes > 0 ? Math.round((completedRoutes / totalRoutes) * 100) : 0,
        wasteTypeStats,
        roadStats,
        categoryStats,
        activeDays: Object.values(dailyData).filter(day => day.schedules.length > 0).length
      }
    });
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setSelectedWeek(newDate);
  };

  const downloadPDF = () => {
    if (!weeklyReportData) return;

    const htmlContent = `
      <html>
        <head>
          <title>Weekly Collection Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
            .header h1 { color: #007bff; margin-bottom: 10px; }
            .stats { 
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin: 30px 0;
              padding: 20px;
              background-color: #f8f9fa;
              border-radius: 8px;
            }
            .stat-item { 
              text-align: center;
              padding: 15px;
              background: white;
              border-radius: 6px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .stat-number {
              font-size: 24px;
              font-weight: bold;
              color: #007bff;
            }
            .stat-label {
              font-size: 12px;
              color: #666;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 30px;
              background: white;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f8f9fa; 
              font-weight: bold;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Weekly Collection Report</h1>
            <h3>${weeklyReportData.period}</h3>
          </div>
          
          <div class="stats">
            <div class="stat-item">
              <div class="stat-number">${weeklyReportData.statistics.totalRoutes}</div>
              <div class="stat-label">Total Routes</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${weeklyReportData.statistics.completedRoutes}</div>
              <div class="stat-label">Completed</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${weeklyReportData.statistics.pendingRoutes}</div>
              <div class="stat-label">Pending</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${weeklyReportData.statistics.completionRate}%</div>
              <div class="stat-label">Completion Rate</div>
            </div>
          </div>

          <h3>Waste Type Distribution</h3>
          <table>
            <thead>
              <tr>
                <th>Waste Type</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(weeklyReportData.statistics.wasteTypeStats).map(([type, count]) => {
                const percentage = Math.round((count / weeklyReportData.statistics.totalRoutes) * 100);
                return `
                  <tr>
                    <td>${type}</td>
                    <td>${count}</td>
                    <td>${percentage}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <h3>Road Performance</h3>
          <table>
            <thead>
              <tr>
                <th>Road Name</th>
                <th>Collections</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(weeklyReportData.statistics.roadStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([road, count]) => `
                  <tr>
                    <td>${road}</td>
                    <td>${count}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 50px; padding: 20px; background: #f8f9fa; border-radius: 6px; text-align: center; font-size: 12px; color: #666;">
            <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
            <p>Clearo Sync - Weekly Collection Report</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => printWindow.close(), 1000);
        }, 500);
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Back to Schedules"
              >
                <FaArrowLeft className="text-xl" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Weekly Collection Report</h1>
                <p className="text-blue-100 text-sm mt-1">
                  {weeklyReportData?.period || 'Loading...'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateWeek(-1)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Previous Week"
              >
                <FaChevronLeft />
              </button>
              <span className="text-sm px-3 py-1 bg-white/20 rounded-lg">
                {selectedWeek.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              <button
                onClick={() => navigateWeek(1)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Next Week"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {weeklyReportData ? (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Routes</p>
                      <p className="text-3xl font-bold text-blue-600">{weeklyReportData.statistics.totalRoutes}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <FaCalendarAlt className="text-blue-600 text-xl" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Completed</p>
                      <p className="text-3xl font-bold text-green-600">{weeklyReportData.statistics.completedRoutes}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-xl">✓</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-yellow-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pending</p>
                      <p className="text-3xl font-bold text-yellow-600">{weeklyReportData.statistics.pendingRoutes}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 text-xl">⏱</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                      <p className="text-3xl font-bold text-purple-600">{weeklyReportData.statistics.completionRate}%</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-xl">📊</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Overview */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Daily Overview</h3>
                <div className="grid grid-cols-7 gap-2">
                  {Object.entries(weeklyReportData.dailyData).map(([date, data]) => (
                    <div
                      key={date}
                      className={`p-4 rounded-lg border text-center transition-all hover:shadow-md ${
                        data.schedules.length > 0
                          ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-sm text-gray-800">{data.dayName}</div>
                      <div className="text-xs text-gray-600 mt-1">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      <div className={`text-2xl font-bold mt-2 ${data.schedules.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {data.schedules.length}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">routes</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Waste Type Distribution */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Waste Type Distribution</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Waste Type</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Collections</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(weeklyReportData.statistics.wasteTypeStats)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => {
                          const percentage = Math.round((count / weeklyReportData.statistics.totalRoutes) * 100);
                          return (
                            <tr key={type} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-sm text-gray-800">{type}</td>
                              <td className="py-3 px-4 text-sm text-gray-800 text-right font-medium">{count}</td>
                              <td className="py-3 px-4 text-sm text-right">
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                                  {percentage}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Road Performance */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Top 10 Road Performance</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Road Name</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Collections</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(weeklyReportData.statistics.roadStats)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10)
                        .map(([road, count], index) => (
                          <tr key={road} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 text-sm text-gray-600">#{index + 1}</td>
                            <td className="py-3 px-4 text-sm text-gray-800 font-medium">{road}</td>
                            <td className="py-3 px-4 text-sm text-gray-800 text-right">
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                                {count}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No data available for this week</p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 shadow-lg z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Generated: {new Date().toLocaleString()}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={downloadPDF}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
              >
                <FaSave />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReport;

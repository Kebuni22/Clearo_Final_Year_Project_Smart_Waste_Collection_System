import React, { useState } from 'react';
import { FaRecycle, FaLeaf, FaTrophy, FaChartPie } from 'react-icons/fa';

const RecyclingProgress = ({
  recyclingData = {},
  progressLoading = false,
  dateRange,
  setDateRange,
  updateProgress
}) => {
  const [selectedMetric, setSelectedMetric] = useState('monthly');

  const metrics = [
    { value: 'daily', label: 'Daily Progress' },
    { value: 'weekly', label: 'Weekly Summary' },
    { value: 'monthly', label: 'Monthly Report' },
    { value: 'yearly', label: 'Yearly Overview' }
  ];

  const mockData = {
    totalRecycled: '145.8 tons',
    recyclingRate: '78%',
    carbonSaved: '23.4 tons CO₂',
    treesEquivalent: '312 trees',
    energySaved: '4,250 kWh',
    waterSaved: '18,900 liters'
  };

  const wasteTypeProgress = [
    { type: 'Plastic', recycled: 45.2, total: 60.0, percentage: 75, color: 'bg-blue-500' },
    { type: 'Paper', recycled: 38.7, total: 42.0, percentage: 92, color: 'bg-green-500' },
    { type: 'Glass', recycled: 28.3, total: 35.0, percentage: 81, color: 'bg-cyan-500' },
    { type: 'Metal', recycled: 15.8, total: 18.0, percentage: 88, color: 'bg-gray-500' },
    { type: 'Organic', recycled: 17.8, total: 25.0, percentage: 71, color: 'bg-yellow-500' }
  ];

  const communityLeaders = [
    { rank: 1, name: 'Green Valley Apartments', recycled: '12.4 tons', rate: '95%' },
    { rank: 2, name: 'Eco Heights Complex', recycled: '10.8 tons', rate: '92%' },
    { rank: 3, name: 'Sustainable Gardens', recycled: '9.2 tons', rate: '89%' },
    { rank: 4, name: 'Pine Ridge Community', recycled: '8.7 tons', rate: '85%' },
    { rank: 5, name: 'Maple Street Residents', recycled: '7.9 tons', rate: '82%' }
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <h2 className="text-2xl font-bold text-green-700 mb-6 flex items-center">
        <FaRecycle className="mr-3" />
        Recycling Progress
      </h2>

      {/* Controls */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Progress Metric</label>
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
              value={dateRange?.start || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange?.end || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => updateProgress(selectedMetric, dateRange)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <FaChartPie className="mr-2" />
              Update
            </button>
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Total Recycled</p>
              <p className="text-xl font-bold text-green-800">{mockData.totalRecycled}</p>
            </div>
            <FaRecycle className="text-green-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Recycling Rate</p>
              <p className="text-xl font-bold text-blue-800">{mockData.recyclingRate}</p>
            </div>
            <FaChartPie className="text-blue-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700">Carbon Saved</p>
              <p className="text-lg font-bold text-purple-800">{mockData.carbonSaved}</p>
            </div>
            <FaLeaf className="text-purple-600 text-2xl" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Trees Equivalent</p>
              <p className="text-lg font-bold text-yellow-800">{mockData.treesEquivalent}</p>
            </div>
            <span className="text-yellow-600 text-2xl">🌳</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-100 to-red-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Energy Saved</p>
              <p className="text-lg font-bold text-red-800">{mockData.energySaved}</p>
            </div>
            <span className="text-red-600 text-2xl">⚡</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-700">Water Saved</p>
              <p className="text-lg font-bold text-indigo-800">{mockData.waterSaved}</p>
            </div>
            <span className="text-indigo-600 text-2xl">💧</span>
          </div>
        </div>
      </div>

      {/* Waste Type Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <FaRecycle className="mr-2 text-green-600" />
            Recycling Progress by Waste Type
          </h3>
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
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-800">{waste.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community Leaderboard */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <FaTrophy className="mr-2 text-yellow-500" />
            Community Leaderboard
          </h3>
          <div className="space-y-3">
            {communityLeaders.map((leader) => (
              <div key={leader.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {getRankIcon(leader.rank)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{leader.name}</p>
                    <p className="text-sm text-gray-600">{leader.recycled} recycled</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{leader.rate}</p>
                  <p className="text-xs text-gray-500">success rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecyclingProgress;

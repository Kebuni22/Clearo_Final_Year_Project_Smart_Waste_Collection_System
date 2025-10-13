import React, { useState } from 'react';
import { FaBell, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const AwarenessZone = () => {
  const [selectedCategory, setSelectedCategory] = useState('health');

  const categories = [
    { id: 'health', name: 'Health Issues', icon: '🏥', color: 'bg-red-100 text-red-800' },
    { id: 'campaigns', name: 'Campaigns', icon: '📢', color: 'bg-blue-100 text-blue-800' },
    { id: 'alerts', name: 'Alerts', icon: '⚠️', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'awareness', name: 'Public Awareness', icon: '💡', color: 'bg-green-100 text-green-800' },
    { id: 'children', name: 'Children Zone', icon: '👶', color: 'bg-purple-100 text-purple-800' },
  ];

  const mockContent = {
    health: [
      { id: 1, title: 'Dengue Prevention', content: 'Tips to prevent dengue fever during monsoon season', urgent: true },
      { id: 2, title: 'Water Quality Alert', content: 'Boil water before drinking in affected areas', urgent: false },
    ],
    campaigns: [
      { id: 1, title: 'Clean City Drive', content: 'Join us for the monthly city cleaning campaign', urgent: false },
      { id: 2, title: 'Vaccination Camp', content: 'Free vaccination available at community center', urgent: true },
    ],
    alerts: [
      { id: 1, title: 'Road Closure', content: 'Main street closed for maintenance work', urgent: true },
      { id: 2, title: 'Power Outage', content: 'Scheduled power cut in residential areas', urgent: false },
    ],
    awareness: [
      { id: 1, title: 'Waste Segregation', content: 'Learn proper waste segregation techniques', urgent: false },
      { id: 2, title: 'Recycling Benefits', content: 'Environmental benefits of recycling', urgent: false },
    ],
    children: [
      { id: 1, title: 'Safety Tips', content: 'Road safety tips for children', urgent: false },
      { id: 2, title: 'Health Education', content: 'Basic hygiene practices for kids', urgent: false },
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <h2 className="text-2xl font-bold text-green-700 mb-6 flex items-center">
        <FaBell className="mr-3" />
        Community Awareness Zone
      </h2>

      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-green-600 mb-2">Information Hub</h3>
        <p className="text-gray-600">Share important health information, campaigns, and community awareness content.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              selectedCategory === category.id
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800">
          {categories.find(c => c.id === selectedCategory)?.name} Content
        </h3>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center">
          <FaPlus className="mr-2" />
          Add New
        </button>
      </div>

      <div className="space-y-4">
        {mockContent[selectedCategory]?.map((item) => (
          <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-semibold text-gray-800">{item.title}</h4>
                  {item.urgent && (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{item.content}</p>
              </div>
              <div className="flex space-x-2 ml-4">
                <button className="text-blue-600 hover:text-blue-800 p-1">
                  <FaEdit />
                </button>
                <button className="text-red-600 hover:text-red-800 p-1">
                  <FaTrash />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mockContent[selectedCategory]?.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No content available for this category.</p>
        </div>
      )}
    </div>
  );
};

export default AwarenessZone;

import React, { useState } from 'react';
import { FaRecycle, FaLeaf, FaLightbulb, FaMapMarkedAlt } from 'react-icons/fa';

const RecyclingInfo = () => {
  const [activeTab, setActiveTab] = useState('categories');

  const tabs = [
    { id: 'categories', name: 'Categories', icon: <FaRecycle /> },
    { id: 'tips', name: 'Tips & Guidelines', icon: <FaLightbulb /> },
    { id: 'benefits', name: 'Benefits', icon: <FaLeaf /> },
    { id: 'centers', name: 'Recycling Centers', icon: <FaMapMarkedAlt /> },
  ];

  const recyclingCategories = [
    {
      name: 'Plastic',
      items: ['Bottles', 'Containers', 'Bags'],
      color: 'bg-blue-100 border-blue-300',
      tips: 'Clean containers before recycling'
    },
    {
      name: 'Paper',
      items: ['Newspapers', 'Magazines', 'Cardboard'],
      color: 'bg-green-100 border-green-300',
      tips: 'Keep paper dry and clean'
    },
    {
      name: 'Glass',
      items: ['Bottles', 'Jars', 'Containers'],
      color: 'bg-cyan-100 border-cyan-300',
      tips: 'Remove caps and lids'
    },
    {
      name: 'Metal',
      items: ['Cans', 'Foil', 'Wire'],
      color: 'bg-gray-100 border-gray-300',
      tips: 'Rinse food cans clean'
    },
  ];

  const recyclingTips = [
    'Clean all containers before recycling',
    'Remove caps and lids from bottles',
    'Separate different materials',
    'Check local recycling guidelines',
    'Avoid contamination with food waste',
  ];

  const benefits = [
    { title: 'Environmental Protection', desc: 'Reduces pollution and conserves natural resources' },
    { title: 'Energy Conservation', desc: 'Uses less energy than producing new materials' },
    { title: 'Economic Benefits', desc: 'Creates jobs and saves money' },
    { title: 'Waste Reduction', desc: 'Reduces the amount of waste sent to landfills' },
  ];

  const recyclingCenters = [
    { name: 'Green Valley Recycling', address: '123 Main St', hours: '9 AM - 5 PM', materials: 'All materials' },
    { name: 'EcoCenter Downtown', address: '456 Oak Ave', hours: '8 AM - 6 PM', materials: 'Plastic, Paper, Glass' },
    { name: 'City Recycling Hub', address: '789 Pine Rd', hours: '7 AM - 7 PM', materials: 'Electronics, Metal' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'categories':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recyclingCategories.map((category, index) => (
              <div key={index} className={`p-6 rounded-lg border-2 ${category.color}`}>
                <h3 className="text-xl font-bold mb-3">{category.name}</h3>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Items:</h4>
                  <ul className="list-disc list-inside text-gray-600">
                    {category.items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-3 rounded border">
                  <strong>Tip:</strong> {category.tips}
                </div>
              </div>
            ))}
          </div>
        );

      case 'tips':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Recycling Tips & Guidelines</h3>
            {recyclingTips.map((tip, index) => (
              <div key={index} className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-start space-x-3">
                  <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <p className="text-gray-700">{tip}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'benefits':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                <h3 className="text-lg font-bold text-green-800 mb-3">{benefit.title}</h3>
                <p className="text-gray-700">{benefit.desc}</p>
              </div>
            ))}
          </div>
        );

      case 'centers':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Nearby Recycling Centers</h3>
            {recyclingCenters.map((center, index) => (
              <div key={index} className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h4 className="text-lg font-bold text-blue-800 mb-2">{center.name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-700">
                  <div>
                    <strong>Address:</strong><br />
                    {center.address}
                  </div>
                  <div>
                    <strong>Hours:</strong><br />
                    {center.hours}
                  </div>
                  <div>
                    <strong>Accepts:</strong><br />
                    {center.materials}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <h2 className="text-2xl font-bold text-green-700 mb-6 flex items-center">
        <FaRecycle className="mr-3" />
        Recycling Information
      </h2>

      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-green-600 mb-2">Recycling Guide</h3>
        <p className="text-gray-600">Learn about recycling categories, best practices, and find nearby recycling centers.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default RecyclingInfo;

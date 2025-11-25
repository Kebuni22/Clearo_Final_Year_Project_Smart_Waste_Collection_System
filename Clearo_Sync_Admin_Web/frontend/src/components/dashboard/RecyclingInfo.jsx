import React, { useState } from 'react';
import { FaRecycle, FaLeaf, FaLightbulb, FaMapMarkedAlt } from 'react-icons/fa';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const RecyclingInfo = () => {
  const [activeTab, setActiveTab] = useState('categories');
  const [selectedCenter, setSelectedCenter] = useState(null);

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
    { 
      name: 'Colombo Municipal Council - Central Recycling Center', 
      address: 'Dam Street, Colombo 12', 
      hours: '8 AM - 4 PM (Mon-Sat)', 
      materials: 'Paper, Plastic, Glass, Metal',
      lat: 6.9334,
      lng: 79.8538,
      phone: '+94 11 2 691261'
    },
    { 
      name: 'Kaduwela Waste Management Center', 
      address: 'Malabe Road, Kaduwela', 
      hours: '7 AM - 5 PM (Daily)', 
      materials: 'E-waste, Plastic, Metal, Glass',
      lat: 6.9330,
      lng: 79.9840,
      phone: '+94 11 2 545454'
    },
    { 
      name: 'Keells Super - Recycling Point', 
      address: 'Union Place, Colombo 02', 
      hours: '9 AM - 9 PM (Daily)', 
      materials: 'Plastic bottles, Shopping bags',
      lat: 6.9147,
      lng: 79.8612,
      phone: '+94 11 2 306306'
    },
    { 
      name: 'Selyn - Eco-Friendly Collection Point', 
      address: '34 Ward Place, Colombo 07', 
      hours: '9 AM - 5 PM (Mon-Sat)', 
      materials: 'Textiles, Paper, Cardboard',
      lat: 6.9099,
      lng: 79.8746,
      phone: '+94 11 2 682821'
    },
    { 
      name: 'Karadiyana Waste Management Plant', 
      address: 'Karadiyana, Dehiwala', 
      hours: '6 AM - 6 PM (Mon-Fri)', 
      materials: 'All recyclable waste',
      lat: 6.8385,
      lng: 79.8837,
      phone: '+94 11 2 713838'
    },
    { 
      name: 'Orion City - Green Point', 
      address: 'Rajagiriya', 
      hours: '10 AM - 8 PM (Daily)', 
      materials: 'Paper, Plastic, Glass',
      lat: 6.9147,
      lng: 79.9020,
      phone: '+94 11 4 385000'
    },
    { 
      name: 'Battaramulla Pradeshiya Sabha Recycling Center', 
      address: 'Battaramulla', 
      hours: '8 AM - 4 PM (Mon-Sat)', 
      materials: 'Metal, E-waste, Batteries',
      lat: 6.8988,
      lng: 79.9192,
      phone: '+94 11 2 887766'
    },
    { 
      name: 'Nuge Sea Beach Hotel - Waste Collection', 
      address: 'Mount Lavinia', 
      hours: '7 AM - 3 PM (Mon-Sat)', 
      materials: 'Organic waste, Glass, Plastic',
      lat: 6.8318,
      lng: 79.8636,
      phone: '+94 11 2 738129'
    }
  ];

  const mapContainerStyle = {
    width: '100%',
    height: '500px',
    borderRadius: '8px'
  };

  const center = {
    lat: 6.9147,
    lng: 79.8910
  };

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
          <div className="space-y-6">
            <h3 className="text-xl font-bold mb-4">Recycling Centers in Colombo</h3>
            
            {/* Google Map */}
            <div className="bg-white rounded-lg border border-gray-300 overflow-hidden shadow-md">
              <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE'}>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={center}
                  zoom={11}
                >
                  {recyclingCenters.map((center, index) => (
                    <Marker
                      key={index}
                      position={{ lat: center.lat, lng: center.lng }}
                      onClick={() => setSelectedCenter(center)}
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                      }}
                      label={{
                        text: String(index + 1),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  ))}
                  
                  {selectedCenter && (
                    <InfoWindow
                      position={{ lat: selectedCenter.lat, lng: selectedCenter.lng }}
                      onCloseClick={() => setSelectedCenter(null)}
                    >
                      <div className="p-2 max-w-xs">
                        <h4 className="font-bold text-green-800 mb-2">{selectedCenter.name}</h4>
                        <p className="text-sm text-gray-700 mb-1">
                          <strong>📍</strong> {selectedCenter.address}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>🕒</strong> {selectedCenter.hours}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>♻️</strong> {selectedCenter.materials}
                        </p>
                        {selectedCenter.phone && (
                          <p className="text-sm text-blue-600">
                            <strong>📞</strong> {selectedCenter.phone}
                          </p>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              </LoadScript>
            </div>

            {/* List of Centers */}
            <div className="space-y-4 mt-6">
              {recyclingCenters.map((center, index) => (
                <div 
                  key={index} 
                  className="bg-blue-50 p-6 rounded-lg border border-blue-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedCenter(center)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-blue-800 mb-2">{center.name}</h4>
                        <div className="space-y-2 text-gray-700 text-sm">
                          <p>
                            <strong>📍 Address:</strong> {center.address}
                          </p>
                          <p>
                            <strong>🕒 Hours:</strong> {center.hours}
                          </p>
                          <p>
                            <strong>♻️ Accepts:</strong> {center.materials}
                          </p>
                          {center.phone && (
                            <p>
                              <strong>📞 Contact:</strong> {center.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <button 
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`, '_blank');
                      }}
                    >
                      Get Directions
                    </button>
                  </div>
                </div>
              ))}
            </div>
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

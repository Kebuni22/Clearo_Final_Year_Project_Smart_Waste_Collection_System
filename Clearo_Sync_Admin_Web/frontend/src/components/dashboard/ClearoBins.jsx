import React, { useState, useEffect, useRef } from 'react';
import { FaTrash, FaPlus, FaTimes, FaQrcode, FaMapMarkerAlt, FaEdit, FaTrashAlt, FaCheck, FaDownload, FaPrint, FaSatelliteDish } from 'react-icons/fa';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import QRCode from 'qrcode';

export default function ClearoBins() {
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingBin, setEditingBin] = useState(null);
  const [formData, setFormData] = useState({
    bin_id: '',
    location: '',
    latitude: '',
    longitude: '',
    bin_height_cm: '30',
    waste_type: 'General',
    device_type: 'ESP32_ULTRASONIC',
    firmware_version: 'v3.0_ULTRA_ACCURATE',
    power_source: 'EXTERNAL_BATTERY_PACK'
  });
  const [selectedWasteType, setSelectedWasteType] = useState('All');
  const [hasGPS, setHasGPS] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [generatedQRCode, setGeneratedQRCode] = useState('');
  const [registeredBinData, setRegisteredBinData] = useState(null);
  const qrCodeRef = useRef(null);

  const wasteTypes = ['General', 'Recyclable', 'Organic', 'Hazardous'];

  useEffect(() => {
    fetchBins();
  }, []);

  const fetchBins = async () => {
    try {
      setLoading(true);
      const binsSnapshot = await getDocs(collection(db, 'smart_bins'));
      const binsData = binsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBins(binsData);
    } catch (error) {
      console.error('Error fetching bins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const binData = {
        bin_id: formData.bin_id,
        location: formData.location,
        latitude: hasGPS ? Number(formData.latitude) : 0,
        longitude: hasGPS ? Number(formData.longitude) : 0,
        bin_height_cm: Number(formData.bin_height_cm) || 30,
        waste_type: formData.waste_type,
        device_type: formData.device_type,
        firmware_version: formData.firmware_version,
        power_source: formData.power_source,
        has_gps: hasGPS,
        qr_code_generated: !hasGPS,
        location_set_by_resident: false,
        // Initial values
        fill_percentage: 0,
        distance_cm: 0,
        waste_height_cm: 0,
        bin_status: 'EMPTY',
        fill_level: 'EMPTY',
        connection_status: 'OFFLINE',
        is_online: false,
        sensor_working: true,
        wifi_connected: false,
        is_critical: false,
        is_full: false,
        needs_emptying: false,
        data_count: 0,
        error_count: 0,
        timestamp: new Date(),
        last_updated: new Date(),
        registered_at: new Date(),
        registered_by: 'admin'
      };

      let docRef;
      if (editingBin) {
        // Update existing bin
        await updateDoc(doc(db, 'smart_bins', editingBin.id), binData);
        console.log('✅ Bin updated successfully');
        alert('Bin updated successfully!');
      } else {
        // Add new bin
        docRef = await addDoc(collection(db, 'smart_bins'), binData);
        console.log('✅ New bin registered successfully');
        
        // If no GPS, generate QR code
        if (!hasGPS) {
          const qrData = {
            bin_id: formData.bin_id,
            doc_id: docRef.id,
            type: 'bin_location_setup',
            action: 'scan_to_set_location',
            timestamp: new Date().toISOString()
          };
          
          const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
            width: 400,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          setGeneratedQRCode(qrCodeDataURL);
          setRegisteredBinData({ ...binData, id: docRef.id });
          setShowQRModal(true);
        } else {
          alert('Bin registered successfully with GPS coordinates!');
        }
      }

      // Reset form and close modal
      setFormData({
        bin_id: '',
        location: '',
        latitude: '',
        longitude: '',
        bin_height_cm: '30',
        waste_type: 'General',
        device_type: 'ESP32_ULTRASONIC',
        firmware_version: 'v3.0_ULTRA_ACCURATE',
        power_source: 'EXTERNAL_BATTERY_PACK'
      });
      setShowRegisterModal(false);
      setEditingBin(null);
      setHasGPS(true);
      fetchBins();
    } catch (error) {
      console.error('Error registering/updating bin:', error);
      alert('Failed to save bin. Please try again.');
    }
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = generatedQRCode;
    link.download = `${registeredBinData.bin_id}_QR_Code.png`;
    link.click();
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${registeredBinData.bin_id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
              margin: 0;
            }
            .container {
              text-align: center;
              border: 2px solid #10B981;
              padding: 30px;
              border-radius: 15px;
              max-width: 500px;
            }
            h1 {
              color: #10B981;
              margin-bottom: 10px;
            }
            h2 {
              color: #333;
              margin-bottom: 20px;
            }
            img {
              width: 300px;
              height: 300px;
              margin: 20px 0;
              border: 2px solid #E5E7EB;
              border-radius: 10px;
              padding: 10px;
            }
            .info {
              background: #F3F4F6;
              padding: 15px;
              border-radius: 10px;
              margin-top: 20px;
            }
            .info p {
              margin: 5px 0;
              color: #4B5563;
            }
            .instructions {
              margin-top: 20px;
              text-align: left;
              background: #FEF3C7;
              padding: 15px;
              border-radius: 10px;
              border-left: 4px solid #F59E0B;
            }
            .instructions h3 {
              color: #92400E;
              margin-top: 0;
            }
            .instructions ol {
              color: #78350F;
              margin: 10px 0;
            }
            @media print {
              body { margin: 0; }
              .container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🗑️ Clea~Ro Smart Bin</h1>
            <h2>Location Setup QR Code</h2>
            <img src="${generatedQRCode}" alt="QR Code" />
            <div class="info">
              <p><strong>Bin ID:</strong> ${registeredBinData.bin_id}</p>
              <p><strong>Location:</strong> ${registeredBinData.location}</p>
              <p><strong>Waste Type:</strong> ${registeredBinData.waste_type}</p>
              <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            <div class="instructions">
              <h3>📱 Instructions for Residents:</h3>
              <ol>
                <li>Open the Clea~Ro mobile app</li>
                <li>Tap on "Scan QR Code"</li>
                <li>Scan this QR code</li>
                <li>Allow location access when prompted</li>
                <li>Your bin location will be automatically saved</li>
              </ol>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleGenerateQRForExistingBin = async (bin) => {
    try {
      const qrData = {
        bin_id: bin.bin_id,
        doc_id: bin.id,
        type: 'bin_location_setup',
        action: 'scan_to_set_location',
        timestamp: new Date().toISOString()
      };
      
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setGeneratedQRCode(qrCodeDataURL);
      setRegisteredBinData(bin);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    }
  };

  // Filter bins by waste type
  const filteredBins = selectedWasteType === 'All' 
    ? bins 
    : bins.filter(bin => bin.waste_type === selectedWasteType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FaTrash className="text-2xl text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Clea~Ro Smart Bins</h1>
              <p className="text-gray-600">Manage and register smart waste bins</p>
            </div>
          </div>
          
          <button
            onClick={() => {
              setEditingBin(null);
              setFormData({
                bin_id: '',
                location: '',
                latitude: '',
                longitude: '',
                bin_height_cm: '30',
                waste_type: 'General',
                device_type: 'ESP32_ULTRASONIC',
                firmware_version: 'v3.0_ULTRA_ACCURATE',
                power_source: 'EXTERNAL_BATTERY_PACK'
              });
              setShowRegisterModal(true);
            }}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
          >
            <FaPlus />
            <span>Register New Bin</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Total Bins</p>
            <p className="text-2xl font-bold text-blue-700">{bins.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Online</p>
            <p className="text-2xl font-bold text-green-700">
              {bins.filter(b => b.is_online).length}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">Critical</p>
            <p className="text-2xl font-bold text-red-700">
              {bins.filter(b => b.is_critical).length}
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-600 font-medium">Needs Emptying</p>
            <p className="text-2xl font-bold text-orange-700">
              {bins.filter(b => b.needs_emptying).length}
            </p>
          </div>
        </div>
      </div>

      {/* Bins Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Registered Bins</h2>
          
          {/* Waste Type Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter by Waste Type:</label>
            <select
              value={selectedWasteType}
              onChange={(e) => setSelectedWasteType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="All">All Types</option>
              {wasteTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
          </div>
        ) : filteredBins.length === 0 ? (
          <div className="text-center py-12">
            <FaTrash className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              {selectedWasteType === 'All' 
                ? 'No bins registered yet' 
                : `No ${selectedWasteType} bins found`}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {selectedWasteType === 'All' 
                ? 'Click "Register New Bin" to add your first bin'
                : 'Try selecting a different waste type or register a new bin'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Bin ID</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">GPS Status</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">Waste Type</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">Fill Level</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBins.map((bin) => (
                  <tr key={bin.id} className="hover:bg-gray-50 transition-colors">
                    {/* Bin ID */}
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <FaQrcode className="text-blue-500" />
                        <span className="font-semibold text-gray-800">{bin.bin_id}</span>
                      </div>
                    </td>
                    
                    {/* Location */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <FaMapMarkerAlt className="text-red-500" />
                          <span className="text-gray-700">{bin.location}</span>
                        </div>
                        {bin.has_gps === false && !bin.location_set_by_resident && (
                          <span className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                            ⚠️ Location not set by resident
                          </span>
                        )}
                        {bin.has_gps === false && bin.location_set_by_resident && (
                          <span className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            ✓ Location set by resident
                          </span>
                        )}
                      </div>
                    </td>

                    {/* GPS Status */}
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        bin.has_gps 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {bin.has_gps ? (
                          <span className="flex items-center justify-center gap-1">
                            <FaSatelliteDish className="text-xs" />
                            GPS Enabled
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            <FaQrcode className="text-xs" />
                            QR Setup
                          </span>
                        )}
                      </span>
                    </td>
                    
                    {/* Waste Type */}
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        bin.waste_type === 'Recyclable' ? 'bg-blue-100 text-blue-700' :
                        bin.waste_type === 'Organic' ? 'bg-green-100 text-green-700' :
                        bin.waste_type === 'Hazardous' ? 'bg-red-100 text-red-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {bin.waste_type}
                      </span>
                    </td>
                    
                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        bin.is_online 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {bin.connection_status || 'OFFLINE'}
                      </span>
                    </td>
                    
                    {/* Fill Level */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              (bin.fill_percentage || 0) >= 80 ? 'bg-red-500' :
                              (bin.fill_percentage || 0) >= 50 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${bin.fill_percentage || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">
                          {Math.round(bin.fill_percentage || 0)}%
                        </span>
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center space-x-2">
                        {/* Generate QR button for bins without GPS */}
                        {bin.has_gps === false && (
                          <button
                            onClick={() => handleGenerateQRForExistingBin(bin)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Generate QR Code for Location Setup"
                          >
                            <FaQrcode />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleEdit(bin)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Bin"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(bin.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Bin"
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg">
                  <FaTrash className="text-green-600 text-xl" />
                </div>
                <h2 className="text-2xl font-bold">
                  {editingBin ? 'Edit Bin' : 'Register New Bin'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowRegisterModal(false);
                  setEditingBin(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* GPS Selection */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <FaSatelliteDish className="inline mr-2" />
                  GPS Configuration <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer bg-white px-4 py-3 rounded-lg border-2 border-gray-300 hover:border-green-500 transition-all flex-1">
                    <input
                      type="radio"
                      checked={hasGPS}
                      onChange={() => setHasGPS(true)}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="font-medium text-gray-700">With GPS</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer bg-white px-4 py-3 rounded-lg border-2 border-gray-300 hover:border-green-500 transition-all flex-1">
                    <input
                      type="radio"
                      checked={!hasGPS}
                      onChange={() => setHasGPS(false)}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="font-medium text-gray-700">Without GPS (QR Code)</span>
                  </label>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {hasGPS 
                    ? '📍 You will enter GPS coordinates manually'
                    : '📱 A QR code will be generated for residents to scan and set location'}
                </p>
              </div>

              {/* Bin ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bin ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bin_id"
                  value={formData.bin_id}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., SMART_BIN_001_H"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location/Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 188/A or Home Entrance"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* GPS Coordinates - Only show if hasGPS is true */}
              {hasGPS && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Latitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      required={hasGPS}
                      placeholder="6.594296"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Longitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      required={hasGPS}
                      placeholder="79.95409"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Message for Without GPS */}
              {!hasGPS && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <FaQrcode className="text-yellow-600 text-xl mt-1" />
                    <div>
                      <p className="font-semibold text-yellow-900">QR Code Will Be Generated</p>
                      <p className="text-sm text-yellow-800 mt-1">
                        After registration, you can download or print the QR code for the resident to scan and set the bin location using their mobile device.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bin Height */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bin Height (cm)
                </label>
                <input
                  type="number"
                  name="bin_height_cm"
                  value={formData.bin_height_cm}
                  onChange={handleInputChange}
                  placeholder="30"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Waste Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Waste Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="waste_type"
                  value={formData.waste_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {wasteTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Device Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Device Type
                  </label>
                  <input
                    type="text"
                    name="device_type"
                    value={formData.device_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Power Source
                  </label>
                  <input
                    type="text"
                    name="power_source"
                    value={formData.power_source}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Firmware Version */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Firmware Version
                </label>
                <input
                  type="text"
                  name="firmware_version"
                  value={formData.firmware_version}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterModal(false);
                    setEditingBin(null);
                    setHasGPS(true);
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
                >
                  <FaCheck />
                  <span>{editingBin ? 'Update Bin' : 'Register Bin'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <FaQrcode className="text-2xl" />
                <h2 className="text-2xl font-bold">Bin Registered Successfully!</h2>
              </div>
              <button
                onClick={() => {
                  setShowQRModal(false);
                  setGeneratedQRCode('');
                  setRegisteredBinData(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-semibold">✅ Bin registered successfully!</p>
                <p className="text-sm text-green-700 mt-1">
                  QR code generated for location setup by resident
                </p>
              </div>

              {/* Bin Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Bin Details:</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Bin ID:</strong> {registeredBinData?.bin_id}</p>
                  <p><strong>Location:</strong> {registeredBinData?.location}</p>
                  <p><strong>Waste Type:</strong> {registeredBinData?.waste_type}</p>
                </div>
              </div>

              {/* QR Code Display */}
              <div ref={qrCodeRef} className="flex justify-center bg-white border-2 border-gray-200 rounded-lg p-6">
                <img 
                  src={generatedQRCode} 
                  alt="QR Code" 
                  className="w-64 h-64"
                />
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-2">📱 Instructions:</p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Print or download this QR code</li>
                  <li>Give it to the resident</li>
                  <li>Resident scans with Clea~Ro app</li>
                  <li>App will request location permission</li>
                  <li>Bin location will be saved automatically</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleDownloadQR}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <FaDownload />
                  <span>Download QR</span>
                </button>
                <button
                  onClick={handlePrintQR}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <FaPrint />
                  <span>Print QR</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setShowQRModal(false);
                  setGeneratedQRCode('');
                  setRegisteredBinData(null);
                }}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/notification_service.dart';
import 'dart:async';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:location/location.dart' as loc;
import 'dart:convert';

class BinStatusScreen extends StatefulWidget {
  const BinStatusScreen({Key? key}) : super(key: key);

  @override
  State<BinStatusScreen> createState() => _BinStatusScreenState();
}

class _BinStatusScreenState extends State<BinStatusScreen> {
  final List<Map<String, dynamic>> _bins = [];

  // Open QR Scanner
  void _openQRScanner() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => QRScannerScreen(
          onQRScanned: (String scannedCode) {
            // Handle scanned QR code (e.g., show a dialog or update state)
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Scanned QR: $scannedCode'),
                backgroundColor: Colors.green,
              ),
            );
          },
        ),
      ),
    );
  }

  // Add Bin Dialog
  void _showAddBinDialog() {
    final TextEditingController locationController = TextEditingController();
    final TextEditingController typeController = TextEditingController();
    final TextEditingController capacityController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add New Bin'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: locationController,
                decoration: const InputDecoration(
                  labelText: 'Location',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: typeController,
                decoration: const InputDecoration(
                  labelText: 'Type',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: capacityController,
                decoration: const InputDecoration(
                  labelText: 'Capacity (L)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final location = locationController.text.trim();
              final type = typeController.text.trim();
              final capacity =
                  double.tryParse(capacityController.text.trim()) ?? 0;

              if (location.isEmpty || type.isEmpty || capacity <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Please fill all fields with valid values',
                    ),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }

              setState(() {
                _bins.add({
                  'id':
                      'BIN-${_homeNumber ?? 'UNKNOWN'}-${(_bins.length + 1).toString().padLeft(3, '0')}',
                  'location': location,
                  'type': type,
                  'capacity': capacity,
                  'fillLevel': 0.0,
                  'lastEmptied': 'Never',
                  'status': 'Normal',
                });
              });

              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Bin added successfully'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('Add Bin'),
          ),
        ],
      ),
    );
  }

  // Auto-refresh status panel
  Widget _buildAutoRefreshStatusPanel() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: _autoRefreshTimer != null
              ? [
                  const Color(0xFFE8F5E8), // Light green
                  const Color(0xFFF0F9F0), // Very light green
                ]
              : [
                  const Color(0xFFF5F5F5), // Light grey
                  const Color(0xFFFAFAFA), // Very light grey
                ],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _autoRefreshTimer != null
              ? const Color(0xFF4CAF50).withOpacity(0.3)
              : Colors.grey.withOpacity(0.3),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: (_autoRefreshTimer != null ? Colors.green : Colors.grey)
                .withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Status Icon with Animation
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: (_autoRefreshTimer != null ? Colors.green : Colors.grey)
                  .withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: _isAutoRefreshing
                ? SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Colors.green[600]!,
                      ),
                    ),
                  )
                : Icon(
                    _autoRefreshTimer != null
                        ? Icons.sync
                        : Icons.sync_disabled,
                    size: 16,
                    color: _autoRefreshTimer != null
                        ? Colors.green[600]
                        : Colors.grey[600],
                  ),
          ),

          const SizedBox(width: 12),

          // Status Text and Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Auto-Refresh',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: _autoRefreshTimer != null
                            ? Colors.green[700]
                            : Colors.grey[700],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: (_autoRefreshTimer != null
                                ? Colors.green
                                : Colors.grey)
                            .withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        _autoRefreshTimer != null ? 'ON' : 'OFF',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: _autoRefreshTimer != null
                              ? Colors.green[800]
                              : Colors.grey[600],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  _autoRefreshTimer != null
                      ? _isAutoRefreshing
                          ? 'Refreshing IoT data...'
                          : 'Last updated: ${_getLastRefreshTime()}'
                      : 'Tap sync button to enable real-time updates',
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey[600],
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),

          // Refresh Interval Badge
          if (_autoRefreshTimer != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Colors.blue.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.timer, size: 12, color: Colors.blue[600]),
                  const SizedBox(width: 3),
                  Text(
                    '5s',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: Colors.blue[600],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  final List<Map<String, dynamic>> _pendingBins = [];
  final List<Map<String, dynamic>> _smartBins = [];
  String? _homeNumber;
  bool _isLoading = true;
  bool _isLoadingSmartBins = false;

  // Auto-refresh functionality
  Timer? _autoRefreshTimer;
  bool _isAutoRefreshing = false;
  DateTime? _lastRefreshTime;

  @override
  void initState() {
    super.initState();
    _fetchUserData().then((_) {
      _initializeExampleBins();
      _loadBins();
      _loadSmartBins();
      _startBinMonitoring();
      _startAutoRefresh(); // Start auto-refresh timer
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel(); // Clean up timer
    super.dispose();
  }

  // Start auto-refresh timer
  void _startAutoRefresh() {
    _autoRefreshTimer?.cancel(); // Cancel existing timer
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (mounted) {
        _refreshSmartBinsData();
      }
    });
  }

  // Stop auto-refresh timer
  void _stopAutoRefresh() {
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = null;
  }

  // Refresh smart bins data with visual feedback
  Future<void> _refreshSmartBinsData() async {
    if (_isAutoRefreshing) return; // Prevent overlapping refreshes

    setState(() {
      _isAutoRefreshing = true;
    });

    try {
      await _loadSmartBins();
      setState(() {
        _lastRefreshTime = DateTime.now();
      });
    } catch (e) {
      print('Auto-refresh error: $e');
    } finally {
      setState(() {
        _isAutoRefreshing = false;
      });
    }
  }

  // Format last refresh time
  String _getLastRefreshTime() {
    if (_lastRefreshTime == null) return 'Never';

    final now = DateTime.now();
    final difference = now.difference(_lastRefreshTime!);

    if (difference.inSeconds < 10) {
      return 'Just now';
    } else if (difference.inMinutes < 1) {
      return '${difference.inSeconds}s ago';
    } else {
      return '${difference.inMinutes}m ago';
    }
  }

  void _initializeExampleBins() {
    // Ensure the home number is set before initializing bins
    final homeNumber = _homeNumber ?? 'UNKNOWN';
    _bins.addAll([
      {
        'id': 'BIN-$homeNumber-001',
        'location': 'Food Waste',
        'type': 'Food Waste',
        'capacity': 120,
        'fillLevel': 0.75,
        'lastEmptied': '2 days ago',
        'status': 'Normal',
      },
      {
        'id': 'BIN-$homeNumber-002',
        'location': 'Polythene & Plastic Waste',
        'type': 'Polythene & Plastic Waste',
        'capacity': 90,
        'fillLevel': 0.45,
        'lastEmptied': '3 days ago',
        'status': 'Normal',
      },
      {
        'id': 'BIN-$homeNumber-003',
        'location': 'Other Waste',
        'type': 'Other Waste',
        'capacity': 60,
        'fillLevel': 0.92,
        'lastEmptied': '5 days ago',
        'status': 'Almost Full',
      },
    ]);
  }

  Future<void> _fetchUserData() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        final userDoc = await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .get();

        if (userDoc.exists) {
          setState(() {
            _homeNumber = userDoc.data()?['homeNumber']?.toString();
          });
        }
      }
    } catch (e) {
      print('Error fetching user data: $e');
    }
  }

  Future<void> _loadBins() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      final querySnapshot = await FirebaseFirestore.instance
          .collection('binRequests')
          .where('userId', isEqualTo: user.uid)
          .get();

      setState(() {
        _pendingBins.clear();

        int pendingIndex = 1; // Start sequential numbering for pending bins
        for (var doc in querySnapshot.docs) {
          final binData = doc.data();
          if (binData['status'] == 'Pending') {
            binData['id'] =
                'BIN-${_homeNumber ?? 'UNKNOWN'}-${pendingIndex.toString().padLeft(3, '0')}';
            _pendingBins.add(binData);
            pendingIndex++;
          }
        }
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading bins: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadSmartBins() async {
    // Remove the loading indicator for automatic refresh
    // setState(() => _isLoadingSmartBins = true);
    try {
      final querySnapshot =
          await FirebaseFirestore.instance.collection('smart_bins').get();

      setState(() {
        _smartBins.clear();
        for (var doc in querySnapshot.docs) {
          final data = doc.data();
          // Add document ID and all data
          _smartBins.add({'docId': doc.id, ...data});
        }
        // _isLoadingSmartBins = false; // Remove this line
      });
    } catch (e) {
      print('Error loading smart bins: $e');
      // setState(() => _isLoadingSmartBins = false); // Remove this line
    }
  }

  // Start monitoring bins for full status
  void _startBinMonitoring() {
    // Auto-refresh smart bins data every 5 seconds to show real-time updates
    Stream.periodic(Duration(seconds: 5)).listen((_) {
      if (mounted) {
        _loadSmartBins();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Bin Status'),
            const SizedBox(width: 8),
            // Auto-refresh indicator
            if (_isAutoRefreshing)
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.green[600]!),
                ),
              ),
          ],
        ),
        backgroundColor: const Color.fromARGB(255, 187, 221, 188),
        actions: [
          // QR Scanner Button
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Scan Bin QR Code',
            onPressed: () => _openQRScanner(),
          ),
          // Auto-refresh toggle button
          IconButton(
            icon: Icon(
              _autoRefreshTimer != null ? Icons.sync : Icons.sync_disabled,
              color:
                  _autoRefreshTimer != null ? Colors.green[600] : Colors.grey,
            ),
            tooltip: _autoRefreshTimer != null
                ? 'Auto-refresh ON'
                : 'Auto-refresh OFF',
            onPressed: () {
              if (_autoRefreshTimer != null) {
                _stopAutoRefresh();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Auto-refresh disabled'),
                    backgroundColor: Colors.orange,
                    duration: Duration(seconds: 2),
                  ),
                );
              } else {
                _startAutoRefresh();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Auto-refresh enabled (5s interval)'),
                    backgroundColor: Colors.green,
                    duration: Duration(seconds: 2),
                  ),
                );
              }
              setState(() {});
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildOverviewTab(),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          _showAddBinDialog();
        },
        backgroundColor: Colors.green,
        child: const Icon(Icons.add),
        tooltip: 'Add New Bin',
      ),
    );
  }

  Widget _buildOverviewTab() {
    return Column(
      children: [
        _buildStatusSummary(),
        // Auto-refresh status info panel
        if (_smartBins.isNotEmpty) _buildAutoRefreshStatusPanel(),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async {
              await _loadBins();
              await _refreshSmartBinsData();
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Smart Bins section header and cards
                if (_smartBins.isNotEmpty) ...[
                  Row(
                    children: [
                      Icon(Icons.smart_toy, color: Colors.blue[600], size: 24),
                      const SizedBox(width: 8),
                      const Text(
                        'Clea~Ro Smart Bins',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1976D2),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.green.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: Colors.green.withOpacity(0.3),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              'IoT',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.green,
                              ),
                            ),
                            if (_isAutoRefreshing) ...[
                              const SizedBox(width: 4),
                              SizedBox(
                                width: 10,
                                height: 10,
                                child: CircularProgressIndicator(
                                  strokeWidth: 1.5,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    Colors.green,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],

                // Smart bin cards
                if (_smartBins.isNotEmpty)
                  ..._smartBins
                      .map((smartBin) => _buildSmartBinCard(smartBin))
                      .toList(),

                // Add spacing between smart bins and regular bins
                if (_smartBins.isNotEmpty) const SizedBox(height: 16),

                // Regular bin cards header (if there are bins)
                if (_bins.isNotEmpty) ...[
                  const Text(
                    'Regular Bins',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1976D2),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Original 3 bin cards
                ..._bins.take(3).map((bin) => _buildBinCard(bin)).toList(),

                // Pending bins section (if any)
                if (_pendingBins.isNotEmpty) ...[
                  const Padding(
                    padding: EdgeInsets.only(top: 16, bottom: 8),
                    child: Text(
                      'Pending Bin Requests',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue,
                      ),
                    ),
                  ),
                  ..._pendingBins
                      .map((bin) => _buildPendingBinCard(bin))
                      .toList(),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusSummary() {
    int totalBins = _bins.length + _smartBins.length;
    int normalBins = _bins.where((bin) => bin['status'] == 'Normal').length;
    int warningBins =
        _bins.where((bin) => bin['status'] == 'Almost Full').length;
    int alertBins = _bins.where((bin) => bin['status'] == 'Full').length;

    // Add smart bins to summary counts
    for (var smartBin in _smartBins) {
      dynamic getFirestoreValue(dynamic field) {
        if (field == null) return null;
        if (field is Map<String, dynamic>) {
          if (field.containsKey('stringValue')) return field['stringValue'];
          if (field.containsKey('doubleValue')) return field['doubleValue'];
          if (field.containsKey('integerValue'))
            return int.tryParse(field['integerValue'].toString()) ??
                field['integerValue'];
          if (field.containsKey('booleanValue')) return field['booleanValue'];
          if (field.containsKey('mapValue') &&
              field['mapValue']['fields'] != null) {
            return field['mapValue']['fields'];
          }
        }
        return field;
      }

      final fillData = getFirestoreValue(smartBin['fill_data']);
      final fillPercentage =
          getFirestoreValue(fillData?['fill_percentage'])?.toDouble() ?? 0.0;
      final isCritical = getFirestoreValue(fillData?['is_critical']) ?? false;
      final isFull = getFirestoreValue(fillData?['is_full']) ?? false;
      final sensorWorking = getFirestoreValue(
            getFirestoreValue(smartBin['system'])?['sensor_working'],
          ) ??
          false;

      if (!sensorWorking) {
        // Don't count offline bins
        totalBins--;
      } else if (isCritical || isFull || fillPercentage >= 85) {
        alertBins++;
      } else if (fillPercentage >= 70) {
        warningBins++;
      } else {
        normalBins++;
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Bin Status Summary',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildStatusIndicator('Total', totalBins, Colors.blue),
              _buildStatusIndicator('Normal', normalBins, Colors.green),
              _buildStatusIndicator('Warning', warningBins, Colors.orange),
              _buildStatusIndicator('Full', alertBins, Colors.red),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusIndicator(String label, int count, Color color) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Text(
              count.toString(),
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(fontSize: 12, color: color.withOpacity(0.8)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSmartBinCard(Map<String, dynamic> smartBin) {
    // Extract data directly (flat structure)
    final binId = smartBin['bin_id'] ?? 'Unknown';
    final location = smartBin['location'] ?? 'Unknown';
    final fillPercentage = (smartBin['fill_percentage'] ?? 0.0).toDouble();
    final binStatus = smartBin['bin_status'] ?? 'UNKNOWN';
    final fillLevel = smartBin['fill_level'] ?? 'UNKNOWN';

    // Flags
    final isCritical = smartBin['is_critical'] ?? false;
    final isFull = smartBin['is_full'] ?? false;
    final needsEmptying = smartBin['needs_emptying'] ?? false;
    final isOnline = smartBin['is_online'] ?? false;
    final sensorWorking = smartBin['sensor_working'] ?? false;
    final wifiConnected = smartBin['wifi_connected'] ?? false;

    // Timestamp
    final lastUpdated = smartBin['last_updated'];
    String lastUpdateText = 'Unknown';
    if (lastUpdated is Timestamp) {
      final date = lastUpdated.toDate();
      final now = DateTime.now();
      final difference = now.difference(date);
      if (difference.inMinutes < 1) {
        lastUpdateText = 'Just now';
      } else if (difference.inHours < 1) {
        lastUpdateText = '${difference.inMinutes}m ago';
      } else if (difference.inDays < 1) {
        lastUpdateText = '${difference.inHours}h ago';
      } else {
        lastUpdateText = '${difference.inDays}d ago';
      }
    }

    // Determine status
    String status;
    Color statusColor;
    IconData statusIcon;

    if (!isOnline || !sensorWorking) {
      status = 'OFFLINE';
      statusColor = Colors.grey;
      statusIcon = Icons.sensors_off;
    } else if (isCritical || isFull) {
      status = 'CRITICAL';
      statusColor = Colors.red;
      statusIcon = Icons.warning;
    } else if (needsEmptying || fillPercentage >= 80) {
      status = 'FULL';
      statusColor = Colors.orange;
      statusIcon = Icons.delete;
    } else if (fillPercentage >= 70) {
      status = 'HIGH';
      statusColor = Colors.yellow[700]!;
      statusIcon = Icons.delete_outline;
    } else if (fillPercentage >= 50) {
      status = 'MEDIUM';
      statusColor = Colors.blue;
      statusIcon = Icons.delete_outline;
    } else {
      status = 'LOW';
      statusColor = Colors.green;
      statusIcon = Icons.check_circle;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.blue[50]!, Colors.white],
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.blue[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.memory,
                      color: Colors.blue[700],
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          location,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1976D2),
                          ),
                        ),
                        Text(
                          'ID: $binId',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: statusColor.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(statusIcon, size: 16, color: statusColor),
                        const SizedBox(width: 6),
                        Text(
                          status,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: statusColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Fill Level Indicator
              Row(
                children: [
                  SizedBox(
                    width: 100,
                    height: 100,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 100,
                          height: 100,
                          child: CircularProgressIndicator(
                            value: fillPercentage / 100,
                            strokeWidth: 10,
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(
                              _getFillLevelColor(fillPercentage / 100),
                            ),
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${fillPercentage.toStringAsFixed(1)}%',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: _getFillLevelColor(fillPercentage / 100),
                              ),
                            ),
                            const Text(
                              'Full',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.black54,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 20),

                  // Status Info
                  Expanded(
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.wifi,
                              size: 16,
                              color: wifiConnected ? Colors.green : Colors.red,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              wifiConnected ? 'Online' : 'Offline',
                              style: TextStyle(
                                fontSize: 13,
                                color:
                                    wifiConnected ? Colors.green : Colors.red,
                              ),
                            ),
                            const Spacer(),
                            Icon(
                              Icons.sensors,
                              size: 16,
                              color: sensorWorking ? Colors.green : Colors.red,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              sensorWorking ? 'Active' : 'Error',
                              style: TextStyle(
                                fontSize: 13,
                                color:
                                    sensorWorking ? Colors.green : Colors.red,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Icon(
                              Icons.access_time,
                              size: 16,
                              color: Colors.blue[600],
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Updated: $lastUpdateText',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey[700],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: OutlinedButton.icon(
                      onPressed: () => _showSmartBinDetailsDialog(smartBin),
                      icon: const Icon(Icons.info_outline, size: 18),
                      label: const Text('Details'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 3,
                    child: ElevatedButton.icon(
                      onPressed: isOnline && sensorWorking
                          ? () => _showSmartBinEmptyingDialog(smartBin)
                          : null,
                      icon: const Icon(Icons.calendar_today, size: 18),
                      label: const Text('Request'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isCritical || needsEmptying
                            ? Colors.red
                            : Colors.green,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  void _showSmartBinDetailsDialog(Map<String, dynamic> smartBin) {
    // Extract data
    final binId = smartBin['bin_id'] ?? 'Unknown';
    final location = smartBin['location'] ?? 'Unknown';
    final fillPercentage = (smartBin['fill_percentage'] ?? 0.0).toDouble();
    final binStatus = smartBin['bin_status'] ?? 'UNKNOWN';
    final fillLevel = smartBin['fill_level'] ?? 'UNKNOWN';
    final deviceType = smartBin['device_type'] ?? 'ESP32';
    final firmwareVersion = smartBin['firmware_version'] ?? 'Unknown';
    final wifiSignal = smartBin['wifi_signal_strength'] ?? 0;
    final hasGps = smartBin['has_gps'] ?? false;
    final latitude = smartBin['latitude'] ?? 0.0;
    final longitude = smartBin['longitude'] ?? 0.0;
    final binHeightCm = (smartBin['bin_height_cm'] ?? 30.0).toDouble();
    final wasteHeightCm = (smartBin['waste_height_cm'] ?? 0.0).toDouble();
    final distanceCm = (smartBin['distance_cm'] ?? 0.0).toDouble();
    final connectionStatus = smartBin['connection_status'] ?? 'OFFLINE';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.smart_toy, color: Colors.blue[600]),
            const SizedBox(width: 8),
            const Text('Smart Bin Details'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailItem('📍 Location', location),
              _buildDetailItem('🆔 Bin ID', binId),
              _buildDetailItem('📦 Type', smartBin['type'] ?? 'N/A'),
              _buildDetailItem(
                '📊 Fill Level',
                '${(fillPercentage * 100).toInt()}%',
              ),
              _buildDetailItem(
                '🗑️ Capacity',
                '${smartBin['capacity'] ?? 'N/A'} liters',
              ),
              _buildDetailItem('🚨 Status', binStatus),
              _buildDetailItem(
                '🕐 Last Emptied',
                smartBin['last_emptied'] != null
                    ? (smartBin['last_emptied'] as Timestamp)
                        .toDate()
                        .toString()
                        .substring(0, 10)
                    : 'Never',
              ),
              const Divider(),
              _buildDetailItem(
                '📏 Bin Height',
                '${binHeightCm.toStringAsFixed(1)} cm',
              ),
              _buildDetailItem(
                '🗑️ Waste Height',
                '${wasteHeightCm.toStringAsFixed(1)} cm',
              ),
              _buildDetailItem(
                '📐 Distance',
                '${distanceCm.toStringAsFixed(1)} cm',
              ),
              const Divider(),
              _buildDetailItem('📱 Device', deviceType),
              _buildDetailItem('💿 Firmware', firmwareVersion),
              _buildDetailItem('📶 WiFi Signal', '$wifiSignal dBm'),
              _buildDetailItem('🔌 Connection', connectionStatus),
              if (hasGps) ...[
                const Divider(),
                _buildDetailItem('🛰️ GPS', 'Available'),
                _buildDetailItem(
                  '📍 Coordinates',
                  '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}',
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showSmartBinEmptyingDialog(Map<String, dynamic> smartBin) {
    final binId = smartBin['bin_id'] ?? 'Unknown';
    final location = smartBin['location'] ?? 'Unknown';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Request Bin Emptying'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Bin: $location'),
            Text('ID: $binId'),
            const SizedBox(height: 16),
            const Text(
              'Are you sure you want to request emptying for this smart bin?',
              style: TextStyle(fontSize: 14),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Emptying request submitted'),
                  backgroundColor: Colors.green,
                  duration: Duration(seconds: 2),
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('Submit Request'),
          ),
        ],
      ),
    );
  }

  Widget _buildBinCard(Map<String, dynamic> bin) {
    Color statusColor;
    if (bin['status'] == 'Normal') {
      statusColor = Colors.green;
    } else if (bin['status'] == 'Almost Full') {
      statusColor = Colors.orange;
    } else if (bin['status'] == 'Inactive') {
      statusColor = Colors.grey;
    } else {
      statusColor = Colors.red;
    }

    final fillLevel = (bin['fillLevel'] ?? 0.0) as double;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.grey[50]!, Colors.white],
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.delete_outline,
                      color: Colors.grey[700],
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          bin['location'] ?? 'No Location',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF424242),
                          ),
                        ),
                        Text(
                          'ID: ${bin['id']}',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: statusColor.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.circle, size: 8, color: statusColor),
                        const SizedBox(width: 6),
                        Text(
                          bin['status'] ?? 'Unknown',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: statusColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Fill Level Indicator
              Row(
                children: [
                  SizedBox(
                    width: 100,
                    height: 100,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 100,
                          height: 100,
                          child: CircularProgressIndicator(
                            value: fillLevel,
                            strokeWidth: 10,
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(
                              _getFillLevelColor(fillLevel),
                            ),
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${(fillLevel * 100).toInt()}%',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: _getFillLevelColor(fillLevel),
                              ),
                            ),
                            const Text(
                              'Full',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.black54,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 20),

                  // Bin Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildInfoRow(
                          'Type',
                          bin['type'] ?? 'Unknown',
                          Icons.category,
                          Colors.blue[600]!,
                        ),
                        const SizedBox(height: 12),
                        _buildInfoRow(
                          'Capacity',
                          '${bin['capacity'] ?? 'N/A'} L',
                          Icons.straighten,
                          Colors.purple[600]!,
                        ),
                        const SizedBox(height: 12),
                        _buildInfoRow(
                          'Last Emptied',
                          bin['lastEmptied'] ?? 'Never',
                          Icons.history,
                          Colors.orange[600]!,
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: OutlinedButton.icon(
                      onPressed: () => _showBinDetailsDialog(bin),
                      icon: const Icon(Icons.info_outline, size: 18),
                      label: const Text('Details'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        side: BorderSide(color: Colors.grey[400]!),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 3,
                    child: ElevatedButton.icon(
                      onPressed: () => _showRequestEmptyingDialog(bin),
                      icon: const Icon(Icons.calendar_today, size: 18),
                      label: const Text('Request'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, IconData icon, Color color) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Icon(icon, size: 16, color: color),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.black54,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPendingBinCard(Map<String, dynamic> bin) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.blue[50]!, Colors.white],
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.blue[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.hourglass_empty,
                      color: Colors.blue[700],
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          bin['location'] ?? 'No Location',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1976D2),
                          ),
                        ),
                        Text(
                          'ID: ${bin['id']}',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.blue.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.pending, size: 16, color: Colors.blue),
                        const SizedBox(width: 6),
                        Text(
                          'Pending',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue[700],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Pending Info
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.blue[200]!),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(Icons.category, size: 16, color: Colors.blue[700]),
                        const SizedBox(width: 8),
                        Text(
                          'Type: ${bin['type'] ?? 'Unknown'}',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Colors.blue[900],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(
                          Icons.straighten,
                          size: 16,
                          color: Colors.blue[700],
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Capacity: ${bin['capacity'] ?? 'N/A'} liters',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Colors.blue[900],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(
                          Icons.calendar_today,
                          size: 16,
                          color: Colors.blue[700],
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Requested: ${bin['createdAt'] != null ? (bin['createdAt'] as Timestamp).toDate().toString().substring(0, 10) : 'Unknown'}',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Colors.blue[900],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Divider(color: Colors.blue[200]),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.info_outline,
                          size: 16,
                          color: Colors.blue[700],
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Waiting for admin approval',
                            style: TextStyle(
                              fontSize: 13,
                              fontStyle: FontStyle.italic,
                              color: Colors.blue[800],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Action Button
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _showPendingBinDetailsDialog(bin),
                  icon: const Icon(Icons.visibility, size: 18),
                  label: const Text('View Details'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    side: BorderSide(color: Colors.blue[300]!),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showBinDetailsDialog(Map<String, dynamic> bin) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.delete_outline, color: Colors.grey[700]),
            const SizedBox(width: 8),
            const Text('Bin Details'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailItem('📍 Location', bin['location'] ?? 'N/A'),
              _buildDetailItem('🆔 Bin ID', bin['id'] ?? 'N/A'),
              _buildDetailItem('📦 Type', bin['type'] ?? 'N/A'),
              _buildDetailItem(
                '📊 Fill Level',
                '${((bin['fillLevel'] ?? 0.0) * 100).toInt()}%',
              ),
              _buildDetailItem(
                '🗑️ Capacity',
                '${bin['capacity'] ?? 'N/A'} liters',
              ),
              _buildDetailItem('🚨 Status', bin['status'] ?? 'Unknown'),
              _buildDetailItem(
                '🕐 Last Emptied',
                bin['lastEmptied'] ?? 'Never',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _showRequestEmptyingDialog(bin);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('Request Emptying'),
          ),
        ],
      ),
    );
  }

  void _showPendingBinDetailsDialog(Map<String, dynamic> bin) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.hourglass_empty, color: Colors.blue[700]),
            const SizedBox(width: 8),
            const Text('Pending Bin Request'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailItem('📍 Location', bin['location'] ?? 'N/A'),
              _buildDetailItem('🆔 Request ID', bin['id'] ?? 'N/A'),
              _buildDetailItem('📦 Type', bin['type'] ?? 'N/A'),
              _buildDetailItem(
                '🗑️ Capacity',
                '${bin['capacity'] ?? 'N/A'} liters',
              ),
              _buildDetailItem('🚨 Status', 'Pending Approval'),
              _buildDetailItem(
                '📅 Requested On',
                bin['createdAt'] != null
                    ? (bin['createdAt'] as Timestamp)
                        .toDate()
                        .toString()
                        .substring(0, 10)
                    : 'Unknown',
              ),
              _buildDetailItem(
                '📝 Reason',
                bin['reason'] ?? 'Not specified',
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue[200]!),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      color: Colors.blue[700],
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Your request is being reviewed by the admin team.',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.blue[900],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showRequestEmptyingDialog(Map<String, dynamic> bin) {
    final TextEditingController noteController = TextEditingController();
    DateTime? selectedDate;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Request Bin Emptying'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Bin: ${bin['location']}'),
              Text('ID: ${bin['id']}'),
              const SizedBox(height: 16),
              const Text('Select preferred date:'),
              const SizedBox(height: 8),
              InkWell(
                onTap: () async {
                  final pickedDate = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now().add(
                      const Duration(days: 1),
                    ),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(
                      const Duration(days: 14),
                    ),
                  );
                  if (pickedDate != null) {
                    setState(() {
                      selectedDate = pickedDate;
                    });
                  }
                },
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Preferred Date',
                    border: OutlineInputBorder(),
                    suffixIcon: Icon(Icons.calendar_today),
                  ),
                  child: Text(
                    selectedDate != null
                        ? '${selectedDate!.toLocal()}'.split(' ')[0]
                        : 'Select Date',
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text('Any special instructions?'),
              const SizedBox(height: 8),
              TextField(
                controller: noteController,
                decoration: const InputDecoration(
                  hintText: 'E.g., Please empty before 9 AM',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (selectedDate == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Please select a date'),
                      backgroundColor: Colors.red,
                    ),
                  );
                  return;
                }

                try {
                  final user = FirebaseAuth.instance.currentUser;
                  if (user == null) throw Exception('User not logged in');

                  await FirebaseFirestore.instance
                      .collection('emptyingRequests')
                      .add({
                    'binId': bin['id'],
                    'type': bin['type'],
                    'date': selectedDate,
                    'note': noteController.text.trim(),
                    'userId': user.uid,
                    'createdAt': FieldValue.serverTimestamp(),
                  });

                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Emptying request submitted successfully',
                      ),
                      backgroundColor: Colors.green,
                    ),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
              ),
              child: const Text('Submit Request'),
            ),
          ],
        ),
      ),
    );
  }

  Color _getFillLevelColor(double fillLevel) {
    if (fillLevel >= 0.9) return Colors.red;
    if (fillLevel >= 0.7) return Colors.orange;
    if (fillLevel >= 0.5) return Colors.yellow[700]!;
    return Colors.green;
  }
}

class _FillLevelPainter extends CustomPainter {
  final double fillLevel;
  final Color fillColor;

  _FillLevelPainter({required this.fillLevel, required this.fillColor});

  @override
  void paint(Canvas canvas, Size size) {
    final paintOutline = Paint()
      ..color = Colors.grey.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10.0;

    final paintFill = Paint()
      ..color = fillColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10.0;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 10;

    canvas.drawCircle(center, radius, paintOutline);

    final rect = Rect.fromCircle(center: center, radius: radius);
    canvas.drawArc(
      rect,
      -math.pi / 2,
      2 * math.pi * fillLevel,
      false,
      paintFill,
    );
  }

  @override
  bool shouldRepaint(_FillLevelPainter oldDelegate) =>
      oldDelegate.fillLevel != fillLevel || oldDelegate.fillColor != fillColor;
}

// QR Scanner Screen with mobile_scanner
class QRScannerScreen extends StatefulWidget {
  final Function(String) onQRScanned;

  const QRScannerScreen({Key? key, required this.onQRScanned})
      : super(key: key);

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  MobileScannerController cameraController = MobileScannerController();
  bool isScanned = false;

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (!isScanned && capture.barcodes.isNotEmpty) {
      final String? code = capture.barcodes.first.rawValue;
      if (code != null) {
        setState(() {
          isScanned = true;
        });
        Navigator.pop(context);
        widget.onQRScanned(code);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Bin QR Code'),
        backgroundColor: const Color.fromARGB(255, 187, 221, 188),
        actions: [
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: cameraController.torchState,
              builder: (context, state, child) {
                return Icon(
                  state == TorchState.off ? Icons.flash_off : Icons.flash_on,
                );
              },
            ),
            onPressed: () => cameraController.toggleTorch(),
          ),
          IconButton(
            icon: Icon(Icons.flip_camera_ios),
            onPressed: () => cameraController.switchCamera(),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 4,
            child: MobileScanner(
              controller: cameraController,
              onDetect: _onDetect,
            ),
          ),
          Expanded(
            flex: 1,
            child: Container(
              color: Colors.white,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.qr_code_scanner,
                      size: 48,
                      color: Colors.green[600],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Position QR code within frame',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Scan the QR code printed by admin',
                      style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

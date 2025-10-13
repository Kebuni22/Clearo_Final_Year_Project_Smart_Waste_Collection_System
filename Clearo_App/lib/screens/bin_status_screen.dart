import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/notification_service.dart';
import 'dart:async';

class BinStatusScreen extends StatefulWidget {
  const BinStatusScreen({Key? key}) : super(key: key);

  @override
  State<BinStatusScreen> createState() => _BinStatusScreenState();
}

class _BinStatusScreenState extends State<BinStatusScreen> {
  final List<Map<String, dynamic>> _bins = [];

  // Auto-refresh status panel
  Widget _buildAutoRefreshStatusPanel() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors:
              _autoRefreshTimer != null
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
          color:
              _autoRefreshTimer != null
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
            child:
                _isAutoRefreshing
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
                      color:
                          _autoRefreshTimer != null
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
                        color:
                            _autoRefreshTimer != null
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
                          color:
                              _autoRefreshTimer != null
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
  List<Map<String, dynamic>> _notifications = [];
  bool _hasUnreadNotifications = false;

  // Auto-refresh functionality
  Timer? _autoRefreshTimer;
  bool _isAutoRefreshing = false;
  DateTime? _lastRefreshTime;

  void _showNotificationsDialog() {
    // Filter notifications to show only Clea~Ro smart bin notifications (type == 'bin_full' and title contains 'Claro' or 'Smart Bin')
    final smartBinNotifications =
        _notifications.where((notif) {
          final type = notif['type'] ?? '';
          final title = (notif['title'] ?? '').toString().toLowerCase();
          return type == 'bin_full' &&
              (title.contains('claro') || title.contains('smart bin'));
        }).toList();

    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Notifications'),
                if (_hasUnreadNotifications)
                  TextButton(
                    onPressed: () {
                      NotificationService.markAllNotificationsAsRead();
                    },
                    child: const Text('Mark all read'),
                  ),
              ],
            ),
            content: SizedBox(
              width: double.maxFinite,
              height: 400,
              child: Column(
                children: [
                  const SizedBox(height: 8),
                  Expanded(
                    child:
                        smartBinNotifications.isEmpty
                            ? const Center(
                              child: Text(
                                'No Clea~Ro smart bin notifications',
                                style: TextStyle(color: Colors.grey),
                              ),
                            )
                            : ListView.builder(
                              itemCount: smartBinNotifications.length,
                              itemBuilder: (context, index) {
                                final notification =
                                    smartBinNotifications[index];
                                final isRead = notification['isRead'] ?? false;
                                final priority =
                                    notification['priority'] ?? 'low';

                                return Card(
                                  color:
                                      isRead
                                          ? Colors.grey[50]
                                          : Colors.blue[50],
                                  margin: const EdgeInsets.only(bottom: 8),
                                  child: ListTile(
                                    leading: CircleAvatar(
                                      backgroundColor: _getPriorityColor(
                                        priority,
                                      ),
                                      child: Icon(
                                        _getNotificationIcon(
                                          notification['type'],
                                        ),
                                        color: Colors.white,
                                        size: 20,
                                      ),
                                    ),
                                    title: Text(
                                      notification['title'] ?? 'Notification',
                                      style: TextStyle(
                                        fontWeight:
                                            isRead
                                                ? FontWeight.normal
                                                : FontWeight.bold,
                                      ),
                                    ),
                                    subtitle: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(notification['message'] ?? ''),
                                        if (notification['createdAt'] != null)
                                          Text(
                                            _formatNotificationTime(
                                              notification['createdAt'],
                                            ),
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey,
                                            ),
                                          ),
                                      ],
                                    ),
                                    onTap: () {
                                      if (!isRead) {
                                        NotificationService.markNotificationAsRead(
                                          notification['id'],
                                        );
                                      }
                                    },
                                  ),
                                );
                              },
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

  // Get priority color
  Color _getPriorityColor(String priority) {
    switch (priority) {
      case 'high':
        return Colors.red;
      case 'medium':
        return Colors.orange;
      default:
        return Colors.blue;
    }
  }

  // Get notification icon
  IconData _getNotificationIcon(String? type) {
    switch (type) {
      case 'bin_full':
        return Icons.warning;
      case 'emptying_request':
        return Icons.check_circle;
      case 'bin_request_status':
        return Icons.assignment;
      default:
        return Icons.notifications;
    }
  }

  // Format notification time
  String _formatNotificationTime(dynamic timestamp) {
    if (timestamp is Timestamp) {
      final date = timestamp.toDate();
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inMinutes < 1) {
        return 'Just now';
      } else if (difference.inHours < 1) {
        return '${difference.inMinutes}m ago';
      } else if (difference.inDays < 1) {
        return '${difference.inHours}h ago';
      } else {
        return '${difference.inDays}d ago';
      }
    }
    return 'Unknown';
  }

  @override
  void initState() {
    super.initState();
    _fetchUserData().then((_) {
      _initializeExampleBins();
      _loadBins();
      _loadSmartBins();
      _loadNotifications();
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
        final userDoc =
            await FirebaseFirestore.instance
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

      final querySnapshot =
          await FirebaseFirestore.instance
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

  // Load user notifications
  void _loadNotifications() {
    NotificationService.getUserNotifications().listen((snapshot) {
      if (mounted) {
        setState(() {
          // Fix: Ensure notifications are sorted by createdAt descending and handle missing fields
          _notifications =
              snapshot.docs.map((doc) {
                final data = doc.data() as Map<String, dynamic>;
                // Defensive: Ensure createdAt is present and is a Timestamp
                if (!data.containsKey('createdAt') ||
                    !(data['createdAt'] is Timestamp)) {
                  data['createdAt'] = Timestamp.now();
                }
                return {'id': doc.id, ...data};
              }).toList();

          // Sort notifications by createdAt descending (most recent first)
          _notifications.sort((a, b) {
            final ta = a['createdAt'] as Timestamp;
            final tb = b['createdAt'] as Timestamp;
            return tb.compareTo(ta);
          });

          _hasUnreadNotifications = _notifications.any(
            (notif) => !(notif['isRead'] ?? false),
          );
        });
      }
    });
  }

  // Start monitoring bins for full status
  void _startBinMonitoring() {
    // Check smart bins every 30 seconds
    Stream.periodic(Duration(seconds: 30)).listen((_) {
      NotificationService.checkSmartBinStatus();
    });

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
          // Auto-refresh toggle button
          IconButton(
            icon: Icon(
              _autoRefreshTimer != null ? Icons.sync : Icons.sync_disabled,
              color:
                  _autoRefreshTimer != null ? Colors.green[600] : Colors.grey,
            ),
            tooltip:
                _autoRefreshTimer != null
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
          // Notification bell with badge
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications),
                onPressed: _showNotificationsDialog,
              ),
              if (_hasUnreadNotifications)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 16,
                      minHeight: 16,
                    ),
                    child: Center(
                      child: Text(
                        _notifications
                            .where((n) => !(n['isRead'] ?? false))
                            .length
                            .toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body:
          _isLoading
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
      final sensorWorking =
          getFirestoreValue(
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

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        bin['location'] ?? 'No Location',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'ID: ${bin['id']} • ${bin['type']}',
                        style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: statusColor.withOpacity(0.3)),
                  ),
                  child: Text(
                    bin['status'] ?? 'Unknown',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                SizedBox(
                  width: 120,
                  height: 120,
                  child: _buildFillLevelIndicator(bin['fillLevel'] ?? 0.0),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow(
                        'Capacity',
                        '${bin['capacity'] ?? 'N/A'} liters',
                      ),
                      const SizedBox(height: 8),
                      _buildDetailRow(
                        'Fill Level',
                        '${((bin['fillLevel'] ?? 0.0) * 100).toInt()}%',
                      ),
                      const SizedBox(height: 8),
                      _buildDetailRow(
                        'Last Emptied',
                        bin['lastEmptied'] ?? 'Never',
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton.icon(
                  onPressed: () => _showBinDetailsDialog(bin),
                  icon: const Icon(Icons.info_outline, size: 18),
                  label: const Text('Details'),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: () => _showRequestEmptyingDialog(bin),
                  icon: const Icon(Icons.calendar_today, size: 18),
                  label: const Text('Request Emptying'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPendingBinCard(Map<String, dynamic> bin) {
    return Opacity(
      opacity: 0.6,
      child: Card(
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          bin['location'] ?? 'No Location',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'ID: ${bin['id']} • ${bin['type']}',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.blue.withOpacity(0.3)),
                    ),
                    child: const Text(
                      'Pending',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  SizedBox(
                    width: 120,
                    height: 120,
                    child: _buildFillLevelIndicator(0.0),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildDetailRow(
                          'Capacity',
                          '${bin['capacity'] ?? 'N/A'} liters',
                        ),
                        const SizedBox(height: 8),
                        _buildDetailRow('Status', 'Waiting for approval'),
                        const SizedBox(height: 8),
                        _buildDetailRow(
                          'Requested On',
                          bin['createdAt'] != null
                              ? '${(bin['createdAt'] as Timestamp).toDate().toString().substring(0, 10)}'
                              : 'Unknown',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton.icon(
                    onPressed: () => _showPendingBinDetailsDialog(bin),
                    icon: const Icon(Icons.info_outline, size: 18),
                    label: const Text('Details'),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
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

  Widget _buildFillLevelIndicator(double fillLevel) {
    return CustomPaint(
      painter: _FillLevelPainter(
        fillLevel: fillLevel,
        fillColor: _getFillLevelColor(fillLevel),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '${(fillLevel * 100).toInt()}%',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: _getFillLevelColor(fillLevel),
              ),
            ),
            const Text(
              'Full',
              style: TextStyle(fontSize: 14, color: Colors.black54),
            ),
          ],
        ),
      ),
    );
  }

  Color _getFillLevelColor(double fillLevel) {
    if (fillLevel < 0.5) {
      return Colors.green;
    } else if (fillLevel < 0.8) {
      return Colors.orange;
    } else {
      return Colors.red;
    }
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 90,
          child: Text(
            '$label:',
            style: const TextStyle(
              color: Colors.black54,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$label: ',
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(color: Colors.black54)),
          ),
        ],
      ),
    );
  }

  void _showBinDetailsDialog(Map<String, dynamic> bin) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Text('Bin Details: ${bin['id']}'),
            content: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildDetailItem('ID', bin['id'] ?? 'N/A'),
                  _buildDetailItem('Location', bin['location'] ?? 'N/A'),
                  _buildDetailItem('Type', bin['type'] ?? 'N/A'),
                  _buildDetailItem(
                    'Capacity',
                    '${bin['capacity'] ?? 'N/A'} liters',
                  ),
                  _buildDetailItem(
                    'Fill Level',
                    '${((bin['fillLevel'] ?? 0.0) * 100).toInt()}%',
                  ),
                  _buildDetailItem('Status', bin['status'] ?? 'Unknown'),
                  _buildDetailItem(
                    'Last Emptied',
                    bin['lastEmptied'] ?? 'Never',
                  ),
                  _buildDetailItem('Installation Date', '10 Jan 2023'),
                  _buildDetailItem('Waste Type', bin['type'] ?? 'N/A'),
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
      builder:
          (context) => AlertDialog(
            title: Text('Pending Bin: ${bin['id']}'),
            content: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildDetailItem('ID', bin['id'] ?? 'N/A'),
                  _buildDetailItem('Location', bin['location'] ?? 'N/A'),
                  _buildDetailItem('Type', bin['type'] ?? 'N/A'),
                  _buildDetailItem(
                    'Capacity',
                    '${bin['capacity'] ?? 'N/A'} liters',
                  ),
                  _buildDetailItem('Status', 'Pending Approval'),
                  _buildDetailItem(
                    'Requested On',
                    bin['createdAt'] != null
                        ? '${(bin['createdAt'] as Timestamp).toDate().toString().substring(0, 10)}'
                        : 'Unknown',
                  ),
                  _buildDetailItem('Reason', bin['reason'] ?? 'Not specified'),
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
      builder:
          (context) => StatefulBuilder(
            builder:
                (context, setState) => AlertDialog(
                  title: const Text('Request Bin Emptying'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Bin ID: ${bin['id']}'),
                      Text('Location: ${bin['location']}'),
                      Text('Type: ${bin['type']}'),
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
                          if (user == null) {
                            throw Exception('User not logged in');
                          }

                          // Prepare request data
                          final requestData = {
                            'binId': bin['id'],
                            'type': bin['type'],
                            'date': selectedDate,
                            'note': noteController.text.trim(),
                            'userId': user.uid,
                            'createdAt': FieldValue.serverTimestamp(),
                          };

                          // Save request to Firestore
                          await FirebaseFirestore.instance
                              .collection('emptyingRequests')
                              .add(requestData);

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
                              content: Text('Error submitting request: $e'),
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

  void _showAddBinDialog() {
    final TextEditingController locationController = TextEditingController();
    final TextEditingController noteController = TextEditingController();
    String selectedType = 'Food Waste';
    String selectedCapacity = '120 liters';
    String selectedLocation = 'Front Yard';
    bool wantBinImmediately = false;

    showDialog(
      context: context,
      builder:
          (context) => StatefulBuilder(
            builder: (context, setState) {
              return AlertDialog(
                title: const Text('Request New Bin'),
                content: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      DropdownButtonFormField<String>(
                        decoration: const InputDecoration(
                          labelText: 'Location',
                          border: OutlineInputBorder(),
                        ),
                        value: selectedLocation,
                        items: const [
                          DropdownMenuItem(
                            value: 'Front Yard',
                            child: Text('Front Yard'),
                          ),
                          DropdownMenuItem(
                            value: 'Back Yard',
                            child: Text('Back Yard'),
                          ),
                          DropdownMenuItem(
                            value: 'Garage',
                            child: Text('Garage'),
                          ),
                          DropdownMenuItem(
                            value: 'Other',
                            child: Text('Other (Type Below)'),
                          ),
                        ],
                        onChanged: (value) {
                          setState(() {
                            selectedLocation = value!;
                            if (value != 'Other') {
                              locationController.clear();
                            }
                          });
                        },
                      ),
                      if (selectedLocation == 'Other')
                        const SizedBox(height: 8),
                      if (selectedLocation == 'Other')
                        TextField(
                          controller: locationController,
                          decoration: const InputDecoration(
                            labelText: 'Specify Location',
                            hintText: 'e.g., Rooftop',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        decoration: const InputDecoration(
                          labelText: 'Bin Type',
                          border: OutlineInputBorder(),
                        ),
                        value: selectedType,
                        items: const [
                          DropdownMenuItem(
                            value: 'Food Waste',
                            child: Text('Food Waste'),
                          ),
                          DropdownMenuItem(
                            value: 'Polythene & Plastic Waste',
                            child: Text('Polythene & Plastic Waste'),
                          ),
                          DropdownMenuItem(
                            value: 'E-Waste',
                            child: Text('E-Waste'),
                          ),
                          DropdownMenuItem(
                            value: 'Glass',
                            child: Text('Glass'),
                          ),
                          DropdownMenuItem(
                            value: 'Other Waste',
                            child: Text('Other Waste'),
                          ),
                        ],
                        onChanged: (value) {
                          setState(() {
                            selectedType = value!;
                          });
                        },
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        decoration: const InputDecoration(
                          labelText: 'Capacity',
                          border: OutlineInputBorder(),
                        ),
                        value: selectedCapacity,
                        items: const [
                          DropdownMenuItem(
                            value: '30 liters',
                            child: Text('30 liters'),
                          ),
                          DropdownMenuItem(
                            value: '60 liters',
                            child: Text('60 liters'),
                          ),
                          DropdownMenuItem(
                            value: '90 liters',
                            child: Text('90 liters'),
                          ),
                          DropdownMenuItem(
                            value: '120 liters',
                            child: Text('120 liters'),
                          ),
                          DropdownMenuItem(
                            value: '240 liters',
                            child: Text('240 liters'),
                          ),
                        ],
                        onChanged: (value) {
                          setState(() {
                            selectedCapacity = value!;
                          });
                        },
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: noteController,
                        decoration: const InputDecoration(
                          labelText: 'Reason for Request',
                          hintText: 'Why do you need this bin?',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Checkbox(
                            value: wantBinImmediately,
                            onChanged: (value) {
                              setState(() {
                                wantBinImmediately = value!;
                              });
                            },
                          ),
                          const Expanded(
                            child: Text(
                              'Want Bin Immediately',
                              style: TextStyle(fontSize: 14),
                            ),
                          ),
                        ],
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
                    onPressed: () async {
                      if (selectedLocation == 'Other' &&
                          locationController.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Please specify a location'),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }

                      try {
                        final user = FirebaseAuth.instance.currentUser;
                        if (user == null) {
                          throw Exception('User not logged in');
                        }

                        // Generate unique bin ID without slashes
                        final binCount = _bins.length + _pendingBins.length + 1;
                        final binId =
                            'BIN-${_homeNumber?.replaceAll('/', '-')}-${binCount.toString().padLeft(3, '0')}';

                        // Prepare bin data
                        final binData = {
                          'id': binId,
                          'userId': user.uid,
                          'location':
                              selectedLocation == 'Other'
                                  ? locationController.text.trim()
                                  : selectedLocation,
                          'type': selectedType,
                          'capacity': int.parse(selectedCapacity.split(' ')[0]),
                          'reason': noteController.text.trim(),
                          'wantImmediately': wantBinImmediately,
                          'fillLevel': 0.0,
                          'lastEmptied': 'Never',
                          'status': 'Pending',
                          'createdAt': FieldValue.serverTimestamp(),
                        };

                        // Save bin data to Firestore
                        await FirebaseFirestore.instance
                            .collection('binRequests')
                            .doc(binId)
                            .set(binData);

                        // Refresh the pending bins list
                        await _loadBins();

                        Navigator.of(context).pop();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'New bin request submitted successfully',
                            ),
                            backgroundColor: Colors.green,
                          ),
                        );
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Error submitting request: $e'),
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
              );
            },
          ),
    );
  }

  Widget _buildSmartBinCard(Map<String, dynamic> smartBin) {
    // Helper function to safely extract nested Firestore data
    dynamic getFirestoreValue(dynamic field) {
      if (field == null) return null;

      // Handle Firestore field format
      if (field is Map<String, dynamic>) {
        if (field.containsKey('stringValue')) return field['stringValue'];
        if (field.containsKey('doubleValue')) return field['doubleValue'];
        if (field.containsKey('integerValue')) return field['integerValue'];
        if (field.containsKey('booleanValue')) return field['booleanValue'];
        if (field.containsKey('timestampValue')) return field['timestampValue'];
        if (field.containsKey('mapValue') &&
            field['mapValue']['fields'] != null) {
          return field['mapValue']['fields'];
        }
      }
      return field;
    }

    // Extract data with proper handling of nested structures
    final fillDataRaw = smartBin['fill_data'];
    final systemDataRaw = smartBin['system'];
    final accuracyDataRaw = smartBin['accuracy'];
    final locationDataRaw = smartBin['location_data'];
    final lastEmptyRaw = smartBin['last_empty'];

    // Process nested data
    final fillData = getFirestoreValue(fillDataRaw);
    final systemData = getFirestoreValue(systemDataRaw);
    final accuracyData = getFirestoreValue(accuracyDataRaw);
    final locationData = getFirestoreValue(locationDataRaw);
    final lastEmpty = getFirestoreValue(lastEmptyRaw);

    // Extract values safely - show 0% when empty
    final fillPercentage =
        getFirestoreValue(fillData?['fill_percentage'])?.toDouble() ?? 0.0;
    final displayPercentage = fillPercentage <= 0 ? 0.0 : fillPercentage;

    final binStatus =
        getFirestoreValue(fillData?['bin_status'])?.toString() ?? 'UNKNOWN';
    final isCritical = getFirestoreValue(fillData?['is_critical']) ?? false;
    final isFull = getFirestoreValue(fillData?['is_full']) ?? false;
    final needsEmptying =
        getFirestoreValue(fillData?['needs_emptying']) ?? false;

    final sensorWorking =
        getFirestoreValue(systemData?['sensor_working']) ?? false;
    final wifiConnected =
        getFirestoreValue(systemData?['wifi_connected']) ?? false;
    final wifiRssi = getFirestoreValue(systemData?['wifi_rssi'])?.toInt() ?? 0;

    final accuracyStatus =
        getFirestoreValue(accuracyData?['status'])?.toString() ?? 'UNKNOWN';
    final readingStabilized =
        getFirestoreValue(accuracyData?['reading_stabilized']) ?? false;

    final binId =
        getFirestoreValue(smartBin['bin_id'])?.toString() ??
        smartBin['docId']?.toString() ??
        'UNKNOWN';
    final location =
        getFirestoreValue(smartBin['location'])?.toString() ??
        'Unknown Location';

    // Last empty information
    final lastEmptyTime =
        getFirestoreValue(lastEmpty?['readable_time'])?.toString() ?? 'Never';
    final hoursAgo =
        getFirestoreValue(lastEmpty?['hours_ago'])?.toDouble() ?? 0.0;

    // Timestamp
    final timestamp = getFirestoreValue(smartBin['timestamp']);
    String lastUpdate = 'Unknown';
    if (timestamp != null) {
      try {
        if (timestamp is Timestamp) {
          final date = timestamp.toDate();
          final now = DateTime.now();
          final difference = now.difference(date);
          if (difference.inMinutes < 1) {
            lastUpdate = 'Just now';
          } else if (difference.inHours < 1) {
            lastUpdate = '${difference.inMinutes}m ago';
          } else if (difference.inDays < 1) {
            lastUpdate = '${difference.inHours}h ago';
          } else {
            lastUpdate = '${difference.inDays}d ago';
          }
        } else if (timestamp is String) {
          lastUpdate = 'Recently';
        }
      } catch (e) {
        lastUpdate = 'Unknown';
      }
    }

    // Determine status color and icon
    Color statusColor;
    IconData statusIcon;
    String statusText;

    if (!sensorWorking) {
      statusColor = Colors.grey;
      statusIcon = Icons.sensors_off;
      statusText = 'OFFLINE';
    } else if (isCritical) {
      statusColor = Colors.red;
      statusIcon = Icons.warning;
      statusText = 'CRITICAL';
    } else if (isFull || needsEmptying) {
      statusColor = Colors.orange;
      statusIcon = Icons.delete;
      statusText = 'FULL';
    } else if (fillPercentage >= 70) {
      statusColor = Colors.yellow[700]!;
      statusIcon = Icons.delete_outline;
      statusText = 'HIGH';
    } else if (fillPercentage >= 50) {
      statusColor = Colors.blue;
      statusIcon = Icons.delete_outline;
      statusText = 'MEDIUM';
    } else {
      statusColor = Colors.green;
      statusIcon = Icons.delete_outline;
      statusText = 'NORMAL';
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
              // Header Section
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
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
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
                  // Status Badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: statusColor.withOpacity(0.3),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(statusIcon, size: 16, color: statusColor),
                        const SizedBox(width: 6),
                        Text(
                          statusText,
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

              // Main Content Section
              Row(
                children: [
                  // Fill Level Indicator
                  Container(
                    width: 100,
                    height: 100,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 100,
                          height: 100,
                          child: CircularProgressIndicator(
                            value: displayPercentage / 100,
                            strokeWidth: 10,
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(
                              _getFillLevelColor(displayPercentage / 100),
                            ),
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${displayPercentage.toStringAsFixed(0)}%',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: _getFillLevelColor(
                                  displayPercentage / 100,
                                ),
                              ),
                            ),
                            const Text(
                              'Full',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.black54,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 20),

                  // Information Section
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildInfoRow(
                          'Fill Level',
                          '${displayPercentage.toStringAsFixed(1)}%',
                          Icons.analytics,
                          _getFillLevelColor(displayPercentage / 100),
                        ),
                        const SizedBox(height: 12),
                        _buildInfoRow(
                          'Status',
                          binStatus,
                          statusIcon,
                          statusColor,
                        ),
                        if (hoursAgo > 0) ...[
                          const SizedBox(height: 12),
                          _buildInfoRow(
                            'Last Empty',
                            hoursAgo < 24
                                ? '${hoursAgo.toStringAsFixed(0)}h ago'
                                : '${(hoursAgo / 24).toStringAsFixed(0)}d ago',
                            Icons.restore,
                            Colors.green[600]!,
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Connection Status Row
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[200]!),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.wifi,
                          size: 18,
                          color: wifiConnected ? Colors.green : Colors.red,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          wifiConnected ? 'Connected' : 'Offline',
                          style: TextStyle(
                            fontSize: 12,
                            color: wifiConnected ? Colors.green : Colors.red,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Container(width: 1, height: 20, color: Colors.grey[300]),
                    Row(
                      children: [
                        Icon(
                          Icons.sensors,
                          size: 18,
                          color: sensorWorking ? Colors.green : Colors.red,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          sensorWorking ? 'Active' : 'Inactive',
                          style: TextStyle(
                            fontSize: 12,
                            color: sensorWorking ? Colors.green : Colors.red,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Container(width: 1, height: 20, color: Colors.grey[300]),
                    Row(
                      children: [
                        Icon(
                          Icons.access_time,
                          size: 18,
                          color: Colors.blue[600],
                        ),
                        const SizedBox(width: 6),
                        Text(
                          lastUpdate,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.blue[600],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Action Buttons Section
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: OutlinedButton.icon(
                      onPressed: () => _showSmartBinDetails(smartBin),
                      icon: const Icon(Icons.info_outline, size: 18),
                      label: const Text('Details'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        side: BorderSide(color: Colors.blue[300]!),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 3,
                    child: ElevatedButton.icon(
                      onPressed: () => _showSmartBinEmptyingDialog(smartBin),
                      icon: const Icon(Icons.calendar_today, size: 18),
                      label: const Text('Request Emptying'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            isCritical || needsEmptying
                                ? Colors.red
                                : Colors.green,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 2,
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

  Color _getAccuracyColor(String accuracy) {
    switch (accuracy.toUpperCase()) {
      case 'EXCELLENT':
        return Colors.green;
      case 'GOOD':
        return Colors.blue;
      case 'MODERATE':
        return Colors.orange;
      default:
        return Colors.red;
    }
  }

  void _showSmartBinDetails(Map<String, dynamic> smartBin) {
    // Helper function for extracting values
    dynamic getFirestoreValue(dynamic field) {
      if (field == null) return null;
      if (field is Map<String, dynamic>) {
        if (field.containsKey('stringValue')) return field['stringValue'];
        if (field.containsKey('doubleValue')) return field['doubleValue'];
        if (field.containsKey('integerValue')) return field['integerValue'];
        if (field.containsKey('booleanValue')) return field['booleanValue'];
        if (field.containsKey('mapValue') &&
            field['mapValue']['fields'] != null) {
          return field['mapValue']['fields'];
        }
      }
      return field;
    }

    final fillData = getFirestoreValue(smartBin['fill_data']);
    final systemData = getFirestoreValue(smartBin['system']);
    final lastEmpty = getFirestoreValue(smartBin['last_empty']);

    // Extract user-friendly values
    final binId =
        getFirestoreValue(smartBin['bin_id'])?.toString() ??
        smartBin['docId']?.toString() ??
        'Unknown';
    final location =
        getFirestoreValue(smartBin['location'])?.toString() ?? 'Unknown';
    final fillPercentage =
        getFirestoreValue(fillData?['fill_percentage'])?.toDouble() ?? 0.0;
    final binStatus =
        getFirestoreValue(fillData?['bin_status'])?.toString() ?? 'Unknown';
    final sensorWorking =
        getFirestoreValue(systemData?['sensor_working']) ?? false;
    final wifiConnected =
        getFirestoreValue(systemData?['wifi_connected']) ?? false;
    final hoursAgo =
        getFirestoreValue(lastEmpty?['hours_ago'])?.toDouble() ?? 0.0;

    // User-friendly status
    String userFriendlyStatus;
    if (!sensorWorking) {
      userFriendlyStatus = 'Smart bin is offline - needs technical support';
    } else if (fillPercentage >= 95) {
      userFriendlyStatus = 'Critically full - urgent emptying required';
    } else if (fillPercentage >= 85) {
      userFriendlyStatus = 'Full - should be emptied soon';
    } else if (fillPercentage >= 70) {
      userFriendlyStatus = 'Getting full - monitor closely';
    } else if (fillPercentage >= 50) {
      userFriendlyStatus = 'Half full - normal usage';
    } else {
      userFriendlyStatus = 'Low level - plenty of space available';
    }

    // Connection status
    String connectionStatus =
        wifiConnected
            ? 'Connected and working normally'
            : 'Connection issues detected';

    // Last emptied info
    String lastEmptiedInfo;
    if (hoursAgo <= 0) {
      lastEmptiedInfo = 'No record available';
    } else if (hoursAgo < 24) {
      lastEmptiedInfo = '${hoursAgo.toStringAsFixed(0)} hours ago';
    } else {
      final days = (hoursAgo / 24).toStringAsFixed(0);
      lastEmptiedInfo = '$days days ago';
    }

    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.smart_toy, color: Colors.blue[600]),
                const SizedBox(width: 8),
                const Text('Bin Information'),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildUserFriendlyDetailItem('📍 Location', location),
                  _buildUserFriendlyDetailItem('🆔 Bin ID', binId),
                  _buildUserFriendlyDetailItem(
                    '📊 Fill Level',
                    '${fillPercentage.toStringAsFixed(1)}%',
                  ),
                  _buildUserFriendlyDetailItem('🚨 Status', userFriendlyStatus),
                  _buildUserFriendlyDetailItem(
                    '📶 Connection',
                    connectionStatus,
                  ),
                  _buildUserFriendlyDetailItem(
                    '🗑️ Last Emptied',
                    lastEmptiedInfo,
                  ),

                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue[200]!),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          '💡 About Smart Bins',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.blue,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          '• Automatically monitors waste levels\n'
                          '• Updates status every 10 seconds\n'
                          '• Sends alerts when full\n'
                          '• Helps optimize collection routes',
                          style: TextStyle(fontSize: 13, color: Colors.black87),
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
              if (fillPercentage >= 70)
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _showSmartBinEmptyingDialog(smartBin);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor:
                        fillPercentage >= 85 ? Colors.red : Colors.orange,
                  ),
                  child: const Text('Request Emptying'),
                ),
            ],
          ),
    );
  }

  Widget _buildUserFriendlyDetailItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(color: Colors.black54)),
          ),
        ],
      ),
    );
  }

  void _showSmartBinAlert(Map<String, dynamic> smartBin) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.warning, color: Colors.red),
                const SizedBox(width: 8),
                const Text('Smart Bin Alert'),
              ],
            ),
            content: Text(
              'Smart bin ${smartBin['id'] ?? 'Unknown'} requires immediate attention. '
              'The bin is critically full and needs to be emptied to prevent overflow.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Acknowledge'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  // Could add functionality to notify collection service
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Alert forwarded to collection service'),
                      backgroundColor: Colors.green,
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                child: const Text('Request Collection'),
              ),
            ],
          ),
    );
  }

  void _showSmartBinEmptyingDialog(Map<String, dynamic> smartBin) {
    final TextEditingController noteController = TextEditingController();
    DateTime? selectedDate;
    TimeOfDay? selectedTime;
    String selectedPriority = 'Normal';
    String selectedCollectionType = 'Regular Collection';

    // Helper function for extracting values
    dynamic getFirestoreValue(dynamic field) {
      if (field == null) return null;
      if (field is Map<String, dynamic>) {
        if (field.containsKey('stringValue')) return field['stringValue'];
        if (field.containsKey('doubleValue')) return field['doubleValue'];
        if (field.containsKey('integerValue')) return field['integerValue'];
        if (field.containsKey('booleanValue')) return field['booleanValue'];
        if (field.containsKey('mapValue') &&
            field['mapValue']['fields'] != null) {
          return field['mapValue']['fields'];
        }
      }
      return field;
    }

    final binId =
        getFirestoreValue(smartBin['bin_id'])?.toString() ??
        smartBin['docId']?.toString() ??
        'UNKNOWN';
    final location =
        getFirestoreValue(smartBin['location'])?.toString() ??
        'Unknown Location';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder:
          (context) => StatefulBuilder(
            builder:
                (context, setState) => Container(
                  height: MediaQuery.of(context).size.height * 0.85,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 10,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Handle bar
                      Container(
                        margin: const EdgeInsets.only(top: 12),
                        height: 4,
                        width: 40,
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),

                      // Header
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.blue[50],
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                Icons.delete_outline,
                                color: Colors.blue[600],
                                size: 28,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Request Emptying',
                                    style: TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.grey[800],
                                    ),
                                  ),
                                  Text(
                                    'Schedule collection for your smart bin',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      Expanded(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Bin Information Card
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: Colors.grey[50],
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey[200]!),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Bin Details',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.grey[800],
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.location_on,
                                          size: 16,
                                          color: Colors.grey[600],
                                        ),
                                        const SizedBox(width: 8),
                                        Text('Location: $location'),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.qr_code,
                                          size: 16,
                                          color: Colors.grey[600],
                                        ),
                                        const SizedBox(width: 8),
                                        Text('Bin ID: $binId'),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.smart_toy,
                                          size: 16,
                                          color: Colors.grey[600],
                                        ),
                                        const SizedBox(width: 8),
                                        Text('Type: IoT Smart Bin'),
                                      ],
                                    ),
                                  ],
                                ),
                              ),

                              const SizedBox(height: 24),

                              // Date Selection
                              Text(
                                'Preferred Date',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey[800],
                                ),
                              ),
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
                                    builder: (context, child) {
                                      return Theme(
                                        data: Theme.of(context).copyWith(
                                          colorScheme: ColorScheme.light(
                                            primary: Colors.blue[600]!,
                                          ),
                                        ),
                                        child: child!,
                                      );
                                    },
                                  );
                                  if (pickedDate != null) {
                                    setState(() {
                                      selectedDate = pickedDate;
                                    });
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: Colors.grey[300]!,
                                    ),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.calendar_today,
                                        color: Colors.blue[600],
                                      ),
                                      const SizedBox(width: 12),
                                      Text(
                                        selectedDate != null
                                            ? '${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year}'
                                            : 'Select Date',
                                        style: TextStyle(
                                          fontSize: 16,
                                          color:
                                              selectedDate != null
                                                  ? Colors.black
                                                  : Colors.grey[600],
                                        ),
                                      ),
                                      const Spacer(),
                                      Icon(
                                        Icons.arrow_forward_ios,
                                        size: 16,
                                        color: Colors.grey[400],
                                      ),
                                    ],
                                  ),
                                ),
                              ),

                              const SizedBox(height: 20),

                              // Time Selection
                              Text(
                                'Preferred Time',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey[800],
                                ),
                              ),
                              const SizedBox(height: 8),
                              InkWell(
                                onTap: () async {
                                  final pickedTime = await showTimePicker(
                                    context: context,
                                    initialTime: TimeOfDay.now(),
                                    builder: (context, child) {
                                      return Theme(
                                        data: Theme.of(context).copyWith(
                                          colorScheme: ColorScheme.light(
                                            primary: Colors.blue[600]!,
                                          ),
                                        ),
                                        child: child!,
                                      );
                                    },
                                  );
                                  if (pickedTime != null) {
                                    setState(() {
                                      selectedTime = pickedTime;
                                    });
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: Colors.grey[300]!,
                                    ),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.access_time,
                                        color: Colors.blue[600],
                                      ),
                                      const SizedBox(width: 12),
                                      Text(
                                        selectedTime != null
                                            ? selectedTime!.format(context)
                                            : 'Select Time',
                                        style: TextStyle(
                                          fontSize: 16,
                                          color:
                                              selectedTime != null
                                                  ? Colors.black
                                                  : Colors.grey[600],
                                        ),
                                      ),
                                      const Spacer(),
                                      Icon(
                                        Icons.arrow_forward_ios,
                                        size: 16,
                                        color: Colors.grey[400],
                                      ),
                                    ],
                                  ),
                                ),
                              ),

                              const SizedBox(height: 20),

                              // Priority Selection
                              Text(
                                'Priority Level',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey[800],
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: _buildPriorityChip(
                                      'Normal',
                                      selectedPriority,
                                      Colors.green,
                                      setState,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: _buildPriorityChip(
                                      'Urgent',
                                      selectedPriority,
                                      Colors.orange,
                                      setState,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: _buildPriorityChip(
                                      'Critical',
                                      selectedPriority,
                                      Colors.red,
                                      setState,
                                    ),
                                  ),
                                ],
                              ),

                              const SizedBox(height: 20),

                              // Collection Type
                              Text(
                                'Collection Type',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey[800],
                                ),
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<String>(
                                value: selectedCollectionType,
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 16,
                                  ),
                                ),
                                items:
                                    [
                                          'Regular Collection',
                                          'Express Collection',
                                          'Eco-Friendly Collection',
                                        ]
                                        .map(
                                          (type) => DropdownMenuItem(
                                            value: type,
                                            child: Text(type),
                                          ),
                                        )
                                        .toList(),
                                onChanged: (value) {
                                  setState(() {
                                    selectedCollectionType = value!;
                                  });
                                },
                              ),

                              const SizedBox(height: 20),

                              // Special Instructions
                              Text(
                                'Special Instructions',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey[800],
                                ),
                              ),
                              const SizedBox(height: 8),
                              TextField(
                                controller: noteController,
                                maxLines: 3,
                                decoration: InputDecoration(
                                  hintText:
                                      'Any special instructions or notes...',
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  contentPadding: const EdgeInsets.all(16),
                                ),
                              ),

                              const SizedBox(height: 30),
                            ],
                          ),
                        ),
                      ),

                      // Bottom Action Buttons
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border(
                            top: BorderSide(color: Colors.grey[200]!),
                          ),
                        ),
                        child: Column(
                          children: [
                            // Summary
                            if (selectedDate != null ||
                                selectedTime != null) ...[
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.blue[50],
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.schedule,
                                      color: Colors.blue[600],
                                      size: 20,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Scheduled for ${selectedDate != null ? '${selectedDate!.day}/${selectedDate!.month}' : ''} ${selectedTime != null ? 'at ${selectedTime!.format(context)}' : ''}',
                                      style: TextStyle(
                                        color: Colors.blue[700],
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],

                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: () => Navigator.pop(context),
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 16,
                                      ),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                    child: const Text('Cancel'),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  flex: 2,
                                  child: ElevatedButton(
                                    onPressed:
                                        selectedDate != null
                                            ? () async {
                                              try {
                                                final user =
                                                    FirebaseAuth
                                                        .instance
                                                        .currentUser;
                                                if (user == null) {
                                                  throw Exception(
                                                    'User not logged in',
                                                  );
                                                }

                                                // Prepare request data
                                                final requestData = {
                                                  'binId': binId,
                                                  'binType': 'Smart Bin (IoT)',
                                                  'location': location,
                                                  'date': selectedDate,
                                                  'time': selectedTime?.format(
                                                    context,
                                                  ),
                                                  'priority': selectedPriority,
                                                  'collectionType':
                                                      selectedCollectionType,
                                                  'note':
                                                      noteController.text
                                                          .trim(),
                                                  'userId': user.uid,
                                                  'isSmartBin': true,
                                                  'status': 'pending',
                                                  'createdAt':
                                                      FieldValue.serverTimestamp(),
                                                };

                                                // Save request to Firestore
                                                await FirebaseFirestore.instance
                                                    .collection(
                                                      'emptyingRequests',
                                                    )
                                                    .add(requestData);

                                                // Send notification
                                                await NotificationService.sendEmptyingRequestNotification(
                                                  binId,
                                                  location,
                                                  user.uid,
                                                );

                                                Navigator.of(context).pop();
                                                ScaffoldMessenger.of(
                                                  context,
                                                ).showSnackBar(
                                                  SnackBar(
                                                    content: const Text(
                                                      'Emptying request submitted successfully!',
                                                    ),
                                                    backgroundColor:
                                                        Colors.green,
                                                    behavior:
                                                        SnackBarBehavior
                                                            .floating,
                                                    shape: RoundedRectangleBorder(
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            8,
                                                          ),
                                                    ),
                                                  ),
                                                );
                                              } catch (e) {
                                                ScaffoldMessenger.of(
                                                  context,
                                                ).showSnackBar(
                                                  SnackBar(
                                                    content: Text(
                                                      'Error submitting request: $e',
                                                    ),
                                                    backgroundColor: Colors.red,
                                                    behavior:
                                                        SnackBarBehavior
                                                            .floating,
                                                  ),
                                                );
                                              }
                                            }
                                            : null,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.blue[600],
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 16,
                                      ),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      elevation: 0,
                                    ),
                                    child: const Text(
                                      'Submit Request',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
          ),
    );
  }

  Widget _buildPriorityChip(
    String priority,
    String selectedPriority,
    Color color,
    StateSetter setState,
  ) {
    final bool isSelected = selectedPriority == priority;
    return GestureDetector(
      onTap: () {
        setState(() {
          selectedPriority = priority;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.1) : Colors.grey[50],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? color : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(
              priority == 'Normal'
                  ? Icons.schedule
                  : priority == 'Urgent'
                  ? Icons.priority_high
                  : Icons.warning,
              color: isSelected ? color : Colors.grey[600],
              size: 20,
            ),
            const SizedBox(height: 4),
            Text(
              priority,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                color: isSelected ? color : Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FillLevelPainter extends CustomPainter {
  final double fillLevel;
  final Color fillColor;

  _FillLevelPainter({required this.fillLevel, required this.fillColor});

  @override
  void paint(Canvas canvas, Size size) {
    final paintOutline =
        Paint()
          ..color = Colors.grey.withOpacity(0.3)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 10.0;

    final paintFill =
        Paint()
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

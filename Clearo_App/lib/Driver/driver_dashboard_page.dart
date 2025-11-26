import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../login_page.dart';
import 'route_map_screen.dart';
import 'driver_history_page.dart';
import 'driver_reports_page.dart';
import 'driver_settings_page.dart';
import 'driver_profile_page.dart';
import 'driver_help_support_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DriverDashboardPage extends StatefulWidget {
  final String driverName;
  final String selectedLanguage; // Add this

  const DriverDashboardPage({
    Key? key,
    required this.driverName,
    this.selectedLanguage = 'English', // Default to English
  }) : super(key: key);

  @override
  State<DriverDashboardPage> createState() => _DriverDashboardPageState();
}

// New: named route constant
const String driverDashboardRouteName = '/driverDashboard';

// New: route builder to use from login or router
Route<dynamic> driverDashboardRouteWithName(String driverName,
    {String selectedLanguage = 'English'}) {
  return MaterialPageRoute(
    settings: const RouteSettings(name: driverDashboardRouteName),
    builder: (_) => DriverDashboardPage(
        driverName: driverName, selectedLanguage: selectedLanguage),
  );
}

// New: helper to navigate from the login screen (replaces login page)
Future<void> navigateDriverDashboardFromLogin(
    BuildContext context, String driverName,
    {String selectedLanguage = 'English'}) {
  return Navigator.of(context).pushReplacement(
    driverDashboardRouteWithName(driverName,
        selectedLanguage: selectedLanguage),
  );
}

class _DriverDashboardPageState extends State<DriverDashboardPage> {
  String employeeNumber = '';
  String truckStatus = 'Idle';
  int truckCapacity = 0;
  List<Map<String, dynamic>> pickups = [];
  List<Map<String, dynamic>> notifications = [];
  List<String> pickupDocIds = [];
  bool isLoading = true;
  int completedPickupsToday = 0;
  late String _formattedDate;

  // Vehicle selection variables
  List<Map<String, dynamic>> availableVehicles = [];
  String? selectedVehicleId;
  Map<String, dynamic>? selectedVehicleData;
  bool isLoadingVehicles = false;

  // Auth instance for logout
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Today's schedule variables
  List<Map<String, dynamic>> todaysSchedule = [];
  bool isLoadingSchedule = false;

  late String _language;

  @override
  void initState() {
    super.initState();
    _language = widget.selectedLanguage;
    _formattedDate = _getFormattedDate();
    _persistLanguage();
    _initPage();
  }

  // Save the selected language to SharedPreferences for session persistence
  Future<void> _persistLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('driverLanguage', _language);
  }

  // Load language if needed (for other navigation, e.g., settings)
  Future<void> _loadPersistedLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    final lang = prefs.getString('driverLanguage');
    if (lang != null && lang != _language) {
      setState(() {
        _language = lang;
      });
    }
  }

  // Load vehicles -> driver data -> schedule in order
  Future<void> _initPage() async {
    await _loadAvailableVehicles();
    await _loadDriverData();
    await _loadTodaysSchedule();
  }

  // Load available vehicles from Firestore
  Future<void> _loadAvailableVehicles() async {
    setState(() {
      isLoadingVehicles = true;
    });

    try {
      final vehiclesQuery =
          await FirebaseFirestore.instance.collection('vehicles').get();

      availableVehicles = vehiclesQuery.docs.map((doc) {
        final data = doc.data();
        return {
          'id': doc.id,
          'vehicleNumber': data['vehicleNumber'] ?? 'N/A',
          'vehicleType': data['vehicleType'] ?? 'Unknown',
          'model': data['model'] ?? 'Unknown',
          'year': data['year']?.toString() ?? 'N/A',
          'licensePlate': data['licensePlate'] ?? 'N/A',
          'capacity': data['capacity'] ?? 'N/A',
          'fuelCapacity': data['fuelCapacity']?.toString() ?? 'N/A',
          'fuelEfficiency': data['fuelEfficiency']?.toString() ?? 'N/A',
          'maxSpeed': data['maxSpeed']?.toString() ?? 'N/A',
          'mileage': data['mileage']?.toString() ?? 'N/A',
          'engineType': data['engineType'] ?? 'N/A',
          'status': data['status'] ?? 'Available',
          'currentDriver': data['currentDriver'] ?? '',
          'lastMaintenance': data['lastMaintenance'] ?? 'N/A',
        };
      }).toList();

      // Set selected vehicle if already assigned to this driver
      final assignedVehicle = availableVehicles.firstWhere(
        (v) => v['currentDriver'] == widget.driverName,
        orElse: () => {},
      );
      if (assignedVehicle.isNotEmpty) {
        selectedVehicleId = assignedVehicle['id'];
        selectedVehicleData = assignedVehicle;
      } else {
        selectedVehicleId = null;
        selectedVehicleData = null;
      }
    } catch (e) {
      print('Error loading vehicles: $e');
      availableVehicles = [];
      selectedVehicleId = null;
      selectedVehicleData = null;
    }

    setState(() {
      isLoadingVehicles = false;
    });
  }

  // Format date without using the intl package
  String _getFormattedDate() {
    final now = DateTime.now();
    final weekdays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    final weekday = weekdays[now.weekday - 1]; // weekday is 1-7 in DateTime
    final month = months[now.month - 1]; // month is 1-12 in DateTime
    final day = now.day;
    final year = now.year;

    return '$weekday, $month $day, $year';
  }

  // Show notifications in a bottom sheet
  void _openNotifications() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) {
        return SafeArea(
          child: Container(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Notifications',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (notifications.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(20.0),
                    child: Text(
                      'No notifications',
                      style: TextStyle(color: Colors.grey),
                    ),
                  )
                else
                  Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: notifications.length,
                      separatorBuilder: (_, __) => const Divider(),
                      itemBuilder: (_, i) {
                        final notif = notifications[i];
                        return ListTile(
                          leading: const Icon(
                            Icons.notifications,
                            color: Colors.orange,
                          ),
                          title: Text(notif['title'] ?? 'Notification'),
                          subtitle: Text(notif['message'] ?? ''),
                          trailing: notif['createdAt'] is Timestamp
                              ? Text(
                                  _formatTime(
                                    (notif['createdAt'] as Timestamp).toDate(),
                                  ),
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey,
                                  ),
                                )
                              : null,
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _logout() async {
    await _auth.signOut();
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const LoginPage()),
      );
    }
  }

  Future<void> _loadDriverData() async {
    setState(() {
      isLoading = true;
    });

    try {
      // Fetch driver details
      final driverQuery = await FirebaseFirestore.instance
          .collection('drivers')
          .where('name', isEqualTo: widget.driverName)
          .limit(1)
          .get();

      if (driverQuery.docs.isNotEmpty) {
        final data = driverQuery.docs.first.data();
        employeeNumber = data['employeeNumber'] ??
            'DRV-${widget.driverName.substring(0, 3).toUpperCase()}001';
        truckStatus = data['status'] ?? 'Idle';
        truckCapacity = data['truckCapacity'] ?? 1000;
      }

      // Fetch today's pickups assigned to this driver
      final today = DateTime.now();
      final todayStr =
          "${today.year.toString().padLeft(4, '0')}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}";
      final pickupsQuery = await FirebaseFirestore.instance
          .collection('pickups')
          .where('driverName', isEqualTo: widget.driverName)
          .where('date', isEqualTo: todayStr)
          .get();

      pickups = pickupsQuery.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return {...data, 'docId': doc.id};
      }).toList();

      pickupDocIds = pickupsQuery.docs.map((doc) => doc.id).toList();

      // Count completed pickups
      completedPickupsToday =
          pickups.where((pickup) => pickup['status'] == 'Completed').length;

      // Fetch notifications and check for urgent bin alerts
      final notificationsQuery = await FirebaseFirestore.instance
          .collection('driver_notifications')
          .where('driverName', isEqualTo: widget.driverName)
          .orderBy('createdAt', descending: true)
          .limit(5)
          .get();

      notifications = notificationsQuery.docs
          .map((doc) => doc.data() as Map<String, dynamic>)
          .toList();

      // Check for critical bin full notifications from user_notifications
      final binFullNotifications = await FirebaseFirestore.instance
          .collection('user_notifications')
          .where('type', isEqualTo: 'bin_full')
          .where('priority', isEqualTo: 'high')
          .where('isRead', isEqualTo: false)
          .limit(10)
          .get();

      // Add urgent bin notifications to driver notifications
      for (var doc in binFullNotifications.docs) {
        final data = doc.data();
        notifications.add({
          'title': 'Urgent: ${data['title']}',
          'message': '${data['message']} - Location: ${data['location']}',
          'type': 'bin_full_alert',
          'priority': 'high',
          'binId': data['binId'],
          'location': data['location'],
          'fillPercentage': data['fillPercentage'],
          'createdAt': data['createdAt'],
        });
      }

      // Sort notifications by priority and time
      notifications.sort((a, b) {
        // High priority first
        if (a['priority'] == 'high' && b['priority'] != 'high') return -1;
        if (b['priority'] == 'high' && a['priority'] != 'high') return 1;

        // Then by time (newest first)
        final aTime = a['createdAt'] as Timestamp?;
        final bTime = b['createdAt'] as Timestamp?;
        if (aTime != null && bTime != null) {
          return bTime.compareTo(aTime);
        }
        return 0;
      });
    } catch (e) {
      print('Error loading driver data: $e');
    }

    setState(() {
      isLoading = false;
    });
  }

  // Load today's schedule with times
  Future<void> _loadTodaysSchedule() async {
    setState(() {
      isLoadingSchedule = true;
    });

    try {
      final now = DateTime.now();
      final todayStr =
          "${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
      final today = DateTime.now();

      // Read from 'schedules' collection
      final scheduleQuery = await FirebaseFirestore.instance
          .collection('schedules')
          .where('date', isEqualTo: todayStr)
          .get();

      todaysSchedule = scheduleQuery.docs.map((doc) {
        final data = doc.data();
        final timeSlot = (data['timeSlot'] ?? '').toString();
        return {
          'id': doc.id,
          'roadId': (data['roadId'] ?? '').toString(),
          'roadName': (data['roadName'] ?? 'Unknown Road').toString(),
          'date': (data['date'] ?? todayStr).toString(),
          'timeSlot': timeSlot,
          'wasteType': (data['wasteType'] ?? 'General').toString(),
          'status': (data['status'] ?? 'Scheduled').toString(),
          'createdAt': data['createdAt'],
          // NEW: timestamp mentions
          'startedAt': data['startedAt'],
          'completedAt': data['completedAt'],
          // derived
          'estimatedDuration': _durationFromTimeSlotMinutes(timeSlot),
          // legacy keys kept empty
          'binId': '',
          'location': '',
          'notes': '',
        };
      }).toList();

      // Sort by start time of the slot, fallback to createdAt
      todaysSchedule.sort((a, b) {
        final aStart = _startDateTimeFromTimeSlot(a['timeSlot']);
        final bStart = _startDateTimeFromTimeSlot(b['timeSlot']);
        if (aStart != null && bStart != null) {
          return aStart.compareTo(bStart);
        }
        final aTs = a['createdAt'] is Timestamp
            ? (a['createdAt'] as Timestamp).toDate()
            : DateTime.fromMillisecondsSinceEpoch(0);
        final bTs = b['createdAt'] is Timestamp
            ? (b['createdAt'] as Timestamp).toDate()
            : DateTime.fromMillisecondsSinceEpoch(0);
        return aTs.compareTo(bTs);
      });

      // Fallback if no records
      if (todaysSchedule.isEmpty) {
        await _createDefaultSchedule();
      }
    } catch (e) {
      print('Error loading schedule: $e');
      await _createDefaultSchedule();
    }

    setState(() {
      isLoadingSchedule = false;
    });
  }

  // Update schedule item status (now updates 'schedules' collection + timestamps)
  Future<void> _updateScheduleStatus(
    String scheduleId,
    String newStatus,
  ) async {
    try {
      Map<String, dynamic> updates = {'status': newStatus};
      if (newStatus == 'In Progress') {
        updates['startedAt'] = FieldValue.serverTimestamp();
      } else if (newStatus == 'Completed') {
        updates['completedAt'] = FieldValue.serverTimestamp();
      }

      if (!scheduleId.startsWith('temp_') &&
          !scheduleId.startsWith('default_')) {
        await FirebaseFirestore.instance
            .collection('schedules')
            .doc(scheduleId)
            .update(updates);
      }

      setState(() {
        final index = todaysSchedule.indexWhere(
          (item) => item['id'] == scheduleId,
        );
        if (index != -1) {
          todaysSchedule[index]['status'] = newStatus;
          if (newStatus == 'In Progress') {
            todaysSchedule[index]['startedAt'] = Timestamp.fromDate(
              DateTime.now(),
            );
          } else if (newStatus == 'Completed') {
            todaysSchedule[index]['completedAt'] = Timestamp.fromDate(
              DateTime.now(),
            );
          }
        }
      });

      // optional: ensure persisted view on reload
      await _loadTodaysSchedule();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Schedule updated to $newStatus'),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update schedule: $e'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  // Format date for display in schedule
  String _formatScheduleDate(DateTime date) {
    final now = DateTime.now();
    if (date.year == now.year &&
        date.month == now.month &&
        date.day == now.day) {
      return 'Today';
    } else if (date.year == now.year &&
        date.month == now.month &&
        date.day == now.day + 1) {
      return 'Tomorrow';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  // Helpers to parse timeSlot like "12:00 PM - 2:00 PM"
  DateTime? _startDateTimeFromTimeSlot(String? timeSlot) {
    if (timeSlot == null || timeSlot.isEmpty) return null;
    final parts = timeSlot.split('-');
    if (parts.isEmpty) return null;
    final start = parts.first.trim();
    return _parse12hToTodayDateTime(start);
  }

  int _durationFromTimeSlotMinutes(String? timeSlot) {
    try {
      if (timeSlot == null || timeSlot.isEmpty) return 0;
      final parts = timeSlot.split('-');
      if (parts.length != 2) return 0;
      final start = _parse12hToTodayDateTime(parts[0].trim());
      final end = _parse12hToTodayDateTime(parts[1].trim());
      if (start == null || end == null) return 0;
      final diff = end.difference(start).inMinutes;
      return diff > 0 ? diff : 0;
    } catch (_) {
      return 0;
    }
  }

  DateTime? _parse12hToTodayDateTime(String t) {
    // Supports "H:MM AM" or "HH:MM PM"
    final reg = RegExp(
      r'^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$',
      caseSensitive: false,
    );
    final m = reg.firstMatch(t);
    if (m == null) return null;
    var h = int.parse(m.group(1)!);
    final min = int.parse(m.group(2)!);
    final ampm = m.group(3)!.toUpperCase();
    if (ampm == 'PM' && h != 12) h += 12;
    if (ampm == 'AM' && h == 12) h = 0;
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day, h, min);
  }

  // New: format only the start time label for the left column ("8:00 AM")
  String _startLabelFromTimeSlot(String? timeSlot) {
    final dt = _startDateTimeFromTimeSlot(timeSlot);
    if (dt == null) {
      final raw = (timeSlot ?? '').split('-').first.trim();
      return raw.isEmpty ? '--:--' : raw;
    }
    int h12 = dt.hour % 12;
    if (h12 == 0) h12 = 12;
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    final mm = dt.minute.toString().padLeft(2, '0');
    return '$h12:$mm $ampm';
  }

  bool _isTimeSlotPassed(String? timeSlot) {
    final start = _startDateTimeFromTimeSlot(timeSlot);
    if (start == null) return false;
    return DateTime.now().isAfter(start);
  }

  Color _getWasteTypeColor(String wt) {
    switch (wt.toLowerCase()) {
      case 'food waste':
      case 'organic':
        return Colors.orange;
      case 'recyclable':
      case 'recycling':
        return Colors.green;
      case 'paper':
        return Colors.brown;
      case 'mixed':
        return Colors.blueGrey;
      default:
        return Colors.blue;
    }
  }

  Future<void> _updatePickupStatus(String docId, String status) async {
    try {
      await FirebaseFirestore.instance.collection('pickups').doc(docId).update({
        'status': status,
      });

      // Reload data to reflect changes
      await _loadDriverData();
      // Also refresh schedule to reflect updated statuses
      await _loadTodaysSchedule();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Pickup marked as $status'),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update pickup status: $e'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Completed':
        return Colors.green;
      case 'In Progress':
        return Colors.blue;
      case 'Pending':
        return Colors.orange;
      case 'Idle':
        return Colors.grey;
      case 'In Route':
        return Colors.blueAccent;
      case 'Maintenance':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'Completed':
        return Icons.check_circle;
      case 'In Progress':
        return Icons.refresh;
      case 'Pending':
        return Icons.access_time;
      case 'Idle':
        return Icons.pause_circle;
      case 'In Route':
        return Icons.directions_car;
      case 'Maintenance':
        return Icons.build;
      default:
        return Icons.help;
    }
  }

  // Get priority color
  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return Colors.red;
      case 'normal':
        return Colors.blue;
      case 'low':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  // Get waste type icon
  IconData _getWasteTypeIcon(String wasteType) {
    switch (wasteType.toLowerCase()) {
      case 'organic':
        return Icons.eco;
      case 'recyclable':
        return Icons.recycling;
      case 'paper':
        return Icons.description;
      case 'mixed':
        return Icons.category;
      default:
        return Icons.delete;
    }
  }

  // Check if time has passed
  bool _isTimePassed(String scheduledTime) {
    try {
      final now = DateTime.now();
      final timeParts = scheduledTime.split(':');
      final scheduleTime = DateTime(
        now.year,
        now.month,
        now.day,
        int.parse(timeParts[0]),
        int.parse(timeParts[1]),
      );
      return now.isAfter(scheduleTime);
    } catch (e) {
      return false;
    }
  }

  // Add this method to handle truck status changes
  Future<void> _changeTruckStatus(String newStatus) async {
    setState(() {
      truckStatus = newStatus;
    });
    try {
      // Update the driver's status in Firestore
      final driverQuery = await FirebaseFirestore.instance
          .collection('drivers')
          .where('name', isEqualTo: widget.driverName)
          .limit(1)
          .get();

      if (driverQuery.docs.isNotEmpty) {
        await driverQuery.docs.first.reference.update({'status': newStatus});
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Truck status updated to $newStatus'),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update truck status: $e'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  // Helper for localized text
  String t(String en, {String? si}) {
    if (_language == 'Sinhala' && si != null) return si;
    return en;
  }

  @override
  Widget build(BuildContext context) {
    // Optionally reload language at build (if settings page can change language)
    // await _loadPersistedLanguage(); // Not needed if only set at login
    return Scaffold(
      backgroundColor: const Color(0xFFF0F8FF), // Very light blue background
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(70),
        child: AppBar(
          automaticallyImplyLeading: false, // Remove default hamburger menu
          backgroundColor: Colors.transparent,
          flexibleSpace: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Color.fromARGB(255, 210, 230, 250), // Light blue
                  Color.fromARGB(255, 220, 240, 255), // Softer blue
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          title: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color.fromARGB(
                    255,
                    240,
                    248,
                    255,
                  ), // Light blue circle
                ),
                child: IconButton(
                  icon: const Icon(
                    Icons.menu,
                    color: Color(0xFF1976D2), // Blue menu icon
                    size: 24,
                  ),
                  tooltip: 'Menu',
                  onPressed: _showMenuBar,
                ),
              ),
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [
                      Color(0xFF42A5F5),
                      Color(0xFF1E88E5),
                    ], // Blue gradient
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Icon(
                  Icons.eco,
                  color: Colors.white, // White eco icon
                  size: 24,
                ),
              ),
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xFFE3F2FD), // Light blue circle
                ),
                child: IconButton(
                  icon: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      const Icon(
                        Icons.notifications_active,
                        color: Color(0xFF1976D2), // Blue bell icon
                        size: 24,
                      ),
                      if (notifications.isNotEmpty)
                        Positioned(
                          right: -2,
                          top: -2,
                          child: Container(
                            padding: const EdgeInsets.all(2),
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
                                notifications.length > 99
                                    ? '99+'
                                    : notifications.length.toString(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  tooltip: 'Notifications',
                  onPressed: _openNotifications,
                ),
              ),
            ],
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(4),
            child: Container(
              height: 4,
              decoration: const BoxDecoration(
                color: Colors.transparent,
                boxShadow: [
                  BoxShadow(
                    color: Color.fromARGB(
                      66,
                      100,
                      150,
                      200,
                    ), // Subtle blue shadow
                    blurRadius: 2,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      body: isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF42A5F5)),
            )
          : RefreshIndicator(
              onRefresh: () async {
                await _loadDriverData();
                await _loadTodaysSchedule();
              },
              color: const Color(0xFF42A5F5),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildModernWelcomeBar(),
                    const SizedBox(height: 24),
                    _buildVehicleSelectionBar(),
                    const SizedBox(height: 24),
                    _buildTodaysScheduleSection(),
                    const SizedBox(height: 24),
                    Text(
                      t('Today\'s Overview', si: 'අද දින සාරාංශය'),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color.fromARGB(221, 25, 118, 210),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatCard(
                            title: t('Total Pickups', si: 'මුළු එකතු කිරීම්'),
                            value: pickups.length.toString(),
                            icon: Icons.list_alt,
                            color: Colors.blue,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildStatCard(
                            title: t('Completed', si: 'සම්පූර්ණයි'),
                            value: completedPickupsToday.toString(),
                            icon: Icons.check_circle,
                            color: Colors.green,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatCard(
                            title: t('Truck Capacity', si: 'ට්‍රක් ධාරිතාවය'),
                            value: '$truckCapacity kg',
                            icon: Icons.local_shipping,
                            color: Colors.orange,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Card(
                            elevation: 2,
                            color: const Color(
                              0xFFF0F8FF,
                            ), // Very light blue background
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.circle,
                                        color: _getStatusColor(truckStatus),
                                        size: 16,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Status',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  DropdownButton<String>(
                                    value: truckStatus,
                                    isExpanded: true,
                                    items: ['Idle', 'In Route', 'Maintenance']
                                        .map(
                                          (status) => DropdownMenuItem(
                                            value: status,
                                            child: Text(status),
                                          ),
                                        )
                                        .toList(),
                                    onChanged: (val) {
                                      if (val != null) _changeTruckStatus(val);
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    if (notifications.isNotEmpty) ...[
                      Row(
                        children: [
                          Text(
                            t('Notifications', si: 'දැනුම්දීම්'),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Badge(
                            label: Text(notifications.length.toString()),
                            backgroundColor: Colors.red,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ...notifications.map(
                        (notif) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          elevation: 1,
                          color: const Color(
                            0xFFF0F8FF,
                          ), // Very light blue background
                          child: ListTile(
                            leading: const Icon(
                              Icons.notifications_active,
                              color: Colors.orange,
                            ),
                            title: Text(notif['title'] ?? 'Notification'),
                            subtitle: Text(notif['message'] ?? ''),
                            trailing: Text(
                              notif['createdAt'] != null &&
                                      notif['createdAt'] is Timestamp
                                  ? _formatTime(
                                      (notif['createdAt'] as Timestamp)
                                          .toDate(),
                                    )
                                  : '',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                    Text(
                      t('Today\'s Pickups', si: 'අද දින එකතු කිරීම්'),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (pickups.isEmpty)
                      Card(
                        color: const Color(
                          0xFFF0F8FF,
                        ), // Very light blue background
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            children: [
                              Icon(
                                Icons.emoji_transportation,
                                size: 48,
                                color: Colors.grey[400],
                              ),
                              const SizedBox(height: 12),
                              const Text(
                                'No pickups scheduled for today',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: Colors.grey,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      Column(
                        children: pickups.map((pickup) {
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            elevation: 2,
                            color: const Color(
                              0xFFF0F8FF,
                            ), // Very light blue background
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              leading: Container(
                                width: 50,
                                height: 50,
                                decoration: BoxDecoration(
                                  color: _getStatusColor(
                                    pickup['status'] ?? 'Pending',
                                  ).withOpacity(0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  _getStatusIcon(
                                    pickup['status'] ?? 'Pending',
                                  ),
                                  color: _getStatusColor(
                                    pickup['status'] ?? 'Pending',
                                  ),
                                ),
                              ),
                              title: Text(
                                'Bin: ${pickup['binId'] ?? 'N/A'}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text(
                                    'Location: ${pickup['location'] ?? 'Unknown'}',
                                  ),
                                  const SizedBox(height: 4),
                                  Chip(
                                    label: Text(
                                      pickup['status'] ?? 'Pending',
                                      style: TextStyle(
                                        color: _getStatusColor(
                                          pickup['status'] ?? 'Pending',
                                        ),
                                        fontSize: 12,
                                      ),
                                    ),
                                    backgroundColor: _getStatusColor(
                                      pickup['status'] ?? 'Pending',
                                    ).withOpacity(0.1),
                                  ),
                                ],
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (pickup['status'] != 'Completed')
                                    IconButton(
                                      icon: const Icon(
                                        Icons.check_circle,
                                        color: Colors.green,
                                      ),
                                      tooltip: 'Mark Complete',
                                      onPressed: () => _updatePickupStatus(
                                        pickup['docId'],
                                        'Completed',
                                      ),
                                    ),
                                  IconButton(
                                    icon: const Icon(
                                      Icons.report_problem,
                                      color: Colors.orange,
                                    ),
                                    tooltip: 'Report Issue',
                                    onPressed: () => _reportBinIssue(
                                      pickup['binId'] ?? '',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    const SizedBox(height: 24),
                    Text(
                      t('Quick Actions', si: 'ඉක්මන් ක්‍රියා'),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    GridView(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 1.5,
                      ),
                      children: [
                        _buildActionCard(
                          icon: Icons.map,
                          title: 'Route Map',
                          color: Colors.blue,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const RouteMapScreen(),
                              ),
                            );
                          },
                        ),
                        _buildActionCard(
                          icon: Icons.history,
                          title: 'History',
                          color: Colors.purple,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const DriverHistoryPage(),
                              ),
                            );
                          },
                        ),
                        _buildActionCard(
                          icon: Icons.report,
                          title: 'Reports',
                          color: Colors.orange,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const DriverReportsPage(),
                              ),
                            );
                          },
                        ),
                        _buildActionCard(
                          icon: Icons.settings,
                          title: 'Settings',
                          color: Colors.grey,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const DriverSettingsPage(),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  void _showMenuBar() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFE3F2FD), Colors.white],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header with app branding
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF42A5F5), Color(0xFF1E88E5)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.vertical(
                    top: Radius.circular(20),
                  ),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 25,
                      backgroundColor: const Color.fromARGB(
                        255,
                        227,
                        244,
                        255,
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          const Icon(
                            Icons.eco,
                            color: Color(0xFF1976D2),
                            size: 40,
                          ),
                          Positioned(
                            bottom: -1,
                            right: 1,
                            child: Icon(
                              Icons.local_shipping,
                              color: const Color.fromARGB(
                                255,
                                73,
                                197,
                                254,
                              ),
                              size: 20,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text(
                            'Clea~Ro Go',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              letterSpacing: 0.5,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Text(
                            'Menu Bar',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                              fontStyle: FontStyle.italic,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              // Scrollable menu items
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildMenuListTile(
                        Icons.dashboard,
                        'Dashboard',
                        Colors.blue,
                        () => Navigator.pop(context),
                      ),
                      _buildMenuListTile(
                        Icons.person_outline,
                        'My Profile',
                        Colors.green,
                        () {
                          Navigator.pop(context);
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => DriverProfilePage(
                                driverName: widget.driverName,
                              ),
                            ),
                          );
                        },
                      ),
                      _buildMenuListTile(
                        Icons.history,
                        'Pickup History',
                        Colors.purple,
                        () {
                          Navigator.pop(context);
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const DriverHistoryPage(),
                            ),
                          );
                        },
                      ),
                      _buildMenuListTile(
                        Icons.assessment,
                        'Performance Reports',
                        Colors.orange,
                        () {
                          Navigator.pop(context);
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const DriverReportsPage(),
                            ),
                          );
                        },
                      ),
                      _buildMenuListTile(
                        Icons.route,
                        'Route Navigation',
                        Colors.indigo,
                        () {
                          Navigator.pop(context);
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const RouteMapScreen(),
                            ),
                          );
                        },
                      ),
                      _buildMenuListTile(
                        Icons.settings,
                        'Settings',
                        Colors.grey,
                        () {
                          Navigator.pop(context);
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const DriverSettingsPage(),
                            ),
                          );
                        },
                      ),
                      _buildMenuListTile(
                        Icons.support_agent,
                        'Help & Support',
                        Colors.teal,
                        () {
                          Navigator.pop(context);
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const DriverHelpSupportPage(),
                            ),
                          );
                        },
                      ),
                      const Divider(
                        color: Colors.grey,
                        thickness: 1,
                        height: 20,
                      ),
                      _buildMenuListTile(
                        Icons.logout,
                        'Logout',
                        Colors.red,
                        () {
                          Navigator.pop(context);
                          _logout();
                        },
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuListTile(
    IconData icon,
    String title,
    Color color,
    VoidCallback onTap,
  ) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
      title: Text(
        title,
        style: const TextStyle(
          fontWeight: FontWeight.w500,
          color: Color(0xFF0D47A1),
        ),
      ),
      trailing: const Icon(Icons.chevron_right, color: Colors.grey),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
    );
  }

  void _showSettingsDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Row(
          children: [
            Icon(Icons.settings, color: Color(0xFF42A5F5)),
            SizedBox(width: 8),
            Text('Settings'),
          ],
        ),
        content: const Text(
          'Driver settings allow you to customize your experience, manage notifications, and update your preferences.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text(
              'Close',
              style: TextStyle(color: Color(0xFF42A5F5)),
            ),
          ),
        ],
      ),
    );
  }

  void _showSupportDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Row(
          children: [
            Icon(Icons.support_agent, color: Color(0xFF42A5F5)),
            SizedBox(width: 8),
            Text('Support Contact'),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('📞 Emergency: +94-112-911-119'),
            SizedBox(height: 8),
            Text('📧 Email: driver-support@clearo.lk'),
            SizedBox(height: 8),
            Text('💬 WhatsApp: +94-77-123-4567'),
            SizedBox(height: 8),
            Text('🕒 Available 24/7'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text(
              'Close',
              style: TextStyle(color: Color(0xFF42A5F5)),
            ),
          ),
        ],
      ),
    );
  }

  /// Modern welcome bar matching main dashboard style
  Widget _buildModernWelcomeBar() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color.fromARGB(255, 201, 227, 249), // Light blue
            Color.fromARGB(255, 225, 245, 255), // Softer blue
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(25), // Rounded corners
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: Colors.white.withOpacity(0.4), // Subtle border
          width: 2,
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: const Color(0xFF42A5F5).withOpacity(0.2),
            radius: 30,
            child: const Icon(
              Icons.local_shipping,
              size: 30,
              color: Color(0xFF0D47A1),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t('Welcome, ${widget.driverName}!',
                      si: 'ආයුබෝවන්, ${widget.driverName}!'),
                  style: const TextStyle(
                    color: Color(0xFF0D47A1),
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  t('Today is $_formattedDate', si: 'අද දිනය $_formattedDate'),
                  style: const TextStyle(
                    color: Color.fromARGB(255, 25, 118, 210),
                    fontSize: 16,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  employeeNumber,
                  style: const TextStyle(
                    color: Color.fromARGB(255, 25, 118, 210),
                    fontSize: 16,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      elevation: 2,
      color: const Color.fromARGB(
        255,
        233,
        244,
        253,
      ), // Very light blue background
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime date) {
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  Widget _buildActionCard({
    required IconData icon,
    required String title,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      color: const Color.fromARGB(
        255,
        226,
        240,
        252,
      ), // Very light blue background
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 30, color: color),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Vehicle selection bar widget
  Widget _buildVehicleSelectionBar() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color.fromARGB(255, 230, 240, 255), // Light blue
            Color.fromARGB(255, 240, 248, 255), // Softer blue
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(25),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withOpacity(0.15),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: Colors.white.withOpacity(0.5), width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF1976D2).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.local_shipping,
                  color: Color(0xFF1976D2),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Today\'s Vehicle Assignment',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0D47A1),
                  ),
                ),
              ),
              if (selectedVehicleData != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green.withOpacity(0.3)),
                  ),
                  child: const Text(
                    'Assigned',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (selectedVehicleData != null) ...[
            // Display selected vehicle info with enhanced design
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.white, Colors.blue.shade50],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: const Color(0xFF42A5F5).withOpacity(0.3),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.blue.withOpacity(0.1),
                    blurRadius: 6,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF42A5F5).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          selectedVehicleData!['vehicleType']
                                      ?.toLowerCase()
                                      .contains('dump') ==
                                  true
                              ? Icons.local_shipping
                              : selectedVehicleData!['vehicleType']
                                          ?.toLowerCase()
                                          .contains('compact') ==
                                      true
                                  ? Icons.fire_truck
                                  : Icons.agriculture,
                          color: const Color(0xFF1976D2),
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              selectedVehicleData!['vehicleNumber'] ?? 'N/A',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0D47A1),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              selectedVehicleData!['vehicleType'] ?? 'N/A',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF1976D2),
                              ),
                            ),
                            Text(
                              selectedVehicleData!['model'] ?? 'Standard Model',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: _releaseVehicleAssignment,
                        icon: const Icon(Icons.close, color: Colors.red),
                        tooltip: 'Release Vehicle',
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.red.withOpacity(0.1),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Vehicle specifications
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: _buildVehicleSpec(
                            Icons.scale,
                            'Capacity',
                            '${selectedVehicleData!['capacity']} kg',
                            Colors.orange,
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 40,
                          color: Colors.grey.shade300,
                        ),
                        Expanded(
                          child: _buildVehicleSpec(
                            Icons.local_gas_station,
                            'Fuel',
                            '${selectedVehicleData!['fuelCapacity']}L',
                            Colors.blue,
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 40,
                          color: Colors.grey.shade300,
                        ),
                        Expanded(
                          child: _buildVehicleSpec(
                            Icons.speed,
                            'Efficiency',
                            '${selectedVehicleData!['fuelEfficiency']} km/l',
                            Colors.green,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            // Simple vehicle selection dropdown
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.9),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: const Color(0xFF42A5F5).withOpacity(0.2),
                  width: 1,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.orange.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.assignment,
                          color: Colors.orange,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        'Select Your Vehicle for Today',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF0D47A1),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (isLoadingVehicles)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(20),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else if (availableVehicles.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.warning, color: Colors.orange),
                              SizedBox(width: 8),
                              Text(
                                'No vehicles available',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: _loadAvailableVehicles,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Retry Loading'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedVehicleId,
                          hint: const Text(
                            'Choose a vehicle...',
                            style: TextStyle(color: Colors.grey),
                          ),
                          isExpanded: true,
                          items: availableVehicles
                              .where(
                                (vehicle) =>
                                    vehicle['status'] == 'Available' ||
                                    vehicle['currentDriver'] ==
                                        widget.driverName,
                              )
                              .map(
                                (vehicle) => DropdownMenuItem<String>(
                                  value: vehicle['id'],
                                  child: Row(
                                    children: [
                                      Icon(
                                        vehicle['vehicleType']
                                                    ?.toLowerCase()
                                                    .contains('dump') ==
                                                true
                                            ? Icons.local_shipping
                                            : vehicle['vehicleType']
                                                        ?.toLowerCase()
                                                        .contains('compact') ==
                                                    true
                                                ? Icons.fire_truck
                                                : Icons.agriculture,
                                        size: 20,
                                        color: vehicle['status'] == 'Available'
                                            ? Colors.green
                                            : Colors.blue,
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Text(
                                          vehicle['vehicleNumber'],
                                          style: TextStyle(
                                            fontWeight: FontWeight.w500,
                                            color:
                                                vehicle['status'] == 'Available'
                                                    ? Colors.black87
                                                    : Colors.blue,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: vehicle['status'] ==
                                                  'Available'
                                              ? Colors.green.withOpacity(0.1)
                                              : Colors.blue.withOpacity(
                                                  0.1,
                                                ),
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          vehicle['status'] == 'Available'
                                              ? 'Available'
                                              : 'Mine',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color:
                                                vehicle['status'] == 'Available'
                                                    ? Colors.green
                                                    : Colors.blue,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (String? vehicleId) {
                            if (vehicleId != null) {
                              _assignVehicleToDriver(vehicleId);
                            }
                          },
                        ),
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

  Widget _buildVehicleSpec(
    IconData icon,
    String label,
    String value,
    Color color,
  ) {
    return Column(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
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
    );
  }

  Widget _buildVehicleSelectionCard(Map<String, dynamic> vehicle) {
    final isAssignedToOther = vehicle['status'] == 'Assigned' &&
        vehicle['currentDriver'] != widget.driverName;
    final isAvailable = vehicle['status'] == 'Available';
    final isAssignedToMe = vehicle['status'] == 'Assigned' &&
        vehicle['currentDriver'] == widget.driverName;

    Color statusColor;
    IconData statusIcon;

    switch (vehicle['status']) {
      case 'Available':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        break;
      case 'Assigned':
        statusColor = isAssignedToMe ? Colors.blue : Colors.orange;
        statusIcon = isAssignedToMe ? Icons.person : Icons.person_outline;
        break;
      case 'Maintenance':
        statusColor = Colors.red;
        statusIcon = Icons.build;
        break;
      case 'Out of Service':
        statusColor = Colors.grey;
        statusIcon = Icons.block;
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.help;
    }

    return Card(
        margin: const EdgeInsets.only(bottom: 12),
        elevation: isAvailable || isAssignedToMe ? 3 : 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: InkWell(
          onTap: (isAvailable || isAssignedToMe)
              ? () => _assignVehicleToDriver(vehicle['id'])
              : () => _showVehicleDetailsDialog(vehicle),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: LinearGradient(
                colors: isAvailable
                    ? [Colors.green.shade50, Colors.white]
                    : isAssignedToMe
                        ? [Colors.blue.shade50, Colors.white]
                        : isAssignedToOther
                            ? [Colors.orange.shade50, Colors.grey.shade100]
                            : [Colors.grey.shade100, Colors.grey.shade50],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(
                color: isAvailable
                    ? Colors.green.withOpacity(0.3)
                    : isAssignedToMe
                        ? Colors.blue.withOpacity(0.3)
                        : Colors.grey.withOpacity(0.3),
                width: isAvailable || isAssignedToMe ? 2 : 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: statusColor.withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      child: Icon(
                        vehicle['vehicleType']
                                    ?.toLowerCase()
                                    .contains('dump') ==
                                true
                            ? Icons.local_shipping
                            : vehicle['vehicleType']?.toLowerCase().contains(
                                          'compact',
                                        ) ==
                                    true
                                ? Icons.fire_truck
                                : Icons.agriculture,
                        size: 28,
                        color: statusColor,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                vehicle['vehicleNumber'],
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: isAssignedToOther
                                      ? Colors.grey.shade600
                                      : const Color(0xFF0D47A1),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: statusColor.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: statusColor.withOpacity(0.4),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      statusIcon,
                                      size: 12,
                                      color: statusColor,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      vehicle['status'],
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: statusColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${vehicle['vehicleType']} • ${vehicle['model']} (${vehicle['year']})',
                            style: TextStyle(
                              fontSize: 13,
                              color: isAssignedToOther
                                  ? Colors.grey
                                  : const Color(0xFF1976D2),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            'License: ${vehicle['licensePlate']}',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey.shade600,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (isAvailable || isAssignedToMe)
                      Icon(
                        isAvailable ? Icons.arrow_forward_ios : Icons.check,
                        size: 16,
                        color: statusColor,
                      )
                    else
                      Icon(
                        Icons.info_outline,
                        size: 16,
                        color: Colors.grey.shade400,
                      ),
                  ],
                ),

                const SizedBox(height: 12),

                // Vehicle specifications row
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.7),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _buildVehicleSpecMini(
                          Icons.scale,
                          '${vehicle['capacity']} kg',
                          Colors.orange,
                        ),
                      ),
                      Container(
                        width: 1,
                        height: 30,
                        color: Colors.grey.shade300,
                      ),
                      Expanded(
                        child: _buildVehicleSpecMini(
                          Icons.local_gas_station,
                          vehicle['fuelCapacity'].toString(),
                          Colors.blue,
                        ),
                      ),
                      Container(
                        width: 1,
                        height: 30,
                        color: Colors.grey.shade300,
                      ),
                      Expanded(
                        child: _buildVehicleSpecMini(
                          Icons.speed,
                          vehicle['fuelEfficiency'] != 'N/A'
                              ? '${vehicle['fuelEfficiency']} km/l'
                              : 'N/A',
                          Colors.green,
                        ),
                      ),
                    ],
                  ),
                ),

                if (isAssignedToOther) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.orange.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.person,
                          size: 16,
                          color: Colors.orange.shade600,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Currently assigned to: ${vehicle['currentDriver']}',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.orange.shade700,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                if (vehicle['lastMaintenance'] != 'N/A') ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.build, size: 14, color: Colors.grey.shade600),
                      const SizedBox(width: 4),
                      Text(
                        'Last service: ${vehicle['lastMaintenance']}',
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ));
  }

  Widget _buildVehicleSpecMini(IconData icon, String value, Color color) {
    return Column(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: color,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  void _showVehicleDetailsDialog(Map<String, dynamic> vehicle) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400, maxHeight: 600),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.blue.shade600, Colors.blue.shade700],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(20),
                    topRight: Radius.circular(20),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      vehicle['vehicleType']?.toLowerCase().contains(
                                    'dump',
                                  ) ==
                              true
                          ? Icons.local_shipping
                          : Icons.fire_truck,
                      color: Colors.white,
                      size: 32,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            vehicle['vehicleNumber'],
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            vehicle['vehicleType'],
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close, color: Colors.white),
                    ),
                  ],
                ),
              ),

              // Content
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow(
                        'License Plate',
                        vehicle['licensePlate'],
                      ),
                      _buildDetailRow(
                        'Model',
                        '${vehicle['model']} (${vehicle['year']})',
                      ),
                      _buildDetailRow('Engine Type', vehicle['engineType']),
                      _buildDetailRow(
                        'Capacity',
                        '${vehicle['capacity']} kg',
                      ),
                      _buildDetailRow(
                        'Fuel Capacity',
                        vehicle['fuelCapacity'],
                      ),
                      _buildDetailRow(
                        'Fuel Efficiency',
                        vehicle['fuelEfficiency'] != 'N/A'
                            ? '${vehicle['fuelEfficiency']} km/l'
                            : 'N/A',
                      ),
                      _buildDetailRow(
                        'Max Speed',
                        vehicle['maxSpeed'] != 'N/A'
                            ? '${vehicle['maxSpeed']} km/h'
                            : 'N/A',
                      ),
                      _buildDetailRow(
                        'Mileage',
                        vehicle['mileage'] != 'N/A'
                            ? '${vehicle['mileage']} km'
                            : 'N/A',
                      ),
                      _buildDetailRow('Status', vehicle['status']),
                      if (vehicle['currentDriver'] != '')
                        _buildDetailRow(
                          'Current Driver',
                          vehicle['currentDriver'],
                        ),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.orange.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: Colors.orange.shade200,
                          ),
                        ),
                        child: Text(
                          vehicle['status'] == 'Assigned'
                              ? 'This vehicle is currently assigned to another driver'
                              : 'This vehicle is not available for assignment',
                          style: TextStyle(
                            color: Colors.orange.shade700,
                            fontWeight: FontWeight.w500,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
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

  // Build today's schedule section
  Widget _buildTodaysScheduleSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color.fromARGB(255, 245, 250, 255), // Very light blue
            Color.fromARGB(255, 250, 255, 250), // Very light green
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(25),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: Colors.white.withOpacity(0.5), width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF1976D2).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.schedule,
                  color: Color(0xFF1976D2),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Today\'s Schedule',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0D47A1),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.blue.withOpacity(0.3)),
                ),
                child: Text(
                  '${todaysSchedule.length} stops',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1976D2),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (isLoadingSchedule)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: CircularProgressIndicator(),
              ),
            )
          else if (todaysSchedule.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Icon(
                    Icons.event_available,
                    size: 48,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'No scheduled pickups for today',
                    style: TextStyle(fontSize: 16, color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            )
          else
            Column(
              children: todaysSchedule
                  .map((schedule) => _buildScheduleItem(schedule))
                  .toList(),
            ),
        ],
      ),
    );
  }

  // Assign vehicle to driver
  Future<void> _assignVehicleToDriver(String vehicleId) async {
    setState(() {
      isLoadingVehicles = true;
    });
    try {
      // Unassign previous vehicle if any
      if (selectedVehicleId != null && selectedVehicleId != vehicleId) {
        await FirebaseFirestore.instance
            .collection('vehicles')
            .doc(selectedVehicleId)
            .update({'currentDriver': '', 'status': 'Available'});
      }
      // Assign new vehicle
      await FirebaseFirestore.instance
          .collection('vehicles')
          .doc(vehicleId)
          .update({'currentDriver': widget.driverName, 'status': 'Assigned'});
      // Reload vehicles to update UI
      await _loadAvailableVehicles();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vehicle assigned successfully!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to assign vehicle: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
    setState(() {
      isLoadingVehicles = false;
    });
  }

  // Release vehicle assignment
  Future<void> _releaseVehicleAssignment() async {
    if (selectedVehicleId == null) return;
    setState(() {
      isLoadingVehicles = true;
    });
    try {
      await FirebaseFirestore.instance
          .collection('vehicles')
          .doc(selectedVehicleId)
          .update({'currentDriver': '', 'status': 'Available'});
      await _loadAvailableVehicles();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vehicle released successfully!'),
          backgroundColor: Colors.orange,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to release vehicle: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
    setState(() {
      isLoadingVehicles = false;
    });
  }

  // Show a dialog to report a bin issue
  void _reportBinIssue(String binId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Report Bin Issue'),
        content: Text('Report an issue for Bin: $binId'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              // Here you can add logic to send the report to Firestore or your backend
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Issue reported!'),
                  backgroundColor: Colors.orange,
                ),
              );
            },
            child: const Text('Report'),
          ),
        ],
      ),
    );
  }

  // Handle time slot tap to show details
  void _onTimeSlotTap(Map<String, dynamic> schedule) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Schedule Details'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Road: ${schedule['roadName']}'),
            Text('Time: ${schedule['timeSlot']}'),
            Text('Waste Type: ${schedule['wasteType']}'),
            Text('Status: ${schedule['status']}'),
            if (schedule['startedAt'] != null)
              Text(
                'Started: ${_formatTime((schedule['startedAt'] as Timestamp).toDate())}',
              ),
            if (schedule['completedAt'] != null)
              Text(
                'Completed: ${_formatTime((schedule['completedAt'] as Timestamp).toDate())}',
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Close'),
          ),
        ],
      ),
    );
  }

  // Move instance member usage inside the function body
  Widget _buildScheduleItem(Map<String, dynamic> schedule) {
    final isTimePassed = _isTimeSlotPassed(schedule['timeSlot']);
    final isCompleted = schedule['status'] == 'Completed';
    final isInProgress = schedule['status'] == 'In Progress';
    final wasteType = (schedule['wasteType'] ?? 'General').toString();
    final typeColor = _getWasteTypeColor(wasteType);

    // Extract mention times if available
    DateTime? startedAt;
    DateTime? completedAt;
    if (schedule['startedAt'] is Timestamp) {
      startedAt = (schedule['startedAt'] as Timestamp).toDate();
    }
    if (schedule['completedAt'] is Timestamp) {
      completedAt = (schedule['completedAt'] as Timestamp).toDate();
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Card(
        elevation: isInProgress ? 4 : 2,
        color: isCompleted
            ? Colors.green.shade50
            : isInProgress
                ? Colors.blue.shade50
                : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: isInProgress
                ? Colors.blue.withOpacity(0.5)
                : Colors.grey.withOpacity(0.2),
            width: isInProgress ? 2 : 1,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // LEFT: Time/status column (constrained)
              ConstrainedBox(
                constraints: const BoxConstraints(minWidth: 92, maxWidth: 120),
                child: InkWell(
                  onTap: () => _onTimeSlotTap(schedule),
                  borderRadius: BorderRadius.circular(8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: isTimePassed
                              ? Colors.grey.shade100
                              : Colors.blue.shade100,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isTimePassed
                                ? Colors.grey.shade300
                                : Colors.blue.shade300,
                          ),
                        ),
                        child: Text(
                          (schedule['timeSlot'] ?? '').toString(),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isTimePassed
                                ? Colors.grey.shade600
                                : Colors.blue.shade700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      if (startedAt != null && !isCompleted)
                        Row(
                          children: [
                            const Icon(
                              Icons.play_arrow,
                              size: 12,
                              color: Colors.blue,
                            ),
                            const SizedBox(width: 2),
                            Text(
                              'Started ${_formatTime(startedAt)}',
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.blue.shade700,
                              ),
                            ),
                          ],
                        ),
                      if (completedAt != null)
                        Row(
                          children: [
                            const Icon(
                              Icons.check,
                              size: 12,
                              color: Colors.green,
                            ),
                            const SizedBox(width: 2),
                            Text(
                              'Done ${_formatTime(completedAt)}',
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.green.shade700,
                              ),
                            ),
                          ],
                        ),
                      const SizedBox(height: 6),
                      Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: _getStatusColor(
                            schedule['status'] ?? 'Scheduled',
                          ),
                          shape: BoxShape.circle,
                        ),
                      ),
                      Container(
                        width: 2,
                        height: 20,
                        color: Colors.grey.shade300,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // MIDDLE: Details (flex)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title + waste type badge row (make badge flexible)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Icon(
                          _getWasteTypeIcon(
                            (schedule['wasteType'] ?? 'General').toString(),
                          ),
                          size: 16,
                          color: _getWasteTypeColor(
                            (schedule['wasteType'] ?? 'General').toString(),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            (schedule['roadName'] ?? 'Unknown Road').toString(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0D47A1),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          fit: FlexFit.loose,
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerRight,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: _getWasteTypeColor(
                                  (schedule['wasteType'] ?? 'General')
                                      .toString(),
                                ).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                (schedule['wasteType'] ?? 'General').toString(),
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: _getWasteTypeColor(
                                    (schedule['wasteType'] ?? 'General')
                                        .toString(),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 4),
                    if ((schedule['roadId'] ?? '').toString().isNotEmpty)
                      Row(
                        children: [
                          Icon(
                            Icons.route,
                            size: 14,
                            color: Colors.grey.shade600,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'Road ID: ${schedule['roadId']}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey.shade700,
                              ),
                            ),
                          ),
                        ],
                      ),

                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.access_time,
                          size: 12,
                          color: Colors.grey.shade500,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${schedule['estimatedDuration'] ?? 0} min',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 8),

              // RIGHT: Actions (fixed narrow width)
              SizedBox(
                width: 44,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if ((schedule['status'] ?? '') != 'Completed') ...[
                      IconButton(
                        onPressed: () => _updateScheduleStatus(
                          schedule['id'],
                          (schedule['status'] == 'In Progress')
                              ? 'Completed'
                              : 'In Progress',
                        ),
                        icon: Icon(
                          (schedule['status'] == 'In Progress')
                              ? Icons.check_circle
                              : Icons.play_circle,
                          color: (schedule['status'] == 'In Progress')
                              ? Colors.green
                              : Colors.blue,
                          size: 22,
                        ),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints.tightFor(
                          width: 40,
                          height: 40,
                        ),
                        tooltip: (schedule['status'] == 'In Progress')
                            ? 'Mark Complete'
                            : 'Start Slot',
                      ),
                    ] else
                      const Icon(
                        Icons.check_circle,
                        color: Colors.green,
                        size: 22,
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

  // Create default schedule for testing
  Future<void> _createDefaultSchedule() async {
    todaysSchedule = [
      {
        'id': 'default_1',
        'roadId': 'RD001',
        'roadName': 'Main Street',
        'date': _getFormattedDate(),
        'timeSlot': '08:00 AM - 10:00 AM',
        'wasteType': 'General',
        'status': 'Scheduled',
        'estimatedDuration': 120,
        'binId': '',
        'location': '',
        'notes': '',
      },
      {
        'id': 'default_2',
        'roadId': 'RD002',
        'roadName': 'Park Avenue',
        'date': _getFormattedDate(),
        'timeSlot': '10:30 AM - 12:00 PM',
        'wasteType': 'Recyclable',
        'status': 'Scheduled',
        'estimatedDuration': 90,
        'binId': '',
        'location': '',
        'notes': '',
      },
    ];
  }
}

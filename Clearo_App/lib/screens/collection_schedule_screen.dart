import 'package:clearo/screens/immediate_pickup_screen.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';

class CollectionScheduleScreen extends StatefulWidget {
  const CollectionScheduleScreen({Key? key}) : super(key: key);

  @override
  State<CollectionScheduleScreen> createState() =>
      _CollectionScheduleScreenState();
}

class _CollectionScheduleScreenState extends State<CollectionScheduleScreen> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  String? _userRoad;
  List<Map<String, dynamic>> _scheduleData = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadUserDataAndSchedules();
  }

  Future<void> _loadUserDataAndSchedules() async {
    try {
      setState(() => _isLoading = true);

      // Get current user's UID
      final user = _auth.currentUser;
      if (user == null) return;

      // Fetch user's address to get their road
      final userDoc = await _firestore.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        final userData = userDoc.data();
        _userRoad =
            userData?['address'] ?? userData?['road'] ?? userData?['street'];
        print('User Road: $_userRoad');
      }

      // Fetch schedules from Firestore
      await _fetchSchedules();

      setState(() => _isLoading = false);
    } catch (e) {
      print('Error loading data: $e');
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error loading schedules: $e')));
    }
  }

  Future<void> _fetchSchedules() async {
    try {
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);

      final querySnapshot =
          await _firestore.collection('schedules').orderBy('date').get();

      List<Map<String, dynamic>> matchedSchedules = [];

      for (var doc in querySnapshot.docs) {
        final data = doc.data();
        final roadName = data['roadName'] ?? '';
        final wasteType = data['wasteType'] ?? 'General';
        final timeSlot = data['timeSlot'] ?? '08:00 AM - 10:00 AM';
        final dateStr = data['date'] ?? '';

        if (dateStr.isEmpty) continue;

        DateTime? scheduleDate;
        try {
          scheduleDate = DateTime.parse(dateStr);
        } catch (e) {
          print('Error parsing date $dateStr: $e');
          continue;
        }

        if (scheduleDate.isBefore(today)) continue;

        bool isMatchingRoad = false;
        if (_userRoad != null && _userRoad!.isNotEmpty) {
          isMatchingRoad =
              roadName.toLowerCase().contains(_userRoad!.toLowerCase()) ||
                  _userRoad!.toLowerCase().contains(roadName.toLowerCase());
        }

        if (isMatchingRoad) {
          final isToday = scheduleDate.year == today.year &&
              scheduleDate.month == today.month &&
              scheduleDate.day == today.day;

          matchedSchedules.add({
            'id': doc.id,
            'date': DateFormat('dd MMMM yyyy').format(scheduleDate),
            'dateTime': scheduleDate,
            'time': timeSlot,
            'type': wasteType,
            'roadName': roadName,
            'roadId': data['roadId'] ?? '',
            'recurring': data['recurring'] ?? false,
            'recurringType': data['recurringType'] ?? 'once',
            'status': isToday ? 'Today' : 'Upcoming',
            'icon': _getWasteIcon(wasteType),
            'color': _getWasteColor(wasteType),
          });
        }
      }

      matchedSchedules.sort(
        (a, b) =>
            (a['dateTime'] as DateTime).compareTo(b['dateTime'] as DateTime),
      );

      setState(() {
        _scheduleData = matchedSchedules;
      });

      print(
        'Loaded ${_scheduleData.length} matching schedules for road: $_userRoad',
      );
    } catch (e) {
      print('Error fetching schedules: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error loading schedules: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  IconData _getWasteIcon(String wasteType) {
    switch (wasteType.toLowerCase()) {
      case 'food waste':
      case 'organic':
        return Icons.restaurant;
      case 'polythene & plastic waste':
      case 'plastic':
      case 'recyclable':
        return Icons.recycling;
      case 'glass waste':
      case 'glass':
        return Icons.wine_bar;
      case 'paper waste':
      case 'paper':
        return Icons.description;
      default:
        return Icons.delete_outline;
    }
  }

  Color _getWasteColor(String wasteType) {
    switch (wasteType.toLowerCase()) {
      case 'food waste':
      case 'organic':
        return Colors.orange;
      case 'polythene & plastic waste':
      case 'plastic':
      case 'recyclable':
        return Colors.green;
      case 'glass waste':
      case 'glass':
        return Colors.blue;
      case 'paper waste':
      case 'paper':
        return Colors.brown;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Collection Schedule'),
        backgroundColor: Colors.green,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadUserDataAndSchedules,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Colors.green),
            )
          : Column(
              children: [
                if (_userRoad != null) _buildRoadInfoBanner(),
                _buildCalendarView(),
                Expanded(
                  child: _scheduleData.isEmpty
                      ? _buildEmptyState()
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _scheduleData.length,
                          itemBuilder: (context, index) {
                            final schedule = _scheduleData[index];
                            return _buildScheduleCard(schedule, index);
                          },
                        ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const ImmediatePickupScreen(),
            ),
          );
        },
        backgroundColor: Colors.green,
        child: const Icon(Icons.add),
        tooltip: 'Request Collection',
      ),
    );
  }

  Widget _buildRoadInfoBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      color: Colors.green.withOpacity(0.1),
      child: Row(
        children: [
          const Icon(Icons.location_on, color: Colors.green, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Your Road: $_userRoad',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.green,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.calendar_today_outlined,
            size: 80,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'No Collection Schedules',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _userRoad != null
                ? 'No scheduled collections found for your road:\n$_userRoad'
                : 'Please update your address in profile',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: Colors.grey[500]),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _loadUserDataAndSchedules,
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendarView() {
    final now = DateTime.now();
    final monthYear = '${_getMonthName(now.month)} ${now.year}';

    // Get actual collection days from schedule data
    final collectionDays = _scheduleData
        .map((s) => s['dateTime'] as DateTime)
        .where((date) => date.month == now.month)
        .map((date) => date.day)
        .toSet();

    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.green.withOpacity(0.1),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$monthYear - Waste Collecting Days',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(30, (index) {
                final day = DateTime.now().add(Duration(days: index));
                final isToday = index == 0;
                final isCollectionDay =
                    collectionDays.contains(day.day) && day.month == now.month;

                return GestureDetector(
                  onTap: isCollectionDay
                      ? () => _showCollectionDayInfo(day)
                      : null,
                  child: Container(
                    margin: const EdgeInsets.only(right: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isToday
                          ? Colors.green
                          : isCollectionDay
                              ? Colors.green.withOpacity(0.1)
                              : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isCollectionDay && !isToday
                            ? Colors.green
                            : Colors.grey.withOpacity(0.3),
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _getWeekdayName(day.weekday).substring(0, 3),
                          style: TextStyle(
                            color: isToday ? Colors.white : Colors.black87,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          day.day.toString(),
                          style: TextStyle(
                            color: isToday ? Colors.white : Colors.black,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        if (isCollectionDay)
                          Icon(
                            Icons.circle,
                            color: isToday ? Colors.white : Colors.green,
                            size: 8,
                          ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
          if (_scheduleData.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.circle, color: Colors.green, size: 8),
                const SizedBox(width: 6),
                Text(
                  '${_scheduleData.length} collection day(s) scheduled',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.green[700],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  void _showCollectionDayInfo(DateTime day) {
    final daySchedules = _scheduleData.where((s) {
      final scheduleDate = s['dateTime'] as DateTime;
      return scheduleDate.year == day.year &&
          scheduleDate.month == day.month &&
          scheduleDate.day == day.day;
    }).toList();

    if (daySchedules.isEmpty) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Collections on ${DateFormat('dd MMM').format(day)}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: daySchedules.map((schedule) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Icon(
                    schedule['icon'] as IconData,
                    color: schedule['color'] as Color,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          schedule['type'],
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          schedule['time'],
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleCard(Map<String, dynamic> schedule, int index) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              backgroundColor: (schedule['color'] as Color).withOpacity(0.2),
              radius: 25,
              child: Icon(
                schedule['icon'] as IconData,
                color: schedule['color'] as Color,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          schedule['date'],
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: schedule['status'] == 'Upcoming'
                              ? Colors.green.withOpacity(0.2)
                              : Colors.blue.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          schedule['status'] as String,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: schedule['status'] == 'Upcoming'
                                ? Colors.green
                                : Colors.blue,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    schedule['time'] as String,
                    style: const TextStyle(color: Colors.black54),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Type: ${schedule['type']}',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Road: ${schedule['roadName']}',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.green[700],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () {
                      _showCollectionDetailsDialog(schedule);
                    },
                    icon: const Icon(Icons.info_outline, size: 18),
                    label: const Text('Details'),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCollectionDetailsDialog(Map<String, dynamic> schedule) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${schedule['type']} Collection Details'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDetailItem('Date', schedule['date']),
            _buildDetailItem('Time', schedule['time']),
            _buildDetailItem('Type', schedule['type']),
            _buildDetailItem('Status', schedule['status']),
            _buildDetailItem('Road', schedule['roadName']),
            _buildDetailItem('Your Address', _userRoad ?? 'N/A'),
            _buildDetailItem(
              'Recurring',
              schedule['recurring'] == true
                  ? 'Yes (${schedule['recurringType']})'
                  : 'No',
            ),
            _buildDetailItem(
              'Schedule ID',
              schedule['id']?.toString().substring(0, 8).toUpperCase() ?? 'N/A',
            ),
          ],
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

  Widget _buildDetailItem(String title, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$title:',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.black54,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  String _getMonthName(int month) {
    switch (month) {
      case 1:
        return 'January';
      case 2:
        return 'February';
      case 3:
        return 'March';
      case 4:
        return 'April';
      case 5:
        return 'May';
      case 6:
        return 'June';
      case 7:
        return 'July';
      case 8:
        return 'August';
      case 9:
        return 'September';
      case 10:
        return 'October';
      case 11:
        return 'November';
      case 12:
        return 'December';
      default:
        return '';
    }
  }

  String _getWeekdayName(int weekday) {
    switch (weekday) {
      case 1:
        return 'Monday';
      case 2:
        return 'Tuesday';
      case 3:
        return 'Wednesday';
      case 4:
        return 'Thursday';
      case 5:
        return 'Friday';
      case 6:
        return 'Saturday';
      case 7:
        return 'Sunday';
      default:
        return '';
    }
  }
}

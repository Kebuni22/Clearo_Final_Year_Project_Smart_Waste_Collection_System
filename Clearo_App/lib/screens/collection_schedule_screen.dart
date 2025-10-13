import 'package:clearo/screens/immediate_pickup_screen.dart';
import 'package:flutter/material.dart';

class CollectionScheduleScreen extends StatefulWidget {
  const CollectionScheduleScreen({Key? key}) : super(key: key);

  @override
  State<CollectionScheduleScreen> createState() =>
      _CollectionScheduleScreenState();
}

class _CollectionScheduleScreenState extends State<CollectionScheduleScreen> {
  // Automatically generated schedule data
  final List<Map<String, dynamic>> _scheduleData = [];

  @override
  void initState() {
    super.initState();
    _generateScheduleData(); // Generate schedule dates dynamically
  }

  void _generateScheduleData() {
    final List<DateTime> specificDates = [
      DateTime(DateTime.now().year, 4, 28), // Food Waste (23 May to 28 April)
      DateTime(
        DateTime.now().year,
        4,
        30,
      ), // Polythene & Plastic Waste (25 May to 30 April)
      DateTime(DateTime.now().year, 5, 2), // Other Waste (27 May to 2 May)
      DateTime(DateTime.now().year, 5, 5), // Glass Waste (30 May to 5 May)
    ];

    final List<Map<String, dynamic>> scheduleTemplate = [
      {
        'type': 'Food Waste',
        'icon': Icons.delete_outline,
        'color': Colors.orange,
      },
      {
        'type': 'Polythene & Plastic Waste',
        'icon': Icons.recycling,
        'color': Colors.green,
      },
      {'type': 'Other Waste', 'icon': Icons.compost, 'color': Colors.brown},
      {'type': 'Glass Waste', 'icon': Icons.wine_bar, 'color': Colors.blue},
    ];

    for (int i = 0; i < specificDates.length; i++) {
      final date = specificDates[i];
      final scheduleType = scheduleTemplate[i];
      _scheduleData.add({
        'date':
            '${date.day.toString().padLeft(2, '0')} ${_getMonthName(date.month)} ${date.year}',
        'time': '08:00 AM - 10:00 AM',
        'type': scheduleType['type'],
        'status': i == 0 ? 'Today' : 'Upcoming',
        'icon': scheduleType['icon'],
        'color': scheduleType['color'],
        'isReminded': false,
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Collection Schedule'),
        backgroundColor: Colors.green,
      ),
      body: Column(
        children: [
          _buildCalendarView(),
          Expanded(
            child: ListView.builder(
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

  Widget _buildCalendarView() {
    final now = DateTime.now(); // Get the current date
    final monthYear =
        '${_getMonthName(now.month)} ${now.year}'; // Format month and year

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
              children: List.generate(14, (index) {
                final day = DateTime.now().add(Duration(days: index));
                final isToday = index == 0;
                final isCollectionDay =
                    index == 0 || index == 2 || index == 4 || index == 7;

                return GestureDetector(
                  onTap: () {
                    // Removed dialog box functionality
                  },
                  child: Container(
                    margin: const EdgeInsets.only(right: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color:
                          isToday
                              ? Colors.green
                              : isCollectionDay
                              ? Colors.green.withOpacity(0.1)
                              : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color:
                            isCollectionDay && !isToday
                                ? Colors.green
                                : Colors.transparent,
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
                      Text(
                        schedule['date'], // Display only the date
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color:
                              schedule['status'] == 'Upcoming'
                                  ? Colors.green.withOpacity(0.2)
                                  : Colors.blue.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          schedule['status'] as String,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color:
                                schedule['status'] == 'Upcoming'
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
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: () {
                          setState(() {
                            _scheduleData[index]['isReminded'] = true;
                          });
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Reminder set for this collection'),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        icon: const Icon(
                          Icons.notifications_outlined,
                          size: 18,
                        ),
                        label: const Text('Remind'),
                        style: OutlinedButton.styleFrom(
                          backgroundColor:
                              schedule['isReminded']
                                  ? Colors.green.withOpacity(0.2)
                                  : Colors.transparent,
                          foregroundColor:
                              schedule['isReminded']
                                  ? Colors.green
                                  : Colors.black,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () {
                          // View details functionality
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
      builder:
          (context) => AlertDialog(
            title: Text('${schedule['type']} Collection Details'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDetailItem(
                  'Date',
                  schedule['date'] ?? 'N/A',
                ), // Ensure date is not null
                _buildDetailItem('Time', schedule['time']),
                _buildDetailItem('Type', schedule['type']),
                _buildDetailItem('Status', schedule['status']),
                _buildDetailItem('Location', '188/A Anagarika Darmapala Mw.'),
                _buildDetailItem(
                  'Collection ID',
                  'DHE-${10000 + _scheduleData.indexOf(schedule)}',
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

  void _showRequestCollectionDialog() {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: const Text('Request Collection'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Please select the type of waste and preferred date for collection:',
                  style: TextStyle(color: Colors.black54),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Waste Type',
                    border: OutlineInputBorder(),
                  ),
                  value: 'Food Waste',
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
                      value: 'Other Waste',
                      child: Text('Other Waste'),
                    ),
                  ],
                  onChanged: (value) {},
                ),
                const SizedBox(height: 16),
                InkWell(
                  onTap: () {
                    // Show date picker
                    showDatePicker(
                      context: context,
                      initialDate: DateTime.now().add(const Duration(days: 1)),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 30)),
                    );
                  },
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Preferred Date',
                      border: OutlineInputBorder(),
                      suffixIcon: Icon(Icons.calendar_today),
                    ),
                    child: const Text('Select Date'),
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Preferred Time',
                    border: OutlineInputBorder(),
                  ),
                  value: 'Morning (8AM - 12PM)',
                  items: const [
                    DropdownMenuItem(
                      value: 'Morning (8AM - 12PM)',
                      child: Text('Morning (8AM - 12PM)'),
                    ),
                    DropdownMenuItem(
                      value: 'Afternoon (12PM - 4PM)',
                      child: Text('Afternoon (12PM - 4PM)'),
                    ),
                    DropdownMenuItem(
                      value: 'Evening (4PM - 8PM)',
                      child: Text('Evening (4PM - 8PM)'),
                    ),
                  ],
                  onChanged: (value) {},
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
                      content: Text(
                        'Collection request submitted successfully',
                      ),
                      backgroundColor: Colors.green,
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                child: const Text('Request'),
              ),
            ],
          ),
    );
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

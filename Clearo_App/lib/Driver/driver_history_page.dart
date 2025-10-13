import 'package:flutter/material.dart';

class DriverHistoryPage extends StatelessWidget {
  const DriverHistoryPage({Key? key}) : super(key: key);

  // Simulate fetching pickup history (replace with real data source)
  List<Map<String, dynamic>> getPickupHistory() {
    return [
      {
        'date': DateTime(2024, 6, 3),
        'binId': 'BIN-001',
        'location': 'Colombo',
        'status': 'Completed',
      },
      {
        'date': DateTime(2024, 6, 3),
        'binId': 'BIN-002',
        'location': 'Kandy',
        'status': 'Completed',
      },
      {
        'date': DateTime(2024, 6, 2),
        'binId': 'BIN-003',
        'location': 'Galle',
        'status': 'Missed',
      },
      {
        'date': DateTime(2024, 6, 1),
        'binId': 'BIN-004',
        'location': 'Matara',
        'status': 'Completed',
      },
    ];
  }

  Map<String, List<Map<String, dynamic>>> groupByDate(
    List<Map<String, dynamic>> pickups,
  ) {
    final Map<String, List<Map<String, dynamic>>> grouped = {};
    for (var pickup in pickups) {
      final dateStr =
          "${pickup['date'].year}-${pickup['date'].month.toString().padLeft(2, '0')}-${pickup['date'].day.toString().padLeft(2, '0')}";
      grouped.putIfAbsent(dateStr, () => []);
      grouped[dateStr]!.add(pickup);
    }
    return grouped;
  }

  Color statusColor(String status) {
    switch (status) {
      case 'Completed':
        return const Color(0xFFB2DFDB); // pastel teal
      case 'Missed':
        return const Color(0xFFFFCCBC); // pastel orange
      case 'Pending':
        return const Color(0xFFD1C4E9); // pastel purple
      default:
        return const Color(0xFFE0E0E0); // pastel grey
    }
  }

  @override
  Widget build(BuildContext context) {
    final pickups = getPickupHistory();
    final grouped = groupByDate(pickups);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pickup History'),
        backgroundColor: const Color(0xFFB3E5FC), // pastel blue
        elevation: 0,
      ),
      backgroundColor: const Color(0xFFF8F9FA), // very light pastel
      body: ListView(
        padding: const EdgeInsets.all(16),
        children:
            grouped.entries.map((entry) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFB3E5FC), // pastel blue
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      entry.key,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0277BD),
                      ),
                    ),
                  ),
                  ...entry.value.map(
                    (pickup) => Card(
                      color: statusColor(pickup['status']),
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      margin: const EdgeInsets.symmetric(
                        vertical: 6,
                        horizontal: 4,
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.white,
                          child: Icon(
                            pickup['status'] == 'Completed'
                                ? Icons.check_circle
                                : pickup['status'] == 'Missed'
                                ? Icons.cancel
                                : Icons.access_time,
                            color:
                                pickup['status'] == 'Completed'
                                    ? Colors.teal
                                    : pickup['status'] == 'Missed'
                                    ? Colors.orange
                                    : Colors.purple,
                          ),
                        ),
                        title: Text(
                          'Bin: ${pickup['binId']}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text('Location: ${pickup['location']}'),
                        trailing: Text(
                          pickup['status'],
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color:
                                pickup['status'] == 'Completed'
                                    ? Colors.teal
                                    : pickup['status'] == 'Missed'
                                    ? Colors.orange
                                    : Colors.purple,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }).toList(),
      ),
    );
  }
}

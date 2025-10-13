import 'package:flutter/material.dart';

class DriverReportsPage extends StatelessWidget {
  const DriverReportsPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Sample report data
    final Map<String, dynamic> report = {
      'totalPickups': 120,
      'completed': 115,
      'missed': 5,
      'averageTime': '18 min',
      'rating': 4.7,
    };

    return Scaffold(
      appBar: AppBar(title: const Text('Performance Reports')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Monthly Performance',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            ListTile(
              leading: const Icon(Icons.list_alt, color: Colors.blue),
              title: const Text('Total Pickups'),
              trailing: Text(report['totalPickups'].toString()),
            ),
            ListTile(
              leading: const Icon(Icons.check_circle, color: Colors.green),
              title: const Text('Completed'),
              trailing: Text(report['completed'].toString()),
            ),
            ListTile(
              leading: const Icon(Icons.cancel, color: Colors.red),
              title: const Text('Missed'),
              trailing: Text(report['missed'].toString()),
            ),
            ListTile(
              leading: const Icon(Icons.timer, color: Colors.orange),
              title: const Text('Average Pickup Time'),
              trailing: Text(report['averageTime']),
            ),
            ListTile(
              leading: const Icon(Icons.star, color: Colors.amber),
              title: const Text('Driver Rating'),
              trailing: Text(report['rating'].toString()),
            ),
          ],
        ),
      ),
    );
  }
}

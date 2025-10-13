import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class HistoryPage extends StatelessWidget {
  const HistoryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('History')),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance.collection('history').snapshots(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return const Center(child: Text('No history available.'));
          }

          final items = snapshot.data!.docs;

          return ListView.builder(
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index].data() as Map<String, dynamic>;
              return Card(
                margin: const EdgeInsets.all(8.0),
                child: ListTile(
                  leading:
                      item['imagePath'] != null
                          ? Image.network(
                            item['imagePath'],
                            width: 50,
                            height: 50,
                            fit: BoxFit.cover,
                          )
                          : const Icon(Icons.image, size: 50),
                  title: Text(item['title'] ?? 'No Title'),
                  subtitle: Text(item['description'] ?? 'No Description'),
                  trailing: Text(item['action'] ?? 'Unknown'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

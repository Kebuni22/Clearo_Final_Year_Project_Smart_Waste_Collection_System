import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  late Stream<QuerySnapshot> _notificationsStream;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializeNotifications();
  }

  void _initializeNotifications() {
    final user = _auth.currentUser;
    if (user == null) {
      setState(() {
        _errorMessage = 'User not authenticated. Please sign in.';
        _isLoading = false;
      });
      return;
    }

    _notificationsStream =
        _firestore
            .collection('notifications')
            .where('userId', isEqualTo: user.uid)
            .orderBy('timestamp', descending: true)
            .snapshots();

    setState(() {
      _isLoading = false;
    });
  }

  Future<void> _markAsRead(String notificationId) async {
    try {
      await _firestore.collection('notifications').doc(notificationId).update({
        'isRead': true,
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error marking notification as read: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _deleteNotification(String notificationId) async {
    try {
      await _firestore.collection('notifications').doc(notificationId).delete();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error deleting notification: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _updateNotificationForConfirmedStatus(String pickupId) async {
    try {
      final user = _auth.currentUser;
      if (user == null) return;

      final pickupDoc =
          await _firestore.collection('immediate_pickups').doc(pickupId).get();

      if (pickupDoc.exists && pickupDoc.data()?['status'] == 'Confirmed') {
        await _firestore.collection('notifications').add({
          'userId': user.uid,
          'message':
              'Your immediate pickup request for Bin ID ${pickupDoc.data()?['bin']} has been confirmed.',
          'timestamp': FieldValue.serverTimestamp(),
          'isRead': false,
          'type': 'pickup_confirmation',
        });
      }
    } catch (e) {
      debugPrint('Error updating notification: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(70),
        child: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          flexibleSpace: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Color.fromARGB(255, 196, 218, 198),
                  Color.fromARGB(255, 201, 222, 202),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          title: const Text(
            'Notifications',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _initializeNotifications,
              color: Colors.white,
            ),
          ],
        ),
      ),
      body:
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _errorMessage != null
              ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      _errorMessage!,
                      style: const TextStyle(fontSize: 16, color: Colors.red),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _initializeNotifications,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              )
              : StreamBuilder<QuerySnapshot>(
                stream: _notificationsStream,
                builder: (context, snapshot) {
                  if (snapshot.hasError) {
                    return Center(
                      child: Text(
                        'Error loading notifications: ${snapshot.error}',
                        style: const TextStyle(color: Colors.red),
                      ),
                    );
                  }

                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                    return const Center(
                      child: Text(
                        'No notifications available.',
                        style: TextStyle(fontSize: 16, color: Colors.grey),
                      ),
                    );
                  }

                  final notifications = snapshot.data!.docs;

                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: notifications.length,
                    itemBuilder: (context, index) {
                      final notification = notifications[index];
                      final data = notification.data() as Map<String, dynamic>;
                      final isRead = data['isRead'] ?? false;
                      final timestamp = data['timestamp'] as Timestamp?;
                      final formattedDate =
                          timestamp != null
                              ? DateFormat(
                                'MMM dd, yyyy - hh:mm a',
                              ).format(timestamp.toDate())
                              : 'Unknown date';

                      return Dismissible(
                        key: Key(notification.id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          color: Colors.red,
                          child: const Icon(Icons.delete, color: Colors.white),
                        ),
                        confirmDismiss: (direction) async {
                          return await showDialog(
                            context: context,
                            builder:
                                (context) => AlertDialog(
                                  title: const Text('Delete Notification'),
                                  content: const Text(
                                    'Are you sure you want to delete this notification?',
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed:
                                          () =>
                                              Navigator.of(context).pop(false),
                                      child: const Text('Cancel'),
                                    ),
                                    TextButton(
                                      onPressed:
                                          () => Navigator.of(context).pop(true),
                                      child: const Text(
                                        'Delete',
                                        style: TextStyle(color: Colors.red),
                                      ),
                                    ),
                                  ],
                                ),
                          );
                        },
                        onDismissed: (direction) async {
                          await _deleteNotification(notification.id);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Notification deleted'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        },
                        child: Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 2,
                          color:
                              isRead
                                  ? Colors.white
                                  : Colors.green[50]?.withOpacity(0.7),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () => _markAsRead(notification.id),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor:
                                    isRead
                                        ? Colors.grey[200]
                                        : Colors.green[100],
                                child: Icon(
                                  Icons.notifications,
                                  color: isRead ? Colors.grey : Colors.green,
                                  size: 24,
                                ),
                              ),
                              title: Text(
                                data['message'] ?? 'No message',
                                style: TextStyle(
                                  fontSize: 14,
                                  color:
                                      isRead ? Colors.grey : Colors.green[800],
                                  fontWeight:
                                      isRead
                                          ? FontWeight.normal
                                          : FontWeight.w600,
                                ),
                              ),
                              subtitle: Text(
                                formattedDate,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                              trailing: IconButton(
                                icon: const Icon(Icons.close, size: 18),
                                onPressed:
                                    () => _deleteNotification(notification.id),
                                color: Colors.grey,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
    );
  }
}

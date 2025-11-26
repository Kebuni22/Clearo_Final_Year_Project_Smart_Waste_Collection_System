import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:ui';

class NotificationService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    tz.initializeTimeZones();

    const androidSettings = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // Request permissions for iOS
    await _notifications
        .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, badge: true, sound: true);

    // Request permissions for Android 13+
    await _notifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
  }

  void _onNotificationTap(NotificationResponse response) {
    // Handle notification tap
    print('Notification tapped: ${response.payload}');
  }

  // Monitor smart bins and send notifications when full
  static Future<void> checkSmartBinStatus() async {
    try {
      final smartBinsSnapshot = await _firestore.collection('smart_bins').get();

      for (var doc in smartBinsSnapshot.docs) {
        final data = doc.data();
        final fillData = _getFirestoreValue(data['fill_data']);
        final fillPercentage =
            _getFirestoreValue(fillData?['fill_percentage'])?.toDouble() ?? 0.0;
        final isCritical =
            _getFirestoreValue(fillData?['is_critical']) ?? false;
        final isFull = _getFirestoreValue(fillData?['is_full']) ?? false;
        final binId = _getFirestoreValue(data['bin_id'])?.toString() ?? doc.id;
        final location = _getFirestoreValue(data['location'])?.toString() ??
            'Unknown Location';

        // Push notification if Clea~Ro bin level is above 76
        if (fillPercentage > 76) {
          await _sendBinFullNotification(binId, location, fillPercentage);
        }
        // Optionally, keep the original logic if needed:
        // if (isCritical || isFull || fillPercentage >= 85) {
        //   await _sendBinFullNotification(binId, location, fillPercentage);
        // }
      }
    } catch (e) {
      print('Error checking smart bin status: $e');
    }
  }

  // Send notification when bin is full
  static Future<void> _sendBinFullNotification(
    String binId,
    String location,
    double fillPercentage,
  ) async {
    try {
      // Check if notification already sent recently (within last 2 hours)
      final recentNotification = await _firestore
          .collection('user_notifications')
          .where('binId', isEqualTo: binId)
          .where('type', isEqualTo: 'bin_full')
          .where(
            'createdAt',
            isGreaterThan: Timestamp.fromDate(
              DateTime.now().subtract(Duration(hours: 2)),
            ),
          )
          .limit(1)
          .get();

      // Fix: Only skip sending if a notification for this bin and this fill level exists
      final alreadySent = recentNotification.docs.any((doc) {
        final data = doc.data();
        // Compare fillPercentage rounded to integer for match
        return (data['fillPercentage']?.toInt() ?? -1) ==
            fillPercentage.toInt();
      });

      if (alreadySent) {
        return; // Don't send duplicate notifications for same fill level
      }

      // Add notification for Claro smart bin full
      await _firestore.collection('user_notifications').add({
        'userId': 'CLARO_SYSTEM', // system or admin user
        'binId': binId,
        'type': 'bin_full',
        'title': 'Claro Smart Bin Full',
        'message':
            'Claro smart bin at $location is ${fillPercentage.toStringAsFixed(0)}% full and needs emptying.',
        'location': location,
        'fillPercentage': fillPercentage,
        'isRead': false,
        'priority': fillPercentage >= 95 ? 'high' : 'medium',
        'createdAt': FieldValue.serverTimestamp(),
      });

      // Create notification for all users (you might want to filter by location/user)
      final usersSnapshot = await _firestore.collection('users').get();

      for (var userDoc in usersSnapshot.docs) {
        await _firestore.collection('user_notifications').add({
          'userId': userDoc.id,
          'binId': binId,
          'type': 'bin_full',
          'title': 'Bin Full Alert! 🗑️',
          'message':
              'Smart bin at $location is ${fillPercentage.toStringAsFixed(0)}% full and needs emptying.',
          'location': location,
          'fillPercentage': fillPercentage,
          'isRead': false,
          'priority': fillPercentage >= 95 ? 'high' : 'medium',
          'createdAt': FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      print('Error sending bin full notification: $e');
    }
  }

  // Send notification when bin emptying is requested
  static Future<void> sendEmptyingRequestNotification(
    String binId,
    String location,
    String userId,
  ) async {
    try {
      await _firestore.collection('user_notifications').add({
        'userId': userId,
        'binId': binId,
        'type': 'emptying_request',
        'title': 'Emptying Request Submitted ✅',
        'message':
            'Your request to empty the bin at $location has been submitted successfully.',
        'location': location,
        'isRead': false,
        'priority': 'low',
        'createdAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error sending emptying request notification: $e');
    }
  }

  // Send notification when bin request is approved/rejected
  static Future<void> sendBinRequestStatusNotification(
    String userId,
    String binId,
    String status,
    String location,
  ) async {
    try {
      final title = status == 'approved'
          ? 'Bin Request Approved ✅'
          : 'Bin Request Update 📋';
      final message = status == 'approved'
          ? 'Your bin request for $location has been approved and will be delivered soon.'
          : 'Your bin request for $location status has been updated to: $status';

      await _firestore.collection('user_notifications').add({
        'userId': userId,
        'binId': binId,
        'type': 'bin_request_status',
        'title': title,
        'message': message,
        'location': location,
        'status': status,
        'isRead': false,
        'priority': status == 'approved' ? 'medium' : 'low',
        'createdAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error sending bin request status notification: $e');
    }
  }

  // Get notifications for current user
  static Stream<QuerySnapshot> getUserNotifications() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return Stream.empty();
    }

    return _firestore
        .collection('user_notifications')
        .where('userId', isEqualTo: user.uid)
        .orderBy('createdAt', descending: true)
        .limit(20)
        .snapshots();
  }

  // Mark notification as read
  static Future<void> markNotificationAsRead(String notificationId) async {
    try {
      await _firestore
          .collection('user_notifications')
          .doc(notificationId)
          .update({'isRead': true});
    } catch (e) {
      print('Error marking notification as read: $e');
    }
  }

  // Mark all notifications as read
  static Future<void> markAllNotificationsAsRead() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      final unreadNotifications = await _firestore
          .collection('user_notifications')
          .where('userId', isEqualTo: user.uid)
          .where('isRead', isEqualTo: false)
          .get();

      final batch = _firestore.batch();
      for (var doc in unreadNotifications.docs) {
        batch.update(doc.reference, {'isRead': true});
      }
      await batch.commit();
    } catch (e) {
      print('Error marking all notifications as read: $e');
    }
  }

  Future<void> scheduleCollectionReminder({
    required String scheduleId,
    required String wasteType,
    required DateTime collectionDate,
    required String timeSlot,
    required String roadName,
  }) async {
    try {
      // Parse time slot to get start time
      final startTime = timeSlot.split(' - ')[0].trim();
      final scheduledDateTime = _parseDateTime(collectionDate, startTime);

      // Schedule notification 1 day before at 8 PM
      final reminderDateTime = scheduledDateTime.subtract(
        const Duration(days: 1),
      );
      final notificationTime = DateTime(
        reminderDateTime.year,
        reminderDateTime.month,
        reminderDateTime.day,
        20, // 8 PM
        0,
      );

      final notificationId = scheduleId.hashCode;
      await _notifications.zonedSchedule(
        notificationId,
        '🗑️ Waste Collection Reminder',
        '$wasteType collection tomorrow at $timeSlot on $roadName',
        tz.TZDateTime.from(notificationTime, tz.local),
        NotificationDetails(
          android: AndroidNotificationDetails(
            'collection_reminders',
            'Collection Reminders',
            channelDescription: 'Reminders for waste collection schedules',
            importance: Importance.high,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
            color: Color(0xFF4CAF50),
            playSound: true,
            enableVibration: true,
          ),
          iOS: DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        payload: jsonEncode({
          'scheduleId': scheduleId,
          'wasteType': wasteType,
          'date': collectionDate.toIso8601String(),
        }),
      );

      // Save reminder to SharedPreferences
      await _saveReminder(scheduleId, {
        'notificationId': notificationId,
        'wasteType': wasteType,
        'collectionDate': collectionDate.toIso8601String(),
        'timeSlot': timeSlot,
        'roadName': roadName,
        'reminderDateTime': notificationTime.toIso8601String(),
      });

      print('✅ Reminder scheduled for $notificationTime');
    } catch (e) {
      print('❌ Error scheduling reminder: $e');
      rethrow;
    }
  }

  DateTime _parseDateTime(DateTime date, String timeStr) {
    try {
      // Parse "12:00 PM" format
      final parts = timeStr.split(' ');
      final timeParts = parts[0].split(':');
      var hour = int.parse(timeParts[0]);
      final minute = int.parse(timeParts[1]);
      final isPM = parts.length > 1 && parts[1].toUpperCase() == 'PM';

      if (isPM && hour != 12) hour += 12;
      if (!isPM && hour == 12) hour = 0;

      return DateTime(date.year, date.month, date.day, hour, minute);
    } catch (e) {
      return DateTime(date.year, date.month, date.day, 8, 0);
    }
  }

  Future<void> _saveReminder(
    String scheduleId,
    Map<String, dynamic> data,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final reminders = await getAllReminders();
    reminders[scheduleId] = data;
    await prefs.setString('collection_reminders', jsonEncode(reminders));
  }

  Future<Map<String, dynamic>> getAllReminders() async {
    final prefs = await SharedPreferences.getInstance();
    final remindersJson = prefs.getString('collection_reminders');
    if (remindersJson == null) return {};
    return Map<String, dynamic>.from(jsonDecode(remindersJson));
  }

  Future<bool> isReminderSet(String scheduleId) async {
    final reminders = await getAllReminders();
    return reminders.containsKey(scheduleId);
  }

  Future<void> cancelReminder(String scheduleId) async {
    try {
      final reminders = await getAllReminders();
      final reminderData = reminders[scheduleId];

      if (reminderData != null) {
        final notificationId = reminderData['notificationId'] as int;
        await _notifications.cancel(notificationId);

        reminders.remove(scheduleId);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('collection_reminders', jsonEncode(reminders));

        print('✅ Reminder cancelled for schedule: $scheduleId');
      }
    } catch (e) {
      print('❌ Error cancelling reminder: $e');
    }
  }

  Future<void> cancelAllReminders() async {
    await _notifications.cancelAll();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('collection_reminders');
  }

  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    return await _notifications.pendingNotificationRequests();
  }

  // Helper function to extract Firestore values
  static dynamic _getFirestoreValue(dynamic field) {
    if (field == null) return null;
    if (field is Map<String, dynamic>) {
      if (field.containsKey('stringValue')) return field['stringValue'];
      if (field.containsKey('doubleValue'))
        return double.tryParse(field['doubleValue'].toString());
      if (field.containsKey('integerValue'))
        return int.tryParse(field['integerValue'].toString());
      if (field.containsKey('booleanValue'))
        return field['booleanValue'] == true || field['booleanValue'] == 'true';
      if (field.containsKey('mapValue') &&
          field['mapValue'] is Map &&
          field['mapValue']['fields'] != null) {
        return field['mapValue']['fields'];
      }
    }
    return field;
  }
}

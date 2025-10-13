import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class NotificationService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

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
        final location =
            _getFirestoreValue(data['location'])?.toString() ??
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
      final recentNotification =
          await _firestore
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
      final title =
          status == 'approved'
              ? 'Bin Request Approved ✅'
              : 'Bin Request Update 📋';
      final message =
          status == 'approved'
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

      final unreadNotifications =
          await _firestore
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

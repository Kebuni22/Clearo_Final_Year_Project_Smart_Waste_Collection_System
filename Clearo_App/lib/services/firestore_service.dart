import 'package:cloud_firestore/cloud_firestore.dart';

class FirestoreService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  static Future<Map<String, dynamic>?> getUserData(String uid) async {
    try {
      final doc = await _firestore.collection('users').doc(uid).get();

      if (!doc.exists) {
        return null;
      }

      final data = doc.data();
      if (data == null) {
        return null;
      }

      // Convert all values to safe types
      return {
        'userType': data['userType']?.toString(),
        'name': data['name']?.toString(),
        'email': data['email']?.toString(),
        'phone': data['phone']?.toString(),
        'address': data['address']?.toString(),
        'position': data['position']?.toString(),
        'profileImageUrl': data['profileImageUrl']?.toString(),
      };
    } catch (e) {
      print('Error fetching user data: $e');
      rethrow;
    }
  }
}

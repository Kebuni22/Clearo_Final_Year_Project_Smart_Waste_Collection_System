import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

final FirebaseFirestore _firestore = FirebaseFirestore.instance;

/// Function to add a new reusable item
Future<void> addReusableItem(Map<String, dynamic> item) async {
  final user = FirebaseAuth.instance.currentUser;
  if (user == null) {
    throw Exception("User is not authenticated");
  }

  try {
    final docRef = await _firestore.collection('reusableItems').add({
      'title': item['title'],
      'description': item['description'],
      'imageUrl': item['imageUrl'],
      'status': item['status'],
      'userId': user.uid, // Use authenticated user's ID
      'createdAt': FieldValue.serverTimestamp(), // Automatically set timestamp
    });
    print("Document written with ID: ${docRef.id}");
  } catch (error) {
    print("Error adding document: $error");
    rethrow;
  }
}

/// Function to fetch reusable items
Future<List<Map<String, dynamic>>> getReusableItems() async {
  try {
    final querySnapshot = await _firestore.collection('reusableItems').get();
    return querySnapshot.docs
        .map((doc) => {'id': doc.id, ...doc.data() as Map<String, dynamic>})
        .toList();
  } catch (error) {
    print("Error fetching reusable items: $error");
    return [];
  }
}

/// Function to send a message
Future<void> sendMessage(
  String senderId,
  String receiverId,
  String message,
) async {
  try {
    await _firestore.collection('messages').add({
      'senderId': senderId,
      'receiverId': receiverId,
      'message': message,
      'createdAt': FieldValue.serverTimestamp(), // Automatically set timestamp
    });
    print("Message sent!");
  } catch (error) {
    print("Error sending message: $error");
  }
}

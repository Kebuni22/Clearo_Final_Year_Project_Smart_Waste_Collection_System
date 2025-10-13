import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';

class DriverHelpSupportPage extends StatefulWidget {
  const DriverHelpSupportPage({Key? key}) : super(key: key);

  @override
  State<DriverHelpSupportPage> createState() => _DriverHelpSupportPageState();
}

class _DriverHelpSupportPageState extends State<DriverHelpSupportPage> {
  final List<Map<String, dynamic>> _messages = [];
  final TextEditingController _messageController = TextEditingController();
  final TextEditingController _noteController = TextEditingController();
  File? _selectedImage;
  bool isLoadingMessages = false;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  /// Load last 50 messages
  Future<void> _loadMessages() async {
    setState(() => isLoadingMessages = true);
    final query =
        await FirebaseFirestore.instance
            .collection('driver_support_chat')
            .orderBy('timestamp', descending: false)
            .limit(50)
            .get();

    _messages.clear();
    for (var doc in query.docs) {
      _messages.add(doc.data());
    }
    setState(() => isLoadingMessages = false);
  }

  /// Upload image to Firebase Storage
  Future<String?> _uploadImage(File image) async {
    try {
      final ref = FirebaseStorage.instance.ref().child(
        'driver_uploads/${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      await ref.putFile(image);
      return await ref.getDownloadURL();
    } on FirebaseException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Image upload failed: ${e.message ?? e.code}'),
          backgroundColor: Colors.red,
        ),
      );
      return null;
    }
  }

  /// Send message with optional text and image
  Future<void> _sendMessage({String? text, File? image}) async {
    if ((text == null || text.trim().isEmpty) && image == null) return;

    String? imageUrl;
    if (image != null) {
      imageUrl = await _uploadImage(image);
      if (imageUrl == null) return; // stop if upload failed
    }

    final msg = {
      'text': text ?? '',
      'imageUrl': imageUrl ?? '',
      'from': 'driver',
      'timestamp': FieldValue.serverTimestamp(),
      'type': image != null ? 'image' : 'chat',
    };

    await FirebaseFirestore.instance.collection('driver_support_chat').add(msg);

    _messageController.clear();
    setState(() {
      _selectedImage = null;
    });

    await _loadMessages();
  }

  /// Send a special note (non-chat)
  Future<void> _sendNote(String note) async {
    final msg = {
      'text': '[Note] $note',
      'from': 'driver',
      'timestamp': FieldValue.serverTimestamp(),
      'type': 'note',
    };
    await FirebaseFirestore.instance.collection('driver_support_chat').add(msg);
    _noteController.clear();
    await _loadMessages();

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Note sent to admin')));
  }

  /// Pick image from gallery or camera
  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 70);
    if (picked != null) {
      setState(() {
        _selectedImage = File(picked.path);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final pastelBg = const Color(0xFFF8F9FA);
    final pastelCard = const Color(0xFFB2DFDB);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Help & Support'),
        backgroundColor: pastelCard,
        elevation: 0,
      ),
      backgroundColor: pastelBg,
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Contact Info
              Card(
                color: pastelCard,
                margin: const EdgeInsets.only(bottom: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Padding(
                  padding: EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Contact Support',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 16),
                      ListTile(
                        leading: Icon(Icons.phone, color: Colors.teal),
                        title: Text('Emergency: +94-112-911-119'),
                      ),
                      ListTile(
                        leading: Icon(Icons.email, color: Colors.teal),
                        title: Text('Email: driver-support@clearo.lk'),
                      ),
                      ListTile(
                        leading: Icon(Icons.message, color: Colors.teal),
                        title: Text('WhatsApp: +94-77-123-4567'),
                      ),
                      ListTile(
                        leading: Icon(Icons.access_time, color: Colors.teal),
                        title: Text('Available 24/7'),
                      ),
                    ],
                  ),
                ),
              ),

              // Chat Section
              Card(
                color: pastelCard,
                margin: const EdgeInsets.only(bottom: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Chat with Admin',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Chat messages
                      Container(
                        height: 200,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.7),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child:
                            isLoadingMessages
                                ? const Center(
                                  child: CircularProgressIndicator(),
                                )
                                : ListView.builder(
                                  itemCount: _messages.length,
                                  itemBuilder: (context, idx) {
                                    final msg = _messages[idx];
                                    return Align(
                                      alignment:
                                          msg['from'] == 'driver'
                                              ? Alignment.centerRight
                                              : Alignment.centerLeft,
                                      child: Container(
                                        margin: const EdgeInsets.symmetric(
                                          vertical: 4,
                                          horizontal: 8,
                                        ),
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color:
                                              msg['from'] == 'driver'
                                                  ? Colors.teal.withOpacity(0.2)
                                                  : Colors.blue.withOpacity(
                                                    0.2,
                                                  ),
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            if (msg['imageUrl'] != null &&
                                                msg['imageUrl']
                                                    .toString()
                                                    .isNotEmpty)
                                              ClipRRect(
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                                child: Image.network(
                                                  msg['imageUrl'],
                                                  width: 120,
                                                  height: 80,
                                                  fit: BoxFit.cover,
                                                ),
                                              ),
                                            if (msg['text'] != null &&
                                                msg['text']
                                                    .toString()
                                                    .isNotEmpty)
                                              Padding(
                                                padding: const EdgeInsets.only(
                                                  top: 4,
                                                ),
                                                child: Text(msg['text']),
                                              ),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                      ),
                      const SizedBox(height: 8),

                      // Input row
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _messageController,
                              decoration: const InputDecoration(
                                hintText: 'Type your message...',
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.photo, color: Colors.teal),
                            onPressed: () => _pickImage(ImageSource.gallery),
                          ),
                          IconButton(
                            icon: const Icon(
                              Icons.camera_alt,
                              color: Colors.teal,
                            ),
                            onPressed: () => _pickImage(ImageSource.camera),
                          ),
                          IconButton(
                            icon: const Icon(Icons.send, color: Colors.teal),
                            onPressed:
                                () => _sendMessage(
                                  text: _messageController.text,
                                  image: _selectedImage,
                                ),
                          ),
                        ],
                      ),

                      // Preview selected image
                      if (_selectedImage != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Stack(
                            alignment: Alignment.topRight,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.file(
                                  _selectedImage!,
                                  width: 120,
                                  height: 80,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.close,
                                  color: Colors.red,
                                ),
                                onPressed:
                                    () => setState(() => _selectedImage = null),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              // Special Notes
              Card(
                color: pastelCard,
                margin: const EdgeInsets.only(bottom: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Add Special Notes for Admin',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _noteController,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          hintText: 'Type your note here...',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 8),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.note_add),
                        label: const Text('Send Note'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.teal,
                        ),
                        onPressed: () {
                          if (_noteController.text.trim().isNotEmpty) {
                            _sendNote(_noteController.text.trim());
                          }
                        },
                      ),
                    ],
                  ),
                ),
              ),

              // Driver Guide
              Card(
                color: pastelCard,
                margin: const EdgeInsets.only(bottom: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Driver Guide',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        '• Always check your vehicle before starting your route.\n'
                        '• Follow the scheduled pickups and mark them as completed.\n'
                        '• Report any bin issues immediately.\n'
                        '• Use this section to contact admin for urgent matters.\n'
                        '• Keep your profile and settings up to date.',
                        style: TextStyle(fontSize: 15),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

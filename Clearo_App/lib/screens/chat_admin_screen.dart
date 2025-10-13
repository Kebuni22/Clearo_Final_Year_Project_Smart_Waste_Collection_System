import 'package:flutter/material.dart';

class ChatAdminScreen extends StatefulWidget {
  const ChatAdminScreen({Key? key}) : super(key: key);

  @override
  State<ChatAdminScreen> createState() => _ChatAdminScreenState();
}

class _ChatAdminScreenState extends State<ChatAdminScreen> {
  final TextEditingController _messageController = TextEditingController();
  final List<Map<String, dynamic>> _messages = [
    {'message': 'Hello! How can I assist you today?', 'isAdmin': true},
    {'message': 'I need help with my pickup request.', 'isAdmin': false},
  ];

  void _sendMessage(String message) {
    if (message.trim().isEmpty) return;

    setState(() {
      _messages.add({'message': message, 'isAdmin': false});
    });

    _messageController.clear();

    // Simulate an automatic reply
    Future.delayed(const Duration(seconds: 1), () {
      setState(() {
        _messages.add({
          'message': 'Thank you for reaching out. We will assist you shortly.',
          'isAdmin': true,
        });
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat with Admin'),
        backgroundColor: const Color(0xFF8FD3A9),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                return Align(
                  alignment:
                      message['isAdmin']
                          ? Alignment.centerLeft
                          : Alignment.centerRight,
                  child: ChatBubble(
                    message: message['message'],
                    isAdmin: message['isAdmin'],
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: 'Type your message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                      fillColor: Colors.grey.shade200,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send, color: Color(0xFF8FD3A9)),
                  onPressed: () => _sendMessage(_messageController.text),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ChatBubble extends StatelessWidget {
  final String message;
  final bool isAdmin;

  const ChatBubble({Key? key, required this.message, required this.isAdmin})
    : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isAdmin ? const Color(0xFF8FD3A9) : Colors.grey.shade300,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(12),
          topRight: const Radius.circular(12),
          bottomLeft:
              isAdmin ? const Radius.circular(0) : const Radius.circular(12),
          bottomRight:
              isAdmin ? const Radius.circular(12) : const Radius.circular(0),
        ),
      ),
      child: Text(
        message,
        style: TextStyle(color: isAdmin ? Colors.white : Colors.black87),
      ),
    );
  }
}

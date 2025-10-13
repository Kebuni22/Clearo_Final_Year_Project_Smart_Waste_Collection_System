import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ReportIssueScreen extends StatefulWidget {
  const ReportIssueScreen({Key? key}) : super(key: key);

  @override
  State<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends State<ReportIssueScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  String _selectedCategory = 'Missed Collection';
  final List<File> _attachments = [];
  final ImagePicker _picker = ImagePicker();
  bool _isUrgent = false;
  bool _showPreviousIssues = false;
  bool _isSubmitting = false;
  String? _currentEditingIssueId;

  // Eye-friendly color palette
  final Color _primaryColor = const Color(0xFF5E8B7E); // Soft teal
  final Color _secondaryColor = const Color(0xFFA7C4BC); // Light teal
  final Color _accentColor = const Color(0xFFDFEEEA); // Very light teal
  final Color _darkColor = const Color(0xFF2F5D62); // Dark teal
  final Color _warningColor = const Color(0xFFFFB344); // Soft orange
  final Color _errorColor = const Color(0xFFF05454); // Soft red

  final List<String> _categories = [
    'Missed Collection',
    'Bin Damaged',
    'Billing Issue',
    'Schedule Change',
    'App Problem',
    'Other',
  ];

  final List<Map<String, dynamic>> _previousIssues = [];
  final Map<String, dynamic> _userData = {};

  @override
  void initState() {
    super.initState();
    _fetchUserData();
    _fetchPreviousIssues();
  }

  Future<void> _fetchUserData() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Please login to report issues'),
            backgroundColor: _errorColor,
          ),
        );
        return;
      }

      final userDoc =
          await FirebaseFirestore.instance
              .collection('users')
              .doc(user.uid)
              .get();

      if (userDoc.exists) {
        setState(() {
          _userData.addAll(userDoc.data() ?? {});
          _userData['userId'] = user.uid;
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'User profile not found. Please complete your profile.',
            ),
            backgroundColor: _errorColor,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error fetching user data: $e'),
          backgroundColor: _errorColor,
        ),
      );
    }
  }

  Future<void> _fetchPreviousIssues() async {
    try {
      if (_userData['userId'] == null) return;

      final querySnapshot =
          await FirebaseFirestore.instance
              .collection('issues')
              .where('userId', isEqualTo: _userData['userId'])
              .orderBy('timestamp', descending: true)
              .get();

      final issues =
          querySnapshot.docs.map((doc) {
            final data = doc.data();
            return {
              'id': doc.id,
              'title': data['title'] ?? 'No Title',
              'category': data['category'] ?? 'Unknown',
              'description': data['description'] ?? 'No Description',
              'status': data['status'] ?? 'Submitted',
              'isUrgent': data['isUrgent'] ?? false,
              'attachments': data['attachments'] ?? [],
              'date':
                  (data['timestamp'] as Timestamp?)
                      ?.toDate()
                      .toIso8601String() ??
                  'Unknown',
              'binName': data['binName'] ?? 'Unknown',
            };
          }).toList();

      setState(() {
        _previousIssues.clear();
        _previousIssues.addAll(issues);
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error fetching previous issues: $e'),
          backgroundColor: _errorColor,
        ),
      );
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final pickedImage = await _picker.pickImage(source: source);
      if (pickedImage != null) {
        setState(() {
          _attachments.add(File(pickedImage.path));
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error picking image: $e'),
          backgroundColor: _errorColor,
        ),
      );
    }
  }

  void _showImagePickerOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder:
          (context) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: Icon(Icons.camera_alt, color: _primaryColor),
                title: const Text('Take a Photo'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: Icon(Icons.photo_library, color: _primaryColor),
                title: const Text('Choose from Gallery'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery);
                },
              ),
            ],
          ),
    );
  }

  Future<void> _submitIssue() async {
    if (!_formKey.currentState!.validate()) return;

    if (_userData['userId'] == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please login to submit an issue.'),
          backgroundColor: _errorColor,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      // Upload attachments
      List<String> attachmentUrls = [];
      for (var file in _attachments) {
        try {
          final uniqueFileName =
              'issues/${_userData['userId']}/${DateTime.now().millisecondsSinceEpoch}_${file.path.split('/').last}';
          final ref = FirebaseStorage.instance.ref().child(uniqueFileName);
          final uploadTask = ref.putFile(file);
          final snapshot = await uploadTask.whenComplete(() {});
          final url = await snapshot.ref.getDownloadURL();
          attachmentUrls.add(url);
        } catch (e) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error uploading attachment: ${e.toString()}'),
              backgroundColor: _errorColor,
            ),
          );
          setState(() => _isSubmitting = false);
          return;
        }
      }

      // Prepare issue data
      final issueData = {
        'userId': _userData['userId'],
        'title': _titleController.text,
        'category': _selectedCategory,
        'description': _descriptionController.text,
        'isUrgent': _isUrgent,
        'attachments': attachmentUrls,
        'status': _isUrgent ? 'Urgent' : 'Submitted',
        'timestamp': FieldValue.serverTimestamp(),
      };

      if (_currentEditingIssueId != null) {
        // Update existing issue
        await FirebaseFirestore.instance
            .collection('issues')
            .doc(_currentEditingIssueId)
            .update(issueData);

        // Update local list
        final index = _previousIssues.indexWhere(
          (issue) => issue['id'] == _currentEditingIssueId,
        );
        if (index != -1) {
          setState(() {
            _previousIssues[index] = {
              ..._previousIssues[index],
              ...issueData,
              'id': _currentEditingIssueId!,
              'date': DateTime.now().toIso8601String(),
            };
          });
        }
      } else {
        // Create new issue
        final docRef = await FirebaseFirestore.instance
            .collection('issues')
            .add(issueData);

        setState(() {
          _previousIssues.insert(0, {
            ...issueData,
            'id': docRef.id,
            'date': DateTime.now().toIso8601String(),
          });
        });
      }

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _currentEditingIssueId != null
                ? 'Issue updated successfully'
                : 'Issue submitted successfully',
          ),
          backgroundColor: _primaryColor,
        ),
      );

      // Reset form
      _resetForm();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error submitting issue: ${e.toString()}'),
          backgroundColor: _errorColor,
        ),
      );
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  void _resetForm() {
    _formKey.currentState?.reset();
    _titleController.clear();
    _descriptionController.clear();
    setState(() {
      _selectedCategory = 'Missed Collection';
      _isUrgent = false;
      _attachments.clear();
      _currentEditingIssueId = null;
    });
  }

  Widget _buildPreviousIssues() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Previous Issues',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: _darkColor,
                ),
              ),
              IconButton(
                icon: Icon(
                  _showPreviousIssues ? Icons.expand_less : Icons.expand_more,
                  color: _primaryColor,
                ),
                onPressed: () {
                  setState(() {
                    _showPreviousIssues = !_showPreviousIssues;
                  });
                },
              ),
            ],
          ),
        ),
        if (_showPreviousIssues)
          ..._previousIssues.map((issue) => _buildIssueCard(issue)).toList(),
      ],
    );
  }

  Widget _buildIssueCard(Map<String, dynamic> issue) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showIssueDetails(issue),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      issue['title'],
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _darkColor,
                        fontSize: 16,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  PopupMenuButton<String>(
                    icon: Icon(Icons.more_vert, color: _primaryColor),
                    onSelected: (value) {
                      if (value == 'edit') {
                        _editIssue(issue);
                      } else if (value == 'delete') {
                        _confirmDeleteIssue(issue['id']);
                      }
                    },
                    itemBuilder:
                        (context) => [
                          const PopupMenuItem(
                            value: 'edit',
                            child: Text('Edit'),
                          ),
                          const PopupMenuItem(
                            value: 'delete',
                            child: Text('Delete'),
                          ),
                        ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getStatusColor(issue['status']).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _getStatusColor(issue['status']),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      issue['status'],
                      style: TextStyle(
                        color: _getStatusColor(issue['status']),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Category: ${issue['category']}',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                  ),
                  if (issue['isUrgent'] == true) ...[
                    const SizedBox(width: 8),
                    Row(
                      children: [
                        Icon(Icons.warning, color: _warningColor, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          'Urgent',
                          style: TextStyle(
                            color: _warningColor,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 8),
              Text(
                issue['description'],
                style: const TextStyle(fontSize: 14),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    issue['date'].toString().substring(0, 10),
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Resolved':
        return Colors.green;
      case 'Urgent':
        return _warningColor;
      case 'In Progress':
        return Colors.blue;
      default:
        return _primaryColor;
    }
  }

  void _editIssue(Map<String, dynamic> issue) {
    _titleController.text = issue['title'];
    _descriptionController.text = issue['description'];
    setState(() {
      _selectedCategory = issue['category'];
      _isUrgent = issue['isUrgent'] ?? false;
      _currentEditingIssueId = issue['id'];
    });
    // Scroll to form
    Scrollable.ensureVisible(
      _formKey.currentContext!,
      duration: const Duration(milliseconds: 300),
    );
  }

  void _confirmDeleteIssue(String issueId) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: const Text('Confirm Delete'),
            content: const Text('Are you sure you want to delete this issue?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  _deleteIssue(issueId);
                },
                child: const Text(
                  'Delete',
                  style: TextStyle(color: Colors.red),
                ),
              ),
            ],
          ),
    );
  }

  Future<void> _deleteIssue(String issueId) async {
    try {
      await FirebaseFirestore.instance
          .collection('issues')
          .doc(issueId)
          .delete();
      setState(() {
        _previousIssues.removeWhere((issue) => issue['id'] == issueId);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Issue deleted successfully'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error deleting issue: $e'),
          backgroundColor: _errorColor,
        ),
      );
    }
  }

  void _showIssueDetails(Map<String, dynamic> issue) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Text(issue['title']),
            content: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildDetailRow('Category', issue['category']),
                  _buildDetailRow('Status', issue['status'], isStatus: true),
                  _buildDetailRow('Bin Name', issue['binName'] ?? 'Unknown'),
                  if (issue['isUrgent'] == true)
                    _buildDetailRow(
                      'Priority',
                      'Urgent',
                      valueColor: _warningColor,
                    ),
                  const SizedBox(height: 16),
                  const Text(
                    'Description:',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(issue['description']),
                  const SizedBox(height: 16),
                  if (issue['attachments'] != null &&
                      (issue['attachments'] as List).isNotEmpty)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Attachments:',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 100,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: (issue['attachments'] as List).length,
                            itemBuilder:
                                (context, index) => Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: GestureDetector(
                                    onTap:
                                        () => _showFullImage(
                                          issue['attachments'][index],
                                        ),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.network(
                                        issue['attachments'][index],
                                        width: 100,
                                        height: 100,
                                        fit: BoxFit.cover,
                                        errorBuilder:
                                            (context, error, stackTrace) =>
                                                Container(
                                                  width: 100,
                                                  height: 100,
                                                  color: Colors.grey[200],
                                                  child: const Icon(
                                                    Icons.broken_image,
                                                  ),
                                                ),
                                      ),
                                    ),
                                  ),
                                ),
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 16),
                  _buildDetailRow(
                    'Reported On',
                    issue['date'].toString().substring(0, 10),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
            ],
          ),
    );
  }

  Widget _buildDetailRow(
    String label,
    String value, {
    bool isStatus = false,
    Color? valueColor,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: valueColor ?? (isStatus ? _getStatusColor(value) : null),
                fontWeight: isStatus ? FontWeight.bold : null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showFullImage(String imageUrl) {
    showDialog(
      context: context,
      builder:
          (context) => Dialog(
            child: InteractiveViewer(
              panEnabled: true,
              minScale: 0.5,
              maxScale: 3.0,
              child: Image.network(
                imageUrl,
                fit: BoxFit.contain,
                errorBuilder:
                    (context, error, stackTrace) => Container(
                      padding: const EdgeInsets.all(20),
                      child: const Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.error, color: Colors.red),
                          SizedBox(height: 10),
                          Text('Failed to load image'),
                        ],
                      ),
                    ),
              ),
            ),
          ),
    );
  }

  Widget _buildAttachmentPreview(File file) {
    return Stack(
      alignment: Alignment.topRight,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.file(file, width: 100, height: 100, fit: BoxFit.cover),
        ),
        Container(
          decoration: BoxDecoration(
            color: _errorColor.withOpacity(0.8),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.close, size: 16, color: Colors.white),
            onPressed: () {
              setState(() {
                _attachments.remove(file);
              });
            },
          ),
        ),
      ],
    );
  }

  Widget _buildAddAttachmentButton() {
    return GestureDetector(
      onTap: _showImagePickerOptions,
      child: Container(
        width: 100,
        height: 100,
        decoration: BoxDecoration(
          color: _accentColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _primaryColor.withOpacity(0.3)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.attach_file, color: _primaryColor, size: 30),
            const SizedBox(height: 8),
            Text(
              'Add Photo',
              style: TextStyle(color: _primaryColor, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report Issue'),
        backgroundColor: _primaryColor,
        elevation: 0,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildPreviousIssues(),
            const SizedBox(height: 16),
            Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _currentEditingIssueId != null
                        ? 'Edit Issue'
                        : 'Report New Issue',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: _darkColor,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Title field
                  TextFormField(
                    controller: _titleController,
                    decoration: InputDecoration(
                      labelText: 'Issue Title',
                      labelStyle: TextStyle(color: _darkColor),
                      hintText: 'Enter a brief title for your issue',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: _primaryColor),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: _primaryColor, width: 2),
                      ),
                      filled: true,
                      fillColor: _accentColor.withOpacity(0.3),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter a title';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Category dropdown
                  DropdownButtonFormField<String>(
                    decoration: InputDecoration(
                      labelText: 'Category',
                      labelStyle: TextStyle(color: _darkColor),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: _primaryColor),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: _primaryColor, width: 2),
                      ),
                      filled: true,
                      fillColor: _accentColor.withOpacity(0.3),
                    ),
                    value: _selectedCategory,
                    items:
                        _categories
                            .map(
                              (category) => DropdownMenuItem(
                                value: category,
                                child: Text(category),
                              ),
                            )
                            .toList(),
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _selectedCategory = value;
                        });
                      }
                    },
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please select a category';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Description field
                  TextFormField(
                    controller: _descriptionController,
                    decoration: InputDecoration(
                      labelText: 'Description',
                      labelStyle: TextStyle(color: _darkColor),
                      hintText: 'Please describe the issue in detail',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: _primaryColor),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: _primaryColor, width: 2),
                      ),
                      filled: true,
                      fillColor: _accentColor.withOpacity(0.3),
                      alignLabelWithHint: true,
                    ),
                    maxLines: 5,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please provide a description';
                      }
                      if (value.trim().length < 10) {
                        return 'Description must be at least 10 characters';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Urgent checkbox
                  CheckboxListTile(
                    title: Text(
                      'This issue requires urgent attention',
                      style: TextStyle(color: _darkColor),
                    ),
                    value: _isUrgent,
                    onChanged: (value) {
                      setState(() {
                        _isUrgent = value ?? false;
                      });
                    },
                    controlAffinity: ListTileControlAffinity.leading,
                    contentPadding: EdgeInsets.zero,
                    activeColor: _primaryColor,
                    tileColor: _accentColor.withOpacity(0.3),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  const SizedBox(height: 16),

                  Text(
                    'Attachments (Optional)',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: _darkColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Add photos to help us understand the issue better',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                  ),
                  const SizedBox(height: 12),

                  // Attachments
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      ..._attachments.map(
                        (file) => _buildAttachmentPreview(file),
                      ),
                      if (_attachments.length < 5) _buildAddAttachmentButton(),
                    ],
                  ),
                  const SizedBox(height: 32),

                  // Submit button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitIssue,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _primaryColor,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 2,
                      ),
                      child:
                          _isSubmitting
                              ? const CircularProgressIndicator(
                                color: Colors.white,
                              )
                              : Text(
                                _currentEditingIssueId != null
                                    ? 'UPDATE ISSUE'
                                    : 'SUBMIT ISSUE',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                    ),
                  ),
                  if (_currentEditingIssueId != null) ...[
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: _resetForm,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          side: BorderSide(color: _primaryColor),
                        ),
                        child: Text(
                          'CANCEL EDIT',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: _primaryColor,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

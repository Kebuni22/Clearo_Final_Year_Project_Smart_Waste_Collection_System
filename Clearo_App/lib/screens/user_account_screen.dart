import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class UserAccountScreen extends StatefulWidget {
  const UserAccountScreen({super.key});

  @override
  State<UserAccountScreen> createState() => _UserAccountScreenState();
}

class _UserAccountScreenState extends State<UserAccountScreen> {
  final User? _user = FirebaseAuth.instance.currentUser;
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _homeNumberController = TextEditingController();
  final _addressController = TextEditingController();
  bool _isLoading = false;
  bool _isEditing = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _fetchUserDetails();
  }

  Future<void> _fetchUserDetails() async {
    if (_user == null) return;

    setState(() => _isLoading = true);

    try {
      final DocumentSnapshot userDoc =
          await FirebaseFirestore.instance
              .collection('users')
              .doc(_user!.uid)
              .get();

      if (userDoc.exists) {
        final data = userDoc.data() as Map<String, dynamic>;
        _nameController.text = data['name'] ?? '';
        _emailController.text = data['email'] ?? _user!.email ?? '';
        _phoneController.text = data['phone'] ?? '';
        _homeNumberController.text = data['homeNumber'] ?? '';
        _addressController.text =
            '${data['homeNumber'] ?? ''}, ${data['address'] ?? ''}'
                .trim(); // Updated
      }
    } catch (e) {
      _showSnackBar('Error fetching user details: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _updateUserDetails() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(_user!.uid)
          .update({
            'name': _nameController.text.trim(),
            'phone': _phoneController.text.trim(),
            'homeNumber': _homeNumberController.text.trim(),
            'address':
                _addressController.text
                    .replaceFirst('${_homeNumberController.text.trim()}, ', '')
                    .trim(), // Updated
            'updatedAt': FieldValue.serverTimestamp(),
          });

      _showSnackBar('Profile updated successfully!');
      setState(() => _isEditing = false);
    } catch (e) {
      _showSnackBar('Error updating profile: $e');
    } finally {
      setState(() => _isSaving = false);
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _homeNumberController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Account'),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.green.shade700, Colors.green.shade500],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        actions: [
          if (!_isEditing)
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () => setState(() => _isEditing = true),
            ),
          if (_isEditing)
            TextButton(
              onPressed: () => setState(() => _isEditing = false),
              child: const Text(
                'Cancel',
                style: TextStyle(color: Colors.white),
              ),
            ),
        ],
      ),
      body:
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      _buildProfileHeader(),
                      const SizedBox(height: 30),
                      _buildEditableFields(),
                      if (_isEditing) _buildSaveButton(),
                    ],
                  ),
                ),
              ),
    );
  }

  Widget _buildProfileHeader() {
    return Hero(
      tag: 'user-profile',
      child: Material(
        color: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.green.shade100, Colors.green.shade50],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withOpacity(0.2),
                blurRadius: 10,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [Colors.green.shade700, Colors.green.shade500],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.green.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    _nameController.text.isNotEmpty
                        ? _nameController.text[0].toUpperCase()
                        : '?',
                    style: const TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _nameController.text.isNotEmpty
                          ? _nameController.text
                          : 'No name provided',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      _emailController.text.isNotEmpty
                          ? _emailController.text
                          : 'No email provided',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 10),
                    _buildProfileDetail(Icons.phone, _phoneController.text),
                    _buildProfileDetail(
                      Icons.location_on,
                      _addressController.text,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileDetail(IconData icon, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.green.shade600),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value.isNotEmpty ? value : 'Not provided',
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEditableFields() {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: _isEditing ? _buildEditForm() : _buildViewOnlyDetails(),
    );
  }

  Widget _buildViewOnlyDetails() {
    return Column(
      children: [
        _buildDetailCard(Icons.person, 'Name', _nameController.text),
        _buildDetailCard(Icons.email, 'Email', _emailController.text),
        _buildDetailCard(Icons.phone, 'Phone', _phoneController.text),
        _buildDetailCard(Icons.location_on, 'Address', _addressController.text),
      ],
    );
  }

  Widget _buildDetailCard(IconData icon, String label, String value) {
    return Card(
      margin: const EdgeInsets.only(bottom: 15),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Row(
          children: [
            Icon(icon, color: Colors.green.shade600),
            const SizedBox(width: 15),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    value.isNotEmpty ? value : 'Not provided',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEditForm() {
    return Column(
      children: [
        _buildTextField(_nameController, 'Full Name', Icons.person),
        const SizedBox(height: 15),
        _buildTextField(_emailController, 'Email', Icons.email, enabled: false),
        const SizedBox(height: 15),
        _buildTextField(_phoneController, 'Phone Number', Icons.phone),
        const SizedBox(height: 15),
        _buildTextField(_homeNumberController, 'Home Number', Icons.home),
        const SizedBox(height: 15),
        _buildTextField(_addressController, 'Address', Icons.location_on),
      ],
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label,
    IconData icon, {
    bool enabled = true,
  }) {
    return TextFormField(
      controller: controller,
      enabled: enabled,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: Colors.green.shade600),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.green.shade600, width: 2),
        ),
        filled: true,
        fillColor: Colors.grey.shade50,
      ),
      validator: (value) {
        if (label != 'Email' && (value == null || value.trim().isEmpty)) {
          return 'Please enter your $label';
        }
        return null;
      },
    );
  }

  Widget _buildSaveButton() {
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: _isSaving ? null : _updateUserDetails,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green.shade600,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: 0,
          ),
          child:
              _isSaving
                  ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                  : const Text(
                    'SAVE CHANGES',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1,
                    ),
                  ),
        ),
      ),
    );
  }
}

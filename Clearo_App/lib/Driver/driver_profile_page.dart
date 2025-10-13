import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class DriverProfilePage extends StatefulWidget {
  final String driverName;
  const DriverProfilePage({Key? key, required this.driverName})
    : super(key: key);

  @override
  State<DriverProfilePage> createState() => _DriverProfilePageState();
}

class _DriverProfilePageState extends State<DriverProfilePage> {
  bool isLoading = true;
  bool isEditing = false;
  Map<String, dynamic>? driverData;
  File? _profileImage;

  // Form controllers
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _licenceController = TextEditingController();
  final _addressController = TextEditingController();
  final _emergencyNameController = TextEditingController();
  final _emergencyPhoneController = TextEditingController();
  final _joinedController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchDriverData();
  }

  Future<void> _fetchDriverData() async {
    setState(() => isLoading = true);
    final query =
        await FirebaseFirestore.instance
            .collection('drivers')
            .where('name', isEqualTo: widget.driverName)
            .limit(1)
            .get();

    if (query.docs.isNotEmpty) {
      driverData = query.docs.first.data();
    } else {
      driverData = null;
    }

    // Fill controllers if data exists
    _emailController.text = driverData?['email'] ?? '';
    _phoneController.text = driverData?['phone'] ?? '';
    _licenceController.text = driverData?['licenceNumber'] ?? '';
    _addressController.text = driverData?['address'] ?? '';
    _emergencyNameController.text = driverData?['emergencyContactName'] ?? '';
    _emergencyPhoneController.text = driverData?['emergencyContactPhone'] ?? '';
    _joinedController.text = driverData?['joined'] ?? '';
    setState(() => isLoading = false);
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    String? profilePhotoUrl;
    if (_profileImage != null) {
      // Upload image to Firebase Storage
      final storageRef = FirebaseStorage.instance.ref().child(
        'driver_profiles/${widget.driverName}',
      );
      await storageRef.putFile(_profileImage!);
      profilePhotoUrl = await storageRef.getDownloadURL();
    }

    final docRef = FirebaseFirestore.instance
        .collection('drivers')
        .doc(widget.driverName);

    await docRef.set({
      'name': widget.driverName,
      'employeeNumber':
          'DRV-${widget.driverName.substring(0, 3).toUpperCase()}001',
      'email': _emailController.text,
      'phone': _phoneController.text,
      'licenceNumber': _licenceController.text,
      'address': _addressController.text,
      'emergencyContactName': _emergencyNameController.text,
      'emergencyContactPhone': _emergencyPhoneController.text,
      'joined': _joinedController.text,
      if (profilePhotoUrl != null) 'profilePhotoUrl': profilePhotoUrl,
    }, SetOptions(merge: true));

    setState(() {
      isEditing = false;
    });
    _fetchDriverData();

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Profile updated')));
  }

  Future<void> _pickProfileImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked != null) {
      setState(() {
        _profileImage = File(picked.path);
      });
    }
  }

  Widget _profilePhotoWidget() {
    final photoUrl = driverData?['profilePhotoUrl'];
    if (_profileImage != null) {
      return CircleAvatar(
        radius: 45,
        backgroundImage: FileImage(_profileImage!),
      );
    } else if (photoUrl != null && photoUrl != '') {
      return CircleAvatar(radius: 45, backgroundImage: NetworkImage(photoUrl));
    } else {
      return CircleAvatar(
        radius: 45,
        backgroundColor: const Color(0xFFB3E5FC),
        child: const Icon(Icons.person, size: 40, color: Colors.white),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final pastelBg = const Color(0xFFF8F9FA);
    final pastelCard = const Color(0xFFB2DFDB);
    final pastelAccent = const Color(0xFFB3E5FC);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        backgroundColor: pastelCard,
        elevation: 0,
        actions: [
          if (!isLoading && !isEditing)
            IconButton(
              icon: const Icon(Icons.edit, color: Color(0xFF00897B)),
              onPressed: () => setState(() => isEditing = true),
              tooltip: 'Edit Profile',
            ),
        ],
      ),
      backgroundColor: pastelBg,
      body:
          isLoading
              ? const Center(child: CircularProgressIndicator())
              : Center(
                child: Card(
                  color: pastelCard,
                  elevation: 4,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                  margin: const EdgeInsets.all(24),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child:
                        isEditing
                            ? Form(
                              key: _formKey,
                              child: SingleChildScrollView(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Stack(
                                      alignment: Alignment.bottomRight,
                                      children: [
                                        _profilePhotoWidget(),
                                        IconButton(
                                          icon: Container(
                                            decoration: BoxDecoration(
                                              color: pastelAccent,
                                              shape: BoxShape.circle,
                                            ),
                                            child: const Icon(
                                              Icons.camera_alt,
                                              color: Color(0xFF00897B),
                                            ),
                                          ),
                                          onPressed: _pickProfileImage,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      widget.driverName,
                                      style: const TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF00695C),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'DRV-${widget.driverName.substring(0, 3).toUpperCase()}001',
                                      style: const TextStyle(
                                        fontSize: 16,
                                        color: Color(0xFF00897B),
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    TextFormField(
                                      controller: _emailController,
                                      decoration: const InputDecoration(
                                        labelText: 'Email Address',
                                        prefixIcon: Icon(Icons.email),
                                        filled: true,
                                        fillColor: Colors.white,
                                      ),
                                      validator:
                                          (v) =>
                                              v == null || v.isEmpty
                                                  ? 'Required'
                                                  : null,
                                    ),
                                    const SizedBox(height: 12),
                                    TextFormField(
                                      controller: _phoneController,
                                      decoration: const InputDecoration(
                                        labelText: 'Phone Number',
                                        prefixIcon: Icon(Icons.phone),
                                        filled: true,
                                        fillColor: Colors.white,
                                      ),
                                      validator:
                                          (v) =>
                                              v == null || v.isEmpty
                                                  ? 'Required'
                                                  : null,
                                    ),
                                    const SizedBox(height: 12),
                                    TextFormField(
                                      controller: _licenceController,
                                      decoration: const InputDecoration(
                                        labelText: 'Driving Licence Number',
                                        prefixIcon: Icon(Icons.credit_card),
                                        filled: true,
                                        fillColor: Colors.white,
                                      ),
                                      validator:
                                          (v) =>
                                              v == null || v.isEmpty
                                                  ? 'Required'
                                                  : null,
                                    ),
                                    const SizedBox(height: 12),
                                    TextFormField(
                                      controller: _addressController,
                                      decoration: const InputDecoration(
                                        labelText: 'Address',
                                        prefixIcon: Icon(Icons.home),
                                        filled: true,
                                        fillColor: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    TextFormField(
                                      controller: _emergencyNameController,
                                      decoration: const InputDecoration(
                                        labelText: 'Emergency Contact Name',
                                        prefixIcon: Icon(Icons.person_outline),
                                        filled: true,
                                        fillColor: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    TextFormField(
                                      controller: _emergencyPhoneController,
                                      decoration: const InputDecoration(
                                        labelText: 'Emergency Contact Number',
                                        prefixIcon: Icon(Icons.phone_in_talk),
                                        filled: true,
                                        fillColor: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    TextFormField(
                                      controller: _joinedController,
                                      decoration: const InputDecoration(
                                        labelText: 'Joined Date',
                                        prefixIcon: Icon(Icons.calendar_today),
                                        filled: true,
                                        fillColor: Colors.white,
                                        suffixIcon: Icon(Icons.date_range),
                                      ),
                                      readOnly: true,
                                      onTap: () async {
                                        DateTime? picked = await showDatePicker(
                                          context: context,
                                          initialDate:
                                              _joinedController.text.isNotEmpty
                                                  ? DateTime.tryParse(
                                                        _joinedController.text,
                                                      ) ??
                                                      DateTime.now()
                                                  : DateTime.now(),
                                          firstDate: DateTime(2000),
                                          lastDate: DateTime.now(),
                                        );
                                        if (picked != null) {
                                          _joinedController.text =
                                              "${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
                                        }
                                      },
                                      validator:
                                          (v) =>
                                              v == null || v.isEmpty
                                                  ? 'Required'
                                                  : null,
                                    ),
                                    const SizedBox(height: 20),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        TextButton(
                                          onPressed:
                                              () => setState(
                                                () => isEditing = false,
                                              ),
                                          child: const Text('Cancel'),
                                        ),
                                        ElevatedButton(
                                          onPressed: _saveProfile,
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(
                                              0xFF00897B,
                                            ),
                                          ),
                                          child: const Text('Save'),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            )
                            : Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                _profilePhotoWidget(),
                                const SizedBox(height: 16),
                                Text(
                                  driverData?['name'] ?? widget.driverName,
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF00695C),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  driverData?['employeeNumber'] ??
                                      'DRV-${widget.driverName.substring(0, 3).toUpperCase()}001',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    color: Color(0xFF00897B),
                                  ),
                                ),
                                const SizedBox(height: 16),
                                ListTile(
                                  leading: const Icon(
                                    Icons.phone,
                                    color: Color(0xFF00897B),
                                  ),
                                  title: Text(
                                    driverData?['phone'] ?? 'Not set',
                                  ),
                                ),
                                ListTile(
                                  leading: const Icon(
                                    Icons.email,
                                    color: Color(0xFF00897B),
                                  ),
                                  title: Text(
                                    driverData?['email'] ?? 'Not set',
                                  ),
                                ),
                                ListTile(
                                  leading: const Icon(
                                    Icons.credit_card,
                                    color: Color(0xFF00897B),
                                  ),
                                  title: Text(
                                    'Licence: ${driverData?['licenceNumber'] ?? 'Not set'}',
                                  ),
                                ),
                                ListTile(
                                  leading: const Icon(
                                    Icons.home,
                                    color: Color(0xFF00897B),
                                  ),
                                  title: Text(
                                    driverData?['address'] ?? 'Not set',
                                  ),
                                ),
                                ListTile(
                                  leading: const Icon(
                                    Icons.person_outline,
                                    color: Color(0xFF00897B),
                                  ),
                                  title: Text(
                                    'Emergency Contact: ${driverData?['emergencyContactName'] ?? 'Not set'}',
                                  ),
                                ),
                                ListTile(
                                  leading: const Icon(
                                    Icons.phone_in_talk,
                                    color: Color(0xFF00897B),
                                  ),
                                  title: Text(
                                    'Emergency Number: ${driverData?['emergencyContactPhone'] ?? 'Not set'}',
                                  ),
                                ),
                                ListTile(
                                  leading: const Icon(
                                    Icons.calendar_today,
                                    color: Color(0xFF00897B),
                                  ),
                                  title: Text(
                                    'Joined: ${driverData?['joined'] ?? 'Not set'}',
                                  ),
                                ),
                                if (driverData == null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 12),
                                    child: ElevatedButton.icon(
                                      icon: const Icon(Icons.edit),
                                      label: const Text('Add Profile Data'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(
                                          0xFF00897B,
                                        ),
                                      ),
                                      onPressed:
                                          () =>
                                              setState(() => isEditing = true),
                                    ),
                                  ),
                              ],
                            ),
                  ),
                ),
              ),
    );
  }
}

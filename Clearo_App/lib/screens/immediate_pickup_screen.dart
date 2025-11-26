import 'package:clearo/screens/chat_admin_screen.dart';
import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:clearo/screens/truck_tracking_screen.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ImmediatePickupScreen extends StatefulWidget {
  const ImmediatePickupScreen({Key? key}) : super(key: key);

  @override
  State<ImmediatePickupScreen> createState() => _ImmediatePickupScreenState();
}

class _ImmediatePickupScreenState extends State<ImmediatePickupScreen> {
  bool _isRequestView = true;
  int _currentStep = 0;
  List<String> selectedBins = []; // Changed to List for multiple selection
  String? paymentStatus;
  String? selectedPaymentMethod; // Track selected payment method
  bool _isProcessingPayment = false; // Add loading state for payment
  String? pickupTime;
  DateTime? selectedDate; // Add selected date variable
  final TextEditingController _instructionsController = TextEditingController();
  final TextEditingController _reasonController =
      TextEditingController(); // Add reason controller

  // Modern color palette
  final Color _primaryColor = const Color(0xFF8FD3A9);
  final Color _secondaryColor = const Color(0xFFC5E8B7);
  final Color _accentColor = const Color(0xFF6AC47A);
  final Color _darkColor = const Color(0xFF4A7856);
  final Color _lightColor = const Color(0xFFF0F7F4);
  final Color _errorColor = const Color(0xFFFF6B6B);

  final List<Map<String, String>> _pickupHistory = [
    {'bin': 'BIN-1001', 'time': '9:00 AM', 'date': 'Today'},
    {'bin': 'BIN-1002', 'time': '12:00 PM', 'date': 'Yesterday'},
  ];

  List<Map<String, dynamic>> _userBins = []; // Store user bins

  Future<void> _fetchUserBins() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      // Fetch user's home number from Firestore
      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .get();

      final homeNumber = userDoc.data()?['homeNumber'];
      if (homeNumber == null) {
        throw Exception('Home number not found for the user.');
      }

      // Fetch bins associated with the user's home number
      final querySnapshot = await FirebaseFirestore.instance
          .collection('bins')
          .where('homeNumber', isEqualTo: homeNumber)
          .get();

      if (querySnapshot.docs.isEmpty) {
        throw Exception('No bins found for the user\'s home number.');
      }

      setState(() {
        _userBins = querySnapshot.docs.map((doc) {
          final data = doc.data();
          return {
            'id': doc.id,
            'binId': data['binId'], // Use binId directly from the database
            'status': data['status'] ?? 'Available',
          };
        }).toList();
      });
    } catch (e) {
      _showErrorDialog('Error fetching bins: $e');
    }
  }

  void _nextStep() {
    if (_currentStep == 0 && selectedBins.isEmpty) {
      _showErrorDialog('Please select at least one bin.');
      return;
    }
    if (_currentStep == 0 && _reasonController.text.trim().isEmpty) {
      _showErrorDialog('Please provide a reason for immediate pickup.');
      return;
    }
    if (_currentStep == 1 &&
        (paymentStatus != 'Paid' || selectedPaymentMethod == null)) {
      _showErrorDialog('Please select and complete a payment method.');
      return;
    }
    if (_currentStep == 2 && (pickupTime == null || selectedDate == null)) {
      _showErrorDialog('Please select both pickup date and time.');
      return;
    }
    setState(() {
      if (_currentStep < 3) {
        _currentStep++;
      } else {
        _savePickupDetails();
      }
    });
  }

  void _previousStep() {
    setState(() {
      if (_currentStep > 0) _currentStep--;
    });
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 48, color: _errorColor),
              const SizedBox(height: 16),
              Text(
                'Oops!',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: _errorColor,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _errorColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('UNDERSTOOD'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _savePickupDetails() async {
    if (selectedBins.isEmpty ||
        pickupTime == null ||
        selectedDate == null ||
        paymentStatus != 'Paid') {
      _showErrorDialog('Please complete all steps before confirming.');
      return;
    }

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _showErrorDialog('User not authenticated. Please log in again.');
      return;
    }

    setState(() => _isRequestView = false);

    try {
      final formattedDate =
          '${selectedDate!.year}-${selectedDate!.month.toString().padLeft(2, '0')}-${selectedDate!.day.toString().padLeft(2, '0')}';

      // Save pickup details as a single entry for multiple bins
      final pickupData = {
        'userId': user.uid,
        'bins': selectedBins,
        'pickupTime': pickupTime,
        'pickupDate': formattedDate,
        'reason': _reasonController.text.trim(), // Add reason field
        'instructions': _instructionsController.text.trim(),
        'paymentMethod': selectedPaymentMethod,
        'status': 'Pending',
        'totalAmount': selectedBins.length * 480,
        'binCount': selectedBins.length,
        'timestamp': FieldValue.serverTimestamp(),
      };

      await FirebaseFirestore.instance
          .collection('immediate_pickups')
          .add(pickupData);

      _showSnackBar(
        'Pickup request saved successfully for ${selectedBins.length} bin(s)!',
      );
      _resetPickupForm();

      setState(() {
        _isRequestView = false;
      });
    } catch (e) {
      _showErrorDialog('Error saving pickup details: $e');
    }
  }

  Future<List<Map<String, dynamic>>> _fetchPickupHistory() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      // Remove orderBy to avoid requiring a composite index
      final querySnapshot = await FirebaseFirestore.instance
          .collection('immediate_pickups')
          .where('userId', isEqualTo: user.uid)
          .get();

      List<Map<String, dynamic>> pickups = querySnapshot.docs.map((doc) {
        final data = doc.data();
        // Handle both old format (single bin) and new format (multiple bins)
        List<dynamic> binsList = [];
        if (data['bins'] != null) {
          binsList = data['bins'];
        } else if (data['bin'] != null) {
          binsList = [data['bin']];
        }

        return {
          'id': doc.id,
          'bins': binsList,
          'pickupTime': data['pickupTime'] ?? '--',
          'pickupDate': data['pickupDate'] ??
              (data['timestamp'] != null
                  ? (data['timestamp'] as Timestamp)
                      .toDate()
                      .toString()
                      .split(' ')[0]
                  : '--'),
          'status': data['status'] ?? 'Pending',
          'instructions': data['instructions'] ?? '',
          'paymentMethod': data['paymentMethod'] ?? '--',
          'totalAmount': data['totalAmount'] ?? (binsList.length * 480),
          'binCount': data['binCount'] ?? binsList.length,
          'timestamp': data['timestamp'],
        };
      }).toList();

      // Sort by timestamp in Dart instead of Firestore
      pickups.sort((a, b) {
        final aTime = a['timestamp'] as Timestamp?;
        final bTime = b['timestamp'] as Timestamp?;

        if (aTime == null && bTime == null) return 0;
        if (aTime == null) return 1;
        if (bTime == null) return -1;

        return bTime.compareTo(aTime); // Descending order (newest first)
      });

      return pickups;
    } catch (e) {
      print('Error fetching pickup history: $e');
      return [];
    }
  }

  Widget _buildRequestSteps() {
    return Column(
      children: [
        // Modern step indicator
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(4, (index) {
              bool isActive = index <= _currentStep;
              bool isCompleted = index < _currentStep;
              return Column(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: isActive ? _primaryColor : Colors.grey.shade300,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: isCompleted
                          ? Icon(Icons.check, color: Colors.white, size: 20)
                          : Text(
                              '${index + 1}',
                              style: TextStyle(
                                color: isActive ? Colors.white : Colors.grey,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    ['Select', 'Payment', 'Time', 'Confirm'][index],
                    style: TextStyle(
                      color: isActive ? _darkColor : Colors.grey,
                      fontSize: 12,
                    ),
                  ),
                ],
              );
            }),
          ),
        ),
        const SizedBox(height: 24),
        Expanded(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: _buildStepContent(),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 24, bottom: 8),
          child: Row(
            children: [
              if (_currentStep > 0)
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: _primaryColor),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: _previousStep,
                    child: Text('BACK', style: TextStyle(color: _primaryColor)),
                  ),
                ),
              if (_currentStep > 0) const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _primaryColor,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 2,
                  ),
                  onPressed: _nextStep,
                  child: Text(
                    _currentStep == 3 ? 'CONFIRM PICKUP' : 'CONTINUE',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildConfirmationView() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: _lightColor,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.check_circle, size: 60, color: _accentColor),
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: Text(
              'Pickup Scheduled!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: _darkColor,
              ),
            ),
          ),
          const SizedBox(height: 16),
          _buildDetailCard(
            icon: Icons.delete,
            title: 'Selected Bins',
            value: selectedBins.join(', '), // Show all selected bins
          ),
          _buildDetailCard(
            icon: Icons.access_time,
            title: 'Pickup Time',
            value: pickupTime ?? '--',
          ),
          if (_instructionsController.text.isNotEmpty)
            _buildDetailCard(
              icon: Icons.note,
              title: 'Instructions',
              value: _instructionsController.text,
            ),
          const SizedBox(height: 24),
          Text(
            'Recent Pickups',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: _darkColor,
            ),
          ),
          const SizedBox(height: 8),
          ..._pickupHistory.map((pickup) => _buildHistoryItem(pickup)).toList(),
          const SizedBox(height: 24),
          Text(
            'Need Help?',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: _darkColor,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: _lightColor,
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _primaryColor.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.chat, color: _primaryColor),
                  ),
                  title: Text(
                    'Chat with Admin',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _darkColor,
                    ),
                  ),
                  subtitle: const Text('Get instant support'),
                  trailing: Icon(Icons.chevron_right, color: _primaryColor),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const ChatAdminScreen(),
                      ),
                    );
                  },
                ),
                const Divider(height: 24),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _primaryColor.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.history, color: _primaryColor),
                  ),
                  title: Text(
                    'Track Pickup',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _darkColor,
                    ),
                  ),
                  subtitle: const Text('View real-time status'),
                  trailing: Icon(Icons.chevron_right, color: _primaryColor),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const TruckTrackingScreen(),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _primaryColor,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () {
                setState(() {
                  _currentStep = 0;
                  selectedBins = []; // Clear the list
                  paymentStatus = null;
                  selectedPaymentMethod = null;
                  _isProcessingPayment = false;
                  pickupTime = null;
                  selectedDate = null; // Reset selected date
                  _instructionsController.clear();
                  _reasonController.clear(); // Clear reason field
                  _isRequestView = true;
                });
              },
              child: const Text(
                'REQUEST ANOTHER PICKUP',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildDetailCard({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _lightColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _primaryColor.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: _primaryColor),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: _darkColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
          ),
          Text(
            value ?? '--',
            style: TextStyle(
              color: _darkColor,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  void _resetPickupForm() {
    selectedBins.clear();
    paymentStatus = null;
    selectedPaymentMethod = null;
    _isProcessingPayment = false;
    pickupTime = null;
    selectedDate = null;
    _reasonController.clear(); // Clear reason field
    _instructionsController.clear();
    _currentStep = 0;
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: _primaryColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Widget _buildPaymentStep() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Payment Method',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: _darkColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Choose how you\'d like to pay for your pickup',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _accentColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _accentColor.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.calculate, color: _accentColor),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Total Amount: Rs. ${selectedBins.length * 480}.00',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: _accentColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Column(
            children: [
              _buildPaymentMethodTile(
                'Credit/Debit Card',
                Icons.credit_card,
                'Card',
                subtitle: 'Pay securely with your card',
              ),
              const SizedBox(height: 12),
              _buildPaymentMethodTile(
                'Mobile Banking',
                Icons.phone_android,
                'Mobile Banking',
                subtitle: 'Pay through your banking app',
              ),
              const SizedBox(height: 12),
              _buildPaymentMethodTile(
                'Cash on Pickup',
                Icons.money,
                'Cash on Pickup',
                subtitle: 'Pay when the team arrives',
              ),
            ],
          ),
          if (paymentStatus == 'Paid') ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _accentColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: _accentColor),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Payment confirmed! You can proceed to the next step.',
                      style: TextStyle(
                        color: _accentColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTimeSelectionStep() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Select Pickup Time',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: _darkColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Choose when you want your bins to be collected',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 24),

          // Date Selection
          Container(
            decoration: BoxDecoration(
              color: _lightColor,
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Select Date:',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: _darkColor,
                  ),
                ),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: () => _selectDate(context),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.calendar_today, color: _primaryColor),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            selectedDate != null
                                ? '${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year}'
                                : 'Select pickup date',
                            style: TextStyle(
                              fontSize: 16,
                              color: selectedDate != null
                                  ? _darkColor
                                  : Colors.grey.shade500,
                            ),
                          ),
                        ),
                        Icon(Icons.chevron_right, color: _primaryColor),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Time Selection
          Container(
            decoration: BoxDecoration(
              color: _lightColor,
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Select Time Slot:',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: _darkColor,
                  ),
                ),
                const SizedBox(height: 16),
                Column(
                  children: [
                    _buildTimeSlot('9:00 AM - 12:00 PM', 'Morning'),
                    const SizedBox(height: 12),
                    _buildTimeSlot('12:00 PM - 3:00 PM', 'Afternoon'),
                    const SizedBox(height: 12),
                    _buildTimeSlot('3:00 PM - 6:00 PM', 'Evening'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeSlot(String time, String period) {
    final isSelected = pickupTime == time;
    return GestureDetector(
      onTap: () {
        setState(() {
          pickupTime = time;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? _primaryColor.withOpacity(0.2) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? _primaryColor : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color:
                    isSelected ? _primaryColor : _primaryColor.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.access_time,
                color: isSelected ? Colors.white : _primaryColor,
                size: 20,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    time,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isSelected ? _primaryColor : _darkColor,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    period,
                    style: TextStyle(
                      color: isSelected ? _primaryColor : Colors.grey.shade600,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(Icons.check_circle, color: _primaryColor)
            else
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade400, width: 2),
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: selectedDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: _primaryColor,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: _darkColor,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != selectedDate) {
      setState(() {
        selectedDate = picked;
      });
    }
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildBinSelectionStep();
      case 1:
        return _buildPaymentStep();
      case 2:
        return _buildTimeSelectionStep();
      case 3:
        return _buildConfirmationStep();
      default:
        return Container();
    }
  }

  Widget _buildBinSelectionStep() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Select Bins',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: _darkColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Choose which bins you want to schedule for pickup',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 24),
          if (_userBins.isEmpty)
            Center(
              child: Column(
                children: [
                  CircularProgressIndicator(color: _primaryColor),
                  const SizedBox(height: 16),
                  Text(
                    'Loading your bins...',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ],
              ),
            )
          else
            Column(
              children: _userBins.map((bin) {
                final binId = bin['binId'];
                final isSelected = selectedBins.contains(binId);

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        if (isSelected) {
                          selectedBins.remove(binId);
                        } else {
                          selectedBins.add(binId);
                        }
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? _primaryColor.withOpacity(0.1)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color:
                              isSelected ? _primaryColor : Colors.grey.shade300,
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? _primaryColor
                                  : _primaryColor.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.delete,
                              color: isSelected ? Colors.white : _primaryColor,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  binId,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color:
                                        isSelected ? _primaryColor : _darkColor,
                                    fontSize: 16,
                                  ),
                                ),
                                Text(
                                  bin['status'] ?? 'Available',
                                  style: TextStyle(
                                    color: isSelected
                                        ? _primaryColor
                                        : Colors.grey.shade600,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (isSelected)
                            Icon(Icons.check_circle, color: _primaryColor)
                          else
                            Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                border: Border.all(
                                  color: Colors.grey.shade400,
                                  width: 2,
                                ),
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          if (selectedBins.isNotEmpty) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _accentColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _accentColor.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.calculate, color: _accentColor),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Total: ${selectedBins.length} bin${selectedBins.length > 1 ? 's' : ''} × Rs. 480 = Rs. ${selectedBins.length * 480}',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: _accentColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            // Reason input field
            Text(
              'Reason for Immediate Pickup',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: _darkColor,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: TextField(
                controller: _reasonController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText:
                      'E.g., Bins are full, urgent waste removal needed, pest control, special event...',
                  hintStyle: TextStyle(
                    color: Colors.grey.shade400,
                    fontSize: 14,
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(16),
                  prefixIcon: Padding(
                    padding: const EdgeInsets.only(left: 12, right: 8, top: 12),
                    child: Icon(Icons.edit_note, color: _primaryColor),
                  ),
                ),
                style: TextStyle(
                  fontSize: 14,
                  color: _darkColor,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.info_outline, size: 16, color: Colors.grey.shade500),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Help us understand why you need immediate pickup',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade500,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildConfirmationStep() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Confirm Your Pickup',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: _darkColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Please review your pickup details before confirming',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 24),

          // Selected Bins
          Container(
            decoration: BoxDecoration(
              color: _lightColor,
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Selected Bins (${selectedBins.length})',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: _darkColor,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: selectedBins
                      .map(
                        (binId) => Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: _primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: _primaryColor.withOpacity(0.3),
                            ),
                          ),
                          child: Text(
                            binId,
                            style: TextStyle(
                              color: _primaryColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Pickup Details
          Container(
            decoration: BoxDecoration(
              color: _lightColor,
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Pickup Details',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: _darkColor,
                  ),
                ),
                const SizedBox(height: 12),
                _buildDetailRow(
                  'Date',
                  selectedDate != null
                      ? '${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year}'
                      : '--',
                ),
                _buildDetailRow('Time', pickupTime),
                _buildDetailRow('Payment Method', selectedPaymentMethod),
                _buildDetailRow(
                  'Total Amount',
                  'Rs. ${selectedBins.length * 480}.00',
                ),
                if (_reasonController.text.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Reason for Immediate Pickup:',
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.orange.shade200),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.priority_high,
                          color: Colors.orange.shade700,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _reasonController.text,
                            style: TextStyle(
                              color: Colors.orange.shade800,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if (_instructionsController.text.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Special Instructions:',
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _instructionsController.text,
                      style: TextStyle(
                        color: Colors.blue.shade800,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Confirmation Message
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _accentColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.info, color: _accentColor),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'By confirming, you agree to have your bins collected at the specified time. You will receive updates on the pickup status.',
                    style: TextStyle(color: _accentColor, fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _editPickup(Map<String, dynamic> pickup) {
    setState(() {
      final bins = pickup['bins'] as List<dynamic>? ?? [];
      selectedBins = bins.map((bin) => bin.toString()).toList();

      pickupTime = pickup['pickupTime'];

      // Parse pickup date
      if (pickup['pickupDate'] != null && pickup['pickupDate'] != '--') {
        try {
          selectedDate = DateTime.parse(pickup['pickupDate']);
        } catch (e) {
          selectedDate = null;
        }
      }

      _reasonController.text =
          pickup['reason']?.toString() ?? ''; // Load reason
      _instructionsController.text = pickup['instructions']?.toString() ?? '';
      _currentStep = 0;
      _isRequestView = true;
    });
  }

  Future<void> _deletePickup(Map<String, dynamic> pickup) async {
    try {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Text(
            'Delete Pickup',
            style: TextStyle(
              color: _darkColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: const Text(
            'Are you sure you want to delete this pickup request?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(
                'Cancel',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Delete',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      );

      if (confirm == true) {
        await FirebaseFirestore.instance
            .collection('immediate_pickups')
            .doc(pickup['id'])
            .delete();

        setState(() {}); // Refresh the view
        _showSnackBar('Pickup deleted successfully!');
      }
    } catch (e) {
      _showErrorDialog('Error deleting pickup: $e');
    }
  }

  Widget _buildHistoryView() {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _fetchPickupHistory(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(color: _primaryColor),
                const SizedBox(height: 16),
                Text(
                  'Loading pickup history...',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ],
            ),
          );
        }

        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.error_outline,
                  size: 64,
                  color: Colors.grey.shade400,
                ),
                const SizedBox(height: 16),
                Text(
                  'Error loading history',
                  style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 8),
                Text(
                  'Please try again',
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => setState(() {}),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _primaryColor,
                  ),
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.history, size: 64, color: Colors.grey.shade400),
                const SizedBox(height: 16),
                Text(
                  'No pickup history',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Your completed pickups will appear here',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade500),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => setState(() => _isRequestView = true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _primaryColor,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                  ),
                  icon: const Icon(Icons.add),
                  label: const Text('Request Pickup'),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            setState(() {});
          },
          color: _primaryColor,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: snapshot.data!.length,
            itemBuilder: (context, index) {
              return _buildHistoryItem(snapshot.data![index]);
            },
          ),
        );
      },
    );
  }

  Widget _buildHistoryItem(Map<String, dynamic> pickup) {
    final bins = pickup['bins'] as List<dynamic>? ?? [];
    final binIds = bins.map((bin) => bin.toString()).toList();

    if (binIds.isEmpty) {
      binIds.add('Unknown Bin');
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with status
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    '${binIds.length} Bin${binIds.length > 1 ? 's' : ''} Pickup',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: _darkColor,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _getStatusColor(pickup['status']).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    pickup['status'] ?? 'Pending',
                    style: TextStyle(
                      color: _getStatusColor(pickup['status']),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Bins display
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Selected Bins:',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: binIds
                        .map(
                          (binId) => Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: _primaryColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _primaryColor.withOpacity(0.3),
                              ),
                            ),
                            child: Text(
                              binId,
                              style: TextStyle(
                                color: _primaryColor,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Pickup details
            _buildDetailRow('Date', pickup['pickupDate']),
            _buildDetailRow('Time', pickup['pickupTime']),
            _buildDetailRow('Payment', pickup['paymentMethod']),
            _buildDetailRow('Amount', 'Rs. ${pickup['totalAmount']}.00'),

            // Reason display
            if (pickup['reason'] != null &&
                pickup['reason'].toString().trim().isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.priority_high,
                          color: Colors.orange.shade700,
                          size: 16,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Reason:',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.orange.shade700,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      pickup['reason'].toString(),
                      style: TextStyle(
                        color: Colors.orange.shade800,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Special instructions if available
            if (pickup['instructions'] != null &&
                pickup['instructions'].toString().trim().isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  pickup['instructions'].toString(),
                  style: TextStyle(
                    color: Colors.blue.shade800,
                    fontSize: 14,
                  ),
                ),
              ),
            ],

            const SizedBox(height: 16),

            // Action buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (pickup['status'] == 'Pending') ...[
                  TextButton.icon(
                    onPressed: () => _editPickup(pickup),
                    icon: const Icon(Icons.edit, color: Colors.blue, size: 16),
                    label: const Text(
                      'Edit',
                      style: TextStyle(color: Colors.blue, fontSize: 12),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                TextButton.icon(
                  onPressed: () => _deletePickup(pickup),
                  icon: const Icon(Icons.delete, color: Colors.red, size: 16),
                  label: const Text(
                    'Delete',
                    style: TextStyle(color: Colors.red, fontSize: 12),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'pending':
        return Colors.orange;
      case 'confirmed':
        return Colors.blue;
      case 'in_progress':
        return _primaryColor;
      case 'completed':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  void initState() {
    super.initState();
    _fetchUserBins();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Immediate Pickup',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: _primaryColor,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: Icon(
              _isRequestView ? Icons.history : Icons.add_circle_outline,
              color: Colors.white,
            ),
            onPressed: () {
              setState(() => _isRequestView = !_isRequestView);
            },
          ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.white, _lightColor],
          ),
        ),
        padding: const EdgeInsets.all(16),
        child: _isRequestView ? _buildRequestSteps() : _buildHistoryView(),
      ),
    );
  }

  Future<void> _processPayment(String method) async {
    setState(() {
      _isProcessingPayment = true;
      paymentStatus = null;
      selectedPaymentMethod = method;
    });

    if (method == 'Cash on Pickup') {
      await Future.delayed(const Duration(milliseconds: 500));
      setState(() {
        _isProcessingPayment = false;
        paymentStatus = 'Paid';
      });

      await _showPaymentMessage(
        'Please Pay at Pickup',
        'A charge of Rs. ${selectedBins.length * 480}.00 will be collected during pickup.',
        Icons.info,
        _primaryColor,
      );

      _autoAdvanceToNextStep();
    } else {
      await Future.delayed(const Duration(seconds: 2));
      setState(() {
        _isProcessingPayment = false;
        paymentStatus = 'Paid';
      });

      await _showPaymentMessage(
        'Payment Successful!',
        'Your payment of Rs. ${selectedBins.length * 480}.00 has been processed successfully.',
        Icons.check_circle,
        _accentColor,
      );

      _autoAdvanceToNextStep();
    }
  }

  void _autoAdvanceToNextStep() {
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted && _currentStep == 1 && paymentStatus == 'Paid') {
        setState(() {
          _currentStep++;
        });
      }
    });
  }

  Future<void> _showPaymentMessage(
    String title,
    String message,
    IconData icon,
    Color color,
  ) async {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 48, color: color),
              const SizedBox(height: 16),
              Text(
                title,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: color,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text(
                    'CONTINUE',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentMethodTile(
    String title,
    IconData icon,
    String method, {
    String? subtitle,
  }) {
    final isSelected = selectedPaymentMethod == method;
    final isProcessing =
        _isProcessingPayment && selectedPaymentMethod == method;
    final isDisabled = _isProcessingPayment && selectedPaymentMethod != method;

    return GestureDetector(
      onTap: (_isProcessingPayment || paymentStatus == 'Paid')
          ? null
          : () => _processPayment(method),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? _primaryColor.withOpacity(0.1)
              : isDisabled
                  ? Colors.grey.shade100
                  : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? _primaryColor
                : isDisabled
                    ? Colors.grey.shade300
                    : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isSelected
                    ? _primaryColor
                    : isDisabled
                        ? Colors.grey.shade300
                        : _primaryColor.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: isSelected
                    ? Colors.white
                    : isDisabled
                        ? Colors.grey.shade500
                        : _primaryColor,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isSelected
                          ? _primaryColor
                          : isDisabled
                              ? Colors.grey.shade500
                              : _darkColor,
                      fontSize: 16,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: isSelected
                            ? _primaryColor
                            : isDisabled
                                ? Colors.grey.shade400
                                : Colors.grey.shade600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (isProcessing)
              SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(_primaryColor),
                ),
              )
            else if (isSelected && paymentStatus == 'Paid')
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: _primaryColor,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check, color: Colors.white, size: 16),
              )
            else
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  border: Border.all(
                    color: isDisabled
                        ? Colors.grey.shade300
                        : Colors.grey.shade400,
                    width: 2,
                  ),
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

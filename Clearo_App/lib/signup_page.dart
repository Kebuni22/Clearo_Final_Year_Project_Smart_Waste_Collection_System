import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dashboard_page.dart';
import 'login_page.dart';
import 'Driver/driver_dashboard_page.dart'; // Already imported

enum UserType { residential, driver }

class SignupPage extends StatefulWidget {
  const SignupPage({Key? key}) : super(key: key);

  @override
  State<SignupPage> createState() => _SignupPageState();
}

class _SignupPageState extends State<SignupPage> {
  final _formKey = GlobalKey<FormState>();

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _nameController = TextEditingController();
  final _homeNumberController = TextEditingController();
  final _addressController = TextEditingController();
  final _employeeNumberController = TextEditingController(); // For driver
  final _driverPhoneController = TextEditingController();

  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _termsAgreed = false;
  UserType _selectedUserType = UserType.residential;

  void _registerUser() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_termsAgreed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Please agree to the Terms of Service and Privacy Policy',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final UserCredential userCredential = await FirebaseAuth.instance
          .createUserWithEmailAndPassword(
            email: _emailController.text.trim(),
            password: _passwordController.text.trim(),
          );

      final User user = userCredential.user!;
      await user.updateDisplayName(_nameController.text.trim());

      if (_selectedUserType == UserType.residential) {
        // Save Residential user details
        await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
          'name': _nameController.text.trim(),
          'email': _emailController.text.trim(),
          'homeNumber': _homeNumberController.text.trim(),
          'address': _addressController.text.trim(),
          'userType': 'residential',
          'createdAt': FieldValue.serverTimestamp(),
          'uid': user.uid,
        });

        // Automatically create 3 bins for the residential user
        final homeNumber = _homeNumberController.text.trim();
        for (int i = 1; i <= 3; i++) {
          final binName = "BIN-$homeNumber-${i.toString().padLeft(3, '0')}";
          await FirebaseFirestore.instance.collection('bins').add({
            'binId': binName,
            'userId': user.uid,
            'homeNumber': homeNumber,
            'status': 'Available',
            'createdAt': FieldValue.serverTimestamp(),
          });
        }

        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder:
                  (context) =>
                      DashboardPage(userName: _nameController.text.trim()),
            ),
          );
        }
      } else {
        // Driver registration
        await FirebaseFirestore.instance
            .collection('drivers')
            .doc(user.uid)
            .set({
              'name': _nameController.text.trim(),
              'email': _emailController.text.trim(),
              'employeeNumber': _employeeNumberController.text.trim(),
              'phone': _driverPhoneController.text.trim(),
              'userType': 'driver',
              'createdAt': FieldValue.serverTimestamp(),
              'uid': user.uid,
            });

        // Also save driver data to the general users collection for easy access
        await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
          'name': _nameController.text.trim(),
          'email': _emailController.text.trim(),
          'employeeNumber': _employeeNumberController.text.trim(),
          'phone': _driverPhoneController.text.trim(),
          'userType': 'driver',
          'createdAt': FieldValue.serverTimestamp(),
          'uid': user.uid,
        });

        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder:
                  (context) => DriverDashboardPage(
                    driverName: _nameController.text.trim(),
                  ),
            ),
          );
        }
      }
    } on FirebaseAuthException catch (e) {
      setState(() {
        _isLoading = false;
      });
      String message =
          'An error occurred during registration. Please try again.';
      if (e.code == 'weak-password') {
        message = 'Please choose a stronger password (at least 6 characters).';
      } else if (e.code == 'email-already-in-use') {
        message = 'This email is already registered. Please sign in instead.';
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 5),
        ),
      );
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Registration failed. Please check your connection and try again.',
          ),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showTermsDialog() {
    showDialog(
      context: context,
      builder:
          (context) => StatefulBuilder(
            builder: (context, setState) {
              return AlertDialog(
                title: const Text(
                  'Terms of Service & Privacy Policy',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.teal,
                  ),
                ),
                content: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Welcome to Clearo! Our mission is to create a cleaner, greener community through smart waste management solutions.',
                        style: TextStyle(fontSize: 14, height: 1.5),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'By creating an account, you agree to our Terms of Service and Privacy Policy, which explain how we collect, use, and protect your information.',
                        style: TextStyle(fontSize: 14, height: 1.5),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Checkbox(
                            value: _termsAgreed,
                            onChanged: (value) {
                              setState(() {
                                _termsAgreed = value ?? false;
                              });
                              Navigator.of(context).pop();
                              if (_termsAgreed) {
                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Thank you for accepting our terms!',
                                    ),
                                    backgroundColor: Colors.green,
                                  ),
                                );
                              }
                            },
                          ),
                          const Expanded(
                            child: Text(
                              'I agree to the Terms of Service and Privacy Policy',
                              style: TextStyle(fontSize: 14),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Close'),
                  ),
                ],
              );
            },
          ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _nameController.dispose();
    _homeNumberController.dispose();
    _addressController.dispose();
    _employeeNumberController.dispose();
    _driverPhoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color.fromARGB(255, 220, 233, 223), Color(0xFFD4F1D8)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Title
                    const Text(
                      'Create Your Account',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.teal,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Join us in building a cleaner, greener community',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 15, color: Colors.grey),
                    ),
                    const SizedBox(height: 28),

                    // User Type Selector
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.teal.withOpacity(0.07),
                            blurRadius: 12,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(8),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () {
                                setState(() {
                                  _selectedUserType = UserType.residential;
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  color:
                                      _selectedUserType == UserType.residential
                                          ? Colors.teal
                                          : Colors.transparent,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Center(
                                  child: Text(
                                    'Residential User',
                                    style: TextStyle(
                                      color:
                                          _selectedUserType ==
                                                  UserType.residential
                                              ? Colors.white
                                              : Colors.teal,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () {
                                setState(() {
                                  _selectedUserType = UserType.driver;
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  color:
                                      _selectedUserType == UserType.driver
                                          ? Colors.teal
                                          : Colors.transparent,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Center(
                                  child: Text(
                                    'Truck Driver',
                                    style: TextStyle(
                                      color:
                                          _selectedUserType == UserType.driver
                                              ? Colors.white
                                              : Colors.teal,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Form Fields container
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.95),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.teal.withOpacity(0.08),
                            blurRadius: 18,
                            offset: const Offset(0, 6),
                          ),
                        ],
                        border: Border.all(
                          color: Colors.teal.withOpacity(0.13),
                          width: 1.1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Personal Information',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: Colors.teal,
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _nameController,
                            decoration: InputDecoration(
                              labelText: 'Full Name',
                              hintText: 'Enter your full name',
                              prefixIcon: const Icon(
                                Icons.person_outline,
                                color: Colors.teal,
                              ),
                              filled: true,
                              fillColor: Colors.teal.withOpacity(0.04),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                  color: Colors.teal,
                                  width: 2,
                                ),
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter your name';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _emailController,
                            decoration: InputDecoration(
                              labelText: 'Email Address',
                              hintText: 'Enter your email',
                              prefixIcon: const Icon(
                                Icons.email_outlined,
                                color: Colors.teal,
                              ),
                              filled: true,
                              fillColor: Colors.teal.withOpacity(0.04),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                  color: Colors.teal,
                                  width: 2,
                                ),
                              ),
                            ),
                            keyboardType: TextInputType.emailAddress,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter your email address';
                              }
                              if (!RegExp(
                                r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$',
                              ).hasMatch(value)) {
                                return 'Please enter a valid email address';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              hintText: 'Create a strong password',
                              prefixIcon: const Icon(
                                Icons.lock_outline,
                                color: Colors.teal,
                              ),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword
                                      ? Icons.visibility_off
                                      : Icons.visibility,
                                  color: Colors.grey,
                                ),
                                onPressed: () {
                                  setState(() {
                                    _obscurePassword = !_obscurePassword;
                                  });
                                },
                              ),
                              filled: true,
                              fillColor: Colors.teal.withOpacity(0.04),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                  color: Colors.teal,
                                  width: 2,
                                ),
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please create a password';
                              }
                              if (value.length < 6) {
                                return 'Password should be at least 6 characters';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _confirmPasswordController,
                            obscureText: _obscureConfirmPassword,
                            decoration: InputDecoration(
                              labelText: 'Confirm Password',
                              hintText: 'Re-enter your password',
                              prefixIcon: const Icon(
                                Icons.lock_outline,
                                color: Colors.teal,
                              ),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscureConfirmPassword
                                      ? Icons.visibility_off
                                      : Icons.visibility,
                                  color: Colors.grey,
                                ),
                                onPressed: () {
                                  setState(() {
                                    _obscureConfirmPassword =
                                        !_obscureConfirmPassword;
                                  });
                                },
                              ),
                              filled: true,
                              fillColor: Colors.teal.withOpacity(0.04),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                  color: Colors.teal,
                                  width: 2,
                                ),
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please confirm your password';
                              }
                              if (value != _passwordController.text) {
                                return 'Passwords do not match';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 24),

                          // Conditional fields based on user type
                          if (_selectedUserType == UserType.residential) ...[
                            const Text(
                              'Residential Details',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: Colors.teal,
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _homeNumberController,
                              decoration: InputDecoration(
                                labelText: 'Home Number',
                                hintText: 'Enter your home number',
                                prefixIcon: const Icon(
                                  Icons.home_outlined,
                                  color: Colors.teal,
                                ),
                                filled: true,
                                fillColor: Colors.teal.withOpacity(0.04),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(
                                    color: Colors.teal,
                                    width: 2,
                                  ),
                                ),
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Please enter your home number';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _addressController,
                              decoration: InputDecoration(
                                labelText: 'Full Address',
                                hintText: 'Enter your complete address',
                                prefixIcon: const Icon(
                                  Icons.location_on_outlined,
                                  color: Colors.teal,
                                ),
                                filled: true,
                                fillColor: Colors.teal.withOpacity(0.04),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(
                                    color: Colors.teal,
                                    width: 2,
                                  ),
                                ),
                              ),
                              maxLines: 2,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Please enter your address';
                                }
                                return null;
                              },
                            ),
                          ] else ...[
                            const Text(
                              'Driver Information',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: Colors.teal,
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _employeeNumberController,
                              decoration: InputDecoration(
                                labelText: 'Employee Number',
                                hintText: 'Enter your employee number',
                                prefixIcon: const Icon(
                                  Icons.badge_outlined,
                                  color: Colors.teal,
                                ),
                                filled: true,
                                fillColor: Colors.teal.withOpacity(0.04),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(
                                    color: Colors.teal,
                                    width: 2,
                                  ),
                                ),
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Please enter your employee number';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _driverPhoneController,
                              decoration: InputDecoration(
                                labelText: 'Phone Number',
                                hintText: 'Enter your contact number',
                                prefixIcon: const Icon(
                                  Icons.phone_iphone_outlined,
                                  color: Colors.teal,
                                ),
                                filled: true,
                                fillColor: Colors.teal.withOpacity(0.04),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(
                                    color: Colors.teal,
                                    width: 2,
                                  ),
                                ),
                              ),
                              keyboardType: TextInputType.phone,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Please enter your phone number';
                                }
                                return null;
                              },
                            ),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Terms Agreement
                    Row(
                      children: [
                        Checkbox(
                          value: _termsAgreed,
                          onChanged: (value) {
                            setState(() {
                              _termsAgreed = value ?? false;
                            });
                          },
                          activeColor: Colors.teal,
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: _showTermsDialog,
                            child: const Text(
                              'I agree to the Terms of Service and Privacy Policy',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // Sign Up Button or Loading Indicator
                    _isLoading
                        ? const Center(
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.teal,
                            ),
                          ),
                        )
                        : ElevatedButton(
                          onPressed: _registerUser,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.teal,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 3,
                          ),
                          child: const Text(
                            'Create Account',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),

                    const SizedBox(height: 20),

                    // Redirect to Login
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Already have an account?',
                          style: TextStyle(color: Colors.grey),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const LoginPage(),
                              ),
                            );
                          },
                          child: const Text(
                            'Sign In',
                            style: TextStyle(
                              color: Colors.teal,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

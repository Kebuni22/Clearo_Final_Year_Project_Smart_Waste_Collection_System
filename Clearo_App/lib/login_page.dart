import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:location/location.dart';
import 'dart:async';
import 'dashboard_page.dart';
import 'signup_page.dart';
import 'Driver/driver_dashboard_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final FirebaseAuth _auth = FirebaseAuth.instance;
  bool _isLoading = false;
  bool _obscurePassword = true;
  String _selectedLanguage = 'English'; // Default language

  // Location services for drivers
  Location location = Location();
  StreamSubscription<LocationData>? _locationSubscription;

  // Translation map
  final Map<String, Map<String, String>> _translations = {
    'English': {
      'welcome': 'Welcome! Start Smart, Stay Clean...',
      'email': 'Email',
      'emailHint': 'Enter your email',
      'password': 'Password',
      'passwordHint': 'Enter your password',
      'forgotPassword': 'Forgot Password?',
      'login': 'Login',
      'createAccount': 'Create New Account',
      'terms':
          'By signing in, you agree to our Terms of Service and Privacy Policy.',
      'emailRequired': 'Please enter your email',
      'passwordRequired': 'Please enter your password',
      'resetEmailSent': 'Password reset email sent. Check your inbox.',
      'enterEmailReset': 'Please enter your email to reset your password',
    },
    'Sinhala': {
      'welcome': 'ආයුබෝවන්! දක්ෂව ආරම්භ කර, පිරිසිදුව සිටින්න...',
      'email': 'විද්‍යුත් තැපෑල',
      'emailHint': 'ඔබගේ විද්‍යුත් තැපෑල ඇතුළත් කරන්න',
      'password': 'මුරපදය',
      'passwordHint': 'ඔබගේ මුරපදය ඇතුළත් කරන්න',
      'forgotPassword': 'මුරපදය අමතකද?',
      'login': 'ඇතුළු වන්න',
      'createAccount': 'නව ගිණුමක් සාදන්න',
      'terms':
          'ඇතුළු වීමෙන්, ඔබ අපගේ සේවා කොන්දේසි සහ රහස්‍යතා ප්‍රතිපත්තියට එකඟ වේ.',
      'emailRequired': 'කරුණාකර ඔබගේ විද්‍යුත් තැපෑල ඇතුළත් කරන්න',
      'passwordRequired': 'කරුණාකර ඔබගේ මුරපදය ඇතුළත් කරන්න',
      'resetEmailSent':
          'මුරපද නැවත සැකසීමේ විද්‍යුත් තැපෑල යවා ඇත. ඔබගේ ඉන්බොක්ස් පරීක්ෂා කරන්න.',
      'enterEmailReset':
          'කරුණාකර ඔබගේ මුරපදය නැවත සැකසීමට විද්‍යුත් තැපෑල ඇතුළත් කරන්න',
    },
  };

  String _getText(String key) {
    return _translations[_selectedLanguage]?[key] ?? key;
  }

  void _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final UserCredential userCredential = await _auth
          .signInWithEmailAndPassword(
            email: _emailController.text.trim(),
            password: _passwordController.text.trim(),
          );

      final user = userCredential.user;
      if (user != null) {
        final DocumentSnapshot userDoc =
            await FirebaseFirestore.instance
                .collection('users')
                .doc(user.uid)
                .get();

        if (userDoc.exists) {
          final data = userDoc.data() as Map<String, dynamic>;
          final String? position = data['position'];
          final String? userType = data['userType'];
          final String name =
              data['name'] ?? user.email?.split('@')[0] ?? 'User';

          if (mounted) {
            if (userType == 'driver') {
              // Request location permission for drivers
              await _handleDriverLocationSetup(user.uid, name);
            } else {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(
                  builder:
                      (context) =>
                          DashboardPage(userName: name, showLoginMessage: true),
                ),
              );
            }
          }
        }
      }
    } on FirebaseAuthException catch (e) {
      String message;
      switch (e.code) {
        case 'user-not-found':
          message = 'No user found with this email';
          break;
        case 'wrong-password':
          message = 'Incorrect password';
          break;
        case 'invalid-email':
          message = 'Invalid email address';
          break;
        case 'user-disabled':
          message = 'This account has been disabled';
          break;
        case 'too-many-requests':
          message = 'Too many attempts. Please try again later';
          break;
        default:
          message = 'Login failed: ${e.message}';
      }
      _showErrorSnackBar(message);
    } catch (e) {
      _showErrorSnackBar('Error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleDriverLocationSetup(
    String userId,
    String driverName,
  ) async {
    try {
      // Show location permission dialog
      bool shouldProceed = await _showLocationPermissionDialog();

      if (!shouldProceed) {
        // User declined location access, still allow login but show warning
        _showLocationWarningAndProceed(userId, driverName);
        return;
      }

      // Check if location service is enabled
      bool serviceEnabled = await location.serviceEnabled();
      if (!serviceEnabled) {
        serviceEnabled = await location.requestService();
        if (!serviceEnabled) {
          _showLocationWarningAndProceed(userId, driverName);
          return;
        }
      }

      // Check location permissions
      PermissionStatus permissionGranted = await location.hasPermission();
      if (permissionGranted == PermissionStatus.denied) {
        permissionGranted = await location.requestPermission();
        if (permissionGranted != PermissionStatus.granted) {
          _showLocationWarningAndProceed(userId, driverName);
          return;
        }
      }

      // Get initial location
      LocationData currentLocation = await location.getLocation();

      // Update driver's location in Firestore
      await _updateDriverLocation(userId, currentLocation);

      // Start real-time location tracking
      _startLocationTracking(userId);

      // Navigate to driver dashboard
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => DriverDashboardPage(driverName: driverName),
          ),
        );

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Location tracking enabled successfully!'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      print('Location setup error: $e');
      _showLocationWarningAndProceed(userId, driverName);
    }
  }

  Future<bool> _showLocationPermissionDialog() async {
    return await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (BuildContext context) {
            return Dialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              elevation: 10,
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Colors.white, Colors.blue.shade50],
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Icon with animated background
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Colors.blue.shade400, Colors.blue.shade600],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.blue.withOpacity(0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.location_on,
                        color: Colors.white,
                        size: 40,
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Title
                    const Text(
                      'Enable Location',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),

                    const SizedBox(height: 8),

                    // Subtitle
                    Text(
                      'We need your location to provide the best service',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Feature list with modern design
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        children: [
                          _buildModernPermissionReason(
                            Icons.local_shipping,
                            'Real-time truck tracking',
                            Colors.green,
                          ),
                          const SizedBox(height: 12),
                          _buildModernPermissionReason(
                            Icons.route,
                            'Optimized routes',
                            Colors.orange,
                          ),
                          const SizedBox(height: 12),
                          _buildModernPermissionReason(
                            Icons.access_time,
                            'Accurate arrival times',
                            Colors.blue,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Security note
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.green.shade200),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.security,
                            color: Colors.green.shade600,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Your location is secure and only used while on duty',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.green.shade700,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Action buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.of(context).pop(false),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              side: BorderSide(color: Colors.grey.shade400),
                            ),
                            child: Text(
                              'Not Now',
                              style: TextStyle(
                                color: Colors.grey.shade600,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
                            onPressed: () => Navigator.of(context).pop(true),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue.shade600,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              elevation: 2,
                            ),
                            child: const Text(
                              'Allow Location',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ) ??
        false;
  }

  Widget _buildModernPermissionReason(IconData icon, String text, Color color) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 20, color: color),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Colors.black87,
            ),
          ),
        ),
      ],
    );
  }

  void _showLocationWarningAndProceed(String userId, String driverName) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Colors.white, Colors.orange.shade50],
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Warning icon
                Container(
                  width: 70,
                  height: 70,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.orange.shade400, Colors.orange.shade600],
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.orange.withOpacity(0.3),
                        blurRadius: 15,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.warning_rounded,
                    color: Colors.white,
                    size: 35,
                  ),
                ),

                const SizedBox(height: 20),

                const Text(
                  'Location Disabled',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),

                const SizedBox(height: 12),

                Text(
                  'Without location access, customers won\'t be able to track your truck in real-time.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                    height: 1.4,
                  ),
                ),

                const SizedBox(height: 24),

                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(
                              builder:
                                  (context) => DriverDashboardPage(
                                    driverName: driverName,
                                  ),
                            ),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          side: BorderSide(color: Colors.grey.shade400),
                        ),
                        child: Text(
                          'Continue',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                          _handleDriverLocationSetup(userId, driverName);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue.shade600,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          elevation: 2,
                        ),
                        child: const Text(
                          'Try Again',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _updateDriverLocation(
    String userId,
    LocationData locationData,
  ) async {
    try {
      await FirebaseFirestore.instance
          .collection('driver_locations')
          .doc(userId)
          .set({
            'latitude': locationData.latitude,
            'longitude': locationData.longitude,
            'heading': locationData.heading ?? 0.0,
            'speed': locationData.speed ?? 0.0,
            'accuracy': locationData.accuracy ?? 0.0,
            'timestamp': FieldValue.serverTimestamp(),
            'isOnline': true,
          }, SetOptions(merge: true));

      // Also update the user document
      await FirebaseFirestore.instance.collection('users').doc(userId).update({
        'lastKnownLocation': {
          'latitude': locationData.latitude,
          'longitude': locationData.longitude,
          'timestamp': FieldValue.serverTimestamp(),
        },
        'isOnline': true,
      });
    } catch (e) {
      print('Error updating driver location: $e');
    }
  }

  void _startLocationTracking(String userId) {
    _locationSubscription?.cancel(); // Cancel any existing subscription

    _locationSubscription = location.onLocationChanged.listen(
      (LocationData currentLocation) {
        _updateDriverLocation(userId, currentLocation);
      },
      onError: (error) {
        print('Location tracking error: $error');
      },
    );
  }

  void _showErrorSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _navigateToSignup() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SignupPage()),
    );
  }

  void _showLanguageSelection() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (BuildContext context) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Select Language',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.teal,
                ),
              ),
              const SizedBox(height: 20),
              _buildLanguageOption('English', Icons.language),
              const SizedBox(height: 12),
              _buildLanguageOption('Sinhala', Icons.translate),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLanguageOption(String language, IconData icon) {
    bool isSelected = _selectedLanguage == language;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedLanguage = language;
        });
        Navigator.pop(context);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        decoration: BoxDecoration(
          color: isSelected ? Colors.teal.withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? Colors.teal : Colors.grey.withOpacity(0.3),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? Colors.teal : Colors.grey[600],
              size: 24,
            ),
            const SizedBox(width: 16),
            Text(
              language,
              style: TextStyle(
                fontSize: 16,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? Colors.teal : Colors.grey[800],
              ),
            ),
            const Spacer(),
            if (isSelected)
              const Icon(Icons.check_circle, color: Colors.teal, size: 20),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color.fromARGB(255, 179, 215, 187),
              Color.fromARGB(255, 221, 237, 223),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              // Language Selection Icon positioned at top-right
              Positioned(
                top: 16,
                right: 16,
                child: GestureDetector(
                  onTap: _showLanguageSelection,
                  child: const Icon(
                    Icons.language,
                    color: Colors.teal,
                    size: 28,
                  ),
                ),
              ),
              // Main content
              Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Logo or Title (update to match signup page)
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Colors.teal, Colors.green],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.green.withOpacity(0.4),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.eco,
                                size: 60,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 12),
                            const Text(
                              'Clea~Ro',
                              style: TextStyle(
                                fontSize: 42,
                                fontWeight: FontWeight.bold,
                                color: Colors.teal,
                                shadows: [
                                  Shadow(
                                    color: Colors.green,
                                    blurRadius: 5,
                                    offset: Offset(1, 2),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 32),

                        // Title
                        Text(
                          _getText('welcome'),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Colors.teal,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Email Field
                        TextFormField(
                          controller: _emailController,
                          decoration: InputDecoration(
                            labelText: _getText('email'),
                            hintText: _getText('emailHint'),
                            prefixIcon: const Icon(
                              Icons.email,
                              color: Colors.green,
                            ),
                            filled: true,
                            fillColor: Colors.white.withOpacity(0.9),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                color: Colors.green,
                                width: 2,
                              ),
                            ),
                          ),
                          keyboardType: TextInputType.emailAddress,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return _getText('emailRequired');
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        // Password Field
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          decoration: InputDecoration(
                            labelText: _getText('password'),
                            hintText: _getText('passwordHint'),
                            prefixIcon: const Icon(
                              Icons.lock,
                              color: Colors.green,
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_off
                                    : Icons.visibility,
                                color: Colors.green,
                              ),
                              onPressed: () {
                                setState(() {
                                  _obscurePassword = !_obscurePassword;
                                });
                              },
                            ),
                            filled: true,
                            fillColor: Colors.white.withOpacity(0.9),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                color: Colors.green,
                                width: 2,
                              ),
                            ),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return _getText('passwordRequired');
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        // Forgot Password
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () {
                              if (_emailController.text.trim().isEmpty) {
                                _showErrorSnackBar(_getText('enterEmailReset'));
                                return;
                              }
                              _auth.sendPasswordResetEmail(
                                email: _emailController.text.trim(),
                              );
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(_getText('resetEmailSent')),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            },
                            child: Text(
                              _getText('forgotPassword'),
                              style: const TextStyle(color: Colors.teal),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Login Button
                        _isLoading
                            ? const Center(
                              child: CircularProgressIndicator(
                                color: Colors.teal,
                              ),
                            )
                            : ElevatedButton(
                              onPressed: _login,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 16,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Text(
                                _getText('login'),
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                        const SizedBox(height: 24),

                        // Sign Up Redirect
                        OutlinedButton(
                          onPressed: _navigateToSignup,
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(
                              color: Colors.green,
                              width: 1.5,
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            _getText('createAccount'),
                            style: const TextStyle(
                              color: Colors.green,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Terms of Service and Privacy Policy
                        GestureDetector(
                          onTap: () {
                            showDialog(
                              context: context,
                              builder:
                                  (context) => AlertDialog(
                                    title: const Text(
                                      'Terms of Service & Privacy Policy',
                                    ),
                                    content: const SingleChildScrollView(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '🌟 Terms of Service\n',
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.black,
                                            ),
                                          ),
                                          Text(
                                            'Welcome to Clearo!\n\n'
                                            'Clearo is dedicated to turning waste into worth by offering smart, sustainable, and community-driven waste collection solutions. '
                                            'With a focus on technology and togetherness, we aim to build a cleaner and greener Sri Lanka.\n\n'
                                            '🚀 What Clearo Offers:\n'
                                            '• 🛻 Real-time waste truck and bin tracking\n'
                                            '• 📅 Immediate waste pickup scheduling\n'
                                            '• 📍 Optimized waste collection route planning\n'
                                            '• 🔁 Share reusable items with the community\n'
                                            '• 📷 Upload photos & descriptions of reusable goods\n'
                                            '• 📊 Track your environmental contributions\n'
                                            '• 🧠 Waste segregation guidance\n'
                                            '• 🧾 Smart mapping and reporting features\n'
                                            '• 🚨 Citizen reporting for illegal dumping or bin issues\n'
                                            '• 📢 Community cleanup event notifications\n'
                                            '• 🦟 Dengue awareness updates in your area\n'
                                            '• 🌐 Multilingual support for inclusive access\n'
                                            '• 💬 Community feedback and suggestion hub\n\n'
                                            '❤️ Why We Built Clearo:\n'
                                            'Sri Lanka faces rising challenges in managing urban and suburban waste effectively. Overflowing bins, unoptimized truck routes, lack of community awareness, and communication gaps between citizens and municipalities contribute to environmental and health issues.\n\n'
                                            'We chose to build Clearo because we believe:\n'
                                            '• Technology can simplify complex waste collection processes\n'
                                            '• Communities play a key role in responsible disposal\n'
                                            '• Everyone deserves access to clean surroundings\n'
                                            '• Reusability and sustainability should be encouraged\n'
                                            '• Real-time visibility leads to better decision-making\n\n'
                                            '🌱 Your Impact as a Clearo User:\n'
                                            'By using Clearo, you’re helping to:\n'
                                            '• Keep your neighborhood clean\n'
                                            '• Promote reuse over discard\n'
                                            '• Optimize collection efforts and reduce pollution\n'
                                            '• Raise awareness of proper waste segregation\n'
                                            '• Prevent mosquito-borne diseases like dengue\n'
                                            '• Build a smarter and greener Sri Lanka, together\n\n'
                                            '💡 Did you know?\n'
                                            'Your contributions and participation are recorded in the app so you can **track your positive impact on the environment** and receive **recognition** for your efforts!\n\n'
                                            '🔎 Need Help?\n'
                                            'Visit our website or reach out to our support team—we\'re here to help!\n\n'
                                            '🌟 Let’s revolutionize waste collection—one bin, one truck, one smart action at a time.\n\n'
                                            '💚 Thank you for being a part of Clearo.\n\n',
                                            style: TextStyle(
                                              fontSize: 14,
                                              color: Colors.black87,
                                            ),
                                          ),
                                          SizedBox(height: 18),
                                          Text(
                                            '🔒 Privacy Policy\n',
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.black,
                                            ),
                                          ),
                                          Text(
                                            'At Clearo, we value your privacy and are committed to protecting your personal information. '
                                            'This Privacy Policy outlines how we collect, use, and safeguard your data:\n\n'
                                            '1. Data Collection:\n'
                                            '   - We collect your email, name, and location to provide personalized services.\n'
                                            '   - Usage data is collected to improve app performance and user experience.\n\n'
                                            '2. Data Usage:\n'
                                            '   - Your data is used for scheduling pickups, tracking contributions, and sending notifications.\n'
                                            '   - We do not sell or share your data with third parties without your consent.\n\n'
                                            '3. Data Security:\n'
                                            '   - We implement robust security measures to protect your data from unauthorized access.\n\n'
                                            '4. Your Rights:\n'
                                            '   - You can request access to your data or ask for its deletion at any time.\n\n'
                                            'For more details, please visit our website or contact our support team.\n\n'
                                            '💚 Thank you for trusting Clearo to manage your waste responsibly!',
                                            style: TextStyle(
                                              fontSize: 14,
                                              color: Colors.black87,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    actions: [
                                      TextButton(
                                        onPressed:
                                            () => Navigator.of(context).pop(),
                                        child: const Text('Close'),
                                      ),
                                    ],
                                  ),
                            );
                          },
                          child: Text(
                            _getText('terms'),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color.fromARGB(255, 143, 160, 174),
                              fontStyle: FontStyle.italic,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                      ],
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

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _locationSubscription?.cancel(); // Clean up location subscription
    super.dispose();
  }
}

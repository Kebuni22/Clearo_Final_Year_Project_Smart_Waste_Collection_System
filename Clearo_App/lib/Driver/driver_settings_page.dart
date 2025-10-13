import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../login_page.dart';

class DriverSettingsPage extends StatefulWidget {
  const DriverSettingsPage({Key? key}) : super(key: key);

  @override
  State<DriverSettingsPage> createState() => _DriverSettingsPageState();
}

class _DriverSettingsPageState extends State<DriverSettingsPage> {
  bool notificationsEnabled = true;
  String language = 'en';

  void _showChangePasswordDialog() {
    final _currentController = TextEditingController();
    final _newController = TextEditingController();
    final _confirmController = TextEditingController();
    final _formKey = GlobalKey<FormState>();
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder:
              (context, setState) => AlertDialog(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                title: Text(_localized(context, 'Change Password')),
                content: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller: _currentController,
                        obscureText: true,
                        decoration: InputDecoration(
                          labelText: _localized(context, 'Current Password'),
                          prefixIcon: const Icon(Icons.lock_outline),
                        ),
                        validator:
                            (v) =>
                                v == null || v.isEmpty
                                    ? _localized(context, 'Required')
                                    : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _newController,
                        obscureText: true,
                        decoration: InputDecoration(
                          labelText: _localized(context, 'New Password'),
                          prefixIcon: const Icon(Icons.lock),
                        ),
                        validator:
                            (v) =>
                                v == null || v.length < 6
                                    ? _localized(
                                      context,
                                      'Password must be at least 6 characters',
                                    )
                                    : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _confirmController,
                        obscureText: true,
                        decoration: InputDecoration(
                          labelText: _localized(context, 'Confirm Password'),
                          prefixIcon: const Icon(Icons.lock),
                        ),
                        validator:
                            (v) =>
                                v != _newController.text
                                    ? _localized(
                                      context,
                                      'Passwords do not match',
                                    )
                                    : null,
                      ),
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(_localized(context, 'Cancel')),
                  ),
                  ElevatedButton(
                    onPressed:
                        isLoading
                            ? null
                            : () async {
                              if (!_formKey.currentState!.validate()) return;
                              setState(() => isLoading = true);
                              try {
                                final user = FirebaseAuth.instance.currentUser;
                                final cred = EmailAuthProvider.credential(
                                  email: user?.email ?? '',
                                  password: _currentController.text,
                                );
                                await user?.reauthenticateWithCredential(cred);
                                await user?.updatePassword(_newController.text);
                                Navigator.of(context).pop();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      _localized(
                                        context,
                                        'Password changed successfully',
                                      ),
                                    ),
                                    backgroundColor: Colors.green,
                                  ),
                                );
                              } catch (e) {
                                setState(() => isLoading = false);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      _localized(
                                        context,
                                        'Failed to change password',
                                      ),
                                    ),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            },
                    child:
                        isLoading
                            ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                            : Text(_localized(context, 'Change')),
                  ),
                ],
              ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final pastelBg = const Color(0xFFF8F9FA);
    final pastelCard = const Color(0xFFB2DFDB);
    final pastelCardBg = const Color.fromARGB(
      255,
      230,
      248,
      250,
    ); // Add a pastel card background

    return Scaffold(
      appBar: AppBar(
        title: Text(_localized(context, 'Settings')),
        backgroundColor: pastelCard,
        elevation: 0,
      ),
      backgroundColor: pastelBg,
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            _localized(context, 'Preferences'),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Card(
            color: pastelCardBg, // Use pastel card background
            child: SwitchListTile(
              value: notificationsEnabled,
              onChanged: (val) {
                setState(() => notificationsEnabled = val);
                // Save to persistent storage if needed
              },
              title: Text(_localized(context, 'Enable Notifications')),
              secondary: const Icon(Icons.notifications),
            ),
          ),
          Card(
            color: pastelCardBg, // Use pastel card background
            child: ListTile(
              leading: const Icon(Icons.language),
              title: Text(_localized(context, 'Language')),
              trailing: DropdownButton<String>(
                value: language,
                items: [
                  DropdownMenuItem(value: 'en', child: Text('English')),
                  DropdownMenuItem(value: 'si', child: Text('සිංහල')),
                  DropdownMenuItem(value: 'ta', child: Text('தமிழ்')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setState(() => language = val);
                    // You must implement locale change in your app's main MaterialApp
                    // e.g. MyApp.of(context).setLocale(Locale(val));
                  }
                },
              ),
            ),
          ),
          const Divider(height: 32),
          Text(
            _localized(context, 'Account'),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          Card(
            color: pastelCardBg, // Use pastel card background
            child: ListTile(
              leading: const Icon(Icons.lock),
              title: Text(_localized(context, 'Change Password')),
              onTap: _showChangePasswordDialog,
            ),
          ),
          Card(
            color: pastelCardBg, // Use pastel card background
            child: ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: Text(_localized(context, 'Logout')),
              onTap: () async {
                await FirebaseAuth.instance.signOut();
                if (mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const LoginPage()),
                    (route) => false,
                  );
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  String _localized(BuildContext context, String key) {
    // Simple i18n for demonstration, replace with proper localization in your app
    final Map<String, Map<String, String>> localizedStrings = {
      'Settings': {'en': 'Settings', 'si': 'සැකසුම්', 'ta': 'அமைப்புகள்'},
      'Preferences': {
        'en': 'Preferences',
        'si': 'අභිප්‍රේත',
        'ta': 'விருப்பங்கள்',
      },
      'Enable Notifications': {
        'en': 'Enable Notifications',
        'si': 'දැනුම්දීම් සක්‍රිය කරන්න',
        'ta': 'அறிவிப்புகளை இயக்கவும்',
      },
      'Language': {'en': 'Language', 'si': 'භාෂාව', 'ta': 'மொழி'},
      'Account': {'en': 'Account', 'si': 'ගිණුම', 'ta': 'கணக்கு'},
      'Change Password': {
        'en': 'Change Password',
        'si': 'මුරපදය වෙනස් කරන්න',
        'ta': 'கடவுச்சொல்லை மாற்றவும்',
      },
      'Change password feature coming soon!': {
        'en': 'Change password feature coming soon!',
        'si': 'මුරපදය වෙනස් කිරීම ඉක්මනින් පැමිණේ!',
        'ta': 'கடவுச்சொல் மாற்றம் விரைவில் வருகிறது!',
      },
      'Logout': {'en': 'Logout', 'si': 'පිටවීම', 'ta': 'வெளியேறு'},
      'Logout feature coming soon!': {
        'en': 'Logout feature coming soon!',
        'si': 'පිටවීමේ විශේෂාංගය ඉක්මනින් පැමිණේ!',
        'ta': 'வெளியேறு விரைவில் வருகிறது!',
      },
      'Current Password': {
        'en': 'Current Password',
        'si': 'වත්මන් මුරපදය',
        'ta': 'தற்போதைய கடவுச்சொல்',
      },
      'New Password': {
        'en': 'New Password',
        'si': 'නව මුරපදය',
        'ta': 'புதிய கடவுச்சொல்',
      },
      'Confirm Password': {
        'en': 'Confirm Password',
        'si': 'මුරපදය තහවුරු කරන්න',
        'ta': 'கடவுச்சொல்லை உறுதிப்படுத்தவும்',
      },
      'Required': {'en': 'Required', 'si': 'අවශ්‍යයි', 'ta': 'தேவை'},
      'Password must be at least 6 characters': {
        'en': 'Password must be at least 6 characters',
        'si': 'මුරපදය අකුරු 6ක් වත් විය යුතුය',
        'ta': 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்',
      },
      'Passwords do not match': {
        'en': 'Passwords do not match',
        'si': 'මුරපද නොගැලපේ',
        'ta': 'கடவுச்சொற்கள் பொருந்தவில்லை',
      },
      'Change': {'en': 'Change', 'si': 'වෙනස් කරන්න', 'ta': 'மாற்றவும்'},
      'Cancel': {'en': 'Cancel', 'si': 'අවලංගු කරන්න', 'ta': 'ரத்து செய்'},
      'Password changed successfully': {
        'en': 'Password changed successfully',
        'si': 'මුරපදය සාර්ථකව වෙනස් විය',
        'ta': 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது',
      },
      'Failed to change password': {
        'en': 'Failed to change password',
        'si': 'මුරපදය වෙනස් කිරීමට නොහැකි විය',
        'ta': 'கடவுச்சொல் மாற்றம் தோல்வியடைந்தது',
      },
    };
    return localizedStrings[key]?[language] ?? key;
  }
}

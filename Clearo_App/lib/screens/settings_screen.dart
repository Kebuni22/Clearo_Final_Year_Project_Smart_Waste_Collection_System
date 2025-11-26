import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _darkModeEnabled = false;
  String _selectedLanguage = 'English';
  String _selectedTheme = 'Light';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  // Load settings from SharedPreferences
  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _darkModeEnabled = prefs.getBool('darkModeEnabled') ?? false;
      _selectedLanguage = prefs.getString('selectedLanguage') ?? 'English';
      _selectedTheme = prefs.getString('selectedTheme') ?? 'Light';
    });
  }

  // Save settings to SharedPreferences
  Future<void> _saveSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('darkModeEnabled', _darkModeEnabled);
    await prefs.setString('selectedLanguage', _selectedLanguage);
    await prefs.setString('selectedTheme', _selectedTheme);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEFFAF1),
      appBar: AppBar(
        title: const Text(
          'Settings',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF66BB6A),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildAppearanceSettings(),
                  const SizedBox(height: 24),
                  _buildAccountSettings(),
                  const SizedBox(height: 24),
                  _buildPrivacySettings(),
                  const SizedBox(height: 24),
                  _buildAboutSettings(),
                ],
              ),
            ),
    );
  }

  Widget _buildAppearanceSettings() {
    return _buildSettingSection(
      title: 'Appearance',
      icon: Icons.palette,
      children: [
        ListTile(
          title: const Text('Theme'),
          subtitle: Text(_selectedTheme),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _showThemeDialog(),
        ),
        ListTile(
          title: const Text('Language'),
          subtitle: Text(_selectedLanguage),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _showLanguageDialog(),
        ),
        SwitchListTile(
          title: const Text('Dark Mode'),
          subtitle: const Text('Enable dark theme'),
          value: _darkModeEnabled,
          activeColor: const Color(0xFF66BB6A),
          onChanged: (value) {
            setState(() {
              _darkModeEnabled = value;
              _selectedTheme = value ? 'Dark' : 'Light';
            });
            _saveSettings();
            _showSnackBar('Dark mode ${value ? 'enabled' : 'disabled'}');
          },
        ),
      ],
    );
  }

  Widget _buildAccountSettings() {
    final user = FirebaseAuth.instance.currentUser;

    return _buildSettingSection(
      title: 'Account',
      icon: Icons.person,
      children: [
        ListTile(
          title: const Text('Email'),
          subtitle: Text(user?.email ?? 'Not signed in'),
          leading: const Icon(Icons.email, color: Color(0xFF66BB6A)),
        ),
        ListTile(
          title: const Text('Display Name'),
          subtitle: Text(user?.displayName ?? 'Not set'),
          leading: const Icon(Icons.person, color: Color(0xFF66BB6A)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _showUpdateDisplayNameDialog(),
        ),
        ListTile(
          title: const Text('Change Password'),
          leading: const Icon(Icons.lock, color: Color(0xFF66BB6A)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _showChangePasswordDialog(),
        ),
        ListTile(
          title: const Text('Delete Account'),
          leading: const Icon(Icons.delete_forever, color: Colors.red),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _showDeleteAccountDialog(),
        ),
      ],
    );
  }

  Widget _buildPrivacySettings() {
    return _buildSettingSection(
      title: 'Privacy & Security',
      icon: Icons.security,
      children: [
        ListTile(
          title: const Text('Privacy Policy'),
          leading: const Icon(Icons.privacy_tip, color: Color(0xFF66BB6A)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _showPrivacyPolicy(),
        ),
        ListTile(
          title: const Text('Terms of Service'),
          leading: const Icon(Icons.description, color: Color(0xFF66BB6A)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _showTermsOfService(),
        ),
        ListTile(
          title: const Text('Data Usage'),
          leading: const Icon(Icons.data_usage, color: Color(0xFF66BB6A)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _showDataUsage(),
        ),
      ],
    );
  }

  Widget _buildAboutSettings() {
    return _buildSettingSection(
      title: 'About',
      icon: Icons.info,
      children: [
        ListTile(
          title: const Text('App Version'),
          subtitle: const Text('1.0.0'),
          leading: const Icon(Icons.update, color: Color(0xFF66BB6A)),
        ),
        ListTile(
          title: const Text('Check for Updates'),
          leading: const Icon(Icons.system_update, color: Color(0xFF66BB6A)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _checkForUpdates(),
        ),
        ListTile(
          title: const Text('Clear Cache'),
          leading: const Icon(Icons.delete_sweep, color: Color(0xFF66BB6A)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _clearCache(),
        ),
      ],
    );
  }

  Widget _buildSettingSection({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(icon, color: const Color(0xFF66BB6A)),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2E7D32),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ...children,
        ],
      ),
    );
  }

  void _showThemeDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Theme'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: const Text('Light'),
              value: 'Light',
              groupValue: _selectedTheme,
              activeColor: const Color(0xFF66BB6A),
              onChanged: (value) {
                setState(() {
                  _selectedTheme = value!;
                  _darkModeEnabled = false;
                });
                _saveSettings();
                Navigator.pop(context);
                _showSnackBar('Theme changed to Light');
              },
            ),
            RadioListTile<String>(
              title: const Text('Dark'),
              value: 'Dark',
              groupValue: _selectedTheme,
              activeColor: const Color(0xFF66BB6A),
              onChanged: (value) {
                setState(() {
                  _selectedTheme = value!;
                  _darkModeEnabled = true;
                });
                _saveSettings();
                Navigator.pop(context);
                _showSnackBar('Theme changed to Dark');
              },
            ),
            RadioListTile<String>(
              title: const Text('System Default'),
              value: 'System',
              groupValue: _selectedTheme,
              activeColor: const Color(0xFF66BB6A),
              onChanged: (value) {
                setState(() {
                  _selectedTheme = value!;
                  _darkModeEnabled = false;
                });
                _saveSettings();
                Navigator.pop(context);
                _showSnackBar('Theme set to System Default');
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showLanguageDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Language'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: const Text('English'),
              value: 'English',
              groupValue: _selectedLanguage,
              activeColor: const Color(0xFF66BB6A),
              onChanged: (value) {
                setState(() => _selectedLanguage = value!);
                _saveSettings();
                Navigator.pop(context);
                _showSnackBar('Language changed to English');
              },
            ),
            RadioListTile<String>(
              title: const Text('Sinhala'),
              value: 'Sinhala',
              groupValue: _selectedLanguage,
              activeColor: const Color(0xFF66BB6A),
              onChanged: (value) {
                setState(() => _selectedLanguage = value!);
                _saveSettings();
                Navigator.pop(context);
                _showSnackBar('භාෂාව සිංහලට වෙනස් විය');
              },
            ),
            RadioListTile<String>(
              title: const Text('Tamil'),
              value: 'Tamil',
              groupValue: _selectedLanguage,
              activeColor: const Color(0xFF66BB6A),
              onChanged: (value) {
                setState(() => _selectedLanguage = value!);
                _saveSettings();
                Navigator.pop(context);
                _showSnackBar('மொழி தமிழுக்கு மாற்றப்பட்டது');
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showUpdateDisplayNameDialog() {
    final TextEditingController nameController = TextEditingController();
    final user = FirebaseAuth.instance.currentUser;
    nameController.text = user?.displayName ?? '';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Update Display Name'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: 'Display Name',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.person),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF66BB6A),
            ),
            onPressed: () async {
              if (nameController.text.trim().isEmpty) {
                _showSnackBar('Name cannot be empty', isError: true);
                return;
              }

              try {
                await user?.updateDisplayName(nameController.text.trim());
                await user?.reload();
                setState(() {});
                Navigator.pop(context);
                _showSnackBar('Display name updated successfully');
              } catch (e) {
                _showSnackBar('Failed to update name', isError: true);
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  void _showChangePasswordDialog() {
    final TextEditingController currentPasswordController =
        TextEditingController();
    final TextEditingController newPasswordController = TextEditingController();
    final TextEditingController confirmPasswordController =
        TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change Password'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: currentPasswordController,
                decoration: const InputDecoration(
                  labelText: 'Current Password',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.lock),
                ),
                obscureText: true,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: newPasswordController,
                decoration: const InputDecoration(
                  labelText: 'New Password',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.lock_open),
                ),
                obscureText: true,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confirmPasswordController,
                decoration: const InputDecoration(
                  labelText: 'Confirm New Password',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.lock_open),
                ),
                obscureText: true,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF66BB6A),
            ),
            onPressed: () async {
              if (newPasswordController.text !=
                  confirmPasswordController.text) {
                _showSnackBar('Passwords do not match', isError: true);
                return;
              }

              if (newPasswordController.text.length < 6) {
                _showSnackBar('Password must be at least 6 characters',
                    isError: true);
                return;
              }

              try {
                final user = FirebaseAuth.instance.currentUser;
                final credential = EmailAuthProvider.credential(
                  email: user!.email!,
                  password: currentPasswordController.text,
                );

                await user.reauthenticateWithCredential(credential);
                await user.updatePassword(newPasswordController.text);

                Navigator.pop(context);
                _showSnackBar('Password changed successfully');
              } catch (e) {
                _showSnackBar(
                    'Failed to change password. Check current password.',
                    isError: true);
              }
            },
            child: const Text('Change Password'),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog() {
    final TextEditingController passwordController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Account'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Are you sure you want to delete your account? This action cannot be undone.',
              style: TextStyle(color: Colors.red),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: passwordController,
              decoration: const InputDecoration(
                labelText: 'Confirm Password',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.lock),
              ),
              obscureText: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            onPressed: () async {
              try {
                final user = FirebaseAuth.instance.currentUser;
                final credential = EmailAuthProvider.credential(
                  email: user!.email!,
                  password: passwordController.text,
                );

                await user.reauthenticateWithCredential(credential);
                await user.delete();

                Navigator.pop(context);
                Navigator.pushReplacementNamed(context, '/login');
              } catch (e) {
                _showSnackBar('Failed to delete account', isError: true);
              }
            },
            child: const Text('Delete Account'),
          ),
        ],
      ),
    );
  }

  void _checkForUpdates() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Check for Updates'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            const Text('Checking for updates...'),
          ],
        ),
      ),
    );

    Future.delayed(const Duration(seconds: 2), () {
      Navigator.pop(context);
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('✓ Up to Date'),
          content:
              const Text('You are using the latest version of Clearo (1.0.0)'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    });
  }

  void _clearCache() async {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Cache'),
        content: const Text(
          'Are you sure you want to clear app cache? This may free up storage space but will remove temporary data.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF66BB6A),
            ),
            onPressed: () async {
              Navigator.pop(context);

              // Show loading
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (context) => const Center(
                  child: CircularProgressIndicator(),
                ),
              );

              // Simulate cache clearing
              await Future.delayed(const Duration(seconds: 1));

              // Clear SharedPreferences cache
              final prefs = await SharedPreferences.getInstance();
              final keys =
                  prefs.getKeys().where((key) => key.startsWith('cache_'));
              for (var key in keys) {
                await prefs.remove(key);
              }

              Navigator.pop(context);
              _showSnackBar('Cache cleared successfully (0.5 MB freed)');
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showPrivacyPolicy() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Privacy Policy'),
        content: const SingleChildScrollView(
          child: Text(
            'Privacy Policy\n\n'
            'Your privacy is important to us. Clearo collects and uses your data to provide efficient waste management services.\n\n'
            'Data Collection:\n'
            '• Location data for bin placement and collection\n'
            '• Usage statistics for service improvement\n'
            '• Contact information for notifications\n\n'
            'Data Protection:\n'
            '• All data is encrypted and stored securely\n'
            '• We never share personal data with third parties\n'
            '• You can request data deletion anytime',
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

  void _showTermsOfService() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Terms of Service'),
        content: const SingleChildScrollView(
          child: Text(
            'Terms of Service\n\n'
            'By using Clearo, you agree to:\n\n'
            '1. Provide accurate information\n'
            '2. Use the service responsibly\n'
            '3. Follow local waste disposal regulations\n'
            '4. Maintain proper bin placement\n'
            '5. Report issues promptly\n\n'
            'Service Availability:\n'
            '• We strive for 99% uptime\n'
            '• Scheduled maintenance will be announced\n'
            '• Support available 24/7',
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

  void _showDataUsage() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Data Usage'),
        content: const Text(
          'Data Usage Information\n\n'
          'Estimated data consumption:\n'
          '• Normal usage: ~10 MB/month\n'
          '• With live tracking: ~50 MB/month\n'
          '• Image uploads: ~5 MB per image\n\n'
          'Tip: Use Wi-Fi for uploading images and videos to save mobile data.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

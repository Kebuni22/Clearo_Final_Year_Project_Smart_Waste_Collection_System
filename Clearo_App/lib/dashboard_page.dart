import 'package:clearo/screens/immediate_pickup_screen.dart';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'login_page.dart';
// Import each screen directly to avoid issues with the screens.dart export file
import 'screens/collection_schedule_screen.dart';
import 'screens/bin_status_screen.dart';
import 'screens/recycling_info_screen.dart';
import 'screens/report_issue_screen.dart';
import 'screens/community_sharing_screen.dart'; // Import the new screen
import 'screens/notification_screen.dart'; // Import the notification screen
import 'screens/user_account_screen.dart'; // Import the UserAccountScreen
import 'screens/truck_tracking_screen.dart'; // Import TruckTrackingScreen
import 'screens/health_alerts_screen.dart'; // Import HealthAlertsScreen

class DashboardPage extends StatefulWidget {
  final String userName;
  final bool showLoginMessage;

  const DashboardPage({
    super.key,
    required this.userName,
    this.showLoginMessage = false,
  });

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  late String _formattedDate;

  // Add a list of notices fetched from admin
  List<String> _notices = [];

  @override
  void initState() {
    super.initState();
    _formattedDate = _getFormattedDate();
    _fetchNoticesFromAdmin(); // Fetch notices on initialization

    if (widget.showLoginMessage) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Login successful. Welcome, ${_capitalizeFirstName(widget.userName.split('@').first)}!', // Use name before '@' in email
            ),
            backgroundColor: const Color.fromARGB(255, 158, 225, 160),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 3),
          ),
        );
      });
    }
  }

  // Format date without using the intl package
  String _getFormattedDate() {
    final now = DateTime.now();
    final weekdays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    final weekday = weekdays[now.weekday - 1]; // weekday is 1-7 in DateTime
    final month = months[now.month - 1]; // month is 1-12 in DateTime
    final day = now.day;
    final year = now.year;

    return '$weekday, $month $day, $year';
  }

  // Helper function to capitalize the first letter of the user's first name
  String _capitalizeFirstName(String fullName) {
    final firstName = fullName.split(' ').first;
    return firstName[0].toUpperCase() + firstName.substring(1).toLowerCase();
  }

  void _signOut() async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder:
          (context) => AlertDialog(
            backgroundColor: const Color(
              0xFFEFFAF1,
            ), // Very light green background
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            title: Row(
              children: [
                const Icon(Icons.logout, color: Colors.red),
                const SizedBox(width: 8),
                const Text(
                  'Confirm Logout',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            content: const Text(
              'Are you sure you want to log out?',
              style: TextStyle(fontSize: 16, color: Colors.black87),
            ),
            actions: [
              Row(
                mainAxisAlignment:
                    MainAxisAlignment.spaceEvenly, // Align buttons evenly
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    style: TextButton.styleFrom(
                      foregroundColor: Colors.black54,
                      textStyle: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text('Cancel'),
                  ),
                  ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      textStyle: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text('Logout'),
                  ),
                ],
              ),
            ],
          ),
    );

    if (shouldLogout == true) {
      await _auth.signOut();
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const LoginPage()),
        );
      }
    }
  }

  /// Modernized welcome bar with lighter colors and no icon
  Widget _buildModernWelcomeBar() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color.fromARGB(255, 217, 241, 216), // Light green
            Color.fromARGB(255, 229, 247, 236), // Softer green
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(25), // Rounded corners
        boxShadow: [
          BoxShadow(
            color: Colors.green.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: Colors.white.withOpacity(0.4), // Subtle border
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome, ${_capitalizeFirstName(widget.userName.split('@').first)}!', // Use name before '@' in email
            style: const TextStyle(
              color: Color(0xFF2E7D32), // Smooth green
              fontSize: 22,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Today is $_formattedDate',
            style: const TextStyle(
              color: Color.fromARGB(255, 52, 93, 54), // Light green
              fontSize: 16,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEFFAF1), // Very light green background
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(70),
        child: AppBar(
          backgroundColor: const Color.fromARGB(0, 196, 187, 187),
          // Remove default shadow
          flexibleSpace: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Color.fromARGB(255, 221, 239, 210), // Light green
                  Color.fromARGB(255, 219, 242, 227), // Softer green
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          title: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color.fromARGB(
                    255,
                    242,
                    245,
                    243,
                  ), // Light green circle
                ),
                child: IconButton(
                  icon: const Icon(
                    Icons.menu,
                    color: Color(0xFF388E3C), // Green menu icon
                    size: 24,
                  ),
                  tooltip: 'Menu',
                  onPressed: _showMenuBar,
                ),
              ),
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [
                      Color(0xFF66BB6A),
                      Color(0xFF43A047),
                    ], // Green gradient
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Icon(
                  Icons.eco,
                  color: Colors.white, // White eco icon
                  size: 24,
                ),
              ),
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xFFE8F5E9), // Light green circle
                ),
                child: IconButton(
                  icon: const Icon(
                    Icons.notifications_active,
                    color: Color(0xFF388E3C), // Green bell icon
                    size: 24,
                  ),
                  tooltip: 'Notifications',
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const NotificationScreen(),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(4),
            child: Container(
              height: 4,
              decoration: const BoxDecoration(
                color: Colors.transparent,
                boxShadow: [
                  BoxShadow(
                    color: Color.fromARGB(66, 121, 159, 126), // Subtle shadow
                    blurRadius: 2,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshDashboard,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildModernWelcomeBar(), // Upper bar with welcome text
              const SizedBox(height: 24),
              const Text(
                'Smart Garbage System',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color.fromARGB(221, 56, 86, 74),
                ),
              ),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.1,
                children: [
                  _buildDashboardItem(
                    title: 'Collection Schedule',
                    icon: Icons.event, // Updated icon
                    color: Colors.indigo, // Updated circle color
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder:
                              (context) => const CollectionScheduleScreen(),
                        ),
                      );
                    },
                  ),
                  _buildDashboardItem(
                    title: 'Bin Status',
                    icon: Icons.delete,
                    color: Colors.orange,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const BinStatusScreen(),
                        ),
                      );
                    },
                  ),
                  _buildDashboardItem(
                    title: 'Immediate Pickup',
                    icon: Icons.flash_on,
                    color: Colors.purple,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder:
                              (context) =>
                                  const ImmediatePickupScreen(), // Navigate to ImmediatePickupScreen
                        ),
                      );
                    },
                  ),
                  _buildDashboardItem(
                    title: 'Community Sharing',
                    icon: Icons.recycling,
                    color: const Color.fromARGB(255, 187, 189, 62),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const CommunitySharingScreen(),
                        ),
                      );
                    },
                  ),
                  _buildDashboardItem(
                    title: 'Recycling Info',
                    icon: Icons.refresh,
                    color: Colors.green,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const RecyclingInfoScreen(),
                        ),
                      );
                    },
                  ),
                  _buildDashboardItem(
                    title: 'Report Issue',
                    icon: Icons.report_problem,
                    color: Colors.red,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const ReportIssueScreen(),
                        ),
                      );
                    },
                  ),
                  _buildDashboardItem(
                    title: 'Truck Tracking',
                    icon: Icons.local_shipping,
                    color: Colors.blueAccent,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder:
                              (context) =>
                                  const TruckTrackingScreen(), // Navigate to TruckTrackingScreen
                        ),
                      );
                    },
                  ),
                  _buildDashboardItem(
                    title: 'Awareness Zone', // Updated title
                    icon: Icons.info_outline, // Updated icon
                    color: Colors.teal, // Updated circle color
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder:
                              (context) =>
                                  const HealthAlertsScreen(), // Updated screen name
                        ),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _buildRecentActivitySection(),
              const SizedBox(height: 24),
              _buildNoticeSection(), // Move notice section here
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showQuickActionMenu,
        backgroundColor: const Color.fromARGB(255, 162, 217, 164),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showMenuBar() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder:
          (context) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const ListTile(
                title: Text(
                  'Menu',
                  style: TextStyle(fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.person, color: Colors.blue),
                title: const Text('My Account'),
                onTap: () {
                  Navigator.pop(context); // Close the menu
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const UserAccountScreen(),
                    ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.settings, color: Colors.blue),
                title: const Text('Settings'),
                onTap: () {
                  Navigator.pop(context); // Close the menu
                  showDialog(
                    context: context,
                    builder:
                        (context) => AlertDialog(
                          title: const Text('Settings'),
                          content: const Text(
                            'Settings allow you to customize your app experience, such as notifications, themes, and more.',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('Close'),
                            ),
                          ],
                        ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.help_outline, color: Colors.orange),
                title: const Text('Help & Support'),
                onTap: () {
                  Navigator.pop(context); // Close the menu
                  showDialog(
                    context: context,
                    builder:
                        (context) => AlertDialog(
                          title: const Text('Help & Support'),
                          content: const Text(
                            'Need assistance? Contact our support team or visit our FAQ section for common questions.',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('Close'),
                            ),
                          ],
                        ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.info_outline, color: Colors.green),
                title: const Text('About'),
                onTap: () {
                  Navigator.pop(context); // Close the menu
                  showDialog(
                    context: context,
                    builder:
                        (context) => AlertDialog(
                          title: const Text('About'),
                          content: const Text(
                            'Clearo is a smart garbage management system designed to make waste collection efficient and eco-friendly.',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('Close'),
                            ),
                          ],
                        ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Logout'),
                onTap: () {
                  Navigator.pop(context); // Close the menu
                  _signOut(); // Trigger logout
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
    );
  }

  /// Refresh functionality placeholder
  Future<void> _refreshDashboard() async {
    await Future.delayed(const Duration(seconds: 1));
    // Add actual refresh logic if needed
    setState(() {
      _formattedDate = _getFormattedDate();
    });
  }

  /// Modern welcome section with smaller app logo
  Widget _buildModernWelcomeSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFE8F5E9), Color(0xFFC8E6C9)], // Softer green shades
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.green.withOpacity(0.2),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30, // Reduced size
            backgroundColor: Colors.white.withOpacity(0.9),
            child: const Icon(
              Icons.eco,
              size: 28, // Reduced size
              color: Color(0xFF388E3C),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome, ${_capitalizeFirstName(widget.userName)}!',
                  style: const TextStyle(
                    color: Color(0xFF2E7D32), // Smooth green
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Today is $_formattedDate',
                  style: const TextStyle(
                    color: Color(0xFF66BB6A), // Light green
                    fontSize: 16,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(
              Icons.notifications_active,
              color: Color(0xFF388E3C), // Darker green
              size: 30,
            ),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => const NotificationScreen(),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  /// Welcome card with date
  Widget _buildWelcomeCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
      decoration: BoxDecoration(
        color: const Color.fromARGB(255, 200, 246, 202),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color.fromARGB(255, 174, 215, 175).withOpacity(0.4),
            blurRadius: 8,
            offset: const Offset(2, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome, ${widget.userName}!',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Today is $_formattedDate',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 16,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }

  /// Dashboard item builder
  Widget _buildDashboardItem({
    required String title,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: () {
        try {
          onTap();
        } catch (e) {
          _showErrorDialog(context, 'Failed to navigate to $title.');
        }
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.2),
              blurRadius: 6,
              offset: const Offset(2, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.2),
              radius: 28,
              child: Icon(icon, color: color, size: 30),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showErrorDialog(BuildContext context, String message) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: const Text('Error'),
            content: Text(message),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('OK'),
              ),
            ],
          ),
    );
  }

  /// Stat indicator for welcome card
  Widget _buildStatIndicator({
    required String title,
    required String value,
    required IconData icon,
  }) {
    return Expanded(
      child: Row(
        children: [
          Icon(icon, color: Colors.white70, size: 20),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Recent activity section
  Widget _buildRecentActivitySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Recent Activity',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            TextButton(
              onPressed: () {
                // View all activities
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Activity history coming soon'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _buildActivityItem(
          title: 'Bin 1 Collection',
          subtitle: 'Today, 09:30 AM',
          icon: Icons.delete_outline,
          color: Colors.blue,
          onTap:
              () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const CollectionScheduleScreen(),
                ),
              ),
        ),
        _buildActivityItem(
          title: 'Recycling Completed',
          subtitle: 'Yesterday, 02:15 PM',
          icon: Icons.recycling,
          color: Colors.green,
          onTap:
              () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const RecyclingInfoScreen(),
                ),
              ),
        ),
        _buildActivityItem(
          title: 'Bin 2 Almost Full',
          subtitle: '2 days ago, 11:20 AM',
          icon: Icons.warning_amber_rounded,
          color: Colors.orange,
          onTap:
              () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const BinStatusScreen(),
                ),
              ),
        ),
      ],
    );
  }

  /// Activity item for recent activity section
  Widget _buildActivityItem({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.2),
              radius: 20,
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: Colors.black87,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }

  // Show quick action menu for the floating action button
  void _showQuickActionMenu() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder:
          (context) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const ListTile(
                title: Text(
                  'Quick Actions',
                  style: TextStyle(fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.calendar_today, color: Colors.blue),
                title: const Text('Schedule Collection'),
                onTap: () {
                  Navigator.pop(context); // Close the bottom sheet
                  debugPrint(
                    'Navigating to Collection Schedule from quick action',
                  );
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const CollectionScheduleScreen(),
                    ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(
                  Icons.add_circle_outline,
                  color: Colors.orange,
                ),
                title: const Text('Add New Bin'),
                onTap: () {
                  Navigator.pop(context); // Close the bottom sheet
                  debugPrint('Navigating to Bin Status from quick action');
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const BinStatusScreen(),
                    ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(
                  Icons.report_problem_outlined,
                  color: Colors.red,
                ),
                title: const Text('Report Issue'),
                onTap: () {
                  Navigator.pop(context); // Close the bottom sheet
                  debugPrint('Navigating to Report Issue from quick action');
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const ReportIssueScreen(),
                    ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Logout'),
                onTap: () {
                  Navigator.pop(context); // Close the bottom sheet
                  _signOut(); // Trigger logout
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
    );
  }

  void _showImmediatePickupDialog() {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: const Text('Request Immediate Pickup'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Select the bin for immediate pickup:'),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Bin ID',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    DropdownMenuItem(
                      value: 'BIN-1001',
                      child: Text('BIN-1001'),
                    ),
                    DropdownMenuItem(
                      value: 'BIN-1002',
                      child: Text('BIN-1002'),
                    ),
                    DropdownMenuItem(
                      value: 'BIN-1003',
                      child: Text('BIN-1003'),
                    ),
                  ],
                  onChanged: (value) {},
                ),
                const SizedBox(height: 16),
                const Text('Any special instructions?'),
                const SizedBox(height: 8),
                const TextField(
                  decoration: InputDecoration(
                    hintText: 'E.g., Pickup urgently before 5 PM',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Immediate pickup request submitted successfully',
                      ),
                      backgroundColor: Colors.green,
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                child: const Text('Submit Request'),
              ),
            ],
          ),
    );
  }

  // Fetch notices from admin (mocked for now)
  void _fetchNoticesFromAdmin() async {
    await Future.delayed(const Duration(seconds: 1)); // Simulate network delay
    setState(() {
      _notices = [
        "Garbage collection will be delayed by 2 hours tomorrow.",
        "New recycling bins have been added in your area.",
        "Community cleanup event scheduled for next Saturday.",
      ];
    });
  }

  // Add a widget to display notices with lighter colors
  Widget _buildNoticeSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFC8E6C9),
            Color(0xFFE8F5E9),
          ], // Lighter green gradient
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.green.withOpacity(0.2),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Notices',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2E7D32), // Smooth green
            ),
          ),
          const SizedBox(height: 12),
          if (_notices.isEmpty)
            const Center(
              child: Text(
                'No notices available at the moment.',
                style: TextStyle(fontSize: 14, color: Colors.grey),
              ),
            )
          else
            ..._notices.map(
              (notice) => Container(
                margin: const EdgeInsets.symmetric(vertical: 6),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.9),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.green.withOpacity(0.1),
                      blurRadius: 6,
                      offset: const Offset(2, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info, color: Color(0xFF66BB6A), size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        notice,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF2E7D32), // Smooth green
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

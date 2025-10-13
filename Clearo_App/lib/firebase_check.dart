import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dashboard_page.dart';
import 'login_page.dart';

class FirebaseCheck extends StatelessWidget {
  const FirebaseCheck({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        } else if (snapshot.hasData && snapshot.data != null) {
          final user = snapshot.data!;
          final firestore = FirebaseFirestore.instance;

          return FutureBuilder<DocumentSnapshot>(
            future: firestore.collection('users').doc(user.uid).get(),
            builder: (context, userSnapshot) {
              if (userSnapshot.connectionState == ConnectionState.waiting) {
                return const Scaffold(
                  body: Center(child: CircularProgressIndicator()),
                );
              } else if (userSnapshot.hasData && userSnapshot.data != null) {
                final userData =
                    userSnapshot.data!.data() as Map<String, dynamic>?;
                final userName =
                    userData?['name'] ?? user.email?.split('@')[0] ?? 'User';

                return DashboardPage(
                  userName: userName,
                  showLoginMessage: false,
                );
              } else {
                return const LoginPage();
              }
            },
          );
        } else {
          return const LoginPage();
        }
      },
    );
  }
}

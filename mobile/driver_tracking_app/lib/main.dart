import 'package:flutter/material.dart';
import 'login_screen.dart';
import 'home_screen.dart';
import 'auth_service.dart';

void main() {
  runApp(const DriverTrackingApp());
}

class DriverTrackingApp extends StatelessWidget {
  const DriverTrackingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Driver Tracking',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1E3A8A),
        ),
        scaffoldBackgroundColor: const Color(0xFFF5F7FB),
      ),
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();

    return FutureBuilder<Map<String, dynamic>?>(
      future: authService.getSavedUser(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final user = snapshot.data;

        if (user != null && user['driver_id'] != null && user['driver_id'] != 0) {
          return HomeScreen(
            driverId: user['driver_id'],
            driverName: user['nombre'] ?? 'Usuario',
          );
        }

        return const LoginScreen();
      },
    );
  }
}
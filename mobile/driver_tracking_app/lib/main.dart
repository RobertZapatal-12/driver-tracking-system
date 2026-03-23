import 'package:flutter/material.dart';
import 'login_screen.dart';

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
      home: const LoginScreen(),
    );
  }
}
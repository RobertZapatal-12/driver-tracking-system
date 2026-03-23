import 'dart:convert';
import 'package:http/http.dart' as http;

class AuthService {
  Future<Map<String, dynamic>?> login({
    required String username,
    required String password,
  }) async {
    await Future.delayed(const Duration(seconds: 1));

    if (username.isNotEmpty && password.isNotEmpty) {
      return {
        'driver_id': 1,
        'nombre': username,
      };
    }

    return null;
  }
}
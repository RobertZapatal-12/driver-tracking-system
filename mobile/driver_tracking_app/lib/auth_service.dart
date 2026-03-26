import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  // Android Emulator
  static const String baseUrl = 'http://10.0.2.2:8000';

  // Si pruebas en celular físico, cambia a la IP de tu PC.
  // Ejemplo:
  // static const String baseUrl = 'http://192.168.1.100:8000';

  Future<Map<String, dynamic>?> login({
    required String email,
    required String password,
  }) async {
    final url = Uri.parse('$baseUrl/api/login');

    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      final Map<String, dynamic> data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        final token = data['token'];
        final user = data['user'];

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('authToken', token);
        await prefs.setInt('userId', user['id']);
        await prefs.setInt('driverId', user['driver_id'] ?? 0);
        await prefs.setString('userEmail', user['email'] ?? '');
        await prefs.setString('userName', user['name'] ?? '');
        await prefs.setString('userRole', user['role'] ?? '');

        return {
          'token': token,
          'user_id': user['id'],
          'driver_id': user['driver_id'],
          'nombre': user['name'],
          'email': user['email'],
          'role': user['role'],
        };
      }

      throw Exception(data['detail'] ?? 'Credenciales inválidas');
    } catch (e) {
      throw Exception('Error de login: $e');
    }
  }

  Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('authToken');
    return token != null && token.isNotEmpty;
  }

  Future<Map<String, dynamic>?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('authToken');

    if (token == null || token.isEmpty) {
      return null;
    }

    return {
      'token': token,
      'user_id': prefs.getInt('userId'),
      'driver_id': prefs.getInt('driverId'),
      'nombre': prefs.getString('userName') ?? '',
      'email': prefs.getString('userEmail') ?? '',
      'role': prefs.getString('userRole') ?? '',
    };
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('authToken');
    await prefs.remove('userId');
    await prefs.remove('driverId');
    await prefs.remove('userEmail');
    await prefs.remove('userName');
    await prefs.remove('userRole');
  }
}
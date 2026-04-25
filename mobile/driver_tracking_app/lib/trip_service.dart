import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

/// Servicio para manejar rutas asignadas y navegación OSRM.
class TripService {
  static const String baseUrl = 'http://10.0.2.2:5000';

  // ── Rutas asignadas al conductor ──────────────────────
  Future<List<Map<String, dynamic>>> getDriverRoutes(int driverId) async {
    try {
      final resp = await http.get(
        Uri.parse('$baseUrl/route/driver/$driverId'),
        headers: {'Content-Type': 'application/json'},
      );
      if (resp.statusCode == 200) {
        return List<Map<String, dynamic>>.from(jsonDecode(resp.body));
      }
      return [];
    } catch (e) {
      debugPrint('Error obteniendo rutas: $e');
      return [];
    }
  }

  // ── Cambiar estado de ruta ────────────────────────────
  Future<bool> updateRouteStatus(int routeId, String estado) async {
    try {
      final resp = await http.patch(
        Uri.parse('$baseUrl/route/$routeId/status'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'estado': estado}),
      );
      return resp.statusCode == 200;
    } catch (e) {
      debugPrint('Error actualizando estado: $e');
      return false;
    }
  }

  // ── Notificar llegada al punto de recogida ────────────
  /// Cambia el sub_estado de la solicitud a 'con_cliente' en la BD.
  Future<bool> arrivedAtPickup(int tripId) async {
    try {
      final resp = await http.patch(
        Uri.parse('$baseUrl/driver-trips/$tripId/arrived'),
        headers: {'Content-Type': 'application/json'},
      );
      return resp.statusCode == 200;
    } catch (e) {
      debugPrint('Error notificando llegada a recogida: $e');
      return false;
    }
  }

  // ── OSRM: obtener ruta de navegación ──────────────────
  /// Retorna una lista de puntos LatLng con la ruta óptima entre
  /// [from] y [to] usando OSRM (gratuito, sin API key).
  /// También retorna distancia (m) y duración (s).
  Future<Map<String, dynamic>?> getNavigationRoute(
    LatLng from,
    LatLng to,
  ) async {
    final url =
        'http://router.project-osrm.org/route/v1/driving/'
        '${from.longitude},${from.latitude};'
        '${to.longitude},${to.latitude}'
        '?overview=full&geometries=geojson';

    try {
      final resp = await http.get(Uri.parse(url));
      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body);
        if (data['routes'] != null && (data['routes'] as List).isNotEmpty) {
          final route = data['routes'][0];
          final coords = route['geometry']['coordinates'] as List;

          final points = coords.map<LatLng>((c) {
            return LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble());
          }).toList();

          return {
            'points': points,
            'distance': (route['distance'] as num).toDouble(), // metros
            'duration': (route['duration'] as num).toDouble(), // segundos
          };
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error OSRM: $e');
      return null;
    }
  }

  // ── Enviar ubicación ──────────────────────────────────
  Future<void> sendLocation(int driverId, double lat, double lon, double speed) async {
    try {
      await http.post(
        Uri.parse('$baseUrl/locations/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'driver_id': driverId,
          'latitud': lat,
          'longitud': lon,
          'velocidad': speed < 0 ? 0.0 : speed,
        }),
      );
    } catch (e) {
      debugPrint('Error enviando ubicación: $e');
    }
  }
}

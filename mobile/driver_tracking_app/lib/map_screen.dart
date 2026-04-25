import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import 'trip_service.dart';

// ── Fases del viaje ────────────────────────────────────────────
/// Controla en qué fase del viaje se encuentra el conductor.
enum TripPhase {
  /// Navegando hacia el punto de recogida del cliente (lat_origen).
  pickingUpClient,
  /// Recogió al cliente, navegando al destino final (lat_destino).
  goingToDestination,
}

class MapScreen extends StatefulWidget {
  final int driverId;
  final String driverName;
  final Map<String, dynamic>? activeRoute;
  final VoidCallback? onTripCompleted;

  const MapScreen({
    super.key,
    required this.driverId,
    required this.driverName,
    this.activeRoute,
    this.onTripCompleted,
  });

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  // ── Mapa ────────────────────────────────────────────────
  final MapController _mapController = MapController();
  LatLng? _currentPosition;
  bool _isMapReady = false;
  bool _followMode = true;

  // ── Navegación ────────────────────────────────────────────────
  List<LatLng> _navRoutePoints = [];
  LatLng? _destination;
  String? _destName;
  double _navDistance = 0; // metros
  double _navDuration = 0; // segundos
  bool _isNavigating = false;
  bool _navLoading = false;
  int? _navRouteId;
  int? _navTripId;          // trip_id del DriverTrip activo

  // ── Fase del viaje ───────────────────────────────────────────
  TripPhase _phase = TripPhase.pickingUpClient;
  Map<String, dynamic>? _activeRouteData; // datos originales de la ruta

  // ── Recorrido real ─────────────────────────────────────
  List<LatLng> _trailPoints = [];

  // ── Timer ───────────────────────────────────────────────
  Timer? _tripTimer;
  Duration _tripDuration = Duration.zero;
  DateTime? _tripStartTime;

  // ── GPS ─────────────────────────────────────────────────
  StreamSubscription<Position>? _positionSubscription;
  double _currentSpeed = 0.0;

  // ── Services ────────────────────────────────────────────
  final TripService _tripService = TripService();

  // ────────────────────────────────────────────────────────
  // Init
  // ────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _initLocationAndStream();
  }

  @override
  void didUpdateWidget(MapScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Si se pasó una ruta activa nueva, iniciar navegación
    if (widget.activeRoute != null &&
        widget.activeRoute != oldWidget.activeRoute) {
      _waitAndStartNavigation(widget.activeRoute!);
    }
  }

  /// Espera a que el GPS esté disponible antes de iniciar la navegación.
  /// Reintenta hasta 10 veces con 300ms de espera entre intentos (~3s total).
  Future<void> _waitAndStartNavigation(Map<String, dynamic> route,
      {int attempts = 0}) async {
    if (!mounted) return;
    if (_currentPosition != null) {
      _startNavigationFromRoute(route);
    } else if (attempts < 10) {
      await Future.delayed(const Duration(milliseconds: 300));
      _waitAndStartNavigation(route, attempts: attempts + 1);
    } else {
      // Último intento: iniciar de todas formas (manejará null internamente)
      _startNavigationFromRoute(route);
    }
  }

  Future<void> _initLocationAndStream() async {
    final ok = await _handlePermission();
    if (!ok) return;

    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings:
            const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (!mounted) return;
      setState(() {
        _currentPosition = LatLng(pos.latitude, pos.longitude);
        _isMapReady = true;
      });
    } catch (e) {
      debugPrint('Error posición inicial: $e');
      if (mounted) setState(() => _isMapReady = true);
    }

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: AndroidSettings(
        accuracy: LocationAccuracy.high,
        intervalDuration: const Duration(milliseconds: 1500),
        distanceFilter: 0, // Sin filtro de distancia: actualiza por tiempo
      ),
    ).listen(_onPositionUpdate);

    // Si ya hay ruta activa al inicializar
    if (widget.activeRoute != null) {
      // Esperar a que el mapa esté listo
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) _startNavigationFromRoute(widget.activeRoute!);
      });
    }
  }

  Future<bool> _handlePermission() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      _showSnack('GPS desactivado. Por favor actívalo.');
      return false;
    }
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied) {
        _showSnack('Permisos de ubicación denegados.');
        return false;
      }
    }
    if (perm == LocationPermission.deniedForever) {
      _showSnack('Permisos denegados permanentemente.');
      return false;
    }
    return true;
  }

  // ────────────────────────────────────────────────────────
  // GPS
  // ────────────────────────────────────────────────────────
  void _onPositionUpdate(Position pos) {
    if (!mounted) return;
    final latLng = LatLng(pos.latitude, pos.longitude);
    setState(() {
      _currentPosition = latLng;
      _currentSpeed = pos.speed < 0 ? 0 : pos.speed * 3.6;
      if (_isNavigating) {
        _trailPoints.add(latLng);
        // Recalcular distancia al destino
        if (_destination != null) {
          final dist = const Distance();
          _navDistance = dist.as(LengthUnit.Meter, latLng, _destination!);
        }
      }
    });

    if (_isNavigating) {
      _tripService.sendLocation(
          widget.driverId, pos.latitude, pos.longitude, pos.speed);

      // ── Auto-llegada al punto de encuentro (Fase 1 < 30 m) ──
      if (_phase == TripPhase.pickingUpClient &&
          _navDistance < 30 &&
          !_navLoading) {
        _completePickup();
      }
    }

    if (_followMode) {
      try {
        _mapController.move(latLng, _mapController.camera.zoom);
      } catch (_) {}
    }
  }

  // ────────────────────────────────────────────────────────
  // Navegación
  // ────────────────────────────────────────────────────────
  // Navega hacia [dest] trazando ruta OSRM y actualizando estado.
  Future<void> _navigateTo(LatLng dest, String destLabel) async {
    if (_currentPosition == null) return;
    setState(() => _navLoading = true);

    final result = await _tripService.getNavigationRoute(_currentPosition!, dest);
    if (!mounted) return;

    if (result != null) {
      setState(() {
        _destination = dest;
        _destName = destLabel;
        _navRoutePoints = result['points'] as List<LatLng>;
        _navDistance = result['distance'] as double;
        _navDuration = result['duration'] as double;
        _isNavigating = true;
        _trailPoints = [_currentPosition!];
        _navLoading = false;
        _followMode = true;
      });
      try {
        _mapController.fitCamera(
          CameraFit.bounds(
            bounds: LatLngBounds.fromPoints([_currentPosition!, dest]),
            padding: const EdgeInsets.all(80),
          ),
        );
      } catch (_) {}
    } else {
      setState(() => _navLoading = false);
      _showSnack('No se pudo calcular la ruta de navegación');
    }
  }

  Future<void> _startNavigationFromRoute(Map<String, dynamic> route) async {
    final latOrigen = route['lat_origen'];
    final lonOrigen = route['lon_origen'];
    final latDest   = route['lat_destino'];
    final lonDest   = route['lon_destino'];

    // Necesitamos al menos el destino final
    if (latDest == null || lonDest == null || _currentPosition == null) return;

    _activeRouteData = route;
    _navRouteId = route['route_id'];
    _navTripId = route['trip_id'];
    // Iniciar timer
    _tripStartTime = DateTime.now();
    _tripTimer?.cancel();
    _tripTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_tripStartTime != null && mounted) {
        setState(() => _tripDuration = DateTime.now().difference(_tripStartTime!));
      }
    });

    // ─ FASE 1: Si hay punto de recogida, navegar allí primero ─
    if (latOrigen != null && lonOrigen != null) {
      setState(() => _phase = TripPhase.pickingUpClient);
      final pickupDest = LatLng(
        (latOrigen as num).toDouble(),
        (lonOrigen as num).toDouble(),
      );
      await _navigateTo(
        pickupDest,
        '📎 Punto de recogida: ${route['origen'] ?? 'Origen'}',
      );
    } else {
      // Sin lat_origen: saltar directo a fase 2
      setState(() => _phase = TripPhase.goingToDestination);
      final finalDest = LatLng(
        (latDest as num).toDouble(),
        (lonDest as num).toDouble(),
      );
      await _navigateTo(finalDest, route['destino'] ?? 'Destino');
    }
  }

  // ── Fase 1 → 2: conductor llegó al punto de recogida ─────────────
  Future<void> _completePickup() async {
    if (_activeRouteData == null) return;
    setState(() => _navLoading = true);

    // Notificar al backend (sub_estado = 'con_cliente')
    if (_navTripId != null) {
      await _tripService.arrivedAtPickup(_navTripId!);
    }

    final route = _activeRouteData!;
    final latDest = route['lat_destino'];
    final lonDest = route['lon_destino'];

    if (latDest == null || lonDest == null) {
      setState(() => _navLoading = false);
      _showSnack('El destino final no tiene coordenadas');
      return;
    }

    final finalDest = LatLng(
      (latDest as num).toDouble(),
      (lonDest as num).toDouble(),
    );

    setState(() {
      _phase = TripPhase.goingToDestination;
      _navRoutePoints = [];
    });

    await _navigateTo(finalDest, route['destino'] ?? 'Destino');
  }

  Future<void> _completeTrip() async {
    if (_navRouteId == null) return;
    setState(() => _navLoading = true);

    final ok = await _tripService.updateRouteStatus(_navRouteId!, 'Completado');
    if (ok) {
      _tripTimer?.cancel();
      _tripTimer = null;

      final savedDuration = _tripDuration;

      setState(() {
        _isNavigating = false;
        _destination = null;
        _destName = null;
        _navRoutePoints = [];
        _trailPoints = [];
        _navDistance = 0;
        _navDuration = 0;
        _navRouteId = null;
        _navTripId = null;
        _activeRouteData = null;
        _phase = TripPhase.pickingUpClient;
        _tripDuration = Duration.zero;
        _tripStartTime = null;
        _navLoading = false;
      });

      _showTripSummary(savedDuration);
      widget.onTripCompleted?.call();
    } else {
      setState(() => _navLoading = false);
      _showSnack('Error al completar el viaje');
    }
  }

  void _centerOnMe() {
    if (_currentPosition == null) return;
    setState(() => _followMode = true);
    _mapController.move(_currentPosition!, 16);
  }

  // ────────────────────────────────────────────────────────
  // UI Helpers
  // ────────────────────────────────────────────────────────
  void _showSnack(String msg, {bool success = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: success ? const Color(0xFF16A34A) : Colors.red.shade700,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
    ));
  }

  void _showTripSummary(Duration dur) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.check_circle_rounded,
                color: Color(0xFF16A34A), size: 28),
            SizedBox(width: 8),
            Expanded(
              child: Text('¡Viaje completado!',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            _summaryRow(Icons.timer_outlined, 'Duración', _fmtDuration(dur)),
            const SizedBox(height: 8),
            _summaryRow(Icons.location_on_outlined, 'Puntos GPS',
                '${_trailPoints.length}'),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E3A8A),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFF1E3A8A), size: 20),
        const SizedBox(width: 10),
        Text(label, style: const TextStyle(color: Colors.grey)),
        const Spacer(),
        Text(value,
            style: const TextStyle(
                fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
      ],
    );
  }

  String _fmtDuration(Duration d) {
    final h = d.inHours.toString().padLeft(2, '0');
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  String _fmtDistance(double m) {
    if (m >= 1000) {
      return '${(m / 1000).toStringAsFixed(1)} km';
    }
    return '${m.toStringAsFixed(0)} m';
  }

  String _fmtEta(double seconds) {
    final min = (seconds / 60).ceil();
    if (min >= 60) {
      final h = min ~/ 60;
      final m = min % 60;
      return '${h}h ${m}min';
    }
    return '~$min min';
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _tripTimer?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  // ────────────────────────────────────────────────────────
  // Build
  // ────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;

    return Stack(
      children: [
        // ── Mapa ────────────────────────────────────────
        if (!_isMapReady)
          const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(color: Color(0xFF1E3A8A)),
                SizedBox(height: 16),
                Text('Obteniendo ubicación GPS...',
                    style: TextStyle(color: Colors.grey)),
              ],
            ),
          )
        else
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter:
                  _currentPosition ?? const LatLng(10.4806, -66.9036),
              initialZoom: 15.5,
              onPositionChanged: (camera, hasGesture) {
                if (hasGesture && _followMode) {
                  setState(() => _followMode = false);
                }
              },
            ),
            children: [
              TileLayer(
                urlTemplate:
                    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.driver_tracking_app',
              ),
              // Ruta de navegación OSRM (azul claro, más gruesa)
              if (_navRoutePoints.length >= 2)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _navRoutePoints,
                      color: const Color(0xFF3B82F6),
                      strokeWidth: 6,
                    ),
                  ],
                ),
              // Recorrido real del conductor (azul oscuro)
              if (_trailPoints.length >= 2)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _trailPoints,
                      color: const Color(0xFF1E3A8A),
                      strokeWidth: 4,
                    ),
                  ],
                ),
              // Marcadores
              MarkerLayer(
                markers: [
                  // Posición actual
                  if (_currentPosition != null)
                    Marker(
                      point: _currentPosition!,
                      width: 52,
                      height: 52,
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E3A8A)
                              .withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.navigation_rounded,
                          color: Color(0xFF1E3A8A),
                          size: 34,
                        ),
                      ),
                    ),
                  // Destino
                  if (_destination != null)
                    Marker(
                      point: _destination!,
                      width: 56,
                      height: 56,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(
                              color: Color(0xFFDC2626),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.flag_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ],
          ),

        // ── Barra superior ───────────────────────────────
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: Container(
            padding: EdgeInsets.fromLTRB(16, topPad + 10, 16, 18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  const Color(0xFF1E3A8A).withValues(alpha: 0.92),
                  Colors.transparent,
                ],
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.directions_car_rounded,
                    color: Colors.white, size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _destName ?? 'En camino',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (_isNavigating)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF16A34A),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.circle,
                            color: Colors.white, size: 7),
                        const SizedBox(width: 5),
                        Text(
                          _fmtDuration(_tripDuration),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),

        // ── Botón centrar ────────────────────────────────
        Positioned(
          bottom: _isNavigating ? 310 : 220,
          right: 16,
          child: FloatingActionButton.small(
            heroTag: 'centerMe',
            onPressed: _centerOnMe,
            backgroundColor: Colors.white,
            foregroundColor: const Color(0xFF1E3A8A),
            elevation: 4,
            child: const Icon(Icons.my_location_rounded),
          ),
        ),

        // ── Loading overlay ──────────────────────────────
        if (_navLoading)
          Container(
            color: Colors.black38,
            child: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: Colors.white),
                  SizedBox(height: 16),
                  Text('Calculando ruta...',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),

        // ── Panel inferior ───────────────────────────────
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: _isNavigating
              ? _buildNavPanel()
              : _buildDefaultPanel(),
        ),
      ],
    );
  }

  // ── Panel por defecto (sin navegación) ─────────────────
  Widget _buildDefaultPanel() {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(20, 14, 20, bottomPad + 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Row(
            children: [
              _statChip(
                icon: Icons.speed_rounded,
                label: 'Velocidad',
                value: '${_currentSpeed.toStringAsFixed(0)} km/h',
                color: const Color(0xFFEA580C),
              ),
              const SizedBox(width: 10),
              _statChip(
                icon: Icons.my_location_rounded,
                label: 'Latitud',
                value: _currentPosition != null
                    ? _currentPosition!.latitude.toStringAsFixed(5)
                    : '--',
                color: const Color(0xFF0284C7),
              ),
              const SizedBox(width: 10),
              _statChip(
                icon: Icons.explore_rounded,
                label: 'Longitud',
                value: _currentPosition != null
                    ? _currentPosition!.longitude.toStringAsFixed(5)
                    : '--',
                color: const Color(0xFF7C3AED),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline_rounded,
                    color: Color(0xFF1E3A8A), size: 18),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Acepta un viaje desde la pestaña Viajes para navegar.',
                    style:
                        TextStyle(fontSize: 13, color: Color(0xFF1E3A8A)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Panel de navegación activa ─────────────────────────
  Widget _buildNavPanel() {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    final isPickup = _phase == TripPhase.pickingUpClient;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(20, 14, 20, bottomPad + 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 14),
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // ─ Indicador de fase ─
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isPickup
                  ? const Color(0xFFFEF3C7)
                  : const Color(0xFFDCFCE7),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isPickup ? Icons.person_pin_circle_rounded : Icons.flag_rounded,
                  size: 16,
                  color: isPickup ? const Color(0xFFD97706) : const Color(0xFF16A34A),
                ),
                const SizedBox(width: 6),
                Text(
                  isPickup ? 'Fase 1 — Recogida del cliente' : 'Fase 2 — Hacia el destino',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isPickup ? const Color(0xFFD97706) : const Color(0xFF16A34A),
                  ),
                ),
              ],
            ),
          ),

          // Destino actual
          Row(
            children: [
              Icon(
                isPickup ? Icons.person_pin_circle_rounded : Icons.flag_rounded,
                color: isPickup ? const Color(0xFFF59E0B) : const Color(0xFFDC2626),
                size: 22,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _destName ?? 'Destino',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Stats
          Row(
            children: [
              _statChip(
                icon: Icons.straighten_rounded,
                label: 'Distancia',
                value: _fmtDistance(_navDistance),
                color: const Color(0xFF0284C7),
              ),
              const SizedBox(width: 10),
              _statChip(
                icon: Icons.access_time_rounded,
                label: 'Estimado',
                value: _fmtEta(_navDuration),
                color: const Color(0xFF7C3AED),
              ),
              const SizedBox(width: 10),
              _statChip(
                icon: Icons.speed_rounded,
                label: 'Velocidad',
                value: '${_currentSpeed.toStringAsFixed(0)} km/h',
                color: const Color(0xFFEA580C),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Botón de acción según la fase
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton.icon(
              onPressed: _navLoading
                  ? null
                  : (isPickup ? _completePickup : _completeTrip),
              icon: Icon(
                isPickup
                    ? Icons.person_pin_circle_rounded
                    : Icons.flag_rounded,
                size: 20,
              ),
              label: Text(
                isPickup ? 'En el punto de encuentro' : 'Terminar Viaje',
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: isPickup
                    ? const Color(0xFFD97706)   // ámbar para recogida
                    : const Color(0xFFDC2626),  // rojo para finalizar
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statChip({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 3),
            Text(
              value,
              style: TextStyle(
                  fontSize: 12, fontWeight: FontWeight.bold, color: color),
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 10, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

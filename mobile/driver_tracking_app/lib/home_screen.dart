import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

import 'map_screen.dart';
import 'notification_service.dart';
import 'trip_service.dart';

class HomeScreen extends StatefulWidget {
  final int driverId;
  final String driverName;

  const HomeScreen({
    super.key,
    required this.driverId,
    required this.driverName,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // ── Navegación ──────────────────────────────────────────
  int _selectedIndex = 0;

  // ── Tracking (pestaña Inicio) ───────────────────────────
  bool isTracking = false;
  String status = 'Inactivo';
  String latitude = '--';
  String longitude = '--';
  String lastUpdate = '--';
  StreamSubscription<Position>? _positionSubscription;

  // ── Viajes (pestaña Viajes) ─────────────────────────────
  final TripService _tripService = TripService();
  List<Map<String, dynamic>> _routes = [];
  bool _loadingRoutes = true;
  Timer? _pollTimer;
  // IDs de viajes ya notificados para no duplicar
  final Set<int> _notifiedRouteIds = {};

  // ── Historial (pestaña Historial) ───────────────────────
  List<Map<String, dynamic>> _history = [];
  bool _loadingHistory = true;
  bool _showAllHistory = false; // false = solo esta semana

  // ── Viaje activo para navegación ──────────────────────
  Map<String, dynamic>? _activeNavRoute;

  static const String baseUrl = 'http://10.0.2.2:8000';

  @override
  void initState() {
    super.initState();
    _loadRoutes();
    _loadHistory();
    // Iniciar tracking + pedir permiso de notificaciones después del primer frame
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // Inicializar notificaciones y pedir permiso en runtime
      await NotificationService.instance.init();
      // Luego arrancar el GPS
      await _autoStartTracking();
    });
    // Polling cada 30 segundos
    _pollTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) {
        _loadRoutes();
        _loadHistory();
      },
    );
  }

  /// Inicia el tracking automáticamente; si el GPS está apagado muestra banner.
  Future<void> _autoStartTracking() async {
    final hasPermission = await _handlePermission();
    if (hasPermission) {
      await startTracking();
    }
    // Si no tiene permiso, _handlePermission ya actualizó el estado con el mensaje.
  }

  // ────────────────────────────────────────────────────────
  // Cargar viajes y detectar nuevos para notificar
  // ────────────────────────────────────────────────────────
  Future<void> _loadRoutes() async {
    final routes = await _tripService.getDriverRoutes(widget.driverId);
    if (!mounted) return;

    // Detectar rutas nuevas en Pendiente para notificar
    for (final r in routes) {
      final id = r['route_id'] as int? ?? 0;
      final estado = r['estado'] ?? '';
      if (estado == 'Pendiente' && !_notifiedRouteIds.contains(id)) {
        _notifiedRouteIds.add(id);
        NotificationService.instance.showNewTripNotification(
          origen: r['origen'] ?? 'Desconocido',
          destino: r['destino'] ?? 'Desconocido',
          id: id,
        );
      }
    }

    setState(() {
      _routes = routes;
      _loadingRoutes = false;
    });
  }

  // ────────────────────────────────────────────────────────
  // Cargar historial de viajes completados
  // ────────────────────────────────────────────────────────
  Future<void> _loadHistory() async {
    try {
      final resp = await http.get(
        Uri.parse('$baseUrl/route/driver/${widget.driverId}/history'),
      );
      if (!mounted) return;
      if (resp.statusCode == 200) {
        final data = List<Map<String, dynamic>>.from(jsonDecode(resp.body));
        setState(() {
          _history = data;
          _loadingHistory = false;
        });
      } else {
        setState(() => _loadingHistory = false);
      }
    } catch (e) {
      debugPrint('Error cargando historial: $e');
      if (mounted) setState(() => _loadingHistory = false);
    }
  }

  Future<void> _updateStatus(int routeId, String estado) async {
    final ok = await _tripService.updateRouteStatus(routeId, estado);
    if (ok) {
      _showSnack(_statusMsg(estado), success: true);
      await _loadRoutes();
    } else {
      _showSnack('Error al actualizar estado');
    }
  }

  String _statusMsg(String estado) {
    switch (estado) {
      case 'Aceptado':
        return '✅ Viaje aceptado';
      case 'En camino':
        return '🚗 En camino al destino';
      case 'Completado':
        return '🏁 Viaje completado';
      default:
        return 'Estado actualizado';
    }
  }

  void _startNavigation(Map<String, dynamic> route) {
    setState(() {
      _activeNavRoute = route;
      _selectedIndex = 2; // Ir a pestaña Mapa
    });
  }

  // ────────────────────────────────────────────────────────
  // GPS (pestaña Inicio)
  // ────────────────────────────────────────────────────────
  Future<bool> _handlePermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() => status = 'GPS desactivado');
      _showGpsDisabledDialog();
      return false;
    }
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        setState(() => status = 'Permiso denegado');
        return false;
      }
    }
    if (permission == LocationPermission.deniedForever) {
      setState(() => status = 'Permiso denegado permanentemente');
      _showPermissionDeniedDialog();
      return false;
    }
    return true;
  }

  void _showGpsDisabledDialog() {
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Row(
          children: [
            Icon(Icons.location_off_rounded, color: Color(0xFFDC2626)),
            SizedBox(width: 10),
            Text('GPS desactivado'),
          ],
        ),
        content: const Text(
          'El tracking requiere que el GPS esté encendido. '
          'Por favor actívalo en la configuración del dispositivo.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E3A8A),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(context);
              await Geolocator.openLocationSettings();
              // Reintentar tras volver de configuración
              await Future.delayed(const Duration(seconds: 2));
              await _autoStartTracking();
            },
            child: const Text('Abrir ajustes'),
          ),
        ],
      ),
    );
  }

  void _showPermissionDeniedDialog() {
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Row(
          children: [
            Icon(Icons.location_disabled_rounded, color: Color(0xFFDC2626)),
            SizedBox(width: 10),
            Text('Permiso requerido'),
          ],
        ),
        content: const Text(
          'El permiso de ubicación fue denegado permanentemente. '
          'Ve a los ajustes de la app para habilitarlo.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E3A8A),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(context);
              await Geolocator.openAppSettings();
              await Future.delayed(const Duration(seconds: 2));
              await _autoStartTracking();
            },
            child: const Text('Abrir ajustes'),
          ),
        ],
      ),
    );
  }

  Future<void> enviarUbicacion(Position position) async {
    try {
      await http.post(
        Uri.parse('$baseUrl/locations/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'driver_id': widget.driverId,
          'latitud': position.latitude,
          'longitud': position.longitude,
          'velocidad': position.speed < 0 ? 0.0 : position.speed,
        }),
      );
    } catch (e) {
      debugPrint('Error enviando ubicación: $e');
    }
  }

  Future<void> _actualizarEstadoConductor(String estado) async {
    try {
      await http.patch(
        Uri.parse('$baseUrl/drivers/${widget.driverId}/estado'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'estado': estado}),
      );
      debugPrint('Estado conductor actualizado: $estado');
    } catch (e) {
      debugPrint('Error actualizando estado conductor: $e');
    }
  }

  Future<void> startTracking() async {
    // Si ya hay un stream activo, no duplicar
    if (_positionSubscription != null) return;
    setState(() => status = 'Iniciando GPS...');
    // Marcar conductor como Activo en el backend
    _actualizarEstadoConductor('Activo');
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 0,
      ),
    ).listen(
      (Position position) {
        // 1. Actualizar UI inmediatamente, sin esperar la red
        if (!mounted) return;
        setState(() {
          isTracking = true;
          status = 'Tracking activo';
          latitude = position.latitude.toStringAsFixed(6);
          longitude = position.longitude.toStringAsFixed(6);
          lastUpdate = _formatDateTime(DateTime.now());
        });
        // 2. Enviar al servidor en paralelo (fire-and-forget)
        enviarUbicacion(position);
      },
      onError: (e) {
        debugPrint('GPS stream error: $e');
        if (!mounted) return;
        setState(() {
          isTracking = false;
          status = 'Error de GPS';
        });
        _positionSubscription = null;
      },
    );
  }

  Future<void> stopTracking() async {
    await _positionSubscription?.cancel();
    _positionSubscription = null;
    // Marcar conductor como Inactivo en el backend
    _actualizarEstadoConductor('Inactivo');
    setState(() {
      isTracking = false;
      status = 'Tracking detenido';
    });
  }

  String _formatDateTime(DateTime dt) {
    final d = dt.day.toString().padLeft(2, '0');
    final mo = dt.month.toString().padLeft(2, '0');
    final y = dt.year.toString();
    final h = dt.hour.toString().padLeft(2, '0');
    final mi = dt.minute.toString().padLeft(2, '0');
    final s = dt.second.toString().padLeft(2, '0');
    return '$d/$mo/$y $h:$mi:$s';
  }

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

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _pollTimer?.cancel();
    super.dispose();
  }

  // ────────────────────────────────────────────────────────
  // Build
  // ────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    // Títulos del AppBar según pestaña
    final appBarTitles = [
      'Conductor: ${widget.driverName}',
      'Viajes Asignados',
      '', // Mapa no usa AppBar
      'Historial de Viajes',
    ];

    return Scaffold(
      appBar: _selectedIndex != 2
          ? AppBar(
              elevation: 0,
              backgroundColor: const Color(0xFF1E3A8A),
              foregroundColor: Colors.white,
              title: Text(
                appBarTitles[_selectedIndex],
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              centerTitle: true,
              actions: _selectedIndex == 1
                  ? [
                      IconButton(
                        onPressed: () {
                          setState(() => _loadingRoutes = true);
                          _loadRoutes();
                        },
                        icon: const Icon(Icons.refresh_rounded),
                      ),
                    ]
                  : _selectedIndex == 3
                      ? [
                          IconButton(
                            onPressed: () {
                              setState(() {
                                _showAllHistory = !_showAllHistory;
                              });
                            },
                            icon: Icon(
                              _showAllHistory
                                  ? Icons.calendar_view_week_rounded
                                  : Icons.history_rounded,
                            ),
                            tooltip: _showAllHistory
                                ? 'Ver esta semana'
                                : 'Ver todo el historial',
                          ),
                        ]
                      : null,
            )
          : null,
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          _buildStatusBody(),
          _buildTripsBody(),
          MapScreen(
            driverId: widget.driverId,
            driverName: widget.driverName,
            activeRoute: _activeNavRoute,
            onTripCompleted: () {
              setState(() => _activeNavRoute = null);
              _loadRoutes();
              _loadHistory();
            },
          ),
          _buildHistoryBody(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) => setState(() => _selectedIndex = i),
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFF1E3A8A).withValues(alpha: 0.12),
        surfaceTintColor: Colors.white,
        elevation: 8,
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon:
                Icon(Icons.dashboard_rounded, color: Color(0xFF1E3A8A)),
            label: 'Inicio',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: _routes.any((r) => r['estado'] == 'Pendiente'),
              backgroundColor: const Color(0xFFDC2626),
              child: const Icon(Icons.assignment_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: _routes.any((r) => r['estado'] == 'Pendiente'),
              backgroundColor: const Color(0xFFDC2626),
              child:
                  const Icon(Icons.assignment_rounded, color: Color(0xFF1E3A8A)),
            ),
            label: 'Viajes',
          ),
          const NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon:
                Icon(Icons.map_rounded, color: Color(0xFF1E3A8A)),
            label: 'Mapa',
          ),
          const NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon:
                Icon(Icons.history_rounded, color: Color(0xFF1E3A8A)),
            label: 'Historial',
          ),
        ],
      ),
    );
  }

  // ────────────────────────────────────────────────────────
  // Pestaña 1: Inicio
  // ────────────────────────────────────────────────────────
  Widget _buildStatusBody() {
    final statusColor =
        isTracking ? const Color(0xFF16A34A) : Colors.redAccent;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Estado del conductor',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: statusColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(status,
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: statusColor)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Ubicación actual',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                _infoRow('Latitud', latitude),
                const SizedBox(height: 10),
                _infoRow('Longitud', longitude),
                const SizedBox(height: 10),
                _infoRow('Última actualización', lastUpdate),
              ],
            ),
          ),
          const SizedBox(height: 24),
          // Banner de advertencia si el GPS no está activo
          if (!isTracking) ...[  
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFD97706)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      color: Color(0xFFD97706), size: 20),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'El tracking no está activo. Activa el GPS.',
                      style: TextStyle(
                          fontSize: 13, color: Color(0xFF92400E)),
                    ),
                  ),
                  TextButton(
                    onPressed: _autoStartTracking,
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFFD97706),
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(60, 30),
                    ),
                    child: const Text('Reintentar',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: isTracking ? null : _autoStartTracking,
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('Activar GPS'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E3A8A),
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade300,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: isTracking ? stopTracking : null,
                  icon: const Icon(Icons.stop_circle_outlined),
                  label: const Text('Detener'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF1E3A8A),
                    side: const BorderSide(color: Color(0xFF1E3A8A)),
                    disabledForegroundColor: Colors.grey,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          // ── Botón de prueba de notificación ──────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: Colors.purple.shade200,
                style: BorderStyle.solid,
              ),
              color: Colors.purple.shade50,
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Icon(Icons.science_rounded,
                        color: Colors.purple.shade400, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Prueba de notificación',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Colors.purple.shade700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      await NotificationService.instance.showNewTripNotification(
                        origen: 'Aeropuerto Internacional',
                        destino: 'Hotel Marriott Centro',
                        id: 9999,
                      );
                      if (mounted) {
                        _showSnack('✅ Notificación enviada', success: true);
                      }
                    },
                    icon: const Icon(Icons.notifications_active_rounded,
                        size: 18),
                    label: const Text('Probar notificación'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.purple.shade600,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          // Viaje activo banner
          if (_activeNavRoute != null)
            GestureDetector(
              onTap: () => setState(() => _selectedIndex = 2),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFD97706)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.navigation_rounded,
                        color: Color(0xFFD97706), size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Navegando a: ${_activeNavRoute!['destino']}',
                        style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF92400E),
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded,
                        color: Color(0xFFD97706)),
                  ],
                ),
              ),
            ),
          if (_activeNavRoute == null)
            GestureDetector(
              onTap: () => setState(() => _selectedIndex = 1),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: const Color(0xFF1E3A8A).withValues(alpha: 0.25)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.assignment_rounded,
                        color: Color(0xFF1E3A8A), size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Ver viajes asignados',
                        style:
                            TextStyle(fontSize: 14, color: Color(0xFF1E3A8A)),
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded, color: Color(0xFF1E3A8A)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ────────────────────────────────────────────────────────
  // Pestaña 2: Viajes
  // ────────────────────────────────────────────────────────
  Widget _buildTripsBody() {
    if (_loadingRoutes) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: Color(0xFF1E3A8A)),
            SizedBox(height: 14),
            Text('Cargando viajes...', style: TextStyle(color: Colors.grey)),
          ],
        ),
      );
    }

    if (_routes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.route_outlined, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 14),
            const Text('No tienes viajes asignados',
                style: TextStyle(fontSize: 16, color: Colors.grey)),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: () {
                setState(() => _loadingRoutes = true);
                _loadRoutes();
              },
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Actualizar'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadRoutes,
      color: const Color(0xFF1E3A8A),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _routes.length,
        itemBuilder: (_, i) => _buildTripCard(_routes[i]),
      ),
    );
  }

  Widget _buildTripCard(Map<String, dynamic> route) {
    final estado = route['estado'] ?? 'Pendiente';
    final routeId = route['route_id'];
    final origen = route['origen'] ?? '--';
    final destino = route['destino'] ?? '--';
    final fecha = route['fecha'] ?? '';
    final hasCoords = route['lat_destino'] != null && route['lon_destino'] != null;

    Color badgeColor;
    IconData badgeIcon;
    switch (estado) {
      case 'Aceptado':
        badgeColor = const Color(0xFF0284C7);
        badgeIcon = Icons.check_circle_outline;
        break;
      case 'En camino':
        badgeColor = const Color(0xFFD97706);
        badgeIcon = Icons.directions_car_rounded;
        break;
      case 'Completado':
        badgeColor = const Color(0xFF16A34A);
        badgeIcon = Icons.check_circle_rounded;
        break;
      default: // Pendiente
        badgeColor = const Color(0xFFEA580C);
        badgeIcon = Icons.schedule_rounded;
    }

    String fechaStr = '';
    if (fecha is String && fecha.isNotEmpty) {
      try {
        final dt = DateTime.parse(fecha);
        fechaStr = _formatDateTime(dt);
      } catch (_) {
        fechaStr = fecha;
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header con badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: badgeColor.withValues(alpha: 0.08),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(18)),
            ),
            child: Row(
              children: [
                Icon(badgeIcon, color: badgeColor, size: 18),
                const SizedBox(width: 6),
                Text(
                  estado.toUpperCase(),
                  style: TextStyle(
                    color: badgeColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    letterSpacing: 0.5,
                  ),
                ),
                const Spacer(),
                if (fechaStr.isNotEmpty)
                  Text(
                    fechaStr,
                    style:
                        const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
              ],
            ),
          ),
          // Body
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
            child: Column(
              children: [
                Row(
                  children: [
                    Column(
                      children: [
                        const Icon(Icons.circle,
                            color: Color(0xFF16A34A), size: 10),
                        Container(
                            width: 2,
                            height: 24,
                            color: Colors.grey.shade300),
                        const Icon(Icons.location_on_rounded,
                            color: Color(0xFFDC2626), size: 16),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(origen,
                              style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600)),
                          const SizedBox(height: 14),
                          Text(destino,
                              style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Botones según estado
                if (estado == 'Pendiente')
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _updateStatus(routeId, 'Aceptado'),
                      icon: const Icon(Icons.check_rounded, size: 18),
                      label: const Text('Aceptar Viaje'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E3A8A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                if (estado == 'Aceptado')
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: hasCoords
                          ? () async {
                              await _updateStatus(routeId, 'En camino');
                              _startNavigation(route);
                            }
                          : () async {
                              await _updateStatus(routeId, 'En camino');
                              _showSnack(
                                  'Viaje iniciado (sin coordenadas de destino)');
                            },
                      icon: const Icon(Icons.navigation_rounded, size: 18),
                      label: Text(hasCoords
                          ? 'Iniciar Viaje  🗺️'
                          : 'Iniciar Viaje'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF16A34A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                if (estado == 'En camino')
                  Row(
                    children: [
                      if (hasCoords)
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _startNavigation(route),
                            icon: const Icon(Icons.map_rounded, size: 18),
                            label: const Text('Ver mapa'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF1E3A8A),
                              side: const BorderSide(
                                  color: Color(0xFF1E3A8A)),
                              padding:
                                  const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      if (hasCoords) const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () =>
                              _updateStatus(routeId, 'Completado'),
                          icon:
                              const Icon(Icons.flag_rounded, size: 18),
                          label: const Text('Completar'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFDC2626),
                            foregroundColor: Colors.white,
                            padding:
                                const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Widgets auxiliares ──────────────────────────────────
  Widget _card({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color.fromRGBO(0, 0, 0, 0.08),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _infoRow(String title, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 4,
          child: Text(title,
              style: const TextStyle(
                  fontSize: 15,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w500)),
        ),
        Expanded(
          flex: 5,
          child: Text(value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                  fontSize: 15,
                  color: Color(0xFF0F172A),
                  fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }

  // ────────────────────────────────────────────────────────
  // Pestaña 4: Historial de viajes completados
  // ────────────────────────────────────────────────────────
  Widget _buildHistoryBody() {
    if (_loadingHistory) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: Color(0xFF1E3A8A)),
            SizedBox(height: 14),
            Text('Cargando historial...', style: TextStyle(color: Colors.grey)),
          ],
        ),
      );
    }

    // Filtrar según el modo: semana actual o todo
    final now = DateTime.now();
    final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
    final weekStart = DateTime(startOfWeek.year, startOfWeek.month, startOfWeek.day);

    List<Map<String, dynamic>> displayed = _history;
    if (!_showAllHistory) {
      displayed = _history.where((r) {
        try {
          final fecha = DateTime.parse(r['fecha'].toString());
          return fecha.isAfter(weekStart.subtract(const Duration(seconds: 1)));
        } catch (_) {
          return false;
        }
      }).toList();
    }

    if (_history.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history_rounded, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            const Text(
              'Aún no tienes viajes completados',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    if (displayed.isEmpty && !_showAllHistory) {
      // Hay historial pero ninguno esta semana
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.calendar_today_rounded,
                size: 56, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            const Text(
              'Sin viajes esta semana',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: () => setState(() => _showAllHistory = true),
              icon: const Icon(Icons.history_rounded),
              label: Text('Ver todo el historial (${_history.length})'),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Banner indicando el modo actual
        Container(
          width: double.infinity,
          color: const Color(0xFF1E3A8A).withValues(alpha: 0.06),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              Icon(
                _showAllHistory
                    ? Icons.history_rounded
                    : Icons.calendar_view_week_rounded,
                size: 16,
                color: const Color(0xFF1E3A8A),
              ),
              const SizedBox(width: 8),
              Text(
                _showAllHistory
                    ? 'Mostrando todos los viajes (${_history.length})'
                    : 'Esta semana · ${displayed.length} viaje${displayed.length == 1 ? '' : 's'}',
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF1E3A8A),
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => setState(() => _showAllHistory = !_showAllHistory),
                child: Text(
                  _showAllHistory ? 'Ver semana' : 'Ver todo',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF1E3A8A),
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadHistory,
            color: const Color(0xFF1E3A8A),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: displayed.length,
              itemBuilder: (_, i) => _buildHistoryCard(displayed[i]),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHistoryCard(Map<String, dynamic> route) {
    final origen = route['origen'] ?? '--';
    final destino = route['destino'] ?? '--';
    String fechaStr = '--';
    try {
      final fecha = DateTime.parse(route['fecha'].toString());
      fechaStr = _formatDateTime(fecha);
    } catch (_) {}

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Línea de ruta
            Column(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: Color(0xFF16A34A),
                    shape: BoxShape.circle,
                  ),
                ),
                Container(
                    width: 2, height: 28, color: Colors.grey.shade300),
                const Icon(Icons.location_on_rounded,
                    color: Color(0xFFDC2626), size: 14),
              ],
            ),
            const SizedBox(width: 12),
            // Origen / Destino / Fecha
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(origen,
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  Text(destino,
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded,
                          size: 12, color: Color(0xFF64748B)),
                      const SizedBox(width: 4),
                      Text(fechaStr,
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF64748B))),
                    ],
                  ),
                ],
              ),
            ),
            // Badge completado
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF16A34A).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                '✓ Completado',
                style: TextStyle(
                  fontSize: 11,
                  color: Color(0xFF16A34A),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

import 'map_screen.dart';
import 'notification_service.dart';
import 'trip_service.dart';
import 'auth_service.dart';
import 'login_screen.dart';

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

  static const String baseUrl = 'http://10.0.2.2:5000';

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
  // Diálogo de detalle de viaje (antes de aceptar)
  // ────────────────────────────────────────────────────────
  void _showTripDetailDialog(Map<String, dynamic> route, {bool acceptMode = true}) {
    final routeId = route['route_id'];
    final origen  = route['origen']  ?? 'Sin especificar';
    final destino = route['destino'] ?? 'Sin especificar';
    final hasCoords = route['lat_destino'] != null && route['lon_destino'] != null;
    final descripcion = (route['descripcion'] ?? '').toString().trim();
    final notas = (route['notas_operador'] ?? '').toString().trim();

    String fechaStr = '';
    final fecha = route['fecha'] ?? '';
    if (fecha is String && fecha.isNotEmpty) {
      try {
        fechaStr = _formatDateTime(DateTime.parse(fecha));
      } catch (_) {
        fechaStr = fecha;
      }
    }

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF1E3A8A).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.assignment_rounded,
                  color: Color(0xFF1E3A8A), size: 22),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text('Detalles del Viaje',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              _detailRow(Icons.tag_rounded, 'ID de Ruta', '#$routeId', const Color(0xFF64748B)),
              const Divider(height: 16),
              _detailRow(Icons.circle, 'Origen', origen, const Color(0xFF16A34A)),
              const SizedBox(height: 8),
              _detailRow(Icons.location_on_rounded, 'Destino', destino, const Color(0xFFDC2626)),
              const Divider(height: 16),
              if (fechaStr.isNotEmpty)
                _detailRow(Icons.access_time_rounded, 'Asignado', fechaStr, const Color(0xFF7C3AED)),
              // Descripción del viaje
              if (descripcion.isNotEmpty) ...[  
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF1E3A8A).withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.description_rounded, color: Color(0xFF1E3A8A), size: 14),
                          SizedBox(width: 6),
                          Text('Descripción del viaje',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(descripcion,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A))),
                    ],
                  ),
                ),
              ],
              // Notas del operador
              if (notas.isNotEmpty) ...[  
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFD97706).withValues(alpha: 0.4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.sticky_note_2_rounded, color: Color(0xFFD97706), size: 14),
                          SizedBox(width: 6),
                          Text('Notas del operador',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(notas,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF92400E))),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: hasCoords ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Icon(
                      hasCoords ? Icons.map_rounded : Icons.map_outlined,
                      color: hasCoords ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        hasCoords ? 'Navegación GPS disponible 🗺️' : 'Sin coordenadas (solo texto)',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: hasCoords ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(acceptMode ? 'Cancelar' : 'Cerrar',
                style: const TextStyle(color: Colors.grey)),
          ),
          if (acceptMode)
            ElevatedButton.icon(
              onPressed: () async {
                Navigator.pop(context);
                await _updateStatus(routeId, 'Aceptado');
              },
              icon: const Icon(Icons.check_rounded, size: 18),
              label: const Text('Aceptar Viaje'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E3A8A),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 8),
        Text('$label: ', style: const TextStyle(fontSize: 13, color: Colors.grey)),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
                fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
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

  Future<void> _logout(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: Color(0xFFDC2626)),
            SizedBox(width: 10),
            Text('Cerrar sesión'),
          ],
        ),
        content: const Text(
          '¿Estás seguro que deseas cerrar sesión? Si el tracking está activo, se detendrá.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Salir'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      if (isTracking) {
        await stopTracking();
      }
      final auth = AuthService();
      await auth.logout();
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
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
                      : _selectedIndex == 0
                          ? [
                              IconButton(
                                onPressed: () => _logout(context),
                                icon: const Icon(Icons.logout_rounded),
                                tooltip: 'Cerrar sesión',
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
  // Pestaña 1: Inicio — Diseño premium celeste
  // ────────────────────────────────────────────────────────
  Widget _buildStatusBody() {
    final bool active = isTracking;

    return SingleChildScrollView(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          // ── Hero card con gradiente celeste ──────────────
          Container(
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF0EA5E9), Color(0xFF0369A1)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(32),
                bottomRight: Radius.circular(32),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        active
                            ? Icons.gps_fixed_rounded
                            : Icons.gps_off_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Estado de tracking',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: active
                                    ? const Color(0xFF86EFAC)
                                    : const Color(0xFFFCA5A5),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: active
                                        ? const Color(0xFF86EFAC).withValues(alpha: 0.6)
                                        : const Color(0xFFFCA5A5).withValues(alpha: 0.6),
                                    blurRadius: 6,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 7),
                            Text(
                              status,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                // Chips de coordenadas
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.13),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      _gpsChip(Icons.arrow_upward_rounded, 'Latitud', latitude),
                      const SizedBox(height: 10),
                      _gpsChip(Icons.arrow_forward_rounded, 'Longitud', longitude),
                      const SizedBox(height: 10),
                      _gpsChip(Icons.update_rounded, 'Última actualización', lastUpdate),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                // Botones de control
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: active ? null : _autoStartTracking,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: active
                                ? Colors.white.withValues(alpha: 0.12)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: active
                                ? []
                                : [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.15),
                                      blurRadius: 8,
                                      offset: const Offset(0, 3),
                                    ),
                                  ],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.play_circle_rounded,
                                color: active
                                    ? Colors.white38
                                    : const Color(0xFF0369A1),
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Activar GPS',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: active
                                      ? Colors.white38
                                      : const Color(0xFF0369A1),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GestureDetector(
                        onTap: active ? stopTracking : null,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: active
                                ? Colors.white.withValues(alpha: 0.22)
                                : Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: active
                                  ? Colors.white54
                                  : Colors.white24,
                              width: 1.5,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.stop_circle_outlined,
                                color: active ? Colors.white : Colors.white38,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Detener',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: active ? Colors.white : Colors.white38,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            child: Column(
              children: [
                // Banner advertencia GPS inactivo
                if (!active) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7ED),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFDBA74)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded,
                            color: Color(0xFFF97316), size: 20),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text(
                            'El tracking no está activo. Activa el GPS para comenzar.',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF9A3412),
                            ),
                          ),
                        ),
                        TextButton(
                          onPressed: _autoStartTracking,
                          style: TextButton.styleFrom(
                            foregroundColor: const Color(0xFFF97316),
                            padding: EdgeInsets.zero,
                            minimumSize: const Size(70, 32),
                          ),
                          child: const Text('Reintentar',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // Banner viaje activo
                if (_activeNavRoute != null)
                  GestureDetector(
                    onTap: () => setState(() => _selectedIndex = 2),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFFEF9C3), Color(0xFFFEF3C7)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFFCD34D)),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFFCD34D).withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.navigation_rounded,
                                color: Color(0xFFD97706), size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Viaje en curso',
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFFB45309),
                                        fontWeight: FontWeight.w600)),
                                const SizedBox(height: 2),
                                Text(
                                  'Navegando a: ${_activeNavRoute!['destino']}',
                                  style: const TextStyle(
                                      fontSize: 13,
                                      color: Color(0xFF92400E),
                                      fontWeight: FontWeight.bold),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded,
                              color: Color(0xFFD97706)),
                        ],
                      ),
                    ),
                  ),

                // Banner ir a viajes
                if (_activeNavRoute == null) ...[
                  GestureDetector(
                    onTap: () => setState(() => _selectedIndex = 1),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFE0F2FE), Color(0xFFBAE6FD)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF38BDF8).withValues(alpha: 0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0EA5E9).withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.assignment_rounded,
                                color: Color(0xFF0369A1), size: 20),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Mis viajes',
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF0369A1),
                                        fontWeight: FontWeight.w600)),
                                SizedBox(height: 2),
                                Text(
                                  'Ver viajes asignados',
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: Color(0xFF075985),
                                      fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded,
                              color: Color(0xFF0369A1)),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _gpsChip(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: Colors.white60, size: 14),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: const TextStyle(color: Colors.white60, fontSize: 12),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
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
                      onPressed: () => _showTripDetailDialog(route),
                      icon: const Icon(Icons.info_outline_rounded, size: 18),
                      label: const Text('Ver Detalles y Aceptar'),
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
                  Row(
                    children: [
                      // Botón de info para ver detalles
                      OutlinedButton(
                        onPressed: () => _showTripDetailDialog(route, acceptMode: false),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF1E3A8A),
                          side: const BorderSide(color: Color(0xFF1E3A8A)),
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Icon(Icons.info_outline_rounded, size: 20),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: hasCoords
                              ? () async {
                                  await _updateStatus(routeId, 'En camino');
                                  _startNavigation(route);
                                }
                              : () async {
                                  await _updateStatus(routeId, 'En camino');
                                  _showSnack('Viaje iniciado (sin coordenadas de destino)');
                                },
                          icon: const Icon(Icons.navigation_rounded, size: 18),
                          label: Text(hasCoords ? 'Iniciar Viaje  🗺️' : 'Iniciar Viaje'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF16A34A),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
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

  void _showHistoryDetailDialog(Map<String, dynamic> route) {
    final origen = route['origen'] ?? '--';
    final destino = route['destino'] ?? '--';
    final descripcion = (route['descripcion'] ?? '').toString().trim();
    final notas = (route['notas_operador'] ?? '').toString().trim();
    String fechaStr = '--';
    try {
      final fecha = DateTime.parse(route['fecha'].toString());
      fechaStr = _formatDateTime(fecha);
    } catch (_) {}

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
        title: const Row(
          children: [
            Icon(Icons.history_rounded, color: Color(0xFF16A34A), size: 24),
            SizedBox(width: 10),
            Expanded(
              child: Text('Detalle del Viaje',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              _detailRow(Icons.circle, 'Origen', origen, const Color(0xFF16A34A)),
              const SizedBox(height: 8),
              _detailRow(Icons.location_on_rounded, 'Destino', destino, const Color(0xFFDC2626)),
              const Divider(height: 16),
              _detailRow(Icons.access_time_rounded, 'Fecha', fechaStr, const Color(0xFF7C3AED)),
              if (descripcion.isNotEmpty) ...[  
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF1E3A8A).withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.description_rounded, color: Color(0xFF1E3A8A), size: 14),
                          SizedBox(width: 6),
                          Text('Descripción',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(descripcion, style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A))),
                    ],
                  ),
                ),
              ],
              if (notas.isNotEmpty) ...[  
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFD97706).withValues(alpha: 0.4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.sticky_note_2_rounded, color: Color(0xFFD97706), size: 14),
                          SizedBox(width: 6),
                          Text('Notas del operador',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(notas, style: const TextStyle(fontSize: 13, color: Color(0xFF92400E))),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 8),
            ],
          ),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF16A34A),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryCard(Map<String, dynamic> route) {
    final origen = route['origen'] ?? '--';
    final destino = route['destino'] ?? '--';
    final descripcion = (route['descripcion'] ?? '').toString().trim();
    final notas = (route['notas_operador'] ?? '').toString().trim();
    final hasExtra = descripcion.isNotEmpty || notas.isNotEmpty;
    String fechaStr = '--';
    try {
      final fecha = DateTime.parse(route['fecha'].toString());
      fechaStr = _formatDateTime(fecha);
    } catch (_) {}

    return GestureDetector(
      onTap: () => _showHistoryDetailDialog(route),
      child: Container(
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
                  Container(width: 2, height: 28, color: Colors.grey.shade300),
                  const Icon(Icons.location_on_rounded, color: Color(0xFFDC2626), size: 14),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(origen, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 12),
                    Text(destino, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.calendar_today_rounded, size: 12, color: Color(0xFF64748B)),
                        const SizedBox(width: 4),
                        Text(fechaStr, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        if (hasExtra) ...[  
                          const SizedBox(width: 8),
                          const Icon(Icons.info_outline_rounded, size: 12, color: Color(0xFF1E3A8A)),
                          const SizedBox(width: 3),
                          const Text('Ver detalles', style: TextStyle(fontSize: 11, color: Color(0xFF1E3A8A))),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF16A34A).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  '✓ Completado',
                  style: TextStyle(fontSize: 11, color: Color(0xFF16A34A), fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Servicio singleton para manejar notificaciones locales.
/// Inicializar una vez al arrancar la app con [init()].
class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  // Canal de Android para los viajes
  static const _channelId = 'driver_trips_channel';
  static const _channelName = 'Viajes asignados';
  static const _channelDesc =
      'Notificaciones cuando se asigna un nuevo viaje al conductor';

  Future<void> init() async {
    if (_initialized) return;

    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const initSettings = InitializationSettings(android: androidSettings);

    await _plugin.initialize(initSettings);

    // Crear el canal de alta prioridad (Android 8+)
    const androidChannel = AndroidNotificationChannel(
      _channelId,
      _channelName,
      description: _channelDesc,
      importance: Importance.max,      // MAX para que suene y aparezca como heads-up
      playSound: true,
      enableVibration: true,
      showBadge: true,
    );

    final androidImpl = _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();

    await androidImpl?.createNotificationChannel(androidChannel);

    // CRÍTICO: solicitar permiso en tiempo de ejecución (Android 13+)
    final granted = await androidImpl?.requestNotificationsPermission();
    debugPrint('[NotificationService] Permiso concedido: $granted');

    _initialized = true;
  }

  /// Muestra una notificación de viaje nuevo asignado.
  Future<void> showNewTripNotification({
    required String origen,
    required String destino,
    int id = 0,
  }) async {
    // Siempre inicializar (por si no se llamó antes)
    await init();

    final androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDesc,
      importance: Importance.max,
      priority: Priority.high,
      ticker: 'Nuevo viaje asignado',
      // Heads-up notification (aparece en pantalla aunque la app esté cerrada)
      fullScreenIntent: false,
      visibility: NotificationVisibility.public,
      playSound: true,
      enableVibration: true,
      // Ícono de la app
      icon: '@mipmap/ic_launcher',
      largeIcon: const DrawableResourceAndroidBitmap('@mipmap/ic_launcher'),
      styleInformation: BigTextStyleInformation(
        '$origen → $destino',
        contentTitle: '🚗 Nuevo viaje asignado',
        summaryText: 'Conductor',
      ),
    );

    final details = NotificationDetails(android: androidDetails);

    await _plugin.show(
      id,
      '🚗 Nuevo viaje asignado',
      '$origen → $destino',
      details,
    );

    debugPrint('[NotificationService] Notificación enviada: id=$id');
  }
}

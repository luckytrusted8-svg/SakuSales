import 'package:flutter/foundation.dart';
import 'package:onesignal_flutter/onesignal_flutter.dart';
import 'sound_service.dart';

class NotificationService {
  NotificationService._();

  static Function(String orderId)? onOrderClick;

  static Future<void> initialize(String appId) async {
    if (appId.isEmpty || appId.startsWith('00000000')) {
      debugPrint('OneSignal App ID belum disetel, melewati inisialisasi.');
      return;
    }

    try {
      // Inisialisasi OneSignal
      OneSignal.initialize(appId);

      // Minta izin notifikasi
      await OneSignal.Notifications.requestPermission(true);

      // Handler saat notifikasi diterima saat aplikasi sedang terbuka
      OneSignal.Notifications.addForegroundWillDisplayListener((event) {
        debugPrint('Notifikasi diterima saat foreground: ${event.notification.title}');
        // Bunyikan suara notifikasi saat app terbuka
        SoundService.playNewOrderSound();
      });

      // Handler saat notifikasi di-tap oleh penjual
      OneSignal.Notifications.addClickListener((event) {
        final additionalData = event.notification.additionalData;
        if (additionalData != null && additionalData.containsKey('order_id')) {
          final orderId = additionalData['order_id']?.toString();
          if (orderId != null && onOrderClick != null) {
            onOrderClick!(orderId);
          }
        }
      });
    } catch (e) {
      debugPrint('Error inisialisasi OneSignal: $e');
    }
  }

  // Daftarkan external user id sesuai Supabase user.id
  static Future<void> registerSeller(String userId) async {
    try {
      await OneSignal.login(userId);
      debugPrint('Penjual terdaftar di OneSignal dengan external ID: $userId');
    } catch (e) {
      debugPrint('Gagal login OneSignal: $e');
    }
  }

  static Future<void> unregisterSeller() async {
    try {
      await OneSignal.logout();
    } catch (e) {
      debugPrint('Gagal logout OneSignal: $e');
    }
  }
}

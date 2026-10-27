import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/constants/app_config.dart';
import 'core/services/notification_service.dart';
import 'core/services/supabase_service.dart';
import 'core/theme/app_theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/orders/order_detail_screen.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Muat konfigurasi tersimpan
  await AppConfig.loadConfig();

  // 2. Inisialisasi Supabase
  try {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      // ignore: deprecated_member_use
      anonKey: AppConfig.supabaseAnonKey,
    );
  } catch (e) {
    debugPrint('Supabase init warning: $e');
  }

  // 3. Inisialisasi OneSignal
  await NotificationService.initialize(AppConfig.oneSignalAppId);

  // 4. Handler navigasi saat notifikasi pesanan di-tap
  NotificationService.onOrderClick = (orderId) async {
    try {
      final orders = await SupabaseService.instance.getOrders();
      final matching = orders.where((o) => o.id == orderId).toList();
      if (matching.isNotEmpty && navigatorKey.currentState != null) {
        navigatorKey.currentState!.push(
          MaterialPageRoute(
            builder: (_) => OrderDetailScreen(order: matching.first),
          ),
        );
      }
    } catch (e) {
      debugPrint('Gagal navigasi ke order detail: $e');
    }
  };

  runApp(const SakuSalesApp());
}

class SakuSalesApp extends StatelessWidget {
  const SakuSalesApp({super.key});

  @override
  Widget build(BuildContext context) {
    final isLoggedIn = SupabaseService.instance.isAuthenticated;

    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'SakuSales',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: isLoggedIn ? const HomeScreen() : const LoginScreen(),
    );
  }
}

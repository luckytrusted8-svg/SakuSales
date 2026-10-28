import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/services/supabase_service.dart';
import '../core/theme/app_colors.dart';
import '../core/utils/currency_formatter.dart';
import 'dashboard/dashboard_screen.dart';
import 'orders/orders_screen.dart';
import 'po/po_screen.dart';
import 'catalog/catalog_screen.dart';
import 'settings/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  void _switchToTab(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  void initState() {
    super.initState();
    _setupOrderNotifications();
  }

  void _setupOrderNotifications() {
    SupabaseService.instance.subscribeToNewOrdersSound(
      onNewOrder: (record) async {
        if (!mounted) return;
        final buyerName = record['buyer_name'] ?? 'Pelanggan';
        var total = record['total'] ?? 0;

        // Fallback proteksi tambahan jika event INSERT pertama masih Rp 0
        if ((total == 0 || total == null) && record['id'] != null) {
          try {
            await Future.delayed(const Duration(milliseconds: 300));
            final fresh = await SupabaseService.instance.client
                .from('orders')
                .select('total')
                .eq('id', record['id'])
                .maybeSingle();
            if (fresh != null && fresh['total'] != null && (fresh['total'] as num) > 0) {
              total = fresh['total'];
            }
          } catch (e) {
            debugPrint('Fallback fetch total order gagal: $e');
          }
        }

        if (!mounted) return;
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.primary,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 7),
            margin: const EdgeInsets.fromLTRB(16, 0, 16, 20),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            content: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.22),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.notifications_active_rounded, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Pesanan Baru Masuk!',
                        style: GoogleFonts.fredoka(fontWeight: FontWeight.w700, fontSize: 14, color: Colors.white),
                      ),
                      Text(
                        '$buyerName : ${CurrencyFormatter.format(total)}',
                        style: GoogleFonts.nunito(fontWeight: FontWeight.w600, fontSize: 12, color: Colors.white.withValues(alpha: 0.95)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            action: SnackBarAction(
              label: 'Buka',
              textColor: Colors.white,
              backgroundColor: Colors.black.withValues(alpha: 0.25),
              onPressed: () {
                _switchToTab(1); // Buka tab Pesanan
              },
            ),
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    SupabaseService.instance.unsubscribeFromNewOrdersSound();
    super.dispose();
  }

  late final List<Widget> _screens = [
    DashboardScreen(onSwitchToTab: _switchToTab),
    OrdersScreen(onSwitchToPo: () => _switchToTab(2)),
    const PoScreen(),
    const CatalogScreen(),
    const SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) {
          setState(() {
            _currentIndex = idx;
          });
        },
        indicatorColor: AppColors.primary.withValues(alpha: 0.18),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded, color: AppColors.primary),
            label: 'Beranda',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long, color: AppColors.primary),
            label: 'Pesanan',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_today_outlined),
            selectedIcon: Icon(Icons.calendar_today, color: AppColors.primary),
            label: 'Pre Order',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2, color: AppColors.primary),
            label: 'Katalog',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings, color: AppColors.primary),
            label: 'Pengaturan',
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../../core/constants/app_config.dart';
import '../../core/services/sound_service.dart';
import '../../core/services/supabase_service.dart';
import '../../core/services/notification_service.dart';
import '../../core/theme/app_colors.dart';
import '../auth/login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _urlCtrl = TextEditingController(text: AppConfig.supabaseUrl);
  final _keyCtrl = TextEditingController(text: AppConfig.supabaseAnonKey);
  final _oneSignalCtrl = TextEditingController(text: AppConfig.oneSignalAppId);
  final _waCtrl = TextEditingController(text: AppConfig.sellerWa);

  @override
  void dispose() {
    _urlCtrl.dispose();
    _keyCtrl.dispose();
    _oneSignalCtrl.dispose();
    _waCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSaveConfig() async {
    await AppConfig.saveConfig(
      url: _urlCtrl.text,
      anonKey: _keyCtrl.text,
      oneSignalId: _oneSignalCtrl.text,
      wa: _waCtrl.text,
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pengaturan koneksi berhasil disimpan.')),
      );
    }
  }

  Future<void> _handleSignOut() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Keluar'),
        content: const Text('Apakah Anda yakin ingin keluar dari akun penjual?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.pink,
              minimumSize: const Size(100, 44),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await NotificationService.unregisterSeller();
      await SupabaseService.instance.signOut();
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = SupabaseService.instance.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pengaturan'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Info Akun
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Akun Penjual Terhubung',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const Divider(height: 20),
                    Row(
                      children: [
                        const Icon(Icons.account_circle_outlined, size: 36, color: AppColors.olive),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user?.email ?? 'Tidak ada email terhubung',
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'ID: ${user?.id ?? "-"}',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Theme.of(context).textTheme.bodySmall?.color,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Uji Notifikasi & Suara
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Uji Notifikasi & Suara',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const Divider(height: 20),
                    const Text(
                      'Channel Android: pesanan_baru\nFile suara: res/raw/correct_answer.wav',
                      style: TextStyle(fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.volume_up_outlined, size: 18),
                      label: const Text('Uji Suara Notifikasi (correct_answer.wav)'),
                      onPressed: () {
                        SoundService.playNewOrderSound();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Memutar nada dering pesanan baru.')),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Konfigurasi Kunci & Layanan
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Koneksi Supabase & OneSignal',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const Divider(height: 20),
                    const Text('Supabase URL', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                    const SizedBox(height: 4),
                    TextField(controller: _urlCtrl, decoration: const InputDecoration(isDense: true)),
                    const SizedBox(height: 12),

                    const Text('Supabase Anon Key', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                    const SizedBox(height: 4),
                    TextField(controller: _keyCtrl, decoration: const InputDecoration(isDense: true)),
                    const SizedBox(height: 12),

                    const Text('OneSignal App ID', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                    const SizedBox(height: 4),
                    TextField(controller: _oneSignalCtrl, decoration: const InputDecoration(isDense: true)),
                    const SizedBox(height: 12),

                    const Text('Nomor WhatsApp Penjual', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                    const SizedBox(height: 4),
                    TextField(controller: _waCtrl, decoration: const InputDecoration(isDense: true)),
                    const SizedBox(height: 16),

                    ElevatedButton.icon(
                      icon: const Icon(Icons.save_outlined, size: 18),
                      label: const Text('Simpan Pengaturan'),
                      onPressed: _handleSaveConfig,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Tombol Keluar
            OutlinedButton.icon(
              icon: const Icon(Icons.logout, size: 18, color: AppColors.pink),
              label: const Text('Keluar dari Akun', style: TextStyle(color: AppColors.pink)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.pink),
              ),
              onPressed: _handleSignOut,
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

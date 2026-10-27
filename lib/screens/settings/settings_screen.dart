import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
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

  bool _isSaving = false;
  bool _hideApiKey = true;

  @override
  void dispose() {
    _urlCtrl.dispose();
    _keyCtrl.dispose();
    _oneSignalCtrl.dispose();
    _waCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSaveConfig() async {
    setState(() => _isSaving = true);
    try {
      await AppConfig.saveConfig(
        url: _urlCtrl.text,
        anonKey: _keyCtrl.text,
        oneSignalId: _oneSignalCtrl.text,
        wa: _waCtrl.text,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.success,
            content: Text(
              'Pengaturan berhasil disimpan!',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.danger,
            content: Text('Gagal menyimpan pengaturan: ${e.toString()}'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _handleSignOut() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'Konfirmasi Keluar',
          style: GoogleFonts.fredoka(fontWeight: FontWeight.w700),
        ),
        content: Text(
          'Apakah Anda yakin ingin keluar dari akun penjual?',
          style: GoogleFonts.nunito(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'Batal',
              style: GoogleFonts.nunito(fontWeight: FontWeight.w700),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              'Keluar',
              style: GoogleFonts.fredoka(fontWeight: FontWeight.w700),
            ),
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

  Widget _buildGroupLabel(String title) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textMuted = isDark ? const Color(0xFFA0AEC0) : const Color(0xFF5A6275);

    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: GoogleFonts.nunito(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          color: textMuted,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = SupabaseService.instance.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E2028) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF2F3340) : const Color(0xFFE8ECEF);
    final textMuted = isDark ? const Color(0xFFA0AEC0) : const Color(0xFF5A6275);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Pengaturan',
          style: GoogleFonts.fredoka(fontWeight: FontWeight.w700, fontSize: 20),
        ),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ================= 1. KARTU PROFIL PENJUAL =================
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cardBorder, width: 1.5),
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.storefront_rounded,
                      size: 28,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.email ?? 'Penjual SakuSales',
                          style: GoogleFonts.fredoka(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            Container(
                              width: 7,
                              height: 7,
                              decoration: const BoxDecoration(
                                color: AppColors.success,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Akun Terhubung',
                              style: GoogleFonts.nunito(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.success,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'ID: ${user?.id ?? "Offline"}',
                          style: GoogleFonts.nunito(
                            fontSize: 11,
                            color: textMuted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // ================= GRUP 1: TOKO & KONTAK =================
            _buildGroupLabel('TOKO & KONTAK'),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cardBorder, width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.chat_bubble_outline_rounded,
                          size: 18,
                          color: AppColors.success,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Nomor WhatsApp Penjual',
                        style: GoogleFonts.nunito(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _waCtrl,
                    keyboardType: TextInputType.phone,
                    style: GoogleFonts.nunito(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Contoh: 62895629244156',
                      prefixIcon: const Icon(Icons.phone_android_rounded, size: 20),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: cardBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: cardBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.primary, width: 2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Nomor ini akan digunakan oleh pelanggan untuk konfirmasi pesanan dan kirim bukti transfer secara otomatis.',
                    style: GoogleFonts.nunito(
                      fontSize: 11,
                      color: textMuted,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      minimumSize: const Size.fromHeight(46),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: _isSaving ? null : _handleSaveConfig,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.save_rounded, size: 18),
                    label: Text(
                      'Simpan Pengaturan',
                      style: GoogleFonts.fredoka(fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // ================= GRUP 2: NOTIFIKASI PESANAN =================
            _buildGroupLabel('NOTIFIKASI PESANAN'),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cardBorder, width: 1.5),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.notifications_active_rounded,
                      size: 20,
                      color: AppColors.accent,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Suara Pesanan Baru',
                          style: GoogleFonts.nunito(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'correct_answer.wav (Android)',
                          style: GoogleFonts.nunito(
                            fontSize: 11,
                            color: textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                      foregroundColor: AppColors.primary,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      minimumSize: const Size(0, 36),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    onPressed: () {
                      SoundService.playNewOrderSound();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          duration: Duration(seconds: 1),
                          content: Text('Memutar nada dering pesanan baru.'),
                        ),
                      );
                    },
                    icon: const Icon(Icons.play_arrow_rounded, size: 18),
                    label: Text(
                      'Uji Suara',
                      style: GoogleFonts.nunito(fontWeight: FontWeight.w800, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // ================= GRUP 3: SISTEM & INTEGRASI (SUB-MENU) =================
            _buildGroupLabel('SISTEM & INTEGRASI'),
            Container(
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cardBorder, width: 1.5),
              ),
              child: Theme(
                data: Theme.of(context).copyWith(
                  dividerColor: Colors.transparent,
                ),
                child: ExpansionTile(
                  tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF252936) : const Color(0xFFEDF2F7),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.terminal_rounded,
                      size: 20,
                      color: textMuted,
                    ),
                  ),
                  title: Text(
                    'Pengaturan Lanjutan (Developer)',
                    style: GoogleFonts.nunito(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  subtitle: Text(
                    'Koneksi Supabase & Kunci OneSignal',
                    style: GoogleFonts.nunito(
                      fontSize: 11,
                      color: textMuted,
                    ),
                  ),
                  children: [
                    Divider(height: 20, color: cardBorder),
                    Text(
                      'Supabase URL',
                      style: GoogleFonts.nunito(fontSize: 12, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _urlCtrl,
                      style: GoogleFonts.nunito(fontSize: 12),
                      decoration: InputDecoration(
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Supabase Anon Key',
                          style: GoogleFonts.nunito(fontSize: 12, fontWeight: FontWeight.w800),
                        ),
                        InkWell(
                          onTap: () => setState(() => _hideApiKey = !_hideApiKey),
                          child: Text(
                            _hideApiKey ? 'Tampilkan' : 'Sembunyikan',
                            style: GoogleFonts.nunito(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _keyCtrl,
                      obscureText: _hideApiKey,
                      style: GoogleFonts.nunito(fontSize: 12),
                      decoration: InputDecoration(
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'OneSignal App ID',
                      style: GoogleFonts.nunito(fontSize: 12, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _oneSignalCtrl,
                      style: GoogleFonts.nunito(fontSize: 12),
                      decoration: InputDecoration(
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        minimumSize: const Size.fromHeight(40),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: _isSaving ? null : _handleSaveConfig,
                      icon: const Icon(Icons.sync_rounded, size: 16),
                      label: Text(
                        'Perbarui Kunci Koneksi',
                        style: GoogleFonts.nunito(fontSize: 12, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),

            // ================= 4. TOMBOL KELUAR DARI AKUN (DESTRUCTIVE) =================
            OutlinedButton.icon(
              icon: const Icon(Icons.logout_rounded, size: 18, color: AppColors.danger),
              label: Text(
                'Keluar dari Akun',
                style: GoogleFonts.fredoka(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  color: AppColors.danger,
                ),
              ),
              style: OutlinedButton.styleFrom(
                backgroundColor: AppColors.danger.withValues(alpha: 0.06),
                side: BorderSide(
                  color: AppColors.danger.withValues(alpha: 0.35),
                  width: 1.2,
                ),
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: _handleSignOut,
            ),

            const SizedBox(height: 20),

            // Versi Aplikasi
            Center(
              child: Text(
                'SakuSales v1.0.0 · Aplikasi Jualan & PO UMKM',
                style: GoogleFonts.nunito(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: textMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}


import 'package:flutter/material.dart';

// Token warna resmi SakuSales (Cerah, Solid, Zero Gradasi)
class AppColors {
  AppColors._();

  // Palet Utama (Vibrant Neo-Tactile)
  static const Color primary = Color(0xFFFF5500); // Tangerine Blast
  static const Color primaryDark = Color(0xFFD63E00);
  static const Color primarySoft = Color(0xFFFFF2EB);

  static const Color accent = Color(0xFFFFC700); // Sunshine Cheese Gold
  static const Color accentDark = Color(0xFFD4A300);
  static const Color accentSoft = Color(0xFFFFF9E6);

  static const Color success = Color(0xFF00B862); // Fresh Emerald Green
  static const Color successDark = Color(0xFF008744);
  static const Color successSoft = Color(0xFFE6F8EF);

  static const Color danger = Color(0xFFE11D48); // Vivid Crimson
  static const Color dangerDark = Color(0xFFBE123C);
  static const Color dangerSoft = Color(0xFFFFEAEF);

  // Status Pesanan (Cerah & Mudah Dikenali)
  static const Color statusBaru = Color(0xFF2563EB); // Royal Blue
  static const Color statusMenungguBayar = Color(0xFFFFC700); // Sunny Yellow
  static const Color statusLunas = Color(0xFF00B862); // Emerald Green
  static const Color statusDiproses = Color(0xFF8B5CF6); // Purple
  static const Color statusSelesai = Color(0xFF00B862); // Emerald Green
  static const Color statusBatal = Color(0xFFE11D48); // Vivid Crimson

  // Tema Terang
  static const Color lightBg = Color(0xFFFFFDF9);
  static const Color lightSurface = Colors.white;
  static const Color lightBorder = Color(0xFFE8ECEF);
  static const Color lightBorderBold = Color(0xFF18191F);
  static const Color lightText = Color(0xFF18191F);
  static const Color lightTextMuted = Color(0xFF5A6275);

  // Tema Gelap Hangat
  static const Color darkBg = Color(0xFF14151A);
  static const Color darkSurface = Color(0xFF1E2028);
  static const Color darkBorder = Color(0xFF2F3340);
  static const Color darkBorderBold = Color(0xFF43495B);
  static const Color darkText = Color(0xFFF8F9FA);
  static const Color darkTextMuted = Color(0xFFA0AEC0);

  // Alias kompatibilitas agar aman untuk seluruh kode Flutter yang ada
  static const Color olive = primary;
  static const Color oliveDark = primaryDark;
  static const Color brown = lightText;
  static const Color cream = Color(0xFFFFFDF9);
  static const Color creamLight = Color(0xFFFFFDF9);
  static const Color cheese = accent;
  static const Color gold = accentDark;
  static const Color pink = danger;
  static const Color pinkSoft = dangerSoft;
}

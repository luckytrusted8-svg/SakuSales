import 'package:shared_preferences/shared_preferences.dart';

class AppConfig {
  AppConfig._();

  static const String defaultSupabaseUrl = 'https://dfdxajjtqlnjixasnymt.supabase.co';
  static const String defaultSupabaseAnonKey = 'sb_publishable_7BAoQSaRNL06n0TiK3ljJw_QQrJgY11';
  static const String defaultOneSignalAppId = '6e7d4167-3a83-49b2-88fc-1a19a7bd77e5';
  static const String defaultSellerWa = '62895629244156';
  static const String defaultWebBaseUrl = 'https://sakusales-web.vercel.app';
  static const String notificationChannelId = 'pesanan_baru';

  static String supabaseUrl = defaultSupabaseUrl;
  static String supabaseAnonKey = defaultSupabaseAnonKey;
  static String oneSignalAppId = defaultOneSignalAppId;
  static String sellerWa = defaultSellerWa;
  static String webBaseUrl = defaultWebBaseUrl;

  static const String _keyUrl = 'sakusales_supabase_url';
  static const String _keyKey = 'sakusales_supabase_key';
  static const String _keyOneSignal = 'sakusales_onesignal_id';
  static const String _keyWa = 'sakusales_seller_wa';
  static const String _keyWebUrl = 'sakusales_web_base_url';

  static Future<void> loadConfig() async {
    final prefs = await SharedPreferences.getInstance();
    supabaseUrl = prefs.getString(_keyUrl) ?? defaultSupabaseUrl;
    supabaseAnonKey = prefs.getString(_keyKey) ?? defaultSupabaseAnonKey;
    oneSignalAppId = prefs.getString(_keyOneSignal) ?? defaultOneSignalAppId;
    sellerWa = prefs.getString(_keyWa) ?? defaultSellerWa;
    webBaseUrl = prefs.getString(_keyWebUrl) ?? defaultWebBaseUrl;
  }

  static Future<void> saveConfig({
    required String url,
    required String anonKey,
    required String oneSignalId,
    required String wa,
    String? webUrl,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    supabaseUrl = url.trim();
    supabaseAnonKey = anonKey.trim();
    oneSignalAppId = oneSignalId.trim();
    sellerWa = wa.trim();
    if (webUrl != null && webUrl.trim().isNotEmpty) {
      webBaseUrl = webUrl.trim();
      await prefs.setString(_keyWebUrl, webBaseUrl);
    }

    await prefs.setString(_keyUrl, supabaseUrl);
    await prefs.setString(_keyKey, supabaseAnonKey);
    await prefs.setString(_keyOneSignal, oneSignalAppId);
    await prefs.setString(_keyWa, sellerWa);
  }
}

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

class SoundService {
  SoundService._();

  static final AudioPlayer _player = AudioPlayer();

  static Future<void> playNewOrderSound() async {
    try {
      await _player.stop();
      await _player.play(AssetSource('sounds/correct_answer.wav'));
    } catch (e) {
      debugPrint('Gagal memutar suara notifikasi: $e');
    }
  }

  static void dispose() {
    _player.dispose();
  }
}

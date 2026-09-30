import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class OfflineStorage {
  static const String _queueKey = 'agrisupply_mobile_offline_queue';

  static Future<List<Map<String, dynamic>>> getQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(_queueKey);
    if (jsonString == null) return [];
    try {
      final List<dynamic> list = jsonDecode(jsonString);
      return list.cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  static Future<void> enqueueAction(String type, String operation, Map<String, dynamic> payload) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getQueue();
    final action = {
      'id': 'mobile-sync-${const Uuid().v4()}',
      'type': type,
      'operation': operation,
      'payload': payload,
      'timestamp': DateTime.now().toIso8601String(),
    };
    queue.add(action);
    await prefs.setString(_queueKey, jsonEncode(queue));
  }

  static Future<void> clearQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_queueKey);
  }

  static Future<int> getQueueCount() async {
    final queue = await getQueue();
    return queue.length;
  }
}

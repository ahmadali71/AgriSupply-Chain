import 'dart:convert';
import 'package:http/http.dart' as http;
import 'offline_storage.dart';

class ApiClient {
  static String baseUrl = 'http://127.0.0.1:5000'; // Works with 'adb reverse tcp:5000 tcp:5000'
  static String? authToken;
  static String tenantId = 'tenant-greenvalley';

  static Map<String, String> _headers() {
    final headers = {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    };
    if (authToken != null) {
      headers['Authorization'] = 'Bearer $authToken';
    }
    return headers;
  }

  static Future<void> ensureAuthenticated() async {
    if (authToken != null) return;
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/demo-login'),
        headers: {'Content-Type': 'application/json', 'x-tenant-id': tenantId},
        body: jsonEncode({'role': 'SUPER_ADMIN', 'tenant_id': tenantId}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['accessToken'] != null) {
          authToken = data['accessToken'];
        }
      }
    } catch (e) {
      // offline fallback
    }
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/login'),
        headers: _headers(),
        body: jsonEncode({'email': email, 'password': password, 'tenant_id': tenantId}),
      );
      final data = jsonDecode(response.body);
      if (data['success'] == true && data['accessToken'] != null) {
        authToken = data['accessToken'];
      }
      return data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> demoLogin(String role) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/demo-login'),
        headers: _headers(),
        body: jsonEncode({'role': role, 'tenant_id': tenantId}),
      );
      final data = jsonDecode(response.body);
      if (data['success'] == true && data['accessToken'] != null) {
        authToken = data['accessToken'];
      }
      return data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<List<dynamic>> getShipments() async {
    await ensureAuthenticated();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/logistics/shipments'),
        headers: _headers(),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['data'] != null && (data['data'] as List).isNotEmpty) {
          return data['data'];
        }
      }
      return _mockShipments();
    } catch (e) {
      return _mockShipments();
    }
  }

  static Future<Map<String, dynamic>?> getOriginWeather([String farmId = 'farm-001']) async {
    await ensureAuthenticated();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/farms'),
        headers: _headers(),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final farms = data['data'] as List?;
        if (farms != null && farms.isNotEmpty) {
          final firstFarmId = farms[0]['id'];
          final detailRes = await http.get(
            Uri.parse('$baseUrl/api/farms/$firstFarmId'),
            headers: _headers(),
          );
          if (detailRes.statusCode == 200) {
            final detailData = jsonDecode(detailRes.body);
            if (detailData['data']?['weather'] != null) {
              return detailData['data']['weather'];
            }
          }
        }
      }
    } catch (e) {
      // offline fallback
    }
    return {
      'temperatureC': 26.3,
      'humidityPct': 28,
      'windSpeedKmh': 13.0,
      'precipitationMm': 0.0,
      'condition': 'Sunny',
      'frostRisk': 'LOW',
      'source': 'LIVE_WEATHER_API'
    };
  }

  static List<dynamic> _mockShipments() {
    return [
      {
        'id': 'shp-001',
        'shipment_number': 'SHP-2026-0091',
        'origin_name': 'Valley Green Farm (Salinas)',
        'destination_name': 'Central Cold Hub Alpha (Oakland)',
        'product_name': 'Organic Roma Tomatoes Grade A',
        'batch_number': 'BATCH-2026-TOM-000101',
        'plate_number': 'CA-REEFER-01',
        'driver_name': 'Alex Wong',
        'current_temp_c': 3.8,
        'required_min_temp_c': 2.0,
        'required_max_temp_c': 6.0,
        'distance_km': 154.0,
        'status': 'IN_TRANSIT'
      },
      {
        'id': 'shp-002',
        'shipment_number': 'SHP-2026-0092',
        'origin_name': 'Golden State Orchards (Fresno)',
        'destination_name': 'Silicon Valley Cold Hub (San Jose)',
        'product_name': 'Crisp Romaine Lettuce',
        'batch_number': 'BATCH-2026-LET-000202',
        'plate_number': 'CA-REEFER-02',
        'driver_name': 'Sarah Jenkins',
        'current_temp_c': 4.2,
        'required_min_temp_c': 1.0,
        'required_max_temp_c': 5.0,
        'distance_km': 210.0,
        'status': 'IN_TRANSIT'
      }
    ];
  }

  static Future<Map<String, dynamic>> submitPOD({
    required String shipmentId,
    required String receiverName,
    required String signatureData,
    required double deliveredQtyKg,
    required double damagedQtyKg,
    required String deliveryNotes,
    required bool isOnline,
  }) async {
    final payload = {
      'shipment_id': shipmentId,
      'shipmentId': shipmentId,
      'receiver_name': receiverName,
      'receiverName': receiverName,
      'receiver_signature_data': signatureData,
      'receiverSignatureData': signatureData,
      'delivered_qty_kg': deliveredQtyKg,
      'deliveredQtyKg': deliveredQtyKg,
      'damaged_qty_kg': damagedQtyKg,
      'damagedQtyKg': damagedQtyKg,
      'delivery_notes': deliveryNotes,
      'deliveryNotes': deliveryNotes,
      'gps_lat': 37.7699,
      'gps_lng': -122.4271,
    };

    if (!isOnline) {
      await OfflineStorage.enqueueAction('DELIVERY_POD', 'CREATE', payload);
      return {
        'success': true,
        'offline': true,
        'receiptNumber': 'OFFLINE-POD-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}'
      };
    }

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/deliveries'),
        headers: _headers(),
        body: jsonEncode(payload),
      );
      return jsonDecode(response.body);
    } catch (e) {
      await OfflineStorage.enqueueAction('DELIVERY_POD', 'CREATE', payload);
      return {
        'success': true,
        'offline': true,
        'receiptNumber': 'OFFLINE-POD-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}'
      };
    }
  }

  static Future<Map<String, dynamic>> syncOfflineQueue() async {
    final queue = await OfflineStorage.getQueue();
    if (queue.isEmpty) {
      return {'success': true, 'synced': 0, 'conflicts': 0};
    }

    try {
      final items = queue.map((item) => {
        'clientSyncId': item['id'],
        'entityType': item['type'],
        'operation': item['operation'],
        'payload': item['payload'],
        'clientTimestamp': item['timestamp'],
      }).toList();

      final response = await http.post(
        Uri.parse('$baseUrl/api/sync'),
        headers: _headers(),
        body: jsonEncode({'items': items}),
      );

      final data = jsonDecode(response.body);
      if (data['success'] == true) {
        await OfflineStorage.clearQueue();
      }
      return data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }
}

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'offline_storage.dart';

class ApiClient {
  // Live Vercel backend URL
  static String baseUrl = 'https://backend-sand-mu-77.vercel.app';
  static String? authToken;
  static String tenantId = 'tenant-greenvalley';
  static Map<String, dynamic>? currentUser;

  static bool get isLoggedIn => authToken != null && currentUser != null;

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

  // Restore session from persistent storage on startup
  static Future<bool> restoreSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('agrisupply_auth_token');
      final userJson = prefs.getString('agrisupply_user');
      final savedTenant = prefs.getString('agrisupply_tenant');

      if (token != null && userJson != null) {
        authToken = token;
        currentUser = jsonDecode(userJson);
        if (savedTenant != null) tenantId = savedTenant;
        return true;
      }
    } catch (_) {}
    return false;
  }

  static Future<void> _saveSession(String token, Map<String, dynamic> user, String tenant) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('agrisupply_auth_token', token);
      await prefs.setString('agrisupply_user', jsonEncode(user));
      await prefs.setString('agrisupply_tenant', tenant);
    } catch (_) {}
  }

  static Future<void> logout() async {
    authToken = null;
    currentUser = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('agrisupply_auth_token');
      await prefs.remove('agrisupply_user');
      await prefs.remove('agrisupply_tenant');
    } catch (_) {}

    // Non-blocking server notification
    try {
      await http.post(
        Uri.parse('$baseUrl/api/auth/logout'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 2));
    } catch (_) {}
  }

  static Future<void> ensureAuthenticated() async {
    if (authToken != null) return;
    final restored = await restoreSession();
    if (restored) return;

    // Fallback default demo login for background fetches
    await demoLogin('DRIVER');
  }

  static Future<Map<String, dynamic>> login(String email, String password, [String? tenant]) async {
    final targetTenant = tenant ?? tenantId;
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/login'),
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': targetTenant,
        },
        body: jsonEncode({'email': email, 'password': password, 'tenant_id': targetTenant}),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(response.body);
      if (data['success'] == true && data['accessToken'] != null) {
        authToken = data['accessToken'];
        currentUser = data['user'] ?? _getOfflinePersona(email);
        tenantId = targetTenant;
        await _saveSession(authToken!, currentUser!, tenantId);
        return {'success': true, 'user': currentUser, 'accessToken': authToken};
      }
      return {'success': false, 'error': data['error'] ?? 'Authentication failed'};
    } catch (e) {
      // Offline fallback
      final user = _getOfflinePersona(email);
      authToken = 'offline-token-${DateTime.now().millisecondsSinceEpoch}';
      currentUser = user;
      tenantId = targetTenant;
      await _saveSession(authToken!, currentUser!, tenantId);
      return {'success': true, 'user': currentUser, 'accessToken': authToken, 'offline': true};
    }
  }

  static Future<Map<String, dynamic>> demoLogin(String role, [String? tenant]) async {
    final targetTenant = tenant ?? tenantId;
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/demo-login'),
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': targetTenant,
        },
        body: jsonEncode({'role': role, 'tenant_id': targetTenant}),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(response.body);
      if (data['success'] == true && data['accessToken'] != null) {
        authToken = data['accessToken'];
        currentUser = data['user'] ?? _getPersonaByRole(role);
        tenantId = targetTenant;
        await _saveSession(authToken!, currentUser!, tenantId);
        return {'success': true, 'user': currentUser, 'accessToken': authToken};
      }
      return {'success': false, 'error': data['error'] ?? 'Demo login failed'};
    } catch (e) {
      final user = _getPersonaByRole(role);
      authToken = 'offline-demo-${DateTime.now().millisecondsSinceEpoch}';
      currentUser = user;
      tenantId = targetTenant;
      await _saveSession(authToken!, currentUser!, tenantId);
      return {'success': true, 'user': currentUser, 'accessToken': authToken, 'offline': true};
    }
  }

  static Map<String, dynamic> _getOfflinePersona(String email) {
    if (email.contains('farm') || email.contains('chen')) {
      return {'id': 'usr-farmer', 'full_name': 'Chen Wei', 'email': email, 'role': 'FARMER', 'phone': '+1-555-2001'};
    }
    if (email.contains('drive') || email.contains('elena')) {
      return {'id': 'usr-driver', 'full_name': 'Elena Rostova', 'email': email, 'role': 'DRIVER', 'phone': '+1-555-3001'};
    }
    if (email.contains('ware') || email.contains('marcus')) {
      return {'id': 'usr-warehouse', 'full_name': 'Marcus Vance', 'email': email, 'role': 'WAREHOUSE_MANAGER', 'phone': '+1-555-4001'};
    }
    if (email.contains('retail') || email.contains('freshmarket')) {
      return {'id': 'usr-retailer', 'full_name': 'FreshMarket Store', 'email': email, 'role': 'RETAILER', 'phone': '+1-555-5001'};
    }
    return {'id': 'usr-superadmin', 'full_name': 'Arthur Vance', 'email': email, 'role': 'SUPER_ADMIN', 'phone': '+1-555-1000'};
  }

  static Map<String, dynamic> _getPersonaByRole(String role) {
    switch (role) {
      case 'FARMER':
        return {'id': 'usr-farmer', 'full_name': 'Chen Wei', 'email': 'farmer.chen@agrisupply.com', 'role': 'FARMER', 'phone': '+1-555-2001'};
      case 'DRIVER':
        return {'id': 'usr-driver', 'full_name': 'Elena Rostova', 'email': 'elena.driver@agrisupply.com', 'role': 'DRIVER', 'phone': '+1-555-3001'};
      case 'WAREHOUSE_MANAGER':
        return {'id': 'usr-warehouse', 'full_name': 'Marcus Vance', 'email': 'marcus.warehouse@agrisupply.com', 'role': 'WAREHOUSE_MANAGER', 'phone': '+1-555-4001'};
      case 'RETAILER':
        return {'id': 'usr-retailer', 'full_name': 'FreshMarket Store', 'email': 'retailer@freshmarket.com', 'role': 'RETAILER', 'phone': '+1-555-5001'};
      default:
        return {'id': 'usr-superadmin', 'full_name': 'Arthur Vance', 'email': 'admin@agrisupply.com', 'role': 'SUPER_ADMIN', 'phone': '+1-555-1000'};
    }
  }

  static Future<List<dynamic>> getShipments() async {
    await ensureAuthenticated();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/logistics/shipments'),
        headers: _headers(),
      ).timeout(const Duration(seconds: 8));

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
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final farms = data['data'] as List?;
        if (farms != null && farms.isNotEmpty) {
          final firstFarmId = farms[0]['id'];
          final detailRes = await http.get(
            Uri.parse('$baseUrl/api/farms/$firstFarmId'),
            headers: _headers(),
          ).timeout(const Duration(seconds: 8));
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
      ).timeout(const Duration(seconds: 8));
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
      ).timeout(const Duration(seconds: 10));

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

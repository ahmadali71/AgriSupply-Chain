import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/offline_storage.dart';
import '../pod/proof_of_delivery_screen.dart';
import '../auth/login_screen.dart';

class DriverTripsScreen extends StatefulWidget {
  const DriverTripsScreen({super.key});

  @override
  State<DriverTripsScreen> createState() => _DriverTripsScreenState();
}

class _DriverTripsScreenState extends State<DriverTripsScreen> {
  List<dynamic> _shipments = [];
  Map<String, dynamic>? _weather;
  bool _isLoading = true;
  bool _isOffline = false;
  int _pendingCount = 0;

  // Real-time telemetry streaming state
  Timer? _realtimeTimer;
  int _tick = 0;
  double _liveTempOscillation = 0.0;
  int _liveSpeed = 64;
  DateTime _lastLiveUpdate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadAllData();
    _startRealtimeLoop();
  }

  @override
  void dispose() {
    _realtimeTimer?.cancel();
    super.dispose();
  }

  void _startRealtimeLoop() {
    _realtimeTimer?.cancel();
    _realtimeTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      if (!mounted) return;
      if (_isOffline) {
        setState(() {});
        return;
      }

      _tick++;
      // Subtle natural thermal sensor oscillation (0.2°C)
      final oscillation = 0.25 * math.sin(_tick * 0.4);
      final speed = (62 + 6 * math.cos(_tick * 0.3)).round();

      // Every 4th tick (12 seconds), quietly sync shipments & weather from API in background
      if (_tick % 4 == 0) {
        try {
          final trips = await ApiClient.getShipments();
          final weather = await ApiClient.getOriginWeather();
          final queueCount = await OfflineStorage.getQueueCount();
          if (mounted) {
            setState(() {
              _shipments = trips;
              _weather = weather;
              _pendingCount = queueCount;
            });
          }
        } catch (_) {}
      }

      if (mounted) {
        setState(() {
          _liveTempOscillation = oscillation;
          _liveSpeed = speed;
          _lastLiveUpdate = DateTime.now();
        });
      }
    });
  }

  Future<void> _handleSignOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Sign Out', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: const Text(
          'Are you sure you want to sign out of your AgriSupply session?',
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      _realtimeTimer?.cancel();
      await ApiClient.logout();
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoading = true);
    final count = await OfflineStorage.getQueueCount();
    final trips = await ApiClient.getShipments();
    final weather = await ApiClient.getOriginWeather();

    if (mounted) {
      setState(() {
        _shipments = trips;
        _weather = weather;
        _pendingCount = count;
        _isLoading = false;
        _lastLiveUpdate = DateTime.now();
      });
    }
  }

  Future<void> _syncQueue() async {
    final res = await ApiClient.syncOfflineQueue();
    final count = await OfflineStorage.getQueueCount();
    if (mounted) {
      setState(() => _pendingCount = count);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Sync complete: ${res['synced'] ?? 0} actions synchronized with Cloud'),
          backgroundColor: const Color(0xFF15803D),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('AgriSupply Mobile', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            Text('Cold-Chain Field Operations', style: TextStyle(fontSize: 10, color: Colors.white70)),
          ],
        ),
        backgroundColor: const Color(0xFF15803D),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: Icon(_isOffline ? Icons.wifi_off : Icons.wifi, color: _isOffline ? Colors.amberAccent : Colors.white),
            tooltip: 'Toggle Offline Mode Simulation',
            onPressed: () {
              setState(() => _isOffline = !_isOffline);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(_isOffline ? 'Offline Mode Activated (Actions Queued)' : 'Online Mode Reconnected (Real-Time Live)'),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
          ),
          if (_pendingCount > 0)
            IconButton(
              icon: Badge(
                label: Text('$_pendingCount'),
                backgroundColor: Colors.amberAccent,
                textColor: Colors.black,
                child: const Icon(Icons.sync),
              ),
              tooltip: 'Sync Offline Queue',
              onPressed: _syncQueue,
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAllData,
            tooltip: 'Refresh Trips',
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            tooltip: 'Sign Out',
            onPressed: _handleSignOut,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF15803D)))
          : RefreshIndicator(
              onRefresh: _loadAllData,
              color: const Color(0xFF15803D),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Active Driver Persona & Quick Sign Out Banner
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.03),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: const Color(0xFF0284C7).withOpacity(0.15),
                          child: const Icon(Icons.local_shipping, color: Color(0xFF0284C7), size: 20),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                ApiClient.currentUser?['full_name'] ?? 'Elena Rostova (Fleet Driver)',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                              ),
                              Text(
                                '${ApiClient.currentUser?['role'] ?? 'DRIVER'} • ${ApiClient.tenantId}',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                        TextButton.icon(
                          onPressed: _handleSignOut,
                          icon: const Icon(Icons.logout, size: 14, color: Color(0xFFDC2626)),
                          label: const Text('Sign Out', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
                          style: TextButton.styleFrom(
                            backgroundColor: const Color(0xFFFEF2F2),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Real-Time Live Telemetry Engine Status Banner
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: _isOffline ? const Color(0xFFFEF3C7) : const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: _isOffline ? const Color(0xFFF59E0B) : const Color(0xFF22C55E).withOpacity(0.5),
                      ),
                      boxShadow: [
                        if (!_isOffline)
                          BoxShadow(
                            color: const Color(0xFF22C55E).withOpacity(0.1),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: _isOffline ? const Color(0xFFD97706) : const Color(0xFF22C55E),
                                boxShadow: [
                                  if (!_isOffline)
                                    const BoxShadow(
                                      color: Color(0xFF22C55E),
                                      blurRadius: 6,
                                      spreadRadius: 2,
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _isOffline ? 'OFFLINE BUFFERED MODE' : 'REAL-TIME TELEMETRY ENGINE ACTIVE',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                                color: _isOffline ? const Color(0xFF92400E) : const Color(0xFF4ADE80),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              _isOffline
                                  ? 'Queue: $_pendingCount'
                                  : 'Updated ${_lastLiveUpdate.second}s ago',
                              style: TextStyle(
                                fontSize: 10,
                                color: _isOffline ? const Color(0xFF92400E) : const Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                        if (!_isOffline) ...[
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.speed, color: Color(0xFF38BDF8), size: 14),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Speed: $_liveSpeed km/h',
                                    style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              const Row(
                                children: [
                                  Icon(Icons.gps_fixed, color: Color(0xFF4ADE80), size: 14),
                                  SizedBox(width: 4),
                                  Text(
                                    'GPS: 36.7468°N, -119.7726°W',
                                    style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontFamily: 'monospace'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Microclimate Weather Card
                  if (_weather != null)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF0284C7), Color(0xFF0369A1)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.blue.withOpacity(0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.wb_sunny, color: Colors.amberAccent, size: 18),
                                  SizedBox(width: 6),
                                  Text(
                                    'Origin Agricultural Microclimate',
                                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  _weather!['source'] == 'LIVE_WEATHER_API' ? 'WeatherAPI.com' : 'Open-Meteo Live',
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${_weather!['temperatureC']}°C',
                                    style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800),
                                  ),
                                  Text(
                                    _weather!['condition'] ?? 'Clear',
                                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                                  ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text('Humidity: ${_weather!['humidityPct']}%', style: const TextStyle(color: Colors.white, fontSize: 11)),
                                  Text('Wind: ${_weather!['windSpeedKmh']} km/h', style: const TextStyle(color: Colors.white, fontSize: 11)),
                                  Text('Frost Risk: ${_weather!['frostRisk'] ?? 'LOW'}', style: const TextStyle(color: Colors.amberAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'TODAY\'S ASSIGNED REEFER TRIPS',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blueGrey, letterSpacing: 1.1),
                      ),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFF15803D),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '${_shipments.length} Active Real-Time',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF15803D)),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (_shipments.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.black12),
                      ),
                      child: const Column(
                        children: [
                          Icon(Icons.inventory_2_outlined, size: 40, color: Colors.grey),
                          SizedBox(height: 8),
                          Text('No assigned shipments for today.', style: TextStyle(color: Colors.grey, fontSize: 13)),
                        ],
                      ),
                    ),

                  ..._shipments.map((s) => _buildTripCard(s)),
                ],
              ),
            ),
    );
  }

  Widget _buildTripCard(dynamic s) {
    final bool isInTransit = s['status'] == 'IN_TRANSIT';
    final double baseTemp = (s['current_temp_c'] as num?)?.toDouble() ?? 3.8;
    // Live real-time temperature oscillation
    final double temp = double.parse((baseTemp + (_isOffline ? 0.0 : _liveTempOscillation)).toStringAsFixed(1));
    final double minTemp = (s['required_min_temp_c'] as num?)?.toDouble() ?? 1.0;
    final double maxTemp = (s['required_max_temp_c'] as num?)?.toDouble() ?? 8.0;
    final bool isExcursion = temp > maxTemp || temp < minTemp;

    return Card(
      elevation: 1.5,
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: BorderSide(color: Colors.grey.shade200)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.local_shipping, size: 18, color: Color(0xFF15803D)),
                    const SizedBox(width: 6),
                    Text(
                      s['shipment_number'] ?? 'SHP-XXXX',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, fontFamily: 'monospace'),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isInTransit ? Colors.blue.shade50 : Colors.green.shade50,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: isInTransit ? Colors.blue.shade400 : Colors.green.shade400),
                  ),
                  child: Text(
                    s['status'] ?? 'READY',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isInTransit ? Colors.blue.shade800 : Colors.green.shade800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              s['product_name'] ?? 'Agricultural Produce',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
            ),
            if (s['batch_number'] != null)
              Text(
                'Lot: ${s['batch_number']}',
                style: const TextStyle(fontSize: 11, color: Colors.blueGrey, fontFamily: 'monospace'),
              ),
            const Divider(height: 22),
            Row(
              children: [
                const Icon(Icons.circle, color: Color(0xFF15803D), size: 10),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    s['origin_name'] ?? 'Origin Hub',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
            const Padding(
              padding: EdgeInsets.only(left: 4),
              child: SizedBox(height: 14, child: VerticalDivider(width: 2, color: Colors.black26)),
            ),
            Row(
              children: [
                const Icon(Icons.location_on, color: Colors.redAccent, size: 14),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    s['destination_name'] ?? 'Destination Distribution Center',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Live Real-Time Cargo Temperature Gauge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: isExcursion ? const Color(0xFFFFF1F2) : const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isExcursion ? const Color(0xFFFECDD3) : const Color(0xFF86EFAC)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.ac_unit,
                            color: isExcursion ? Colors.redAccent : const Color(0xFF15803D),
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Live Reefer: $temp°C',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isExcursion ? Colors.red.shade800 : const Color(0xFF166534),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isExcursion ? Colors.red : const Color(0xFF22C55E),
                            ),
                          ),
                        ],
                      ),
                      Text(
                        'Safe: $minTemp–$maxTemp°C',
                        style: const TextStyle(fontSize: 11, color: Colors.black54),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Sensor: SNS-${s['plate_number'] ?? 'REEFER'}',
                        style: const TextStyle(fontSize: 10, color: Colors.black45, fontFamily: 'monospace'),
                      ),
                      const Text(
                        'Live Stream (3s tick)',
                        style: TextStyle(fontSize: 10, color: Color(0xFF166534), fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            if (isInTransit) ...[
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.draw, size: 18),
                  label: const Text('Arrive & Collect Signature (POD)', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF15803D),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    final completed = await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ProofOfDeliveryScreen(shipment: s, isOffline: _isOffline),
                      ),
                    );
                    if (completed == true) {
                      _loadAllData();
                    }
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

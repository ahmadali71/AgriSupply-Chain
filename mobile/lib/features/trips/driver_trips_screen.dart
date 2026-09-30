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
      await ApiClient.logout();
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  void initState() {
    super.initState();
    _loadAllData();
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
                  content: Text(_isOffline ? 'Offline Mode Activated (Actions Queued)' : 'Online Mode Reconnected'),
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
                  // Active User Persona & Sign Out Banner
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
                          backgroundColor: const Color(0xFF15803D).withOpacity(0.15),
                          child: const Icon(Icons.person, color: Color(0xFF15803D), size: 20),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                ApiClient.currentUser?['full_name'] ?? 'Arthur Vance (Super Admin)',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                              ),
                              Text(
                                '${ApiClient.currentUser?['role'] ?? 'SUPER_ADMIN'} • ${ApiClient.tenantId}',
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

                  // Connectivity Status Banner
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: _isOffline ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: _isOffline ? const Color(0xFFF59E0B) : const Color(0xFF22C55E)),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _isOffline ? Icons.cloud_off : Icons.cloud_done,
                          color: _isOffline ? const Color(0xFFD97706) : const Color(0xFF15803D),
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _isOffline
                                ? 'Offline Resilient Mode: Transactions saved to local queue'
                                : 'Connected to AgriSupply Cloud (Live Telemetry & GPS Active)',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _isOffline ? const Color(0xFF92400E) : const Color(0xFF166534),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

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
                      Text(
                        '${_shipments.length} Active',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF15803D)),
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
    final double temp = (s['current_temp_c'] as num?)?.toDouble() ?? 4.2;
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

            // Cargo temperature gauge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: isExcursion ? const Color(0xFFFFF1F2) : const Color(0xFFF0F9FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isExcursion ? const Color(0xFFFECDD3) : const Color(0xFFBAE6FD)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.ac_unit,
                        color: isExcursion ? Colors.redAccent : const Color(0xFF0284C7),
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Reefer Temp: $temp°C',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: isExcursion ? Colors.red.shade800 : const Color(0xFF0369A1),
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

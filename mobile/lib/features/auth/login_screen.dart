import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../trips/driver_trips_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final TextEditingController _emailController = TextEditingController(text: 'admin@agrisupply.com');
  final TextEditingController _passwordController = TextEditingController(text: 'password123');
  bool _obscurePassword = true;
  String _selectedTenant = 'tenant-greenvalley';
  bool _isLoading = false;
  String? _loadingPersonaEmail;
  String? _errorMessage;

  final List<Map<String, dynamic>> _personas = [
    {
      'role': 'SUPER_ADMIN',
      'label': 'Super Admin',
      'name': 'Arthur Vance',
      'email': 'admin@agrisupply.com',
      'duties': 'Full Platform & RBAC Control (All 27 Tabs)',
      'color': const Color(0xFF7C3AED),
      'icon': Icons.admin_panel_settings,
    },
    {
      'role': 'DRIVER',
      'label': 'Fleet Driver',
      'name': 'Elena Rostova',
      'email': 'elena.driver@agrisupply.com',
      'duties': 'Live GPS Fleet, Reefer Telemetry & Mobile POD',
      'color': const Color(0xFF0284C7),
      'icon': Icons.local_shipping,
    },
    {
      'role': 'FARMER',
      'label': 'Organic Farmer',
      'name': 'Chen Wei',
      'email': 'farmer.chen@agrisupply.com',
      'duties': 'Harvest Batches, Field Crops & Inspections',
      'color': const Color(0xFF15803D),
      'icon': Icons.eco,
    },
    {
      'role': 'WAREHOUSE_MANAGER',
      'label': 'Cold-Hub Lead',
      'name': 'Marcus Vance',
      'email': 'marcus.warehouse@agrisupply.com',
      'duties': 'Cold Chambers, FEFO Storage & Inbound Logistics',
      'color': const Color(0xFF2563EB),
      'icon': Icons.warehouse,
    },
    {
      'role': 'RETAILER',
      'label': 'Produce Retailer',
      'name': 'FreshMarket Store',
      'email': 'retailer@freshmarket.com',
      'duties': 'Commercial Orders, Quality Audits & Invoices',
      'color': const Color(0xFFD97706),
      'icon': Icons.storefront,
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleFastLogin(String email, String role) async {
    setState(() {
      _loadingPersonaEmail = email;
      _errorMessage = null;
    });

    final res = await ApiClient.login(email, 'password123', _selectedTenant);

    if (!mounted) return;

    if (res['success'] == true) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const DriverTripsScreen()),
      );
    } else {
      setState(() {
        _loadingPersonaEmail = null;
        _errorMessage = res['error'] ?? 'Sign in failed';
      });
    }
  }

  Future<void> _handleManualLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = 'Please enter both email and password');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await ApiClient.login(email, password, _selectedTenant);

    if (!mounted) return;

    setState(() => _isLoading = false);

    if (res['success'] == true) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const DriverTripsScreen()),
      );
    } else {
      setState(() {
        _errorMessage = res['error'] ?? 'Invalid email or password';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Dark slate theme
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // App Logo and Brand
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF15803D).withOpacity(0.15),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFF15803D).withOpacity(0.4), width: 2),
                  ),
                  child: const Icon(
                    Icons.ac_unit,
                    size: 42,
                    color: Color(0xFF4ADE80),
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'AgriSupply Mobile',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Smart Cold-Chain Operations & Live Telemetry',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF94A3B8),
                  ),
                ),
                const SizedBox(height: 24),

                // Tab Switcher (1-Tap Fast vs Credentials)
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: TabBar(
                    controller: _tabController,
                    indicatorSize: TabBarIndicatorSize.tab,
                    dividerColor: Colors.transparent,
                    indicator: BoxDecoration(
                      color: const Color(0xFF15803D),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    labelColor: Colors.white,
                    unselectedLabelColor: const Color(0xFF94A3B8),
                    labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    tabs: const [
                      Tab(
                        icon: Icon(Icons.flash_on, size: 18),
                        text: '1-Tap Fast Login',
                      ),
                      Tab(
                        icon: Icon(Icons.key, size: 18),
                        text: 'Credentials',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // Error Message Banner
                if (_errorMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF7F1D1D).withOpacity(0.5),
                      border: Border.all(color: const Color(0xFFDC2626)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Color(0xFFFCA5A5), size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Tab Contents
                SizedBox(
                  height: 400,
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      // Tab 1: 1-Tap Fast Persona Logins
                      _buildFastLoginTab(),

                      // Tab 2: Manual Credentials Form
                      _buildCredentialsTab(),
                    ],
                  ),
                ),

                const SizedBox(height: 16),
                const Text(
                  'Connected to AgriSupply Cloud • 256-bit TLS Encrypted',
                  style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFastLoginTab() {
    return ListView.separated(
      physics: const BouncingScrollPhysics(),
      itemCount: _personas.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final persona = _personas[index];
        final isThisLoading = _loadingPersonaEmail == persona['email'];
        final Color cardColor = persona['color'] as Color;

        return Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: _loadingPersonaEmail != null
                ? null
                : () => _handleFastLogin(persona['email'] as String, persona['role'] as String),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cardColor.withOpacity(0.4)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: cardColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(persona['icon'] as IconData, color: cardColor, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              persona['label'] as String,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '• ${persona['name']}',
                              style: const TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          persona['duties'] as String,
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 10,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  if (isThisLoading)
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  else
                    const Icon(Icons.arrow_forward_ios, color: Color(0xFF64748B), size: 14),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildCredentialsTab() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Tenant Selector
          const Text('ORGANIZATION TENANT', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedTenant,
                dropdownColor: const Color(0xFF1E293B),
                isExpanded: true,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                icon: const Icon(Icons.expand_more, color: Color(0xFF94A3B8)),
                items: const [
                  DropdownMenuItem(value: 'tenant-greenvalley', child: Text('GreenValley Agro Logistics')),
                  DropdownMenuItem(value: 'tenant-freshdirect', child: Text('FreshDirect Highlands Co.')),
                  DropdownMenuItem(value: 'tenant-nordicfrost', child: Text('Nordic Frost Sub-Zero')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _selectedTenant = val);
                },
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Email
          const Text('WORK EMAIL', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          TextField(
            controller: _emailController,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.mail_outline, color: Color(0xFF64748B), size: 18),
              hintText: 'admin@agrisupply.com',
              hintStyle: const TextStyle(color: Color(0xFF475569)),
              filled: true,
              fillColor: const Color(0xFF0F172A),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF334155))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF334155))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF15803D), width: 1.5)),
            ),
          ),
          const SizedBox(height: 14),

          // Password
          const Text('PASSWORD', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          TextField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF64748B), size: 18),
              suffixIcon: IconButton(
                icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: const Color(0xFF64748B), size: 18),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
              hintText: '••••••••••••',
              hintStyle: const TextStyle(color: Color(0xFF475569)),
              filled: true,
              fillColor: const Color(0xFF0F172A),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF334155))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF334155))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF15803D), width: 1.5)),
            ),
          ),
          const Spacer(),

          // Submit Button
          ElevatedButton(
            onPressed: _isLoading ? null : _handleManualLogin,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF15803D),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 4,
            ),
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)),
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.login, size: 18),
                      SizedBox(width: 8),
                      Text('Sign In to AgriSupply Cloud', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

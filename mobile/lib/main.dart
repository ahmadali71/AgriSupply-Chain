import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/api_client.dart';
import 'features/auth/login_screen.dart';
import 'features/trips/driver_trips_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final isLoggedIn = await ApiClient.restoreSession();
  runApp(ProviderScope(child: AgriSupplyMobileApp(isLoggedIn: isLoggedIn)));
}

class AgriSupplyMobileApp extends StatelessWidget {
  final bool isLoggedIn;
  const AgriSupplyMobileApp({super.key, required this.isLoggedIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AgriSupply Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF15803D),
          primary: const Color(0xFF15803D),
          secondary: const Color(0xFF0284C7),
        ),
        useMaterial3: true,
      ),
      home: isLoggedIn ? const DriverTripsScreen() : const LoginScreen(),
    );
  }
}

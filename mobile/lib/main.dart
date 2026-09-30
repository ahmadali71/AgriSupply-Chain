import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'features/trips/driver_trips_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: AgriSupplyMobileApp()));
}

class AgriSupplyMobileApp extends StatelessWidget {
  const AgriSupplyMobileApp({super.key});

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
      home: const DriverTripsScreen(),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'config/config_loader.dart';
import 'constants/theme_constants.dart';
import 'screens/chart_screen.dart';

void main() async {
  // Ensure Flutter is initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Load configuration from config.yaml
  await ConfigLoader.load();

  // Run the app
  runApp(const EquityAnalyzerApp());
}

/// Main application widget
class EquityAnalyzerApp extends StatelessWidget {
  const EquityAnalyzerApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: ConfigLoader.getString('app.name', defaultValue: 'Equity Analyzer'),
      debugShowCheckedModeBanner: false,
      theme: ThemeConstants.darkTheme,
      home: const ChartScreen(),
    );
  }
}

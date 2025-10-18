import 'package:flutter/material.dart';
import '../config/config_loader.dart';

/// Theme constants loaded from configuration
class ThemeConstants {
  // Prevent instantiation
  ThemeConstants._();

  /// Parse hex color string to Color object
  static Color _parseColor(String hexColor, {Color fallback = Colors.white}) {
    try {
      // Remove # if present
      String hex = hexColor.replaceAll('#', '');

      // Add alpha channel if not present
      if (hex.length == 6) {
        hex = 'FF$hex';
      }

      return Color(int.parse(hex, radix: 16));
    } catch (e) {
      return fallback;
    }
  }

  /// TradingView-inspired dark theme background
  static Color get backgroundColor => _parseColor(
        ConfigLoader.getString('chart.background_color', defaultValue: '#131722'),
        fallback: const Color(0xFF131722),
      );

  /// Grid color for chart
  static Color get gridColor => _parseColor(
        ConfigLoader.getString('chart.grid_color', defaultValue: '#1E2330'),
        fallback: const Color(0xFF1E2330),
      );

  /// Text color
  static Color get textColor => _parseColor(
        ConfigLoader.getString('chart.text_color', defaultValue: '#D1D4DC'),
        fallback: const Color(0xFFD1D4DC),
      );

  /// Bullish candle color (green)
  static Color get bullColor => _parseColor(
        ConfigLoader.getString('chart.candlestick.bull_color', defaultValue: '#26A69A'),
        fallback: const Color(0xFF26A69A),
      );

  /// Bearish candle color (red)
  static Color get bearColor => _parseColor(
        ConfigLoader.getString('chart.candlestick.bear_color', defaultValue: '#EF5350'),
        fallback: const Color(0xFFEF5350),
      );

  /// Get Fibonacci level colors from configuration
  static Map<String, Color> get fibonacciColors {
    final Map<String, dynamic> colors = ConfigLoader.getMap('fibonacci.colors');
    return {
      'level_0': _parseColor(colors['level_0']?.toString() ?? '#FF0000', fallback: Colors.red),
      'level_236': _parseColor(colors['level_236']?.toString() ?? '#FFA500', fallback: Colors.orange),
      'level_382': _parseColor(colors['level_382']?.toString() ?? '#FFFF00', fallback: Colors.yellow),
      'level_50': _parseColor(colors['level_50']?.toString() ?? '#00FF00', fallback: Colors.green),
      'level_618': _parseColor(colors['level_618']?.toString() ?? '#00FFFF', fallback: Colors.cyan),
      'level_786': _parseColor(colors['level_786']?.toString() ?? '#0000FF', fallback: Colors.blue),
      'level_100': _parseColor(colors['level_100']?.toString() ?? '#FF00FF', fallback: Colors.purple),
    };
  }

  /// Get ThemeData for the application
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: backgroundColor,
      primaryColor: const Color(0xFF2962FF),
      colorScheme: ColorScheme.dark(
        primary: const Color(0xFF2962FF),
        secondary: const Color(0xFF00BCD4),
        surface: backgroundColor,
        background: backgroundColor,
        error: bearColor,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: backgroundColor,
        foregroundColor: textColor,
        elevation: 0,
      ),
      textTheme: TextTheme(
        bodyLarge: TextStyle(color: textColor),
        bodyMedium: TextStyle(color: textColor),
        bodySmall: TextStyle(color: textColor.withOpacity(0.7)),
        headlineMedium: TextStyle(color: textColor, fontWeight: FontWeight.bold),
      ),
      cardTheme: CardThemeData(
        color: gridColor,
        elevation: 0,
      ),
      dividerColor: gridColor,
    );
  }
}

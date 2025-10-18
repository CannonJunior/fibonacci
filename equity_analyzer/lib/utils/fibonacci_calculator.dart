import 'package:flutter/material.dart';
import '../models/fibonacci_level.dart';
import '../models/candle_data.dart';
import '../config/config_loader.dart';
import '../constants/theme_constants.dart';

/// Utility class for calculating Fibonacci retracement levels
class FibonacciCalculator {
  // Prevent instantiation
  FibonacciCalculator._();

  /// Standard Fibonacci ratios used in technical analysis
  static List<double> get fibonacciRatios {
    return ConfigLoader.getList('fibonacci.levels', defaultValue: [
      0.0,
      0.236,
      0.382,
      0.5,
      0.618,
      0.786,
      1.0,
    ]).map((e) => e is double ? e : double.parse(e.toString())).toList();
  }

  /// Get color for a specific Fibonacci level
  static Color getColorForLevel(double ratio) {
    final Map<String, Color> colors = ThemeConstants.fibonacciColors;

    // Reason: Map ratio to color key based on percentage
    if (ratio == 0.0) return colors['level_0']!;
    if (ratio == 0.236) return colors['level_236']!;
    if (ratio == 0.382) return colors['level_382']!;
    if (ratio == 0.5) return colors['level_50']!;
    if (ratio == 0.618) return colors['level_618']!;
    if (ratio == 0.786) return colors['level_786']!;
    if (ratio == 1.0) return colors['level_100']!;

    // Default to white for custom levels
    return Colors.white;
  }

  /// Calculate Fibonacci retracement levels between two prices
  ///
  /// Parameters:
  /// - swingHigh: The highest price point
  /// - swingLow: The lowest price point
  /// - isUptrend: True if analyzing an uptrend (draw from low to high)
  ///
  /// Returns a FibonacciRetracement object with calculated levels
  static FibonacciRetracement calculateRetracement({
    required double swingHigh,
    required double swingLow,
    required DateTime highDate,
    required DateTime lowDate,
    bool isUptrend = true,
  }) {
    // Reason: Ensure swingHigh is always greater than swingLow
    if (swingHigh < swingLow) {
      throw ArgumentError('Swing high must be greater than swing low');
    }

    final double range = swingHigh - swingLow;
    final List<FibonacciLevel> levels = [];

    // Calculate each Fibonacci level
    for (final double ratio in fibonacciRatios) {
      // Reason: In uptrend, retracement is from high down; in downtrend, from low up
      final double price = isUptrend
          ? swingHigh - (range * ratio)
          : swingLow + (range * ratio);

      levels.add(FibonacciLevel(
        ratio: ratio,
        price: price,
        label: '${(ratio * 100).toStringAsFixed(1)}%',
        color: getColorForLevel(ratio),
      ));
    }

    return FibonacciRetracement(
      swingHigh: swingHigh,
      swingLow: swingLow,
      highDate: highDate,
      lowDate: lowDate,
      levels: levels,
      isUptrend: isUptrend,
    );
  }

  /// Find swing high and low from candle data
  ///
  /// Parameters:
  /// - candles: List of candle data
  /// - lookbackPeriod: Number of candles to look back (default: all candles)
  ///
  /// Returns a tuple of (swingHigh, swingLow, highDate, lowDate)
  static ({
    double swingHigh,
    double swingLow,
    DateTime highDate,
    DateTime lowDate,
  }) findSwingPoints(List<CandleData> candles, {int? lookbackPeriod}) {
    if (candles.isEmpty) {
      throw ArgumentError('Candle list cannot be empty');
    }

    // Determine which candles to analyze
    final List<CandleData> analyzeCandles = lookbackPeriod != null && lookbackPeriod < candles.length
        ? candles.sublist(candles.length - lookbackPeriod)
        : candles;

    // Find highest and lowest points
    CandleData highestCandle = analyzeCandles.first;
    CandleData lowestCandle = analyzeCandles.first;

    for (final CandleData candle in analyzeCandles) {
      if (candle.high > highestCandle.high) {
        highestCandle = candle;
      }
      if (candle.low < lowestCandle.low) {
        lowestCandle = candle;
      }
    }

    return (
      swingHigh: highestCandle.high,
      swingLow: lowestCandle.low,
      highDate: highestCandle.date,
      lowDate: lowestCandle.date,
    );
  }

  /// Calculate Fibonacci retracement automatically from candle data
  ///
  /// This method finds swing points and calculates retracement levels
  ///
  /// Parameters:
  /// - candles: List of candle data
  /// - lookbackPeriod: Number of candles to analyze (default: all)
  ///
  /// Returns a FibonacciRetracement object
  static FibonacciRetracement calculateFromCandles(
    List<CandleData> candles, {
    int? lookbackPeriod,
  }) {
    final swingPoints = findSwingPoints(candles, lookbackPeriod: lookbackPeriod);

    // Reason: Determine trend by comparing dates of high and low
    // If high came after low, it's an uptrend; otherwise, downtrend
    final bool isUptrend = swingPoints.highDate.isAfter(swingPoints.lowDate);

    return calculateRetracement(
      swingHigh: swingPoints.swingHigh,
      swingLow: swingPoints.swingLow,
      highDate: swingPoints.highDate,
      lowDate: swingPoints.lowDate,
      isUptrend: isUptrend,
    );
  }

  /// Calculate Fibonacci extension levels (for target prices)
  ///
  /// Extension levels: 1.272, 1.414, 1.618, 2.0, 2.618
  static List<FibonacciLevel> calculateExtensions({
    required double swingHigh,
    required double swingLow,
    bool isUptrend = true,
  }) {
    final double range = swingHigh - swingLow;
    final List<double> extensionRatios = [1.272, 1.414, 1.618, 2.0, 2.618];
    final List<FibonacciLevel> extensions = [];

    for (final double ratio in extensionRatios) {
      // Reason: Extensions project beyond the original move
      final double price = isUptrend
          ? swingHigh + (range * (ratio - 1.0))
          : swingLow - (range * (ratio - 1.0));

      extensions.add(FibonacciLevel(
        ratio: ratio,
        price: price,
        label: '${(ratio * 100).toStringAsFixed(1)}%',
        color: Colors.purple.withOpacity(0.7),
      ));
    }

    return extensions;
  }

  /// Check if a price is near a Fibonacci level (within tolerance)
  ///
  /// Parameters:
  /// - price: Current price to check
  /// - level: Fibonacci level to compare against
  /// - tolerancePercent: Percentage tolerance (default: 0.5%)
  ///
  /// Returns true if price is within tolerance of the level
  static bool isPriceNearLevel(
    double price,
    FibonacciLevel level, {
    double tolerancePercent = 0.5,
  }) {
    final double tolerance = level.price * (tolerancePercent / 100.0);
    final double difference = (price - level.price).abs();
    return difference <= tolerance;
  }
}

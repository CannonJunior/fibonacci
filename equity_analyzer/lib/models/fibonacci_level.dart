import 'package:flutter/material.dart';

/// Model representing a single Fibonacci retracement level
class FibonacciLevel {
  final double ratio;
  final double price;
  final String label;
  final Color color;

  FibonacciLevel({
    required this.ratio,
    required this.price,
    required this.label,
    required this.color,
  });

  /// Get percentage string (e.g., "23.6%", "61.8%")
  String get percentageLabel => '${(ratio * 100).toStringAsFixed(1)}%';

  /// Get formatted price label
  String get priceLabel => '\$${price.toStringAsFixed(2)}';

  /// Get complete label for display
  String get displayLabel => '$percentageLabel - $priceLabel';

  @override
  String toString() {
    return 'FibonacciLevel(ratio: $ratio, price: $price, label: $label)';
  }
}

/// Model for complete Fibonacci retracement analysis
class FibonacciRetracement {
  final double swingHigh;
  final double swingLow;
  final DateTime highDate;
  final DateTime lowDate;
  final List<FibonacciLevel> levels;
  final bool isUptrend; // true if drawn from low to high

  FibonacciRetracement({
    required this.swingHigh,
    required this.swingLow,
    required this.highDate,
    required this.lowDate,
    required this.levels,
    required this.isUptrend,
  });

  /// Get the price range for the retracement
  double get range => swingHigh - swingLow;

  /// Get the direction label
  String get directionLabel => isUptrend ? 'Uptrend' : 'Downtrend';

  @override
  String toString() {
    return 'FibonacciRetracement(high: $swingHigh, low: $swingLow, range: $range, direction: $directionLabel)';
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:equity_analyzer/utils/fibonacci_calculator.dart';
import 'package:equity_analyzer/models/fibonacci_level.dart';
import 'package:equity_analyzer/models/candle_data.dart';

void main() {
  group('FibonacciCalculator Tests', () {
    test('Calculate retracement levels for uptrend', () {
      // Arrange
      const double swingHigh = 200.0;
      const double swingLow = 100.0;
      final DateTime highDate = DateTime(2025, 1, 15);
      final DateTime lowDate = DateTime(2025, 1, 1);

      // Act
      final FibonacciRetracement result = FibonacciCalculator.calculateRetracement(
        swingHigh: swingHigh,
        swingLow: swingLow,
        highDate: highDate,
        lowDate: lowDate,
        isUptrend: true,
      );

      // Assert
      expect(result.swingHigh, equals(200.0));
      expect(result.swingLow, equals(100.0));
      expect(result.range, equals(100.0));
      expect(result.isUptrend, isTrue);
      expect(result.levels.length, greaterThan(0));

      // Check specific Fibonacci levels
      final level236 = result.levels.firstWhere((l) => l.ratio == 0.236);
      expect(level236.price, closeTo(176.4, 0.1)); // 200 - (100 * 0.236)

      final level618 = result.levels.firstWhere((l) => l.ratio == 0.618);
      expect(level618.price, closeTo(138.2, 0.1)); // 200 - (100 * 0.618)
    });

    test('Calculate retracement levels for downtrend', () {
      // Arrange
      const double swingHigh = 200.0;
      const double swingLow = 100.0;
      final DateTime highDate = DateTime(2025, 1, 1);
      final DateTime lowDate = DateTime(2025, 1, 15);

      // Act
      final FibonacciRetracement result = FibonacciCalculator.calculateRetracement(
        swingHigh: swingHigh,
        swingLow: swingLow,
        highDate: highDate,
        lowDate: lowDate,
        isUptrend: false,
      );

      // Assert
      expect(result.isUptrend, isFalse);

      // In downtrend, levels are calculated from low upward
      final level236 = result.levels.firstWhere((l) => l.ratio == 0.236);
      expect(level236.price, closeTo(123.6, 0.1)); // 100 + (100 * 0.236)
    });

    test('Throw error when swing high is less than swing low', () {
      // Arrange
      const double swingHigh = 100.0;
      const double swingLow = 200.0;
      final DateTime date = DateTime.now();

      // Act & Assert
      expect(
        () => FibonacciCalculator.calculateRetracement(
          swingHigh: swingHigh,
          swingLow: swingLow,
          highDate: date,
          lowDate: date,
        ),
        throwsA(isA<ArgumentError>()),
      );
    });

    test('Find swing points from candle data', () {
      // Arrange
      final List<CandleData> candles = [
        CandleData(
          date: DateTime(2025, 1, 1),
          open: 100,
          high: 110,
          low: 95,
          close: 105,
          volume: 1000000,
        ),
        CandleData(
          date: DateTime(2025, 1, 2),
          open: 105,
          high: 200,
          low: 100,
          close: 190,
          volume: 1500000,
        ),
        CandleData(
          date: DateTime(2025, 1, 3),
          open: 190,
          high: 195,
          low: 150,
          close: 160,
          volume: 1200000,
        ),
      ];

      // Act
      final swingPoints = FibonacciCalculator.findSwingPoints(candles);

      // Assert
      expect(swingPoints.swingHigh, equals(200.0));
      expect(swingPoints.swingLow, equals(95.0));
      expect(swingPoints.highDate, equals(DateTime(2025, 1, 2)));
      expect(swingPoints.lowDate, equals(DateTime(2025, 1, 1)));
    });

    test('Calculate from candles automatically determines trend', () {
      // Arrange - Create uptrend data (low comes before high)
      final List<CandleData> upTrendCandles = [
        CandleData(
          date: DateTime(2025, 1, 1),
          open: 100,
          high: 110,
          low: 95,
          close: 105,
          volume: 1000000,
        ),
        CandleData(
          date: DateTime(2025, 1, 2),
          open: 105,
          high: 200,
          low: 100,
          close: 190,
          volume: 1500000,
        ),
      ];

      // Act
      final result = FibonacciCalculator.calculateFromCandles(upTrendCandles);

      // Assert
      expect(result.isUptrend, isTrue);
      expect(result.swingHigh, equals(200.0));
      expect(result.swingLow, equals(95.0));
    });

    test('Calculate Fibonacci extensions', () {
      // Arrange
      const double swingHigh = 200.0;
      const double swingLow = 100.0;

      // Act
      final extensions = FibonacciCalculator.calculateExtensions(
        swingHigh: swingHigh,
        swingLow: swingLow,
        isUptrend: true,
      );

      // Assert
      expect(extensions.length, greaterThan(0));

      // Check 1.618 extension (common target)
      final ext618 = extensions.firstWhere((e) => e.ratio == 1.618);
      expect(ext618.price, closeTo(261.8, 0.1)); // 200 + (100 * 0.618)
    });

    test('Check if price is near Fibonacci level', () {
      // Arrange
      final level = FibonacciLevel(
        ratio: 0.618,
        price: 150.0,
        label: '61.8%',
        color: const Color(0xFF00FFFF),
      );

      // Act & Assert
      expect(FibonacciCalculator.isPriceNearLevel(150.5, level), isTrue);
      expect(FibonacciCalculator.isPriceNearLevel(149.5, level), isTrue);
      expect(FibonacciCalculator.isPriceNearLevel(155.0, level), isFalse);
    });

    test('Throw error when candle list is empty', () {
      // Arrange
      final List<CandleData> emptyCandles = [];

      // Act & Assert
      expect(
        () => FibonacciCalculator.findSwingPoints(emptyCandles),
        throwsA(isA<ArgumentError>()),
      );
    });

    test('Handle lookback period correctly', () {
      // Arrange
      final List<CandleData> candles = List.generate(
        100,
        (i) => CandleData(
          date: DateTime(2025, 1, 1).add(Duration(days: i)),
          open: 100 + i.toDouble(),
          high: 110 + i.toDouble(),
          low: 95 + i.toDouble(),
          close: 105 + i.toDouble(),
          volume: 1000000,
        ),
      );

      // Act - Use lookback period of 10
      final swingPoints = FibonacciCalculator.findSwingPoints(
        candles,
        lookbackPeriod: 10,
      );

      // Assert - Should only consider last 10 candles
      expect(swingPoints.swingHigh, equals(109.0)); // Last 10 candles: high of candle 99
      expect(swingPoints.swingLow, equals(185.0)); // Last 10 candles: low of candle 90
    });
  });
}

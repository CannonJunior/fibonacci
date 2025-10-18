import 'package:flutter/material.dart';
import 'package:candlesticks/candlesticks.dart' as cs;
import '../models/stock_data.dart';
import '../models/candle_data.dart';
import '../models/fibonacci_level.dart';
import '../constants/theme_constants.dart';

/// Chart widget displaying candlestick chart with optional Fibonacci overlay
class ChartWidget extends StatelessWidget {
  final StockData stockData;
  final FibonacciRetracement? fibonacciRetracement;

  const ChartWidget({
    Key? key,
    required this.stockData,
    this.fibonacciRetracement,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Convert CandleData to candlesticks package format
    final List<cs.Candle> candles = stockData.candles.map((candle) {
      return cs.Candle(
        date: candle.date,
        high: candle.high,
        low: candle.low,
        open: candle.open,
        close: candle.close,
        volume: candle.volume,
      );
    }).toList();

    return Container(
      color: ThemeConstants.backgroundColor,
      child: Stack(
        children: [
          // Main candlestick chart
          cs.Candlesticks(
            candles: candles,
            onLoadMoreCandles: () async {
              // Reason: Could implement pagination here for loading more historical data
              return null;
            },
          ),

          // Fibonacci overlay
          if (fibonacciRetracement != null)
            CustomPaint(
              painter: FibonacciPainter(
                fibonacci: fibonacciRetracement!,
                candles: stockData.candles,
              ),
              size: Size.infinite,
            ),
        ],
      ),
    );
  }
}

/// Custom painter for drawing Fibonacci retracement levels on the chart
class FibonacciPainter extends CustomPainter {
  final FibonacciRetracement fibonacci;
  final List<CandleData> candles;

  FibonacciPainter({
    required this.fibonacci,
    required this.candles,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (candles.isEmpty) return;

    // Calculate price range for scaling
    final double highestPrice = candles.map((c) => c.high).reduce((a, b) => a > b ? a : b);
    final double lowestPrice = candles.map((c) => c.low).reduce((a, b) => a < b ? a : b);
    final double priceRange = highestPrice - lowestPrice;

    if (priceRange == 0) return;

    // Reason: Convert price to Y coordinate on canvas
    double priceToY(double price) {
      final double normalized = (highestPrice - price) / priceRange;
      return normalized * size.height;
    }

    // Draw each Fibonacci level
    for (final FibonacciLevel level in fibonacci.levels) {
      final double y = priceToY(level.price);

      // Draw horizontal line
      final Paint linePaint = Paint()
        ..color = level.color.withOpacity(0.5)
        ..strokeWidth = 1.5
        ..style = PaintingStyle.stroke;

      canvas.drawLine(
        Offset(0, y),
        Offset(size.width, y),
        linePaint,
      );

      // Draw label background
      final TextSpan span = TextSpan(
        text: level.displayLabel,
        style: TextStyle(
          color: ThemeConstants.textColor,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      );

      final TextPainter textPainter = TextPainter(
        text: span,
        textDirection: TextDirection.ltr,
      );

      textPainter.layout();

      // Background for label
      final Rect labelRect = Rect.fromLTWH(
        8,
        y - textPainter.height / 2 - 4,
        textPainter.width + 8,
        textPainter.height + 8,
      );

      final Paint labelBgPaint = Paint()
        ..color = level.color.withOpacity(0.8)
        ..style = PaintingStyle.fill;

      canvas.drawRRect(
        RRect.fromRectAndRadius(labelRect, const Radius.circular(4)),
        labelBgPaint,
      );

      // Draw text
      textPainter.paint(
        canvas,
        Offset(12, y - textPainter.height / 2),
      );
    }

    // Draw swing high and low markers
    _drawSwingMarkers(canvas, size, priceToY);
  }

  void _drawSwingMarkers(Canvas canvas, Size size, double Function(double) priceToY) {
    // Find swing high and low candle positions
    final int highIndex = candles.indexWhere((c) => c.date == fibonacci.highDate);
    final int lowIndex = candles.indexWhere((c) => c.date == fibonacci.lowDate);

    if (highIndex == -1 || lowIndex == -1) return;

    final double candleWidth = size.width / candles.length;

    // Draw swing high marker
    final double highX = highIndex * candleWidth + candleWidth / 2;
    final double highY = priceToY(fibonacci.swingHigh);

    _drawMarker(
      canvas,
      Offset(highX, highY),
      'H',
      ThemeConstants.bearColor,
    );

    // Draw swing low marker
    final double lowX = lowIndex * candleWidth + candleWidth / 2;
    final double lowY = priceToY(fibonacci.swingLow);

    _drawMarker(
      canvas,
      Offset(lowX, lowY),
      'L',
      ThemeConstants.bullColor,
    );
  }

  void _drawMarker(Canvas canvas, Offset position, String label, Color color) {
    // Draw circle
    final Paint circlePaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    canvas.drawCircle(position, 12, circlePaint);

    // Draw border
    final Paint borderPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    canvas.drawCircle(position, 12, borderPaint);

    // Draw label
    final TextSpan span = TextSpan(
      text: label,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 10,
        fontWeight: FontWeight.bold,
      ),
    );

    final TextPainter textPainter = TextPainter(
      text: span,
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
    );

    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(
        position.dx - textPainter.width / 2,
        position.dy - textPainter.height / 2,
      ),
    );
  }

  @override
  bool shouldRepaint(FibonacciPainter oldDelegate) {
    return fibonacci != oldDelegate.fibonacci || candles != oldDelegate.candles;
  }
}

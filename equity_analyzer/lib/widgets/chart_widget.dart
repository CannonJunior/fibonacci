import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
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
    if (stockData.candles.isEmpty) {
      return Center(
        child: Text(
          'No data available',
          style: TextStyle(color: ThemeConstants.textColor),
        ),
      );
    }

    return Container(
      color: ThemeConstants.backgroundColor,
      padding: const EdgeInsets.all(16),
      child: Stack(
        children: [
          // Main candlestick chart using fl_chart
          _buildCandlestickChart(),

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

  Widget _buildCandlestickChart() {
    final candles = stockData.candles;

    // Calculate min and max prices for Y-axis
    final double minPrice = candles.map((c) => c.low).reduce((a, b) => a < b ? a : b);
    final double maxPrice = candles.map((c) => c.high).reduce((a, b) => a > b ? a : b);
    final double priceRange = maxPrice - minPrice;
    final double padding = priceRange * 0.1; // 10% padding

    // Create candlestick data groups
    final List<BarChartGroupData> barGroups = [];
    for (int i = 0; i < candles.length; i++) {
      final candle = candles[i];
      final bool isBullish = candle.close >= candle.open;
      final Color candleColor = isBullish ? ThemeConstants.bullColor : ThemeConstants.bearColor;

      // Reason: Use BarChart to create candlestick-like visualization
      // Each candle is represented as a bar with high-low range
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              fromY: candle.low,
              toY: candle.high,
              color: candleColor.withOpacity(0.3),
              width: 1,
            ),
            BarChartRodData(
              fromY: candle.open < candle.close ? candle.open : candle.close,
              toY: candle.open < candle.close ? candle.close : candle.open,
              color: candleColor,
              width: 6,
            ),
          ],
        ),
      );
    }

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        minY: minPrice - padding,
        maxY: maxPrice + padding,
        groupsSpace: 2,
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            getTooltipColor: (group) => ThemeConstants.gridColor,
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              if (groupIndex < 0 || groupIndex >= candles.length) {
                return null;
              }
              final candle = candles[groupIndex];
              final dateStr = DateFormat('MM/dd/yyyy').format(candle.date);
              return BarTooltipItem(
                '$dateStr\n'
                'O: \$${candle.open.toStringAsFixed(2)}\n'
                'H: \$${candle.high.toStringAsFixed(2)}\n'
                'L: \$${candle.low.toStringAsFixed(2)}\n'
                'C: \$${candle.close.toStringAsFixed(2)}',
                TextStyle(
                  color: ThemeConstants.textColor,
                  fontSize: 10,
                ),
              );
            },
          ),
        ),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: true,
          horizontalInterval: priceRange / 5,
          verticalInterval: (candles.length / 10).ceilToDouble(),
          getDrawingHorizontalLine: (value) {
            return FlLine(
              color: ThemeConstants.gridColor,
              strokeWidth: 1,
            );
          },
          getDrawingVerticalLine: (value) {
            return FlLine(
              color: ThemeConstants.gridColor.withOpacity(0.3),
              strokeWidth: 1,
            );
          },
        ),
        titlesData: FlTitlesData(
          show: true,
          // Bottom axis (dates) - shows dates from left (oldest) to right (newest)
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 32,
              interval: (candles.length / 5).ceilToDouble(),
              getTitlesWidget: (value, meta) {
                final index = value.toInt();
                if (index < 0 || index >= candles.length) {
                  return const Text('');
                }

                // Reason: Display dates in chronological order (oldest left, newest right)
                final date = candles[index].date;
                final dateStr = DateFormat('MM/dd').format(date);

                return Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    dateStr,
                    style: TextStyle(
                      color: ThemeConstants.textColor,
                      fontSize: 10,
                    ),
                  ),
                );
              },
            ),
          ),
          // Left axis (prices)
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 60,
              interval: priceRange / 5,
              getTitlesWidget: (value, meta) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: Text(
                    '\$${value.toStringAsFixed(2)}',
                    style: TextStyle(
                      color: ThemeConstants.textColor,
                      fontSize: 10,
                    ),
                  ),
                );
              },
            ),
          ),
          // Hide top and right titles
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
        ),
        borderData: FlBorderData(
          show: true,
          border: Border.all(color: ThemeConstants.gridColor),
        ),
        barGroups: barGroups,
        extraLinesData: ExtraLinesData(
          horizontalLines: _buildFibonacciLines(),
        ),
      ),
      swapAnimationDuration: const Duration(milliseconds: 250),
    );
  }

  List<HorizontalLine> _buildFibonacciLines() {
    if (fibonacciRetracement == null) return [];

    return fibonacciRetracement!.levels.map((level) {
      return HorizontalLine(
        y: level.price,
        color: level.color.withOpacity(0.5),
        strokeWidth: 1.5,
        dashArray: [5, 5],
        label: HorizontalLineLabel(
          show: true,
          alignment: Alignment.topRight,
          padding: const EdgeInsets.all(4),
          style: TextStyle(
            color: ThemeConstants.textColor,
            fontSize: 10,
            fontWeight: FontWeight.bold,
          ),
          labelResolver: (line) => level.displayLabel,
        ),
      );
    }).toList();
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
        textAlign: TextAlign.left,
        textDirection: ui.TextDirection.ltr,
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
      textDirection: ui.TextDirection.ltr,
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

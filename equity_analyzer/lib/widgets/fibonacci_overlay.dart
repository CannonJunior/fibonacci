import 'package:flutter/material.dart';
import '../models/fibonacci_level.dart';
import '../constants/theme_constants.dart';

/// Widget displaying Fibonacci retracement levels information panel
class FibonacciOverlay extends StatelessWidget {
  final FibonacciRetracement fibonacci;

  const FibonacciOverlay({
    Key? key,
    required this.fibonacci,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: ThemeConstants.gridColor,
        border: Border(
          top: BorderSide(color: ThemeConstants.gridColor.withOpacity(0.5)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Icon(
                  Icons.show_chart,
                  color: ThemeConstants.bullColor,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'Fibonacci Retracement Levels',
                  style: TextStyle(
                    color: ThemeConstants.textColor,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: fibonacci.isUptrend
                        ? ThemeConstants.bullColor.withOpacity(0.2)
                        : ThemeConstants.bearColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    fibonacci.directionLabel,
                    style: TextStyle(
                      color: fibonacci.isUptrend ? ThemeConstants.bullColor : ThemeConstants.bearColor,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Swing points info
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                _buildSwingInfo('High', fibonacci.swingHigh, ThemeConstants.bearColor),
                const SizedBox(width: 24),
                _buildSwingInfo('Low', fibonacci.swingLow, ThemeConstants.bullColor),
                const SizedBox(width: 24),
                _buildSwingInfo('Range', fibonacci.range, ThemeConstants.textColor),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Fibonacci levels list
          Expanded(
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: fibonacci.levels.length,
              itemBuilder: (context, index) {
                final FibonacciLevel level = fibonacci.levels[index];
                return _buildLevelCard(level);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSwingInfo(String label, double value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: ThemeConstants.textColor.withOpacity(0.7),
            fontSize: 11,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          '\$${value.toStringAsFixed(2)}',
          style: TextStyle(
            color: color,
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildLevelCard(FibonacciLevel level) {
    // Reason: Highlight the golden ratio (61.8%) as it's the most important level
    final bool isGolden = level.ratio == 0.618;

    return Container(
      width: 120,
      margin: const EdgeInsets.only(right: 8, bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: level.color.withOpacity(0.15),
        border: Border.all(
          color: level.color,
          width: isGolden ? 2 : 1,
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: level.color,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                level.percentageLabel,
                style: TextStyle(
                  color: level.color,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (isGolden) ...[
                const SizedBox(width: 4),
                Icon(
                  Icons.star,
                  color: level.color,
                  size: 14,
                ),
              ],
            ],
          ),
          const SizedBox(height: 6),
          Text(
            level.priceLabel,
            style: TextStyle(
              color: ThemeConstants.textColor,
              fontSize: 14,
            ),
          ),
          if (isGolden)
            Text(
              'Golden Ratio',
              style: TextStyle(
                color: level.color.withOpacity(0.8),
                fontSize: 10,
                fontStyle: FontStyle.italic,
              ),
            ),
        ],
      ),
    );
  }
}

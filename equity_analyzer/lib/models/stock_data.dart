import 'candle_data.dart';

/// Model for stock market data
class StockData {
  final String symbol;
  final String name;
  final List<CandleData> candles;
  final DateTime lastUpdated;

  StockData({
    required this.symbol,
    required this.name,
    required this.candles,
    required this.lastUpdated,
  });

  /// Get the latest candle
  CandleData? get latestCandle => candles.isNotEmpty ? candles.last : null;

  /// Get the highest price in the dataset
  double get highestPrice {
    if (candles.isEmpty) return 0.0;
    return candles.map((c) => c.high).reduce((a, b) => a > b ? a : b);
  }

  /// Get the lowest price in the dataset
  double get lowestPrice {
    if (candles.isEmpty) return 0.0;
    return candles.map((c) => c.low).reduce((a, b) => a < b ? a : b);
  }

  /// Get current price (latest close)
  double get currentPrice => latestCandle?.close ?? 0.0;

  /// Get price change from first to last candle
  double get priceChange {
    if (candles.length < 2) return 0.0;
    return candles.last.close - candles.first.open;
  }

  /// Get percentage change
  double get percentageChange {
    if (candles.isEmpty || candles.first.open == 0) return 0.0;
    return (priceChange / candles.first.open) * 100;
  }

  /// Check if stock is trending up
  bool get isUptrend => priceChange > 0;

  /// Get date range of data
  String get dateRange {
    if (candles.isEmpty) return 'No data';
    return '${candles.first.date.toString().split(' ')[0]} - ${candles.last.date.toString().split(' ')[0]}';
  }

  @override
  String toString() {
    return 'StockData(symbol: $symbol, name: $name, candles: ${candles.length}, lastUpdated: $lastUpdated)';
  }
}

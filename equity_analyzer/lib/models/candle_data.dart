/// Model for candlestick data representing OHLC (Open, High, Low, Close) values
class CandleData {
  final DateTime date;
  final double open;
  final double high;
  final double low;
  final double close;
  final double volume;

  CandleData({
    required this.date,
    required this.open,
    required this.high,
    required this.low,
    required this.close,
    required this.volume,
  });

  /// Create CandleData from JSON (Alpha Vantage format)
  factory CandleData.fromJson(String dateStr, Map<String, dynamic> json) {
    return CandleData(
      date: DateTime.parse(dateStr),
      open: double.parse(json['1. open'].toString()),
      high: double.parse(json['2. high'].toString()),
      low: double.parse(json['3. low'].toString()),
      close: double.parse(json['4. close'].toString()),
      volume: double.parse(json['5. volume'].toString()),
    );
  }

  /// Check if candle is bullish (close > open)
  bool get isBullish => close >= open;

  /// Get candle body size (absolute difference between open and close)
  double get bodySize => (close - open).abs();

  /// Get candle range (high - low)
  double get range => high - low;

  /// Convert to map for debugging
  Map<String, dynamic> toMap() {
    return {
      'date': date.toIso8601String(),
      'open': open,
      'high': high,
      'low': low,
      'close': close,
      'volume': volume,
      'isBullish': isBullish,
    };
  }

  @override
  String toString() {
    return 'CandleData(date: $date, open: $open, high: $high, low: $low, close: $close, volume: $volume)';
  }
}

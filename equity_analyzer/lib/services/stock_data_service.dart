import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/stock_data.dart';
import '../models/candle_data.dart';
import '../config/config_loader.dart';

/// Service for fetching real-time stock data from various APIs
class StockDataService {
  final String apiProvider;
  final String apiKey;
  final String baseUrl;

  StockDataService({
    String? provider,
    String? key,
    String? url,
  })  : apiProvider = provider ?? ConfigLoader.getString('api.provider', defaultValue: 'alpha_vantage'),
        apiKey = key ??
            ConfigLoader.getString(
              'api.${provider ?? ConfigLoader.getString('api.provider', defaultValue: 'alpha_vantage')}.api_key',
              defaultValue: 'demo',
            ),
        baseUrl = url ??
            ConfigLoader.getString(
              'api.${provider ?? ConfigLoader.getString('api.provider', defaultValue: 'alpha_vantage')}.base_url',
              defaultValue: 'https://www.alphavantage.co/query',
            );

  /// Fetch daily stock data from Alpha Vantage
  ///
  /// Parameters:
  /// - symbol: Stock ticker symbol (e.g., 'AAPL')
  /// - outputSize: 'compact' (100 data points) or 'full' (20+ years)
  ///
  /// Returns StockData object with historical candles
  Future<StockData> fetchDailyData(
    String symbol, {
    String outputSize = 'compact',
  }) async {
    if (apiProvider == 'alpha_vantage') {
      return _fetchAlphaVantageDaily(symbol, outputSize: outputSize);
    } else if (apiProvider == 'finnhub') {
      return _fetchFinnhubDaily(symbol);
    } else {
      throw UnsupportedError('API provider $apiProvider is not supported');
    }
  }

  /// Fetch intraday stock data from Alpha Vantage
  ///
  /// Parameters:
  /// - symbol: Stock ticker symbol
  /// - interval: Time interval ('1min', '5min', '15min', '30min', '60min')
  ///
  /// Returns StockData object with intraday candles
  Future<StockData> fetchIntradayData(
    String symbol, {
    String interval = '5min',
  }) async {
    if (apiProvider == 'alpha_vantage') {
      return _fetchAlphaVantageIntraday(symbol, interval: interval);
    } else {
      throw UnsupportedError('Intraday data not implemented for $apiProvider');
    }
  }

  /// Private method: Fetch daily data from Alpha Vantage API
  Future<StockData> _fetchAlphaVantageDaily(
    String symbol, {
    String outputSize = 'compact',
  }) async {
    // Reason: Alpha Vantage uses specific query parameters for TIME_SERIES_DAILY
    final Uri uri = Uri.parse(baseUrl).replace(queryParameters: {
      'function': 'TIME_SERIES_DAILY',
      'symbol': symbol,
      'outputsize': outputSize,
      'apikey': apiKey,
    });

    try {
      final http.Response response = await http.get(uri);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);

        // Check for API error messages
        if (data.containsKey('Error Message')) {
          throw Exception('API Error: ${data['Error Message']}');
        }

        if (data.containsKey('Note')) {
          throw Exception('API Rate Limit: ${data['Note']}');
        }

        // Parse metadata
        final Map<String, dynamic>? metaData = data['Meta Data'];
        if (metaData == null) {
          throw Exception('Invalid API response: Missing Meta Data');
        }

        final String symbolFromApi = metaData['2. Symbol'];

        // Parse time series data
        final Map<String, dynamic>? timeSeries = data['Time Series (Daily)'];
        if (timeSeries == null) {
          throw Exception('Invalid API response: Missing Time Series data');
        }

        // Convert to CandleData list
        final List<CandleData> candles = [];
        timeSeries.forEach((dateStr, values) {
          candles.add(CandleData.fromJson(dateStr, values));
        });

        // Reason: Sort candles by date (oldest first)
        candles.sort((a, b) => a.date.compareTo(b.date));

        return StockData(
          symbol: symbolFromApi,
          name: symbolFromApi, // Alpha Vantage doesn't provide company name in this endpoint
          candles: candles,
          lastUpdated: DateTime.now(),
        );
      } else {
        throw Exception('HTTP Error: ${response.statusCode} - ${response.reasonPhrase}');
      }
    } catch (e) {
      throw Exception('Failed to fetch stock data: $e');
    }
  }

  /// Private method: Fetch intraday data from Alpha Vantage API
  Future<StockData> _fetchAlphaVantageIntraday(
    String symbol, {
    String interval = '5min',
  }) async {
    final Uri uri = Uri.parse(baseUrl).replace(queryParameters: {
      'function': 'TIME_SERIES_INTRADAY',
      'symbol': symbol,
      'interval': interval,
      'apikey': apiKey,
    });

    try {
      final http.Response response = await http.get(uri);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);

        if (data.containsKey('Error Message')) {
          throw Exception('API Error: ${data['Error Message']}');
        }

        if (data.containsKey('Note')) {
          throw Exception('API Rate Limit: ${data['Note']}');
        }

        final Map<String, dynamic>? metaData = data['Meta Data'];
        if (metaData == null) {
          throw Exception('Invalid API response: Missing Meta Data');
        }

        final String symbolFromApi = metaData['2. Symbol'];

        // Parse time series data
        final Map<String, dynamic>? timeSeries = data['Time Series ($interval)'];
        if (timeSeries == null) {
          throw Exception('Invalid API response: Missing Time Series data');
        }

        final List<CandleData> candles = [];
        timeSeries.forEach((dateStr, values) {
          candles.add(CandleData.fromJson(dateStr, values));
        });

        candles.sort((a, b) => a.date.compareTo(b.date));

        return StockData(
          symbol: symbolFromApi,
          name: symbolFromApi,
          candles: candles,
          lastUpdated: DateTime.now(),
        );
      } else {
        throw Exception('HTTP Error: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to fetch intraday data: $e');
    }
  }

  /// Private method: Fetch data from Finnhub API (placeholder)
  Future<StockData> _fetchFinnhubDaily(String symbol) async {
    // Reason: Finnhub API uses different endpoint structure
    throw UnimplementedError('Finnhub integration coming soon');
  }

  /// Get quote (current price) for a symbol
  Future<double> fetchCurrentPrice(String symbol) async {
    if (apiProvider == 'alpha_vantage') {
      final Uri uri = Uri.parse(baseUrl).replace(queryParameters: {
        'function': 'GLOBAL_QUOTE',
        'symbol': symbol,
        'apikey': apiKey,
      });

      try {
        final http.Response response = await http.get(uri);

        if (response.statusCode == 200) {
          final Map<String, dynamic> data = json.decode(response.body);

          if (data.containsKey('Global Quote')) {
            final Map<String, dynamic> quote = data['Global Quote'];
            return double.parse(quote['05. price']);
          }
        }

        throw Exception('Failed to fetch current price');
      } catch (e) {
        throw Exception('Error fetching current price: $e');
      }
    }

    throw UnsupportedError('Current price not implemented for $apiProvider');
  }
}

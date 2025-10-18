import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/stock_data.dart';
import '../models/fibonacci_level.dart';
import '../services/stock_data_service.dart';
import '../utils/fibonacci_calculator.dart';
import '../config/config_loader.dart';
import '../constants/theme_constants.dart';
import '../widgets/chart_widget.dart';
import '../widgets/fibonacci_overlay.dart';
import '../widgets/toolbar.dart';

/// Main screen displaying the stock chart with Fibonacci retracement tools
class ChartScreen extends StatefulWidget {
  const ChartScreen({Key? key}) : super(key: key);

  @override
  State<ChartScreen> createState() => _ChartScreenState();
}

class _ChartScreenState extends State<ChartScreen> {
  late final StockDataService _stockService;
  late final String _symbol;

  StockData? _stockData;
  FibonacciRetracement? _fibonacciRetracement;
  bool _isLoading = true;
  bool _showFibonacci = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _stockService = StockDataService();
    _symbol = ConfigLoader.getString('stock.default_symbol', defaultValue: 'AAPL');
    _loadStockData();
  }

  /// Load stock data from API
  Future<void> _loadStockData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Fetch stock data
      final StockData stockData = await _stockService.fetchDailyData(_symbol);

      // Calculate Fibonacci retracement from the data
      final FibonacciRetracement fibonacci =
          FibonacciCalculator.calculateFromCandles(stockData.candles);

      setState(() {
        _stockData = stockData;
        _fibonacciRetracement = fibonacci;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString();
      });

      // Show error snackbar
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading data: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    }
  }

  /// Toggle Fibonacci overlay visibility
  void _toggleFibonacci() {
    setState(() {
      _showFibonacci = !_showFibonacci;
    });
  }

  /// Refresh stock data
  Future<void> _refresh() async {
    await _loadStockData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ThemeConstants.backgroundColor,
      appBar: AppBar(
        title: Text(
          'Equity Analyzer - ${_stockData?.symbol ?? _symbol}',
          style: TextStyle(
            color: ThemeConstants.textColor,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          // Fibonacci toggle button
          IconButton(
            icon: Icon(
              _showFibonacci ? Icons.show_chart : Icons.show_chart_outlined,
              color: _showFibonacci ? ThemeConstants.bullColor : ThemeConstants.textColor,
            ),
            onPressed: _toggleFibonacci,
            tooltip: 'Toggle Fibonacci Levels',
          ),
          // Refresh button
          IconButton(
            icon: Icon(Icons.refresh, color: ThemeConstants.textColor),
            onPressed: _isLoading ? null : _refresh,
            tooltip: 'Refresh Data',
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: ThemeConstants.bullColor),
            const SizedBox(height: 16),
            Text(
              'Loading $_symbol data...',
              style: TextStyle(color: ThemeConstants.textColor),
            ),
          ],
        ),
      );
    }

    if (_errorMessage != null || _stockData == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: ThemeConstants.bearColor),
            const SizedBox(height: 16),
            Text(
              'Failed to load stock data',
              style: TextStyle(
                color: ThemeConstants.textColor,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                _errorMessage ?? 'Unknown error',
                style: TextStyle(color: ThemeConstants.textColor.withOpacity(0.7)),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadStockData,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: ThemeConstants.bullColor,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Stock info header
        _buildStockInfo(),

        // Main chart area
        Expanded(
          child: ChartWidget(
            stockData: _stockData!,
            fibonacciRetracement: _showFibonacci ? _fibonacciRetracement : null,
          ),
        ),

        // Fibonacci levels panel
        if (_showFibonacci && _fibonacciRetracement != null)
          FibonacciOverlay(fibonacci: _fibonacciRetracement!),
      ],
    );
  }

  Widget _buildStockInfo() {
    final stockData = _stockData!;
    final currentPrice = stockData.currentPrice;
    final priceChange = stockData.priceChange;
    final percentChange = stockData.percentageChange;

    final bool isPositive = priceChange >= 0;
    final Color changeColor = isPositive ? ThemeConstants.bullColor : ThemeConstants.bearColor;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ThemeConstants.gridColor,
        border: Border(
          bottom: BorderSide(color: ThemeConstants.gridColor.withOpacity(0.5)),
        ),
      ),
      child: Row(
        children: [
          // Symbol and name
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  stockData.symbol,
                  style: TextStyle(
                    color: ThemeConstants.textColor,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  stockData.name,
                  style: TextStyle(
                    color: ThemeConstants.textColor.withOpacity(0.7),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),

          // Current price and change
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '\$${currentPrice.toStringAsFixed(2)}',
                style: TextStyle(
                  color: ThemeConstants.textColor,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    isPositive ? Icons.arrow_upward : Icons.arrow_downward,
                    color: changeColor,
                    size: 16,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${isPositive ? '+' : ''}${priceChange.toStringAsFixed(2)} (${percentChange.toStringAsFixed(2)}%)',
                    style: TextStyle(
                      color: changeColor,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

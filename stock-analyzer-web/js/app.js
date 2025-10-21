// Main application controller
const App = {
    candles: null,
    fibonacci: null,

    /**
     * Initialize the application
     */
    async init() {
        console.log('Stock Analyzer v2.0 initializing...');

        // Load API key from environment first
        await CONFIG.loadApiKey();

        // Initialize stock selector
        await StockSelector.init();

        // Initialize sidebar
        await Sidebar.init();

        // Setup event listeners
        this.setupEventListeners();

        // Load initial data
        await this.loadData();
    },

    /**
     * Setup UI event listeners
     */
    setupEventListeners() {
        // Toggle Fibonacci button
        document.getElementById('toggleFibonacci').addEventListener('click', () => {
            this.toggleFibonacci();
        });

        // Return to daily button
        document.getElementById('returnToDaily').addEventListener('click', () => {
            Chart.returnToDailyView();
        });

        // Refresh button
        document.getElementById('refreshData').addEventListener('click', () => {
            this.loadData();
        });

        // Retry button
        document.getElementById('retryBtn').addEventListener('click', () => {
            this.loadData();
        });

        // Candle click handler
        Chart.onCandleClick = (candle) => {
            this.handleCandleClick(candle);
        };

        // Window resize
        window.addEventListener('resize', () => {
            if (this.candles && this.fibonacci) {
                Chart.render(this.candles, this.fibonacci);
            }
        });

        // Setup context menu
        Chart.setupContextMenu();
    },

    /**
     * Load stock data from API
     */
    async loadData() {
        await this.loadStockData(CONFIG.stock.symbol);
    },

    /**
     * Load stock data for a specific symbol
     * @param {string} symbol - Stock symbol to load
     */
    async loadStockData(symbol) {
        this.showLoading();
        this.hideError();

        try {
            // Fetch data
            this.candles = await API.fetchDailyData(symbol);

            if (!this.candles || this.candles.length === 0) {
                throw new Error('No data received from API');
            }

            // Calculate Fibonacci
            this.fibonacci = Fibonacci.calculate(this.candles);

            // Update UI
            this.updatePriceInfo();
            this.updateDateRange();
            this.updateFibonacciPanel();

            // Render chart
            Chart.render(this.candles, this.fibonacci);

            // Update sidebar with new stock
            await Sidebar.updateAfterLoad(symbol);

            this.hideLoading();
            console.log(`Loaded ${this.candles.length} candles for ${symbol}`);
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showError(error.message);
        }
    },

    /**
     * Update price information display
     */
    updatePriceInfo() {
        if (!this.candles || this.candles.length === 0) return;

        const latestCandle = this.candles[this.candles.length - 1];
        const firstCandle = this.candles[0];

        const currentPrice = latestCandle.close;
        const priceChange = currentPrice - firstCandle.open;
        const percentChange = (priceChange / firstCandle.open) * 100;
        const isPositive = priceChange >= 0;

        // Update current price
        document.getElementById('currentPrice').textContent = `$${currentPrice.toFixed(2)}`;

        // Update price change
        const priceChangeEl = document.getElementById('priceChange');
        const changeValueEl = document.getElementById('changeValue');
        const changePercentEl = document.getElementById('changePercent');

        priceChangeEl.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
        changeValueEl.textContent = `${isPositive ? '+' : ''}$${Math.abs(priceChange).toFixed(2)}`;
        changePercentEl.textContent = `(${isPositive ? '+' : ''}${percentChange.toFixed(2)}%)`;
    },

    /**
     * Update date range display
     */
    updateDateRange() {
        if (!this.candles || this.candles.length === 0) return;

        const firstDate = API.formatDate(this.candles[0].date);
        const lastDate = API.formatDate(this.candles[this.candles.length - 1].date);

        document.getElementById('dateRange').textContent = `${firstDate} - ${lastDate}`;
    },

    /**
     * Update Fibonacci panel
     */
    updateFibonacciPanel() {
        if (!this.fibonacci) return;

        const levelsContainer = document.getElementById('fibonacciLevels');
        levelsContainer.innerHTML = '';

        this.fibonacci.levels.forEach(level => {
            const levelEl = document.createElement('div');
            levelEl.className = 'fibonacci-level';
            levelEl.style.borderLeftColor = level.color;

            levelEl.innerHTML = `
                <span class="label">${level.label}</span>
                <span class="price">$${level.price.toFixed(2)}</span>
            `;

            levelsContainer.appendChild(levelEl);
        });
    },

    /**
     * Toggle Fibonacci levels display
     */
    toggleFibonacci() {
        const panel = document.getElementById('fibonacciPanel');
        const icon = document.getElementById('fibIcon');

        if (Chart.showFibonacci) {
            panel.style.display = 'none';
            icon.textContent = '📉';
        } else {
            panel.style.display = 'block';
            icon.textContent = '📈';
        }

        Chart.toggleFibonacci();
    },

    /**
     * Handle candle click for Fibonacci recalculation
     */
    handleCandleClick(candle) {
        console.log('Candle clicked:', candle);

        // Recalculate Fibonacci from clicked point
        this.fibonacci = Fibonacci.recalculateFromClick(this.candles, candle, this.fibonacci);

        // Update UI
        this.updateFibonacciPanel();
        Chart.render(this.candles, this.fibonacci);

        // Show feedback
        this.showNotification('Fibonacci levels recalculated!');
    },

    /**
     * Show loading indicator
     */
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.querySelector('.chart-container').style.display = 'none';
        document.getElementById('priceInfo').style.display = 'none';
        document.getElementById('fibonacciPanel').style.display = 'none';
    },

    /**
     * Hide loading indicator
     */
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.querySelector('.chart-container').style.display = 'block';
        document.getElementById('priceInfo').style.display = 'flex';
        if (Chart.showFibonacci) {
            document.getElementById('fibonacciPanel').style.display = 'block';
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        this.hideLoading();

        // Enhance error message with API key instructions
        let enhancedMessage = message;
        if (message.includes('Rate Limit') || message.includes('Invalid API') || message.includes('Missing time series')) {
            enhancedMessage = `${message}\n\n⚠️ To use this application, you need a FREE Alpha Vantage API key.\n\nSteps:\n1. Visit: https://www.alphavantage.co/support/#api-key\n2. Sign up for a free key (30 seconds)\n3. Edit js/config.js and replace 'demo' with your key\n4. Refresh this page`;
        }

        document.getElementById('errorMessage').textContent = enhancedMessage;
        document.getElementById('error').style.display = 'block';
    },

    /**
     * Hide error message
     */
    hideError() {
        document.getElementById('error').style.display = 'none';
    },

    /**
     * Show temporary notification
     */
    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #1d9bf0;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
};

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Configuration for the Stock Analyzer application
const CONFIG = {
    api: {
        provider: 'multi', // Use multi-provider system
        key: null, // Alpha Vantage key - Will be loaded from environment
        finnhubKey: null, // Finnhub key - Will be loaded from environment
        baseUrl: 'https://www.alphavantage.co/query'
    },
    stock: {
        symbol: 'AAPL',
        exchange: 'NASDAQ'
    },
    fibonacci: {
        levels: [0.0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0],
        colors: {
            '0.0': '#808080',
            '0.236': '#9370DB',
            '0.382': '#4169E1',
            '0.5': '#FFD700',
            '0.618': '#FF6347',
            '0.786': '#FF4500',
            '1.0': '#DC143C'
        }
    },
    chart: {
        margin: { top: 20, right: 80, bottom: 60, left: 80 },
        candleWidth: 6,
        xAxisTicks: 6 // Reduced number of x-axis labels
    },

    /**
     * Load API keys from server
     */
    async loadApiKey() {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            this.api.key = data.alphaVantageKey || data.apiKey;
            this.api.finnhubKey = data.finnhubKey;
            console.log('API keys loaded from environment');
            console.log('- Alpha Vantage:', this.api.key ? '✓' : '✗');
            console.log('- Finnhub:', this.api.finnhubKey ? '✓' : '✗');
        } catch (error) {
            console.error('Failed to load API keys:', error);
            this.api.key = 'demo';
            this.api.finnhubKey = 'demo';
        }
    }
};

// Configuration for the Stock Analyzer application
const CONFIG = {
    api: {
        provider: 'alpha_vantage',
        key: null, // Will be loaded from environment
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
     * Load API key from server
     */
    async loadApiKey() {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            this.api.key = data.apiKey;
            console.log('API key loaded from environment');
        } catch (error) {
            console.error('Failed to load API key:', error);
            this.api.key = 'demo';
        }
    }
};

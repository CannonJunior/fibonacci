// Stock selector module with autocomplete functionality
const StockSelector = {
    stocks: [],
    currentStock: null,
    activeIndex: -1,

    /**
     * Initialize the stock selector
     */
    async init() {
        // Load S&P 500 stocks list
        await this.loadStocks();

        // Setup event listeners
        this.setupEventListeners();

        // Set initial stock (AAPL)
        const aapl = this.stocks.find(s => s.symbol === 'AAPL');
        if (aapl) {
            this.setCurrentStock(aapl);
        }
    },

    /**
     * Load stocks list from server
     */
    async loadStocks() {
        try {
            const response = await fetch('/api/stocks');
            this.stocks = await response.json();
            console.log(`Loaded ${this.stocks.length} S&P 500 stocks`);
        } catch (error) {
            console.error('Failed to load stocks list:', error);
            this.stocks = [];
        }
    },

    /**
     * Setup event listeners for autocomplete
     */
    setupEventListeners() {
        const input = document.getElementById('stockInput');
        const autocompleteList = document.getElementById('autocompleteList');

        // Input event - filter and show suggestions
        input.addEventListener('input', (e) => {
            const value = e.target.value.trim().toUpperCase();

            if (value.length === 0) {
                this.hideAutocomplete();
                return;
            }

            const matches = this.filterStocks(value);
            this.showAutocomplete(matches);
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            const items = autocompleteList.querySelectorAll('.autocomplete-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.activeIndex = Math.min(this.activeIndex + 1, items.length - 1);
                this.updateActiveItem(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.activeIndex = Math.max(this.activeIndex - 1, -1);
                this.updateActiveItem(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.activeIndex >= 0 && items[this.activeIndex]) {
                    const symbol = items[this.activeIndex].dataset.symbol;
                    this.selectStock(symbol);
                }
            } else if (e.key === 'Escape') {
                this.hideAutocomplete();
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.stock-selector')) {
                this.hideAutocomplete();
            }
        });
    },

    /**
     * Filter stocks by symbol or name
     */
    filterStocks(query) {
        return this.stocks.filter(stock =>
            stock.symbol.startsWith(query) ||
            stock.name.toUpperCase().includes(query)
        ).slice(0, 10); // Limit to 10 results
    },

    /**
     * Show autocomplete suggestions
     */
    async showAutocomplete(matches) {
        const autocompleteList = document.getElementById('autocompleteList');

        if (matches.length === 0) {
            this.hideAutocomplete();
            return;
        }

        // Reason: Check which stocks exist in database
        const stocksInDb = await this.checkStocksInDatabase(matches.map(s => s.symbol));

        autocompleteList.innerHTML = matches.map((stock, index) => {
            const inDatabase = stocksInDb.has(stock.symbol);
            return `
                <div class="autocomplete-item ${index === this.activeIndex ? 'active' : ''} ${inDatabase ? 'in-database' : ''}"
                     data-symbol="${stock.symbol}">
                    <span class="autocomplete-symbol">${stock.symbol}</span>
                    <span class="autocomplete-name">${stock.name}</span>
                </div>
            `;
        }).join('');

        // Add click handlers
        autocompleteList.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectStock(item.dataset.symbol);
            });
        });

        autocompleteList.classList.add('visible');
        this.activeIndex = -1;
    },

    /**
     * Check which stocks exist in the database
     * @param {Array<string>} symbols - Array of stock symbols to check
     * @returns {Promise<Set<string>>} Set of symbols that exist in database
     */
    async checkStocksInDatabase(symbols) {
        const inDatabase = new Set();

        // Reason: Check all symbols in parallel for better performance
        const checks = symbols.map(async symbol => {
            try {
                const response = await fetch(`/api/has-daily?symbol=${symbol}`);
                const result = await response.json();
                if (result.exists) {
                    inDatabase.add(symbol);
                }
            } catch (error) {
                console.error(`Failed to check database for ${symbol}:`, error);
            }
        });

        await Promise.all(checks);
        return inDatabase;
    },

    /**
     * Hide autocomplete list
     */
    hideAutocomplete() {
        const autocompleteList = document.getElementById('autocompleteList');
        autocompleteList.classList.remove('visible');
        autocompleteList.innerHTML = '';
        this.activeIndex = -1;
    },

    /**
     * Update active item in autocomplete list
     */
    updateActiveItem(items) {
        items.forEach((item, index) => {
            if (index === this.activeIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    },

    /**
     * Select a stock symbol
     */
    async selectStock(symbol) {
        const stock = this.stocks.find(s => s.symbol === symbol);
        if (!stock) return;

        // Update UI
        document.getElementById('stockInput').value = symbol;
        this.hideAutocomplete();

        // Set as current stock
        this.setCurrentStock(stock);

        // Load stock data
        await App.loadStockData(symbol);
    },

    /**
     * Set current stock and update display
     */
    setCurrentStock(stock) {
        this.currentStock = stock;

        // Update header
        document.getElementById('symbol').textContent = stock.symbol;

        // Update detail panel
        document.getElementById('stockDetailName').textContent = stock.name;
        document.getElementById('stockDetailSector').textContent = stock.sector;
        document.getElementById('stockDetailSubsector').textContent = stock.subIndustry;
        document.getElementById('stockDetailPanel').style.display = 'block';

        // Update config
        CONFIG.stock.symbol = stock.symbol;
    }
};

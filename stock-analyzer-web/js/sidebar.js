// Sidebar module for managing loaded stocks with advanced sorting
const Sidebar = {
    loadedStocks: [],
    currentSort: 'percent-change',
    sectorAverages: {},
    subSectorAverages: {},

    /**
     * Initialize the sidebar
     */
    async init() {
        this.setupEventListeners();
        await this.loadStocksFromDatabase();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sort button toggle
        const sortButton = document.getElementById('sortButton');
        const sortDropdown = document.getElementById('sortDropdown');

        sortButton.addEventListener('click', (e) => {
            e.stopPropagation();
            sortDropdown.classList.toggle('visible');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            sortDropdown.classList.remove('visible');
        });

        // Sort option selection
        document.querySelectorAll('.sort-option').forEach(option => {
            option.addEventListener('click', async (e) => {
                e.stopPropagation();

                // Update active state
                document.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');

                // Update sort
                this.currentSort = option.dataset.sort;
                sortDropdown.classList.remove('visible');

                // Re-render with new sort
                await this.render();
            });
        });
    },

    /**
     * Load all stocks from database
     */
    async loadStocksFromDatabase() {
        try {
            // Get list of all symbols in database
            const response = await fetch('/api/get-all-symbols');
            const result = await response.json();

            if (result.symbols && result.symbols.length > 0) {
                // Load data for each symbol
                for (const symbol of result.symbols) {
                    await this.addStockToSidebar(symbol);
                }

                await this.render();
            }
        } catch (error) {
            console.error('Failed to load stocks from database:', error);
        }
    },

    /**
     * Add a stock to the sidebar
     * @param {string} symbol - Stock symbol
     */
    async addStockToSidebar(symbol) {
        // Check if already loaded
        if (this.loadedStocks.find(s => s.symbol === symbol)) {
            return;
        }

        try {
            // Get stock data from database
            const response = await fetch(`/api/get-daily?symbol=${symbol}`);
            const result = await response.json();

            if (!result.data || result.data.length === 0) {
                return;
            }

            // Get stock info from S&P 500 list
            const stockInfo = StockSelector.stocks.find(s => s.symbol === symbol);
            if (!stockInfo) return;

            // Calculate metrics
            const candles = result.data.map(c => ({
                ...c,
                date: new Date(c.date)
            }));

            const percentChange = this.calculatePercentChange(candles);

            this.loadedStocks.push({
                symbol,
                name: stockInfo.name,
                sector: stockInfo.sector,
                subIndustry: stockInfo.subIndustry,
                candles,
                percentChange,
                marketCap: null // Will be fetched separately
            });

        } catch (error) {
            console.error(`Failed to add ${symbol} to sidebar:`, error);
        }
    },

    /**
     * Calculate percentage change over the period
     * @param {Array} candles - Candle data
     * @returns {number} Percentage change
     */
    calculatePercentChange(candles) {
        if (candles.length < 2) return 0;

        const firstPrice = candles[0].open;
        const lastPrice = candles[candles.length - 1].close;

        return ((lastPrice - firstPrice) / firstPrice) * 100;
    },

    /**
     * Calculate sector averages
     */
    async calculateSectorAverages() {
        const sectorData = {};

        // Group stocks by sector
        this.loadedStocks.forEach(stock => {
            if (!sectorData[stock.sector]) {
                sectorData[stock.sector] = [];
            }
            sectorData[stock.sector].push(stock.percentChange);
        });

        // Calculate averages
        this.sectorAverages = {};
        for (const [sector, changes] of Object.entries(sectorData)) {
            const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
            this.sectorAverages[sector] = avg;
        }
    },

    /**
     * Calculate sub-sector averages
     */
    async calculateSubSectorAverages() {
        const subSectorData = {};

        // Group stocks by sub-sector
        this.loadedStocks.forEach(stock => {
            if (!subSectorData[stock.subIndustry]) {
                subSectorData[stock.subIndustry] = [];
            }
            subSectorData[stock.subIndustry].push(stock.percentChange);
        });

        // Calculate averages
        this.subSectorAverages = {};
        for (const [subSector, changes] of Object.entries(subSectorData)) {
            const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
            this.subSectorAverages[subSector] = avg;
        }
    },

    /**
     * Sort stocks based on current sort option
     */
    async sortStocks() {
        // Calculate averages if needed
        if (this.currentSort === 'vs-sector') {
            await this.calculateSectorAverages();
        } else if (this.currentSort === 'vs-subsector') {
            await this.calculateSubSectorAverages();
        }

        this.loadedStocks.sort((a, b) => {
            switch (this.currentSort) {
                case 'percent-change':
                    return b.percentChange - a.percentChange;

                case 'market-cap':
                    // Reason: Sort by market cap (will implement fetching later)
                    return (b.marketCap || 0) - (a.marketCap || 0);

                case 'vs-sector': {
                    const aDiff = a.percentChange - this.sectorAverages[a.sector];
                    const bDiff = b.percentChange - this.sectorAverages[b.sector];
                    return bDiff - aDiff;
                }

                case 'vs-subsector': {
                    const aDiff = a.percentChange - this.subSectorAverages[a.subIndustry];
                    const bDiff = b.percentChange - this.subSectorAverages[b.subIndustry];
                    return bDiff - aDiff;
                }

                default:
                    return 0;
            }
        });
    },

    /**
     * Get display value for current sort
     */
    getDisplayValue(stock) {
        switch (this.currentSort) {
            case 'percent-change':
                return stock.percentChange.toFixed(2) + '%';

            case 'market-cap':
                if (!stock.marketCap) return 'N/A';
                return this.formatMarketCap(stock.marketCap);

            case 'vs-sector': {
                const diff = stock.percentChange - this.sectorAverages[stock.sector];
                return (diff >= 0 ? '+' : '') + diff.toFixed(2) + '%';
            }

            case 'vs-subsector': {
                const diff = stock.percentChange - this.subSectorAverages[stock.subIndustry];
                return (diff >= 0 ? '+' : '') + diff.toFixed(2) + '%';
            }

            default:
                return '';
        }
    },

    /**
     * Format market cap for display
     */
    formatMarketCap(value) {
        if (value >= 1e12) {
            return (value / 1e12).toFixed(2) + 'T';
        } else if (value >= 1e9) {
            return (value / 1e9).toFixed(2) + 'B';
        } else if (value >= 1e6) {
            return (value / 1e6).toFixed(2) + 'M';
        }
        return value.toString();
    },

    /**
     * Fetch financial data for a stock
     */
    async fetchFinancialData(symbol) {
        try {
            // Fetch company overview
            const overview = await API.fetchCompanyOverview(symbol);

            // Fetch income statements
            const incomeStatements = await API.fetchIncomeStatement(symbol);

            // Calculate YoY changes
            const yoyChanges = API.calculateYoYChanges(incomeStatements);

            // Update stock object
            const stock = this.loadedStocks.find(s => s.symbol === symbol);
            if (stock) {
                stock.overview = overview;
                stock.incomeStatements = incomeStatements;
                stock.yoyChanges = yoyChanges;
                stock.marketCap = overview.marketCap;
            }

            // Re-render to update display
            await this.render();

            return { overview, incomeStatements, yoyChanges };
        } catch (error) {
            console.error(`Failed to fetch financial data for ${symbol}:`, error);
            alert(`Failed to fetch financial data: ${error.message}`);
            return null;
        }
    },

    /**
     * Render the sidebar
     */
    async render() {
        const content = document.getElementById('sidebarContent');

        if (this.loadedStocks.length === 0) {
            content.innerHTML = '<div class="sidebar-empty">No stocks loaded yet</div>';
            return;
        }

        // Sort stocks
        await this.sortStocks();

        // Render stock items
        content.innerHTML = this.loadedStocks.map(stock => {
            const displayValue = this.getDisplayValue(stock);
            const isPositive = stock.percentChange >= 0;
            const isActive = stock.symbol === CONFIG.stock.symbol;

            return `
                <div class="stock-item ${isActive ? 'active' : ''}" data-symbol="${stock.symbol}">
                    <div class="stock-item-header" data-action="toggle">
                        <span class="stock-item-symbol">${stock.symbol}</span>
                        <span class="stock-item-change ${isPositive ? 'positive' : 'negative'}">
                            ${isPositive ? '+' : ''}${displayValue}
                        </span>
                    </div>
                    <div class="stock-item-name">${stock.name}</div>
                    <div class="stock-item-meta">
                        <span class="stock-item-badge">${stock.sector}</span>
                    </div>
                    ${isActive ? this.renderExpandedContent(stock) : ''}
                </div>
            `;
        }).join('');

        // Add click handlers
        document.querySelectorAll('.stock-item').forEach(item => {
            const header = item.querySelector('[data-action="toggle"]');
            header.addEventListener('click', () => {
                const symbol = item.dataset.symbol;
                StockSelector.selectStock(symbol);
            });
        });

        // Add fetch button handlers
        document.querySelectorAll('[data-action="fetch-financial"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const symbol = btn.dataset.symbol;
                btn.textContent = 'Fetching...';
                btn.disabled = true;
                await this.fetchFinancialData(symbol);
            });
        });
    },

    /**
     * Render expanded content for active stock
     */
    renderExpandedContent(stock) {
        if (!stock.overview || !stock.yoyChanges) {
            return `
                <div class="stock-expanded">
                    <button class="fetch-data-btn" data-action="fetch-financial" data-symbol="${stock.symbol}">
                        Fetch Financial Data
                    </button>
                </div>
            `;
        }

        const formatValue = (val, suffix = '') => {
            if (val === null || val === undefined) return 'N/A';
            return val.toFixed(2) + suffix;
        };

        const formatCurrency = (val) => {
            if (!val) return 'N/A';
            if (val >= 1e12) return '$' + (val / 1e12).toFixed(2) + 'T';
            if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
            if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
            return '$' + val.toFixed(2);
        };

        return `
            <div class="stock-expanded">
                <div class="stock-section">
                    <h4>Market Metrics</h4>
                    <div class="stock-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Market Cap:</span>
                            <span class="metric-value">${formatCurrency(stock.overview.marketCap)}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">P/E Ratio:</span>
                            <span class="metric-value">${formatValue(stock.overview.peRatio)}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Dividend Yield:</span>
                            <span class="metric-value">${formatValue(stock.overview.dividendYield * 100, '%')}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Dividend/Share:</span>
                            <span class="metric-value">${formatCurrency(stock.overview.dividendPerShare)}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">52-Week High:</span>
                            <span class="metric-value">${formatCurrency(stock.overview.week52High)}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">52-Week Low:</span>
                            <span class="metric-value">${formatCurrency(stock.overview.week52Low)}</span>
                        </div>
                    </div>
                </div>

                <div class="stock-section">
                    <h4>YoY Performance</h4>
                    <div class="stock-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Revenue Change:</span>
                            <span class="metric-value ${stock.yoyChanges.revenueChange >= 0 ? 'positive' : 'negative'}">
                                ${formatValue(stock.yoyChanges.revenueChange, '%')}
                            </span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">OpEx Change:</span>
                            <span class="metric-value ${stock.yoyChanges.operatingExpensesChange >= 0 ? 'negative' : 'positive'}">
                                ${formatValue(stock.yoyChanges.operatingExpensesChange, '%')}
                            </span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Net Income Change:</span>
                            <span class="metric-value ${stock.yoyChanges.netIncomeChange >= 0 ? 'positive' : 'negative'}">
                                ${formatValue(stock.yoyChanges.netIncomeChange, '%')}
                            </span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Net Profit Margin:</span>
                            <span class="metric-value">${formatValue(stock.yoyChanges.netProfitMargin, '%')}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">EPS Change:</span>
                            <span class="metric-value ${stock.yoyChanges.epsChange >= 0 ? 'positive' : 'negative'}">
                                ${formatValue(stock.yoyChanges.epsChange, '%')}
                            </span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">EBITDA Change:</span>
                            <span class="metric-value ${stock.yoyChanges.ebitdaChange >= 0 ? 'positive' : 'negative'}">
                                ${formatValue(stock.yoyChanges.ebitdaChange, '%')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Update sidebar after loading a new stock
     */
    async updateAfterLoad(symbol) {
        await this.addStockToSidebar(symbol);
        await this.render();
    }
};

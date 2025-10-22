// Sidebar module for managing loaded stocks with advanced sorting
const Sidebar = {
    loadedStocks: [],
    currentSort: 'percent-change',
    sectorAverages: {},
    subSectorAverages: {},
    filters: {
        sectors: new Set(),
        dividendMin: 0,
        dividendMax: 100,
        stockStatus: 'all' // 'all', 'added', 'not-added'
    },

    /**
     * Initialize the sidebar
     */
    async init() {
        this.setupEventListeners();
        await this.loadAllSP500Stocks();
        this.populateFetchDataPanel();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Expand/Collapse all button
        const expandAllButton = document.getElementById('expandAllButton');
        const expandAllIcon = document.getElementById('expandAllIcon');

        expandAllButton.addEventListener('click', async (e) => {
            e.stopPropagation();

            // Reason: Toggle all stocks expanded/collapsed state
            const allExpanded = this.loadedStocks.every(s => s.isExpanded);

            this.loadedStocks.forEach(stock => {
                stock.isExpanded = !allExpanded;
            });

            // Update icon
            if (!allExpanded) {
                expandAllIcon.classList.remove('fa-expand-alt');
                expandAllIcon.classList.add('fa-down-left-and-up-right-to-center');
            } else {
                expandAllIcon.classList.remove('fa-down-left-and-up-right-to-center');
                expandAllIcon.classList.add('fa-expand-alt');
            }

            // Re-render
            await this.render();
        });

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

        // Fetch data button toggle
        const fetchDataButton = document.getElementById('fetchDataButton');
        const fetchDataPanel = document.getElementById('fetchDataPanel');

        fetchDataButton.addEventListener('click', (e) => {
            e.stopPropagation();
            fetchDataPanel.classList.toggle('open');
        });

        // Filter button toggle
        const filterButton = document.getElementById('filterButton');
        const filterPanel = document.getElementById('filterPanel');

        filterButton.addEventListener('click', (e) => {
            e.stopPropagation();
            filterPanel.classList.toggle('open');
        });

        // Filter option expand/collapse
        document.querySelectorAll('.filter-option-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                header.classList.toggle('expanded');
                const content = header.nextElementSibling;
                content.classList.toggle('expanded');
            });
        });

        // Stock status toggle
        document.querySelectorAll('input[name="stock-status-toggle"]').forEach(radio => {
            radio.addEventListener('change', async (e) => {
                this.filters.stockStatus = e.target.value;
                await this.render();
            });
        });
    },

    /**
     * Initialize filter options with sector checkboxes and dividend slider
     */
    initializeFilterOptions() {
        // Populate sector checkboxes
        this.populateSectorFilter();

        // Setup dividend slider
        this.setupDividendSlider();
    },

    /**
     * Populate sector filter checkboxes
     */
    populateSectorFilter() {
        const sectorContent = document.getElementById('sectorFilterContent');

        // Get unique sectors from loaded stocks
        const sectors = [...new Set(this.loadedStocks.map(stock => stock.sector))].sort();

        const checkboxList = document.createElement('div');
        checkboxList.className = 'sector-checkbox-list';

        sectors.forEach(sector => {
            const item = document.createElement('div');
            item.className = 'sector-checkbox-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `sector-${sector.replace(/\s+/g, '-')}`;
            checkbox.value = sector;
            checkbox.checked = this.filters.sectors.size === 0 || this.filters.sectors.has(sector);

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = sector;

            // Reason: Add event listener to handle sector filtering
            checkbox.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    this.filters.sectors.delete(sector);
                } else {
                    this.filters.sectors.add(sector);
                }
                await this.render();
            });

            item.appendChild(checkbox);
            item.appendChild(label);
            checkboxList.appendChild(item);
        });

        sectorContent.innerHTML = '';
        sectorContent.appendChild(checkboxList);
    },

    /**
     * Setup dividend yield slider
     */
    setupDividendSlider() {
        // Reason: Calculate min and max dividend yields from loaded stocks
        const minYield = 0;
        let maxYield = 10;

        const yields = this.loadedStocks
            .filter(stock => stock.overview && stock.overview.dividendYield)
            .map(stock => stock.overview.dividendYield * 100);

        if (yields.length > 0) {
            // Reason: Round up to nearest integer
            maxYield = Math.ceil(Math.max(...yields));
        }

        const minSlider = document.getElementById('dividendMinSlider');
        const maxSlider = document.getElementById('dividendMaxSlider');
        const minDisplay = document.getElementById('dividendMinDisplay');
        const maxDisplay = document.getElementById('dividendMaxDisplay');
        const rangeElement = document.getElementById('dividendRange');

        // Reason: Set initial filter values to match slider range
        this.filters.dividendMin = minYield;
        this.filters.dividendMax = maxYield;

        // Set slider ranges
        minSlider.min = minYield;
        minSlider.max = maxYield;
        minSlider.value = minYield;
        minSlider.step = 0.1;

        maxSlider.min = minYield;
        maxSlider.max = maxYield;
        maxSlider.value = maxYield;
        maxSlider.step = 0.1;

        // Update displays
        minDisplay.textContent = `${minYield.toFixed(1)}%`;
        maxDisplay.textContent = `${maxYield.toFixed(1)}%`;

        // Function to update the range gradient
        const updateRange = () => {
            const min = parseFloat(minSlider.value);
            const max = parseFloat(maxSlider.value);
            const rangeMin = parseFloat(minSlider.min);
            const rangeMax = parseFloat(minSlider.max);

            const percentMin = ((min - rangeMin) / (rangeMax - rangeMin)) * 100;
            const percentMax = ((max - rangeMin) / (rangeMax - rangeMin)) * 100;

            rangeElement.style.left = percentMin + '%';
            rangeElement.style.width = (percentMax - percentMin) + '%';
        };

        // Initial range update
        updateRange();

        // Add event listeners
        minSlider.addEventListener('input', async (e) => {
            let value = parseFloat(e.target.value);
            const maxValue = parseFloat(maxSlider.value);

            if (value > maxValue) {
                value = maxValue;
                minSlider.value = value;
            }

            this.filters.dividendMin = value;
            minDisplay.textContent = `${value.toFixed(1)}%`;
            updateRange();
            await this.render();
        });

        maxSlider.addEventListener('input', async (e) => {
            let value = parseFloat(e.target.value);
            const minValue = parseFloat(minSlider.value);

            if (value < minValue) {
                value = minValue;
                maxSlider.value = value;
            }

            this.filters.dividendMax = value;
            maxDisplay.textContent = `${value.toFixed(1)}%`;
            updateRange();
            await this.render();
        });
    },

    /**
     * Load all S&P 500 stocks into sidebar
     */
    async loadAllSP500Stocks() {
        try {
            // Get all S&P 500 stocks from StockSelector
            const allStocks = StockSelector.stocks;

            // Get symbols that have chart data in database
            const dbResponse = await fetch('/api/get-all-symbols');
            const dbResult = await dbResponse.json();
            const symbolsWithData = new Set(dbResult.symbols || []);

            // Add all stocks to sidebar
            for (const stock of allStocks) {
                const hasChartData = symbolsWithData.has(stock.symbol);

                // If stock has chart data, load it
                if (hasChartData) {
                    await this.addStockToSidebar(stock.symbol, true);
                } else {
                    // Add stock without chart data (placeholder)
                    this.loadedStocks.push({
                        symbol: stock.symbol,
                        name: stock.name,
                        sector: stock.sector,
                        subIndustry: stock.subIndustry,
                        candles: null,
                        percentChange: 0,
                        marketCap: null,
                        hasChartData: false
                    });
                }
            }

            await this.render();

            // Reason: Initialize filter options after stocks are loaded
            this.initializeFilterOptions();
        } catch (error) {
            console.error('Failed to load S&P 500 stocks:', error);
        }
    },

    /**
     * Add a stock to the sidebar
     * @param {string} symbol - Stock symbol
     * @param {boolean} hasChartData - Whether this stock has chart data loaded
     */
    async addStockToSidebar(symbol, hasChartData = false) {
        // Check if already loaded
        const existingIndex = this.loadedStocks.findIndex(s => s.symbol === symbol);
        if (existingIndex >= 0 && this.loadedStocks[existingIndex].hasChartData) {
            return; // Already has data
        }

        try {
            // Get stock info from S&P 500 list
            const stockInfo = StockSelector.stocks.find(s => s.symbol === symbol);
            if (!stockInfo) return;

            if (!hasChartData) {
                // Add placeholder without data
                if (existingIndex >= 0) {
                    // Update existing placeholder
                    this.loadedStocks[existingIndex].hasChartData = false;
                } else {
                    this.loadedStocks.push({
                        symbol,
                        name: stockInfo.name,
                        sector: stockInfo.sector,
                        subIndustry: stockInfo.subIndustry,
                        candles: null,
                        percentChange: 0,
                        marketCap: null,
                        hasChartData: false
                    });
                }
                return;
            }

            // Get stock data from database
            const response = await fetch(`/api/get-daily?symbol=${symbol}`);
            const result = await response.json();

            if (!result.data || result.data.length === 0) {
                return;
            }

            // Calculate metrics
            const candles = result.data.map(c => ({
                ...c,
                date: new Date(c.date)
            }));

            const percentChange = this.calculatePercentChange(candles);

            // Reason: Load financial data from database if it exists
            const financialData = await this.loadFinancialDataFromDatabase(symbol);

            const stockData = {
                symbol,
                name: stockInfo.name,
                sector: stockInfo.sector,
                subIndustry: stockInfo.subIndustry,
                candles,
                percentChange,
                marketCap: financialData.overview ? financialData.overview.market_cap : null,
                overview: financialData.overview,
                incomeStatements: financialData.statements,
                yoyChanges: financialData.yoyChanges,
                hasChartData: true
            };

            if (existingIndex >= 0) {
                // Update existing entry
                this.loadedStocks[existingIndex] = stockData;
            } else {
                this.loadedStocks.push(stockData);
            }

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

                case 'market-cap': {
                    // Reason: Get market cap from overview or stock.marketCap
                    const aMarketCap = a.overview?.marketCap || a.marketCap || 0;
                    const bMarketCap = b.overview?.marketCap || b.marketCap || 0;
                    return bMarketCap - aMarketCap;
                }

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

            case 'market-cap': {
                // Reason: Try to get market cap from overview or stock.marketCap
                const marketCap = stock.overview?.marketCap || stock.marketCap;
                if (!marketCap) return 'N/A';
                return this.formatMarketCap(marketCap);
            }

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
     * Determine if value is positive based on current sort
     * @param {Object} stock - Stock object
     * @returns {boolean} True if value should be shown as positive (green)
     */
    getIsPositive(stock) {
        switch (this.currentSort) {
            case 'percent-change':
                return stock.percentChange >= 0;

            case 'market-cap': {
                // Reason: Market cap doesn't have positive/negative, use neutral
                const marketCap = stock.overview?.marketCap || stock.marketCap;
                return marketCap > 0;
            }

            case 'vs-sector': {
                const diff = stock.percentChange - this.sectorAverages[stock.sector];
                return diff >= 0;
            }

            case 'vs-subsector': {
                const diff = stock.percentChange - this.subSectorAverages[stock.subIndustry];
                return diff >= 0;
            }

            default:
                return true;
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

            // Reason: Save to database for persistence
            await this.saveFinancialDataToDatabase(symbol, overview, incomeStatements);

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
     * Save financial data to database
     * @param {string} symbol - Stock symbol
     * @param {Object} overview - Company overview data
     * @param {Array} incomeStatements - Income statement data
     */
    async saveFinancialDataToDatabase(symbol, overview, incomeStatements) {
        try {
            // Save company overview
            await fetch('/api/save-company-overview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overview })
            });

            // Save income statements
            await fetch('/api/save-income-statements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, statements: incomeStatements })
            });

            console.log(`Saved financial data for ${symbol} to database`);
        } catch (error) {
            console.error(`Failed to save financial data for ${symbol}:`, error);
        }
    },

    /**
     * Load financial data from database
     * @param {string} symbol - Stock symbol
     * @returns {Object} Financial data with overview, statements, and yoyChanges
     */
    async loadFinancialDataFromDatabase(symbol) {
        try {
            // Get company overview from database
            const overviewResponse = await fetch(`/api/get-company-overview?symbol=${symbol}`);
            const overviewResult = await overviewResponse.json();

            // Get income statements from database
            const statementsResponse = await fetch(`/api/get-income-statements?symbol=${symbol}`);
            const statementsResult = await statementsResponse.json();

            // Convert database format to application format
            let overview = null;
            if (overviewResult.overview) {
                const dbOverview = overviewResult.overview;
                overview = {
                    symbol: dbOverview.symbol,
                    marketCap: dbOverview.market_cap,
                    peRatio: dbOverview.pe_ratio,
                    dividendYield: dbOverview.dividend_yield,
                    dividendPerShare: dbOverview.dividend_per_share,
                    week52High: dbOverview.week_52_high,
                    week52Low: dbOverview.week_52_low,
                    beta: dbOverview.beta,
                    eps: dbOverview.eps,
                    bookValue: dbOverview.book_value,
                    profitMargin: dbOverview.profit_margin,
                    operatingMarginTTM: dbOverview.operating_margin_ttm
                };
            }

            // Convert statements format
            let statements = null;
            let yoyChanges = null;
            if (statementsResult.statements && statementsResult.statements.length > 0) {
                statements = statementsResult.statements.map(stmt => ({
                    fiscalDateEnding: stmt.fiscal_date_ending,
                    totalRevenue: stmt.total_revenue,
                    operatingExpenses: stmt.operating_expenses,
                    netIncome: stmt.net_income,
                    ebitda: stmt.ebitda,
                    eps: stmt.eps,
                    grossProfit: stmt.gross_profit
                }));

                // Calculate YoY changes from stored statements
                yoyChanges = API.calculateYoYChanges(statements);
            }

            return { overview, statements, yoyChanges };
        } catch (error) {
            console.error(`Failed to load financial data for ${symbol}:`, error);
            return { overview: null, statements: null, yoyChanges: null };
        }
    },

    /**
     * Apply filters to stocks
     * @param {Array} stocks - Array of stocks to filter
     * @returns {Array} Filtered stocks
     */
    applyFilters(stocks) {
        return stocks.filter(stock => {
            // Reason: Filter by stock status (added/not-added/all)
            if (this.filters.stockStatus === 'added' && !stock.hasChartData) {
                return false;
            }
            if (this.filters.stockStatus === 'not-added' && stock.hasChartData) {
                return false;
            }

            // Reason: Filter by sector if any sectors are excluded
            if (this.filters.sectors.size > 0 && this.filters.sectors.has(stock.sector)) {
                return false;
            }

            // Reason: Filter by dividend yield range
            if (stock.overview && stock.overview.dividendYield !== null && stock.overview.dividendYield !== undefined) {
                const yieldPercent = stock.overview.dividendYield * 100;
                if (yieldPercent < this.filters.dividendMin || yieldPercent > this.filters.dividendMax) {
                    return false;
                }
            }

            return true;
        });
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

        // Reason: Apply filters to get visible stocks
        const visibleStocks = this.applyFilters(this.loadedStocks);

        if (visibleStocks.length === 0) {
            content.innerHTML = '<div class="sidebar-empty">No stocks match the current filters</div>';
            return;
        }

        // Render stock items
        content.innerHTML = visibleStocks.map(stock => {
            const displayValue = this.getDisplayValue(stock);
            // Reason: Determine positive/negative based on current sort type
            const isPositive = this.getIsPositive(stock);
            const isActive = stock.symbol === CONFIG.stock.symbol;
            const hasData = stock.hasChartData ? 'has-chart-data' : '';
            const isExpanded = stock.isExpanded || false;
            const expandIcon = isExpanded ? 'fa-down-left-and-up-right-to-center' : 'fa-expand-alt';

            return `
                <div class="stock-item ${isActive ? 'active' : ''} ${hasData}" data-symbol="${stock.symbol}">
                    <div class="stock-item-header">
                        <span class="stock-item-symbol" data-action="select-stock">${stock.symbol}</span>
                        <div class="stock-item-header-right">
                            <span class="stock-item-change ${isPositive ? 'positive' : 'negative'}">
                                ${displayValue}
                            </span>
                            <i class="fas ${expandIcon} expand-icon" data-action="toggle-expand"></i>
                        </div>
                    </div>
                    <div class="stock-item-name">${stock.name}</div>
                    <div class="stock-item-meta">
                        <span class="stock-item-badge">${stock.sector}</span>
                    </div>
                    ${isExpanded ? this.renderExpandedContent(stock) : ''}
                </div>
            `;
        }).join('');

        // Add click handlers for stock selection
        document.querySelectorAll('[data-action="select-stock"]').forEach(symbolEl => {
            symbolEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const symbol = symbolEl.closest('.stock-item').dataset.symbol;
                StockSelector.selectStock(symbol);
            });
        });

        // Add click handlers for expand/collapse icon
        document.querySelectorAll('[data-action="toggle-expand"]').forEach(icon => {
            icon.addEventListener('click', async (e) => {
                e.stopPropagation();
                const symbol = icon.closest('.stock-item').dataset.symbol;
                const stock = this.loadedStocks.find(s => s.symbol === symbol);
                if (stock) {
                    // Reason: Toggle expanded state
                    stock.isExpanded = !stock.isExpanded;
                    await this.render();
                }
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
    },

    /**
     * Populate fetch data panel with hierarchical sector/subsector/stock structure
     */
    populateFetchDataPanel() {
        const content = document.getElementById('fetchDataContent');

        // Reason: Organize stocks by sector and subsector
        const hierarchy = {};

        StockSelector.stocks.forEach(stock => {
            if (!hierarchy[stock.sector]) {
                hierarchy[stock.sector] = {};
            }
            if (!hierarchy[stock.sector][stock.subIndustry]) {
                hierarchy[stock.sector][stock.subIndustry] = [];
            }
            hierarchy[stock.sector][stock.subIndustry].push(stock);
        });

        // Build HTML
        let html = '';
        const sectors = Object.keys(hierarchy).sort();

        sectors.forEach(sector => {
            const sectorId = sector.replace(/\s+/g, '-').toLowerCase();
            html += `
                <div class="fetch-sector-item" data-sector="${sector}">
                    <div class="fetch-item-header">
                        <input type="checkbox" class="fetch-item-checkbox sector-checkbox" data-sector="${sector}">
                        <span class="fetch-item-label">${sector}</span>
                        <i class="fas fa-expand-alt fetch-item-expand" data-action="toggle-sector" data-sector="${sector}"></i>
                    </div>
                    <div class="fetch-subsector-list" data-sector="${sector}">
            `;

            const subsectors = Object.keys(hierarchy[sector]).sort();
            subsectors.forEach(subsector => {
                const subsectorId = subsector.replace(/\s+/g, '-').toLowerCase();
                html += `
                    <div class="fetch-subsector-item" data-subsector="${subsector}">
                        <div class="fetch-item-header">
                            <input type="checkbox" class="fetch-item-checkbox subsector-checkbox" data-sector="${sector}" data-subsector="${subsector}">
                            <span class="fetch-item-label">${subsector}</span>
                            <i class="fas fa-expand-alt fetch-item-expand" data-action="toggle-subsector" data-sector="${sector}" data-subsector="${subsector}"></i>
                        </div>
                        <div class="fetch-stock-list" data-subsector="${subsector}">
                `;

                hierarchy[sector][subsector].forEach(stock => {
                    // Reason: Check if this stock has financial data loaded
                    const loadedStock = this.loadedStocks.find(s => s.symbol === stock.symbol);
                    const hasFinancialData = loadedStock && loadedStock.overview && loadedStock.incomeStatements;
                    const dataLoadedClass = hasFinancialData ? 'has-financial-data' : '';

                    html += `
                        <div class="fetch-stock-item ${dataLoadedClass}" data-symbol="${stock.symbol}">
                            <div class="fetch-item-header">
                                <input type="checkbox" class="fetch-item-checkbox stock-checkbox" data-symbol="${stock.symbol}" data-sector="${sector}" data-subsector="${subsector}">
                                <span class="fetch-item-label">${stock.symbol} - ${stock.name}</span>
                            </div>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        content.innerHTML = html;

        // Add event listeners
        this.setupFetchDataEventListeners();
    },

    /**
     * Setup event listeners for fetch data panel
     */
    setupFetchDataEventListeners() {
        // Toggle sector expansion
        document.querySelectorAll('[data-action="toggle-sector"]').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const sector = e.target.dataset.sector;
                const list = document.querySelector(`.fetch-subsector-list[data-sector="${sector}"]`);
                list.classList.toggle('expanded');

                // Toggle icon
                if (list.classList.contains('expanded')) {
                    e.target.classList.remove('fa-expand-alt');
                    e.target.classList.add('fa-down-left-and-up-right-to-center');
                } else {
                    e.target.classList.remove('fa-down-left-and-up-right-to-center');
                    e.target.classList.add('fa-expand-alt');
                }
            });
        });

        // Toggle subsector expansion
        document.querySelectorAll('[data-action="toggle-subsector"]').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const subsector = e.target.dataset.subsector;
                const list = document.querySelector(`.fetch-stock-list[data-subsector="${subsector}"]`);
                list.classList.toggle('expanded');

                // Toggle icon
                if (list.classList.contains('expanded')) {
                    e.target.classList.remove('fa-expand-alt');
                    e.target.classList.add('fa-down-left-and-up-right-to-center');
                } else {
                    e.target.classList.remove('fa-down-left-and-up-right-to-center');
                    e.target.classList.add('fa-expand-alt');
                }
            });
        });

        // Sector checkbox - select all subsectors and stocks
        document.querySelectorAll('.sector-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const sector = e.target.dataset.sector;
                const isChecked = e.target.checked;

                // Check/uncheck all subsectors and stocks in this sector
                document.querySelectorAll(`.subsector-checkbox[data-sector="${sector}"]`).forEach(cb => {
                    cb.checked = isChecked;
                });
                document.querySelectorAll(`.stock-checkbox[data-sector="${sector}"]`).forEach(cb => {
                    cb.checked = isChecked;
                });
            });
        });

        // Subsector checkbox - select all stocks
        document.querySelectorAll('.subsector-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const sector = e.target.dataset.sector;
                const subsector = e.target.dataset.subsector;
                const isChecked = e.target.checked;

                // Check/uncheck all stocks in this subsector
                document.querySelectorAll(`.stock-checkbox[data-subsector="${subsector}"]`).forEach(cb => {
                    cb.checked = isChecked;
                });
            });
        });

        // Fetch button
        document.getElementById('fetchSelectedDataButton').addEventListener('click', async () => {
            await this.fetchSelectedStocks();
        });
    },

    /**
     * Fetch financial data for selected stocks
     */
    async fetchSelectedStocks() {
        const selectedStocks = [];
        document.querySelectorAll('.stock-checkbox:checked').forEach(checkbox => {
            selectedStocks.push(checkbox.dataset.symbol);
        });

        if (selectedStocks.length === 0) {
            alert('Please select at least one stock to fetch data for.');
            return;
        }

        const button = document.getElementById('fetchSelectedDataButton');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching...';

        let successCount = 0;
        let errorCount = 0;

        for (const symbol of selectedStocks) {
            try {
                await this.fetchFinancialData(symbol);
                successCount++;
            } catch (error) {
                console.error(`Failed to fetch data for ${symbol}:`, error);
                errorCount++;
            }
        }

        button.disabled = false;
        button.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Fetch Data';

        // Reason: Refresh the fetch data panel to show updated green backgrounds
        this.populateFetchDataPanel();

        alert(`Fetch complete!\nSuccess: ${successCount}\nErrors: ${errorCount}`);
    }
};

/**
 * Hedge Funds module - manages hedge fund cards and holdings display
 */
const HedgeFunds = {
    hedgeFundsData: [],
    sp500Symbols: new Set(),
    loadedStocks: new Set(),

    /**
     * Initialize the hedge funds module
     */
    async init() {
        try {
            // Load hedge fund data
            const response = await fetch('/data/hedge-funds.json');
            this.hedgeFundsData = await response.json();

            // Load SP500 symbols
            const sp500Response = await fetch('/data/sp500-stocks.json');
            const sp500Data = await sp500Response.json();
            this.sp500Symbols = new Set(sp500Data.map(stock => stock.symbol));

            // Reason: Wait for loaded stocks to populate before rendering
            await this.updateLoadedStocks();

            // Render hedge fund cards
            this.renderHedgeFundCards();

            // Setup event listeners
            this.setupEventListeners();

            console.log('Hedge Funds module initialized with', this.hedgeFundsData.length, 'funds');
            console.log('Loaded stocks:', this.loadedStocks.size);
        } catch (error) {
            console.error('Error initializing Hedge Funds module:', error);
        }
    },

    /**
     * Update the set of loaded stocks
     */
    async updateLoadedStocks() {
        try {
            const response = await fetch('/api/get-all-symbols');
            const result = await response.json();
            this.loadedStocks = new Set(result.symbols || []);
        } catch (error) {
            console.error('Error updating loaded stocks:', error);
        }
    },

    /**
     * Render hedge fund cards
     */
    renderHedgeFundCards() {
        const container = document.getElementById('hedgeFundsContent');

        if (!container) return;

        if (this.hedgeFundsData.length === 0) {
            container.innerHTML = '<div class="panel-empty">No hedge fund data available</div>';
            return;
        }

        // Reason: Save expanded state before re-rendering to prevent card compression
        const expandedFunds = new Set();
        container.querySelectorAll('.hedgefund-holdings').forEach(holdingsDiv => {
            if (holdingsDiv.style.display !== 'none') {
                expandedFunds.add(holdingsDiv.dataset.fundId);
            }
        });

        const html = this.hedgeFundsData.map(fund => this.createHedgeFundCard(fund)).join('');
        container.innerHTML = html;

        // Reason: Restore expanded state after re-rendering
        expandedFunds.forEach(fundId => {
            const holdingsDiv = container.querySelector(`.hedgefund-holdings[data-fund-id="${fundId}"]`);
            const button = container.querySelector(`.hedgefund-expand-btn[data-fund-id="${fundId}"] i`);
            if (holdingsDiv && button) {
                holdingsDiv.style.display = 'block';
                button.className = 'fas fa-chevron-up';
            }
        });
    },

    /**
     * Create HTML for a single hedge fund card
     */
    createHedgeFundCard(fund) {
        const aum = this.formatCurrency(fund.aum);

        // Reason: Check if all loaded holdings are currently visible on chart
        const loadedHoldings = fund.holdings.filter(h => this.loadedStocks.has(h.symbol));
        const allVisible = loadedHoldings.length > 0 && loadedHoldings.every(h => {
            if (typeof Chart !== 'undefined' && Chart.activeIndividualStocks) {
                const stock = Chart.activeIndividualStocks.get(h.symbol);
                return stock && stock.visible;
            }
            return false;
        });

        // Reason: Check if this fund has a combined portfolio line active
        const isCombined = typeof Chart !== 'undefined' && Chart.activeHedgeFundPortfolios &&
                          Chart.activeHedgeFundPortfolios.has(fund.id);

        return `
            <div class="hedgefund-card" data-fund-id="${fund.id}">
                <div class="hedgefund-card-header">
                    <div class="hedgefund-info">
                        <div class="hedgefund-name">${fund.name}</div>
                        <div class="hedgefund-manager">${fund.manager}</div>
                        <div class="hedgefund-aum">AUM: ${aum}</div>
                    </div>
                    <div class="hedgefund-header-buttons">
                        <button class="hedgefund-combine-btn" data-fund-id="${fund.id}" data-active="${isCombined}" title="${isCombined ? 'Show individual holdings' : 'Combine holdings into portfolio'}">
                            <i class="fas ${isCombined ? 'fa-chart-pie' : 'fa-layer-group'}"></i>
                        </button>
                        <button class="hedgefund-master-toggle-btn" data-fund-id="${fund.id}" data-active="${allVisible}" title="${allVisible ? 'Hide all holdings from chart' : 'Show all holdings on chart'}">
                            <i class="fas ${allVisible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                        </button>
                        <button class="hedgefund-expand-btn" data-fund-id="${fund.id}">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>
                <div class="hedgefund-description">${fund.description}</div>
                <div class="hedgefund-holdings" data-fund-id="${fund.id}" style="display: none;">
                    <div class="hedgefund-holdings-header">Top 5 Holdings</div>
                    <div class="hedgefund-holdings-list">
                        ${fund.holdings.map(holding => this.createHoldingItem(holding)).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Create HTML for a holding item
     */
    createHoldingItem(holding) {
        const isLoaded = this.loadedStocks.has(holding.symbol);
        const isSP500 = this.sp500Symbols.has(holding.symbol);
        const value = this.formatCurrency(holding.value);

        // Determine CSS class based on status
        let statusClass = '';
        if (isLoaded && isSP500) {
            statusClass = 'holding-loaded-sp500';
        } else if (!isSP500) {
            statusClass = 'holding-not-sp500';
        } else {
            statusClass = 'holding-not-loaded';
        }

        // Reason: For loaded stocks, show toggle icon. For not loaded, show clickable item
        let actionControl = '';
        if (isLoaded) {
            actionControl = `
                <button class="holding-toggle-btn" data-symbol="${holding.symbol}" data-active="false" title="Show on chart">
                    <i class="fas fa-eye-slash"></i>
                </button>
            `;
        } else {
            statusClass += ' holding-clickable';
        }

        return `
            <div class="hedgefund-holding-item ${statusClass}" data-symbol="${holding.symbol}" data-loaded="${isLoaded}">
                ${actionControl}
                <div class="holding-info">
                    <div class="holding-symbol">${holding.symbol}</div>
                    <div class="holding-details">
                        <span class="holding-percentage">${holding.percentage.toFixed(2)}%</span>
                        <span class="holding-value">${value}</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Format currency value
     */
    formatCurrency(value) {
        if (value >= 1000000000) {
            return `$${(value / 1000000000).toFixed(1)}B`;
        } else if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        }
        return `$${value.toFixed(0)}`;
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const container = document.getElementById('hedgeFundsContent');
        if (!container) return;

        // Reason: Expand/collapse hedge fund cards
        container.addEventListener('click', (e) => {
            // Reason: Handle combine button to create portfolio line
            const combineBtn = e.target.closest('.hedgefund-combine-btn');
            if (combineBtn) {
                e.stopPropagation();
                e.preventDefault();
                const fundId = combineBtn.dataset.fundId;
                this.toggleCombinedPortfolio(fundId);
                return;
            }

            // Reason: Handle master toggle button for entire hedge fund
            const masterToggleBtn = e.target.closest('.hedgefund-master-toggle-btn');
            if (masterToggleBtn) {
                e.stopPropagation();
                e.preventDefault();
                const fundId = masterToggleBtn.dataset.fundId;
                this.toggleAllHoldingsOnChart(fundId);
                return;
            }

            const expandBtn = e.target.closest('.hedgefund-expand-btn');
            if (expandBtn) {
                const fundId = expandBtn.dataset.fundId;
                this.toggleHoldingsExpanded(fundId);
                return;
            }

            // Reason: Handle toggle button for loaded stocks
            const toggleBtn = e.target.closest('.holding-toggle-btn');
            if (toggleBtn) {
                e.stopPropagation();
                e.preventDefault();
                this.toggleStockOnChart(toggleBtn);
                return;
            }

            // Reason: Handle clicking on unloaded stocks to load them
            const holdingItem = e.target.closest('.hedgefund-holding-item.holding-clickable');
            if (holdingItem) {
                const symbol = holdingItem.dataset.symbol;
                this.loadStock(symbol);
                return;
            }
        });
    },

    /**
     * Toggle holdings expanded/collapsed
     */
    toggleHoldingsExpanded(fundId) {
        const holdingsDiv = document.querySelector(`.hedgefund-holdings[data-fund-id="${fundId}"]`);
        const button = document.querySelector(`.hedgefund-expand-btn[data-fund-id="${fundId}"] i`);

        if (!holdingsDiv || !button) return;

        const isExpanded = holdingsDiv.style.display !== 'none';

        if (isExpanded) {
            holdingsDiv.style.display = 'none';
            button.className = 'fas fa-chevron-down';
        } else {
            holdingsDiv.style.display = 'block';
            button.className = 'fas fa-chevron-up';
        }
    },

    /**
     * Toggle stock visibility on chart
     */
    toggleStockOnChart(toggleBtn) {
        const symbol = toggleBtn.dataset.symbol;
        const isActive = toggleBtn.dataset.active === 'true';
        const icon = toggleBtn.querySelector('i');

        if (isActive) {
            // Hide stock from chart
            toggleBtn.dataset.active = 'false';
            icon.className = 'fas fa-eye-slash';
            toggleBtn.title = 'Show on chart';

            // Reason: Call chart module to hide this stock
            if (typeof Chart !== 'undefined' && Chart.hideIndividualStock) {
                Chart.hideIndividualStock(symbol);
            }

            Toast.info(`Hidden ${symbol} from chart`);
        } else {
            // Show stock on chart
            toggleBtn.dataset.active = 'true';
            icon.className = 'fas fa-eye';
            toggleBtn.title = 'Hide from chart';

            // Reason: Call chart module to show this stock
            if (typeof Chart !== 'undefined' && Chart.showIndividualStock) {
                Chart.showIndividualStock(symbol);
            }

            Toast.success(`Showing ${symbol} on chart`);
        }
    },

    /**
     * Load a stock that hasn't been loaded yet
     */
    async loadStock(symbol) {
        try {
            Toast.info(`Loading ${symbol}...`);

            // Reason: Use the same method as stock selector to ensure consistency
            await Sidebar.fetchCompleteStockData(symbol, false);

            Toast.success(`Loaded ${symbol}`);

            // Reason: Re-render hedge fund cards to update the UI
            await this.updateLoadedStocks();
            this.renderHedgeFundCards();
        } catch (error) {
            console.error(`Error loading ${symbol}:`, error);
            Toast.error(`Failed to load ${symbol}`);
        }
    },

    /**
     * Toggle all loaded holdings from a hedge fund on/off the chart
     */
    toggleAllHoldingsOnChart(fundId) {
        const fund = this.hedgeFundsData.find(f => f.id === fundId);
        if (!fund) return;

        // Reason: Get all loaded holdings from this fund
        const loadedHoldings = fund.holdings.filter(h => this.loadedStocks.has(h.symbol));

        if (loadedHoldings.length === 0) {
            Toast.info('No loaded stocks in this hedge fund');
            return;
        }

        // Reason: Check if all are currently visible
        const allVisible = loadedHoldings.every(h => {
            if (typeof Chart !== 'undefined' && Chart.activeIndividualStocks) {
                const stock = Chart.activeIndividualStocks.get(h.symbol);
                return stock && stock.visible;
            }
            return false;
        });

        // Reason: Toggle all - if all visible, hide all. Otherwise show all.
        if (allVisible) {
            // Hide all
            loadedHoldings.forEach(h => {
                if (typeof Chart !== 'undefined' && Chart.hideIndividualStock) {
                    Chart.hideIndividualStock(h.symbol);
                }
            });
            Toast.info(`Hidden ${fund.name} holdings from chart`);
        } else {
            // Show all
            loadedHoldings.forEach(h => {
                if (typeof Chart !== 'undefined' && Chart.showIndividualStock) {
                    Chart.showIndividualStock(h.symbol);
                }
            });
            Toast.success(`Showing ${fund.name} holdings on chart`);
        }

        // Reason: Re-render to update button states
        this.renderHedgeFundCards();
    },

    /**
     * Toggle combined portfolio view for a hedge fund
     * Reason: Combines all loaded holdings into a weighted portfolio line
     */
    async toggleCombinedPortfolio(fundId) {
        const fund = this.hedgeFundsData.find(f => f.id === fundId);
        if (!fund) return;

        // Reason: Check if portfolio is already combined
        const isCombined = typeof Chart !== 'undefined' && Chart.activeHedgeFundPortfolios &&
                          Chart.activeHedgeFundPortfolios.has(fundId);

        if (isCombined) {
            // Reason: Remove combined portfolio and show individual stocks
            if (typeof Chart !== 'undefined' && Chart.hideHedgeFundPortfolio) {
                await Chart.hideHedgeFundPortfolio(fundId);
            }
            Toast.info(`Showing individual holdings for ${fund.name}`);
        } else {
            // Reason: Create combined portfolio and hide individual stocks
            const loadedHoldings = fund.holdings.filter(h => this.loadedStocks.has(h.symbol));

            if (loadedHoldings.length === 0) {
                Toast.info('No loaded stocks in this hedge fund');
                return;
            }

            // Reason: Calculate weighted portfolio data
            try {
                const portfolioData = await this.calculateWeightedPortfolio(loadedHoldings);

                if (portfolioData && portfolioData.length > 0) {
                    // Reason: Show combined portfolio on chart
                    if (typeof Chart !== 'undefined' && Chart.showHedgeFundPortfolio) {
                        await Chart.showHedgeFundPortfolio(fundId, fund.name, portfolioData, loadedHoldings.map(h => h.symbol));
                    }
                    Toast.success(`Showing combined portfolio for ${fund.name}`);
                } else {
                    Toast.error('Failed to calculate portfolio data');
                }
            } catch (error) {
                console.error('Error calculating portfolio:', error);
                Toast.error('Failed to create combined portfolio');
            }
        }

        // Reason: Re-render to update button states
        this.renderHedgeFundCards();
    },

    /**
     * Calculate weighted portfolio data from holdings
     * Reason: Combines stock data based on percentage allocations
     */
    async calculateWeightedPortfolio(holdings) {
        try {
            // Reason: Fetch all stock data for loaded holdings
            const stockDataPromises = holdings.map(async holding => {
                const response = await fetch(`/api/get-daily?symbol=${holding.symbol}`);
                const result = await response.json();
                return {
                    symbol: holding.symbol,
                    percentage: holding.percentage,
                    data: result.data ? result.data.map(d => ({
                        date: new Date(d.date),
                        close: d.close
                    })) : []
                };
            });

            const stocksData = await Promise.all(stockDataPromises);

            // Reason: Filter out stocks with no data
            const validStocks = stocksData.filter(s => s.data && s.data.length > 0);

            if (validStocks.length === 0) {
                return null;
            }

            // Reason: Find common date range (intersection of all stock dates)
            const allDates = validStocks.map(s => s.data.map(d => d.date.getTime()));
            const commonDates = allDates.reduce((acc, dates) => {
                const dateSet = new Set(dates);
                return acc.filter(date => dateSet.has(date));
            }, allDates[0]);

            // Reason: Calculate weighted portfolio value for each date
            const portfolioData = commonDates.map(dateTime => {
                const date = new Date(dateTime);
                let weightedValue = 0;

                validStocks.forEach(stock => {
                    const dataPoint = stock.data.find(d => d.date.getTime() === dateTime);
                    if (dataPoint) {
                        // Reason: Weight by percentage allocation
                        weightedValue += dataPoint.close * (stock.percentage / 100);
                    }
                });

                return {
                    date,
                    close: weightedValue
                };
            });

            // Reason: Sort by date
            portfolioData.sort((a, b) => a.date - b.date);

            return portfolioData;
        } catch (error) {
            console.error('Error calculating weighted portfolio:', error);
            return null;
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HedgeFunds.init());
} else {
    HedgeFunds.init();
}

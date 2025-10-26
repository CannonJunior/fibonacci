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

        const html = this.hedgeFundsData.map(fund => this.createHedgeFundCard(fund)).join('');
        container.innerHTML = html;
    },

    /**
     * Create HTML for a single hedge fund card
     */
    createHedgeFundCard(fund) {
        const aum = this.formatCurrency(fund.aum);

        return `
            <div class="hedgefund-card" data-fund-id="${fund.id}">
                <div class="hedgefund-card-header">
                    <div class="hedgefund-info">
                        <div class="hedgefund-name">${fund.name}</div>
                        <div class="hedgefund-manager">${fund.manager}</div>
                        <div class="hedgefund-aum">AUM: ${aum}</div>
                    </div>
                    <button class="hedgefund-expand-btn" data-fund-id="${fund.id}">
                        <i class="fas fa-chevron-down"></i>
                    </button>
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
            await API.loadStock(symbol);
            Toast.success(`Loaded ${symbol}`);

            // Reason: Re-render hedge fund cards to update the UI
            await this.updateLoadedStocks();
            this.renderHedgeFundCards();
        } catch (error) {
            console.error(`Error loading ${symbol}:`, error);
            Toast.error(`Failed to load ${symbol}`);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HedgeFunds.init());
} else {
    HedgeFunds.init();
}

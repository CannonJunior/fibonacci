/**
 * Update Manager - Orchestrates stock data updates within API limits
 * Implements smart incremental updates and priority-based scheduling
 */

const UpdateManager = {
    updateQueue: [],
    isProcessing: false,
    updateInterval: null,

    /**
     * Initialize the update manager
     */
    async init() {
        console.log('📋 Update Manager initialized');

        // Start processing queue every 15 seconds
        this.updateInterval = setInterval(() => {
            this.processQueue();
        }, 15000);
    },

    /**
     * Register a symbol for tracking and updates
     * @param {string} symbol - Stock symbol
     * @param {number} priority - Priority level (1=highest, 4=lowest)
     */
    async registerSymbol(symbol, priority = 3) {
        try {
            const response = await fetch('/api/update/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, priority })
            });

            if (!response.ok) {
                throw new Error('Failed to register symbol');
            }

            console.log(`✅ Registered ${symbol} for updates (priority ${priority})`);
        } catch (error) {
            console.error(`Failed to register ${symbol}:`, error);
        }
    },

    /**
     * Queue an update for a symbol
     * @param {string} symbol - Stock symbol
     * @param {string} updateType - 'daily', 'overview', or 'financials'
     * @param {number} priority - Priority level
     */
    queueUpdate(symbol, updateType = 'daily', priority = 3) {
        // Reason: Avoid duplicate queue entries
        const existing = this.updateQueue.find(
            item => item.symbol === symbol && item.updateType === updateType
        );

        if (existing) {
            // Update priority if higher
            if (priority < existing.priority) {
                existing.priority = priority;
                this.updateQueue.sort((a, b) => a.priority - b.priority);
            }
            return;
        }

        this.updateQueue.push({
            symbol,
            updateType,
            priority,
            retryCount: 0,
            queuedAt: new Date()
        });

        // Sort by priority
        this.updateQueue.sort((a, b) => a.priority - b.priority);

        console.log(`📥 Queued ${symbol} (${updateType}) - Queue size: ${this.updateQueue.length}`);
    },

    /**
     * Process the update queue
     */
    async processQueue() {
        if (this.isProcessing || this.updateQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            // Check API quota
            const quotaResponse = await fetch('/api/update/quota');
            const quota = await quotaResponse.json();

            if (!quota.canUpdate) {
                console.log('⏸️  API quota exhausted, pausing updates');
                return;
            }

            // Process highest priority item
            const item = this.updateQueue.shift();

            console.log(`🔄 Processing update: ${item.symbol} (${item.updateType})`);

            try {
                await this.executeUpdate(item);
                console.log(`✅ Updated ${item.symbol}`);
            } catch (error) {
                console.error(`❌ Failed to update ${item.symbol}:`, error.message);

                // Retry logic
                item.retryCount++;
                if (item.retryCount < 3) {
                    // Re-queue with lower priority
                    item.priority = Math.min(item.priority + 1, 4);
                    this.updateQueue.push(item);
                    this.updateQueue.sort((a, b) => a.priority - b.priority);
                }
            }
        } finally {
            this.isProcessing = false;
        }
    },

    /**
     * Execute an update for a symbol
     * @param {Object} item - Queue item
     */
    async executeUpdate(item) {
        const { symbol, updateType } = item;

        const response = await fetch('/api/update/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, updateType })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Update failed');
        }

        const result = await response.json();

        // Reason: Emit event for UI to update
        window.dispatchEvent(new CustomEvent('stockUpdated', {
            detail: { symbol, updateType, result }
        }));

        return result;
    },

    /**
     * Update a specific symbol immediately (user-initiated)
     * @param {string} symbol - Stock symbol
     * @param {string} updateType - Type of update
     */
    async updateNow(symbol, updateType = 'daily') {
        Toast.info(`Updating ${symbol}...`);

        try {
            await this.executeUpdate({ symbol, updateType });
            Toast.success(`Updated ${symbol}`);
        } catch (error) {
            Toast.error(`Failed to update ${symbol}: ${error.message}`);
        }
    },

    /**
     * Update all visible stocks
     */
    async updateVisibleStocks() {
        // Reason: Get all symbols currently displayed on chart
        const visibleSymbols = new Set();

        // Add main stock
        if (CONFIG.stock.symbol) {
            visibleSymbols.add(CONFIG.stock.symbol);
        }

        // Add individual stocks from chart
        if (typeof Chart !== 'undefined' && Chart.activeIndividualStocks) {
            Chart.activeIndividualStocks.forEach((stock, symbol) => {
                if (stock.visible) {
                    visibleSymbols.add(symbol);
                }
            });
        }

        if (visibleSymbols.size === 0) {
            Toast.info('No stocks to update');
            return;
        }

        Toast.info(`Queuing ${visibleSymbols.size} stocks for update`);

        // Queue all visible stocks with high priority
        visibleSymbols.forEach(symbol => {
            this.queueUpdate(symbol, 'daily', 2);
        });

        // Start processing immediately
        this.processQueue();
    },

    /**
     * Get update status for a symbol
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} Update status
     */
    async getUpdateStatus(symbol) {
        try {
            const response = await fetch(`/api/update/status?symbol=${symbol}`);
            if (!response.ok) {
                throw new Error('Failed to get update status');
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to get status for ${symbol}:`, error);
            return null;
        }
    },

    /**
     * Get current API quota status
     * @returns {Promise<Object>} Quota status
     */
    async getQuotaStatus() {
        try {
            const response = await fetch('/api/update/quota');
            if (!response.ok) {
                throw new Error('Failed to get quota status');
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to get quota status:', error);
            return null;
        }
    },

    /**
     * Calculate data freshness
     * @param {string} lastUpdate - ISO date string
     * @returns {Object} Freshness info
     */
    calculateFreshness(lastUpdate) {
        if (!lastUpdate) {
            return { status: 'stale', color: 'red', message: 'Never updated' };
        }

        const now = new Date();
        const updated = new Date(lastUpdate);
        const hoursOld = (now - updated) / (1000 * 60 * 60);

        if (hoursOld < 4) {
            return { status: 'fresh', color: 'green', message: `Updated ${Math.round(hoursOld)}h ago` };
        } else if (hoursOld < 24) {
            return { status: 'aging', color: 'yellow', message: `Updated ${Math.round(hoursOld)}h ago` };
        } else {
            return { status: 'stale', color: 'red', message: `Updated ${Math.round(hoursOld / 24)}d ago` };
        }
    },

    /**
     * Stop the update manager
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('🛑 Update Manager stopped');
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UpdateManager.init());
} else {
    UpdateManager.init();
}

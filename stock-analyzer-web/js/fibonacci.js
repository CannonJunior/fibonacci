// Fibonacci calculator module
const Fibonacci = {
    /**
     * Calculate Fibonacci retracement levels from candle data
     * @param {Array} candles - Array of candle data
     * @param {Object} customSwing - Optional custom swing points {high: number, low: number, highDate: Date, lowDate: Date}
     * @returns {Object} Fibonacci retracement data
     */
    calculate(candles, customSwing = null) {
        if (!candles || candles.length === 0) {
            return null;
        }

        let swingHigh, swingLow, highDate, lowDate;

        if (customSwing) {
            swingHigh = customSwing.high;
            swingLow = customSwing.low;
            highDate = customSwing.highDate;
            lowDate = customSwing.lowDate;
        } else {
            // Find swing high and low automatically
            const swing = this.findSwingPoints(candles);
            swingHigh = swing.high;
            swingLow = swing.low;
            highDate = swing.highDate;
            lowDate = swing.lowDate;
        }

        const range = swingHigh - swingLow;
        const isUptrend = highDate > lowDate;

        // Calculate each level
        const levels = CONFIG.fibonacci.levels.map(ratio => {
            const price = swingHigh - (range * ratio);
            return {
                ratio,
                price,
                label: `${(ratio * 100).toFixed(1)}%`,
                color: CONFIG.fibonacci.colors[ratio.toString()] || '#FFFFFF'
            };
        });

        return {
            swingHigh,
            swingLow,
            highDate,
            lowDate,
            range,
            isUptrend,
            levels
        };
    },

    /**
     * Find swing high and low points from candles
     * @param {Array} candles
     * @returns {Object}
     */
    findSwingPoints(candles) {
        let highestCandle = candles[0];
        let lowestCandle = candles[0];

        for (const candle of candles) {
            if (candle.high > highestCandle.high) {
                highestCandle = candle;
            }
            if (candle.low < lowestCandle.low) {
                lowestCandle = candle;
            }
        }

        return {
            high: highestCandle.high,
            low: lowestCandle.low,
            highDate: highestCandle.date,
            lowDate: lowestCandle.date
        };
    },

    /**
     * Recalculate Fibonacci from a clicked point
     * @param {Array} candles
     * @param {Object} clickedCandle
     * @param {Object} currentFib
     * @returns {Object}
     */
    recalculateFromClick(candles, clickedCandle, currentFib) {
        const midPoint = (currentFib.swingHigh + currentFib.swingLow) / 2;
        const clickedPrice = clickedCandle.high;

        let customSwing;
        if (clickedPrice > midPoint) {
            // Use clicked point as new swing high
            customSwing = {
                high: clickedPrice,
                low: currentFib.swingLow,
                highDate: clickedCandle.date,
                lowDate: currentFib.lowDate
            };
        } else {
            // Use clicked point as new swing low
            customSwing = {
                high: currentFib.swingHigh,
                low: clickedPrice,
                highDate: currentFib.highDate,
                lowDate: clickedCandle.date
            };
        }

        return this.calculate(candles, customSwing);
    }
};

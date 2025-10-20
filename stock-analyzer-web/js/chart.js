// D3.js Chart module with interactive candlestick chart
const Chart = {
    svg: null,
    width: 0,
    height: 0,
    xScale: null,
    yScale: null,
    data: null,
    fibonacci: null,
    showFibonacci: true,
    onCandleClick: null,

    /**
     * Initialize and render the chart
     * @param {Array} candles - Array of candle data
     * @param {Object} fibonacciData - Fibonacci retracement data
     */
    render(candles, fibonacciData) {
        this.data = candles;
        this.fibonacci = fibonacciData;

        // Clear previous chart
        d3.select('#chart').selectAll('*').remove();

        // Setup dimensions
        const container = document.querySelector('.chart-container');
        this.width = container.clientWidth - CONFIG.chart.margin.left - CONFIG.chart.margin.right;
        this.height = 600 - CONFIG.chart.margin.top - CONFIG.chart.margin.bottom;

        // Create SVG
        this.svg = d3.select('#chart')
            .attr('width', this.width + CONFIG.chart.margin.left + CONFIG.chart.margin.right)
            .attr('height', this.height + CONFIG.chart.margin.top + CONFIG.chart.margin.bottom)
            .append('g')
            .attr('transform', `translate(${CONFIG.chart.margin.left},${CONFIG.chart.margin.top})`);

        // Setup scales
        this.setupScales();

        // Draw chart components
        this.drawGrid();
        this.drawAxes();
        this.drawCandles();
        if (this.showFibonacci && this.fibonacci) {
            this.drawFibonacci();
        }
    },

    /**
     * Setup X and Y scales
     */
    setupScales() {
        // X scale (time)
        this.xScale = d3.scaleTime()
            .domain(d3.extent(this.data, d => d.date))
            .range([0, this.width]);

        // Y scale (price)
        const yMin = d3.min(this.data, d => d.low);
        const yMax = d3.max(this.data, d => d.high);
        const yPadding = (yMax - yMin) * 0.1;

        this.yScale = d3.scaleLinear()
            .domain([yMin - yPadding, yMax + yPadding])
            .range([this.height, 0]);
    },

    /**
     * Draw grid lines
     */
    drawGrid() {
        // Horizontal grid
        this.svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(this.yScale)
                .tickSize(-this.width)
                .tickFormat('')
                .ticks(8)
            );

        // Vertical grid
        this.svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale)
                .tickSize(-this.height)
                .tickFormat('')
                .ticks(CONFIG.chart.xAxisTicks)
            );
    },

    /**
     * Draw X and Y axes
     */
    drawAxes() {
        // X axis (dates) - reduced to ~6 ticks
        this.svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale)
                .ticks(CONFIG.chart.xAxisTicks)
                .tickFormat(d => API.formatShortDate(d))
            );

        // Y axis (prices)
        this.svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(this.yScale)
                .tickFormat(d => `$${d.toFixed(2)}`)
                .ticks(8)
            );

        // Right Y axis
        this.svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(${this.width},0)`)
            .call(d3.axisRight(this.yScale)
                .tickFormat(d => `$${d.toFixed(2)}`)
                .ticks(8)
            );
    },

    /**
     * Draw candlesticks with interaction
     */
    drawCandles() {
        const candleGroup = this.svg.selectAll('.candle-group')
            .data(this.data)
            .enter()
            .append('g')
            .attr('class', d => `candle-group candle-${d.close >= d.open ? 'bullish' : 'bearish'}`)
            .attr('transform', d => `translate(${this.xScale(d.date)},0)`);

        // Draw wicks
        candleGroup.append('line')
            .attr('class', 'candle-wick')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', d => this.yScale(d.high))
            .attr('y2', d => this.yScale(d.low));

        // Draw candle bodies
        candleGroup.append('rect')
            .attr('class', 'candle-body')
            .attr('x', -CONFIG.chart.candleWidth / 2)
            .attr('y', d => this.yScale(Math.max(d.open, d.close)))
            .attr('width', CONFIG.chart.candleWidth)
            .attr('height', d => {
                const height = Math.abs(this.yScale(d.open) - this.yScale(d.close));
                return height === 0 ? 1 : height;
            });

        // Add hover and click interactions
        candleGroup
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mousemove', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => {
                if (this.onCandleClick) {
                    this.onCandleClick(d);
                }
            });
    },

    /**
     * Draw Fibonacci retracement levels
     */
    drawFibonacci() {
        if (!this.fibonacci) return;

        const fibGroup = this.svg.append('g').attr('class', 'fibonacci-group');

        // Draw horizontal lines for each level
        this.fibonacci.levels.forEach(level => {
            const y = this.yScale(level.price);

            // Line
            fibGroup.append('line')
                .attr('class', 'fibonacci-line')
                .attr('x1', 0)
                .attr('x2', this.width)
                .attr('y1', y)
                .attr('y2', y)
                .attr('stroke', level.color)
                .transition()
                .duration(500)
                .attr('opacity', 0.7);

            // Label
            fibGroup.append('text')
                .attr('class', 'fibonacci-label')
                .attr('x', this.width - 60)
                .attr('y', y - 5)
                .attr('fill', level.color)
                .text(`${level.label} $${level.price.toFixed(2)}`)
                .transition()
                .duration(500)
                .attr('opacity', 1);
        });

        // Draw swing markers
        this.drawSwingMarkers();
    },

    /**
     * Draw swing high/low markers
     */
    drawSwingMarkers() {
        if (!this.fibonacci) return;

        // Find indices
        const highIndex = this.data.findIndex(d => d.date.getTime() === this.fibonacci.highDate.getTime());
        const lowIndex = this.data.findIndex(d => d.date.getTime() === this.fibonacci.lowDate.getTime());

        if (highIndex === -1 || lowIndex === -1) return;

        // High marker
        const highCandle = this.data[highIndex];
        this.svg.append('circle')
            .attr('cx', this.xScale(highCandle.date))
            .attr('cy', this.yScale(this.fibonacci.swingHigh))
            .attr('r', 0)
            .attr('fill', '#f4212e')
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .transition()
            .duration(500)
            .attr('r', 8);

        this.svg.append('text')
            .attr('x', this.xScale(highCandle.date))
            .attr('y', this.yScale(this.fibonacci.swingHigh) + 4)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('opacity', 0)
            .text('H')
            .transition()
            .duration(500)
            .attr('opacity', 1);

        // Low marker
        const lowCandle = this.data[lowIndex];
        this.svg.append('circle')
            .attr('cx', this.xScale(lowCandle.date))
            .attr('cy', this.yScale(this.fibonacci.swingLow))
            .attr('r', 0)
            .attr('fill', '#00ba7c')
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .transition()
            .duration(500)
            .attr('r', 8);

        this.svg.append('text')
            .attr('x', this.xScale(lowCandle.date))
            .attr('y', this.yScale(this.fibonacci.swingLow) + 4)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('opacity', 0)
            .text('L')
            .transition()
            .duration(500)
            .attr('opacity', 1);
    },

    /**
     * Show tooltip on hover
     */
    showTooltip(event, candle) {
        const tooltip = d3.select('#tooltip');

        const html = `
            <div class="date">${API.formatDate(candle.date)}</div>
            <div class="price-line"><span>Open:</span> <span>$${candle.open.toFixed(2)}</span></div>
            <div class="price-line"><span>High:</span> <span>$${candle.high.toFixed(2)}</span></div>
            <div class="price-line"><span>Low:</span> <span>$${candle.low.toFixed(2)}</span></div>
            <div class="price-line"><span>Close:</span> <span>$${candle.close.toFixed(2)}</span></div>
        `;

        tooltip
            .html(html)
            .style('display', 'block')
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 15) + 'px');
    },

    /**
     * Hide tooltip
     */
    hideTooltip() {
        d3.select('#tooltip').style('display', 'none');
    },

    /**
     * Toggle Fibonacci display
     */
    toggleFibonacci() {
        this.showFibonacci = !this.showFibonacci;
        this.render(this.data, this.fibonacci);
    }
};

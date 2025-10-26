// D3.js Chart module with interactive candlestick chart
const Chart = {
    svg: null,
    width: 0,
    height: 0,
    xScale: null,
    yScale: null,
    yScalePercent: null,  // Right y-axis for subsector percentages
    xScaleOriginal: null,
    data: null,
    fibonacci: null,
    showFibonacci: true,
    onCandleClick: null,
    zoom: null,
    currentTransform: null,
    contextMenuTarget: null,
    intradayData: null,
    isIntradayMode: false,
    dailyData: null,
    dailyFibonacci: null,
    activeSubsectors: new Map(),  // Map of subsectorKey -> {data, color, visible}
    activeSectors: new Map(),  // Map of sector -> {data, color, visible}
    activeIndividualStocks: new Map(),  // Map of symbol -> {data, color, visible}

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
        const chartElement = document.getElementById('chart');

        // Reason: Ensure we get the full available width, accounting for padding
        // Use window.innerWidth as fallback if container hasn't been laid out yet
        const rawContainerWidth = container.clientWidth;
        const containerWidth = rawContainerWidth > 100 ? rawContainerWidth - 40 : window.innerWidth - 100;
        this.width = containerWidth - CONFIG.chart.margin.left - CONFIG.chart.margin.right;
        this.height = 1000 - CONFIG.chart.margin.top - CONFIG.chart.margin.bottom;

        // Create SVG
        const mainSvg = d3.select('#chart')
            .attr('width', this.width + CONFIG.chart.margin.left + CONFIG.chart.margin.right)
            .attr('height', this.height + CONFIG.chart.margin.top + CONFIG.chart.margin.bottom);

        // Reason: Add clip path to prevent lines from extending past axes
        mainSvg.append('defs').append('clipPath')
            .attr('id', 'chart-clip')
            .append('rect')
            .attr('width', this.width)
            .attr('height', this.height);

        this.svg = mainSvg.append('g')
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

        // Reason: Draw subsector lines if any are active
        this.drawSubsectors();

        // Reason: Draw sector lines if any are active
        this.drawSectors();

        // Reason: Draw individual stock lines if any are active
        this.drawIndividualStocks();

        // Setup zoom behavior
        this.setupZoom();

        // Setup brush for x-axis navigation
        this.setupBrush();
    },

    /**
     * Setup X and Y scales
     */
    setupScales() {
        // X scale (time)
        this.xScale = d3.scaleTime()
            .domain(d3.extent(this.data, d => d.date))
            .range([0, this.width]);

        // Save original scale for zoom
        this.xScaleOriginal = this.xScale.copy();

        // Y scale (price)
        const yMin = d3.min(this.data, d => d.low);
        const yMax = d3.max(this.data, d => d.high);
        const yPadding = (yMax - yMin) * 0.1;

        this.yScale = d3.scaleLinear()
            .domain([yMin - yPadding, yMax + yPadding])
            .range([this.height, 0]);

        // Reason: Right Y scale for subsector and sector percentage data
        // Find min/max across all active subsectors and sectors
        let percentMin = 0;
        let percentMax = 0;
        this.activeSubsectors.forEach(subsector => {
            if (subsector.data && subsector.data.length > 0) {
                const min = d3.min(subsector.data, d => d.percentChange);
                const max = d3.max(subsector.data, d => d.percentChange);
                percentMin = Math.min(percentMin, min);
                percentMax = Math.max(percentMax, max);
            }
        });
        this.activeSectors.forEach(sector => {
            if (sector.data && sector.data.length > 0) {
                const min = d3.min(sector.data, d => d.percentChange);
                const max = d3.max(sector.data, d => d.percentChange);
                percentMin = Math.min(percentMin, min);
                percentMax = Math.max(percentMax, max);
            }
        });

        // Add padding
        const percentPadding = Math.max(5, (percentMax - percentMin) * 0.1);
        this.yScalePercent = d3.scaleLinear()
            .domain([percentMin - percentPadding, percentMax + percentPadding])
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
            .attr('class', 'axis axis-bottom')
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

        // Right Y axis - Reason: Show percentage scale when subsectors are active
        if (this.activeSubsectors.size > 0) {
            this.svg.append('g')
                .attr('class', 'axis axis-percent')
                .attr('transform', `translate(${this.width},0)`)
                .call(d3.axisRight(this.yScalePercent)
                    .tickFormat(d => `${d.toFixed(1)}%`)
                    .ticks(8)
                );
        } else {
            this.svg.append('g')
                .attr('class', 'axis')
                .attr('transform', `translate(${this.width},0)`)
                .call(d3.axisRight(this.yScale)
                    .tickFormat(d => `$${d.toFixed(2)}`)
                    .ticks(8)
                );
        }
    },

    /**
     * Draw candlesticks with interaction
     */
    drawCandles() {
        const candleGroup = this.svg.selectAll('.candle-group')
            .data(this.data)
            .enter()
            .append('g')
            .attr('class', d => {
                const baseClass = `candle-group candle-${d.close >= d.open ? 'bullish' : 'bearish'}`;
                // Reason: Add special class if this candle has cached intraday data
                const hasIntraday = API.hasIntradayData(CONFIG.stock.symbol, d.date);
                return hasIntraday ? `${baseClass} candle-has-intraday` : baseClass;
            })
            .attr('transform', d => `translate(${this.xScale(d.date)},0)`)
            .attr('clip-path', 'url(#chart-clip)');  // Reason: Clip candles to chart area

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
                .attr('x', 10)
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
            .attr('class', 'swing-marker swing-high-circle')
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
            .attr('class', 'swing-marker swing-high-text')
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
            .attr('class', 'swing-marker swing-low-circle')
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
            .attr('class', 'swing-marker swing-low-text')
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

        // Reason: Use clientX/clientY with fixed positioning for accurate cursor placement
        tooltip
            .html(html)
            .style('display', 'block')
            .style('left', event.clientX + 'px')
            .style('top', event.clientY + 'px');
    },

    /**
     * Hide tooltip
     */
    hideTooltip() {
        d3.select('#tooltip').style('display', 'none');
    },

    /**
     * Setup D3 zoom behavior for x-axis scaling
     * Scroll down = zoom out, Scroll up = zoom in
     */
    setupZoom() {
        const self = this;

        // Create zoom behavior with custom wheel delta for inverted zoom
        this.zoom = d3.zoom()
            .scaleExtent([0.5, 50]) // Min zoom out 0.5x, max zoom in 50x
            .filter(function(event) {
                // Reason: Disable double-click zoom and click-drag pan, only allow wheel zoom
                return event.type === 'wheel';
            })
            .wheelDelta(function(event) {
                // Reason: Negate deltaY to invert zoom direction
                // Scroll down (positive deltaY) = zoom out (negative delta)
                // Scroll up (negative deltaY) = zoom in (positive delta)
                return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002);
            })
            .on('zoom', function(event) {
                self.handleZoom(event);
            });

        // Apply zoom to the SVG element and prevent default scrolling
        d3.select('#chart')
            .call(this.zoom)
            .on('wheel', function(event) {
                // Reason: Prevent page scroll when mouse is over chart
                event.preventDefault();
            }, { passive: false });

        // Store initial transform
        this.currentTransform = d3.zoomIdentity;
    },

    /**
     * Handle zoom events
     */
    handleZoom(event) {
        this.currentTransform = event.transform;

        // Update x-scale with zoom transform
        const newXScale = this.currentTransform.rescaleX(this.xScaleOriginal);
        this.xScale = newXScale;

        // Get visible data range
        const visibleDomain = newXScale.domain();
        const visibleData = this.data.filter(d =>
            d.date >= visibleDomain[0] && d.date <= visibleDomain[1]
        );

        // Update axes
        this.updateAxes();

        // Update candles
        this.updateCandles(visibleData);

        // Update Fibonacci if shown
        if (this.showFibonacci && this.fibonacci) {
            this.updateFibonacci();
        }

        // Reason: Update subsector lines after zoom
        if (this.activeSubsectors.size > 0) {
            this.updateSubsectors();
        }

        // Reason: Update sector lines after zoom
        if (this.activeSectors.size > 0) {
            this.updateSectors();
        }

        // Reason: Update individual stock lines after zoom
        if (this.activeIndividualStocks.size > 0) {
            this.updateIndividualStocks();
        }
    },

    /**
     * Update axes after zoom
     */
    updateAxes() {
        // Update bottom axis
        this.svg.select('.axis-bottom')
            .call(d3.axisBottom(this.xScale)
                .ticks(CONFIG.chart.xAxisTicks)
                .tickFormat(d => API.formatShortDate(d))
            );
    },

    /**
     * Update candles after zoom
     */
    updateCandles(visibleData) {
        const self = this;

        // Update candle positions
        const candleGroups = this.svg.selectAll('.candle-group')
            .data(this.data, d => d.date);

        // Update positions
        candleGroups
            .attr('transform', d => `translate(${this.xScale(d.date)},0)`)
            .style('display', d => {
                const domain = this.xScale.domain();
                return (d.date >= domain[0] && d.date <= domain[1]) ? null : 'none';
            });
    },

    /**
     * Update Fibonacci lines after zoom
     */
    updateFibonacci() {
        if (!this.fibonacci) return;

        // Update Fibonacci line positions
        this.svg.selectAll('.fibonacci-line')
            .attr('x2', this.width);

        // Labels stay on the left at x=10, no need to update position
        // this.svg.selectAll('.fibonacci-label')
        //     .attr('x', 10);

        // Update swing marker positions
        const highIndex = this.data.findIndex(d => d.date.getTime() === this.fibonacci.highDate.getTime());
        const lowIndex = this.data.findIndex(d => d.date.getTime() === this.fibonacci.lowDate.getTime());

        if (highIndex !== -1) {
            const highCandle = this.data[highIndex];
            const newX = this.xScale(highCandle.date);

            this.svg.select('.swing-high-circle')
                .attr('cx', newX);

            this.svg.select('.swing-high-text')
                .attr('x', newX);
        }

        if (lowIndex !== -1) {
            const lowCandle = this.data[lowIndex];
            const newX = this.xScale(lowCandle.date);

            this.svg.select('.swing-low-circle')
                .attr('cx', newX);

            this.svg.select('.swing-low-text')
                .attr('x', newX);
        }
    },

    /**
     * Toggle Fibonacci display
     */
    toggleFibonacci() {
        this.showFibonacci = !this.showFibonacci;
        this.render(this.data, this.fibonacci);
    },

    /**
     * Setup context menu handlers
     */
    setupContextMenu() {
        const self = this;
        const contextMenu = document.getElementById('contextMenu');
        const svg = document.getElementById('chart');

        // Prevent default browser context menu on SVG
        svg.addEventListener('contextmenu', function(event) {
            event.preventDefault();

            // Find if we clicked on a candle
            const target = event.target;
            const candleGroup = target.closest('.candle-group');

            if (candleGroup) {
                // Store the candle data
                const candleData = d3.select(candleGroup).datum();
                self.contextMenuTarget = candleData;

                // Reason: Use clientX/clientY with fixed positioning for accurate cursor placement
                contextMenu.style.left = event.clientX + 'px';
                contextMenu.style.top = event.clientY + 'px';
                contextMenu.classList.add('visible');
            }
        });

        // Hide context menu when clicking elsewhere
        document.addEventListener('click', function() {
            contextMenu.classList.remove('visible');
        });

        // Handle context menu item clicks
        const fetchIntradayItem = contextMenu.querySelector('[data-action="fetch-intraday"]');
        fetchIntradayItem.addEventListener('click', async function(event) {
            event.stopPropagation();

            if (!self.contextMenuTarget) return;

            const targetDate = self.contextMenuTarget.date;
            const symbol = CONFIG.stock.symbol;

            // Reason: Ask user for confirmation before fetching
            const userConfirmed = confirm(
                `Would you like to fetch intraday data for ${symbol} on ${API.formatDate(targetDate)}?`
            );

            if (!userConfirmed) {
                contextMenu.classList.remove('visible');
                return;
            }

            try {
                // Check if data already exists
                const hasData = API.hasIntradayData(symbol, targetDate);

                let intradayCandles;
                if (hasData) {
                    console.log('Intraday data already cached, using existing data');
                    intradayCandles = await API.fetchIntradayData(symbol, targetDate);
                } else {
                    console.log('Fetching new intraday data...');
                    // Show loading indicator
                    const loadingDiv = document.getElementById('loading');
                    loadingDiv.style.display = 'flex';

                    intradayCandles = await API.fetchIntradayData(symbol, targetDate);

                    loadingDiv.style.display = 'none';
                }

                if (intradayCandles.length === 0) {
                    alert(`No intraday data available for ${API.formatDate(targetDate)}. The market may have been closed on this day.`);
                    contextMenu.classList.remove('visible');
                    return;
                }

                // Store daily data before switching to intraday
                if (!self.dailyData) {
                    self.dailyData = self.data;
                    self.dailyFibonacci = self.fibonacci;
                }

                // Store intraday data and switch to intraday mode
                self.intradayData = intradayCandles;
                self.isIntradayMode = true;

                // Re-render chart with intraday data
                self.render(intradayCandles, null);

                // Zoom to fit the intraday data
                self.resetZoom();

                // Show the return to daily button
                document.getElementById('returnToDaily').style.display = 'inline-block';

            } catch (error) {
                alert(`Error fetching intraday data: ${error.message}`);
            }

            contextMenu.classList.remove('visible');
        });
    },

    /**
     * Reset zoom to initial view
     */
    resetZoom() {
        if (this.zoom && this.svg) {
            d3.select('#chart')
                .transition()
                .duration(750)
                .call(this.zoom.transform, d3.zoomIdentity);
        }
    },

    /**
     * Return to daily chart view from intraday
     */
    returnToDailyView() {
        if (this.dailyData) {
            this.isIntradayMode = false;
            this.render(this.dailyData, this.dailyFibonacci);
            this.resetZoom();

            // Hide the return button
            document.getElementById('returnToDaily').style.display = 'none';
        }
    },

    /**
     * Toggle subsector display on/off
     * @param {string} subsectorKey - Unique subsector key (sector|subsector)
     */
    async toggleSubsector(subsectorKey) {
        console.log('Chart.toggleSubsector called with:', subsectorKey);
        console.log('Current active subsectors:', this.activeSubsectors);
        console.log('this.data:', this.data);
        console.log('this.fibonacci:', this.fibonacci);

        if (this.activeSubsectors.has(subsectorKey)) {
            // Remove subsector
            console.log('Removing subsector:', subsectorKey);
            this.activeSubsectors.delete(subsectorKey);
        } else {
            // Fetch subsector data from database
            console.log('Fetching subsector data for:', subsectorKey);
            try {
                const url = `/api/get-subsector-performance?subsectorKey=${encodeURIComponent(subsectorKey)}`;
                console.log('Fetching from URL:', url);
                const response = await fetch(url);
                const result = await response.json();
                console.log('API response:', result);

                if (result.performanceData) {
                    // Parse dates
                    const data = result.performanceData.map(d => ({
                        date: new Date(d.date),
                        percentChange: d.percentChange,
                        sector: d.sector,
                        subsector: d.subsector
                    }));

                    console.log('Parsed data:', data);

                    // Assign a color from Sidebar's sector color scheme
                    const [sector] = subsectorKey.split('|');
                    const color = Sidebar.getSectorColor(sector);

                    console.log('Sector:', sector, 'Color:', color);

                    // Add to active subsectors
                    this.activeSubsectors.set(subsectorKey, {
                        data,
                        color,
                        visible: true
                    });
                    console.log('Added to active subsectors. Size now:', this.activeSubsectors.size);
                } else {
                    console.log('No performanceData in result');
                }
            } catch (error) {
                console.error(`Failed to fetch subsector data for ${subsectorKey}:`, error);
                return;
            }
        }

        // Re-render chart
        console.log('Re-rendering chart with data:', this.data, 'and fibonacci:', this.fibonacci);
        this.render(this.data, this.fibonacci);
    },

    /**
     * Toggle sector display on/off
     * @param {string} sector - Sector name
     */
    async toggleSector(sector) {
        console.log('Chart.toggleSector called with:', sector);
        console.log('Current active sectors:', this.activeSectors);

        if (this.activeSectors.has(sector)) {
            // Remove sector
            console.log('Removing sector:', sector);
            this.activeSectors.delete(sector);
        } else {
            // Fetch sector data from database
            console.log('Fetching sector data for:', sector);
            try {
                const url = `/api/get-sector-performance?sector=${encodeURIComponent(sector)}`;
                console.log('Fetching from URL:', url);
                const response = await fetch(url);
                const result = await response.json();
                console.log('API response:', result);

                if (result.performanceData) {
                    // Parse dates
                    const data = result.performanceData.map(d => ({
                        date: new Date(d.date),
                        percentChange: d.percentChange,
                        sector: d.sector
                    }));

                    console.log('Parsed data:', data);

                    // Assign a color from Sidebar's sector color scheme
                    const color = Sidebar.getSectorColor(sector);

                    console.log('Sector:', sector, 'Color:', color);

                    // Add to active sectors
                    this.activeSectors.set(sector, {
                        data,
                        color,
                        visible: true
                    });
                    console.log('Added to active sectors. Size now:', this.activeSectors.size);
                } else {
                    console.log('No performanceData in result');
                }
            } catch (error) {
                console.error(`Failed to fetch sector data for ${sector}:`, error);
                return;
            }
        }

        // Re-render chart
        console.log('Re-rendering chart with data:', this.data, 'and fibonacci:', this.fibonacci);
        this.render(this.data, this.fibonacci);
    },

    /**
     * Draw subsector lines
     */
    drawSubsectors() {
        if (this.activeSubsectors.size === 0) return;

        const line = d3.line()
            .x(d => this.xScale(d.date))
            .y(d => this.yScalePercent(d.percentChange))
            .curve(d3.curveMonotoneX);

        this.activeSubsectors.forEach((subsector, key) => {
            if (!subsector.visible) return;

            this.svg.append('path')
                .datum(subsector.data)
                .attr('class', 'subsector-line')
                .attr('fill', 'none')
                .attr('stroke', subsector.color)
                .attr('stroke-width', 2)
                .attr('clip-path', 'url(#chart-clip)')  // Reason: Clip lines to chart area
                .attr('d', line);

            // Add label at the end of the line
            const lastPoint = subsector.data[subsector.data.length - 1];
            if (lastPoint) {
                this.svg.append('text')
                    .attr('class', 'subsector-label')
                    .attr('x', this.xScale(lastPoint.date) + 5)
                    .attr('y', this.yScalePercent(lastPoint.percentChange))
                    .attr('fill', subsector.color)
                    .attr('font-size', '11px')
                    .attr('font-weight', '600')
                    .text(lastPoint.subsector);
            }
        });
    },

    /**
     * Update subsector lines after zoom
     * Reason: Redraw subsector lines with updated xScale when user zooms
     */
    updateSubsectors() {
        if (this.activeSubsectors.size === 0) return;

        // Reason: Remove old subsector lines and labels
        this.svg.selectAll('.subsector-line').remove();
        this.svg.selectAll('.subsector-label').remove();

        // Reason: Redraw with updated scales
        this.drawSubsectors();
    },

    /**
     * Draw sector lines
     */
    drawSectors() {
        if (this.activeSectors.size === 0) return;

        const line = d3.line()
            .x(d => this.xScale(d.date))
            .y(d => this.yScalePercent(d.percentChange))
            .curve(d3.curveMonotoneX);

        this.activeSectors.forEach((sector, sectorName) => {
            if (!sector.visible) return;

            this.svg.append('path')
                .datum(sector.data)
                .attr('class', 'sector-line')
                .attr('fill', 'none')
                .attr('stroke', sector.color)
                .attr('stroke-width', 3)  // Thicker than subsector lines
                .attr('stroke-dasharray', '5,5')  // Dashed line to distinguish from subsectors
                .attr('clip-path', 'url(#chart-clip)')  // Reason: Clip lines to chart area
                .attr('d', line);

            // Add label at the end of the line
            const lastPoint = sector.data[sector.data.length - 1];
            if (lastPoint) {
                this.svg.append('text')
                    .attr('class', 'sector-label')
                    .attr('x', this.xScale(lastPoint.date) + 5)
                    .attr('y', this.yScalePercent(lastPoint.percentChange))
                    .attr('fill', sector.color)
                    .attr('font-size', '12px')
                    .attr('font-weight', '700')
                    .text(sectorName);
            }
        });
    },

    /**
     * Update sector lines after zoom
     * Reason: Redraw sector lines with updated xScale when user zooms
     */
    updateSectors() {
        if (this.activeSectors.size === 0) return;

        // Reason: Remove old sector lines and labels
        this.svg.selectAll('.sector-line').remove();
        this.svg.selectAll('.sector-label').remove();

        // Reason: Redraw with updated scales
        this.drawSectors();
    },

    /**
     * Draw individual stock lines on the chart
     * Reason: Display individual stocks as line series similar to subsectors
     */
    drawIndividualStocks() {
        if (this.activeIndividualStocks.size === 0) return;

        // Reason: Create line generator using price scale (yScale), not percent scale
        const line = d3.line()
            .x(d => this.xScale(d.date))
            .y(d => this.yScale(d.close))
            .curve(d3.curveMonotoneX);

        this.activeIndividualStocks.forEach((stock, symbol) => {
            if (!stock.visible) return;

            // Reason: Filter stock data to only include dates within current chart range
            const visibleData = stock.data.filter(d => {
                const date = d.date;
                return date >= this.xScale.domain()[0] && date <= this.xScale.domain()[1];
            });

            if (visibleData.length === 0) return;

            // Reason: Draw line path
            this.svg.append('path')
                .datum(visibleData)
                .attr('class', 'individual-stock-line')
                .attr('data-symbol', symbol)
                .attr('fill', 'none')
                .attr('stroke', stock.color)
                .attr('stroke-width', 2)
                .attr('opacity', 0.8)
                .attr('d', line);

            // Reason: Add label at end of line
            const lastPoint = visibleData[visibleData.length - 1];
            if (lastPoint) {
                this.svg.append('text')
                    .attr('class', 'individual-stock-label')
                    .attr('data-symbol', symbol)
                    .attr('x', this.xScale(lastPoint.date) + 5)
                    .attr('y', this.yScale(lastPoint.close))
                    .attr('fill', stock.color)
                    .attr('font-size', '12px')
                    .attr('font-weight', '700')
                    .text(symbol);
            }
        });
    },

    /**
     * Update individual stock lines after zoom
     * Reason: Redraw individual stock lines with updated xScale when user zooms
     */
    updateIndividualStocks() {
        if (this.activeIndividualStocks.size === 0) return;

        // Reason: Remove old individual stock lines and labels
        this.svg.selectAll('.individual-stock-line').remove();
        this.svg.selectAll('.individual-stock-label').remove();

        // Reason: Redraw with updated scales
        this.drawIndividualStocks();
    },

    /**
     * Setup brush/slider for x-axis navigation
     * Reason: Allow user to select a window of data to view with mouse drag
     */
    setupBrush() {
        const brushHeight = 80;
        const brushMargin = { top: 20, right: CONFIG.chart.margin.right, bottom: 30, left: CONFIG.chart.margin.left };

        // Clear previous brush chart
        d3.select('#brush-chart').selectAll('*').remove();

        // Create brush SVG
        const brushSvg = d3.select('#brush-chart')
            .attr('width', this.width + CONFIG.chart.margin.left + CONFIG.chart.margin.right)
            .attr('height', brushHeight + brushMargin.top + brushMargin.bottom);

        // Create brush scale (same domain as main chart, different range)
        const brushXScale = d3.scaleTime()
            .domain(d3.extent(this.data, d => d.date))
            .range([0, this.width]);

        const brushYScale = d3.scaleLinear()
            .domain([d3.min(this.data, d => d.low), d3.max(this.data, d => d.high)])
            .range([brushHeight, 0]);

        // Draw simplified area chart in brush
        const area = d3.area()
            .x(d => brushXScale(d.date))
            .y0(brushHeight)
            .y1(d => brushYScale(d.close))
            .curve(d3.curveMonotoneX);

        const brushGroup = brushSvg.append('g')
            .attr('transform', `translate(${brushMargin.left},${brushMargin.top})`);

        brushGroup.append('path')
            .datum(this.data)
            .attr('fill', 'rgba(29, 155, 240, 0.3)')
            .attr('stroke', 'rgba(29, 155, 240, 0.6)')
            .attr('stroke-width', 1)
            .attr('d', area);

        // Add brush behavior
        const self = this;
        const brush = d3.brushX()
            .extent([[0, 0], [this.width, brushHeight]])
            .on('brush end', function(event) {
                if (!event.selection) return;

                const [x0, x1] = event.selection.map(brushXScale.invert);

                // Update main chart's xScale domain
                self.xScale.domain([x0, x1]);

                // Update axes
                self.updateAxes();

                // Filter visible data
                const visibleData = self.data.filter(d => d.date >= x0 && d.date <= x1);

                // Update candles
                self.updateCandles(visibleData);

                // Update Fibonacci if shown
                if (self.showFibonacci && self.fibonacci) {
                    self.updateFibonacci();
                }

                // Update subsector lines if any
                if (self.activeSubsectors.size > 0) {
                    self.updateSubsectors();
                }

                // Update sector lines if any
                if (self.activeSectors.size > 0) {
                    self.updateSectors();
                }
            });

        brushGroup.append('g')
            .attr('class', 'brush')
            .call(brush)
            .call(brush.move, brushXScale.range()); // Initialize with full range

        // Add x-axis to brush chart
        brushGroup.append('g')
            .attr('class', 'axis axis-bottom')
            .attr('transform', `translate(0,${brushHeight})`)
            .call(d3.axisBottom(brushXScale)
                .ticks(6)
                .tickFormat(d => API.formatShortDate(d))
            );
    },

    /**
     * Show an individual stock on the chart
     * @param {string} symbol - Stock symbol to display
     */
    async showIndividualStock(symbol) {
        console.log('Chart.showIndividualStock called with:', symbol);

        // Reason: Check if stock is already displayed
        if (this.activeIndividualStocks.has(symbol)) {
            const stock = this.activeIndividualStocks.get(symbol);
            stock.visible = true;
            this.updateIndividualStocks();
            this.updateIndividualStocksSection();
            return;
        }

        // Reason: Fetch stock data from the database
        try {
            const response = await fetch(`/api/get-daily?symbol=${symbol}`);
            const result = await response.json();

            if (result.data && result.data.length > 0) {
                // Reason: Process stock data to match chart date range
                const stockData = result.data.map(d => ({
                    date: new Date(d.date),
                    close: d.close
                }));

                // Reason: Generate a unique color for this stock
                const color = this.generateStockColor(symbol);

                // Reason: Add to active individual stocks
                this.activeIndividualStocks.set(symbol, {
                    data: stockData,
                    color,
                    visible: true
                });

                console.log(`Added ${symbol} to active individual stocks`);

                // Reason: Draw the chart to show the new stock line
                this.drawIndividualStocks();

                // Reason: Update Individual Stocks section in UI
                this.updateIndividualStocksSection();
            } else {
                console.error('No data returned for symbol:', symbol);
                Toast.error(`Failed to load ${symbol} data`);
            }
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            Toast.error(`Failed to load ${symbol}`);
        }
    },

    /**
     * Hide an individual stock from the chart
     * @param {string} symbol - Stock symbol to hide
     */
    hideIndividualStock(symbol) {
        console.log('Chart.hideIndividualStock called with:', symbol);

        if (this.activeIndividualStocks.has(symbol)) {
            const stock = this.activeIndividualStocks.get(symbol);
            stock.visible = false;
            this.updateIndividualStocks();
            this.updateIndividualStocksSection();
        }
    },

    /**
     * Generate a unique color for a stock
     * @param {string} symbol - Stock symbol
     * @returns {string} - Hex color code
     */
    generateStockColor(symbol) {
        // Reason: Use a predefined color palette for individual stocks
        const colors = [
            '#1d9bf0', // Blue
            '#00ba7c', // Green
            '#f91880', // Pink
            '#ff9500', // Orange
            '#bf5af2', // Purple
            '#00d4ff', // Cyan
            '#ffd60a', // Yellow
            '#ff453a', // Red
            '#32d74b', // Light Green
            '#64d2ff', // Light Blue
        ];

        // Reason: Use symbol hash to pick consistent color
        let hash = 0;
        for (let i = 0; i < symbol.length; i++) {
            hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    },

    /**
     * Update the Individual Stocks section in the UI
     */
    updateIndividualStocksSection() {
        const section = document.getElementById('individualStocksSection');
        const container = document.getElementById('individualStocksContainer');

        if (!section || !container) return;

        // Reason: Get list of visible individual stocks
        const visibleStocks = [];
        this.activeIndividualStocks.forEach((stock, symbol) => {
            if (stock.visible) {
                visibleStocks.push({ symbol, color: stock.color });
            }
        });

        if (visibleStocks.length === 0) {
            section.style.display = 'none';
            return;
        }

        // Reason: Show section and render stock cards
        section.style.display = 'block';

        const html = visibleStocks.map(stock => `
            <div class="individual-stock-card" data-symbol="${stock.symbol}" style="border-left-color: ${stock.color}">
                <div class="stock-card-header">
                    <div class="stock-card-symbol">${stock.symbol}</div>
                    <button class="stock-card-remove-btn" data-symbol="${stock.symbol}" title="Remove from chart">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;

        // Reason: Add click handlers to remove buttons
        container.querySelectorAll('.stock-card-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const symbol = btn.dataset.symbol;
                this.hideIndividualStock(symbol);

                // Reason: Also update the toggle button in hedge funds panel
                const toggleBtn = document.querySelector(`.holding-toggle-btn[data-symbol="${symbol}"]`);
                if (toggleBtn) {
                    toggleBtn.dataset.active = 'false';
                    toggleBtn.querySelector('i').className = 'fas fa-eye-slash';
                    toggleBtn.title = 'Show on chart';
                }
            });
        });
    }
};

// Clock widget with adjustable precision
const Clock = {
    precision: 0, // 0: HH, 1: HH:MM, 2: HH:MM:SS, 3: HH:MM:SS.FFF
    intervalId: null,

    /**
     * Initialize the clock
     */
    init() {
        this.setupEventListeners();
        this.startClock();
    },

    /**
     * Setup event listeners for precision controls
     */
    setupEventListeners() {
        const upButton = document.getElementById('clockPrecisionUp');
        const downButton = document.getElementById('clockPrecisionDown');

        upButton.addEventListener('click', () => {
            if (this.precision < 3) {
                this.precision++;
                this.updateButtonStates();
                this.updateClock();
            }
        });

        downButton.addEventListener('click', () => {
            if (this.precision > 0) {
                this.precision--;
                this.updateButtonStates();
                this.updateClock();
            }
        });

        this.updateButtonStates();
    },

    /**
     * Update button disabled states
     */
    updateButtonStates() {
        const upButton = document.getElementById('clockPrecisionUp');
        const downButton = document.getElementById('clockPrecisionDown');

        upButton.disabled = this.precision >= 3;
        downButton.disabled = this.precision <= 0;
    },

    /**
     * Start the clock interval
     */
    startClock() {
        // Update immediately
        this.updateClock();

        // Reason: Clear existing interval if any
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        // Update based on precision
        const interval = this.precision === 3 ? 10 : 1000; // 10ms for milliseconds, 1s otherwise
        this.intervalId = setInterval(() => this.updateClock(), interval);
    },

    /**
     * Update the clock display
     */
    updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

        let timeString = '';

        switch (this.precision) {
            case 0: // HH
                timeString = hours;
                break;
            case 1: // HH:MM
                timeString = `${hours}:${minutes}`;
                break;
            case 2: // HH:MM:SS
                timeString = `${hours}:${minutes}:${seconds}`;
                break;
            case 3: // HH:MM:SS.FFF
                timeString = `${hours}:${minutes}:${seconds}.${milliseconds}`;
                break;
        }

        const display = document.getElementById('clockDisplay');
        display.textContent = timeString;

        // Reason: Update interval if precision changed to/from milliseconds
        const currentInterval = this.precision === 3 ? 10 : 1000;
        if (this.intervalId && currentInterval !== this.getCurrentInterval()) {
            this.startClock();
        }
    },

    /**
     * Get the current interval duration
     */
    getCurrentInterval() {
        return this.precision === 3 ? 10 : 1000;
    }
};

// Initialize clock when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Clock.init());
} else {
    Clock.init();
}

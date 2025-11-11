/**
 * Cards Sections module - manages collapse/expand for card sections
 */
const CardsSections = {
    /**
     * Initialize card sections collapse/expand functionality
     */
    init() {
        this.setupEventListeners();

        console.log('Cards Sections module initialized');
    },

    /**
     * Setup event listeners for all card section headers
     */
    setupEventListeners() {
        // Sector cards header
        const sectorHeader = document.getElementById('sectorCardsHeader');
        if (sectorHeader) {
            sectorHeader.addEventListener('click', () => {
                this.toggleSection('sectorCardsContainer', sectorHeader);
            });
        }

        // Subsector cards header
        const subsectorHeader = document.getElementById('subsectorCardsHeader');
        if (subsectorHeader) {
            subsectorHeader.addEventListener('click', () => {
                this.toggleSection('subsectorCardsContainer', subsectorHeader);
            });
        }

        // Individual stocks header
        const individualStocksHeader = document.getElementById('individualStocksHeader');
        if (individualStocksHeader) {
            individualStocksHeader.addEventListener('click', () => {
                this.toggleSection('individualStocksContainer', individualStocksHeader);
            });
        }
    },

    /**
     * Toggle section collapsed/expanded
     */
    toggleSection(containerId, headerElement) {
        const container = document.getElementById(containerId);
        const icon = headerElement.querySelector('.collapse-icon');

        if (!container || !icon) return;

        // Reason: Determine the correct display value based on container type
        const displayValue = this.getDisplayValue(containerId);

        // Toggle display
        if (container.style.display === 'none' || !container.style.display) {
            container.style.display = displayValue;
            icon.classList.remove('fa-chevron-down', 'fa-chevron-right');
            icon.classList.add('fa-chevron-down');
            headerElement.classList.add('expanded');
            headerElement.parentElement.classList.remove('collapsed');
        } else {
            container.style.display = 'none';
            icon.classList.remove('fa-chevron-down', 'fa-chevron-up');
            icon.classList.add('fa-chevron-right');
            headerElement.classList.remove('expanded');
            headerElement.parentElement.classList.add('collapsed');
        }
    },

    /**
     * Get the correct display value for a container
     * Reason: Sector, subsector, and individual stocks use flex
     */
    getDisplayValue(containerId) {
        if (containerId === 'sectorCardsContainer' ||
            containerId === 'subsectorCardsContainer' ||
            containerId === 'individualStocksContainer') {
            return 'flex';
        }
        return 'block';
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CardsSections.init());
} else {
    CardsSections.init();
}

/**
 * View Switcher - Handles switching between different app views
 */

class ViewSwitcher {
    constructor() {
        this.currentView = 'earnings';
        this.views = {
            'chart': document.getElementById('chartView'),
            'earnings': document.getElementById('earningsView')
        };

        this.init();
    }

    init() {
        const viewSelectorButton = document.getElementById('viewSelectorButton');
        const viewSelectorDropdown = document.getElementById('viewSelectorDropdown');

        // Toggle dropdown
        viewSelectorButton.addEventListener('click', (e) => {
            e.stopPropagation();
            viewSelectorButton.classList.toggle('active');
            viewSelectorDropdown.classList.toggle('visible');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!viewSelectorButton.contains(e.target) && !viewSelectorDropdown.contains(e.target)) {
                viewSelectorButton.classList.remove('active');
                viewSelectorDropdown.classList.remove('visible');
            }
        });

        // Handle view selection
        const viewOptions = document.querySelectorAll('.view-option');
        viewOptions.forEach(option => {
            option.addEventListener('click', () => {
                const viewName = option.dataset.view;
                this.switchView(viewName);

                // Update active state
                viewOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');

                // Close dropdown
                viewSelectorButton.classList.remove('active');
                viewSelectorDropdown.classList.remove('visible');
            });
        });
    }

    switchView(viewName) {
        if (!this.views[viewName]) {
            console.error(`View "${viewName}" not found`);
            return;
        }

        // Hide all views
        Object.values(this.views).forEach(view => {
            if (view) view.style.display = 'none';
        });

        // Show selected view
        this.views[viewName].style.display = 'block';
        this.currentView = viewName;

        // Trigger view-specific initialization
        this.onViewChange(viewName);
    }

    onViewChange(viewName) {
        // Dispatch custom event for view change
        const event = new CustomEvent('viewChanged', {
            detail: { view: viewName }
        });
        document.dispatchEvent(event);

        // Hide/show sections based on view
        const sectorCardsSection = document.getElementById('sectorCardsSection');
        const subsectorCardsSection = document.getElementById('subsectorCardsSection');
        const fibonacciPanel = document.getElementById('fibonacciPanel');

        if (viewName === 'earnings') {
            // Hide these sections in earnings view
            if (sectorCardsSection) sectorCardsSection.style.display = 'none';
            if (subsectorCardsSection) subsectorCardsSection.style.display = 'none';
            if (fibonacciPanel) fibonacciPanel.style.display = 'none';

            // Load earnings data
            if (window.earningsManager) {
                window.earningsManager.loadEarningsData();
            }
        } else if (viewName === 'chart') {
            // Restore visibility for chart view (will be controlled by existing logic)
            // The sections visibility is controlled by chart.js and other modules
        }
    }

    getCurrentView() {
        return this.currentView;
    }
}

// Initialize view switcher when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.viewSwitcher = new ViewSwitcher();
        // Initialize earnings view on load
        if (window.viewSwitcher.getCurrentView() === 'earnings') {
            window.viewSwitcher.onViewChange('earnings');
        }
    });
} else {
    window.viewSwitcher = new ViewSwitcher();
    // Initialize earnings view on load
    if (window.viewSwitcher.getCurrentView() === 'earnings') {
        window.viewSwitcher.onViewChange('earnings');
    }
}

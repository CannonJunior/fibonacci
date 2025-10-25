/**
 * Simple toast notification system
 * Displays non-blocking notifications in the bottom-right corner
 */
const Toast = {
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (default: 3000)
     */
    show(message, type = 'info', duration = 3000) {
        // Reason: Create toast container if it doesn't exist
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Reason: Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Reason: Add icon based on type
        const icon = this.getIcon(type);

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        // Reason: Add to container
        container.appendChild(toast);

        // Reason: Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Reason: Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
    },

    /**
     * Get icon for toast type
     */
    getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    },

    /**
     * Shorthand methods
     */
    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    },

    error(message, duration = 4000) {
        this.show(message, 'error', duration);
    },

    warning(message, duration = 3500) {
        this.show(message, 'warning', duration);
    },

    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }
};

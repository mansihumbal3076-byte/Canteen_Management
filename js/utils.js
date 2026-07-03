// ============================================
// Shared Utility Functions
// ============================================

// --- Toast Notifications ---
function showToast(message, type = 'info') {
    // type: 'success', 'error', 'warning', 'info'
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// --- Loading Spinner ---
function showLoader() {
    let loader = document.getElementById('global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.innerHTML = `
            <div class="loader-overlay">
                <div class="loader-spinner">
                    <div class="spinner-ring"></div>
                    <p class="loader-text">Loading...</p>
                </div>
            </div>
        `;
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.display = 'none';
    }
}

// --- Currency Formatter ---
function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// --- Date/Time Formatter ---
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatTime(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';
    return `${formatDate(timestamp)}, ${formatTime(timestamp)}`;
}

// --- Time Ago (relative) ---
function timeAgo(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// --- Table Number ---
function getTableNumber() {
    return sessionStorage.getItem('tableNumber') || 'Unknown';
}

function setTableNumber(table) {
    if (table) {
        sessionStorage.setItem('tableNumber', table);
    }
}

function extractTableFromURL() {
    const params = new URLSearchParams(window.location.search);
    const table = params.get('Table');
    if (table) {
        setTableNumber(table);
    }
    return getTableNumber();
}

// --- Debounce ---
function debounce(func, delay = 300) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// --- Generate Order Number ---
function generateOrderNumber() {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
    const timePart = now.getTime().toString().slice(-4);
    return `ORD-${datePart}-${timePart}`;
}

// --- Status Badge HTML ---
function getStatusBadge(status) {
    const statusClasses = {
        pending: 'badge-warning',
        preparing: 'badge-info',
        completed: 'badge-success',
        paid: 'badge-success',
        unpaid: 'badge-danger'
    };
    const cls = statusClasses[status] || 'badge-default';
    return `<span class="badge ${cls}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

// --- Theme Toggle ---
function initThemeToggle() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
        btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
}

// --- Confirmation Modal ---
function showConfirmModal(title, message, onConfirm) {
    const existing = document.getElementById('confirm-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3 class="modal-title">${title}</h3>
            <p class="modal-message">${message}</p>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="document.getElementById('confirm-modal').remove()">Cancel</button>
                <button class="btn btn-primary" id="confirm-action-btn">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('confirm-action-btn').addEventListener('click', () => {
        modal.remove();
        onConfirm();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// --- Empty State ---
function showEmptyState(container, icon, title, message) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <h3 class="empty-state-title">${title}</h3>
            <p class="empty-state-message">${message}</p>
        </div>
    `;
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
});

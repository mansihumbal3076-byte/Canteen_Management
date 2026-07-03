// ============================================
// Customer Orders Module
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth('index.html');
    if (!user) return;

    // Show user info
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('nav-avatar').src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'U') + '&background=ff6b35&color=fff';
    document.getElementById('nav-name').textContent = user.displayName || 'Customer';
    document.getElementById('logout-btn').style.display = 'block';

    // Load orders (real-time)
    loadOrders(user.uid);
});

function loadOrders(userId) {
    const container = document.getElementById('orders-container');

    // Show loading skeleton
    container.innerHTML = Array(3).fill('').map(() => `
        <div class="order-card">
            <div class="skeleton" style="height: 20px; width: 40%; margin-bottom: 16px; border-radius: 4px;"></div>
            <div class="skeleton" style="height: 16px; width: 80%; margin-bottom: 10px; border-radius: 4px;"></div>
            <div class="skeleton" style="height: 16px; width: 60%; margin-bottom: 10px; border-radius: 4px;"></div>
            <div class="skeleton" style="height: 40px; width: 100%; border-radius: 8px;"></div>
        </div>
    `).join('');

    db.collection('orders')
        .where('userId', '==', userId)
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                showEmptyState(container, '📋', 'No orders yet', 'Your orders will appear here after you place them.');
                return;
            }

            const orders = [];
            snapshot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() });
            });

            // Sort locally to prevent index errors
            orders.sort((a, b) => {
                const timeA = a.orderTime?.toMillis ? a.orderTime.toMillis() : 0;
                const timeB = b.orderTime?.toMillis ? b.orderTime.toMillis() : 0;
                return timeB - timeA;
            });

            renderOrders(orders);
        }, (error) => {
            console.error('Error loading orders:', error);
            showToast('Failed to load orders', 'error');
        });
}

function renderOrders(orders) {
    const container = document.getElementById('orders-container');

    container.innerHTML = orders.map(order => {
        const statusSteps = getStatusSteps(order.status);

        return `
            <div class="order-card">
                <div class="order-card-header">
                    <div>
                        <span class="order-id">#${order.orderNumber || order.id.slice(0, 8)}</span>
                        <span class="order-time">${formatDateTime(order.orderTime)}</span>
                    </div>
                    ${getStatusBadge(order.status)}
                </div>

                <!-- Status Tracker -->
                <div class="status-tracker">
                    <div class="status-step ${statusSteps.pending}">
                        <div class="status-step-line"></div>
                        <div class="status-step-dot">📝</div>
                        <span class="status-step-label">Pending</span>
                    </div>
                    <div class="status-step ${statusSteps.preparing}">
                        <div class="status-step-line"></div>
                        <div class="status-step-dot">👨‍🍳</div>
                        <span class="status-step-label">Preparing</span>
                    </div>
                    <div class="status-step ${statusSteps.completed}">
                        <div class="status-step-dot">✅</div>
                        <span class="status-step-label">Completed</span>
                    </div>
                </div>

                <!-- Order Items -->
                <div class="order-items-list">
                    ${order.items.map(item => `
                        <div class="order-item-row">
                            <div class="order-item-name">
                                <span>${item.name}</span>
                                <span class="order-item-qty">×${item.quantity}</span>
                            </div>
                            <span>${formatCurrency(item.subtotal)}</span>
                        </div>
                    `).join('')}
                </div>

                <!-- Footer -->
                <div class="order-card-footer">
                    <span class="text-secondary">Table ${order.tableNumber}</span>
                    <span class="order-total">${formatCurrency(order.totalAmount)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getStatusSteps(status) {
    if (status === 'pending') {
        return { pending: 'active', preparing: '', completed: '' };
    } else if (status === 'preparing') {
        return { pending: 'completed', preparing: 'active', completed: '' };
    } else if (status === 'completed') {
        return { pending: 'completed', preparing: 'completed', completed: 'completed' };
    }
    return { pending: '', preparing: '', completed: '' };
}

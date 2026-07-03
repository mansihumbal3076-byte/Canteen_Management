// ============================================
// Admin Orders Management Module
// ============================================

let allOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAdmin();
    if (!user) return;

    // Set admin info
    const adminDoc = await db.collection('admins').doc(user.uid).get();
    if (adminDoc.exists) {
        const data = adminDoc.data();
        document.getElementById('admin-name').textContent = data.name || 'Admin';
        document.getElementById('admin-avatar').textContent = (data.name || 'A').charAt(0).toUpperCase();
    }

    loadAllOrders();
    loadPendingBadge();
});

// --- Load All Orders (Real-time) ---
function loadAllOrders() {
    db.collection('orders')
        .orderBy('orderTime', 'desc')
        .onSnapshot((snapshot) => {
            allOrders = [];
            snapshot.forEach(doc => {
                allOrders.push({ id: doc.id, ...doc.data() });
            });
            filterOrders();
        }, (error) => {
            console.error('Error loading orders:', error);
            showToast('Failed to load orders', 'error');
        });
}

// --- Filter & Search ---
function filterOrders() {
    const searchTerm = document.getElementById('order-search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;

    let filtered = [...allOrders];

    // Status filter
    if (statusFilter === 'active') {
        filtered = filtered.filter(o => o.status !== 'completed');
    } else if (statusFilter !== 'all') {
        filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(o =>
            (o.userName || '').toLowerCase().includes(searchTerm) ||
            (o.tableNumber || '').toLowerCase().includes(searchTerm) ||
            (o.orderNumber || '').toLowerCase().includes(searchTerm)
        );
    }

    renderOrders(filtered);
}

// --- Render Orders ---
function renderOrders(orders) {
    const container = document.getElementById('orders-container');

    if (orders.length === 0) {
        showEmptyState(container, '📋', 'No orders found', 'Try adjusting your filters.');
        return;
    }

    container.innerHTML = orders.map(order => {
        const initial = (order.userName || 'C').charAt(0).toUpperCase();

        return `
            <div class="admin-order-card">
                <div class="admin-order-header">
                    <div class="admin-order-customer">
                        <div class="admin-order-avatar">${initial}</div>
                        <div class="admin-order-info">
                            <h4>${order.userName || 'Customer'}</h4>
                            <div class="admin-order-meta">
                                <span>📍 Table ${order.tableNumber}</span>
                                <span>•</span>
                                <span>#${order.orderNumber || order.id.slice(0, 8)}</span>
                                <span>•</span>
                                <span>🕐 ${formatDateTime(order.orderTime)}</span>
                            </div>
                        </div>
                    </div>
                    ${getStatusBadge(order.status)}
                </div>

                <div class="admin-order-items">
                    ${order.items.map(item => `
                        <div class="admin-order-item">
                            <span>${item.name} <span class="text-muted">×${item.quantity}</span></span>
                            <span>${formatCurrency(item.subtotal)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="admin-order-footer">
                    <span class="admin-order-total">Total: ${formatCurrency(order.totalAmount)}</span>
                    <div class="admin-order-actions">
                        ${order.status === 'pending' ? `
                            <button class="btn btn-sm btn-primary" onclick="updateOrderStatus('${order.id}', 'preparing')">
                                👨‍🍳 Accept & Prepare
                            </button>
                        ` : ''}
                        ${order.status === 'preparing' ? `
                            <button class="btn btn-sm btn-success" onclick="completeAndBill('${order.id}')">
                                ✅ Mark Complete
                            </button>
                        ` : ''}
                        ${order.status === 'completed' ? `
                            <span class="text-muted" style="font-size: 0.85rem;">
                                Completed ${timeAgo(order.completedAt)}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- Update Status ---
async function updateOrderStatus(orderId, newStatus) {
    try {
        await db.collection('orders').doc(orderId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast(`Order status: ${newStatus}`, 'success');
    } catch (error) {
        console.error('Error updating order:', error);
        showToast('Failed to update order', 'error');
    }
}

// --- Complete Order & Generate Bill ---
async function completeAndBill(orderId) {
    showConfirmModal('Complete Order', 'Mark this order as completed? A bill will be generated.', async () => {
        try {
            showLoader();

            const orderDoc = await db.collection('orders').doc(orderId).get();
            if (!orderDoc.exists) {
                showToast('Order not found', 'error');
                return;
            }

            const order = orderDoc.data();

            // Update order
            await db.collection('orders').doc(orderId).update({
                status: 'completed',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                completedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Create bill
            await db.collection('bills').add({
                orderId: orderId,
                userId: order.userId,
                userName: order.userName,
                userEmail: order.userEmail || '',
                tableNumber: order.tableNumber,
                items: order.items,
                totalAmount: order.totalAmount,
                paymentStatus: 'unpaid',
                paymentMethod: null,
                paymentTime: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast('Order completed & bill generated! 🎉', 'success');
        } catch (error) {
            console.error('Error:', error);
            showToast('Failed to complete order', 'error');
        } finally {
            hideLoader();
        }
    });
}

// --- Pending Badge ---
function loadPendingBadge() {
    db.collection('orders')
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            const badge = document.getElementById('pending-badge');
            if (snapshot.size > 0) {
                badge.style.display = 'inline';
                badge.textContent = snapshot.size;
            } else {
                badge.style.display = 'none';
            }
        });
}

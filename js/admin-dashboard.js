// ============================================
// Admin Dashboard Module
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAdmin();
    if (!user) return;

    // Set admin info in sidebar
    const adminDoc = await db.collection('admins').doc(user.uid).get();
    if (adminDoc.exists) {
        const adminData = adminDoc.data();
        document.getElementById('admin-name').textContent = adminData.name || 'Admin';
        document.getElementById('admin-avatar').textContent = (adminData.name || 'A').charAt(0).toUpperCase();
    }

    // Load dashboard data
    loadDashboardStats();
    loadRecentOrders();
    loadPendingBadge();
});

// --- Dashboard Stats (Real-time) ---
function loadDashboardStats() {
    // Total orders
    db.collection('orders').onSnapshot((snapshot) => {
        document.getElementById('stat-total-orders').textContent = snapshot.size;
    });

    // Pending orders
    db.collection('orders')
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            document.getElementById('stat-pending-orders').textContent = snapshot.size;
        });

    // Completed orders
    db.collection('orders')
        .where('status', '==', 'completed')
        .onSnapshot((snapshot) => {
            document.getElementById('stat-completed-orders').textContent = snapshot.size;
        });

    // Revenue (paid bills)
    db.collection('bills')
        .where('paymentStatus', '==', 'paid')
        .onSnapshot((snapshot) => {
            let total = 0;
            snapshot.forEach(doc => {
                total += doc.data().totalAmount || 0;
            });
            document.getElementById('stat-revenue').textContent = formatCurrency(total);
        });

    // Unpaid bills
    db.collection('bills')
        .where('paymentStatus', '==', 'unpaid')
        .onSnapshot((snapshot) => {
            document.getElementById('stat-unpaid').textContent = snapshot.size;
        });
}

// --- Recent Orders (last 5) ---
function loadRecentOrders() {
    const container = document.getElementById('recent-orders');

    db.collection('orders')
        .orderBy('orderTime', 'desc')
        .limit(5)
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                showEmptyState(container, '📋', 'No orders yet', 'Orders will appear here when customers place them.');
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const order = { id: doc.id, ...doc.data() };
                html += renderAdminOrderCard(order);
            });
            container.innerHTML = html;
        });
}

// --- Render Admin Order Card ---
function renderAdminOrderCard(order) {
    const initial = (order.userName || 'C').charAt(0).toUpperCase();

    return `
        <div class="admin-order-card">
            <div class="admin-order-header">
                <div class="admin-order-customer">
                    <div class="admin-order-avatar">${initial}</div>
                    <div class="admin-order-info">
                        <h4>${order.userName || 'Customer'}</h4>
                        <div class="admin-order-meta">
                            <span>Table ${order.tableNumber}</span>
                            <span>•</span>
                            <span>${order.orderNumber || order.id.slice(0, 8)}</span>
                            <span>•</span>
                            <span>${timeAgo(order.orderTime)}</span>
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
                <span class="admin-order-total">${formatCurrency(order.totalAmount)}</span>
                <div class="admin-order-actions">
                    ${order.status === 'pending' ? `
                        <button class="btn btn-sm btn-primary" onclick="updateStatus('${order.id}', 'preparing')">
                            👨‍🍳 Accept
                        </button>
                    ` : ''}
                    ${order.status === 'preparing' ? `
                        <button class="btn btn-sm btn-success" onclick="completeOrder('${order.id}')">
                            ✅ Complete
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// --- Update Order Status ---
async function updateStatus(orderId, newStatus) {
    try {
        await db.collection('orders').doc(orderId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast(`Order updated to ${newStatus}`, 'success');
    } catch (error) {
        console.error('Error updating order:', error);
        showToast('Failed to update order', 'error');
    }
}

// --- Complete Order & Generate Bill ---
async function completeOrder(orderId) {
    try {
        showLoader();

        // Get order data
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            showToast('Order not found', 'error');
            return;
        }

        const order = orderDoc.data();

        // Update order status
        await db.collection('orders').doc(orderId).update({
            status: 'completed',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Generate bill
        await db.collection('bills').add({
            orderId: orderId,
            userId: order.userId,
            userName: order.userName,
            userEmail: order.userEmail,
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
        console.error('Error completing order:', error);
        showToast('Failed to complete order', 'error');
    } finally {
        hideLoader();
    }
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

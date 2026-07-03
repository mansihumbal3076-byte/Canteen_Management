// ============================================
// Admin Billing Management Module
// ============================================

let allBills = [];

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

    loadAllBills();
    loadPendingBadge();
});

// --- Load All Bills (Real-time) ---
function loadAllBills() {-
    db.collection('bills')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            allBills = [];
            snapshot.forEach(doc => {
                allBills.push({ id: doc.id, ...doc.data() });
            });
            filterBills();
        }, (error) => {
            console.error('Error loading bills:', error);
            showToast('Failed to load bills', 'error');
        });
}

// --- Filter & Search ---
function filterBills() {
    const searchTerm = document.getElementById('bill-search').value.toLowerCase();
    const statusFilter = document.getElementById('bill-status-filter').value;

    let filtered = [...allBills];

    // Status filter
    if (statusFilter !== 'all') {
        filtered = filtered.filter(b => b.paymentStatus === statusFilter);
    }

    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(b =>
            (b.userName || '').toLowerCase().includes(searchTerm) ||
            (b.tableNumber || '').toLowerCase().includes(searchTerm) ||
            (b.id || '').toLowerCase().includes(searchTerm)
        );
    }

    renderBillsTable(filtered);
}

// --- Render Bills Table ---
function renderBillsTable(bills) {
    const tbody = document.getElementById('bills-tbody');

    if (bills.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="padding: var(--space-xl);">
                    <div class="empty-state-icon" style="font-size: 2rem;">💳</div>
                    <p class="text-muted mt-2">No bills found.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = bills.map(bill => `
        <tr>
            <td>
                <div style="font-family: monospace; font-weight: 600; color: var(--accent-primary);">#${bill.id.slice(0, 8)}</div>
                <div class="text-secondary" style="font-size: 0.8rem;">${formatDateTime(bill.createdAt)}</div>
            </td>
            <td>
                <div style="font-weight: 600;">${bill.userName || 'Customer'}</div>
                <div class="text-secondary" style="font-size: 0.8rem;">Table ${bill.tableNumber}</div>
            </td>
            <td>
                <div style="font-weight: 700;">${formatCurrency(bill.totalAmount)}</div>
            </td>
            <td>
                ${getStatusBadge(bill.paymentStatus)}
            </td>
            <td>
                ${bill.paymentStatus === 'paid' ? `
                    <div style="font-size: 0.85rem;">
                        <div style="font-weight: 600;">Via ${bill.paymentMethod ? bill.paymentMethod.toUpperCase() : 'N/A'}</div>
                        <div class="text-secondary">${formatDate(bill.paymentTime)}</div>
                    </div>
                ` : `
                    <span class="text-muted" style="font-size: 0.85rem;">Pending Payment</span>
                `}
            </td>
            <td>
                ${bill.paymentStatus === 'unpaid' ? `
                    <select class="form-select" style="padding: 6px 24px 6px 10px; font-size: 0.8rem; width: auto;"
                            onchange="markAsPaid('${bill.id}', this.value)"
                            title="Mark as Paid">
                        <option value="" disabled selected>Mark Paid...</option>
                        <option value="upi">Paid via UPI / GPay</option>
                        <option value="cash">Paid via Cash</option>
                        <option value="card">Paid via Card</option>
                    </select>
                ` : `
                    <!-- Optionally allow revert or print bill -->
                    <button class="btn btn-sm btn-secondary" onclick="showToast('Print feature coming soon', 'info')">🖨️ Print</button>
                `}
            </td>
        </tr>
    `).join('');
}

// --- Mark Bill As Paid ---
async function markAsPaid(billId, paymentMethod) {
    if (!paymentMethod) return;

    showConfirmModal(
        'Confirm Payment',
        `Has the customer paid via ${paymentMethod.toUpperCase()}?`,
        async () => {
            try {
                showLoader();
                await db.collection('bills').doc(billId).update({
                    paymentStatus: 'paid',
                    paymentMethod: paymentMethod,
                    paymentTime: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                showToast(`Bill marked as paid via ${paymentMethod.toUpperCase()}`, 'success');
            } catch (error) {
                console.error('Error updating bill:', error);
                showToast('Failed to update bill', 'error');
            } finally {
                hideLoader();
                // Reset select dropdown (it will be replaced on re-render anyway)
            }
        }
    );
}

// --- Pending Orders Badge (For Sidebar) ---
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

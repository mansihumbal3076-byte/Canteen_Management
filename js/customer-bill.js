// ============================================
// Customer Bill Module
// ============================================

const UPI_ID = 'canteen@upi'; // Replace with your restaurant's UPI ID

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth('index.html');
    if (!user) return;

    // Show user info
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('nav-avatar').src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'U') + '&background=ff6b35&color=fff';
    document.getElementById('nav-name').textContent = user.displayName || 'Customer';
    document.getElementById('logout-btn').style.display = 'block';

    // Load bills (real-time)
    loadBills(user.uid);
});

function loadBills(userId) {
    const container = document.getElementById('bills-container');

    db.collection('bills')
        .where('userId', '==', userId)
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                showEmptyState(container, '💳', 'No bills yet', 'Bills will be generated when your orders are completed.');
                return;
            }

            const bills = [];
            snapshot.forEach(doc => {
                bills.push({ id: doc.id, ...doc.data() });
            });

            // Sort locally to prevent index errors
            bills.sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            });

            renderBills(bills);
        }, (error) => {
            console.error('Error loading bills:', error);
            showToast('Failed to load bills', 'error');
        });
}

function renderBills(bills) {
    const container = document.getElementById('bills-container');

    container.innerHTML = bills.map(bill => `
        <div class="bill-card">
            <div class="bill-header">
                <div class="flex-between" style="flex-wrap: wrap; gap: 8px;">
                    <div>
                        <h3>Bill #${bill.id.slice(0, 8)}</h3>
                        <p class="text-secondary" style="font-size: 0.85rem; margin-top: 4px;">
                            ${formatDateTime(bill.createdAt)} • Table ${bill.tableNumber}
                        </p>
                    </div>
                    ${getStatusBadge(bill.paymentStatus)}
                </div>
            </div>
            <div class="bill-body">
                ${bill.items.map(item => `
                    <div class="bill-row">
                        <span>${item.name} <span class="text-muted">×${item.quantity}</span></span>
                        <span>${formatCurrency(item.subtotal)}</span>
                    </div>
                `).join('')}
                <div class="bill-row total">
                    <span>Total Amount</span>
                    <span class="bill-amount">${formatCurrency(bill.totalAmount)}</span>
                </div>
            </div>
            ${bill.paymentStatus === 'unpaid' ? `
                <div class="bill-footer">
                    <div class="payment-section">
                        <h4 class="mb-2">Pay Now</h4>
                        <p class="text-secondary mb-2" style="font-size: 0.85rem;">Scan the QR code below or use the GPay button</p>
                        
                        <div class="payment-qr" id="qr-${bill.id}"></div>
                        
                        <button class="gpay-btn" onclick="handleGPay('${bill.id}', ${bill.totalAmount})">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white" opacity="0.2"/>
                                <text x="5" y="16" font-size="12" fill="white" font-weight="bold">G</text>
                            </svg>
                            Pay with GPay — ${formatCurrency(bill.totalAmount)}
                        </button>

                        <p class="text-muted mt-2" style="font-size: 0.75rem;">
                            After payment, the admin will verify and update your bill status.
                        </p>
                    </div>
                </div>
            ` : `
                <div class="bill-footer" style="text-align: center;">
                    <div style="color: var(--status-success); font-size: 1.5rem; margin-bottom: 8px;">✅</div>
                    <h4 style="color: var(--status-success);">Payment Confirmed</h4>
                    <p class="text-muted" style="font-size: 0.85rem; margin-top: 4px;">
                        ${bill.paymentMethod ? 'Paid via ' + bill.paymentMethod.toUpperCase() : ''} 
                        ${bill.paymentTime ? '• ' + formatDateTime(bill.paymentTime) : ''}
                    </p>
                </div>
            `}
        </div>
    `).join('');

    // Generate QR codes for unpaid bills
    setTimeout(() => {
        bills.filter(b => b.paymentStatus === 'unpaid').forEach(bill => {
            generatePaymentQR(bill);
        });
    }, 100);
}

function generatePaymentQR(bill) {
    const container = document.getElementById(`qr-${bill.id}`);
    if (!container || container.children.length > 0) return;

    const upiLink = `upi://pay?pa=${UPI_ID}&pn=CanteenHub&am=${bill.totalAmount}&cu=INR&tn=Bill-${bill.id.slice(0, 8)}`;

    try {
        new QRCode(container, {
            text: upiLink,
            width: 180,
            height: 180,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    } catch (e) {
        container.innerHTML = '<p class="text-muted" style="font-size: 0.8rem; padding: 20px;">QR Code generation failed.<br>Use GPay button instead.</p>';
    }
}

function handleGPay(billId, amount) {
    // UPI deep link for mobile
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=CanteenHub&am=${amount}&cu=INR&tn=Bill-${billId.slice(0, 8)}`;

    // Try to open UPI app on mobile
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isMobile) {
        window.location.href = upiLink;
    } else {
        showToast('Please scan the QR code with your phone to pay via GPay/UPI', 'info');
    }
}

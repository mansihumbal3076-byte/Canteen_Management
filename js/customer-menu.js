// ============================================
// Customer Menu & Cart Module
// ============================================

// State
let menuItems = [];
let cart = [];
let currentCategory = 'all';
let searchQuery = '';

// --- Initialize ---
document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth('index.html');
    if (!user) return;

    // Show user info in navbar
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('nav-avatar').src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'U') + '&background=ff6b35&color=fff';
    document.getElementById('nav-name').textContent = user.displayName || 'Customer';
    document.getElementById('logout-btn').style.display = 'block';

    // Show table number
    const table = extractTableFromURL();
    document.getElementById('display-table').textContent = table !== 'Unknown' ? table : '—';

    // Load cart from localStorage
    loadCartFromStorage();

    // Load menu (real-time)
    loadMenu();

    // Show skeleton loading
    showMenuSkeleton();
});

// --- Load Menu (Real-time) ---
function loadMenu() {
    db.collection('menu')
        .where('isAvailable', '==', true)
        .onSnapshot((snapshot) => {
            menuItems = [];
            snapshot.forEach((doc) => {
                menuItems.push({ id: doc.id, ...doc.data() });
            });

            // Sort by category then name
            menuItems.sort((a, b) => {
                if (a.category === b.category) return a.name.localeCompare(b.name);
                return a.category.localeCompare(b.category);
            });

            renderMenu();
        }, (error) => {
            console.error('Error loading menu:', error);
            showToast('Failed to load menu', 'error');
        });
}

// --- Render Menu ---
function renderMenu() {
    const grid = document.getElementById('menu-grid');
    let filtered = [...menuItems];

    // Apply category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(item => item.category === currentCategory);
    }

    // Apply search filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query)
        );
    }

    if (filtered.length === 0) {
        showEmptyState(grid, '🍽️', 'No dishes found', 'Try a different category or search term.');
        return;
    }

    grid.innerHTML = filtered.map((item, index) => {
        const cartItem = cart.find(c => c.id === item.id);
        const quantity = cartItem ? cartItem.quantity : 0;

        return `
            <div class="food-card ${!item.isAvailable ? 'out-of-stock' : ''}" style="animation-delay: ${index * 0.05}s">
                <div class="food-card-image-wrapper">
                    <img class="food-card-image" src="${item.imageURL || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}" alt="${item.name}" 
                         onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'">
                    <span class="food-card-badge">${item.category}</span>
                </div>
                <div class="food-card-body">
                    <h3 class="food-card-name">${item.name}</h3>
                    <p class="food-card-desc">${item.description || 'Delicious dish prepared fresh for you'}</p>
                    <div class="food-card-footer">
                        <span class="food-card-price">${formatCurrency(item.price)}</span>
                        <div class="food-card-actions">
                            ${quantity > 0 ? `
                                <div class="quantity-control">
                                    <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', ${quantity - 1})">−</button>
                                    <span class="quantity-value">${quantity}</span>
                                    <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', ${quantity + 1})">+</button>
                                </div>
                            ` : `
                                <button class="add-to-cart-btn" onclick="addToCart('${item.id}')">
                                    + Add
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- Show Skeleton ---
function showMenuSkeleton() {
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = Array(6).fill('').map(() => `
        <div class="food-card-skeleton">
            <div class="skeleton-image skeleton"></div>
            <div class="skeleton-body">
                <div class="skeleton-line skeleton"></div>
                <div class="skeleton-line skeleton"></div>
                <div class="skeleton-line skeleton"></div>
            </div>
        </div>
    `).join('');
}

// --- Category Filter ---
function filterCategory(category, btn) {
    currentCategory = category;

    // Update active tab
    document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
    btn.classList.add('active');

    renderMenu();
}

// --- Search ---
const handleSearch = debounce((value) => {
    searchQuery = value;
    renderMenu();
}, 250);

// --- Cart Functions ---
function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    const existing = cart.find(c => c.id === itemId);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            imageURL: item.imageURL,
            quantity: 1
        });
    }

    saveCartToStorage();
    updateCartUI();
    renderMenu(); // Re-render to show quantity controls
    showToast(`${item.name} added to cart`, 'success');
}

function updateCartQuantity(itemId, newQty) {
    if (newQty <= 0) {
        cart = cart.filter(c => c.id !== itemId);
    } else {
        const item = cart.find(c => c.id === itemId);
        if (item) item.quantity = newQty;
    }

    saveCartToStorage();
    updateCartUI();
    renderMenu();
}

function removeFromCart(itemId) {
    const item = cart.find(c => c.id === itemId);
    cart = cart.filter(c => c.id !== itemId);
    saveCartToStorage();
    updateCartUI();
    renderMenu();
    if (item) showToast(`${item.name} removed`, 'info');
}

function clearCart() {
    cart = [];
    saveCartToStorage();
    updateCartUI();
    renderMenu();
    closeCart();
    showToast('Cart cleared', 'info');
}

function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function getCartItemCount() {
    return cart.reduce((count, item) => count + item.quantity, 0);
}

// --- Cart UI ---
function updateCartUI() {
    const count = getCartItemCount();
    const total = getCartTotal();
    const fab = document.getElementById('cart-fab');
    const countEl = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total');

    // Show/hide FAB
    fab.style.display = count > 0 ? 'flex' : 'none';
    countEl.textContent = count;
    totalEl.textContent = formatCurrency(total);

    // Render cart items
    renderCartItems();
}

function renderCartItems() {
    const container = document.getElementById('cart-items');

    if (cart.length === 0) {
        showEmptyState(container, '🛒', 'Cart is empty', 'Add some dishes from the menu');
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img class="cart-item-image" src="${item.imageURL || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop'}" alt="${item.name}"
                 onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop'">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatCurrency(item.price)} × ${item.quantity} = ${formatCurrency(item.price * item.quantity)}</div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', ${item.quantity - 1})">−</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})">+</button>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">🗑️ Remove</button>
            </div>
        </div>
    `).join('');
}

// --- Cart Sidebar ---
function openCart() {
    document.getElementById('cart-overlay').classList.add('active');
    document.getElementById('cart-sidebar').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderCartItems();
}

function closeCart() {
    document.getElementById('cart-overlay').classList.remove('active');
    document.getElementById('cart-sidebar').classList.remove('active');
    document.body.style.overflow = '';
}

// --- Cart Persistence ---
function saveCartToStorage() {
    localStorage.setItem('canteen_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('canteen_cart');
    if (saved) {
        try {
            cart = JSON.parse(saved);
            updateCartUI();
        } catch (e) {
            cart = [];
        }
    }
}

// --- Place Order ---
async function placeOrder() {
    if (cart.length === 0) {
        showToast('Cart is empty!', 'warning');
        return;
    }

    const user = getCurrentUser();
    if (!user) {
        showToast('Please sign in first', 'error');
        return;
    }

    const tableNumber = getTableNumber();
    if (tableNumber === 'Unknown') {
        showToast('Table number not found. Please scan QR code again.', 'warning');
        return;
    }

    showConfirmModal(
        'Confirm Order',
        `Place order for ${getCartItemCount()} items totaling ${formatCurrency(getCartTotal())}?`,
        async () => {
            try {
                showLoader();

                const orderItems = cart.map(item => ({
                    itemId: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: item.price * item.quantity
                }));

                const orderData = {
                    userId: user.uid,
                    userName: user.displayName || 'Customer',
                    userEmail: user.email,
                    tableNumber: tableNumber,
                    items: orderItems,
                    totalAmount: getCartTotal(),
                    status: 'pending',
                    orderNumber: generateOrderNumber(),
                    orderTime: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    completedAt: null
                };

                await db.collection('orders').add(orderData);

                // Clear cart
                cart = [];
                saveCartToStorage();
                updateCartUI();
                closeCart();

                showToast('Order placed successfully! 🎉', 'success');

                // Redirect to orders page
                setTimeout(() => {
                    window.location.href = 'customer-orders.html';
                }, 1500);

            } catch (error) {
                console.error('Error placing order:', error);
                showToast('Failed to place order. Please try again.', 'error');
            } finally {
                hideLoader();
            }
        }
    );
}

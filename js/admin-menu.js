// ============================================
// Admin Menu Management Module
// ============================================

let allMenuItems = [];
let currentCategory = 'all';
let searchQuery = '';

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

    loadMenu();
    loadPendingBadge();
});

// --- Load Menu (Real-time) ---
function loadMenu() {
    db.collection('menu')
        .onSnapshot((snapshot) => {
            allMenuItems = [];
            snapshot.forEach(doc => {
                allMenuItems.push({ id: doc.id, ...doc.data() });
            });
            // Sort category -> name
            allMenuItems.sort((a, b) => {
                if (a.category === b.category) return a.name.localeCompare(b.name);
                return a.category.localeCompare(b.category);
            });
            renderMenu();
        }, (error) => {
            console.error('Error loading menu:', error);
            showToast('Failed to load menu items', 'error');
        });
}

// --- Filter & Search ---
function filterCategory(category, btn) {
    currentCategory = category;
    
    // Update active tab UI
    document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
    btn.classList.add('active');
    
    renderMenu();
}

const handleSearch = debounce((value) => {
    searchQuery = value.toLowerCase();
    renderMenu();
}, 250);

// --- Render Menu Items Grid ---
function renderMenu() {
    const grid = document.getElementById('menu-grid');
    
    let filtered = [...allMenuItems];

    if (currentCategory !== 'all') {
        filtered = filtered.filter(i => i.category === currentCategory);
    }

    if (searchQuery) {
        filtered = filtered.filter(i => 
            i.name.toLowerCase().includes(searchQuery) ||
            (i.category && i.category.toLowerCase().includes(searchQuery))
        );
    }

    if (filtered.length === 0) {
        showEmptyState(grid, '🍔', 'No items found', 'Try adjusting your search or add a new item.');
        return;
    }

    grid.innerHTML = filtered.map(item => `
        <div class="menu-manage-card">
            <img class="menu-manage-image" src="${item.imageURL || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}" 
                 alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'">
            <div class="menu-manage-body">
                <div class="menu-manage-header">
                    <div>
                        <div class="menu-manage-name">${item.name}</div>
                        <div class="text-muted" style="font-size: 0.8rem; margin-top: 2px;">
                            ${item.description ? (item.description.length > 50 ? item.description.substring(0,50)+'...' : item.description) : 'No description'}
                        </div>
                    </div>
                </div>
                <div class="menu-manage-meta">
                    <span class="menu-manage-price">${formatCurrency(item.price)}</span>
                    <span class="badge ${item.isAvailable ? 'badge-success' : 'badge-danger'}">
                        ${item.isAvailable ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <span class="badge badge-default">${item.category}</span>
                </div>
                <div class="menu-manage-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editItem('${item.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-secondary" onclick="toggleAvailability('${item.id}', ${!item.isAvailable})">
                        ${item.isAvailable ? '👁️ Hide' : '👁️ Show'}
                    </button>
                    ${!item.isAvailable ? `<button class="btn btn-sm btn-outline" style="border-color: var(--status-danger); color: var(--status-danger);" onclick="deleteItem('${item.id}')">🗑️ Delete</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}


// --- Modal & Form Handling ---
function openModal(item = null) {
    const modal = document.getElementById('item-modal');
    const form = document.getElementById('item-form');
    const title = document.getElementById('modal-title');
    const btn = document.getElementById('save-btn');

    form.reset();

    if (item) {
        title.textContent = 'Edit Item';
        btn.textContent = 'Update Item';
        document.getElementById('item-id').value = item.id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-description').value = item.description || '';
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-category').value = item.category;
        document.getElementById('item-image').value = item.imageURL || '';
        document.getElementById('item-available').checked = item.isAvailable;
    } else {
        title.textContent = 'Add New Item';
        btn.textContent = 'Save Item';
        document.getElementById('item-id').value = '';
        document.getElementById('item-available').checked = true;
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('item-modal').classList.remove('active');
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const itemId = document.getElementById('item-id').value;
    const itemData = {
        name: document.getElementById('item-name').value.trim(),
        description: document.getElementById('item-description').value.trim(),
        price: parseFloat(document.getElementById('item-price').value),
        category: document.getElementById('item-category').value,
        imageURL: document.getElementById('item-image').value.trim(),
        isAvailable: document.getElementById('item-available').checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!itemData.name || !itemData.price || !itemData.category) {
        showToast('Please fill all required fields', 'warning');
        return;
    }

    try {
        showLoader();
        const btn = document.getElementById('save-btn');
        btn.disabled = true;

        if (itemId) {
            // Update
            await db.collection('menu').doc(itemId).update(itemData);
            showToast('Item updated successfully', 'success');
        } else {
            // Create
            itemData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('menu').add(itemData);
            showToast('Item added successfully', 'success');
        }

        closeModal();
    } catch (error) {
        console.error('Error saving item:', error);
        showToast('Failed to save item', 'error');
    } finally {
        hideLoader();
        document.getElementById('save-btn').disabled = false;
    }
}

// --- Quick Actions ---
function editItem(id) {
    const item = allMenuItems.find(i => i.id === id);
    if (item) openModal(item);
}

async function toggleAvailability(id, isAvailable) {
    try {
        await db.collection('menu').doc(id).update({
            isAvailable: isAvailable,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast(`Item is now ${isAvailable ? 'Available' : 'Out of Stock'}`, 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to update availability', 'error');
    }
}

function deleteItem(id) {
    showConfirmModal('Delete Item', 'Are you sure you want to delete this item? This action cannot be undone.', async () => {
        try {
            showLoader();
            await db.collection('menu').doc(id).delete();
            showToast('Item deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting:', error);
            showToast('Failed to delete item', 'error');
        } finally {
            hideLoader();
        }
    });
}

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

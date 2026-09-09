let cart = JSON.parse(localStorage.getItem('cart')) || [];

document.addEventListener('DOMContentLoaded', () => {
    cartUpdateUI();
    renderCartPage();
});

// Функція швидкого додавання з каталогу
function quickAddToCart(id, nameEncoded, price, image) {
    const name = decodeURIComponent(nameEncoded);
    cart = JSON.parse(localStorage.getItem('cart')) || [];

    let existing = cart.find(item => String(item.id) === String(id));
    if (existing) {
        existing.quantity = (existing.quantity || existing.qty || 1) + 1;
        existing.qty = existing.quantity;
    } else {
        cart.push({ id, name, price, image: image || '', quantity: 1, qty: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    cartUpdateUI();
}

function cartSave() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function cartCount() {
    return cart.reduce((sum, item) => sum + (item.quantity || item.qty || 0), 0);
}

function cartUpdateUI() {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    const counters = document.querySelectorAll('.cart-count, .header__cart-count');
    const count = cartCount();
    counters.forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'inline-block' : 'none';
    });
}

function renderCartPage() {
    const container = document.getElementById('cart-items') || document.querySelector('.cart-items');
    if (!container) return;

    const summaryContainer = document.querySelector('.cart-summary__totals');
    let totalQuantity = 0;
    let totalPrice = 0;

    cart = JSON.parse(localStorage.getItem('cart')) || [];

    if (cart.length === 0) {
        container.innerHTML = '<p style="color: #e8e0d4; padding: 20px;">Ваш кошик порожній.</p>';
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="cart-total-row"><span>Кількість:</span><span>0 шт.</span></div>
                <div class="cart-total-row cart-total-row--final"><span>Разом:</span><span>0 ₴</span></div>
            `;
        }
        return;
    }

    container.innerHTML = cart.map((item, index) => {
        const qty = item.quantity || item.qty || 1;
        totalQuantity += qty;
        totalPrice += item.price * qty;

        // Безпечна перевірка картинки, щоб уникнути 404 помилок
        const imgSrc = (item.image && item.image.trim() !== '') ? item.image : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="%23555" stroke-width="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';

        return `
            <div class="cart-item" data-index="${index}" style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; border-bottom: 1px solid #332d28; padding-bottom: 15px;">
                <img src="${imgSrc}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; background: #222;">
                <div style="flex: 1; color: #e8e0d4;">
                    <div style="font-weight: 600; font-size: 16px;">${item.name}</div>
                    <div style="font-size: 14px; margin-top: 5px;">${qty} шт. × ${item.price} ₴ = ${item.price * qty} ₴</div>
                </div>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button onclick="updateQty(${index}, -1)" style="padding: 5px 10px; background: #333; color: #fff; border: none; cursor: pointer; border-radius: 3px;">-</button>
                    <span style="color: #fff; padding: 0 5px;">${qty}</span>
                    <button onclick="updateQty(${index}, 1)" style="padding: 5px 10px; background: #333; color: #fff; border: none; cursor: pointer; border-radius: 3px;">+</button>
                </div>
                <button onclick="removeItem(${index})" style="background: none; border: none; color: #a75a5a; cursor: pointer; font-size: 18px; margin-left: 10px;">✕</button>
            </div>
        `;
    }).join('');

    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="cart-total-row"><span>Кількість:</span><span>${totalQuantity} шт.</span></div>
            <div class="cart-total-row cart-total-row--final"><span>Разом:</span><span>${totalPrice} ₴</span></div>
        `;
    }
}

function updateQty(index, delta) {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart[index]) {
        let currentQty = (cart[index].quantity || cart[index].qty || 1) + delta;
        if (currentQty < 1) currentQty = 1;
        cart[index].quantity = currentQty;
        cart[index].qty = currentQty;
        cartSave();
        renderCartPage();
        cartUpdateUI();
    }
}

function removeItem(index) {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    cartSave();
    renderCartPage();
    cartUpdateUI();
}

function cartClear() {
    cart = [];
    cartSave();
    renderCartPage();
    cartUpdateUI();
}
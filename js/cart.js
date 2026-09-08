document.addEventListener('DOMContentLoaded', () => {
    renderCartPage();
});

function renderCartPage() {
    const cartItemsContainer = document.querySelector('.cart-items');
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 0; color: rgba(255,255,255,0.4);">
                <p style="font-size: 1.2rem; margin-bottom: 20px;">Ваш кошик порожній</p>
                <a href="index.html" class="cart-summary__btn" style="max-width: 250px; margin: 0 auto; display: inline-flex;">Перейти до каталогу</a>
            </div>
        `;
        updateSummary(cart);
        return;
    }

    cartItemsContainer.innerHTML = cart.map((item, index) => `
        <article class="cart-item" data-index="${index}">
            <div class="cart-item__img-placeholder">
                ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">` : 'Фото'}
            </div>

            <div class="cart-item__info">
                <h3 class="cart-item__name">${item.name || 'Товар'}</h3>
                <p class="cart-item__meta">${item.specs && Object.keys(item.specs).length > 0 ? Object.entries(item.specs).map(([k, v]) => `${k}: ${v}`).join(' | ') : 'Ручна робота'}</p>
            </div>

            <div class="cart-item__qty">
                <button class="cart-item__qty-btn cart-item__qty-btn--minus" onclick="changeQuantity(${index}, -1)">−</button>
                <input class="cart-item__qty-input" type="number" value="${item.quantity || 1}" min="1" max="99" onchange="updateQuantityInput(${index}, this.value)">
                <button class="cart-item__qty-btn cart-item__qty-btn--plus" onclick="changeQuantity(${index}, 1)">+</button>
            </div>

            <div class="cart-item__price-block">
                <span class="cart-item__price">${(item.price || 0) * (item.quantity || 1)} ₴</span>
            </div>

            <button class="cart-item__remove" aria-label="Видалити товар" onclick="removeItem(${index})">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </article>
    `).join('');

    updateSummary(cart);
}

// Зміна кількості через кнопки + / -
window.changeQuantity = function(index, delta) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart[index]) {
        cart[index].quantity = (cart[index].quantity || 1) + delta;
        if (cart[index].quantity < 1) cart[index].quantity = 1;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCartPage();
    }
}

// Зміна кількості прямим введенням у числове поле
window.updateQuantityInput = function(index, value) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let val = parseInt(value);
    if (cart[index]) {
        cart[index].quantity = isNaN(val) || val < 1 ? 1 : val;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCartPage();
    }
}

// Видалення товару
window.removeItem = function(index) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCartPage();
}

// Підрахунок і виведення підсумків у праву колонку
function updateSummary(cart) {
    let totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    let totalPrice = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

    const summaryTotals = document.querySelectorAll('.cart-summary__totals .cart-total-row');

    if (summaryTotals.length >= 4) {
        // Кількість товарів
        summaryTotals[0].querySelectorAll('span')[1].textContent = `${totalItems} шт.`;
        // Сума замовлення
        summaryTotals[1].querySelectorAll('span')[1].textContent = `${totalPrice} ₴`;
        // Разом (фінальна сума)
        summaryTotals[3].querySelectorAll('span')[1].textContent = `${totalPrice} ₴`;
    }
}
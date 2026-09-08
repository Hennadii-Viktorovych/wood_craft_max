document.addEventListener('DOMContentLoaded', () => {
    renderCartPage();
});

function renderCartPage() {
    const cartItemsContainer = document.querySelector('.cart-items');
    const totalPriceEl = document.getElementById('total-price') || document.querySelector('.cart-total-amount'); // Підтримка різних варіантів id
    const subtotalEl = document.getElementById('subtotal-price');

    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // Якщо контейнера списку товарів немає на сторінці — виходимо
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 0; color: rgba(255,255,255,0.4);">
                <p style="font-size: 1.2rem; margin-bottom: 20px;">Ваш кошик порожній</p>
                <a href="catalog.html" class="cart-summary__btn" style="max-width: 250px; margin: 0 auto; display: inline-flex;">Перейти до каталогу</a>
            </div>
        `;
        updateSummary(0);
        return;
    }

    // Рендеримо список товарів за вашою новою розміткою
    cartItemsContainer.innerHTML = cart.map((item, index) => `
        <div class="cart-item" data-index="${index}" data-id="${item.id}">
            <div class="cart-item__img-placeholder">
                ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">` : 'Фото'}
            </div>
            
            <div class="cart-item__info">
                <h3 class="cart-item__name">${item.name || 'Товар'}</h3>
                <p class="cart-item__meta">${item.specs && Object.keys(item.specs).length > 0 ? Object.entries(item.specs).map(([k, v]) => `${k}: ${v}`).join(' | ') : 'Ручна робота'}</p>
            </div>

            <div class="cart-item__qty">
                <button class="cart-item__qty-btn" onclick="changeQuantity(${index}, -1)">-</button>
                <input type="text" class="cart-item__qty-input" value="${item.quantity || 1}" readonly>
                <button class="cart-item__qty-btn" onclick="changeQuantity(${index}, 1)">+</button>
            </div>

            <div class="cart-item__price-block">
                <div class="cart-item__price">${(item.price || 0) * (item.quantity || 1)} ₴</div>
            </div>

            <button class="cart-item__remove" onclick="removeItem(${index})" title="Видалити товар">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    `).join('');

    calculateTotals(cart);
}

// Зміна кількості товару (+ / -)
window.changeQuantity = function(index, delta) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart[index]) {
        cart[index].quantity = (cart[index].quantity || 1) + delta;
        if (cart[index].quantity < 1) {
            cart[index].quantity = 1;
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCartPage();

        // Також оновлюємо виїзну панель, якщо вона десь на фоні синхронізована
        if (typeof window.renderCart === 'function') window.renderCart();
    }
}

// Видалення окремого товару
window.removeItem = function(index) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCartPage();

    if (typeof window.renderCart === 'function') window.renderCart();
}

// Підрахунок загальної суми
function calculateTotals(cart) {
    let subtotal = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    updateSummary(subtotal);
}

function updateSummary(subtotal) {
    // Шукаємо елементи виведення сум у блоці чека правої колонки
    const subtotalElements = document.querySelectorAll('.cart-subtotal');
    subtotalElements.forEach(el => el.textContent = `${subtotal} ₴`);

    const finalElements = document.querySelectorAll('.cart-total-amount, #total-price');
    finalElements.forEach(el => el.textContent = `${subtotal} ₴`);
}
document.addEventListener('DOMContentLoaded', () => {
    renderCart();
});

function renderCart() {
    const container = document.querySelector('.cart-items');
    const summaryContainer = document.querySelector('.cart-summary__totals');
    if (!container) return;

    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    if (cart.length === 0) {
        container.innerHTML = '<p style="color: #e8e0d4; padding: 20px; font-size: 16px;">Ваш кошик порожній.</p>';
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="cart-total-row"><span>Кількість товарів:</span><span>0 шт.</span></div>
                <div class="cart-total-row"><span>Сума замовлення:</span><span>0 ₴</span></div>
                <hr class="cart-summary__divider">
                <div class="cart-total-row cart-total-row--final"><span>Разом:</span><span>0 ₴</span></div>
            `;
        }
        return;
    }

    let totalQuantity = 0;
    let totalPrice = 0;

    container.innerHTML = cart.map((item, index) => {
        totalQuantity += item.quantity;
        totalPrice += item.price * item.quantity;

        return `
            <article class="cart-item" data-index="${index}">
                <div class="cart-item__img-placeholder" style="overflow: hidden; padding: 0;">
                    <img src="${item.image || 'images/placeholder.png'}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>

                <div class="cart-item__info">
                    <h3 class="cart-item__name">${item.name}</h3>
                    <p class="cart-item__meta">${item.specs ? Object.values(item.specs).join(', ') : 'Ручна робота'}</p>
                </div>

                <div class="cart-item__qty">
                    <button class="cart-item__qty-btn cart-item__qty-btn--minus" onclick="updateQty(${index}, -1)">−</button>
                    <input class="cart-item__qty-input" type="number" value="${item.quantity}" min="1" max="99" onchange="changeQtyInput(${index}, this.value)">
                    <button class="cart-item__qty-btn cart-item__qty-btn--plus" onclick="updateQty(${index}, 1)">+</button>
                </div>

                <div class="cart-item__price-block">
                    <span class="cart-item__price">${item.price * item.quantity} ₴</span>
                </div>

                <button class="cart-item__remove" aria-label="Видалити товар" onclick="removeItem(${index})">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </article>
        `;
    }).join('');

    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="cart-total-row">
                <span>Кількість товарів:</span>
                <span>${totalQuantity} шт.</span>
            </div>
            <div class="cart-total-row">
                <span>Сума замовлення:</span>
                <span>${totalPrice} ₴</span>
            </div>
            <div class="cart-total-row">
                <span>Доставка:</span>
                <span class="cart-total-row__shipping">За тарифами ТК</span>
            </div>
            <hr class="cart-summary__divider">
            <div class="cart-total-row cart-total-row--final">
                <span>Разом:</span>
                <span>${totalPrice} ₴</span>
            </div>
        `;
    }
}

function updateQty(index, delta) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart[index]) {
        cart[index].quantity += delta;
        if (cart[index].quantity < 1) cart[index].quantity = 1;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
    }
}

function changeQtyInput(index, value) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let val = parseInt(value);
    if (cart[index] && !isNaN(val) && val > 0) {
        cart[index].quantity = val;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
    }
}

function removeItem(index) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
}
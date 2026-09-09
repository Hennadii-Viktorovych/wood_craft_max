/**
 * js/catalog.js — WoodCraft UA (виправлена версія)
 * Підключати після cart.js
 */

document.addEventListener('DOMContentLoaded', async () => {
    const catalogGrid = document.querySelector('.catalog__grid');
    if (!catalogGrid) return;
    if (catalogGrid.dataset.loaded === 'true') return;
    catalogGrid.dataset.loaded = 'true';

    let products = [];

    // Спроба 1: PHP admin
    try {
        const res  = await fetch(`./admin/admin.php?action=get_products&t=${Date.now()}`);
        const data = await res.json();
        const raw  = Array.isArray(data) ? data
            : Array.isArray(data.products) ? data.products
                : Object.values(data);
        if (raw.length) products = raw;
    } catch(e) {}

    // Спроба 2: JSON напряму
    if (!products.length) {
        try {
            const res  = await fetch(`./json/product.json?t=${Date.now()}`);
            const data = await res.json();
            const raw  = Array.isArray(data) ? data
                : Array.isArray(data.products) ? data.products
                    : Object.values(data);
            if (raw.length) products = raw;
        } catch(e) {}
    }

    if (!products.length) {
        catalogGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#7a7060;padding:40px">Товари відсутні.</p>';
        return;
    }

    catalogGrid.innerHTML = '';

    products.forEach(product => {
        // ── Зображення ──────────────────────────────────
        const rawImg = (product.images && product.images[0])
            || product.image
            || product.img
            || '';

        // Нормалізуємо шлях: видаляємо зайві слеші та ../
        // Зберігаємо як є — відносно кореня сайту
        const imgSrc = fixImgPath(rawImg);

        const inStock      = product.in_stock !== false;
        const productName  = product.name  || product.title || 'Товар';
        const productPrice = product.price || 0;
        const productUrl   = `product.html?id=${product.id}`;

        const card = document.createElement('div');
        card.className = 'catalog__card';
        card.dataset.id = product.id;
        card.style.cursor = 'pointer';

        card.innerHTML = `
            <a href="${productUrl}" class="card__img-wrap"
               style="display:block;width:100%;height:260px;overflow:hidden;
                      background:#1d1a17;border-radius:8px;margin-bottom:15px;text-decoration:none">
                <img src="${imgSrc}"
                     alt="${esc(productName)}"
                     style="width:100%;height:100%;object-fit:cover;display:block"
                     onerror="this.style.display='none'">
            </a>
            <div class="card__info">
                <h3 class="card__title">
                    <a href="${productUrl}" style="color:inherit;text-decoration:none">${esc(productName)}</a>
                </h3>
                <p class="card__price">${fmtNum(productPrice)} ₴</p>
                <p style="font-size:12px;color:${inStock?'#78a75a':'#a75a5a'};margin-bottom:10px">
                    ${inStock ? 'В наявності' : 'Немає в наявності'}
                </p>
                <div style="display:flex;gap:10px">
                    <a href="${productUrl}" class="card__btn"
                       style="flex:1;text-align:center;text-decoration:none;
                              display:inline-flex;align-items:center;justify-content:center">
                        Детальніше
                    </a>
                    <button class="card__btn card__btn--cart"
                            onclick="event.preventDefault();event.stopPropagation();
                                     wcAddToCart(${JSON.stringify({
            id:    product.id,
            name:  productName,
            price: productPrice,
            image: imgSrc
        }).replace(/"/g,'&quot;')})">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"/>
                            <circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        catalogGrid.appendChild(card);
    });
});

// Додати в кошик — сумісно з вашим cart.js
function wcAddToCart(product) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const ex = cart.find(i => String(i.id) === String(product.id));
    if (ex) {
        ex.quantity = (ex.quantity || ex.qty || 1) + 1;
        ex.qty = ex.quantity;
    } else {
        cart.push({ ...product, quantity: 1, qty: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    if (typeof cartUpdateUI === 'function') cartUpdateUI();
    // Відкрити кошик
    const cartEl = document.querySelector('.header__cart');
    if (cartEl) { cartEl.classList.add('active'); window.scrollTo({ top:0, behavior:'smooth' }); }
}

// Виправляє шлях до зображення
function fixImgPath(src) {
    if (!src) return '';
    src = src.replace(/\\/g, '/');

    // Абсолютний URL — не чіпаємо
    if (src.startsWith('http://') || src.startsWith('https://')) return src;

    // Прибираємо будь-який префікс типу /wood_craft_max/ або ../
    src = src.replace(/^(\/wood_craft_max\/|\.\.\/|\.\/)+/, '');

    // Повертаємо відносний шлях від кореня сайту
    return './' + src;
}

function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function fmtNum(n) {
    return Number(n||0).toLocaleString('uk-UA');
}
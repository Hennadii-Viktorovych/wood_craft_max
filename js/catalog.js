/**
 * js/catalog.js — WoodCraft UA
 * Для index.html і catalog.html
 * Підключати після cart.js
 */

let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    cartBuildDrawer();
    loadProducts();
    initStaticCards(); // одразу ініціалізуємо статичні картки
});

// ── ЗАВАНТАЖЕННЯ ТОВАРІВ З PHP ────────────────────────
async function loadProducts() {
    try {
        const res  = await fetch(API + '?action=get_products');
        const data = await res.json();
        if (!data.ok || !data.products?.length) return;
        allProducts = data.products;
        renderCatalog(allProducts);
    } catch {
        // PHP не запущений — статичні картки вже ініціалізовані
    }
}

// ── РЕНДЕР ДИНАМІЧНОГО КАТАЛОГУ ───────────────────────
function renderCatalog(products) {
    const grid = document.querySelector('.catalog__grid');
    if (!grid) return;
    const inStock = products.filter(p => p.in_stock);
    if (!inStock.length) return;

    grid.innerHTML = inStock.map(p => {
        const img = (p.images || [])[0] || p.image || '';
        return `
            <div class="catalog__card" style="cursor:pointer">
                <div class="card__img-placeholder" style="background-image:url('${escAttr(img)}');background-size:cover;background-position:center">
                    ${!img ? p.name : ''}
                </div>
                <div class="card__info">
                    <h3 class="card__title">${escHtml(p.name)}</h3>
                    <p class="card__price">${fmtNum(p.price)} ₴</p>
                    <button class="card__btn"
                        onclick="event.stopPropagation(); goToProduct('${p.id}')">
                        Детальніше
                    </button>
                    <button class="card__btn card__btn--cart"
                        aria-label="Додати до кошика"
                        onclick="event.stopPropagation(); addProductToCart('${p.id}')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Клік по картці → сторінка товару
    grid.querySelectorAll('.catalog__card').forEach((card, i) => {
        card.addEventListener('click', () => goToProduct(inStock[i].id));
    });
}

// ── СТАТИЧНІ КАРТКИ (без PHP) ─────────────────────────
function initStaticCards() {
    document.querySelectorAll('.catalog__card').forEach(card => {
        // Кнопка "Купити" → перехід на product.html (якщо є data-id)
        const id = card.dataset.id;

        // Кнопка кошика
        const cartBtn = card.querySelector('.card__btn--cart');
        if (cartBtn) {
            cartBtn.addEventListener('click', e => {
                e.stopPropagation();
                addStaticToCart(card);
            });
        }

        // Кнопка "Купити" або клік по картці
        const buyBtn = card.querySelector('.card__btn:not(.card__btn--cart)');
        if (buyBtn) {
            buyBtn.addEventListener('click', e => {
                e.stopPropagation();
                if (id) goToProduct(id);
                else addStaticToCart(card);
            });
        }

        // Клік по картці → product.html
        if (id) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => goToProduct(id));
        }
    });
}

// ── ДОДАТИ З ДИНАМІЧНОГО КАТАЛОГУ ────────────────────
function addProductToCart(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    cartAdd({
        id:    p.id,
        name:  p.name,
        price: p.price,
        image: (p.images || [])[0] || p.image || '',
    });
}

// ── ДОДАТИ ZI СТАТИЧНОЇ КАРТКИ ────────────────────────
function addStaticToCart(card) {
    const name  = card.querySelector('.card__title')?.textContent?.trim() || 'Товар';
    const price = parseFloat(
        (card.querySelector('.card__price')?.textContent || '0').replace(/[^\d.]/g, '')
    ) || 0;
    const imgEl = card.querySelector('img, .card__img-placeholder');
    const image = imgEl?.tagName === 'IMG' ? imgEl.src : '';
    const id    = card.dataset.id || 'static_' + name.replace(/\s+/g, '_').slice(0, 20);

    cartAdd({ id, name, price, image });
}

// ── ПЕРЕХІД НА СТОРІНКУ ТОВАРУ ────────────────────────
function goToProduct(id) {
    window.location.href = 'product.html?id=' + id;
}
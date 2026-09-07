/**
 * js/catalog.js — WoodCraft UA
 * Для index.html і catalog.html — підключати після cart.js
 */

let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    cartBuildDrawer();
    loadProducts();
    initStaticCards(); // одразу щоб картки працювали без PHP
});

// ── ЗАВАНТАЖЕННЯ З PHP ────────────────────────────────
async function loadProducts() {
    try {
        const res  = await fetch(API + '?action=get_products');
        const data = await res.json();
        if (!data.ok || !data.products?.length) return;
        allProducts = data.products;
        renderCatalog(allProducts);
    } catch {
        // PHP недоступний — статичні картки вже ініціалізовані
    }
}

// ── РЕНДЕР КАТАЛОГУ ───────────────────────────────────
function renderCatalog(products) {
    const grid = document.querySelector('.catalog__grid');
    if (!grid) return;
    const inStock = products.filter(p => p.in_stock);
    if (!inStock.length) return;

    grid.innerHTML = inStock.map(p => {
        const img = (p.images || [])[0] || p.image || '';
        return `
            <div class="catalog__card" data-id="${p.id}" style="cursor:pointer">
                <div class="card__img-placeholder"
                     style="${img ? `background:url('${escAttr(img)}') center/cover no-repeat` : ''}">
                    ${!img ? '<span style="color:#aaa;font-size:13px">Фото товару</span>' : ''}
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
                        onclick="event.stopPropagation(); addDynToCart('${p.id}')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"/>
                            <circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Клік по картці → product.html
    grid.querySelectorAll('.catalog__card[data-id]').forEach(card => {
        card.addEventListener('click', () => goToProduct(card.dataset.id));
    });
}

// ── СТАТИЧНІ КАРТКИ ───────────────────────────────────
function initStaticCards() {
    document.querySelectorAll('.catalog__card').forEach(card => {
        const id = card.dataset.id;

        // Кнопка кошика
        card.querySelector('.card__btn--cart')?.addEventListener('click', e => {
            e.stopPropagation();
            addStaticToCart(card);
        });

        // Кнопка "Купити"
        card.querySelector('.card__btn:not(.card__btn--cart)')?.addEventListener('click', e => {
            e.stopPropagation();
            if (id) goToProduct(id);
            else addStaticToCart(card);
        });

        // Клік по картці
        if (id) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => goToProduct(id));
        }
    });
}

// ── ДОДАТИ В КОШИК ────────────────────────────────────
function addDynToCart(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    cartAdd({
        id:    p.id,
        name:  p.name,
        price: p.price,
        image: (p.images || [])[0] || p.image || '',
    });
}

function addStaticToCart(card) {
    const name  = card.querySelector('.card__title')?.textContent?.trim() || 'Товар';
    const price = parseFloat(
        (card.querySelector('.card__price')?.textContent || '0').replace(/[^\d.]/g,'')
    ) || 0;
    const img   = card.querySelector('img');
    const id    = card.dataset.id || 'static_' + name.replace(/\s+/g,'_').slice(0,20);
    cartAdd({ id, name, price, image: img?.src || '' });
}

function goToProduct(id) {
    window.location.href = 'product.html?id=' + id;
}
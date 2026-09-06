/**
 * js/product.js — WoodCraft UA
 * Для product.html
 * Підключати після cart.js
 */

let allProducts    = [];
let currentProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
    cartBuildDrawer();

    // Кнопки в хедері product.html вже ініціалізовані через cartBuildDrawer
    // Кнопки дій на сторінці
    document.querySelector('.product-actions__btn--cart')
        ?.addEventListener('click', addCurrentToCart);
    document.querySelector('.product-actions__btn--buy')
        ?.addEventListener('click', buyNow);

    // Лічильник кількості
    document.querySelector('.product-qty__btn--plus')
        ?.addEventListener('click', () => changeProductQty(1));
    document.querySelector('.product-qty__btn--minus')
        ?.addEventListener('click', () => changeProductQty(-1));

    await loadAllProducts();

    const id = new URLSearchParams(location.search).get('id');
    if (id) renderProduct(id);
    // Якщо нема id — залишаємо статичний HTML (для розробки)
});

// ── ЗАВАНТАЖЕННЯ ──────────────────────────────────────
async function loadAllProducts() {
    try {
        const res  = await fetch(API + '?action=get_products');
        const data = await res.json();
        if (data.ok) allProducts = data.products || [];
    } catch {}
}

// ── РЕНДЕР ТОВАРУ ─────────────────────────────────────
function renderProduct(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return; // залишаємо статичний HTML

    currentProduct = p;
    document.title = p.name + ' — WoodCraft';

    // Назва і ціна
    const titleEl = document.querySelector('.product-info__title');
    const priceEl = document.querySelector('.product-info__price');
    if (titleEl) titleEl.textContent = p.name;
    if (priceEl) priceEl.textContent = fmtNum(p.price) + ' ₴';

    // Наявність
    const statusEl = document.querySelector('.product-info__status');
    if (statusEl) statusEl.textContent = p.in_stock ? 'В наявності' : 'Немає в наявності';

    // Опис
    const descEl = document.querySelector('.product-description__text');
    if (descEl && p.description) descEl.textContent = p.description;

    // Характеристики (specs) — вставляємо перед описом
    if (p.specs && Object.keys(p.specs).length) {
        const specsHtml = `
            <div class="product-specs">
                <h3 class="product-description__title">Характеристики</h3>
                <table class="product-specs__table">
                    ${Object.entries(p.specs).map(([k, v]) => `
                        <tr>
                            <td class="product-specs__key">${escHtml(k)}</td>
                            <td class="product-specs__val">${escHtml(v)}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;
        const descBlock = document.querySelector('.product-description');
        if (descBlock) descBlock.insertAdjacentHTML('beforebegin', specsHtml);
    }

    // Переваги (features)
    if (p.features?.length) {
        const featsHtml = `
            <div class="product-features">
                ${p.features.map(f => `<span class="product-feature">✓ ${escHtml(f)}</span>`).join('')}
            </div>
        `;
        const divider = document.querySelector('.product-info__divider');
        if (divider) divider.insertAdjacentHTML('afterend', featsHtml);
    }

    // Галерея
    const imgs = p.images?.length ? p.images : (p.image ? [p.image] : []);
    if (imgs.length) {
        const mainEl = document.querySelector('.product-gallery__main');
        if (mainEl) {
            mainEl.innerHTML = `<img src="${escAttr(imgs[0])}" alt="${escAttr(p.name)}"
                style="width:100%;height:100%;object-fit:cover;display:block"
                onerror="this.style.display='none'">`;
        }

        const thumbsEl = document.querySelector('.product-gallery__thumbs');
        if (thumbsEl && imgs.length > 1) {
            thumbsEl.innerHTML = imgs.map((src, i) => `
                <div class="product-gallery__thumb ${i === 0 ? 'product-gallery__thumb--active' : ''}"
                     onclick="switchThumb(this, '${escAttr(src)}')"
                     style="cursor:pointer">
                    <img src="${escAttr(src)}" alt=""
                         style="width:100%;height:100%;object-fit:cover;display:block"
                         onerror="this.style.display='none'">
                </div>
            `).join('');
        }
    }

    // Додаємо стилі для нових елементів
    addProductStyles();
}

function addProductStyles() {
    if (document.getElementById('wc-product-styles')) return;
    const s = document.createElement('style');
    s.id = 'wc-product-styles';
    s.textContent = `
        .product-specs { margin-bottom: 20px; }
        .product-specs__table { width: 100%; border-collapse: collapse; }
        .product-specs__table tr { border-bottom: 1px solid #f0ebe3; }
        .product-specs__key { padding: 8px 4px; color: #7a7060; font-size: 13px; width: 45%; }
        .product-specs__val { padding: 8px 4px; font-size: 13px; font-weight: 500; }
        .product-features { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
        .product-feature {
            padding: 6px 14px; border: 1px solid #e0d9cf;
            border-radius: 3px; font-size: 12px; color: #5a9e6a;
        }
    `;
    document.head.appendChild(s);
}

// ── ГАЛЕРЕЯ ───────────────────────────────────────────
function switchThumb(thumb, src) {
    const mainImg = document.querySelector('.product-gallery__main img');
    if (mainImg) mainImg.src = src;
    document.querySelectorAll('.product-gallery__thumb').forEach(t => t.classList.remove('product-gallery__thumb--active'));
    thumb.classList.add('product-gallery__thumb--active');
}

// ── КІЛЬКІСТЬ ─────────────────────────────────────────
function changeProductQty(delta) {
    const input = document.querySelector('.product-qty__input');
    if (!input) return;
    const val = Math.max(1, Math.min(99, parseInt(input.value || 1) + delta));
    input.value = val;
}

function getProductQty() {
    const input = document.querySelector('.product-qty__input');
    return Math.max(1, parseInt(input?.value || 1));
}

// ── КОШИК ─────────────────────────────────────────────
function addCurrentToCart() {
    // Якщо є дані з PHP
    if (currentProduct) {
        const qty = getProductQty();
        for (let i = 0; i < qty; i++) {
            cartAdd({
                id:    currentProduct.id,
                name:  currentProduct.name,
                price: currentProduct.price,
                image: (currentProduct.images || [])[0] || currentProduct.image || '',
            });
        }
        return;
    }

    // Якщо статичний HTML
    const name  = document.querySelector('.product-info__title')?.textContent?.trim() || 'Товар';
    const price = parseFloat(
        (document.querySelector('.product-info__price')?.textContent || '0').replace(/[^\d.]/g, '')
    ) || 0;
    const image = document.querySelector('.product-gallery__main img')?.src || '';
    const id    = 'static_' + name.replace(/\s+/g, '_').slice(0, 20);
    const qty   = getProductQty();
    for (let i = 0; i < qty; i++) cartAdd({ id, name, price, image });
}

function buyNow() {
    addCurrentToCart();
    setTimeout(() => { cartClose(); window.location.href = 'order.html'; }, 350);
}
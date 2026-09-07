/**
 * js/product.js — WoodCraft UA  (виправлена версія)
 * Підключати після cart.js
 *
 * ЗМІНИ vs оригінал:
 *  - змінна перейменована з allProducts → wcProducts (щоб не конфліктувати з catalog.js)
 *  - читає з ./json/product.json напряму (fetch), без PHP — працює локально і на хостингу
 *  - якщо fetch не вдається — залишає статичний HTML як є (чорного екрана не буде)
 *  - підтримка PHP-бекенду залишена як додатковий fallback
 */

let wcProducts    = [];
let currentProduct = null;

// ── ШЛЯХ ДО ДАНИХ ────────────────────────────────────
// Спочатку намагається читати JSON-файл напряму.
// Якщо запущено через PHP-хостинг — також спрацює через admin.php.
const PRODUCT_JSON_URL = './json/product.json';

document.addEventListener('DOMContentLoaded', async () => {
    document.body.style.overflow = '';
    cartBuildDrawer();

    // Кнопки — прив'язуємо одразу (вони є в HTML)
    document.querySelector('.product-actions__btn--cart')
        ?.addEventListener('click', addCurrentToCart);
    document.querySelector('.product-actions__btn--buy')
        ?.addEventListener('click', buyNow);
    document.querySelector('.product-qty__btn--plus')
        ?.addEventListener('click', () => changeQty(1));
    document.querySelector('.product-qty__btn--minus')
        ?.addEventListener('click', () => changeQty(-1));

    // ID товару з URL: product.html?id=prod_001
    const id = new URLSearchParams(location.search).get('id');

    if (!id) {
        showNotFound('Товар не вказано. Поверніться до <a href="catalog.html">каталогу</a>.');
        return;
    }

    // Завантажуємо дані
    await loadWcProducts();

    // Рендеримо
    const product = wcProducts.find(p => String(p.id) === String(id));
    if (product) {
        renderProduct(product);
    } else {
        showNotFound('Товар не знайдено. <a href="catalog.html">До каталогу →</a>');
    }
});

// ── ЗАВАНТАЖЕННЯ ДАНИХ ────────────────────────────────
async function loadWcProducts() {
    // 1. Спроба: читати product.json напряму (локально і на хостингу без PHP)
    try {
        const res  = await fetchWithTimeout(PRODUCT_JSON_URL, 3000);
        const data = await res.json();

        // JSON може бути об'єктом { prod_001: {...}, prod_002: {...} }
        // або масивом [ {...}, {...} ]
        if (Array.isArray(data)) {
            wcProducts = data;
        } else if (data && typeof data === 'object') {
            wcProducts = Object.values(data);
        }

        if (wcProducts.length) return; // успіх
    } catch (e) {
        console.warn('product.json недоступний, пробую PHP…', e.message);
    }

    // 2. Fallback: PHP admin.php (якщо є хостинг з PHP)
    try {
        const res  = await fetchWithTimeout('./admin/admin.php?action=get_products', 3000);
        const data = await res.json();
        if (data?.ok && data.products?.length) {
            wcProducts = data.products;
        }
    } catch (e) {
        console.warn('PHP API теж недоступний:', e.message);
    }
}

// fetch з таймаутом
function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const id   = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal })
        .finally(() => clearTimeout(id));
}

// ── РЕНДЕР ТОВАРУ ────────────────────────────────────
function renderProduct(p) {
    currentProduct = p;
    document.title = p.name + ' — WoodCraft';

    // Назва
    const titleEl = document.querySelector('.product-info__title');
    if (titleEl) titleEl.textContent = p.name;

    // Ціна
    const priceEl = document.querySelector('.product-info__price');
    if (priceEl) {
        priceEl.textContent = fmtNum(p.price) + ' ₴';
        // Стара ціна
        if (p.old_price) {
            priceEl.insertAdjacentHTML('afterend',
                `<span class="product-info__old-price"
                       style="text-decoration:line-through;color:#aaa;
                              font-size:.75em;margin-left:10px">
                    ${fmtNum(p.old_price)} ₴
                 </span>`
            );
        }
    }

    // Статус
    const statusEl = document.querySelector('.product-info__status');
    if (statusEl) {
        statusEl.textContent  = p.in_stock ? 'В наявності' : 'Немає в наявності';
        statusEl.style.color  = p.in_stock ? '#5a9e6a' : '#c0614a';
    }

    // Галерея
    const imgs = p.images?.length ? p.images
        : p.image          ? [p.image]
            : [];

    const mainEl = document.querySelector('.product-gallery__main');
    if (mainEl && imgs.length) {
        mainEl.innerHTML = `
            <img id="mainPhoto"
                 src="${escAttr(imgs[0])}"
                 alt="${escAttr(p.name)}"
                 style="width:100%;height:100%;object-fit:cover;border-radius:inherit"
                 onerror="this.style.display='none'">
        `;
    }

    const thumbsEl = document.querySelector('.product-gallery__thumbs');
    if (thumbsEl) {
        if (imgs.length > 1) {
            thumbsEl.innerHTML = imgs.map((src, i) => `
                <div class="product-gallery__thumb ${i === 0 ? 'product-gallery__thumb--active' : ''}"
                     onclick="switchThumb(this, '${escAttr(src)}')">
                    <img src="${escAttr(src)}" alt=""
                         style="width:100%;height:100%;object-fit:cover;border-radius:inherit"
                         onerror="this.style.display='none'">
                </div>
            `).join('');
        } else {
            thumbsEl.style.display = 'none';
        }
    }

    // Опис
    const descEl = document.querySelector('.product-description__text');
    if (descEl && p.description) {
        descEl.style.whiteSpace = 'pre-line';
        descEl.textContent = p.description;
    }

    // Характеристики (specs)
    const specs = p.specs || {};
    if (Object.keys(specs).length) {
        const descBlock = document.querySelector('.product-description');
        if (descBlock) {
            descBlock.insertAdjacentHTML('afterend', `
                <div class="product-specs" style="margin-top:24px">
                    <h3 class="product-description__title"
                        style="margin-bottom:12px">Характеристики</h3>
                    <table style="width:100%;border-collapse:collapse">
                        ${Object.entries(specs).map(([k, v]) => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,.07)">
                                <td style="padding:9px 4px;color:#7a7060;
                                           font-size:13px;width:45%">${escHtml(k)}</td>
                                <td style="padding:9px 4px;font-size:13px;
                                           font-weight:500">${escHtml(v)}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            `);
        }
    }

    // Фічі (features)
    const features = p.features || [];
    if (features.length) {
        const specBlock = document.querySelector('.product-specs') || document.querySelector('.product-description');
        specBlock?.insertAdjacentHTML('afterend', `
            <ul class="product-features"
                style="margin-top:20px;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:8px">
                ${features.map(f => `
                    <li style="background:rgba(200,160,80,.12);border:1px solid rgba(200,160,80,.3);
                               border-radius:3px;padding:5px 12px;font-size:12px;color:#c8a050">
                        ✓ ${escHtml(f)}
                    </li>
                `).join('')}
            </ul>
        `);
    }
}

// ── ГАЛЕРЕЯ ──────────────────────────────────────────
function switchThumb(thumb, src) {
    const mainPhoto = document.getElementById('mainPhoto');
    if (mainPhoto) mainPhoto.src = src;
    document.querySelectorAll('.product-gallery__thumb')
        .forEach(t => t.classList.remove('product-gallery__thumb--active'));
    thumb.classList.add('product-gallery__thumb--active');
}

// ── КІЛЬКІСТЬ ────────────────────────────────────────
function changeQty(delta) {
    const input = document.querySelector('.product-qty__input');
    if (!input) return;
    input.value = Math.max(1, Math.min(99, parseInt(input.value || 1) + delta));
}
function getQty() {
    return Math.max(1, parseInt(document.querySelector('.product-qty__input')?.value || 1));
}

// ── КОШИК ────────────────────────────────────────────
function addCurrentToCart() {
    const qty = getQty();

    if (currentProduct) {
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

    // Fallback — статичний HTML (якщо JS не завантажив дані)
    const name  = document.querySelector('.product-info__title')?.textContent?.trim() || 'Товар';
    const price = parseFloat(
        (document.querySelector('.product-info__price')?.textContent || '0')
            .replace(/[^\d.]/g, '')
    ) || 0;
    const image = document.getElementById('mainPhoto')?.src || '';
    const id    = new URLSearchParams(location.search).get('id')
        || 'static_' + name.replace(/\s+/g, '_').slice(0, 20);
    for (let i = 0; i < qty; i++) cartAdd({ id, name, price, image });
}

function buyNow() {
    addCurrentToCart();
    setTimeout(() => { cartClose(); window.location.href = 'order.html'; }, 300);
}

// ── NOT FOUND ─────────────────────────────────────────
function showNotFound(html) {
    const main = document.querySelector('.product-page');
    if (main) {
        main.innerHTML = `
            <div style="text-align:center;padding:100px 20px;max-width:560px;margin:0 auto">
                <div style="font-size:56px;margin-bottom:20px">🪵</div>
                <h2 style="font-size:28px;font-weight:400;margin-bottom:16px">Товар не знайдено</h2>
                <p style="color:#7a7060;line-height:1.75">${html}</p>
            </div>
        `;
    }
}
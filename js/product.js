/**
 * js/product.js — WoodCraft UA
 * Сумісний з вашим cart.js
 */

document.addEventListener('DOMContentLoaded', async () => {
    document.body.style.overflow = '';

    const titleEl = document.querySelector('.product-info__title');
    if (!titleEl) return;

    const productId = new URLSearchParams(location.search).get('id');
    if (!productId) { showNotFound('ID товару не вказано.'); return; }

    let products = [];

    // Спроба 1: PHP
    try {
        const res  = await fetchT('./admin/admin.php?action=get_products', 3000);
        const data = await res.json();
        products   = normalizeProducts(data);
    } catch(e) {}

    // Спроба 2: JSON
    if (!products.length) {
        try {
            const res  = await fetchT('./json/product.json', 3000);
            const data = await res.json();
            products   = normalizeProducts(data);
        } catch(e) {}
    }

    if (!products.length) { showNotFound('Не вдалося завантажити товари.'); return; }

    const product = products.find(p => String(p.id).trim() === productId.trim());
    if (!product) { showNotFound('Товар не знайдено.'); return; }

    // ── Заповнити сторінку ──────────────────────────────
    document.title = (product.name || 'Товар') + ' — WoodCraft';

    titleEl.textContent = product.name || 'Без назви';

    const priceEl = document.querySelector('.product-info__price');
    if (priceEl) {
        priceEl.textContent = fmtNum(product.price) + ' ₴';
        if (product.old_price) {
            priceEl.insertAdjacentHTML('afterend',
                `<span style="text-decoration:line-through;color:#7a7060;font-size:.75em;margin-left:10px">
                    ${fmtNum(product.old_price)} ₴
                 </span>`);
        }
    }

    const statusEl = document.querySelector('.product-info__status');
    if (statusEl) {
        const inStock = product.in_stock !== false;
        statusEl.textContent = inStock ? 'В наявності' : 'Немає в наявності';
        statusEl.style.color = inStock ? '#78a75a' : '#a75a5a';
    }

    const descEl = document.querySelector('.product-description__text');
    if (descEl) {
        descEl.innerHTML = product.description
            ? product.description.replace(/\n/g, '<br>')
            : 'Опис відсутній.';
    }

    // Характеристики
    if (product.specs && Object.keys(product.specs).length) {
        const specsHtml = Object.entries(product.specs).map(([k,v]) => `
            <div style="display:flex;justify-content:space-between;
                        padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)">
                <span style="color:#7a7060;font-size:13px">${esc(k)}</span>
                <span style="font-weight:500;font-size:13px">${esc(v)}</span>
            </div>`).join('');
        const specTable = document.querySelector('.product-specs,.characteristics-table');
        if (specTable) {
            specTable.innerHTML = specsHtml;
        } else {
            const descBlock = document.querySelector('.product-description');
            if (descBlock) {
                descBlock.insertAdjacentHTML('afterend', `
                    <div class="dynamic-specs" style="margin-top:24px">
                        <h3 style="font-size:15px;font-weight:600;margin-bottom:12px;color:#c8a050">Характеристики</h3>
                        ${specsHtml}
                    </div>`);
            }
        }
    }

    // Фічі
    if (product.features && product.features.length) {
        const anchor = document.querySelector('.dynamic-specs,.product-specs,.product-description');
        if (anchor) {
            anchor.insertAdjacentHTML('afterend', `
                <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:16px">
                    ${product.features.map(f =>
                `<span style="background:rgba(200,160,80,.1);border:1px solid rgba(200,160,80,.25);
                                      border-radius:3px;padding:4px 12px;font-size:12px;color:#c8a050">
                             ✓ ${esc(f)}</span>`
            ).join('')}
                </div>`);
        }
    }

    // ── Галерея ─────────────────────────────────────────
    let images = [];
    if (Array.isArray(product.images) && product.images.length) {
        images = product.images.filter(Boolean);
    } else if (product.image) {
        images = [product.image];
    }
    images = images.map(fixImgPath);
    if (!images.length) images = ['./images/placeholder.png'];

    const galleryMain = document.querySelector('.product-gallery__main');
    const placeholder = document.getElementById('gallery-placeholder');

    const mainHtml = `
        <div style="width:100%;height:450px;overflow:hidden;border-radius:12px;background:#1d1a17">
            <img id="main-product-img"
                 src="${images[0]}"
                 alt="${esc(product.name)}"
                 style="width:100%;height:100%;object-fit:cover;display:block"
                 onerror="this.style.display='none'">
        </div>`;

    if (galleryMain) {
        galleryMain.innerHTML = mainHtml;
    } else if (placeholder) {
        placeholder.outerHTML = mainHtml;
    }

    const thumbsEl = document.getElementById('gallery-thumbs');
    if (thumbsEl) {
        thumbsEl.innerHTML = images.length > 1
            ? images.map((src, i) => `
                <div onclick="wcChangeImg('${src}', this)"
                     style="width:70px;height:70px;border-radius:8px;overflow:hidden;
                            cursor:pointer;margin:10px 8px 0 0;display:inline-block;
                            border:2px solid ${i===0?'#c8a050':'transparent'};transition:border-color .2s">
                    <img src="${src}" style="width:100%;height:100%;object-fit:cover"
                         onerror="this.style.display='none'">
                </div>`).join('')
            : '';
    }

    // ── Кількість ────────────────────────────────────────
    const qtyInput = document.querySelector('.product-qty__input');
    document.querySelector('.product-qty__btn--minus')
        ?.addEventListener('click', () => {
            const v = parseInt(qtyInput?.value) || 1;
            if (v > 1 && qtyInput) qtyInput.value = v - 1;
        });
    document.querySelector('.product-qty__btn--plus')
        ?.addEventListener('click', () => {
            if (qtyInput) qtyInput.value = (parseInt(qtyInput.value) || 1) + 1;
        });

    // ── В кошик ──────────────────────────────────────────
    function addToCart() {
        const qty = Math.max(1, parseInt(qtyInput?.value || 1));

        // Ваш cart.js використовує localStorage 'cart' і функцію cartUpdateUI
        let cartData = JSON.parse(localStorage.getItem('cart') || '[]');
        const existing = cartData.find(x => String(x.id) === String(product.id));
        if (existing) {
            existing.quantity = (existing.quantity || 1) + qty;
            existing.qty = existing.quantity;
        } else {
            cartData.push({
                id:       product.id,
                name:     product.name,
                price:    product.price,
                image:    images[0],
                quantity: qty,
                qty:      qty
            });
        }
        localStorage.setItem('cart', JSON.stringify(cartData));

        // Оновити UI кошика
        if (typeof cartUpdateUI === 'function') cartUpdateUI();

        // Відкрити кошик
        const cartEl = document.querySelector('.header__cart');
        if (cartEl) {
            cartEl.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (typeof cartOpen === 'function') cartOpen();
    }

    document.querySelector('.product-actions__btn--cart')
        ?.addEventListener('click', e => { e.preventDefault(); addToCart(); });

    document.querySelector('.product-actions__btn--buy')
        ?.addEventListener('click', () => {
            addToCart();
            setTimeout(() => { window.location.href = 'order.html'; }, 400);
        });
});

window.wcChangeImg = function(src, el) {
    const main = document.getElementById('main-product-img');
    if (main) main.src = src;
    document.querySelectorAll('[onclick^="wcChangeImg"]')
        .forEach(t => t.style.borderColor = 'transparent');
    if (el) el.style.borderColor = '#c8a050';
};

function normalizeProducts(data) {
    if (Array.isArray(data))           return data;
    if (Array.isArray(data?.products)) return data.products;
    if (data && typeof data === 'object') return Object.values(data);
    return [];
}

function fixImgPath(src) {
    if (!src) return './images/placeholder.png';
    src = String(src).replace(/\\/g, '/');
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    src = src.replace(/^(\/wood_craft_max\/|\.\.\/|\.\/)+/, '');
    return './' + src;
}

function fetchT(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

function showNotFound(msg) {
    const page = document.querySelector('.product-page');
    if (page) page.innerHTML = `
        <div style="text-align:center;padding:100px 20px;max-width:500px;margin:0 auto">
            <div style="font-size:52px;margin-bottom:20px">🪵</div>
            <h2 style="font-size:26px;font-weight:500;margin-bottom:12px">Товар не знайдено</h2>
            <p style="color:#7a7060;margin-bottom:28px">${msg}</p>
            <a href="catalog.html"
               style="display:inline-block;padding:13px 32px;background:#c8a050;
                      color:#0a0a0a;border-radius:4px;text-decoration:none;font-weight:600">
                До каталогу →
            </a>
        </div>`;
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmtNum(n) { return Number(n||0).toLocaleString('uk-UA'); }
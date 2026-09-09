/**
 * js/order.js — WoodCraft UA (виправлена версія)
 * Підключати після cart.js
 */

document.addEventListener('DOMContentLoaded', () => {
    renderOrderProducts();
    initOrderForm();
});

// ── УТИЛІТИ КОШИКА (незалежні від cart.js) ───────────
function getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
}
function saveCart(c) {
    localStorage.setItem('cart', JSON.stringify(c));
    if (typeof cartUpdateUI === 'function') cartUpdateUI();
}
function getTotal() {
    return getCart().reduce((s, i) => s + (i.price || 0) * (i.quantity || i.qty || 1), 0);
}
function getCount() {
    return getCart().reduce((s, i) => s + (i.quantity || i.qty || 1), 0);
}

// ── РЕНДЕР ТОВАРІВ ────────────────────────────────────
function renderOrderProducts() {
    const container = document.querySelector('.order-summary__products');
    if (!container) return;

    const cart = getCart();

    if (!cart.length) {
        container.innerHTML = `
            <p style="color:#7a7060;padding:20px 0;text-align:center">
                Кошик порожній.<br>
                <a href="catalog.html" style="color:#c8a050">До каталогу →</a>
            </p>`;
        updateTotals();
        return;
    }

    container.innerHTML = cart.map((i, index) => {
        const qty = i.quantity || i.qty || 1;
        return `
        <div class="summary-card" data-id="${esc(i.id)}">
            <div class="summary-card__img"
                 style="${i.image
            ? `background:url('${esc(i.image)}') center/cover no-repeat`
            : 'display:flex;align-items:center;justify-content:center;font-size:28px'}">
                ${!i.image ? '🪵' : ''}
            </div>
            <div class="summary-card__info">
                <h4 class="summary-card__name">${esc(i.name)}</h4>
                <p class="summary-card__meta">${fmt(i.price)} ₴ × ${qty} шт.</p>
                <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
                    <button type="button" onclick="oQty(${index},-1)"
                        style="width:26px;height:26px;border:1px solid #e0d9cf;background:none;
                               cursor:pointer;font-size:16px;border-radius:2px;line-height:1">−</button>
                    <span style="font-size:14px;min-width:22px;text-align:center">${qty}</span>
                    <button type="button" onclick="oQty(${index},1)"
                        style="width:26px;height:26px;border:1px solid #e0d9cf;background:none;
                               cursor:pointer;font-size:16px;border-radius:2px;line-height:1">+</button>
                    <button type="button" onclick="oDel(${index})"
                        style="background:none;border:none;cursor:pointer;
                               color:#b0a898;font-size:18px;margin-left:4px;line-height:1">✕</button>
                </div>
            </div>
            <span class="summary-card__price">${fmt(i.price * qty)} ₴</span>
        </div>`;
    }).join('');

    updateTotals();
}

function updateTotals() {
    const total = getTotal();
    const count = getCount();

    // Оновлюємо всі .total-row
    document.querySelectorAll('.total-row').forEach(row => {
        const label = row.querySelector('span:first-child')?.textContent?.trim() || '';
        const val   = row.querySelector('span:last-child');
        if (!val) return;
        if (label.includes('Товари')) val.textContent = fmt(total) + ' ₴';
        if (label.includes('Разом'))  val.textContent = fmt(total) + ' ₴';
    });

    // Заголовок з кількістю
    const title = document.querySelector('.order-page__title');
    if (title && count) {
        const orig = title.dataset.orig || title.textContent.split('(')[0].trim();
        title.dataset.orig = orig;
        title.textContent  = orig + ' (' + count + ' ' + plural(count,'товар','товари','товарів') + ')';
    }
}

// ── ЗМІНА КІЛЬКОСТІ ──────────────────────────────────
function oQty(index, delta) {
    const cart = getCart();
    if (!cart[index]) return;
    let q = (cart[index].quantity || cart[index].qty || 1) + delta;
    if (q < 1) q = 1;
    cart[index].quantity = q;
    cart[index].qty      = q;
    saveCart(cart);
    renderOrderProducts();
}

function oDel(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    renderOrderProducts();
}

// ── ФОРМА ─────────────────────────────────────────────
function initOrderForm() {
    const form = document.getElementById('orderForm');
    if (!form) return;
    form.addEventListener('submit', e => { e.preventDefault(); submitOrder(form); });
}

async function submitOrder(form) {
    const cart = getCart();
    if (!cart.length) { wcToast('Кошик порожній', 'err'); return; }

    const nameInput  = form.querySelector('input[placeholder*="ім"], input[placeholder*="Ім"]')
        || form.querySelector('input[type="text"]');
    const phoneInput = form.querySelector('input[type="tel"]');

    const name  = nameInput?.value.trim()  || '';
    const phone = phoneInput?.value.trim() || '';

    if (!name)  { wcToast('Введіть ваше ім\'я', 'err');    nameInput?.focus();  return; }
    if (!phone) { wcToast('Введіть номер телефону', 'err'); phoneInput?.focus(); return; }

    const btn      = form.querySelector('[type="submit"]') || document.querySelector('.order-summary__btn');
    const origText = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.textContent = 'Надсилаємо…'; }

    const payment = form.querySelector('[name="payment"]:checked')?.value || '';
    const comment = form.querySelector('textarea')?.value.trim() || '';

    const message = [
        payment ? 'Оплата: ' + payment : '',
        comment,
    ].filter(Boolean).join('\n');

    // Нормалізуємо cart для відправки
    const cartToSend = cart.map(i => ({
        id:    i.id,
        name:  i.name,
        price: i.price,
        qty:   i.quantity || i.qty || 1,
    }));

    try {
        const res  = await fetch('./admin/admin.php?action=submit_order', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name, phone, message, cart: cartToSend }),
        });
        const data = await res.json();

        if (data.ok) {
            // Очищаємо кошик
            localStorage.removeItem('cart');
            if (typeof cartUpdateUI === 'function') cartUpdateUI();

            const main = document.querySelector('.order-page');
            if (main) main.innerHTML = `
                <div style="text-align:center;padding:100px 20px;max-width:560px;margin:0 auto">
                    <div style="font-size:64px;margin-bottom:24px">✅</div>
                    <h2 style="font-size:36px;font-weight:400;margin-bottom:16px">Замовлення прийнято!</h2>
                    <p style="color:#7a7060;line-height:1.75;margin-bottom:32px">
                        Дякуємо, ${esc(name)}!<br>
                        Ми зателефонуємо на ${esc(phone)} найближчим часом.
                    </p>
                    <a href="index.html"
                       style="display:inline-block;padding:14px 36px;background:#c8a050;color:#fff;
                              border-radius:3px;font-size:15px;font-weight:500;text-decoration:none">
                        Повернутись на головну
                    </a>
                </div>`;
        } else {
            throw new Error(data.error || 'Помилка сервера');
        }
    } catch(e) {
        wcToast(e.message, 'err');
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
}

// ── TOAST ─────────────────────────────────────────────
function wcToast(msg, type = 'ok') {
    if (typeof showToast === 'function') { showToast(msg, type); return; }
    let t = document.getElementById('wc-order-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'wc-order-toast';
        t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(60px);
            padding:12px 24px;border-radius:40px;font-size:14px;font-weight:500;
            z-index:9999;opacity:0;transition:all .3s;pointer-events:none;white-space:nowrap;
            font-family:inherit;`;
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = type === 'err' ? '#c0614a' : '#5a9e6a';
    t.style.color = '#fff';
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._t);
    t._t = setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(60px)';
    }, 3000);
}

// ── УТИЛІТИ ───────────────────────────────────────────
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmt(n) { return Number(n||0).toLocaleString('uk-UA'); }
function plural(n, one, few, many) {
    const m10=n%10, m100=n%100;
    if (m10===1&&m100!==11) return one;
    if (m10>=2&&m10<=4&&(m100<10||m100>=20)) return few;
    return many;
}
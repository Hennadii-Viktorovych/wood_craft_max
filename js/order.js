/**
 * js/order.js — WoodCraft UA
 * Для order.html — підключати після cart.js
 */

document.addEventListener('DOMContentLoaded', () => {
    cartBuildDrawer();
    renderOrderProducts();
    initOrderForm();
});

// ── РЕНДЕР ТОВАРІВ ────────────────────────────────────
function renderOrderProducts() {
    const container = document.querySelector('.order-summary__products');
    if (!container) return;

    if (!cart.length) {
        container.innerHTML = `
            <p style="color:#7a7060;padding:20px 0;text-align:center">
                Кошик порожній.<br>
                <a href="catalog.html" style="color:#c8a050">До каталогу →</a>
            </p>`;
        updateTotals();
        return;
    }

    container.innerHTML = cart.map(i => `
        <div class="summary-card" data-id="${escAttr(i.id)}">
            <div class="summary-card__img"
                 style="${i.image
        ? `background:url('${escAttr(i.image)}') center/cover no-repeat`
        : 'display:flex;align-items:center;justify-content:center;font-size:28px'}">
                ${!i.image ? '🪵' : ''}
            </div>
            <div class="summary-card__info">
                <h4 class="summary-card__name">${escHtml(i.name)}</h4>
                <p class="summary-card__meta">${fmtNum(i.price)} ₴ × ${i.qty} шт.</p>
                <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
                    <button onclick="oQty('${i.id}',-1)"
                        style="width:26px;height:26px;border:1px solid #e0d9cf;background:none;
                               cursor:pointer;font-size:16px;border-radius:2px;line-height:1">−</button>
                    <span style="font-size:14px;min-width:22px;text-align:center">${i.qty}</span>
                    <button onclick="oQty('${i.id}',1)"
                        style="width:26px;height:26px;border:1px solid #e0d9cf;background:none;
                               cursor:pointer;font-size:16px;border-radius:2px;line-height:1">+</button>
                    <button onclick="oDel('${i.id}')"
                        style="background:none;border:none;cursor:pointer;
                               color:#b0a898;font-size:18px;margin-left:4px;line-height:1">✕</button>
                </div>
            </div>
            <span class="summary-card__price">${fmtNum(i.price * i.qty)} ₴</span>
        </div>
    `).join('');

    updateTotals();
}

function updateTotals() {
    const total = cartTotal();
    const count = cartCount();

    // Оновлюємо всі .total-row
    const rows = document.querySelectorAll('.total-row');
    rows.forEach(row => {
        const label = row.querySelector('span:first-child')?.textContent?.trim() || '';
        const val   = row.querySelector('span:last-child');
        if (!val) return;
        if (label.includes('Товари'))  val.textContent = fmtNum(total) + ' ₴';
        if (label.includes('Разом'))   val.textContent = fmtNum(total) + ' ₴';
    });

    // Заголовок
    const title = document.querySelector('.order-page__title');
    if (title && count) {
        const orig = title.dataset.orig || title.textContent.split('(')[0].trim();
        title.dataset.orig = orig;
        title.textContent  = orig + ' (' + count + ' ' + plural(count,'товар','товари','товарів') + ')';
    }
}

// ── ЗМІНА КІЛЬКОСТІ ───────────────────────────────────
function oQty(id, delta) {
    const item = cart.find(x => x.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(x => x.id !== id);
    cartSave(); cartUpdateUI(); renderOrderProducts();
}
function oDel(id) {
    cart = cart.filter(x => x.id !== id);
    cartSave(); cartUpdateUI(); renderOrderProducts();
}

// ── ФОРМА ─────────────────────────────────────────────
function initOrderForm() {
    const form = document.getElementById('orderForm');
    if (!form) return;
    form.addEventListener('submit', e => { e.preventDefault(); submitOrder(form); });
}

async function submitOrder(form) {
    if (!cart.length) { showToast('Кошик порожній', 'err'); return; }

    // Ім'я — перший текстовий інпут
    const nameInput  = form.querySelector('input[placeholder*="ім"], input[placeholder*="Ім"]')
        || form.querySelector('input[type="text"]');
    const phoneInput = form.querySelector('input[type="tel"]');

    const name  = nameInput?.value.trim()  || '';
    const phone = phoneInput?.value.trim() || '';

    if (!name)  { showToast('Введіть ваше ім\'я', 'err');    nameInput?.focus();  return; }
    if (!phone) { showToast('Введіть номер телефону', 'err'); phoneInput?.focus(); return; }

    const btn      = form.querySelector('[type="submit"]') || document.querySelector('.order-summary__btn');
    const origText = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Надсилаємо…'; }

    // Збираємо додаткові дані
    const delivery = form.querySelector('select')?.value || '';
    const payment  = form.querySelector('[name="payment"]:checked')?.value || '';
    const comment  = form.querySelector('textarea')?.value.trim() || '';
    const textInputs = [...form.querySelectorAll('input[type="text"]')];
    const city = textInputs[2]?.value.trim() || '';
    const dept = textInputs[3]?.value.trim() || '';

    const message = [
        delivery ? 'Доставка: ' + delivery : '',
        city     ? 'Місто: '    + city     : '',
        dept     ? 'Відділення: '+ dept    : '',
        payment  ? 'Оплата: '   + payment  : '',
        comment,
    ].filter(Boolean).join('\n');

    try {
        const res  = await fetch(API + '?action=submit_order', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name, phone, message, cart }),
        });
        const data = await res.json();

        if (data.ok) {
            cartClear();
            const main = document.querySelector('.order-page');
            if (main) main.innerHTML = `
                <div style="text-align:center;padding:100px 20px;max-width:560px;margin:0 auto">
                    <div style="font-size:64px;margin-bottom:24px">✅</div>
                    <h2 style="font-size:36px;font-weight:400;margin-bottom:16px">Замовлення прийнято!</h2>
                    <p style="color:#7a7060;line-height:1.75;margin-bottom:32px">
                        Дякуємо, ${escHtml(name)}!<br>
                        Ми зателефонуємо на ${escHtml(phone)} найближчим часом.
                    </p>
                    <a href="index.html"
                       style="display:inline-block;padding:14px 36px;background:#c8a050;color:#fff;
                              border-radius:3px;font-size:15px;font-weight:500;text-decoration:none">
                        Повернутись на головну
                    </a>
                </div>
            `;
        } else {
            throw new Error(data.error || 'Помилка сервера');
        }
    } catch (e) {
        showToast(e.message, 'err');
        if (btn) { btn.disabled = false; btn.textContent = origText; }
    }
}

// ── УТИЛІТА ───────────────────────────────────────────
function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
}
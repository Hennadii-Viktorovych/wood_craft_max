/**
 * js/order.js — WoodCraft UA
 * Для order.html
 * Підключати після cart.js
 */

document.addEventListener('DOMContentLoaded', () => {
    cartBuildDrawer();
    renderOrderSummary();
    initOrderForm();
});

// ── РЕНДЕР ТОВАРІВ У ПРАВІЙ КОЛОНЦІ ──────────────────
function renderOrderSummary() {
    const container = document.querySelector('.order-summary__products');
    if (!container) return;

    if (!cart.length) {
        container.innerHTML = '<p style="color:#7a7060;padding:20px 0">Кошик порожній. <a href="../catalog.html">До каталогу</a></p>';
        updateOrderTotals();
        return;
    }

    container.innerHTML = cart.map(i => `
        <div class="summary-card" data-id="${escAttr(i.id)}">
            <div class="summary-card__img" style="${i.image ? `background-image:url('${escAttr(i.image)}');background-size:cover;background-position:center` : ''}">
                ${!i.image ? '🪵' : ''}
            </div>
            <div class="summary-card__info">
                <h4 class="summary-card__name">${escHtml(i.name)}</h4>
                <p class="summary-card__meta">${fmtNum(i.price)} ₴ × ${i.qty} шт.</p>
                <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
                    <button onclick="orderQty('${i.id}',-1)" style="width:24px;height:24px;border:1px solid #e0d9cf;background:none;cursor:pointer;font-size:16px;border-radius:2px">−</button>
                    <span style="font-size:14px;min-width:20px;text-align:center">${i.qty}</span>
                    <button onclick="orderQty('${i.id}',1)"  style="width:24px;height:24px;border:1px solid #e0d9cf;background:none;cursor:pointer;font-size:16px;border-radius:2px">+</button>
                    <button onclick="orderDel('${i.id}')" style="background:none;border:none;cursor:pointer;color:#b0a898;font-size:16px;margin-left:4px">✕</button>
                </div>
            </div>
            <span class="summary-card__price">${fmtNum(i.price * i.qty)} ₴</span>
        </div>
    `).join('');

    updateOrderTotals();
}

function updateOrderTotals() {
    const total    = cartTotal();
    const count    = cartCount();
    const delivery = total >= 2000 ? 'Безкоштовно' : 'За тарифами';

    // Оновлюємо рядки підсумку
    const rows = document.querySelectorAll('.total-row');
    if (rows.length >= 3) {
        rows[0].querySelector('span:last-child').textContent = fmtNum(total) + ' ₴';
        rows[2].querySelector('span:last-child').textContent = fmtNum(total) + ' ₴';
    }

    // Оновлюємо кількість у заголовку якщо є
    const titleEl = document.querySelector('.order-page__title');
    if (titleEl && count > 0) {
        titleEl.textContent = `Оформлення замовлення (${count} ${plural(count, 'товар', 'товари', 'товарів')})`;
    }
}

// ── ЗМІНА КІЛЬКОСТІ В ЗАМОВЛЕННІ ─────────────────────
function orderQty(id, delta) {
    const item = cart.find(x => x.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(x => x.id !== id);
    cartSave(); cartUpdateUI(); renderOrderSummary();
}

function orderDel(id) {
    cart = cart.filter(x => x.id !== id);
    cartSave(); cartUpdateUI(); renderOrderSummary();
}

// ── ФОРМА ЗАМОВЛЕННЯ ──────────────────────────────────
function initOrderForm() {
    const form = document.getElementById('orderForm');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        await submitOrder(form);
    });
}

async function submitOrder(form) {
    if (!cart.length) {
        showToast('Кошик порожній', 'err');
        return;
    }

    // Збираємо дані форми
    const inputs  = form.querySelectorAll('input, select, textarea');
    const formData = {};
    inputs.forEach(el => {
        if (el.name) formData[el.name] = el.value.trim();
    });

    // Беремо телефон і ім'я (перші два інпути)
    const allInputs = form.querySelectorAll('input[type="text"], input[type="tel"]');
    const name  = allInputs[0]?.value.trim() || '';
    const phone = form.querySelector('input[type="tel"]')?.value.trim() || '';

    if (!name)  { showToast('Введіть ваше ім\'я', 'err');    allInputs[0]?.focus();  return; }
    if (!phone) { showToast('Введіть номер телефону', 'err'); form.querySelector('[type="tel"]')?.focus(); return; }

    const btn = document.querySelector('.order-summary__btn');
    const origText = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Надсилаємо…'; }

    // Збираємо додаткову інформацію
    const delivery = form.querySelector('select')?.value || '';
    const city     = allInputs[2]?.value.trim() || '';
    const dept     = allInputs[3]?.value.trim() || '';
    const comment  = form.querySelector('textarea')?.value.trim() || '';
    const payment  = form.querySelector('[name="payment"]:checked')?.value || '';

    const message = [
        delivery ? 'Доставка: ' + delivery : '',
        city     ? 'Місто: ' + city : '',
        dept     ? 'Відділення: ' + dept : '',
        payment  ? 'Оплата: ' + payment : '',
        comment,
    ].filter(Boolean).join('\n');

    try {
        const res  = await fetch(API + '?action=submit_order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, message, cart }),
        });
        const data = await res.json();

        if (data.ok) {
            cartClear();
            // Показуємо успіх
            const main = document.querySelector('.order-page');
            if (main) {
                main.innerHTML = `
                    <div style="text-align:center;padding:100px 20px;max-width:600px;margin:0 auto">
                        <div style="font-size:64px;margin-bottom:24px">✅</div>
                        <h2 style="font-size:36px;font-weight:400;margin-bottom:16px">Замовлення прийнято!</h2>
                        <p style="color:#7a7060;line-height:1.7;margin-bottom:32px">
                            Дякуємо, ${escHtml(name)}! Ми зателефонуємо вам на номер ${escHtml(phone)}
                            найближчим часом для підтвердження і обговорення деталей доставки.
                        </p>
                        <a href="../index.html" style="display:inline-block;padding:14px 36px;background:#c8a050;color:#fff;border-radius:3px;font-size:15px;font-weight:500;text-decoration:none">
                            Повернутись на головну
                        </a>
                    </div>
                `;
            }
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
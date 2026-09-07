/**
 * js/cart.js — WoodCraft UA
 * Підключати ПЕРШИМ на всіх сторінках
 */

const API = './admin/admin.php';
let cart = JSON.parse(localStorage.getItem('wc_cart') || '[]');

// ── ОПЕРАЦІЇ ──────────────────────────────────────────
function cartAdd(product) {
    const ex = cart.find(i => i.id === product.id);
    if (ex) ex.qty++;
    else cart.push({
        id:    product.id,
        name:  product.name,
        price: product.price,
        image: product.image || '',
        qty:   1
    });
    cartSave();
    cartUpdateUI();
    cartRenderDrawer();
    cartOpen();
    showToast('"' + product.name + '" додано до кошика');
}

function cartChangeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    cartSave(); cartUpdateUI(); cartRenderDrawer();
}

function cartRemove(id) {
    cart = cart.filter(i => i.id !== id);
    cartSave(); cartUpdateUI(); cartRenderDrawer();
}

function cartSave()  { localStorage.setItem('wc_cart', JSON.stringify(cart)); }
function cartClear() { cart = []; cartSave(); cartUpdateUI(); }
function cartTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

// ── ОНОВЛЕННЯ ХЕДЕРА ──────────────────────────────────
function cartUpdateUI() {
    const count = cartCount();
    const total = cartTotal();
    const badge = document.getElementById('wc-header-badge');
    const tot   = document.getElementById('wc-header-total');
    if (badge) badge.textContent = count || '';
    if (tot)   tot.textContent   = count ? fmtNum(total) + ' ₴' : '';
}

// ── ІНІЦІАЛІЗАЦІЯ ХЕДЕРА ──────────────────────────────
function cartInitHeader() {
    const cartEl = document.querySelector('.header__cart');
    if (!cartEl) return;

    cartEl.innerHTML = `
        <button class="wc-cart-btn" onclick="cartToggle()" aria-label="Кошик">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span id="wc-header-badge" class="wc-badge"></span>
        </button>
        <span id="wc-header-total" class="wc-header-total"></span>
    `;

    // Додаємо стилі один раз
    if (!document.getElementById('wc-header-styles')) {
        const s = document.createElement('style');
        s.id = 'wc-header-styles';
        s.textContent = `
            .header__cart { display:flex; align-items:center; gap:8px; }
            .wc-cart-btn {
                position:relative; background:none; border:none;
                cursor:pointer; padding:6px; display:flex;
                align-items:center; color:inherit; transition:transform .2s;
            }
            .wc-cart-btn:hover { transform:scale(1.1); }
            .wc-badge {
                position:absolute; top:-2px; right:-2px;
                background:#c8a050; color:#fff;
                font-size:10px; font-weight:700; line-height:1;
                min-width:17px; height:17px; border-radius:50%;
                display:flex; align-items:center; justify-content:center; padding:2px;
            }
            .wc-badge:empty { display:none; }
            .wc-header-total { font-weight:600; font-size:16px; white-space:nowrap; }
        `;
        document.head.appendChild(s);
    }
}

// ── DRAWER ────────────────────────────────────────────
function cartBuildDrawer() {
    cartInitHeader();
    if (document.getElementById('wc-cart-drawer')) { cartUpdateUI(); return; }

    // Стилі drawer
    if (!document.getElementById('wc-drawer-styles')) {
        const s = document.createElement('style');
        s.id = 'wc-drawer-styles';
        s.textContent = `
            #wc-cart-overlay {
                position:fixed; inset:0; background:rgba(0,0,0,.5);
                z-index:1000; opacity:0; transition:opacity .3s; pointer-events:none;
            }
            #wc-cart-panel {
                position:fixed; top:0; right:0; height:100vh;
                width:400px; max-width:95vw;
                background:#fff; color:#1a1714; z-index:1001;
                transform:translateX(110%);
                transition:transform .32s cubic-bezier(.4,0,.2,1);
                display:flex; flex-direction:column;
                box-shadow:-4px 0 32px rgba(0,0,0,.15);
                border-left:1px solid #e0d9cf;
                font-family:'Fira Sans',system-ui,sans-serif;
            }
            #wc-cart-drawer.open #wc-cart-overlay { opacity:1; pointer-events:auto; }
            #wc-cart-drawer.open #wc-cart-panel   { transform:none; }
            .wc-dhead {
                display:flex; align-items:center; justify-content:space-between;
                padding:20px 24px; border-bottom:1px solid #e0d9cf; flex-shrink:0;
                font-family:'Cormorant Garamond',Georgia,serif;
                font-size:22px; font-weight:700;
            }
            .wc-dclose {
                background:none; border:none; cursor:pointer;
                font-size:24px; color:#7a7060; line-height:1; transition:color .2s;
            }
            .wc-dclose:hover { color:#1a1714; }
            .wc-dlist { flex:1; overflow-y:auto; padding:12px 24px; }
            .wc-dfoot { padding:16px 24px; border-top:1px solid #e0d9cf; flex-shrink:0; }
            .wc-dtotal {
                font-family:'Cormorant Garamond',Georgia,serif;
                font-size:26px; font-weight:700;
                text-align:right; margin-bottom:14px;
            }
            .wc-dbtn {
                width:100%; padding:15px; background:#c8a050; color:#fff;
                border:none; border-radius:3px; font-size:15px; font-weight:500;
                cursor:pointer; transition:background .2s; font-family:inherit;
            }
            .wc-dbtn:hover { background:#a8802e; }
            .wc-row {
                display:flex; gap:14px; padding:14px 0;
                border-bottom:1px solid #f0ebe3; align-items:flex-start;
            }
            .wc-row:last-child { border:none; }
            .wc-row img {
                width:64px; height:64px; object-fit:cover;
                border-radius:3px; flex-shrink:0; background:#f0ebe3;
            }
            .wc-row-info { flex:1; min-width:0; }
            .wc-row-name {
                font-size:14px; font-weight:500;
                overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
            }
            .wc-row-price { font-size:12px; color:#7a7060; margin-top:3px; }
            .wc-row-qty { display:flex; align-items:center; gap:8px; margin-top:8px; }
            .wc-qbtn {
                width:26px; height:26px; border-radius:3px;
                border:1px solid #e0d9cf; background:none;
                color:#1a1714; cursor:pointer; font-size:16px; line-height:1;
                display:flex; align-items:center; justify-content:center;
                transition:border-color .15s;
            }
            .wc-qbtn:hover { border-color:#c8a050; color:#c8a050; }
            .wc-qnum { font-size:14px; min-width:20px; text-align:center; }
            .wc-rdel {
                background:none; border:none; cursor:pointer;
                color:#b0a898; font-size:20px; padding:2px; line-height:1;
                flex-shrink:0; transition:color .15s;
            }
            .wc-rdel:hover { color:#c0614a; }
            .wc-empty {
                text-align:center; padding:60px 0;
                color:#7a7060; font-size:15px;
            }
            .wc-empty span { display:block; font-size:48px; margin-bottom:14px; }
        `;
        document.head.appendChild(s);
    }

    const el = document.createElement('div');
    el.id = 'wc-cart-drawer';
    el.innerHTML = `
        <div id="wc-cart-overlay" onclick="cartClose()"></div>
        <div id="wc-cart-panel">
            <div class="wc-dhead">
                <span>Кошик</span>
                <button class="wc-dclose" onclick="cartClose()">✕</button>
            </div>
            <div class="wc-dlist" id="wc-cart-list"></div>
            <div class="wc-dfoot">
                <div class="wc-dtotal" id="wc-drawer-total"></div>
                <button class="wc-dbtn" onclick="cartGoToOrder()">
                    Оформити замовлення →
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(el);
    cartUpdateUI();
}

function cartRenderDrawer() {
    const list = document.getElementById('wc-cart-list');
    const tot  = document.getElementById('wc-drawer-total');
    if (!list) return;

    if (!cart.length) {
        list.innerHTML = '<div class="wc-empty"><span>🛒</span>Кошик порожній</div>';
        if (tot) tot.textContent = '';
        return;
    }

    list.innerHTML = cart.map(i => `
        <div class="wc-row">
            <img src="${escAttr(i.image)}"
                 alt="${escAttr(i.name)}"
                 onerror="this.style.visibility='hidden'">
            <div class="wc-row-info">
                <div class="wc-row-name">${escHtml(i.name)}</div>
                <div class="wc-row-price">${fmtNum(i.price)} ₴ / шт.</div>
                <div class="wc-row-qty">
                    <button class="wc-qbtn" onclick="cartChangeQty('${i.id}',-1)">−</button>
                    <span class="wc-qnum">${i.qty}</span>
                    <button class="wc-qbtn" onclick="cartChangeQty('${i.id}',1)">+</button>
                </div>
            </div>
            <button class="wc-rdel" onclick="cartRemove('${i.id}')">✕</button>
        </div>
    `).join('');

    if (tot) tot.textContent = fmtNum(cartTotal()) + ' ₴';
}

function cartOpen()   { cartRenderDrawer(); document.getElementById('wc-cart-drawer')?.classList.add('open');    document.body.style.overflow = 'hidden'; }
function cartClose()  {                     document.getElementById('wc-cart-drawer')?.classList.remove('open'); document.body.style.overflow = ''; }
function cartToggle() { document.getElementById('wc-cart-drawer')?.classList.contains('open') ? cartClose() : cartOpen(); }
function cartGoToOrder() { cartClose(); window.location.href = 'order.html'; }

// ── TOAST ─────────────────────────────────────────────
function showToast(msg, type = 'ok') {
    let t = document.getElementById('wc-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'wc-toast';
        const s = document.createElement('style');
        s.textContent = `
            #wc-toast {
                position:fixed; bottom:28px; left:50%;
                transform:translateX(-50%) translateY(12px);
                background:#1a1714; color:#fff; border-radius:4px;
                padding:12px 24px; font-size:14px; z-index:9999;
                opacity:0; transition:all .3s; pointer-events:none;
                white-space:nowrap; box-shadow:0 4px 20px rgba(0,0,0,.3);
                font-family:'Fira Sans',sans-serif;
            }
            #wc-toast.show { opacity:1; transform:translateX(-50%); }
            #wc-toast.err  { background:#c0614a; }
            #wc-toast.ok   { background:#5a9e6a; }
        `;
        document.head.appendChild(s);
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className   = type === 'err' ? 'show err' : 'show ok';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.className = '', 3500);
}

// ── UTILS ─────────────────────────────────────────────
function escHtml(s = '') { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s = '') { return String(s).replace(/"/g,'&quot;'); }
function fmtNum(n)       { return Number(n || 0).toLocaleString('uk-UA'); }
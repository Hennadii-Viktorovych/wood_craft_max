
    const API = './admin.php';
    let token    = sessionStorage.getItem('wc_token') || '';
    let products = [];
    let images   = []; // [{url, filename}]

    document.addEventListener('DOMContentLoaded', () => {
    if (token) showApp();
    document.getElementById('login-pass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
    initDrop();
});

    // ── AUTH ──────────────────────────────────
    async function doLogin() {
    const pass = document.getElementById('login-pass').value.trim();
    if (!pass) return;
    try {
    const r = await req('login', {password: pass});
    token = r.token;
    sessionStorage.setItem('wc_token', token);
    document.getElementById('login-err').style.display = 'none';
    showApp();
} catch { document.getElementById('login-err').style.display = 'block'; }
}
    function doLogout() {
    token = ''; sessionStorage.removeItem('wc_token');
    document.getElementById('screen-app').style.display = 'none';
    document.getElementById('screen-login').style.display = 'flex';
    document.getElementById('login-pass').value = '';
}
    function showApp() {
    document.getElementById('screen-login').style.display = 'none';
    document.getElementById('screen-app').style.display = 'flex';
    loadProducts(); loadOrders();
}

    // ── TABS ──────────────────────────────────
    function switchTab(name) {
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('tab-'+name).classList.add('active');
    document.getElementById('nav-'+name).classList.add('active');
}

    // ── PRODUCTS ─────────────────────────────
    async function loadProducts() {
    try {
    const r = await req('get_products');
    products = r.products || [];
    renderProducts();
} catch(e) {
    document.getElementById('products-content').innerHTML =
    `<div class="empty"><div class="empty__icon">⚠️</div>${e.message}</div>`;
}
}

    function renderProducts() {
    const inStock = products.filter(p=>p.in_stock).length;
    document.getElementById('products-sub').textContent = `${products.length} товарів · ${inStock} в наявності`;
    if (!products.length) {
    document.getElementById('products-content').innerHTML =
    `<div class="empty"><div class="empty__icon">📦</div>Товарів ще немає. Додайте перший!</div>`;
    return;
}
    document.getElementById('products-content').innerHTML = `
    <div class="prod-table-wrap">
      <table class="prod-table">
        <thead><tr><th>Фото</th><th>Назва</th><th>Ціна</th><th>Наявність</th><th>Дії</th></tr></thead>
        <tbody>${products.map(p=>{
    const img = (p.images&&p.images[0])||p.image||'';
    return `<tr>
            <td>${img?`<img class="prod-thumb" src="${x(toDisplaySrc(img))}" onerror="this.style.display='none'">`:`<div class="prod-thumb-ph">🪵</div>`}</td>
            <td><div class="prod-name">${x(p.name)}</div><div class="prod-cat">${x(p.category||'—')}</div></td>
            <td>
              <div style="font-weight:600;color:var(--gold)">${n(p.price)} ₴</div>
              ${p.old_price?`<div style="font-size:12px;color:var(--muted);text-decoration:line-through">${n(p.old_price)} ₴</div>`:''}
            </td>
            <td><span class="badge ${p.in_stock?'badge-green':'badge-red'}">${p.in_stock?'В наявності':'Немає'}</span></td>
            <td><div class="td-actions">
              <button class="btn btn-ghost btn-sm" onclick="openProductModal('${p.id}')">Редагувати</button>
              <button class="btn btn-ghost btn-sm" onclick="previewById('${p.id}')">Прев'ю</button>
              <button class="btn btn-danger btn-sm" onclick="confirmDelete('${p.id}','${x(p.name)}')">Видалити</button>
            </div></td>
          </tr>`;
}).join('')}</tbody>
      </table>
    </div>`;
}

    function openProductModal(id=null) {
    clearForm();
    if (id) {
    const p = products.find(v=>v.id===id);
    if (!p) return;
    document.getElementById('modal-title').textContent = 'Редагувати товар';
    document.getElementById('f-id').value         = p.id;
    document.getElementById('f-name').value        = p.name||'';
    document.getElementById('f-category').value    = p.category||'';
    document.getElementById('f-price').value       = p.price||'';
    document.getElementById('f-old-price').value   = p.old_price||'';
    document.getElementById('f-stock').value       = p.in_stock?'1':'0';
    document.getElementById('f-short-desc').value  = p.short_desc||'';
    document.getElementById('f-desc').value        = p.description||'';
    document.getElementById('f-features').value    = (p.features||[]).join(', ');
    Object.entries(p.specs||{}).forEach(([k,v])=>addSpec(k,v));
    const imgs = p.images?.length ? p.images : (p.image?[p.image]:[]);
    images = imgs.map(url=>({url, filename:url.split('/').pop()}));
    renderImgGrid();
} else {
    document.getElementById('modal-title').textContent = 'Новий товар';
}
    openModal('product-modal');
}

    function clearForm() {
    ['f-id','f-name','f-category','f-price','f-old-price','f-short-desc','f-desc','f-features']
        .forEach(id=>document.getElementById(id).value='');
    document.getElementById('f-stock').value='1';
    document.getElementById('specs-list').innerHTML='';
    images=[]; renderImgGrid();
}

    async function saveProduct() {
    const name  = document.getElementById('f-name').value.trim();
    const price = parseFloat(document.getElementById('f-price').value)||0;
    if (!name)  { toast('Введіть назву','err'); return; }
    if (!price) { toast('Введіть ціну','err'); return; }

    const specs={};
    document.querySelectorAll('.spec-row').forEach(r=>{
    const k=r.querySelector('.spec-key').value.trim();
    const v=r.querySelector('.spec-val').value.trim();
    if(k) specs[k]=v;
});

    const features = document.getElementById('f-features').value
    .split(',').map(f=>f.trim()).filter(Boolean);
    const imgs = images.map(i=>i.url);

    const body={
    id:          document.getElementById('f-id').value||null,
    name, category: document.getElementById('f-category').value.trim(),
    price, old_price: parseFloat(document.getElementById('f-old-price').value)||null,
    in_stock:    document.getElementById('f-stock').value==='1',
    short_desc:  document.getElementById('f-short-desc').value.trim(),
    description: document.getElementById('f-desc').value.trim(),
    image:       imgs[0]||'', images:imgs,
    specs, features, token,
};

    try {
    await req('save_product', body);
    closeModal('product-modal');
    toast(body.id?'Збережено!':'Товар додано!');
    await loadProducts();
} catch(e) { toast(e.message,'err'); }
}

    function confirmDelete(id,name) {
    document.getElementById('confirm-title').textContent=`Видалити "${name}"?`;
    document.getElementById('confirm-sub').textContent='Товар буде видалено назавжди.';
    document.getElementById('confirm-ok').onclick=()=>deleteProduct(id);
    document.getElementById('confirm-overlay').classList.add('open');
}
    async function deleteProduct(id) {
    closeConfirm();
    try { await req('delete_product',{id,token}); toast('Видалено'); await loadProducts(); }
    catch(e){toast(e.message,'err');}
}

    function addSpec(key='',val='') {
    const list=document.getElementById('specs-list');
    const row=document.createElement('div');
    row.className='spec-row';
    row.innerHTML=`
    <input type="text" class="f-input spec-key" placeholder="Назва (Розмір)" value="${x(key)}">
    <input type="text" class="f-input spec-val" placeholder="Значення (35×20 см)" value="${x(val)}">
    <button type="button" class="spec-del" onclick="this.parentElement.remove()">✕</button>`;
    list.appendChild(row);
}

    // ── IMAGES ───────────────────────────────
    function initDrop() {
    const zone=document.getElementById('drop-zone');
    zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
    zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
    zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');handleFiles(e.dataTransfer.files);});
}

    async function handleFiles(fileList) {
    const files=Array.from(fileList).filter(f=>f.type.startsWith('image/'));
    if (!files.length) return;
    if (images.length+files.length>6) { toast('Максимум 6 фото','err'); return; }
    document.getElementById('img-uploading').style.display='flex';
    for (const file of files) {
    try {
    const path = await uploadFile(file); // 'images/product/xxx.jpg'
    images.push({ url: path }); // зберігаємо оригінальний шлях для JSON
} catch(e) { toast('Помилка: '+e.message,'err'); }
}
    document.getElementById('img-uploading').style.display='none';
    renderImgGrid();
}

    async function uploadFile(file) {
    const fd=new FormData();
    fd.append('image',file);
    fd.append('token',token);
    const res=await fetch(API+'?action=upload_image',{method:'POST',body:fd});
    const data=await res.json();
    if (!data.ok) throw new Error(data.error||'Помилка');
    // data.path = 'images/product/filename.png' (відносно кореня сайту)
    // Адмінка в папці admin/, тому для відображення додаємо ../
    // Але зберігаємо оригінальний шлях у JSON щоб сайт читав правильно
    return data.path; // зберігаємо як є (без ../)
}

    // Конвертує шлях з JSON у src для відображення в адмінці
    // JSON: 'images/product/x.jpg' → відображення: '../images/product/x.jpg'
    function toDisplaySrc(path) {
    if (!path) return '';
    // Якщо вже абсолютний URL або data: — не чіпаємо
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('/')) return path;
    // Якщо починається з ../ — вже правильно
    if (path.startsWith('../')) return path;
    // Відносний шлях від кореня — додаємо ../
    return '../' + path;
}

    function renderImgGrid() {
    const grid=document.getElementById('img-grid');
    if (!images.length) { grid.innerHTML=''; return; }
    grid.innerHTML=images.map((img,i)=>`
    <div class="img-item ${i===0?'is-main':''}"
         draggable="true" data-idx="${i}"
         ondragstart="iDragStart(event,${i})"
         ondragover="iDragOver(event,${i})"
         ondrop="iDrop(event,${i})"
         ondragend="iDragEnd()">
      <img src="${x(toDisplaySrc(img.url))}" alt="">
      <button class="img-item__star" onclick="setMain(${i})">⭐ Головне</button>
      <div class="img-item__badge">⭐ Головне</div>
      <button class="img-item__del" onclick="removeImg(${i})">✕</button>
    </div>`).join('');
}

    function setMain(idx) {
    const [item]=images.splice(idx,1);
    images.unshift(item);
    renderImgGrid();
}
    function removeImg(idx) { images.splice(idx,1); renderImgGrid(); }

    let _di=null;
    function iDragStart(e,i){_di=i;e.currentTarget.classList.add('dragging');e.dataTransfer.effectAllowed='move';}
    function iDragOver(e,i){e.preventDefault();document.querySelectorAll('.img-item').forEach(el=>el.classList.remove('drag-target'));if(i!==_di)e.currentTarget.classList.add('drag-target');}
    function iDrop(e,i){e.preventDefault();if(_di===null||_di===i)return;const[m]=images.splice(_di,1);images.splice(i,0,m);_di=null;renderImgGrid();}
    function iDragEnd(){_di=null;document.querySelectorAll('.img-item').forEach(el=>el.classList.remove('dragging','drag-target'));}

    // ── PREVIEW ──────────────────────────────
    function getFormData() {
    const specs={};
    document.querySelectorAll('.spec-row').forEach(r=>{
    const k=r.querySelector('.spec-key').value.trim();
    const v=r.querySelector('.spec-val').value.trim();
    if(k) specs[k]=v;
});
    return {
    name:        document.getElementById('f-name').value||'Назва товару',
    price:       parseFloat(document.getElementById('f-price').value)||0,
    old_price:   parseFloat(document.getElementById('f-old-price').value)||null,
    in_stock:    document.getElementById('f-stock').value==='1',
    description: document.getElementById('f-desc').value,
    features:    document.getElementById('f-features').value.split(',').map(f=>f.trim()).filter(Boolean),
    images:      images.map(i=>i.url),
    specs,
};
}

    function previewProduct() { renderPreview(getFormData()); }
    function previewById(id) { const p=products.find(v=>v.id===id); if(p) renderPreview(p); }

    function renderPreview(p) {
    const imgs = p.images?.length ? p.images : (p.image?[p.image]:[]);
    const dsrcs = imgs.map(s => toDisplaySrc(s)); // конвертуємо для відображення
    document.getElementById('preview-content').innerHTML=`
    <div class="pv-single">
      <div>
        <div class="pv-gallery__main">
          ${dsrcs[0]
    ? `<img id="pv-main" src="${x(dsrcs[0])}" alt="${x(p.name)}" style="width:100%;height:100%;object-fit:cover">`
    : `<div class="pv-gallery__main-ph">🪵</div>`}
        </div>
        ${dsrcs.length>1?`<div class="pv-thumbs">${dsrcs.map((s,i)=>`
          <div class="pv-thumb ${i===0?'active':''}" onclick="pvThumb(this,'${x(s)}')">
            <img src="${x(s)}" alt="">
          </div>`).join('')}</div>`:''}
      </div>
      <div>
        <div class="pv-info__title">${x(p.name)}</div>
        <div class="pv-info__meta">
          <span class="pv-price">${n(p.price)} ₴</span>
          ${p.old_price?`<span class="pv-old-price">${n(p.old_price)} ₴</span>`:''}
          <span class="pv-status-badge">${p.in_stock?'В наявності':'Немає в наявності'}</span>
        </div>
        <hr class="pv-divider">
        <div class="pv-purchase">
          <div class="pv-qty">
            <button class="pv-qty-btn">−</button>
            <input class="pv-qty-input" type="number" value="1" min="1">
            <button class="pv-qty-btn">+</button>
          </div>
          <button class="pv-btn-buy">Купити в 1 клік</button>
          <button class="pv-btn-cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
            В кошик
          </button>
        </div>
        <hr class="pv-divider">
        ${p.description?`<div><div class="pv-desc-title">Опис</div><p class="pv-desc-text">${x(p.description)}</p></div>`:''}
        ${Object.keys(p.specs||{}).length?`
          <div class="pv-specs">
            <div class="pv-desc-title" style="margin-top:20px">Характеристики</div>
            <table class="pv-specs-table">${Object.entries(p.specs).map(([k,v])=>`
              <tr><td>${x(k)}</td><td>${x(v)}</td></tr>`).join('')}
            </table>
          </div>`:''}
        ${(p.features||[]).length?`
          <div class="pv-features">${p.features.map(f=>`<span class="pv-feature">✓ ${x(f)}</span>`).join('')}</div>`:''}
      </div>
    </div>`;
    document.getElementById('preview-overlay').classList.add('open');
    document.body.style.overflow='hidden';
}

    function pvThumb(el,src) {
    const m=document.getElementById('pv-main');
    if(m) m.src=src;
    document.querySelectorAll('.pv-thumb').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
}
    function closePreview() {
    document.getElementById('preview-overlay').classList.remove('open');
    document.body.style.overflow='';
}

    // ── ORDERS ───────────────────────────────
    const SL={new:'Нове',processing:'Обробляється',shipped:'Відправлено',done:'Виконано',cancelled:'Скасовано'};

    async function loadOrders() {
    try {
    const r=await req('get_orders',null,'GET',true);
    renderOrders(r.orders||[]);
} catch {}
}

    function renderOrders(orders) {
    const nc=orders.filter(o=>o.status==='new').length;
    document.getElementById('orders-sub').textContent=`${orders.length} замовлень · ${nc} нових`;
    const b=document.getElementById('orders-badge');
    b.textContent=nc||''; b.style.display=nc?'inline':'none';
    if (!orders.length) {
    document.getElementById('orders-content').innerHTML=
    `<div class="empty"><div class="empty__icon">🛒</div>Замовлень ще немає</div>`;
    return;
}
    document.getElementById('orders-content').innerHTML=orders.map(o=>`
    <div class="order-card">
      <div class="order-card__hdr">
        <div>
          <div class="order-id">#${x(o.id)}</div>
          <div class="order-name">${x(o.name)}</div>
          <div class="order-phone">${x(o.phone)}</div>
          ${o.message?`<div style="font-size:12px;color:var(--muted);margin-top:4px;max-width:420px">${x(o.message)}</div>`:''}
        </div>
        <span class="badge ${sc(o.status)}">${SL[o.status]||o.status}</span>
      </div>
      <div>${(o.cart||[]).map(i=>`<div class="order-item"><span>${x(i.name)} × ${i.qty}</span><span>${n(i.price*i.qty)} ₴</span></div>`).join('')}</div>
      <div class="order-total">Разом: ${n(o.total)} ₴</div>
      <div class="order-foot">
        <span class="order-date">${fd(o.date)}</span>
        <div style="display:flex;gap:10px;align-items:center">
          <select class="order-status-sel" onchange="updateOrder('${o.id}',this.value)">
            ${Object.entries(SL).map(([v,l])=>`<option value="${v}"${o.status===v?' selected':''}>${l}</option>`).join('')}
          </select>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteOrder('${o.id}')">Видалити</button>
        </div>
      </div>
    </div>`).join('');
}

    async function updateOrder(id,status) {
    try { await req('update_order',{id,status,token}); toast('Статус оновлено'); await loadOrders(); }
    catch(e){toast(e.message,'err');}
}
    function confirmDeleteOrder(id) {
    document.getElementById('confirm-title').textContent='Видалити замовлення?';
    document.getElementById('confirm-sub').textContent='Замовлення буде видалено назавжди.';
    document.getElementById('confirm-ok').onclick=()=>deleteOrder(id);
    document.getElementById('confirm-overlay').classList.add('open');
}
    async function deleteOrder(id) {
    closeConfirm();
    try { await req('delete_order',{id,token}); toast('Видалено'); await loadOrders(); }
    catch(e){toast(e.message,'err');}
}

    // ── API ───────────────────────────────────
    async function req(action, body=null, method='POST', withToken=false) {
    let url=API+'?action='+action;
    if(withToken&&token) url+='&token='+token;
    const opts={method};
    if(body){opts.headers={'Content-Type':'application/json'};opts.body=JSON.stringify(body);}
    const res=await fetch(url,opts);
    const data=await res.json();
    if(!data.ok) throw new Error(data.error||'Помилка сервера');
    return data;
}

    // ── MODAL HELPERS ─────────────────────────
    function openModal(id){document.getElementById(id).classList.add('open');}
    function closeModal(id){document.getElementById(id).classList.remove('open');}
    function closeOnOverlay(e,id){if(e.target===document.getElementById(id))closeModal(id);}
    function closeConfirm(){document.getElementById('confirm-overlay').classList.remove('open');}

    document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeModal('product-modal');closeConfirm();closePreview();}
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){
    if(document.getElementById('product-modal').classList.contains('open')) saveProduct();
}
});

    // ── UTILS ─────────────────────────────────
    function x(s=''){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
    function n(v){return Number(v||0).toLocaleString('uk-UA');}
    function fd(s){if(!s)return'—';const d=new Date(s);return isNaN(d)?s:d.toLocaleString('uk-UA',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}
    function sc(s){return{new:'status-new',processing:'status-processing',shipped:'status-shipped',done:'status-done',cancelled:'status-cancelled'}[s]||'';}

    let _tt;
    function toast(msg,type='ok'){
    const t=document.getElementById('wc-toast');
    t.textContent=msg; t.className=`wc-toast show ${type}`;
    clearTimeout(_tt); _tt=setTimeout(()=>t.className='wc-toast',3000);
}

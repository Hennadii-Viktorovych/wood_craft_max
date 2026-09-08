document.addEventListener('DOMContentLoaded', async () => {
    const titleEl = document.querySelector('.product-info__title');
    if (!titleEl) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    let products = [];

    // 1. Пробуємо отримати дані через admin.php (якщо працює PHP-сервер)
    const adminPaths = [
        '../admin/admin.php?action=get_products',
        './admin/admin.php?action=get_products',
        '/wood_craft_max/admin/admin.php?action=get_products'
    ];

    for (const path of adminPaths) {
        try {
            const res = await fetch(path);
            if (res.ok) {
                const data = await res.json();
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    products = Object.values(data);
                } else if (Array.isArray(data)) {
                    products = data;
                } else if (data.products && Array.isArray(data.products)) {
                    products = data.products;
                }
                if (products.length > 0) break;
            }
        } catch (e) {}
    }

    // 2. Якщо через адмінку не вийшло (GitHub Pages), читаємо напряму з json/product.json
    if (products.length === 0) {
        const jsonPaths = [
            '../json/product.json',
            './json/product.json',
            '/wood_craft_max/json/product.json'
        ];

        for (const path of jsonPaths) {
            try {
                const res = await fetch(path);
                if (res.ok) {
                    const data = await res.json();

                    if (data && typeof data === 'object' && !Array.isArray(data)) {
                        products = Object.values(data);
                    } else if (Array.isArray(data)) {
                        products = data;
                    } else if (data.products && Array.isArray(data.products)) {
                        products = data.products;
                    } else if (data.data && Array.isArray(data.data)) {
                        products = data.data;
                    }

                    if (products.length > 0) break;
                }
            } catch (err) {}
        }
    }

    let product = null;
    if (products.length > 0) {
        if (productId) {
            const cleanId = productId.trim();
            product = products.find(p => String(p.id).trim() === cleanId) ||
                products.find(p => String(p.id).includes(cleanId) || cleanId.includes(String(p.id)));
        }
        if (!product) {
            product = products[0];
        }
    }

    if (!product) {
        const placeholder = document.getElementById('gallery-placeholder');
        if (placeholder) placeholder.textContent = 'Товар не знайдено в базі даних';
        return;
    }

    // 3. Заповнюємо інформацію про товар
    titleEl.textContent = product.name || 'Без назви';

    const priceEl = document.querySelector('.product-info__price');
    if (priceEl) priceEl.textContent = `${product.price || 0} ₴`;

    const statusEl = document.querySelector('.product-info__status');
    if (statusEl) {
        statusEl.textContent = product.in_stock !== false ? 'В наявності' : 'Немає в наявності';
    }

    const descTextEl = document.querySelector('.product-description__text');
    if (descTextEl) {
        descTextEl.innerHTML = product.description ? product.description.replace(/\n/g, '<br>') : 'Опис відсутній.';
    }

    // 4. Характеристики
    const specTable = document.querySelector('.characteristics-table') || document.querySelector('.product-specs');
    if (product.specs && typeof product.specs === 'object' && Object.keys(product.specs).length > 0) {
        let specsHtml = '';
        for (const [key, value] of Object.entries(product.specs)) {
            specsHtml += `
                <div class="product-char-row" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: #7a7060;">${key}</span>
                    <span style="color: #e8e0d4; font-weight: 500;">${value}</span>
                </div>`;
        }
        if (specTable) {
            specTable.innerHTML = specsHtml;
        } else {
            const descBlock = document.querySelector('.product-description');
            if (descBlock && !document.querySelector('.dynamic-specs')) {
                descBlock.insertAdjacentHTML('afterend', `<div class="dynamic-specs" style="margin-top: 20px;"><h3 style="margin-bottom: 10px; font-size: 16px; color: #c8a96e;">Характеристики</h3>${specsHtml}</div>`);
            }
        }
    }

    // 5. Зображення
    let images = [];
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        images = product.images;
    } else if (product.image) {
        images = [product.image];
    } else {
        images = ['./images/placeholder.png'];
    }

    images = images.map(img => {
        if (img.startsWith('http')) return img;
        return img.replace(/^\.\//, '').replace(/^\//, '');
    });

    const mainPlaceholder = document.getElementById('gallery-placeholder');
    const thumbsContainer = document.getElementById('gallery-thumbs');

    if (mainPlaceholder) {
        mainPlaceholder.outerHTML = `
            <div class="product-gallery__main-image-wrap" style="width: 100%; height: 450px; overflow: hidden; border-radius: 12px; background: #1d1a17;">
                <img id="main-product-img" src="${images[0]}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
            </div>
        `;
    }

    if (thumbsContainer && images.length > 1) {
        thumbsContainer.innerHTML = images.map((img, idx) => `
            <div class="product-thumb ${idx === 0 ? 'active' : ''}" onclick="changeMainImage('${img}', this)" style="width: 70px; height: 70px; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid ${idx === 0 ? '#c8a96e' : 'transparent'}; display: inline-block; margin-right: 10px; margin-top: 10px;">
                <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
        `).join('');
    } else if (thumbsContainer) {
        thumbsContainer.innerHTML = '';
    }

    // 6. Додавання в кошик без примусового редіректу (підтримка бічної панелі)
    const qtyInput = document.querySelector('.product-qty__input');
    const minusBtn = document.querySelector('.product-qty__btn--minus');
    const plusBtn = document.querySelector('.product-qty__btn--plus');
    const cartBtn = document.querySelector('.product-actions__btn--cart') || document.querySelector('.btn-cart');

    if (minusBtn && qtyInput) {
        minusBtn.onclick = () => {
            let val = parseInt(qtyInput.value) || 1;
            if (val > 1) qtyInput.value = val - 1;
        };
    }

    if (plusBtn && qtyInput) {
        plusBtn.onclick = () => {
            let val = parseInt(qtyInput.value) || 1;
            qtyInput.value = val + 1;
        };
    }

    if (cartBtn) {
        cartBtn.onclick = (e) => {
            e.preventDefault();
            const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            let existing = cart.find(item => String(item.id) === String(product.id));

            if (existing) {
                existing.quantity += quantity;
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: images[0],
                    quantity: quantity,
                    specs: product.specs || {}
                });
            }
            localStorage.setItem('cart', JSON.stringify(cart));

            // Якщо на сторінці підключено функцію рендерингу/відкриття бічної панелі кошика — викликаємо її
            if (typeof window.openCartSidebar === 'function') {
                window.openCartSidebar();
            } else if (typeof window.renderCart === 'function') {
                window.renderCart();
            } else {
                alert('Товар успішно додано до кошика!');
            }
        };
    }
});

function changeMainImage(src, el) {
    const mainImg = document.getElementById('main-product-img');
    if (mainImg) mainImg.src = src;

    document.querySelectorAll('.product-thumb').forEach(t => t.style.borderColor = 'transparent');
    if (el) el.style.borderColor = '#c8a96e';
}
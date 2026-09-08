document.addEventListener('DOMContentLoaded', async () => {
    const catalogGrid = document.querySelector('.catalog__grid');
    if (!catalogGrid) return;

    try {
        const response = await fetch('admin.php?action=get_products');
        const data = await response.json();

        if (data.ok && Array.isArray(data.products) && data.products.length > 0) {
            catalogGrid.innerHTML = '';

            data.products.forEach(product => {
                let imgUrl = './images/placeholder.png';
                if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                    imgUrl = product.images[0];
                } else if (product.image) {
                    imgUrl = product.image;
                }
                imgUrl = imgUrl.startsWith('http') ? imgUrl : imgUrl.replace(/^\.\//, '');

                const inStock = product.in_stock !== false;
                const productUrl = `product.html?id=${product.id}`;

                const card = document.createElement('div');
                card.className = 'catalog__card';
                card.setAttribute('data-id', product.id);

                card.innerHTML = `
                    <a href="${productUrl}" class="card__img-wrap" style="display: block; width: 100%; height: 260px; overflow: hidden; background: #1d1a17; border-radius: 8px; margin-bottom: 15px;">
                        <img src="${imgUrl}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                    </a>
                    <div class="card__info">
                        <h3 class="card__title">
                            <a href="${productUrl}" style="color: inherit; text-decoration: none;">${product.name}</a>
                        </h3>
                        <p class="card__price">${product.price || 0} ₴</p>
                        <p class="card__status" style="font-size: 12px; color: ${inStock ? '#78a75a' : '#a75a5a'}; margin-bottom: 10px;">
                            ${inStock ? 'В наявності' : 'Немає в наявності'}
                        </p>
                        <div style="display: flex; gap: 10px;">
                            <a href="${productUrl}" class="card__btn" style="flex: 1; text-align: center; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;">Детальніше</a>
                            <button class="card__btn card__btn--cart" aria-label="Додати до кошика" onclick="quickAddToCart('${product.id}', '${encodeURIComponent(product.name)}', ${product.price}, '${imgUrl}')">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
                catalogGrid.appendChild(card);
            });
        } else {
            catalogGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #7a7060;">Наразі товари відсутні в каталозі.</p>';
        }
    } catch (e) {
        console.error("Помилка завантаження каталогу:", e);
        catalogGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #a75a5a;">Не вдалося завантажити товари.</p>';
    }
});

function quickAddToCart(id, nameEncoded, price, image) {
    const name = decodeURIComponent(nameEncoded);
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let existing = cart.find(item => String(item.id) === String(id));

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id, name, price, image, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Товар успішно додано до кошика!');
}
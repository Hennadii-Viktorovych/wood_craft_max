document.addEventListener('DOMContentLoaded', () => {

    // Чекаємо повного завантаження сторінки
    window.addEventListener('load', () => {
        const preloader = document.getElementById('preloader');

        if (preloader) {
            // 👈 ДОДАЄМО ШТУЧНУ ЗАДРИМКУ НА 1500 мілісекунд (1.5 секунди)
            setTimeout(() => {
                preloader.classList.add('preloader--hidden');
            }, 1500);
        }
    });


    // ==========================================================================
    // 1. КІНЕМАТОГРАФІЧНИЙ ПЕРЕХІД МІЖ СТОРІНКАМИ (Page Fade Effect)
    // ==========================================================================
    // При завантаженні сторінки плавно прибираємо темну вуаль
    document.body.classList.add('page-loaded');

    // Шукаємо посилання на інші сторінки (ігноруємо якірні посилання #)
    const pageLinks = document.querySelectorAll('a:not([href^="#"]):not([target="_blank"])');

    pageLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetUrl = this.getAttribute('href');
            if (!targetUrl || targetUrl === '') return;

            e.preventDefault(); // Зупиняємо миттєвий перехід
            document.body.classList.remove('page-loaded'); // Повертаємо темряву

            // Чекаємо 0.4 секунди, поки закінчиться анімація гасіння, і переходимо
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 400);
        });
    });

    // ==========================================================================
    // 2. ПЛАВНИЙ ЯКІРНИЙ СКРОЛЛ (Smooth Scroll)
    // ==========================================================================
    const smoothLinks = document.querySelectorAll('a[href^="#"]');
    smoothLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const id = this.getAttribute('href');
            if (id === '#') return;

            const targetElement = document.querySelector(id);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ==========================================================================
    // 3. ЗАЦИКЛЕНА АНІМАЦІЯ ПОЯВИ ПРИ СКРОЛІ (Infinite Scroll Reveal)
    // ==========================================================================
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 // Спрацьовує швидше, коли краєчок блоку заходить на екран
    };

    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Блок у полі зору — вмикаємо анімацію
                entry.target.classList.add('reveal--visible');
            } else {
                // Блок вийшов за межі екрана — 👈 ХОВАЄМО НАЗАД ДЛЯ ЗАЦИКЛЕНОСТІ
                entry.target.classList.remove('reveal--visible');
            }
        });
    }, observerOptions);

    const elementsToAnimate = document.querySelectorAll('.reveal');
    elementsToAnimate.forEach(el => scrollObserver.observe(el));
});



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


document.addEventListener('DOMContentLoaded', () => {
    const slides = [
        {
            title: "Кулінарія це мистецтво. Наші дошки його полотно.",
            text: "Забудьте про бездушний пластик. Ми створюємо унікальні дерев'яні витвори, які живуть на кухні роками, збирають навколо себе найрідніших і зберігають історії ваших найкращих вечорів.",
            btnText: "Дізнатись більше",
            btnLink: "catalog.html"
        },
        {
            title: "Дошки з характером. Для тих, хто готує з пристрастю.",
            text: "Ручна робота з живого масиву дерева, що перетворює щоденну рутину на ресторанну естетику. Відчуйте тепло натурального ремесла у кожному дотику.",
            btnText: "Переглянути каталог",
            btnLink: "catalog.html"
        },
        {
            title: "Створюйте моменти, які хочеться смакувати.",
            text: "Авторські дошки для подачі та нарізки, з якими навіть звичайна сирна тарілка виглядає як шедевр. Унікальний природний візерунок у кожному виробі.",
            btnText: "Обрати свою дошку",
            btnLink: "catalog.html"
        }
    ];

    let currentIndex = 0;

    const heroContent = document.querySelector('.hero__content');
    const heroTitle = document.querySelector('.hero__title');
    const heroText = document.querySelector('.hero__text');
    const heroBtn = document.querySelector('.btn--hero');

    if (!heroContent || !heroTitle || !heroText || !heroBtn) return;

    function changeSlide() {
        heroContent.classList.add('hero__content--fade');

        setTimeout(() => {
            currentIndex = (currentIndex + 1) % slides.length;

            heroTitle.textContent = slides[currentIndex].title;
            heroText.textContent = slides[currentIndex].text;
            heroBtn.textContent = slides[currentIndex].btnText;
            heroBtn.setAttribute('href', slides[currentIndex].btnLink);

            heroContent.classList.remove('hero__content--fade');
        }, 800); // 800 мс — відповідає тривалості transition у CSS
    }

    // 9000 мс = 9 секунд експозиції для комфортного читання
    setInterval(changeSlide, 9000);
});
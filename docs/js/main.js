document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const mainContent = document.querySelector('.main-content');
    const contentSections = document.querySelectorAll('.content-section');
    const navbar = document.querySelector('.navbar');
    
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        this.classList.toggle('active');

        const icon = this.querySelector('i');
        if (sidebar.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                if (sidebarToggle.classList.contains('active')) {
                    sidebarToggle.classList.remove('active');
                    const icon = sidebarToggle.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    });

    function highlightActiveSection() {
        const scrollY = window.scrollY;

        contentSections.forEach(section => {
            const sectionTop = section.offsetTop - navbar.offsetHeight - 20;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                sidebarLinks.forEach(link => {
                    link.classList.remove('active');
                });

                const activeLink = document.querySelector(`.sidebar-link[href="#${sectionId}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');

                    const parentItem = activeLink.closest('.sidebar-sublist')?.closest('.sidebar-item');
                    if (parentItem) {
                        const parentLink = parentItem.querySelector('.sidebar-link');
                        parentLink.classList.add('active');
                    }
                }
            }
        });
    }

    const applyActiveStyles = () => {
        sidebarLinks.forEach(link => {
            if (link.classList.contains('active')) {
                link.style.backgroundColor = 'var(--color-gray)';
                link.style.color = 'var(--color-primary)';
                link.style.borderRight = '3px solid var(--color-primary)';
            } else {
                link.style.backgroundColor = '';
                link.style.color = '';
                link.style.borderRight = '';
            }
        });
    };

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            if (targetId) {
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - navbar.offsetHeight,
                        behavior: 'smooth'
                    });
                    history.pushState(null, null, `#${targetId}`);
                }
            }
        });
    });

    const sidebarItemsWithChildren = document.querySelectorAll('.sidebar-item');
    sidebarItemsWithChildren.forEach(item => {
        const link = item.querySelector('.sidebar-link');
        const sublist = item.querySelector('.sidebar-sublist');
        
        if (sublist) {
            link.innerHTML += '<span class="toggle-icon"><i class="fas fa-chevron-down"></i></span>';

            sublist.style.display = 'none';
            
            link.addEventListener('click', function(e) {
                if (e.target === link || e.target.closest('.toggle-icon')) {
                    e.preventDefault();

                    if (sublist.style.display === 'none') {
                        sublist.style.display = 'block';
                        this.querySelector('.fas').classList.replace('fa-chevron-down', 'fa-chevron-up');
                    } else {
                        sublist.style.display = 'none';
                        this.querySelector('.fas').classList.replace('fa-chevron-up', 'fa-chevron-down');
                    }
                }
            });
        }
    });

    document.querySelectorAll('pre').forEach(block => {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
        copyButton.title = 'Copy to clipboard';

        copyButton.style.position = 'absolute';
        copyButton.style.right = '10px';
        copyButton.style.top = '10px';
        copyButton.style.background = 'rgba(255, 255, 255, 0.1)';
        copyButton.style.border = 'none';
        copyButton.style.borderRadius = '4px';
        copyButton.style.padding = '5px 10px';
        copyButton.style.color = 'white';
        copyButton.style.cursor = 'pointer';
        copyButton.style.transition = 'background 0.3s';

        block.style.position = 'relative';

        copyButton.addEventListener('mouseover', () => {
            copyButton.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        
        copyButton.addEventListener('mouseout', () => {
            copyButton.style.background = 'rgba(255, 255, 255, 0.1)';
        });

        copyButton.addEventListener('click', () => {
            const code = block.textContent;
            navigator.clipboard.writeText(code).then(() => {
                copyButton.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            });
        });
        block.appendChild(copyButton);
    });
    
    const backToTopButton = document.createElement('button');
    backToTopButton.id = 'back-to-top';
    backToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTopButton.title = 'Back to top';
    document.body.appendChild(backToTopButton);

    backToTopButton.style.position = 'fixed';
    backToTopButton.style.bottom = '20px';
    backToTopButton.style.right = '20px';
    backToTopButton.style.backgroundColor = 'var(--color-primary)';
    backToTopButton.style.color = 'white';
    backToTopButton.style.border = 'none';
    backToTopButton.style.borderRadius = '50%';
    backToTopButton.style.width = '50px';
    backToTopButton.style.height = '50px';
    backToTopButton.style.display = 'flex';
    backToTopButton.style.alignItems = 'center';
    backToTopButton.style.justifyContent = 'center';
    backToTopButton.style.cursor = 'pointer';
    backToTopButton.style.boxShadow = 'var(--shadow-md)';
    backToTopButton.style.opacity = '0';
    backToTopButton.style.transition = 'opacity 0.3s, transform 0.3s';

    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTopButton.style.opacity = '1';
            backToTopButton.style.transform = 'translateY(0)';
        } else {
            backToTopButton.style.opacity = '0';
            backToTopButton.style.transform = 'translateY(20px)';
        }
    });

    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    const themeToggle = document.createElement('button');
    themeToggle.id = 'theme-toggle';
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    themeToggle.title = 'Toggle dark/light mode';
    document.body.appendChild(themeToggle);

    themeToggle.style.position = 'fixed';
    themeToggle.style.bottom = '20px';
    themeToggle.style.left = '20px';
    themeToggle.style.backgroundColor = 'var(--color-primary)';
    themeToggle.style.color = 'white';
    themeToggle.style.border = 'none';
    themeToggle.style.borderRadius = '50%';
    themeToggle.style.width = '50px';
    themeToggle.style.height = '50px';
    themeToggle.style.display = 'flex';
    themeToggle.style.alignItems = 'center';
    themeToggle.style.justifyContent = 'center';
    themeToggle.style.cursor = 'pointer';
    themeToggle.style.boxShadow = 'var(--shadow-md)';
    themeToggle.style.zIndex = '900';

    const lightModeStyle = document.createElement('style');
    document.head.appendChild(lightModeStyle);
    lightModeStyle.textContent = `
        .light-mode {
            --color-black: #f8f9fa;
            --color-dark-gray: #ffffff;
            --color-gray: #e9ecef;
            --color-light-gray: #343a40;
            --color-text: #212529;
        }
        
        .light-mode .hero-section {
            color: #fff;
        }
        
        .light-mode .hero-section .hero-text p {
            color: rgba(255, 255, 255, 0.9);
        }
        
        .light-mode .content-section {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .light-mode table th {
            background-color: var(--color-primary);
            color: white;
        }
        
        .light-mode code {
            background-color: #e9ecef;
            color: var(--color-primary-dark);
        }
        
        .light-mode .warning-box,
        .light-mode .note-box {
            background-color: rgba(255, 255, 255, 0.5);
        }
    `;

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        
        if (document.body.classList.contains('light-mode')) {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        } else {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        }
    });
    
    highlightActiveSection();
    applyActiveStyles();
    window.addEventListener('scroll', debounce(function() {
        highlightActiveSection();
        applyActiveStyles();
    }, 100));
    
    if (window.location.hash) {
        setTimeout(() => {
            const id = window.location.hash.substring(1);
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest'
                });
                window.scrollBy(0, -navbar.offsetHeight - 10);
            }
        }, 500);
    }

    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
});

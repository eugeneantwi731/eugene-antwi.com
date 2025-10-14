const navbar = document.getElementById('navbar');
const exploreButton = document.getElementById('explore-button');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const typingText = document.getElementById('typing-text');

function debounce(func, wait = 20, immediate = true) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

document.getElementById('explore-button').addEventListener('click', function() {
    const arrow = this.querySelector('.arrow');
    arrow.style.transform = 'translateX(10px)';
    setTimeout(() => {
        arrow.style.transform = 'translateX(0)';
    }, 200);
});

const handleScroll = debounce(() => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

document.addEventListener('scroll', handleScroll);

exploreButton.addEventListener('click', function() {
    this.classList.add('active');
    setTimeout(() => this.classList.remove('active'), 200);
});

function toggleMenu() {
    navLinks.classList.toggle('open');
    hamburger.classList.toggle('active');
}

hamburger.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleMenu();
});

document.addEventListener('click', (event) => {
    const isClickInsideMenu = navLinks.contains(event.target);
    const isClickOnHamburger = hamburger.contains(event.target);
    
    if (!isClickInsideMenu && !isClickOnHamburger && navLinks.classList.contains('open')) {
        toggleMenu();
    }
});

navLinks.addEventListener('click', (event) => event.stopPropagation());

const textArray = [
    { text: "TECHNICAL ARTIST:", bold: true },
    { text: "ANIMATOR & COMPOSITOR", bold: false },
    { text: "LOOK DEVELOPMENT SPECIALIST", bold: false },
    { text: "CG ARTIST", bold: false },
    { text: "GRAPHIC DESIGNER", bold: false },
    { text: "UI/UX DESIGNER", bold: false },
    { text: "CREATIVE FRONTEND DEVELOPER", bold: false },
    { text: "VOICE ACTOR", bold: false },
    { text: "CREATIVE DESKTOP SUPPORT", bold: false },
    { text: "TUTOR & MENTOR", bold: false }
];

const typingSpeed = 100;
const displayDuration = 2000;
let currentIndex = 0;
let currentText = '';
let isDeleting = false;

function type() {
    const { text, bold } = textArray[currentIndex % textArray.length];

    if (isDeleting) {
        currentText = '';
    } else {
        currentText = text.substring(0, currentText.length + 1);
    }

    typingText.innerHTML = bold ? `<span class="bold">${currentText}</span>` : currentText;

    const typeSpeed = isDeleting ? typingSpeed / 2 : typingSpeed;

    if (!isDeleting && currentText === text) {
        setTimeout(() => {
            isDeleting = true;
            currentIndex++;
            type();
        }, displayDuration);
        return;
    } else if (isDeleting && currentText === '') {
        isDeleting = false;
    }

    setTimeout(type, typeSpeed);
}

document.addEventListener('DOMContentLoaded', type);

document.addEventListener("DOMContentLoaded", function() {
    const navbar = document.getElementById('navbar');
    const logoWhite = document.querySelector('.logo-icon-white');
    const logoBlack = document.querySelector('.logo-icon-black');
    const navLinks = document.querySelectorAll('#navbar .nav-links a');

    function handleScroll() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
            logoWhite.style.display = 'none';
            logoBlack.style.display = 'block';
            navLinks.forEach(link => {
                link.style.color = 'black';
            });
        } else {
            navbar.classList.remove('scrolled');
            logoWhite.style.display = 'block';
            logoBlack.style.display = 'none';
            navLinks.forEach(link => {
                link.style.color = 'white';
            });
        }
    }

    document.addEventListener('scroll', handleScroll);

    // Call handleScroll once to set the initial state
    handleScroll();
});

document.querySelector('.scroll-indicator-link').addEventListener('click', function(e) {
    e.preventDefault();
    const aboutSection = document.querySelector('#about');
    aboutSection.scrollIntoView({ behavior: 'smooth' });
});

// Existing scroll event listener
window.addEventListener('scroll', function() {
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (window.scrollY > 100) { // Adjust this value as needed
        scrollIndicator.style.opacity = '0';
    } else {
        scrollIndicator.style.opacity = '1';
    }
});

// About Section

document.addEventListener('DOMContentLoaded', function() {
    const skills = document.querySelectorAll('.skills li');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.5 });

    skills.forEach(skill => {
        skill.style.opacity = 0;
        skill.style.transform = 'translateY(20px)';
        skill.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(skill);
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const skillsSection = document.querySelector('.skills');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                skillsSection.classList.add('animate');
            }
        });
    }, { threshold: 0.5 });

    observer.observe(skillsSection);
});

document.addEventListener('DOMContentLoaded', function() {
    const slideshows = document.querySelectorAll('.portfolio-slideshow');
    
    slideshows.forEach(slideshow => {
        const images = slideshow.querySelectorAll('img');
        let currentIndex = 0;

        function showNextImage() {
            images[currentIndex].style.opacity = '0';
            currentIndex = (currentIndex + 1) % images.length;
            images[currentIndex].style.opacity = '1';
        }

        // Show the first image
        images[0].style.opacity = '1';

        // Change image every 5 seconds
        setInterval(showNextImage, 5000);
    });
});


// Scroll-triggering for Fade-in Elements
document.addEventListener("DOMContentLoaded", function() {
    const elements = document.querySelectorAll('.fade-in');
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(element => {
        observer.observe(element);
    });
});

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

//Skill list Animation
document.addEventListener("DOMContentLoaded", function() {
    const skills = document.querySelectorAll('.skill-pill');
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                skills.forEach((skill, index) => {
                    setTimeout(() => {
                        skill.classList.add('visible');
                    }, index * 200); // Delay each skill by 200ms
                });
                observer.unobserve(entry.target); // Unobserve once it's loaded
            }
        });
    }, { threshold: 0.5 });

    const skillsSection = document.querySelector('.skills-list');
    observer.observe(skillsSection);
});

//Language Bar Load
document.addEventListener("DOMContentLoaded", function() {
    const languageBars = document.querySelectorAll('.language-progress');

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Get the width from the data attribute and animate the bar
                const targetWidth = entry.target.getAttribute('data-width');
                entry.target.style.width = targetWidth;

                // Stop observing once the animation has been triggered
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    // Observe each language progress bar
    languageBars.forEach(bar => {
        observer.observe(bar);
    });
});

// js/scripts.js

document.addEventListener('DOMContentLoaded', function() {
    // --- Hamburger menu functionality ---
    const hamburger = document.querySelector('.hamburger');
    const navContainer = document.querySelector('.nav-container');

    if (hamburger && navContainer) {
        hamburger.addEventListener('click', function() {
            navContainer.classList.toggle('nav-active');
            hamburger.classList.toggle('active'); // For animating hamburger to an 'X'
        });
    }

    // Close mobile menu when a link is clicked
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (navContainer.classList.contains('nav-active')) {
                navContainer.classList.remove('nav-active');
                hamburger.classList.remove('active');
            }
        });
    });

    // --- Header Scroll Behavior ---
    const navbar = document.getElementById('navbar');

    function handleScroll() {
        if (window.scrollY > 50) { // Adjust this value (e.g., 50px) based on when you want the header to change
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    // Attach scroll event listener
    window.addEventListener('scroll', handleScroll);
    // Call on load to set initial state in case user refreshes part-way down
    handleScroll();


    // --- Scroll Bar Visibility (from your index.html) ---
    let activityTimeout;

    function showScrollControls() {
        document.body.classList.remove('scroll-hidden');
        document.body.classList.add('scroll-visible');
        clearTimeout(activityTimeout);
        activityTimeout = setTimeout(() => {
            document.body.classList.remove('scroll-visible');
            document.body.classList.add('scroll-hidden');
        }, 5000); // 5 seconds of inactivity
    }

    function userIsActive() {
        showScrollControls();
    }

    window.addEventListener('scroll', userIsActive);
    window.addEventListener('mousemove', userIsActive);
    window.addEventListener('keydown', userIsActive);
    showScrollControls(); // Initialize on page load
});

/* __HOME_DETECT_AND_MENU_BEHAVIOR__ */
document.addEventListener('DOMContentLoaded', function() {
    try {
        const navbar = document.getElementById('navbar');
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        const isHome = !!document.getElementById('hero');

        if (isHome) {
            document.body.classList.add('is-home');
        }

        if (hamburger && navLinks) {
            function toggleMenu() {
                navLinks.classList.toggle('open');
                hamburger.classList.toggle('active');

                const atTop = window.scrollY <= 50;
                const menuOpen = navLinks.classList.contains('open');

                // If we're on home and at top, opening the menu should make the navbar solid white
                if (isHome) {
                    if (menuOpen && atTop) {
                        navbar.classList.add('scrolled'); // triggers white bg & dark text via CSS
                    } else if (!menuOpen && atTop) {
                        // Revert to transparent
                        navbar.classList.remove('scrolled');
                    }
                }
            }

            hamburger.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleMenu();
            });

            // Close menu when clicking outside
            document.addEventListener('click', (event) => {
                const isClickInsideMenu = navLinks.contains(event.target);
                const isClickOnHamburger = hamburger.contains(event.target);
                if (!isClickInsideMenu && !isClickOnHamburger && navLinks.classList.contains('open')) {
                    navLinks.classList.remove('open');
                    hamburger.classList.remove('active');
                    // If at top on home, return to transparent
                    if (isHome && window.scrollY <= 50) {
                        navbar.classList.remove('scrolled');
                    }
                }
            });
        }

        // On scroll, keep original behavior (scripts.js already handles colors),
        // but ensure that when at top and menu closed on home, we remove scrolled.
        const onScrollAdjust = function() {
            if (isHome && window.scrollY <= 50) {
                const navLinks = document.querySelector('.nav-links');
                if (navLinks && !navLinks.classList.contains('open')) {
                    navbar.classList.remove('scrolled');
                }
            }
        };
        window.addEventListener('scroll', onScrollAdjust, { passive: true });
    } catch (e) {
        console.error('home mobile behavior error:', e);
    }
});
/* __END_HOME_DETECT_AND_MENU_BEHAVIOR__ */

/* __CLOSE_MENU_ON_SCROLL_IMPROVED__ */
document.addEventListener('DOMContentLoaded', function() {
    try {
        const navbar = document.getElementById('navbar');
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        if (!navbar || !hamburger || !navLinks) return;
        
        let menuOpenedAtY = 0;
        let menuJustOpenedAt = 0;

        function isMenuOpen() { return navLinks.classList.contains('open'); }

        // Hook into existing toggle (if any)
        const origToggle = typeof toggleMenu === 'function' ? toggleMenu : null;
        function safeToggle() {
            if (origToggle) { origToggle(); }
            else {
                navLinks.classList.toggle('open');
                hamburger.classList.toggle('active');
            }
            if (isMenuOpen()) {
                menuOpenedAtY = window.scrollY;
                menuJustOpenedAt = Date.now();
            }
        }

        // Rebind hamburger to our safe toggle
        hamburger.addEventListener('click', (e) => {
            // avoid double toggles: let existing click run first, then patch states
            setTimeout(() => {
                if (isMenuOpen()) {
                    menuOpenedAtY = window.scrollY;
                    menuJustOpenedAt = Date.now();
                }
            }, 0);
        }, { capture: true });

        window.addEventListener('scroll', function() {
            if (!isMenuOpen()) return;
            const now = Date.now();
            if (now - menuJustOpenedAt < 400) return; // ignore initial layout scroll
            if (Math.abs(window.scrollY - menuOpenedAtY) > 30) {
                navLinks.classList.remove('open');
                hamburger.classList.remove('active');
            }
        }, { passive: true });
    } catch (e) {
        console.error('improved close-on-scroll error:', e);
    }
});
/* __END_CLOSE_MENU_ON_SCROLL_IMPROVED__ */

/* __MOBILE_MENU_TEXT_FIX__ */
document.addEventListener('DOMContentLoaded', function() {
  try {
    const navbar = document.getElementById('navbar');
    const logoWhite = document.querySelector('.logo-icon-white');
    const logoBlack = document.querySelector('.logo-icon-black');
    const hamburger = document.querySelector('.hamburger');
    const linksBox = document.querySelector('.nav-links');
    const linkEls = document.querySelectorAll('#navbar .nav-links a');
    const isHome = !!document.getElementById('hero');

    if (!navbar || !linksBox || !isHome) return;

    function forceMobileDark() {
      // On small screens, keep header 'scrolled' and links black ALWAYS
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile) {
        navbar.classList.add('scrolled');
        if (logoWhite && logoBlack) {
          logoWhite.style.display = 'none';
          logoBlack.style.display = 'block';
        }
        linkEls.forEach(a => a.style.color = 'black');
        return true;
      }
      return false;
    }

    function applyHeaderState() {
      if (forceMobileDark()) return;

      const menuOpen = linksBox.classList.contains('open');
      if (window.scrollY > 50 || menuOpen) {
        navbar.classList.add('scrolled');
        if (logoWhite && logoBlack) {
          logoWhite.style.display = 'none';
          logoBlack.style.display = 'block';
        }
        linkEls.forEach(a => a.style.color = 'black');
      } else {
        navbar.classList.remove('scrolled');
        if (logoWhite && logoBlack) {
          logoWhite.style.display = 'block';
          logoBlack.style.display = 'none';
        }
        linkEls.forEach(a => a.style.color = 'white');
      }
    }

    document.addEventListener('scroll', applyHeaderState, { passive: true });
    window.addEventListener('resize', applyHeaderState);

    if (hamburger) {
      hamburger.addEventListener('click', function() {
        setTimeout(applyHeaderState, 0);
      });
    }

    // Initial state on load
    applyHeaderState();
  } catch (e) {
    console.error('MOBILE_MENU_TEXT_FIX error:', e);
  }
});
/* __END_MOBILE_MENU_TEXT_FIX__ */

// Services Carousel JavaScript

class ServicesCarousel {
    constructor() {
        this.carousel = document.querySelector('.services-carousel');
        this.items = document.querySelectorAll('.service-item');
        this.wrapper = document.querySelector('.carousel-wrapper');
        this.indicatorsContainer = document.querySelector('.carousel-indicators');
        
        // Configuration
        this.currentIndex = 0;
        this.itemsToShow = this.getItemsToShow();
        this.itemWidth = this.getItemWidth();
        this.totalItems = this.items.length;
        this.maxIndex = Math.max(0, this.totalItems - this.itemsToShow);
        
        // Auto-play configuration
        this.autoPlayInterval = 5000; // 5 seconds
        this.autoPlayTimer = null;
        this.isAutoPlaying = true;
        
        this.init();
    }

    init() {
        if (!this.carousel || !this.items.length) {
            console.warn('Services carousel elements not found');
            return;
        }

        this.createControls();
        this.createIndicators();
        this.setupEventListeners();
        this.updateCarousel();
        this.startAutoPlay();
    }

    getItemsToShow() {
        const width = window.innerWidth;
        if (width < 480) return 1;
        if (width < 768) return 1;
        if (width < 1024) return 2;
        return 3;
    }

    getItemWidth() {
        const width = window.innerWidth;
        if (width < 480) return 275; // 260px + 15px margin
        if (width < 768) return 300; // 280px + 20px margin
        if (width < 1024) return 275; // 250px + 25px margin
        return 310; // 280px + 30px margin
    }

    createControls() {
        // Create previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-controls prev-btn';
        prevBtn.setAttribute('aria-label', 'Previous services');
        
        // Create next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-controls next-btn';
        nextBtn.setAttribute('aria-label', 'Next services');
        
        // Add to wrapper
        this.wrapper.appendChild(prevBtn);
        this.wrapper.appendChild(nextBtn);
        
        // Store references
        this.prevBtn = prevBtn;
        this.nextBtn = nextBtn;
    }

    createIndicators() {
        if (!this.indicatorsContainer) return;

        // Clear existing indicators
        this.indicatorsContainer.innerHTML = '';
        
        // Calculate number of indicators needed
        const indicatorCount = this.maxIndex + 1;
        
        for (let i = 0; i < indicatorCount; i++) {
            const indicator = document.createElement('button');
            indicator.className = 'carousel-indicator';
            indicator.setAttribute('aria-label', `Go to slide ${i + 1}`);
            indicator.addEventListener('click', () => this.goToSlide(i));
            this.indicatorsContainer.appendChild(indicator);
        }
        
        this.indicators = this.indicatorsContainer.querySelectorAll('.carousel-indicator');
    }

    setupEventListeners() {
        // Control buttons
        this.prevBtn.addEventListener('click', () => this.prevSlide());
        this.nextBtn.addEventListener('click', () => this.nextSlide());
        
        // Keyboard navigation
        this.wrapper.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.prevSlide();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextSlide();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToSlide(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToSlide(this.maxIndex);
                    break;
            }
        });

        // Touch/swipe support
        this.setupTouchEvents();
        
        // Pause auto-play on hover
        this.wrapper.addEventListener('mouseenter', () => this.stopAutoPlay());
        this.wrapper.addEventListener('mouseleave', () => this.startAutoPlay());
        
        // Pause auto-play on focus
        this.wrapper.addEventListener('focusin', () => this.stopAutoPlay());
        this.wrapper.addEventListener('focusout', () => this.startAutoPlay());
        
        // Handle resize
        window.addEventListener('resize', this.debounce(() => this.handleResize(), 250));
    }

    setupTouchEvents() {
        let startX = 0;
        let startY = 0;
        let deltaX = 0;
        let deltaY = 0;
        let isScrolling = false;

        this.wrapper.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isScrolling = false;
        }, { passive: true });

        this.wrapper.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;

            deltaX = e.touches[0].clientX - startX;
            deltaY = e.touches[0].clientY - startY;

            if (!isScrolling) {
                isScrolling = Math.abs(deltaY) > Math.abs(deltaX);
            }

            if (!isScrolling && Math.abs(deltaX) > 10) {
                e.preventDefault();
            }
        }, { passive: false });

        this.wrapper.addEventListener('touchend', () => {
            if (!startX || isScrolling) return;

            if (Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.prevSlide();
                } else {
                    this.nextSlide();
                }
            }

            startX = 0;
            startY = 0;
            deltaX = 0;
            deltaY = 0;
            isScrolling = false;
        }, { passive: true });
    }

    prevSlide() {
        this.currentIndex = Math.max(0, this.currentIndex - 1);
        this.updateCarousel();
        this.restartAutoPlay();
    }

    nextSlide() {
        this.currentIndex = Math.min(this.maxIndex, this.currentIndex + 1);
        this.updateCarousel();
        this.restartAutoPlay();
    }

    goToSlide(index) {
        this.currentIndex = Math.max(0, Math.min(this.maxIndex, index));
        this.updateCarousel();
        this.restartAutoPlay();
    }

    updateCarousel() {
        // Calculate transform value
        const translateX = -this.currentIndex * this.itemWidth;
        this.carousel.style.transform = `translateX(${translateX}px)`;
        
        // Update indicators
        this.updateIndicators();
        
        // Update button states
        this.updateButtonStates();
        
        // Update ARIA attributes
        this.updateAriaAttributes();
    }

    updateIndicators() {
        if (!this.indicators) return;
        
        this.indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentIndex);
        });
    }

    updateButtonStates() {
        this.prevBtn.disabled = this.currentIndex === 0;
        this.nextBtn.disabled = this.currentIndex === this.maxIndex;
        
        this.prevBtn.style.opacity = this.currentIndex === 0 ? '0.5' : '1';
        this.nextBtn.style.opacity = this.currentIndex === this.maxIndex ? '0.5' : '1';
    }

    updateAriaAttributes() {
        // Update carousel aria attributes
        this.carousel.setAttribute('aria-live', this.isAutoPlaying ? 'off' : 'polite');
        
        // Update visible items
        this.items.forEach((item, index) => {
            const isVisible = index >= this.currentIndex && index < this.currentIndex + this.itemsToShow;
            item.setAttribute('aria-hidden', !isVisible);
        });
    }

    startAutoPlay() {
        if (!this.isAutoPlaying || this.autoPlayTimer) return;
        
        this.autoPlayTimer = setInterval(() => {
            if (this.currentIndex >= this.maxIndex) {
                this.goToSlide(0);
            } else {
                this.nextSlide();
            }
        }, this.autoPlayInterval);
    }

    stopAutoPlay() {
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
    }

    restartAutoPlay() {
        this.stopAutoPlay();
        if (this.isAutoPlaying) {
            setTimeout(() => this.startAutoPlay(), 1000);
        }
    }

    handleResize() {
        const newItemsToShow = this.getItemsToShow();
        const newItemWidth = this.getItemWidth();
        
        if (newItemsToShow !== this.itemsToShow || newItemWidth !== this.itemWidth) {
            this.itemsToShow = newItemsToShow;
            this.itemWidth = newItemWidth;
            this.maxIndex = Math.max(0, this.totalItems - this.itemsToShow);
            
            // Adjust current index if needed
            this.currentIndex = Math.min(this.currentIndex, this.maxIndex);
            
            // Recreate indicators
            this.createIndicators();
            
            // Update carousel
            this.updateCarousel();
        }
    }

    // Utility method for debouncing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Public methods for external control
    pause() {
        this.isAutoPlaying = false;
        this.stopAutoPlay();
    }

    resume() {
        this.isAutoPlaying = true;
        this.startAutoPlay();
    }

    destroy() {
        this.stopAutoPlay();
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        
        // Remove created elements
        if (this.prevBtn) this.prevBtn.remove();
        if (this.nextBtn) this.nextBtn.remove();
        if (this.indicatorsContainer) this.indicatorsContainer.innerHTML = '';
        
        // Reset carousel position
        this.carousel.style.transform = '';
    }
}

// Initialize carousel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const servicesCarousel = new ServicesCarousel();
    
    // Make it globally accessible if needed
    window.servicesCarousel = servicesCarousel;
    
    // Handle visibility change for performance
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            servicesCarousel.pause();
        } else {
            servicesCarousel.resume();
        }
    });
});

// Legacy support - keep existing simple functionality
class SimpleAOS {
    constructor() {
        this.elements = document.querySelectorAll('[data-aos]');
        this.init();
    }

    init() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const delay = element.getAttribute('data-aos-delay') || 0;
                    
                    setTimeout(() => {
                        element.classList.add('aos-animate');
                    }, parseInt(delay));
                    
                    this.observer.unobserve(element);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        this.elements.forEach(element => {
            this.observer.observe(element);
        });
    }
}

// Initialize simple AOS for other elements
document.addEventListener('DOMContentLoaded', () => {
    const aosInstance = new SimpleAOS();
    window.simpleAOS = aosInstance;
});



// Add this to your scripts.js if it's not there
if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
    document.body.classList.add('is-home');
}





/* =====================================================
   ACTIVE TAB MANAGEMENT
   ===================================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Add is-home class to body if on homepage
    if (window.location.pathname === '/' || 
        window.location.pathname.includes('index.html') || 
        window.location.pathname === '') {
        document.body.classList.add('is-home');
    }
    
    // Set active class for Home tab on homepage
    const homeLink = document.querySelector('a[href="#home"]') || 
                     document.querySelector('a[href="index.html"]') || 
                     document.querySelector('.nav-links li:first-child a');
    
    if (homeLink && document.body.classList.contains('is-home')) {
        // Remove active from all links first
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active to home link
        homeLink.classList.add('active');
        console.log('Active class added to:', homeLink); // Debug log
    }
});

// Also handle when user clicks on navigation links
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function(e) {
        // Remove active from all links
        document.querySelectorAll('.nav-links a').forEach(l => {
            l.classList.remove('active');
        });
        
        // Add active to clicked link
        this.classList.add('active');
    });
});
/* =====================================================
 ABOUT-SCRIPTS.JS - About Page Functionality
 Handles all about page interactions and animations
 ===================================================== */

// =====================================================
// DOCUMENT READY INITIALIZATION
// =====================================================
// =====================================================
// DOCUMENT READY INITIALIZATION - CONSOLIDATED
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('About page loaded');
    
    // Initialize all about page functionality
    initializeNavbar();
    setActiveNavigation();
    initializeScrollIndicator();
    initializeMissionCarousel();
    initializeGalleryCarousel();
    initializeFadeInAnimations();
    initializeSmoothScrolling();
    
    // Homepage-style scroll indicator functionality
    const scrollIndicatorLink = document.querySelector('.scroll-indicator-link');
    
    if (scrollIndicatorLink) {
        scrollIndicatorLink.addEventListener('click', function(e) {
            e.preventDefault();
            const nextSection = document.querySelector('#my-story');
            if (nextSection) {
                nextSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
        
        // Hide scroll indicator when scrolling down (same as homepage)
        window.addEventListener('scroll', function() {
            const scrollIndicator = document.querySelector('.scroll-indicator');
            if (scrollIndicator) {
                if (window.scrollY > 100) {
                    scrollIndicator.style.opacity = '0';
                    scrollIndicator.style.pointerEvents = 'none';
                } else {
                    scrollIndicator.style.opacity = '1';
                    scrollIndicator.style.pointerEvents = 'auto';
                }
            }
        });
    }
});

// =====================================================
// NAVBAR FUNCTIONALITY
// =====================================================
function initializeNavbar() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (!navbar) return;
    
    // Add scroll behavior for navbar background
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled-black');
        } else {
            navbar.classList.remove('scrolled-black');
        }
    });
    
    // Hamburger menu toggle
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('open');
        });
        
        // Close mobile menu when clicking nav links
        const navLinkItems = navLinks.querySelectorAll('a');
        navLinkItems.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('open');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navbar.contains(event.target)) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('open');
            }
        });
    }
}


// ADD THIS FUNCTION TO about-scripts.js
function setActiveNavigation() {
    // Get current page from URL
    const currentPage = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        
        // Check if current page matches link href
        const linkHref = link.getAttribute('href');
        
        // Handle different page matches
        if ((currentPage.includes('about') || currentPage.includes('About')) && 
            (linkHref.includes('about') || linkHref.includes('About'))) {
            link.classList.add('active');
        }
        else if ((currentPage.includes('portfolio') || currentPage.includes('Portfolio')) && 
                (linkHref.includes('portfolio') || linkHref.includes('Portfolio'))) {
            link.classList.add('active');
        }
        else if ((currentPage === '/' || currentPage.includes('index')) && 
                (linkHref === '/' || linkHref.includes('index') || linkHref.includes('home'))) {
            link.classList.add('active');
        }
    });
}

// =====================================================
// SCROLL INDICATOR FUNCTIONALITY
// =====================================================
function initializeScrollIndicator() {
    const scrollIndicatorLink = document.querySelector('.scroll-indicator-link');
    
    if (!scrollIndicatorLink) return;
    
    // Smooth scroll to target section
    scrollIndicatorLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            // Calculate offset for fixed navbar
            const navbarHeight = document.getElementById('navbar')?.offsetHeight || 80;
            const targetPosition = targetElement.offsetTop - navbarHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
    
    // Hide scroll indicator when user scrolls past hero
    const heroSection = document.getElementById('hero-about');
    if (heroSection) {
        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                    scrollIndicatorLink.style.opacity = '1';
                    scrollIndicatorLink.style.visibility = 'visible';
                } else {
                    scrollIndicatorLink.style.opacity = '0';
                    scrollIndicatorLink.style.visibility = 'hidden';
                }
            });
        }, { threshold: [0, 0.3, 0.7, 1] });
        
        scrollObserver.observe(heroSection);
    }
}

// =====================================================
// MISSION CAROUSEL FUNCTIONALITY
// =====================================================
// ====== Replace initializeMissionCarousel() with this version ======
function initializeMissionCarousel() {
    const slides = document.querySelectorAll('.mission-slide');
    const dots = document.querySelectorAll('.mission-dot');

    if (!slides.length || !dots.length) return;

    let currentSlide = 0;
    let autoPlayInterval = null;
    const AUTO_PLAY_MS = 6000;

    function showSlide(index) {
        // clamp index
        index = ((index % slides.length) + slides.length) % slides.length;

        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        slides[index].classList.add('active');
        dots[index].classList.add('active');

        currentSlide = index;
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function startAutoPlay() {
        // Prevent duplicate intervals by clearing before starting
        stopAutoPlay();
        autoPlayInterval = setInterval(nextSlide, AUTO_PLAY_MS);
    }

    function stopAutoPlay() {
        if (autoPlayInterval !== null) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }

    // Dot click / manual control
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            stopAutoPlay();
            // restart after a short delay to avoid immediate duplicates
            setTimeout(startAutoPlay, 4000);
        });
    });

    // initialize first slide
    showSlide(0);
    startAutoPlay();

    // Pause/resume autoplay when section visibility changes or page hidden
    const missionSection = document.querySelector('.mission-carousel-section');
    if (missionSection && 'IntersectionObserver' in window) {
        // throttle the observer callback to avoid rapid start/stop
        const observerCb = throttle((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                    startAutoPlay();
                } else {
                    stopAutoPlay();
                }
            });
        }, 250); // 250ms throttle

        const missionObserver = new IntersectionObserver(observerCb, { threshold: [0, 0.3, 0.6, 1] });
        missionObserver.observe(missionSection);
    }

    // Also pause autoplay when document hidden (saves CPU)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoPlay();
        else startAutoPlay();
    });
}



// =====================================================
// GALLERY CAROUSEL FUNCTIONALITY
// =====================================================
function initializeGalleryCarousel() {
  const track = document.querySelector('.gallery-track');
  const slides = Array.from(track.children);
  const prevBtn = document.querySelector('.gallery-prev');
  const nextBtn = document.querySelector('.gallery-next');
  const indicatorsContainer = document.querySelector('.gallery-indicators');

  if (!track || slides.length === 0) return;

  // Clone first and last slides
  const firstClone = slides[0].cloneNode(true);
  const lastClone = slides[slides.length - 1].cloneNode(true);
  firstClone.classList.add('clone');
  lastClone.classList.add('clone');
  track.appendChild(firstClone);
  track.insertBefore(lastClone, slides[0]);

  const allSlides = Array.from(track.children);
  let currentIndex = 1; // start on first real slide
  let slideWidth;
  let autoPlayInterval;
  let isAnimating = false; // lock flag

  // Create indicators (for real slides only)
  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.classList.add('gallery-dot');
    if (index === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(index + 1));
    indicatorsContainer.appendChild(dot);
  });
  const indicators = indicatorsContainer.querySelectorAll('.gallery-dot');

  function updateSlideWidth() {
    slideWidth = allSlides[currentIndex].offsetWidth + 20; // account for margin
  }

  function updateCarousel(animate = true) {
    if (animate) isAnimating = true; // lock during animation
    track.style.transition = animate ? 'transform 0.5s ease' : 'none';
    const offset = -(currentIndex * slideWidth) + (track.offsetWidth / 2) - (slideWidth / 2);
    track.style.transform = `translateX(${offset}px)`;

    // Map clone index back to real slide index for indicators
    let realIndex = currentIndex - 1;
    if (realIndex >= slides.length) realIndex = 0;
    if (realIndex < 0) realIndex = slides.length - 1;

    indicators.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === realIndex);
    });
  }

  // Handle clones for infinite loop + unlock
  track.addEventListener('transitionend', () => {
    isAnimating = false; // unlock after animation
    if (allSlides[currentIndex].classList.contains('clone')) {
      if (currentIndex === 0) {
        currentIndex = slides.length;
      } else if (currentIndex === allSlides.length - 1) {
        currentIndex = 1;
      }
      updateCarousel(false);
    }
  });

  function nextSlide() {
    if (isAnimating) return; // block fast clicks
    currentIndex++;
    updateCarousel();
  }
  function prevSlide() {
    if (isAnimating) return;
    currentIndex--;
    updateCarousel();
  }
  function goToSlide(index) {
    if (isAnimating) return;
    currentIndex = index;
    updateCarousel();
  }

  nextBtn.addEventListener('click', () => { nextSlide(); resetAutoPlay(); });
  prevBtn.addEventListener('click', () => { prevSlide(); resetAutoPlay(); });

  // Autoplay
  function startAutoPlay() {
    stopAutoPlay();
    autoPlayInterval = setInterval(nextSlide, 4000);
  }
  function stopAutoPlay() {
    clearInterval(autoPlayInterval);
  }
  function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
  }

  // Init
  window.addEventListener('load', () => {
    updateSlideWidth();
    updateCarousel(false);
    startAutoPlay();
  });
  window.addEventListener('resize', () => {
    updateSlideWidth();
    updateCarousel(false);
  });
}



// =====================================================
// FADE-IN ANIMATIONS
// =====================================================
function initializeFadeInAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');
    
    if (!fadeElements.length || !('IntersectionObserver' in window)) return;
    
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    fadeElements.forEach(element => {
        fadeObserver.observe(element);
    });
}

// =====================================================
// SMOOTH SCROLLING FOR INTERNAL LINKS
// =====================================================
function initializeSmoothScrolling() {
    const internalLinks = document.querySelectorAll('a[href^="#"]');
    
    internalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            if (targetId === '#' || targetId === '') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                e.preventDefault();
                
                const navbarHeight = document.getElementById('navbar')?.offsetHeight || 80;
                const targetPosition = targetElement.offsetTop - navbarHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

// Debounce function for performance
function debounce(func, wait) {
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

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// =====================================================
// ERROR HANDLING
// =====================================================
window.addEventListener('error', function(e) {
    console.error('About page script error:', e.error);
    
    // Graceful degradation - ensure basic functionality works
    if (e.error && e.error.message) {
        console.log('Continuing with basic functionality...');
    }
});

// =====================================================
// PERFORMANCE OPTIMIZATIONS
// =====================================================

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && document.body.classList.contains('portfolio-page')) {
        forceGalleryReset();
    }
});

window.addEventListener('focus', function() {
    if (document.body.classList.contains('portfolio-page')) {
        forceGalleryReset();
    }
});

// Handle resize events
window.addEventListener('resize', debounce(function() {
    console.log('Window resized - recalculating layouts');
    
    // Trigger carousel updates if they exist
    const galleryCarousel = document.querySelector('.carousel-container');
    if (galleryCarousel) {
        // Re-initialize gallery carousel positioning
        const track = document.querySelector('.carousel-track');
        const slides = document.querySelectorAll('.carousel-slide');
        if (track && slides.length > 0) {
            const slideWidth = slides[0].offsetWidth + 20;
            let currentIndex = 0;
            
            // Find current active slide
            slides.forEach((slide, index) => {
                if (slide.classList.contains('active')) {
                    currentIndex = index;
                }
            });
            
            const offset = -(currentIndex * slideWidth) + (track.offsetWidth / 2) - (slideWidth / 2);
            track.style.transform = `translateX(${offset}px)`;
        }
    }
}, 250));

// Preload images for better performance
function preloadImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    images.forEach(img => {
        const imageLoader = new Image();
        imageLoader.onload = function() {
            img.src = this.src;
            img.classList.add('loaded');
        };
        imageLoader.src = img.dataset.src;
    });
}

// Initialize image preloading when DOM is ready
document.addEventListener('DOMContentLoaded', preloadImages);
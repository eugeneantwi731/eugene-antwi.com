// ===== VT MFA CREATIVE TECHNOLOGIES PORTFOLIO SCRIPT =====
// FILENAME: vt-mfa.js

// ===== INITIALIZE ON DOM LOAD =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('VT MFA Portfolio loaded successfully');
    
    // ===== BACK TO TOP BUTTON =====
    const backToTopBtn = document.getElementById('back-to-top');
    const progressCircle = document.querySelector('.progress-ring__circle');
    const circumference = 2 * Math.PI * 30; // radius is 30

    // Set up the circle
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        progressCircle.style.strokeDashoffset = circumference;
    }

    function updateScrollProgress() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercent = scrollTop / docHeight;
        
        if (progressCircle) {
            // Update circle progress
            const offset = circumference - (scrollPercent * circumference);
            progressCircle.style.strokeDashoffset = offset;
        }
        
        // Show/hide button
        if (scrollTop > 400) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    }

    window.addEventListener('scroll', updateScrollProgress);

    // Click to scroll to top
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ===== SCROLL DOWN INDICATOR =====
    const scrollDownBtn = document.getElementById('scroll-down');

    if (scrollDownBtn) {
    // Click/touch handler with offset
    scrollDownBtn.addEventListener('click', (e) => {
        const portfolioSection = document.getElementById('portfolio');
        if (portfolioSection) {
            const yOffset = -20; // 20px offset from top
            const y = portfolioSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({top: y, behavior: 'smooth'});
        }
        
        // Force remove hover state on mobile
        scrollDownBtn.blur();
        
        // Add a temporary class to reset colors immediately
        scrollDownBtn.classList.add('clicked');
        setTimeout(() => {
            scrollDownBtn.classList.remove('clicked');
        }, 100);
    });

        // Keyboard accessibility
        scrollDownBtn.setAttribute('tabindex', '0');
        scrollDownBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                scrollDownBtn.click();
            }
        });

        // Connect scroll indicator to gradient line
        const gradientLine = document.querySelector('.gradient-line');
        if (gradientLine) {
            scrollDownBtn.addEventListener('mouseenter', () => {
                gradientLine.style.animationDuration = '1.5s';
            });
            
            scrollDownBtn.addEventListener('mouseleave', () => {
                gradientLine.style.animationDuration = '3s';
            });
        }
    }

    // ===== IMAGE LOADING HANDLER =====
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
        }
    });

    // ===== FADE-IN ANIMATION ON SCROLL =====
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -80px 0px'
    };

    const fadeInObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                fadeInObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Add fade-in effect to project cards
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(40px)';
        card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        fadeInObserver.observe(card);
    });
    
    // Smooth reveal for intro section
    const introContent = document.querySelector('.intro-content');
    if (introContent) {
        setTimeout(() => {
            introContent.style.opacity = '1';
            introContent.style.transform = 'translateY(0)';
        }, 200);
    }

    // ===== LAZY LOADING FOR VIDEOS =====
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                // Video in view, user can play if they want
            } else {
                if (!video.paused) {
                    video.pause();
                }
            }
        });
    }, { threshold: 0.5 });

    // Observe all video elements
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        videoObserver.observe(video);
    });
});

// ===== KEYBOARD SHORTCUTS (Global - outside DOM) =====
document.addEventListener('keydown', (e) => {
    // ESC key to scroll to top
    if (e.key === 'Escape' && window.pageYOffset > 400) {
        window.scrollTo({top: 0, behavior: 'smooth'});
    }
});
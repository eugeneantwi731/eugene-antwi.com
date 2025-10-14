// Mission Carousel JavaScript
// Create a separate file: js/mission-carousel.js

document.addEventListener('DOMContentLoaded', function() {
    const missionCarousel = {
        slides: document.querySelectorAll('.mission-slide'),
        dots: document.querySelectorAll('.mission-dot'),
        currentSlide: 0,
        autoPlayInterval: null,
        autoPlayDelay: 6000,
        
        init() {
            if (this.slides.length === 0) return;
            
            this.bindEvents();
            this.startAutoPlay();
            this.showSlide(0);
        },
        
        bindEvents() {
            // Dot indicators
            this.dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    this.goToSlide(index);
                });
            });
            
            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    this.prevSlide();
                } else if (e.key === 'ArrowRight') {
                    this.nextSlide();
                }
            });
            
            // Pause on hover
            const carouselSection = document.querySelector('.mission-carousel-section');
            if (carouselSection) {
                carouselSection.addEventListener('mouseenter', () => this.pauseAutoPlay());
                carouselSection.addEventListener('mouseleave', () => this.startAutoPlay());
            }
            
            // Touch/swipe support
            let startX = 0;
            let moveX = 0;
            let isDragging = false;
            
            const slidesContainer = document.querySelector('.mission-slides-container');
            if (slidesContainer) {
                slidesContainer.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].clientX;
                    isDragging = true;
                    this.pauseAutoPlay();
                });
                
                slidesContainer.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    moveX = e.touches[0].clientX - startX;
                    e.preventDefault();
                });
                
                slidesContainer.addEventListener('touchend', () => {
                    if (!isDragging) return;
                    isDragging = false;
                    
                    const threshold = 50;
                    if (Math.abs(moveX) > threshold) {
                        if (moveX > 0) {
                            this.prevSlide();
                        } else {
                            this.nextSlide();
                        }
                    }
                    
                    moveX = 0;
                    this.startAutoPlay();
                });
            }
        },
        
        goToSlide(index) {
            if (index === this.currentSlide) return;
            
            this.currentSlide = index;
            this.showSlide(index);
            this.updateDots();
            this.restartAutoPlay();
        },
        
        nextSlide() {
            const nextIndex = (this.currentSlide + 1) % this.slides.length;
            this.goToSlide(nextIndex);
        },
        
        prevSlide() {
            const prevIndex = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
            this.goToSlide(prevIndex);
        },
        
        showSlide(index) {
            // Hide all slides
            this.slides.forEach(slide => {
                slide.classList.remove('active');
            });
            
            // Show current slide
            if (this.slides[index]) {
                this.slides[index].classList.add('active');
            }
        },
        
        updateDots() {
            this.dots.forEach((dot, index) => {
                if (index === this.currentSlide) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        },
        
        startAutoPlay() {
            this.pauseAutoPlay(); // Clear any existing interval
            if (this.slides.length > 1) {
                this.autoPlayInterval = setInterval(() => {
                    this.nextSlide();
                }, this.autoPlayDelay);
            }
        },
        
        pauseAutoPlay() {
            if (this.autoPlayInterval) {
                clearInterval(this.autoPlayInterval);
                this.autoPlayInterval = null;
            }
        },
        
        restartAutoPlay() {
            this.pauseAutoPlay();
            this.startAutoPlay();
        },
        
        // Method to add new quotes dynamically
        addQuote(imageSrc, quoteText, attribution) {
            const slideHTML = `
                <div class="mission-slide">
                    <div class="mission-content">
                        <div class="mission-portrait">
                            <div class="portrait-background">
                                <div class="circle-bg-main"></div>
                                <div class="circle-outline-1"></div>
                                <div class="circle-outline-2"></div>
                                <div class="circle-outline-3"></div>
                            </div>
                            <div class="portrait-container">
                                <img src="${imageSrc}" alt="Eugene Antwi Portrait" class="corporate-portrait">
                            </div>
                        </div>
                        
                        <div class="mission-quote-container">
                            <div class="quote-symbol">"</div>
                            <blockquote class="mission-statement-large">
                                <p>${quoteText}</p>
                                <footer class="quote-attribution">${attribution}</footer>
                            </blockquote>
                        </div>
                    </div>
                </div>
            `;
            
            // Add slide to container
            const slidesContainer = document.querySelector('.mission-slides-container');
            if (slidesContainer) {
                slidesContainer.insertAdjacentHTML('beforeend', slideHTML);
            }
            
            // Add corresponding dot
            const indicatorsContainer = document.querySelector('.mission-indicators');
            if (indicatorsContainer) {
                const dotIndex = this.slides.length;
                const dotHTML = `<button class="mission-dot" data-slide="${dotIndex}"></button>`;
                indicatorsContainer.insertAdjacentHTML('beforeend', dotHTML);
            }
            
            // Update references
            this.slides = document.querySelectorAll('.mission-slide');
            this.dots = document.querySelectorAll('.mission-dot');
            
            // Rebind events for new elements
            this.bindEvents();
        }
    };
    
    // Initialize carousel
    missionCarousel.init();
    
    // Expose methods globally for external use
    window.missionCarousel = {
        goToSlide: missionCarousel.goToSlide.bind(missionCarousel),
        nextSlide: missionCarousel.nextSlide.bind(missionCarousel),
        prevSlide: missionCarousel.prevSlide.bind(missionCarousel),
        addQuote: missionCarousel.addQuote.bind(missionCarousel),
        pauseAutoPlay: missionCarousel.pauseAutoPlay.bind(missionCarousel),
        startAutoPlay: missionCarousel.startAutoPlay.bind(missionCarousel)
    };
    
    // Animation enhancements
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '50px'
    };
    
    const missionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                
                // Add staggered animation to circular elements
                const circles = entry.target.querySelectorAll('[class*="circle-"]');
                circles.forEach((circle, index) => {
                    setTimeout(() => {
                        circle.style.transform = 'translate(-50%, -50%) scale(1)';
                        circle.style.opacity = circle.classList.contains('circle-bg-main') ? '0.2' : 
                                               circle.classList.contains('circle-outline-1') ? '0.3' :
                                               circle.classList.contains('circle-outline-2') ? '0.2' : '0.1';
                    }, index * 200);
                });
            }
        });
    }, observerOptions);
    
    // Observe mission slides for animations
    document.querySelectorAll('.mission-slide').forEach(slide => {
        missionObserver.observe(slide);
    });
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        .mission-slide {
            transform: translateY(30px);
            transition: all 0.8s ease;
        }
        
        .mission-slide.animate-in {
            transform: translateY(0);
        }
        
        .mission-portrait [class*="circle-"] {
            transform: translate(-50%, -50%) scale(0);
            transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .corporate-portrait {
            transition: all 0.5s ease;
        }
        
        .mission-slide:hover .corporate-portrait {
            transform: scale(1.05);
        }
        
        .quote-symbol {
            animation: fadeInScale 1s ease 0.5s both;
        }
        
        .mission-statement-large p {
            animation: fadeInUp 0.8s ease 0.7s both;
            transform: translateY(20px);
            opacity: 0;
        }
        
        .quote-attribution {
            animation: fadeInRight 0.6s ease 1s both;
            transform: translateX(20px);
            opacity: 0;
        }
        
        @keyframes fadeInScale {
            from {
                opacity: 0;
                transform: scale(0.5);
            }
            to {
                opacity: 0.3;
                transform: scale(1);
            }
        }
        
        @keyframes fadeInUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes fadeInRight {
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        .mission-dot {
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .mission-dot:hover {
            transform: scale(1.2);
        }
    `;
    document.head.appendChild(style);
});

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Mission Carousel initialized');
    });
}
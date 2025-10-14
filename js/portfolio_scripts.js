// Force complete reset on portfolio page load
function forceGalleryReset() {
    // Clear any body classes from other pages
    document.body.classList.remove('homepage', 'about-page');
    document.body.classList.add('portfolio-page');
    
    // Reset gallery items completely
    const galleryItems = document.querySelectorAll('.visual-gallery-section .gallery-item');
    galleryItems.forEach(item => {
        // Remove any classes that might have been added
        item.classList.remove('loaded', 'visible', 'animated');
        
        // Clear ALL inline styles
        item.removeAttribute('style');
        
        // Reset images
        const img = item.querySelector('img');
        if (img) {
            img.removeAttribute('style');
            img.classList.remove('loaded');
        }
        
        // Reset any content containers
        const content = item.querySelector('.gallery-card-content');
        if (content) {
            content.removeAttribute('style');
        }
    });
    
    // Force browser to recalculate layout
    document.body.offsetHeight;
}

// Run reset immediately when portfolio page loads
if (document.body.classList.contains('portfolio-page')) {
    forceGalleryReset();
}

// Also run on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('portfolio-page')) {
        setTimeout(forceGalleryReset, 50);
    }
});


/* =====================================================
 PORTFOLIO SCRIPTS JS - COMPLETE FIXED VERSION
 Clean, working code with all bugs resolved
 ===================================================== */



 

/* =====================================================
 1. GLOBAL VARIABLES & INITIALIZATION
 ===================================================== */
document.addEventListener('DOMContentLoaded', function() {
    initializePortfolioPage();
});

function initializePortfolioPage() {
    // Initialize all portfolio page features
    initializeNavbar();
    initializeHeroVideo();
    initializeScrollIndicator();
    initializeFeaturedProjects();
    initializeVisualGallery();
    initializeVideoGallery();
    initializeProjectModal();
    initializeGalleryLightbox();
    initializeFadeInAnimations();
    initializeScrollToTop();
    initializeAccessibility();
    initializeMobileOptimizations();
}

/* =====================================================
 2. NAVBAR FUNCTIONALITY - FIXED HAMBURGER MENU
 ===================================================== */
function initializeNavbar() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (!navbar) return;
    
    // Navbar scroll behavior
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Mobile menu toggle - COMPLETELY FIXED
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            // Toggle classes
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('open');
            
            // Control display
            if (navLinks.classList.contains('open')) {
                navLinks.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            } else {
                navLinks.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768 && navLinks.classList.contains('open')) {
                if (!navbar.contains(e.target)) {
                    closeNavMenu();
                }
            }
        });
        
        // Close menu when clicking on nav links
        const navLinkItems = navLinks.querySelectorAll('a');
        navLinkItems.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = link.getAttribute('href');
                
                // Only close menu for internal anchor links (like #contact, #about)
                // Don't close menu for page navigation links (like index.html, about.html)
                if (href && href.startsWith('#')) {
                    closeNavMenu();
                }
                // For page navigation, do nothing - let the browser handle it normally
            });
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                navLinks.style.display = '';
                hamburger.classList.remove('active');
                navLinks.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }
    
    function closeNavMenu() {
        if (hamburger && navLinks) {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open');
            navLinks.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
}

/* =====================================================
 3. HERO VIDEO FUNCTIONALITY
 ===================================================== */
function initializeHeroVideo() {
    const video = document.getElementById('hero-video');
    const fallbackImage = document.getElementById('hero-fallback');
    
    if (!video || !fallbackImage) return;
    
    // Initially hide fallback image
    fallbackImage.style.display = 'none';
    
    // Video load success
    video.addEventListener('canplaythrough', function() {
        video.style.opacity = '1';
        fallbackImage.style.display = 'none';
        
        // Ensure autoplay works
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log('Autoplay prevented:', error);
                showVideoPlayButton(video);
            });
        }
    });
    
    // Video load error - show fallback image
    video.addEventListener('error', function(e) {
        console.log('Video failed to load:', e);
        video.style.display = 'none';
        fallbackImage.style.display = 'block';
    });
    
    // Handle video stalling
    video.addEventListener('stalled', function() {
        console.log('Video stalled, showing fallback after delay');
        setTimeout(() => {
            if (video.readyState < 3) {
                video.style.display = 'none';
                fallbackImage.style.display = 'block';
            }
        }, 2000);
    });
    
    // Set initial video opacity
    video.style.opacity = '1';
    video.style.transition = 'opacity 0.3s ease';
}

function showVideoPlayButton(video) {
    const playButton = document.createElement('div');
    playButton.className = 'video-play-button';
    playButton.innerHTML = '▶';
    playButton.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        z-index: 10;
        transition: all 0.3s ease;
    `;
    
    const heroContainer = document.querySelector('.hero-media-container');
    if (heroContainer) {
        heroContainer.appendChild(playButton);
        
        playButton.addEventListener('click', function() {
            video.play();
            playButton.remove();
        });
    }
}

/* =====================================================
 4. SCROLL INDICATOR FUNCTIONALITY
 ===================================================== */
function initializeScrollIndicator() {
    const scrollLink = document.querySelector('.scroll-indicator-link');
    
    if (!scrollLink) return;
    
    scrollLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar
            
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
}

/* =====================================================
 5. FEATURED PROJECTS SECTION
 ===================================================== */
function initializeFeaturedProjects() {
    const filterItems = document.querySelectorAll('.filter-item');
    const projectCards = document.querySelectorAll('.project-card');
    
    if (!filterItems.length || !projectCards.length) return;
    
    // Initialize project filtering
    filterItems.forEach(filterItem => {
        filterItem.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // Update active filter
            filterItems.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            
            // Filter projects with animation
            filterProjects(filter, projectCards);
        });
        
        // Keyboard accessibility
        filterItem.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
    
    // Initialize project interactions
    initializeProjectInteractions(projectCards);
}

function filterProjects(filter, projectCards) {
    let visibleCount = 0;
    
    projectCards.forEach((card, index) => {
        const categories = card.getAttribute('data-category');
        let shouldShow = false;
        
        if (filter === 'all') {
            shouldShow = true;
        } else if (categories) {
            shouldShow = categories.split(' ').includes(filter);
        }
        
        if (shouldShow) {
            card.classList.remove('hidden');
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, visibleCount * 100);
            
            visibleCount++;
        } else {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                card.classList.add('hidden');
            }, 300);
        }
    });
    
    console.log(`Filter: ${filter} - Showing ${visibleCount} projects`);
}

function initializeProjectInteractions(projectCards) {
    projectCards.forEach(card => {
        card.addEventListener('click', function() {
            const projectId = this.getAttribute('data-project');
            if (projectId) {
                openProjectModal(projectId);
            }
        });
        
        // Keyboard accessibility
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const projectId = this.getAttribute('data-project');
                if (projectId) {
                    openProjectModal(projectId);
                }
            }
        });
    });
}

/* =====================================================
 6. VISUAL GALLERY - NEW MOOD BOARD STYLE
 ===================================================== */
function initializeVisualGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    // Initialize gallery item interactions
    galleryItems.forEach((item, index) => {
        // Set up click handler if not already defined in onclick
        if (!item.getAttribute('onclick')) {
            item.addEventListener('click', function() {
                const img = this.querySelector('img');
                const caption = this.querySelector('.gallery-caption');
                if (img && caption) {
                    openGalleryLightbox(img.src, caption.textContent, index);
                }
            });
        }
        
        // Keyboard accessibility
        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const img = this.querySelector('img');
                const caption = this.querySelector('.gallery-caption');
                if (img && caption) {
                    openGalleryLightbox(img.src, caption.textContent, index);
                }
            }
        });
    });
    
    // Initialize lazy loading for gallery images
    initializeGalleryLazyLoading();
}

function initializeGalleryLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.getAttribute('data-src')) {
                        img.src = img.getAttribute('data-src');
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}




/* =====================================================
 GALLERY NAVIGATION ENHANCEMENT - ADD TO EXISTING CODE
 ===================================================== */

let galleryImages = [];
let currentGalleryIndex = 0;

// Fixed initialization - build images array correctly
function initGalleryNavigation() {
    galleryImages = [];
    const items = document.querySelectorAll('.visual-gallery-section .gallery-item');
    
    items.forEach((item, index) => {
        const img = item.querySelector('img');
        if (img) {
            // Get caption from onclick or gallery-caption div
            let caption = '';
            
            // Try to extract from onclick first
            const onclick = item.getAttribute('onclick');
            if (onclick) {
                // Match pattern: openGalleryLightboxWithNav('path', 'caption')
                const match = onclick.match(/openGalleryLightboxWithNav\s*\(\s*['"]([^'"]*)['"]\s*,\s*['"]([^'"]*)['"]\s*\)/);
                if (match) {
                    caption = match[2]; // Second capture group is the caption
                }
            }
            
            // Fallback to gallery-caption div
            if (!caption) {
                const captionEl = item.querySelector('.gallery-caption');
                if (captionEl) {
                    caption = captionEl.textContent.trim();
                }
            }
            
            // Final fallback to img alt
            if (!caption) {
                caption = img.alt || `Gallery Image ${index + 1}`;
            }
            
            galleryImages.push({
                src: img.src,
                caption: caption,
                element: item, // Store reference to the element
                index: index   // Store the original index
            });
            
            console.log(`Image ${index}: ${img.src} - ${caption}`); // Debug log
        }
    });
    
    console.log('Total gallery images:', galleryImages.length); // Debug log
}


// Enhanced openGalleryLightbox function
function openGalleryLightboxWithNav(imageSrc, caption) {
    // Initialize if needed
    if (galleryImages.length === 0) {
        initGalleryNavigation();
    }
    
    console.log('Opening image:', imageSrc); // Debug log
    
    // Find current image index with better matching
    currentGalleryIndex = galleryImages.findIndex(img => {
        // Extract filename from both paths for comparison
        const srcFileName = imageSrc.split('/').pop();
        const imgFileName = img.src.split('/').pop();
        return imgFileName === srcFileName;
    });
    
    // Fallback: try exact match
    if (currentGalleryIndex === -1) {
        currentGalleryIndex = galleryImages.findIndex(img => img.src === imageSrc);
    }
    
    // Final fallback: find by caption
    if (currentGalleryIndex === -1) {
        currentGalleryIndex = galleryImages.findIndex(img => img.caption === caption);
    }
    
    // Last resort: use first image
    if (currentGalleryIndex === -1) {
        currentGalleryIndex = 0;
        console.warn('Could not find image, using index 0');
    }
    
    console.log('Found image at index:', currentGalleryIndex); // Debug log
    
    // Show lightbox with navigation
    showGalleryImage();
}

function showGalleryImage() {
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxImg = document.getElementById('lightbox-image');
    const lightboxCaption = lightbox.querySelector('.lightbox-caption');
    
    if (!lightbox || !lightboxImg || galleryImages.length === 0) return;
    
    // Add navigation elements if they don't exist
    addNavigationElements(lightbox);
    
    const currentImage = galleryImages[currentGalleryIndex];
    
    // IMPORTANT: Reset all classes first
    lightbox.classList.remove('show');
    lightboxImg.classList.remove('changing');
    
    // Update content immediately
    lightboxImg.src = currentImage.src;
    lightboxCaption.textContent = currentImage.caption;
    updateNavigationButtons();
    
    // Show lightbox
    lightbox.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Force reflow and trigger animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            lightbox.classList.add('show');
        });
    });
    
    // Add keyboard listener
    document.addEventListener('keydown', galleryKeyHandler);
}

function addNavigationElements(lightbox) {
    // Add navigation arrows if they don't exist
    if (!lightbox.querySelector('.gallery-nav-prev')) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'gallery-nav-prev gallery-nav-btn';
        prevBtn.innerHTML = '&#8249;';
        prevBtn.onclick = () => navigateGalleryImage(-1);
        lightbox.appendChild(prevBtn);
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'gallery-nav-next gallery-nav-btn';
        nextBtn.innerHTML = '&#8250;';
        nextBtn.onclick = () => navigateGalleryImage(1);
        lightbox.appendChild(nextBtn);
        
        // Add counter
        const counter = document.createElement('div');
        counter.className = 'gallery-counter';
        lightbox.appendChild(counter);
    }
}

function updateNavigationButtons() {
    const lightbox = document.getElementById('gallery-lightbox');
    const prevBtn = lightbox.querySelector('.gallery-nav-prev');
    const nextBtn = lightbox.querySelector('.gallery-nav-next');
    const counter = lightbox.querySelector('.gallery-counter');
    
    if (prevBtn) {
        prevBtn.style.display = currentGalleryIndex > 0 ? 'block' : 'none';
    }
    if (nextBtn) {
        nextBtn.style.display = currentGalleryIndex < galleryImages.length - 1 ? 'block' : 'none';
    }
    if (counter) {
        counter.textContent = `${currentGalleryIndex + 1} / ${galleryImages.length}`;
    }
    
    console.log(`Showing image ${currentGalleryIndex + 1} of ${galleryImages.length}`); // Debug log
}

function navigateGalleryImage(direction) {
    const newIndex = currentGalleryIndex + direction;
    if (newIndex >= 0 && newIndex < galleryImages.length) {
        const lightboxImg = document.getElementById('lightbox-image');
        const lightboxCaption = document.querySelector('.lightbox-caption');
        
        // Add changing class for smooth transition
        lightboxImg.classList.add('changing');
        
        setTimeout(() => {
            currentGalleryIndex = newIndex;
            const currentImage = galleryImages[currentGalleryIndex];
            
            // Update content
            lightboxImg.src = currentImage.src;
            lightboxCaption.textContent = currentImage.caption;
            updateNavigationButtons();
            
            // Remove changing class after a brief delay
            setTimeout(() => {
                lightboxImg.classList.remove('changing');
            }, 50);
        }, 150);
    }
}

// Enhanced close function with smooth transition
function closeGalleryLightboxEnhanced() {
    const lightbox = document.getElementById('gallery-lightbox');
    if (lightbox) {
        // Remove show class to trigger exit animation
        lightbox.classList.remove('show');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            lightbox.style.display = 'none';
            document.body.style.overflow = '';
            
            // Clean up classes for next time
            const lightboxImg = document.getElementById('lightbox-image');
            if (lightboxImg) {
                lightboxImg.classList.remove('changing');
            }
        }, 400);
        
        document.removeEventListener('keydown', galleryKeyHandler);
    }
}

function galleryKeyHandler(e) {
    const lightbox = document.getElementById('gallery-lightbox');
    if (!lightbox || lightbox.style.display !== 'block') return;
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            navigateGalleryImage(-1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            navigateGalleryImage(1);
            break;
        case 'Escape':
            e.preventDefault();
            closeGalleryLightbox();
            break;
    }
}

// Enhanced close function
function closeGalleryLightboxEnhanced() {
    const lightbox = document.getElementById('gallery-lightbox');
    if (lightbox) {
        lightbox.style.display = 'none';
        document.body.style.overflow = '';
        document.removeEventListener('keydown', galleryKeyHandler);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.visual-gallery-section')) {
        initGalleryNavigation();
    }
});

/* =====================================================
 7. VIDEO GALLERY FUNCTIONALITY
 ===================================================== */
function initializeVideoGallery() {
    const categoryItems = document.querySelectorAll('.category-item');
    const videoItems = document.querySelectorAll('.video-item');
    
    if (!categoryItems.length || !videoItems.length) return;
    
    // Initialize video category filtering
    categoryItems.forEach(categoryItem => {
        categoryItem.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            
            // Update active category
            categoryItems.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            
            // Filter videos
            filterVideos(category, videoItems);
        });
        
        // Keyboard accessibility
        categoryItem.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
    
    // Initialize video item interactions
    videoItems.forEach(item => {
        item.addEventListener('click', function() {
            const videoData = getVideoData(this);
            if (videoData) {
                openVideoModal(videoData);
            }
        });
        
        // Keyboard accessibility
        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const videoData = getVideoData(this);
                if (videoData) {
                    openVideoModal(videoData);
                }
            }
        });
    });
}

function filterVideos(category, videoItems) {
    let visibleCount = 0;
    
    videoItems.forEach((item, index) => {
        const itemCategory = item.getAttribute('data-category');
        let shouldShow = false;
        
        if (category === 'all') {
            shouldShow = true;
        } else if (itemCategory) {
            shouldShow = itemCategory.includes(category);
        }
        
        if (shouldShow) {
            item.classList.remove('hidden');
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, visibleCount * 150);
            
            visibleCount++;
        } else {
            item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            item.style.opacity = '0';
            item.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                item.classList.add('hidden');
            }, 300);
        }
    });
    
    console.log(`Video filter: ${category} - Showing ${visibleCount} videos`);
}

function getVideoData(videoItem) {
    const title = videoItem.querySelector('.video-info h3').textContent;
    const description = videoItem.querySelector('.video-info p').textContent;
    const duration = videoItem.querySelector('.duration').textContent;
    const platform = videoItem.querySelector('.platform').textContent;
    
    // Extract video URL based on platform or data attributes
    const youtubeId = videoItem.getAttribute('data-youtube-id');
    const vimeoId = videoItem.getAttribute('data-vimeo-id');
    const localVideo = videoItem.getAttribute('data-local-video');
    
    let embedCode = '';
    
    if (youtubeId) {
        embedCode = `<iframe src="https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0" frameborder="0" allowfullscreen></iframe>`;
    } else if (vimeoId) {
        embedCode = `<iframe src="https://player.vimeo.com/video/${vimeoId}?autoplay=1" frameborder="0" allowfullscreen></iframe>`;
    } else if (localVideo) {
        embedCode = `<video controls autoplay><source src="${localVideo}" type="video/mp4"></video>`;
    }
    
    return {
        title,
        description,
        duration,
        platform,
        embedCode
    };
}

/* =====================================================
 8. PROJECT MODAL FUNCTIONALITY
 ===================================================== */
function initializeProjectModal() {
    const modal = document.getElementById('project-modal');
    const closeModal = document.querySelector('.close-modal');
    
    if (!modal) return;
    
    // Close modal events
    if (closeModal) {
        closeModal.addEventListener('click', closeProjectModal);
    }
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeProjectModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeProjectModal();
        }
    });
}

function openProjectModal(projectId) {
    const modal = document.getElementById('project-modal');
    const modalBody = modal.querySelector('.modal-body');
    
    if (!modal || !modalBody) return;
    
    loadProjectContent(projectId, modalBody);
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        initializeBeforeAfterSlider();
        initializeSliderPosition();
        initializeMagnifyingGlass(); // ADD THIS LINE
    }, 1500);
}

function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (!modal) return;
    
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function loadProjectContent(projectId, container) {
    // Show loading state
    container.innerHTML = `
        <div class="modal-loading">
            <div class="spinner"></div>
            <p>Loading project details...</p>
        </div>
    `;
    
    // Simulate content loading
    setTimeout(() => {
        container.innerHTML = generateProjectContent(projectId);
    }, 1200);
}

function generateProjectContent(projectId) {
    const projectData = getProjectData(projectId);
    
    return `
        <div class="modal-project-content">
            <div class="modal-hero">
                <img src="${projectData.heroImage}" alt="${projectData.title}">
            </div>
            <div class="modal-info">
                <div class="modal-header">
                    <span class="project-type-badge">${projectData.type}</span>
                    <h2>${projectData.title}</h2>
                    <p class="project-subtitle">${projectData.subtitle}</p>
                </div>
                
                <div class="project-tags-modal">
                    ${projectData.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                
                <div class="content-section">
                    <h3>Project Overview</h3>
                    ${projectData.description}
                </div>
                
                ${projectData.beforeAfter ? `
                <div class="content-section">
                    <h3>Before & After Comparison</h3>
                    <div class="before-after-container">
                        <div class="before-after-slider">
                            <img src="${projectData.beforeAfter.before}" alt="Before" class="before-image">
                            <img src="${projectData.beforeAfter.after}" alt="After" class="after-image">
                            <div class="slider-handle">⟷</div>
                            <div class="comparison-labels">
                                <span class="label">Before</span>
                                <span class="label">After</span>
                            </div>
                            <!-- NEW: Magnifying glass element -->
                            <div class="magnifying-glass"></div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <div class="project-details-grid">
                    <div class="detail-item">
                        <h4>Duration</h4>
                        <p>${projectData.duration}</p>
                    </div>
                    <div class="detail-item">
                        <h4>Tools Used</h4>
                        <p>${projectData.tools}</p>
                    </div>
                    <div class="detail-item">
                        <h4>Role</h4>
                        <p>${projectData.role}</p>
                    </div>
                    <div class="detail-item">
                        <h4>Status</h4>
                        <p>${projectData.status}</p>
                    </div>
                </div>
                
                ${projectData.processImages ? `
                <div class="content-section">
                    <h3>Development Process</h3>
                    <div class="process-images">
                        ${projectData.processImages.map(img => `
                            <div class="process-image">
                                <img src="${img.src}" alt="${img.caption}">
                                <div class="process-image-caption">${img.caption}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${projectData.timeline ? `
                <div class="content-section">
                    <h3>Project Timeline</h3>
                    <div class="process-timeline">
                        ${projectData.timeline.map((item, index) => `
                            <div class="timeline-item">
                                <div class="timeline-marker">${index + 1}</div>
                                <div class="timeline-content">
                                    <h4>${item.phase}</h4>
                                    <p>${item.description}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="content-section">
                    <h3>Technical Process</h3>
                    ${projectData.process}
                </div>
            </div>
        </div>
    `;
}

function getProjectData(projectId) {
    // Mock project data - replace with actual project data
    const projectDatabase = {
        'ghana-platform': {
            title: 'Ghana Digital Assets Platform',
            subtitle: 'Building Africa\'s first comprehensive digital asset marketplace',
            type: 'Platform Development',
            heroImage: 'works/images/ghana-platform-hero.jpg',
            tags: ['Platform Development', 'Database Architecture', 'Cultural Assets', 'API Design'],
            description: `
                <p>The Ghana Digital Assets Platform addresses a critical gap in the global digital marketplace - the lack of authentic African digital content. This comprehensive platform serves as both a marketplace and cultural preservation tool.</p>
                <p>The project involves creating a full-stack web application with advanced search capabilities, user authentication, asset validation workflows, and payment processing systems.</p>
            `,
            duration: '6 months (Ongoing)',
            tools: 'Node.js, MongoDB, React, Stripe API, AWS',
            role: 'Lead Developer & Designer',
            status: 'In Development',
            process: `
                <p><strong>Research Phase:</strong> Analyzed existing marketplaces to identify representation gaps. Surveyed African creators about accessibility barriers and cultural authenticity concerns.</p>
                <p><strong>Technical Architecture:</strong> Designed scalable database schema for 3D assets with metadata tagging system. Implemented REST API with GraphQL endpoints for efficient data retrieval.</p>
                <p><strong>Cultural Validation:</strong> Developed community review system for cultural accuracy. Created comprehensive guidelines for authentic representation of African heritage elements.</p>
            `
        },
        'akwaaba-girl': {
            title: 'Akwaaba Girl Digital Human',
            subtitle: 'Culturally authentic digital human with advanced PBR workflows',
            type: 'Digital Human Creation',
            heroImage: 'works/images/akwaaba-girl-hero.jpg',
            tags: ['Digital Human', 'Look Development', 'PBR Materials', 'Cultural Accuracy'],
            description: `
                <p>The Akwaaba Girl project represents a breakthrough in culturally authentic digital human creation, specifically focused on accurate representation of Ghanaian features and traditional elements.</p>
                <p>This character serves as both a technical showcase and cultural preservation effort, demonstrating advanced skin shader techniques while honoring African heritage.</p>
            `,
            beforeAfter: {
                before: 'works/images/gallery/featured/akwaaba-girl/akwaaba-before.png',
                after: 'works/images/gallery/featured/akwaaba-girl/akwaaba-after.png'
            },
            processImages: [
                {
                    src: 'works/images/akwaaba-process-1.jpg',
                    caption: 'Initial photogrammetry capture setup with 80+ camera array'
                },
                {
                    src: 'works/images/akwaaba-process-2.jpg', 
                    caption: 'Mesh optimization and topology retargeting for animation'
                },
                {
                    src: 'works/images/akwaaba-process-3.jpg',
                    caption: 'Advanced subsurface scattering shader development'
                }
            ],
            timeline: [
                {
                    phase: 'Research & Planning',
                    description: 'Collaborated with Ghanaian photographers to capture authentic lighting conditions and studied traditional cultural elements.'
                },
                {
                    phase: 'Photogrammetry Capture', 
                    description: 'Used 80+ camera setup for full facial capture with custom settings optimized for darker skin reflectance.'
                },
                {
                    phase: 'Shader Development',
                    description: 'Developed new subsurface scattering approach specifically for darker skin tones and melanin-rich skin interaction.'
                },
                {
                    phase: 'Cultural Validation',
                    description: 'Working with cultural consultants to ensure authentic representation and respectful portrayal.'
                }
            ],
            duration: '3 months',
            tools: 'Blender, Substance Painter, Photoshop, RealityCapture',
            role: 'Technical Artist & Look Developer',
            status: 'Completed',
            process: `
                <p><strong>Shader Innovation:</strong> Traditional shaders often fail to capture the unique light interaction with melanin-rich skin. This project developed custom subsurface scattering techniques specifically optimized for authentic African skin tones.</p>
                <p><strong>Cultural Accuracy:</strong> Every detail was validated by cultural consultants to ensure respectful and accurate representation of Ghanaian heritage.</p>
            `
        }
        // Add more projects here...
    };
    
    return projectDatabase[projectId] || {
        title: 'Project Details',
        subtitle: 'Coming soon...',
        type: 'Project',
        heroImage: 'works/images/placeholder.jpg',
        tags: [],
        description: '<p>Project details will be available soon.</p>',
        duration: 'TBD',
        tools: 'TBD', 
        role: 'TBD',
        status: 'TBD',
        process: '<p>Process documentation coming soon.</p>'
    };
}

/* =====================================================
 BEFORE/AFTER SLIDER FUNCTIONALITY - FIXED VERSION
 ===================================================== */

 // Initialize slider position on modal open
function initializeSliderPosition() {
    const sliders = document.querySelectorAll('.before-after-slider');
    sliders.forEach(slider => {
        const afterImage = slider.querySelector('.after-image');
        const handle = slider.querySelector('.slider-handle');
        
        if (afterImage && handle) {
            // Start at 50/50: after image visible on right half only
            const maskGradient = 'linear-gradient(to right, transparent 0%, transparent 44%, black 50%, black 56%, black 100%)';
            afterImage.style.mask = maskGradient;
            afterImage.style.webkitMask = maskGradient;
            handle.style.left = '50%';
            handle.style.transform = 'translateX(-50%)';
            console.log('Slider initialized: Before (left) | After (right)');
        }
    });
}

function initializeBeforeAfterSlider() {
    console.log('Initializing before/after sliders...');
    const sliders = document.querySelectorAll('.before-after-slider');
    console.log('Found sliders:', sliders.length);
    
    sliders.forEach((slider, index) => {
        console.log(`Setting up slider ${index + 1}`);
        const handle = slider.querySelector('.slider-handle');
        const afterImage = slider.querySelector('.after-image');
        
        if (!handle || !afterImage) {
            console.error('Missing handle or after image in slider', index + 1);
            return;
        }
        
        let isDown = false;
        
        // Mouse events
        handle.addEventListener('mousedown', (e) => {
            isDown = true;
            e.preventDefault();
            console.log('Mouse down on handle');
        });
        
        document.addEventListener('mouseup', () => {
            if (isDown) {
                isDown = false;
                console.log('Mouse up - stopped dragging');
            }
        });
        
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            updateSlider(e, slider, afterImage);
        });
        
        // Touch events for mobile
        handle.addEventListener('touchstart', (e) => {
            isDown = true;
            e.preventDefault();
            console.log('Touch start on handle');
        });
        
        document.addEventListener('touchend', () => {
            if (isDown) {
                isDown = false;
                console.log('Touch end - stopped dragging');
            }
        });
        
        slider.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const touch = e.touches[0];
            updateSlider(touch, slider, afterImage);
        });
        
        console.log(`Slider ${index + 1} setup complete`);
    });
}

function updateSlider(e, slider, afterImage) {
    const rect = slider.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    
    // Smooth feather transition
    const feather = 6;
    const maskGradient = `linear-gradient(to right, 
        transparent 0%, 
        transparent ${Math.max(0, clampedPercentage - feather)}%, 
        black ${clampedPercentage}%, 
        black 100%)`;
    
    afterImage.style.mask = maskGradient;
    afterImage.style.webkitMask = maskGradient;
    
    // Move handle
    const handle = slider.querySelector('.slider-handle');
    if (handle) {
        handle.style.left = `${clampedPercentage}%`;
        handle.style.transform = 'translateX(-50%)';
    }
}

/* =====================================================
 MAGNIFYING GLASS FUNCTIONALITY - FIXED VERSION
 ===================================================== */

/* =====================================================
 MAGNIFYING GLASS FUNCTIONALITY - OPTIMIZED VERSION
 ===================================================== */

function initializeMagnifyingGlass() {
    const sliders = document.querySelectorAll('.before-after-slider');
    
    sliders.forEach(slider => {
        const magnifyingGlass = slider.querySelector('.magnifying-glass');
        const beforeImage = slider.querySelector('.before-image');
        const afterImage = slider.querySelector('.after-image');
        const handle = slider.querySelector('.slider-handle');
        
        if (!magnifyingGlass || !beforeImage || !afterImage) return;
        
        let isSliderActive = false;
        
        // Prevent magnifying when slider is being dragged
        if (handle) {
            handle.addEventListener('mousedown', function() {
                isSliderActive = true;
                magnifyingGlass.classList.remove('active');
            });
            
            document.addEventListener('mouseup', function() {
                isSliderActive = false;
            });
            
            handle.addEventListener('mouseenter', function() {
                magnifyingGlass.classList.remove('active');
            });
        }
        
        // FIXED mouse move handler with proper zoom
        slider.addEventListener('mousemove', function(e) {
            if (isSliderActive) return;
            
            // Skip if hovering over handle
            const handleRect = handle ? handle.getBoundingClientRect() : null;
            if (handleRect) {
                const isOverHandle = (
                    e.clientX >= handleRect.left &&
                    e.clientX <= handleRect.right &&
                    e.clientY >= handleRect.top &&
                    e.clientY <= handleRect.bottom
                );
                if (isOverHandle) {
                    magnifyingGlass.classList.remove('active');
                    return;
                }
            }
            
            const rect = slider.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Position magnifying glass (bigger size)
            const glassSize = 350; // INCREASED from 200
            const glassX = Math.max(0, Math.min(x - glassSize / 2, rect.width - glassSize));
            const glassY = Math.max(0, Math.min(y - glassSize / 2, rect.height - glassSize));
            
            magnifyingGlass.style.left = glassX + 'px';
            magnifyingGlass.style.top = glassY + 'px';
            
            // Determine which image to show
            const sliderPosition = parseFloat(handle.style.left) || 50;
            const mousePercentage = (x / rect.width) * 100;
            const currentImage = mousePercentage > sliderPosition ? afterImage : beforeImage;
            
            // FIXED zoom calculation - this is the key fix
            const zoomFactor = 10; // 10x zoom for better detail viewing
            
            // Calculate where the mouse is relative to the image
            const imageRect = currentImage.getBoundingClientRect();
            const relativeX = ((e.clientX - imageRect.left) / imageRect.width) * 100;
            const relativeY = ((e.clientY - imageRect.top) / imageRect.height) * 100;
            
            // Apply proper magnification WITH CORRECT ASPECT RATIO
            magnifyingGlass.style.backgroundImage = `url(${currentImage.src})`;
            magnifyingGlass.style.backgroundSize = `${zoomFactor * 100}%`; // SINGLE VALUE - maintains aspect ratio
            magnifyingGlass.style.backgroundPosition = `${relativeX}% ${relativeY}%`;

            magnifyingGlass.classList.add('active');
            
            // Debug output
            console.log('Magnifying:', {
                zoomFactor: zoomFactor,
                backgroundSize: `${zoomFactor * 100}%`,
                position: `${relativeX.toFixed(1)}% ${relativeY.toFixed(1)}%`,
                imageSrc: currentImage.src.split('/').pop()
            });
        });
        
        slider.addEventListener('mouseleave', function() {
            magnifyingGlass.classList.remove('active');
        });
    });
}

// Global function for gallery lightbox (called from HTML onclick)
function openGalleryLightbox(imageSrc, caption, index) {
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxContent = document.getElementById('lightbox-image');
    const lightboxCaption = document.querySelector('.lightbox-caption');
    
    if (!lightbox || !lightboxContent) return;
    
    // Set image and caption
    lightboxContent.src = imageSrc;
    if (lightboxCaption) {
        lightboxCaption.textContent = caption;
    }
    
    // Show lightbox
    lightbox.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeGalleryLightbox() {
    const lightbox = document.getElementById('gallery-lightbox');
    if (!lightbox) return;
    
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
}


/* =====================================================
 FIXED LIGHTBOX CLOSE BUTTON FUNCTIONALITY
 ===================================================== */

function initializeGalleryLightbox() {
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxClose = document.querySelector('.lightbox-close');
    
    if (!lightbox) return;
    
    // FIXED: Close lightbox events
    if (lightboxClose) {
        lightboxClose.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeGalleryLightbox();
        });
    }
    
    // Close when clicking outside the image
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            closeGalleryLightbox();
        }
    });
    
    // Close with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lightbox.style.display === 'block') {
            closeGalleryLightbox();
        }
    });
}

// FIXED: Enhanced close function
function closeGalleryLightbox() {
    const lightbox = document.getElementById('gallery-lightbox');
    if (!lightbox) return;
    
    // Remove show class for smooth transition
    lightbox.classList.remove('show');
    
    // Hide after animation completes
    setTimeout(() => {
        lightbox.style.display = 'none';
        document.body.style.overflow = '';
        
        // Clean up any navigation classes
        const lightboxImg = document.getElementById('lightbox-image');
        if (lightboxImg) {
            lightboxImg.classList.remove('changing');
        }
    }, 400);
    
    // Remove keyboard listener
    document.removeEventListener('keydown', galleryKeyHandler);
    
    console.log('Gallery lightbox closed');
}

// Enhanced openGalleryLightbox function
function openGalleryLightbox(imageSrc, caption, index) {
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxContent = document.getElementById('lightbox-image');
    const lightboxCaption = document.querySelector('.lightbox-caption');
    
    if (!lightbox || !lightboxContent) {
        console.error('Lightbox elements not found');
        return;
    }
    
    // Set image and caption
    lightboxContent.src = imageSrc;
    if (lightboxCaption) {
        lightboxCaption.textContent = caption;
    }
    
    // Show lightbox with smooth animation
    lightbox.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Trigger show animation
    requestAnimationFrame(() => {
        lightbox.classList.add('show');
    });
    
    console.log('Gallery lightbox opened:', imageSrc);
}


/* =====================================================
 10. VIDEO MODAL FUNCTIONALITY
 ===================================================== */
function openVideoModal(videoData) {
    // Create video modal if it doesn't exist
    let videoModal = document.getElementById('video-modal');
    
    if (!videoModal) {
        videoModal = document.createElement('div');
        videoModal.id = 'video-modal';
        videoModal.className = 'modal';
        videoModal.style.zIndex = '9998';
        videoModal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <div class="modal-body">
                    <div class="video-modal-header">
                        <h3 class="video-modal-title"></h3>
                    </div>
                    <div class="video-modal-body" style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%;">
                        <!-- Video embed will be inserted here -->
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(videoModal);
        
        // Add close functionality to new modal
        const closeBtn = videoModal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                closeVideoModal();
            });
        }
        
        videoModal.addEventListener('click', function(e) {
            if (e.target === videoModal) {
                closeVideoModal();
            }
        });
    }
    
    const modalTitle = videoModal.querySelector('.video-modal-title');
    const modalBody = videoModal.querySelector('.video-modal-body');
    
    if (!modalTitle || !modalBody) return;
    
    // Set title and embed code
    modalTitle.textContent = videoData.title;
    modalBody.innerHTML = videoData.embedCode;
    
    // Show modal
    videoModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
    const videoModal = document.getElementById('video-modal');
    if (!videoModal) return;
    
    // Stop video playback by clearing content
    const modalBody = videoModal.querySelector('.video-modal-body');
    if (modalBody) {
        modalBody.innerHTML = '';
    }
    
    videoModal.style.display = 'none';
    document.body.style.overflow = '';
}

/* =====================================================
 11. FADE-IN ANIMATIONS
 ===================================================== */
function initializeFadeInAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe all fade-in elements
    const fadeInElements = document.querySelectorAll(
        '.fade-in, .project-card, .gallery-item, .video-item'
    );
    
    fadeInElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.1}s`;
        observer.observe(el);
    });
}


/* =====================================================
 14. MOBILE OPTIMIZATIONS
 ===================================================== */
function initializeMobileOptimizations() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        document.body.classList.add('mobile-device');
        
        // Optimize hero video for mobile
        const heroVideo = document.getElementById('hero-video');
        if (heroVideo) {
            heroVideo.setAttribute('playsinline', 'true');
            heroVideo.setAttribute('webkit-playsinline', 'true');
        }
        
        // Touch-friendly interactions
        const touchElements = document.querySelectorAll('.project-card, .gallery-item, .video-item');
        touchElements.forEach(element => {
            element.addEventListener('touchstart', function() {
                this.classList.add('touch-hover');
            });
            
            element.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.classList.remove('touch-hover');
                }, 300);
            });
        });
        
        // Optimize modal size for mobile
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                .modal-content {
                    width: 98% !important;
                    height: 95vh !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

/* =====================================================
 15. UTILITY FUNCTIONS
 ===================================================== */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
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

/* =====================================================
 16. ERROR HANDLING & FALLBACKS
 ===================================================== */
function handleImageError(img) {
    console.warn('Image failed to load:', img.src);
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
}

// Add error handlers to all images
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.addEventListener('error', function() {
                handleImageError(this);
            });
        });
    }, 100);
});

/* =====================================================
 17. UNIVERSAL MODAL CLOSING - FINAL FIX
 ===================================================== */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close any open modal
        const modals = document.querySelectorAll('.modal, .lightbox');
        modals.forEach(modal => {
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
                document.body.style.overflow = '';
                
                // Stop videos if it's a video modal
                const videoContainer = modal.querySelector('.video-modal-body');
                if (videoContainer) {
                    videoContainer.innerHTML = '';
                }
            }
        });
    }
});

/* =====================================================
 18. PERFORMANCE MONITORING
 ===================================================== */
function initializePerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
        const perfObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.entryType === 'largest-contentful-paint') {
                    console.log('LCP:', entry.startTime);
                }
            });
        });
        
        try {
            perfObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
            console.log('Performance monitoring not supported');
        }
    }
}

// Initialize performance monitoring
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializePerformanceMonitoring, 1000);
});

/* =====================================================
 19. FINAL INITIALIZATION CHECK
 ===================================================== */
// Ensure everything is properly initialized
window.addEventListener('load', function() {
    console.log('Portfolio page fully loaded and initialized');
    
    // Final check for critical elements
    const criticalElements = {
        navbar: document.getElementById('navbar'),
        heroVideo: document.getElementById('hero-video'),
        projectCards: document.querySelectorAll('.project-card'),
        galleryItems: document.querySelectorAll('.gallery-item'),
        videoItems: document.querySelectorAll('.video-item')
    };
    
    Object.entries(criticalElements).forEach(([name, element]) => {
        if (!element || (NodeList.prototype.isPrototypeOf(element) && element.length === 0)) {
            console.warn(`Critical element missing: ${name}`);
        }
    });
});




// ADD THIS TO portfolio_scripts.js
function setActiveNavigation() {
    const currentPage = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a, #navbar nav ul li a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        
        const linkHref = link.getAttribute('href');
        
        if ((currentPage.includes('portfolio') || currentPage.includes('Portfolio')) && 
            (linkHref.includes('portfolio') || linkHref.includes('Portfolio'))) {
            link.classList.add('active');
        }
        else if ((currentPage.includes('about') || currentPage.includes('About')) && 
                (linkHref.includes('about') || linkHref.includes('About'))) {
            link.classList.add('active');
        }
        else if ((currentPage === '/' || currentPage.includes('index') || currentPage === '') && 
                (linkHref === '/' || linkHref.includes('index') || linkHref.includes('home'))) {
            link.classList.add('active');
        }
    });
}

// Call it in your existing DOMContentLoaded
setActiveNavigation();
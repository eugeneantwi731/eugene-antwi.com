/* =====================================================
 QUICK NAVIGATION SYSTEM - FIXED VERSION
 ===================================================== */

document.addEventListener('DOMContentLoaded', function() {
    const quickNav = document.getElementById('quick-nav');
    if (!quickNav) {
        console.error('Quick Navigation element not found');
        return;
    }

    // Page detection
    const currentPath = window.location.pathname.toLowerCase();
    const isHomepage = currentPath.includes('index') || currentPath === '/' || currentPath === '' ||
        (!currentPath.includes('about') && !currentPath.includes('portfolio'));
    const isAboutPage = currentPath.includes('about');
    const isPortfolioPage = currentPath.includes('portfolio');

    // Add page class for styling
    if (isHomepage) {
        document.body.classList.add('homepage');
    } else if (isAboutPage) {
        document.body.classList.add('about-page');
    } else if (isPortfolioPage) {
        document.body.classList.add('portfolio-page');
    }

    // AUTOMATIC SECTION DETECTION SYSTEM
    function detectSections() {
        const detectedSections = [];
        
        // Common section selectors to look for
        const sectionSelectors = [
            'section[id]',
            'div[id].section',
            '[data-section]',
            '.section[id]',
            'main > [id]'
        ];
        
        // Find all potential sections
        let allSections = [];
        sectionSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.id && !allSections.some(s => s.id === el.id)) {
                    allSections.push(el);
                }
            });
        });
        
        // Sort sections by their position in the document
        allSections.sort((a, b) => {
            return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
        });
        
        // Process each section
        allSections.forEach(section => {
            const id = section.id;
            let title = '';
            
            // Generate title from ID or data attributes
            if (section.dataset.navTitle) {
                title = section.dataset.navTitle;
            } else if (section.dataset.title) {
                title = section.dataset.title;
            } else {
                // Convert ID to title (hero-section -> Hero Section)
                title = id
                    .replace(/-/g, ' ')
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }
            
            // Clean up common patterns
            title = title
                .replace(/Section$/i, '')
                .replace(/Container$/i, '')
                .replace(/Wrapper$/i, '')
                .trim();
            
            detectedSections.push({ id, title });
        });
        
        return detectedSections;
    }

    // Section configurations for each page
    const pageConfigs = {
        homepage: [
            { id: 'hero', title: 'Home' },
            { id: 'about', title: 'About Me' },
            { id: 'services', title: 'Services' },
            { id: 'portfolio', title: 'Portfolio' },
            { id: 'testimonials', title: 'Testimonials' },
            { id: 'call-to-action', title: 'Contact' },
            { id: 'footer', title: 'Footer' }
        ],
        about: [
            { id: 'hero-about', title: 'About Me' },
            { id: 'my-story', title: 'My Story' },
            { id: 'skills', title: 'Skills' },
            { id: 'experience', title: 'Experience' },
            { id: 'contact', title: 'Contact' },
            { id: 'bts', title: 'Behind The Scenes' },
            { id: 'footer', title: 'Footer' }
        ],
        portfolio: [
            { id: 'portfolio-hero', title: 'Portfolio' },
            { id: 'featured-projects', title: 'Featured Projects' },
            { id: 'visual-gallery', title: 'Visual Gallery' },
            { id: 'video-gallery', title: 'Video Gallery' },
            { id: 'footer', title: 'Footer' }
        ]
    };

    // Determine which sections to use
    let sections = [];
    if (isHomepage) {
        sections = pageConfigs.homepage;
    } else if (isAboutPage) {
        sections = pageConfigs.about;
    } else if (isPortfolioPage) {
        sections = pageConfigs.portfolio;
    } else {
        // Auto-detect sections for other pages
        sections = detectSections();
    }

    // Auto-detection function for unknown pages
    function detectSections() {
        const detectedSections = [];
        const sectionElements = document.querySelectorAll('section[id], [data-nav-title]');
        
        sectionElements.forEach(section => {
            const id = section.id;
            if (id) {
                const title = section.getAttribute('data-nav-title') || 
                             id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                detectedSections.push({ id, title });
            }
        });
        
        return detectedSections;
    }

    
   // Verify sections exist in DOM and filter out missing ones
    sections = sections.filter(section => {
        const element = document.getElementById(section.id);
        if (!element) {
            console.warn(`Section #${section.id} not found in DOM`);
        }
        return element;
    });

    // If no sections found, hide quick nav
     if (sections.length === 0) {
        console.error('No valid sections found for navigation');
        quickNav.style.display = 'none';
        return;
    }

    // Create navigation structure
    const navIndicators = document.querySelector('.nav-indicators');

    // Clear existing indicators if any
    if (navIndicators) {
        navIndicators.innerHTML = '';
    } else {
        console.error('Navigation indicators container not found');
        return;
    }

    // Generate navigation items
    sections.forEach((section, index) => {
        // Create nav item container
        const navItem = document.createElement('div');
        navItem.className = 'nav-item';
        navItem.dataset.section = section.id;

        // Create label
        const label = document.createElement('span');
        label.className = 'nav-label';
        label.textContent = section.title.toUpperCase();

        // Create indicator dot
        const indicator = document.createElement('div');
        indicator.className = 'nav-indicator';
        indicator.dataset.section = section.id;

        // Append elements
        navItem.appendChild(label);
        navItem.appendChild(indicator);
        navIndicators.appendChild(navItem);

        // Add click event to navigate
        indicator.addEventListener('click', function() {
            navigateToSection(section.id);
        });

        // Add click event to label as well
        label.addEventListener('click', function() {
            navigateToSection(section.id);
        });
    });

    // Navigate to section function
    function navigateToSection(sectionId) {
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    // Intersection Observer for active section tracking
    const observerOptions = {
        root: null,
        rootMargin: '-40% 0px -40% 0px',
        threshold: 0
    };

    const sectionElements = [];
    const observerCallback = (entries) => {
        entries.forEach(entry => {
            const navItem = document.querySelector(`.nav-item[data-section="${entry.target.id}"]`);
            if (navItem) {
                if (entry.isIntersecting) {
                    // Remove active from all items
                    document.querySelectorAll('.nav-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    // Add active to current item
                    navItem.classList.add('active');
                }
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    sections.forEach(section => {
        const element = document.getElementById(section.id);
        if (element) {
            sectionElements.push(element);
            observer.observe(element);
        }
    });

    // Set initial active state
    setTimeout(() => {
        const firstSection = document.getElementById(sections[0].id);
        if (firstSection) {
            const rect = firstSection.getBoundingClientRect();
            if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
                const firstNavItem = document.querySelector('.nav-item');
                if (firstNavItem) {
                    firstNavItem.classList.add('active');
                }
            }
        }
    }, 100);

    // Handle scroll for better active tracking
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            updateActiveSection();
        }, 50);
    });

    function updateActiveSection() {
        const scrollPosition = window.scrollY + window.innerHeight / 2;
        
        for (let i = sections.length - 1; i >= 0; i--) {
            const section = document.getElementById(sections[i].id);
            if (section && section.offsetTop <= scrollPosition) {
                // Remove active from all
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                // Add active to current
                const activeItem = document.querySelector(`.nav-item[data-section="${sections[i].id}"]`);
                if (activeItem) {
                    activeItem.classList.add('active');
                }
                break;
            }
        }
    }

    // Log initialization success
    console.log('Quick Navigation initialized successfully');
    console.log('Current page:', isHomepage ? 'Homepage' : isAboutPage ? 'About' : isPortfolioPage ? 'Portfolio' : 'Other');
    console.log('Sections loaded:', sections.length);
    
    // Debug: Log detected sections
    if (sections.length === 0) {
        console.error('No sections detected! Check your HTML structure.');
    } else {
        console.log('Detected sections:', sections.map(s => `#${s.id}`).join(', '));
    }
});
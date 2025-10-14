document.addEventListener('DOMContentLoaded', function() {
    const heroImage = document.querySelector('.hero-image');
    const img = heroImage.querySelector('img');

    // Create glitter container
    const glitterContainer = document.createElement('div');
    glitterContainer.id = 'glitter-container';
    heroImage.insertBefore(glitterContainer, img);

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function getRandomColor() {
        const t = Math.random();
        // Adjusting the color range to have more white and increase visibility
        const r = Math.round(lerp(180, 255, t));
        const g = Math.round(lerp(230, 255, t));
        const b = Math.round(lerp(250, 255, t));
        return `rgb(${r}, ${g}, ${b})`;
    }

    function createGlitter(isHovered = false) {
        const glitter = document.createElement('div');
        glitter.classList.add('glitter');
        
        const startX = glitterContainer.offsetWidth / 2;
        const startY = glitterContainer.offsetHeight / 2;
        
        glitter.style.left = `${startX}px`;
        glitter.style.top = `${startY}px`;
        
        glitter.style.backgroundColor = getRandomColor();

        const imageScale = img.offsetWidth / img.naturalWidth;
        const baseSize = isHovered ? 25 : 20; // Increased base size
        const size = (Math.random() * baseSize + 8) * imageScale; // Increased minimum size
        glitter.style.width = `${size}px`;
        glitter.style.height = `${size}px`;
        
        glitterContainer.appendChild(glitter);
        
        const duration = isHovered ? Math.random() * 3000 + 2000 : Math.random() * 5000 + 3000;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * Math.min(glitterContainer.offsetWidth, glitterContainer.offsetHeight) * 0.4;
        const targetX = startX + Math.cos(angle) * distance;
        const targetY = startY + Math.sin(angle) * distance;
        const targetSize = size * (Math.random() * 2 + 1.5);
        
        const turbulence = isHovered ? 50 * imageScale : 30 * imageScale;
        const numKeyframes = 10;
        const keyframes = [{ transform: `translate(0, 0) scale(1)`, opacity: 0.3 }]; // Increased initial opacity
        
        for (let i = 1; i <= numKeyframes; i++) {
            const progress = i / numKeyframes;
            const tx = lerp(0, targetX - startX, progress) + (Math.random() - 0.5) * turbulence * progress;
            const ty = lerp(0, targetY - startY, progress) + (Math.random() - 0.5) * turbulence * progress;
            const scale = lerp(1, targetSize / size, progress);
            // Increasing the opacity and visibility
            const opacity = progress < 0.2 ? lerp(0.2, 1, progress * 5) : lerp(1, 0, (progress - 0.2) / 0.8);
            keyframes.push({ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, opacity: opacity });
        }
        
        glitter.animate(keyframes, {
            duration: duration,
            easing: 'ease-out'
        }).onfinish = () => glitter.remove();
    }

    let glitterInterval;
    let isHovered = false;

    function updateContainerSize() {
        const imageRect = img.getBoundingClientRect();
        const heroRect = heroImage.getBoundingClientRect();
        
        glitterContainer.style.width = `${imageRect.width}px`;
        glitterContainer.style.height = `${imageRect.height}px`;
        
        const topOffset = (heroRect.height - imageRect.height) / 2;
        const leftOffset = (heroRect.width - imageRect.width) / 2;
        
        glitterContainer.style.top = `${topOffset}px`;
        glitterContainer.style.left = `${leftOffset}px`;

          clearInterval(glitterInterval);
        const baseInterval = isHovered ? 20 : 40; // Slightly decreased intervals for more particles
        const interval = Math.max(baseInterval, 50 * (img.naturalWidth / img.offsetWidth)); // Adjusted scaling factor
        glitterInterval = setInterval(() => createGlitter(isHovered), interval);
    }

    heroImage.addEventListener('mouseenter', () => {
        isHovered = true;
        updateContainerSize();
    });

    heroImage.addEventListener('mouseleave', () => {
        isHovered = false;
        updateContainerSize();
    });

    window.addEventListener('load', updateContainerSize);
    window.addEventListener('resize', updateContainerSize);
});
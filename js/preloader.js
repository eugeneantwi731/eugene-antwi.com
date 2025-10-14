class MorsePreloader {
  constructor() {
    this.morseCode = {
      'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
      'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
      'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
      'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
      'Y': '-.--', 'Z': '--..', ' ': '/'
    };

    this.pageMessages = {
      'index.html': 'AKWAABA',
      'homepage.html': 'AKWAABA',
      'portfolio.html': 'MY PORTFOLIO',
      'about.html': 'ABOUT ME',
      'contact.html': 'ABOUT ME'
    };

    this.pageSounds = {
      'index.html': 'sounds/akwaaba.wav',
      'homepage.html': 'sounds/akwaaba.wav',
      'portfolio.html': 'sounds/my_portfolio.wav',
      'about.html': 'sounds/about_me.wav',
      'contact.html': 'sounds/about_me.wav'
    };

    this.PRELOADER_FADE_MS = 600;
    try { document.body.classList.add('loading'); } catch(e) {}
    this.init();
  }

  init() {
    const preloader = document.getElementById('preloader');
    if (!preloader) {
      document.body.classList.remove('loading');
      document.body.classList.add('content-loaded');
      return;
    }

    const currentPage = this.getCurrentPage();
    const message = this.pageMessages[currentPage] || 'AKWAABA';
    const soundFile = this.pageSounds[currentPage] || null;
    const sessionKey = `morse_${currentPage}_visited`;

    if (sessionStorage.getItem(sessionKey)) {
      this.hidePreloader();
      return;
    }

    // Apply contextual background transition
    this.setContextualBackground(currentPage, preloader);

    let audio;
    const toggleBtn = document.getElementById('sound-toggle');

    if (soundFile) {
      audio = new Audio(soundFile);
      audio.volume = 0.7;

      audio.play().then(() => {
        if (toggleBtn) toggleBtn.classList.add('hidden');
      }).catch(() => {
        if (toggleBtn) toggleBtn.classList.remove('hidden');
        toggleBtn.addEventListener('click', () => {
          audio.play();
          toggleBtn.classList.add('hidden');
        });
      });
    }

    this.startMorseAnimation(message, () => {
      sessionStorage.setItem(sessionKey, 'true');
      this.hidePreloader();
    });
  }

  getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    return filename === '' ? 'index.html' : filename;
  }

  isHomePage(page) {
    return page.includes('index') || page.includes('homepage');
  }

  isDarkPage(page) {
    return page.includes('portfolio') || page.includes('about') || page.includes('contact');
  }

  setContextualBackground(currentPage, preloader) {
    // Get last visited page
    const lastPage = sessionStorage.getItem('lastVisitedPage');
    
    // Store current page for next navigation
    sessionStorage.setItem('lastVisitedPage', currentPage);

    // Clear existing classes
    preloader.className = preloader.className.replace(/preloader-\w+/g, '');

    if (lastPage) {
      const comingFromHome = this.isHomePage(lastPage);
      const goingToHome = this.isHomePage(currentPage);
      const comingFromDark = this.isDarkPage(lastPage);
      const goingToDark = this.isDarkPage(currentPage);

      // Home → Dark pages: Start purple, transition to dark
      if (comingFromHome && goingToDark) {
        preloader.style.background = '#6e45e2'; // Start with purple
        setTimeout(() => {
          preloader.style.transition = 'background 2s ease-out';
          preloader.style.background = '#1a1a1a'; // Transition to dark
        }, 800); // Wait 800ms so you see the purple first
        return;
      }

      // Dark pages → Home: Start dark, transition to purple  
      if (comingFromDark && goingToHome) {
        preloader.style.background = '#1a1a1a'; // Start with dark
        setTimeout(() => {
          preloader.style.transition = 'background 2s ease-out';
          preloader.style.background = '#6e45e2'; // Transition to purple
        }, 800); // Wait 800ms so you see the dark first
        return;
      }
    }

    // Default static themes (no transition needed)
    if (this.isHomePage(currentPage)) {
      preloader.classList.add('preloader-homepage');
    } else if (currentPage.includes('portfolio')) {
      preloader.classList.add('preloader-portfolio');
    } else {
      preloader.classList.add('preloader-about');
    }
  }

  startMorseAnimation(message, callback) {
    const output = document.getElementById('morse-output');
    const cursor = document.querySelector('.morse-cursor');
    if (!output) return callback?.();

    output.innerHTML = '';
    const morseString = this.convertToMorse(message);
    let currentIndex = 0;

    const animateNext = () => {
      if (currentIndex >= morseString.length) {
        if (cursor) cursor.style.display = 'none';
        setTimeout(callback, 300);
        return;
      }

      const char = morseString[currentIndex];
      const el = this.createMorseElement(char);
      if (el) output.appendChild(el);

      currentIndex++;
      const delay = char === '.' ? 120 : char === '-' ? 200 : char === '/' ? 300 : 100;
      setTimeout(animateNext, delay);
    };

    setTimeout(animateNext, 200);
  }

  convertToMorse(message) {
    return message.toUpperCase().split('').map(c => this.morseCode[c] || '').join(' ');
  }

  createMorseElement(char) {
    const span = document.createElement('span');
    switch (char) {
      case '.': span.className = 'morse-dot'; break;
      case '-': span.className = 'morse-dash'; break;
      case ' ': span.className = 'letter-space'; break;
      case '/': span.className = 'word-space'; break;
      default: return null;
    }
    return span;
  }

  hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('preloader-hidden');
      setTimeout(() => {
        preloader.remove();
        document.body.classList.remove('loading');
        document.body.classList.add('content-loaded');
        document.body.style.overflow = '';
      }, this.PRELOADER_FADE_MS);
    }
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => new MorsePreloader());
if (document.readyState !== 'loading') new MorsePreloader();
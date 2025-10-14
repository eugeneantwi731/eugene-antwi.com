/* =====================================================
   SCROLL-TO-TOP FUNCTIONALITY
   Universal JavaScript for all portfolio pages
===================================================== */

document.addEventListener('DOMContentLoaded', function () {
  const scrollToTopBtn = document.getElementById('scrollToTop');
  const progressCircle = document.querySelector('.progress-circle-fill');

  function getRadius() {
    if (window.innerWidth <= 480) return 16;
    if (window.innerWidth <= 768) return 18;
    return 20;
  }

  let radius = getRadius();
  let circumference = 2 * Math.PI * radius;

  // Set initial circle
  progressCircle.style.strokeDasharray = circumference;
  progressCircle.style.strokeDashoffset = circumference;

  function handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollableHeight = documentHeight - windowHeight;

    const scrollPercentage = (scrollTop / scrollableHeight) * 100;

    // Show/hide button
    if (scrollTop > 300) {
      scrollToTopBtn.classList.add('visible');
    } else {
      scrollToTopBtn.classList.remove('visible', 'near-bottom');
    }

    // Update progress circle
    const offset = circumference - (scrollPercentage / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;

    // Pulse when near bottom (90%+)
    if (scrollPercentage >= 90) {
      scrollToTopBtn.classList.add('near-bottom');
    } else {
      scrollToTopBtn.classList.remove('near-bottom');
    }
  }

  // Smooth scroll to top
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Event listeners
  window.addEventListener('scroll', handleScroll, { passive: true });
  scrollToTopBtn.addEventListener('click', scrollToTop);

  // Handle window resize
  window.addEventListener('resize', function () {
    radius = getRadius();
    circumference = 2 * Math.PI * radius;
    progressCircle.style.strokeDasharray = circumference;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollableHeight = documentHeight - windowHeight;
    const scrollPercentage = (scrollTop / scrollableHeight) * 100;
    const offset = circumference - (scrollPercentage / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
  });

  // Initial call
  handleScroll();
});

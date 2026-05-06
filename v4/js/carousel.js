// carousel.js — gestione slide con swipe
export function initCarousel() {
  const carousel = document.getElementById('carousel');
  if (!carousel) return;

  let currentScreen = 0;
  let startX = null, startY = 0, isDragging = false, moved = false;
  const canvas3d = document.getElementById('sceneWrap');

  function goTo(idx) {
    currentScreen = idx;
    carousel.style.transform = `translateX(${-idx * 100}vw)`;
    [0, 1, 2].forEach(i => {
      const dot = document.getElementById('dot' + i);
      if (dot) dot.style.background = idx === i ? 'var(--primary)' : 'rgba(255,255,255,0.25)';
    });
    // Nascondi header principale su slide 3
    document.querySelectorAll('.header').forEach(h => {
      if (!h.closest('#screen3')) h.style.visibility = idx === 2 ? 'hidden' : '';
    });
  }

  window._carouselGoTo = goTo;

  const isOnCanvas = e => canvas3d?.contains(e.target);

  // Touch
  carousel.addEventListener('touchstart', e => {
    if (isOnCanvas(e)) { startX = null; return; }
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; moved = false;
  }, { passive: true });
  carousel.addEventListener('touchmove', () => { if (startX !== null) moved = true; }, { passive: true });
  carousel.addEventListener('touchend', e => {
    if (startX === null || !moved) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && currentScreen < 2) goTo(currentScreen + 1);
      else if (dx > 0 && currentScreen > 0) goTo(currentScreen - 1);
    }
  });

  // Mouse
  carousel.addEventListener('mousedown', e => {
    if (isOnCanvas(e)) { isDragging = false; return; }
    startX = e.clientX; startY = e.clientY; isDragging = true; moved = false;
  });
  carousel.addEventListener('mousemove', e => { if (isDragging && Math.abs(e.clientX - startX) > 5) moved = true; });
  carousel.addEventListener('mouseup', e => {
    if (!isDragging) return;
    isDragging = false;
    if (!moved) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0 && currentScreen < 2) goTo(currentScreen + 1);
      else if (dx > 0 && currentScreen > 0) goTo(currentScreen - 1);
    }
  });
}

(function () {
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.from(document.querySelectorAll(sel)); };

  /* Year */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Last updated date */
  var upd = $('#lastUpdated');
  if (upd) {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    upd.textContent = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* Toast */
  var toast = $('#toast');
  var tt = null;
  window.showToast = function (msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(tt);
    tt = setTimeout(function () { toast.style.opacity = '0'; }, 1400);
  };

  /* ---- Mobile carousel dot tracking ---- */
  var carousel = $('#tools-carousel');
  var dots = $$('.carousel-dot');
  var cards = carousel ? $$('.tool-card') : [];

  function updateDots() {
    if (!carousel || !dots.length || !cards.length) return;
    var rect = carousel.getBoundingClientRect();
    var center = rect.left + rect.width / 2;
    var closest = 0;
    var closestDist = Infinity;
    cards.forEach(function (card, i) {
      var cr = card.getBoundingClientRect();
      var dist = Math.abs(cr.left + cr.width / 2 - center);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === closest);
    });
  }

  if (carousel) {
    var scrollTimer = null;
    carousel.addEventListener('scroll', function () {
      cancelAnimationFrame(scrollTimer);
      scrollTimer = requestAnimationFrame(updateDots);
    }, { passive: true });
  }

  /* Dot click → scroll to card */
  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () {
      if (cards[i]) {
        cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  });

})();

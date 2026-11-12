// Home page carousel: one illustration at a time, a cross-fade, and the segment of the card on screen fills up to show when the next one comes.
// It is the end of that CSS animation that moves on, so that pausing the animation (pointer or focus on the carousel) pauses the carousel.
// Nothing moves by itself for people who asked for less motion: they use the segments.
(function () {
  var car = document.querySelector('[data-car]');
  if (!car) return;
  var slides = [].slice.call(car.querySelectorAll('.d')), caption = car.querySelector('[data-legende]'), box = car.querySelector('[data-segments]'), i = 0;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var segments = slides.map(function (s, k) {
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', s.getAttribute('data-nom'));
    b.addEventListener('click', function () { go(k); });
    b.addEventListener('animationend', function () { go(i + 1); });
    box.appendChild(b); return b;
  });
  function go(k) {
    i = (k + slides.length) % slides.length;
    slides.forEach(function (s, n) { s.classList.toggle('actif', n === i); });
    segments.forEach(function (b, n) { b.setAttribute('aria-current', 'false'); if (n === i) { void b.offsetWidth; b.setAttribute('aria-current', 'true'); } });   // set again after a reflow: the animation starts over
    var s = slides[i];
    caption.innerHTML = '';
    caption.appendChild(document.createTextNode(s.getAttribute('data-nom')));
    var small = document.createElement('small'); small.textContent = s.getAttribute('data-info'); caption.appendChild(small);
  }
  go(0);
})();

(function () {
  var WA = 'https://wa.me/5491168499750?text=';
  var nav = document.getElementById('nav');
  var waFloat = document.getElementById('waFloat');

  // Nav gets a solid background once you scroll
  function onScroll() { nav.classList.toggle('is-solid', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Floating WhatsApp button: hidden while a big WhatsApp button is already on screen
  if ('IntersectionObserver' in window) {
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); });
      waFloat.classList.toggle('is-hidden', visible.size > 0);
    });
    [document.querySelector('.hero .btn'), document.getElementById('consulta')].forEach(function (el) { if (el) io.observe(el); });
  }

  // ---- Servicios: tabs + prev/next + swipe ----
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
  var count = document.getElementById('count');
  var current = 0;

  function show(i, focusTab) {
    var n = panels.length;
    current = (i + n) % n;
    tabs.forEach(function (t, k) {
      var on = k === current;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p, k) { p.classList.toggle('is-active', k === current); });
    count.textContent = (current + 1) + ' / ' + n;
    var strip = tabs[current].parentNode;
    strip.scrollTo({ left: tabs[current].offsetLeft - 16, behavior: 'smooth' });
    if (focusTab) tabs[current].focus();
  }

  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { show(k); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1, true); }
    });
  });
  document.getElementById('prev').addEventListener('click', function () { show(current - 1); });
  document.getElementById('next').addEventListener('click', function () { show(current + 1); });

  var panelsEl = document.getElementById('panels');
  var x0 = null, y0 = null;
  panelsEl.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  panelsEl.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
    x0 = null;
  }, { passive: true });

  // ---- Temas: portada propia; el reproductor de Spotify recién al tocar ----
  function coverFallback(img) {
    if (img.classList.contains('is-missing')) return;
    img.classList.add('is-missing');
    var f = document.createElement('span');
    f.className = 'track__fallback';
    f.setAttribute('aria-hidden', 'true');
    f.textContent = img.getAttribute('data-initial') || '';
    img.parentNode.insertBefore(f, img);
  }
  document.querySelectorAll('.track__cover').forEach(function (img) {
    img.addEventListener('error', function () { coverFallback(img); });
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) coverFallback(img);
  });

  document.querySelectorAll('.track').forEach(function (b) {
    b.addEventListener('click', function () {
      var title = b.querySelector('.track__title').textContent + ', ' + b.querySelector('.track__artist').textContent;
      var f = document.createElement('iframe');
      f.className = 'player';
      f.src = 'https://open.spotify.com/embed/' + b.dataset.embed + '?utm_source=generator&theme=0';
      f.height = b.dataset.h || '80';
      f.title = title;
      f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      f.loading = 'eager';
      b.replaceWith(f);
    }, { once: true });
  });

  // YouTube: miniatura primero, reproductor real al tocar
  document.querySelectorAll('.yt').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + b.dataset.id + '?autoplay=1';
      f.title = b.getAttribute('aria-label');
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      var box = document.createElement('div');
      box.className = 'yt';
      box.appendChild(f);
      b.replaceWith(box);
    }, { once: true });
  });

  // ---- Armador de mensaje para WhatsApp ----
  var form = document.getElementById('builder');
  var bubble = document.getElementById('bubble');
  var send = document.getElementById('send');

  function joinList(items) {
    if (items.length < 2) return items.join('');
    return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
  }
  function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  function compose() {
    var d = new FormData(form);
    var nombre = clean(d.get('nombre'));
    var servicios = d.getAll('servicio');
    var temas = d.get('temas');
    var cuando = d.get('cuando');
    var detalle = clean(d.get('detalle'));

    var first = (nombre ? 'Hola! Soy ' + nombre + '. Vi' : 'Hola! Vi') + ' la web de Claraboya y quería consultar';
    first += servicios.length ? ' para ' + joinList(servicios) + '.' : '.';
    var body = [first, temas, cuando].filter(Boolean).join(' ');
    if (detalle) body += '\n\n' + detalle;
    return body;
  }
  function update() {
    var msg = compose();
    bubble.textContent = msg;
    send.href = WA + encodeURIComponent(msg);
  }
  if (form) {
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('submit', function (e) { e.preventDefault(); window.open(send.href, '_blank', 'noopener'); });
    update();
  }
})();

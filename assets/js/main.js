/* Shared behaviour: mobile navigation, hero network graphic, scroll-triggered animations. */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---- Contact email ---------------------------------------------------------
  // The address is assembled at runtime so it never appears as plain text in HTML.
  // Markup: <span class="js-email"></span><noscript>jbyun [at] kist.re.kr</noscript>
  function renderEmails() {
    const address = ['jbyun', 'kist.re.kr'].join('@');
    document.querySelectorAll('.js-email').forEach(el => {
      const a = document.createElement('a');
      a.href = 'mailto:' + address;
      a.textContent = address;
      el.replaceWith(a);
    });
  }
  renderEmails();
  // Content rendered later from JSON (team.json) calls this again.
  window.BYUNLAB = { renderEmails };

  // ---- Mobile navigation ---------------------------------------------------
  const toggle = document.querySelector('.nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // ---- Hero network graphic --------------------------------------------------
  // Slowly drifting nodes; nearby nodes are linked, evoking a polymer network.
  const COLORS = ['27,163,166', '242,165,65', '255,255,255'];

  function network(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const host = canvas.parentElement;
    let nodes = [];
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(18, Math.min(70, Math.round((w * h) / 16000)));
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 1.4 + Math.random() * 2.2,
        c: COLORS[i % 7 === 0 ? 1 : i % 3 === 0 ? 0 : 2]
      }));
      draw();
    }

    function draw() {
      const link = Math.min(150, Math.max(90, w / 9));
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < link) {
            ctx.strokeStyle = `rgba(160,190,215,${0.22 * (1 - d / link)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = `rgba(${n.c},${n.c === COLORS[2] ? 0.55 : 0.85})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function step() {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -10) n.x = w + 10; else if (n.x > w + 10) n.x = -10;
        if (n.y < -10) n.y = h + 10; else if (n.y > h + 10) n.y = -10;
      }
      draw();
      raf = requestAnimationFrame(step);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (!reduceMotion.matches && visible && !document.hidden) raf = requestAnimationFrame(step);
    }

    resize();
    start();

    let t = 0;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => { resize(); start(); }, 150);
    });
    document.addEventListener('visibilitychange', start);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', start);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        start();
      }).observe(host);
    }
  }

  document.querySelectorAll('canvas.network').forEach(network);

  // ---- Home cover carousel (data/covers.json) ---------------------------------
  // One cover at a time with a cross-fade. Autoplay pauses on hover/focus and is off
  // with prefers-reduced-motion; dots, arrow keys and swipe always work.
  function initCovers(box) {
    fetch('data/covers.json', { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        const items = (data.items || []).filter(c => c.image);
        if (!items.length) { box.hidden = true; return; }
        const label = c => `${c.journal} ${c.year} ${c.label || 'cover'}`;

        const stage = document.createElement('div');
        stage.className = 'cc-stage';
        const slides = items.map((c, i) => {
          const a = document.createElement('a');
          a.className = 'cc-slide';
          a.href = c.cover_url || c.paper_doi;
          a.target = '_blank';
          a.rel = 'noopener';
          a.title = label(c);
          const img = document.createElement('img');
          img.src = String(c.image).replace(/^\/+/, ''); // site-relative path
          img.alt = label(c);
          img.width = 400;
          img.height = 530;
          img.loading = i === 0 ? 'eager' : 'lazy';
          img.draggable = false;
          a.appendChild(img);
          stage.appendChild(a);
          return a;
        });

        const caption = document.createElement('p');
        caption.className = 'cc-caption';
        caption.setAttribute('aria-live', 'polite');

        const dots = document.createElement('div');
        dots.className = 'cc-dots';
        const buttons = items.map((c, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', `Show cover ${i + 1} of ${items.length}: ${c.journal} ${c.year}`);
          b.addEventListener('click', () => { show(i); restart(); });
          dots.appendChild(b);
          return b;
        });

        box.append(stage, caption, dots);

        let current = 0;
        function show(i) {
          current = (i + items.length) % items.length;
          slides.forEach((s, k) => {
            const on = k === current;
            s.classList.toggle('active', on);
            s.tabIndex = on ? 0 : -1;
            s.setAttribute('aria-hidden', String(!on));
          });
          buttons.forEach((b, k) => b.setAttribute('aria-current', String(k === current)));
          const c = items[current];
          caption.innerHTML = `<em></em>, ${c.year}`;
          caption.firstChild.textContent = c.journal;
          // Warm up the next image so the fade never shows a blank frame.
          const next = slides[(current + 1) % items.length].querySelector('img');
          if (next.loading === 'lazy') next.loading = 'eager';
        }

        // Autoplay
        const delay = Math.max(2, data.rotate_seconds || 3) * 1000;
        let timer = 0;
        let paused = false;
        function restart() {
          clearInterval(timer);
          if (items.length < 2 || reduceMotion.matches) return;
          timer = setInterval(() => {
            if (!paused && !document.hidden) show(current + 1);
          }, delay);
        }
        box.addEventListener('mouseenter', () => { paused = true; });
        box.addEventListener('mouseleave', () => { paused = false; });
        box.addEventListener('focusin', () => { paused = true; });
        box.addEventListener('focusout', () => { paused = false; });
        if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', restart);

        // Keyboard: left/right arrows when the carousel has focus
        box.addEventListener('keydown', e => {
          if (e.key === 'ArrowRight') { show(current + 1); restart(); e.preventDefault(); }
          if (e.key === 'ArrowLeft') { show(current - 1); restart(); e.preventDefault(); }
        });

        // Swipe: horizontal drag of 40px or more changes the cover and cancels the click
        let startX = null, startY = 0, swiped = false;
        stage.addEventListener('touchstart', e => {
          startX = e.touches[0].clientX; startY = e.touches[0].clientY; swiped = false;
        }, { passive: true });
        stage.addEventListener('touchend', e => {
          if (startX === null) return;
          const dx = e.changedTouches[0].clientX - startX;
          const dy = e.changedTouches[0].clientY - startY;
          if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
            swiped = true;
            show(current + (dx < 0 ? 1 : -1));
            restart();
          }
          startX = null;
        });
        stage.addEventListener('click', e => {
          if (swiped) { e.preventDefault(); swiped = false; }
        });

        show(0);
        restart();
      })
      .catch(() => { box.hidden = true; });
  }

  const carousel = document.getElementById('cover-carousel');
  if (carousel) initCovers(carousel);

  // ---- Scroll-triggered schematic animations ----------------------------------
  const animated = document.querySelectorAll('[data-animate]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    animated.forEach(el => io.observe(el));
  } else {
    animated.forEach(el => el.classList.add('in-view'));
  }
})();

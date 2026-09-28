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

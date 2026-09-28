/* Renders data/team.json and data/news.json (edited through Sveltia CMS at /admin). */
(function () {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Escaped text plus [label](https://...) links; nothing else is interpreted as HTML.
  // Line breaks in the text become <br>.
  const rich = s => esc(s).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (m, label, url) => `<a href="${url}" target="_blank" rel="noopener">${label}</a>`).replace(/\r?\n/g, '<br>');
  // Image paths are site-relative ("assets/img/..."); drop a leading slash the CMS may add,
  // because the site is served from /byunlab/ on GitHub Pages.
  const src = p => esc(String(p || '').replace(/^\/+/, ''));
  const getJson = url => fetch(url, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });

  function showError(el, what) {
    el.innerHTML = `<p class="muted">The ${what} could not be loaded. Please try again later.</p>`;
  }

  // ---- Team ------------------------------------------------------------------
  function renderTeam(team) {
    const pi = team.pi || {};
    const piBox = document.getElementById('team-pi');
    if (piBox) {
      piBox.innerHTML = `
        ${pi.photo ? `<img src="${src(pi.photo)}" alt="${esc(pi.name)}" width="1000" height="630">` : ''}
        <div>
          <p class="eyebrow">Principal Investigator</p>
          <h2 id="pi-title">${esc(pi.name)}</h2>
          <p class="role">Email: <span class="js-email"></span></p>
          <ul class="cv">${(pi.career || []).map(c => `
            <li><strong>${esc(c.title)}</strong><span class="period">${esc(c.period)}</span><br>${rich(c.details)}</li>`).join('')}
          </ul>
        </div>`;
      if (window.BYUNLAB && window.BYUNLAB.renderEmails) window.BYUNLAB.renderEmails();
    }

    // One list in team.json; status decides where a person appears (file order is kept).
    const people = team.people || [];
    const current = people.filter(p => p.status !== 'alumni');
    const alumni = people.filter(p => p.status === 'alumni');

    const members = document.getElementById('team-members');
    if (members) {
      members.innerHTML = current.map(m => `
        <article class="card member lift">
          ${m.photo ? `<img src="${src(m.photo)}" alt="${esc(m.name)}" width="480" height="600" loading="lazy">` : ''}
          <div class="body">
            <h3>${esc(m.name)}</h3>
            <p class="pos">${esc(m.position)}</p>
            <p class="focus">${esc(m.focus)}</p>
            ${m.affiliation ? `<p class="aff">${esc(m.affiliation)}</p>` : ''}
          </div>
        </article>`).join('');
    }

    const groups = document.getElementById('team-groups');
    if (groups) {
      groups.innerHTML = (team.group_photos || []).filter(g => g.image).map(g =>
        `<img src="${src(g.image)}" alt="${esc(g.alt || 'The Byun Lab group photo')}" loading="lazy">`).join('');
      groups.hidden = !groups.children.length;
    }

    const alumniBox = document.getElementById('team-alumni');
    if (alumniBox) {
      alumniBox.innerHTML = alumni.map(a => {
        const period = a.period || (a.graduation_year ? `Graduated ${a.graduation_year}` : '');
        return `
        <li><strong>${esc(a.name)}</strong><span class="role">${esc(a.position)}</span><span class="period">${esc(period)}</span>${a.now ? `<span class="now">${esc(a.now)}</span>` : ''}</li>`;
      }).join('');
      alumniBox.closest('section').hidden = !alumni.length;
    }
  }

  // ---- News --------------------------------------------------------------------
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dateLabel(item) {
    if (item.date_label) return item.date_label;
    const [y, m, d] = String(item.date || '').split('-').map(Number);
    if (!y) return '';
    return [d, MONTHS[(m || 1) - 1], y].filter(Boolean).join(' ');
  }

  // On Home, use the optional short text; otherwise clamp the full text to two lines.
  function newsCard(item, home) {
    const thumb = item.image
      ? `<div class="thumb"><img src="${src(item.image)}" alt="" loading="lazy"></div>`
      : '<div class="thumb none" aria-hidden="true">News</div>';
    const short = home && item.home_text;
    const text = short
      ? `<p>${rich(item.home_text)}</p>`
      : `<p${home ? ' class="clamp"' : ''}>${rich(item.text)}</p>`;
    return `<article class="card news-card lift">${thumb}
      <div><time datetime="${esc(item.date)}">${esc(dateLabel(item))}</time>${text}</div>
    </article>`;
  }

  function renderNews(news) {
    // Newest first regardless of the order in the file.
    const items = (news.items || []).filter(i => i.text)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    document.querySelectorAll('[data-news]').forEach(box => {
      const n = parseInt(box.dataset.count, 10);
      box.innerHTML = (n ? items.slice(0, n) : items).map(item => newsCard(item, Boolean(n))).join('');
    });
  }

  // ---- Load what the current page needs ------------------------------------------
  if (document.getElementById('team-members')) {
    getJson('data/team.json').then(renderTeam)
      .catch(() => showError(document.getElementById('team-members'), 'team list'));
  }
  if (document.querySelector('[data-news]')) {
    getJson('data/news.json').then(renderNews)
      .catch(() => document.querySelectorAll('[data-news]').forEach(b => showError(b, 'news')));
  }
})();

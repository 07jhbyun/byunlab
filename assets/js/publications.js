/* Renders data/publications.json into the pages that need it. */
(function () {
  'use strict';

  const DATA_URL = 'data/publications.json';
  const CONFIG_URL = 'data/config.json';

  // ---- Helpers ----------------------------------------------------------------
  const bareDoi = d => (d || '').toLowerCase().replace('https://doi.org/', '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Subscript digits in chemical formulas: "H 2 O 2" or "H2O2" -> H<sub>2</sub>O<sub>2</sub>
  const chem = s => esc(s).replace(/([A-Z][a-z]?) ?(\d+)(?: (?=[A-Z][a-z]? ?\d))?/g, '$1<sub>$2</sub>');
  const shortAuthors = a => (a.length > 4 ? a.slice(0, 3).join(', ') + ', ..., ' + a[a.length - 1] : a.join(', '));
  const link = item => item.doi || item.url || null;
  const byDateDesc = (a, b) => String(b.date || b.year).localeCompare(String(a.date || a.year));

  function coverBadges(item) {
    return (item.covers || []).map(c =>
      `<a class="cover-badge" href="${esc(c.doi || c.url)}" target="_blank" rel="noopener">${esc(c.label)}</a>`
    ).join('');
  }

  // Name matching ignores case, spaces, periods and hyphens ("Ji-Hye Byun" == "jihyebyun").
  const nameKey = s => String(s).toLowerCase().replace(/[\s.\-‐-–]/g, '');

  // One entry in citation order (authors, title, journal vol, pages (year)), laid out
  // on three lines. `num` is omitted for compact lists.
  function pubItem(item, highlight, num) {
    const authors = (item.authors || []).map(a =>
      highlight.has(nameKey(a)) ? `<strong>${esc(a)}</strong>` : esc(a)
    ).join(', ');
    const href = link(item);
    const title = href
      ? `<a href="${esc(href)}" target="_blank" rel="noopener">${chem(item.title)}</a>`
      : chem(item.title);
    let source = item.journal ? `<em>${esc(item.journal)}</em>` : '';
    if (item.volume) source += ` ${esc(item.volume)}`;
    if (item.pages) source += `${source ? ', ' : ''}${esc(item.pages)}`;
    source += ` (${esc(item.year)}).`;
    return `<li class="pub-item">${num ? `<span class="pub-num">${num}</span>` : ''}<div>
      <p class="pub-authors">${authors}</p>
      <p class="pub-title">${title}</p>
      <p class="pub-source">${source}${coverBadges(item)}</p>
    </div></li>`;
  }

  // ---- Publications page: grouped by year, numbered from the total down --------
  function renderPublicationList(data, items, highlight) {
    const box = document.getElementById('pub-list');
    if (!box) return;
    const updated = document.getElementById('pub-updated');
    if (updated && data.updated) updated.textContent = `Last updated: ${data.updated}`;

    const total = items.length;
    const years = [];
    items.forEach((item, i) => {
      const y = item.year || 'Other';
      let group = years[years.length - 1];
      if (!group || group.year !== y) years.push(group = { year: y, rows: [] });
      group.rows.push(pubItem(item, highlight, total - i));
    });

    const covers = items.reduce((n, item) => n + (item.covers || []).length, 0);
    const yearsSpan = years.length ? `${years[years.length - 1].year}-${years[0].year}` : '';
    const stats = `<ul class="pub-stats">
      <li><strong>${total}</strong>publications</li>
      <li><strong>${covers}</strong>journal covers</li>
      <li><strong>${esc(yearsSpan)}</strong>years</li>
    </ul>`;
    const nav = `<ul class="year-nav" aria-label="Jump to year">${years.map(g =>
      `<li><a href="#y${esc(g.year)}">${esc(g.year)}</a></li>`).join('')}</ul>`;

    box.innerHTML = stats + nav + years.map(g => `
      <section class="pub-year-group" id="y${esc(g.year)}">
        <div class="pub-year-label"><h2>${esc(g.year)}</h2><span>${g.rows.length} paper${g.rows.length > 1 ? 's' : ''}</span></div>
        <ol class="pub-items">${g.rows.join('')}</ol>
      </section>`).join('');
  }

  // ---- Home: most recent N publications ----------------------------------------
  function renderRecent(items, highlight) {
    const list = document.getElementById('recent-pubs');
    if (!list) return;
    const n = parseInt(list.dataset.count, 10) || 5;
    list.innerHTML = items.slice(0, n).map(item => pubItem(item, highlight)).join('');
  }

  // ---- Research page ------------------------------------------------------------
  const RESEARCH_MAP = {
    materials: {
      title: 'Materials: polymer design',
      text: 'We design and make novel polymeric materials to find sustainable solutions for tackling the urgent problems of water pollution and energy shortage.',
      doi: null
    },
    energy: {
      title: 'Energy: conjugated polymers for visible-light-driven photocatalysis',
      text: 'Polymeric photocatalysts with tunable band structures and wetting properties for water splitting, oxygen reduction, nitrogen fixation and antibacterial treatment.',
      doi: '10.1016/j.joule.2026.102603'
    },
    env: {
      title: 'Environment: porous polymers for environmental applications',
      text: "Porous polymers designed by 'porosity' and 'chemistry' rules for selective adsorption of CO2, micropollutants in water, and organic vapors.",
      doi: '10.1002/anie.202304378'
    }
  };

  function initResearch(items) {
    const tip = document.getElementById('tip');
    if (!tip) return;
    const find = doi => items.find(p => bareDoi(p.doi) === bareDoi(doi));
    const groups = document.querySelectorAll('.tree svg > g[data-key]');

    function show(key) {
      const m = RESEARCH_MAP[key];
      const p = m.doi && find(m.doi);
      tip.className = 'tip ' + key;
      tip.innerHTML = `<h3>${esc(m.title)}</h3><p>${esc(m.text)}</p>` + (p
        ? `<div class="rep">Representative: <a href="${esc(p.doi)}" target="_blank" rel="noopener">${chem(p.title)}</a>, <em>${esc(p.journal)}</em> (${p.year})</div>`
        : '');
      groups.forEach(g => {
        const k = g.dataset.key;
        g.classList.toggle('dim', key !== 'materials' && k !== key && k !== 'materials');
      });
    }

    groups.forEach(g => {
      const node = g.querySelector('.node');
      const key = g.dataset.key;
      ['mouseenter', 'focus', 'click'].forEach(ev => node.addEventListener(ev, () => show(key)));
      node.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(key); }
      });
    });
    show('materials');

    document.querySelectorAll('.papers[data-dois]').forEach(box => {
      const cards = box.dataset.dois.split(',').map(find).filter(Boolean).sort(byDateDesc).map(p => `
        <article class="paper"><span class="yr">${p.year}</span><div>
          <a class="title" href="${esc(link(p))}" target="_blank" rel="noopener">${chem(p.title)}</a>
          <div class="meta">${esc(shortAuthors(p.authors))}, <em>${esc(p.journal)}</em>${coverBadges(p)}</div>
        </div></article>`).join('');
      box.insertAdjacentHTML('beforeend', cards);
    });
  }

  // ---- Load data once, then render whatever the current page contains ----------
  const needsData = ['tip', 'pub-list', 'recent-pubs'].some(id => document.getElementById(id));
  if (!needsData) return;

  const getJson = (url, options) => fetch(url, options).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });

  // publications.json changes weekly; revalidate with the server so a stale cached list is never shown.
  Promise.all([getJson(DATA_URL, { cache: 'no-cache' }), getJson(CONFIG_URL).catch(() => ({}))])
    .then(([data, config]) => {
      const items = (data.items || []).slice().sort(byDateDesc);
      const highlight = new Set((config.highlight_names || []).map(nameKey));
      initResearch(items);
      renderPublicationList(data, items, highlight);
      renderRecent(items, highlight);
    })
    .catch(() => {
      initResearch([]);
      const box = document.getElementById('pub-list');
      if (box) {
        box.innerHTML = '<p class="muted">The publication list could not be loaded. Please see the ' +
          '<a href="https://scholar.google.com/citations?user=GMXEnowAAAAJ" target="_blank" rel="noopener">Google Scholar profile</a>.</p>';
      }
    });
})();

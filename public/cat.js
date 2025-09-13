/** Category chips from /api/kits; copies existing chip look; never breaks page */
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else { init(); }

  async function init() {
    try {
      const res = await fetch('/api/kits', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const kits = Array.isArray(data?.kits) ? data.kits : [];

      // Try to copy classes from an existing chip (“All” / “On Demo”)
      const existingChips = Array.from(document.querySelectorAll('button, a'))
        .filter(el => /(^|\b)(all|on demo)(\b|$)/i.test(el.textContent.trim()));
      const styleSource = existingChips[0] || document.querySelector('button');

      const fallback =
        'px-3 py-1.5 rounded-full border border-blue-400 text-blue-200 bg-transparent ' +
        'shadow-sm inline-flex items-center gap-2 text-sm font-semibold';
      const baseClasses = styleSource ? styleSource.className : fallback;

      const chipRow = styleSource?.parentElement
        || document.querySelector('#chip-row')
        || document.querySelector('.filters')
        || document.querySelector('main')
        || document.body;

      // Build category list from API (supports array of strings or objects with name/title/slug)
      const categories = Array.from(new Set(
        kits.flatMap(k => {
          const raw = k.categories ?? k.category ?? [];
          const arr = Array.isArray(raw) ? raw : [raw];
          return arr.map(c => (c && typeof c === 'object' ? (c.name || c.title || c.slug) : c))
                    .filter(Boolean);
        })
      )).sort((a, b) => String(a).localeCompare(String(b)));

      if (!categories.length) return; // nothing to show yet; do nothing

      // Map UPC -> categories
      const catByUpc = new Map(
        kits.map(k => {
          const upc = String(k.upc ?? k.UPC ?? k.Upc ?? k.sku ?? k.SKU ?? '');
          const raw = k.categories ?? k.category ?? [];
          const arr = Array.isArray(raw) ? raw : [raw];
          const cats = arr.map(c => (c && typeof c === 'object' ? (c.name || c.title || c.slug) : c))
                          .filter(Boolean);
          return [upc, cats];
        })
      );

      // Collect cards by [data-upc]
      const cardByUpc = new Map(
        Array.from(document.querySelectorAll('[data-upc]'))
          .map(el => [el.getAttribute('data-upc'), el])
      );

      // Insert a row for our chips under the existing chips
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.flexWrap = 'wrap';
      row.style.gap = '0.5rem';
      row.style.marginTop = '0.5rem';
      if (chipRow.parentElement) chipRow.parentElement.insertBefore(row, chipRow.nextSibling);
      else chipRow.appendChild(row);

      const buttons = [];
      const setActive = (btn, on) => {
        ['active', 'selected', 'bg-blue-600', 'text-white'].forEach(cls => btn.classList.toggle(cls, on));
        if (existingChips[1]) {
          existingChips[1].className.split(' ')
            .filter(c => /active|selected|bg-|text-white/.test(c))
            .forEach(c => btn.classList.toggle(c, on));
        }
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      };

      // Make one chip per category
      categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = baseClasses;
        btn.textContent = cat;
        btn.dataset.cat = cat;
        btn.addEventListener('click', () => {
          buttons.forEach(b => setActive(b, b === btn));
          cardByUpc.forEach((el, upc) => {
            const cats = catByUpc.get(String(upc)) || [];
            el.style.display = cats.includes(cat) ? '' : 'none';
          });
        });
        row.appendChild(btn);
        buttons.push(btn);
      });

      // Wire “All” to clear our filter (if it exists)
      if (existingChips[0]) {
        existingChips[0].addEventListener('click', () => {
          buttons.forEach(b => setActive(b, false));
          cardByUpc.forEach(el => { el.style.display = ''; });
        });
      }
    } catch (_) {
      // silent fail—never break the page
    }
  }
})();

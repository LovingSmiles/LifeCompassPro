/* Life Compass Pro — app.js
   Makes the homepage interactive:
   - Smooth section navigation & active states
   - Journal: save entries to localStorage + render list
   - Vision Board: upload images to localStorage + render gallery
   - Simple toasts/alerts
   - Contact form fake send
   - Small helpers for accessibility
*/

// ===== Utilities =====
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function toast(msg, ms = 2500) {
  let t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function saveLS(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function readLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

// ===== Section navigation =====
function showSectionById(id) {
  $$('.section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById(id) || $('#home');
  sec.classList.add('active');

  // Highlight nav
  const links = $$('header nav a');
  links.forEach(a => a.classList.remove('active'));
  const link = links.find(a => a.getAttribute('href') === `#${id}`);
  if (link) link.classList.add('active');
}

function setupNav() {
  $$('header nav a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.getAttribute('href').replace('#', '');
      history.pushState({ id }, '', `#${id}`);
      showSectionById(id);
    });
  });

  // On load / back-forward
  const hash = (location.hash || '#home').replace('#', '');
  showSectionById(hash);
  window.addEventListener('popstate', (e) => {
    const id = (e.state && e.state.id) || (location.hash || '#home').replace('#','');
    showSectionById(id);
  });
}

// ===== Journal =====
function renderJournalList() {
  const wrap = $('#journal');
  let list = wrap.querySelector('#journalList');
  if (!list) {
    list = document.createElement('div');
    list.id = 'journalList';
    list.className = 'stack-md mt-2';
    wrap.appendChild(list);
  }
  const entries = readLS('lc_journal', []);
  list.innerHTML = '';
  entries.slice().reverse().forEach((e) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <strong>${e.title || '(Untitled)'}</strong>
      <span class="badge">${new Date(e.ts).toLocaleString()}</span>
      <p class="muted">${(e.body || '').replace(/</g,'&lt;')}</p>
      <div class="stack-sm">
        <button class="btn btn-ghost" data-del="${e.id}">Delete</button>
      </div>`;
    list.appendChild(card);
  });

  list.addEventListener('click', (ev) => {
    const id = ev.target.getAttribute('data-del');
    if (!id) return;
    const next = readLS('lc_journal', []).filter(x => x.id !== id);
    saveLS('lc_journal', next);
    renderJournalList();
    toast('Entry deleted');
  }, { once: true });
}

function setupJournal() {
  const wrap = $('#journal');
  if (!wrap) return;
  const title = $('#journal input[type="text"]');
  const body = $('#journal textarea');
  const btn = $('#journal .btn.btn-success');

  btn?.addEventListener('click', (e) => {
    e.preventDefault();
    const entries = readLS('lc_journal', []);
    const item = {
      id: crypto.randomUUID(),
      title: (title?.value || '').trim(),
      body: (body?.value || '').trim(),
      ts: Date.now()
    };
    if (!item.title && !item.body) {
      toast('Write something first 🙂');
      return;
    }
    entries.push(item);
    saveLS('lc_journal', entries);
    title.value = '';
    body.value = '';
    renderJournalList();
    toast('Journal saved');
  });

  renderJournalList();
}

// ===== Vision Board =====
function dataURLFromFile(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(file);
  });
}

async function addVisionImage(dataUrl) {
  const items = readLS('lc_vision', []);
  items.push({ id: crypto.randomUUID(), url: dataUrl, ts: Date.now() });
  saveLS('lc_vision', items);
  renderVision();
}

function renderVision() {
  const grid = $('#vision .gallery');
  if (!grid) return;
  grid.innerHTML = '';

  const items = readLS('lc_vision', []);
  if (!items.length) {
    // Keep placeholders if present in HTML
    return;
  }
  items.slice().reverse().forEach(it => {
    const img = document.createElement('img');
    img.src = it.url;
    img.alt = 'Vision item';
    img.className = 'thumb';
    grid.appendChild(img);
  });
}

function setupVision() {
  const uploadBtn = $('#vision .btn.btn-primary');
  if (!uploadBtn) return;
  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'file';
  hiddenInput.accept = 'image/*';

  uploadBtn.addEventListener('click', () => hiddenInput.click());
  hiddenInput.addEventListener('change', async () => {
    const f = hiddenInput.files?.[0];
    if (!f) return;
    const url = await dataURLFromFile(f);
    await addVisionImage(url);
    toast('Vision image added');
    hiddenInput.value = '';
  });

  renderVision();
}

// ===== Growth Areas simple tabs (visual only) =====
function setupGrowthTabs() {
  const tabs = $$('#growth .tab');
  if (!tabs.length) return;
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const title = $('#growth h3');
      const label = t.textContent.trim();
      if (title) title.textContent = `${label} Growth`;
    });
  });
}

// ===== Pricing buttons (demo only) =====
function setupPricing() {
  $$('#pricing .plan .btn').forEach(b => {
    b.addEventListener('click', () => {
      const plan = b.closest('.plan')?.querySelector('h3')?.textContent || 'Plan';
      toast(`Selected: ${plan} (demo)`);
    });
  });
}

// ===== Contact form (demo send) =====
function setupContact() {
  const form = $('#contact form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    toast('Message sent (demo) — we’ll get back to you 🤍');
    form.reset();
  });
  // Make the button act as submit when clicked
  const btn = $('#contact button.btn-primary');
  btn?.addEventListener('click', (e) => {
    e.preventDefault();
    form.requestSubmit();
  });
}

// ===== Accessibility niceties =====
function setupSkipHashOnLoad() {
  // Ensure focus moves to section on hash navigation for screen readers
  const id = (location.hash || '#home').slice(1);
  const sec = document.getElementById(id);
  if (sec) sec.setAttribute('tabindex', '-1');
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupJournal();
  setupVision();
  setupGrowthTabs();
  setupPricing();
  setupContact();
  setupSkipHashOnLoad();
});
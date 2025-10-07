// Life Compass — local-first journal app
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const KEY = 'life_compass_v1';
const state = JSON.parse(localStorage.getItem(KEY) || '{}');
state.journal = state.journal || [];
state.vision = state.vision || [];
state.goals = state.goals || []; // {id,title,why,due,category,step,col}
state.habits = state.habits || []; // {id,name,area,days: {'2025-10-05':true}, streak}
state.wins = state.wins || []; // quick wins
state.checkins = state.checkins || []; // daily checkins

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

// header nav
const menuBtn = $('#menuBtn');
if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    const list = $('#navList');
    list.classList.toggle('open');
    const exp = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', String(!exp));
  });
}

// theme
const yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();
const darkToggle = $('#darkToggle');
if (darkToggle) {
  darkToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('light');
  });
}

// reset
$('#clearAll')?.addEventListener('click', () => {
  if (confirm('Erase all Life Compass data on this device? This cannot be undone.')) {
    localStorage.removeItem(KEY);
    location.reload();
  }
});

/* -------- Dashboard -------- */
$('#checkinForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  state.checkins.push({
    date: new Date().toISOString(),
    mood: Number(data.get('mood') || 0),
    focus: String(data.get('focus') || ''),
    gratitude: String(data.get('gratitude') || '')
  });
  save();
  $('#checkinMsg').textContent = 'Saved today\'s check‑in ✔';
  e.currentTarget.reset();
});
$('#quickForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const note = new FormData(e.currentTarget).get('note');
  if (!note) return;
  const today = new Date().toISOString().slice(0,10);
  state.journal.unshift({id: crypto.randomUUID(), title: 'Quick Capture', tags: ['#quick'], body: String(note), rating: null, date: today});
  save(); renderJournal();
  e.currentTarget.reset();
});
$('#winsForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(e.currentTarget);
  const win = d.get('win'); const step = d.get('step');
  if (win || step) {
    state.wins.unshift({id: crypto.randomUUID(), win: String(win||''), step: String(step||''), date: new Date().toISOString()});
    save(); renderWins();
    e.currentTarget.reset();
  }
});
function renderWins(){
  const ul = $('#winsList'); if (!ul) return;
  ul.innerHTML = state.wins.slice(0,8).map(w => `<li>✅ ${w.win || '(win)'} — <em>${w.step || 'next small step saved'}</em></li>`).join('');
}
renderWins();

/* -------- Journal -------- */
$('#journalForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  const entry = {
    id: crypto.randomUUID(),
    title: String(data.get('title') || 'Untitled'),
    tags: String(data.get('tags') || '').split(/[,#\s]+/).filter(Boolean).map(t => t.startsWith('#')? t : '#'+t.toLowerCase()),
    body: String(data.get('body') || ''),
    rating: data.get('rating') ? Number(data.get('rating')) : null,
    date: data.get('date') ? String(data.get('date')) : new Date().toISOString().slice(0,10),
  };
  state.journal.unshift(entry); save(); renderJournal(); e.currentTarget.reset();
});

$('#sortNewest')?.addEventListener('click', () => renderJournal({sort:'new'}));
$('#sortOldest')?.addEventListener('click', () => renderJournal({sort:'old'}));
$('#filterTagged')?.addEventListener('click', () => {
  const q = prompt('Show entries with tag (without #):', 'spiritual');
  if (q) renderJournal({tag:'#'+q.toLowerCase()});
});
$('#searchBox')?.addEventListener('input', e => renderJournal({q: e.currentTarget.value}));

function renderJournal(opts={}){
  const list = $('#journalList'); if (!list) return;
  let items = [...state.journal];
  if (opts.q) {
    const q = opts.q.toLowerCase();
    items = items.filter(x => x.title.toLowerCase().includes(q) || x.body.toLowerCase().includes(q) || x.tags.join(' ').toLowerCase().includes(q));
  }
  if (opts.tag) items = items.filter(x => x.tags.includes(opts.tag));
  if (opts.sort === 'old') items = items.reverse();

  list.innerHTML = items.map(x => `
    <article class="item">
      <h4>${escapeHtml(x.title)}</h4>
      <div class="meta">${x.date}${x.rating!=null? ' • peace '+x.rating+'/10' : ''} • ${x.tags.join(' ')}</div>
      <p>${escapeHtml(x.body).slice(0, 600)}</p>
      <div class="tools-row">
        <button class="chip" data-edit="${x.id}">Edit</button>
        <button class="chip danger" data-del="${x.id}">Delete</button>
      </div>
    </article>
  `).join('');

  // bind buttons
  list.querySelectorAll('[data-del]')?.forEach(btn => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-del');
    const i = state.journal.findIndex(e => e.id === id);
    if (i>-1 && confirm('Delete this entry?')) { state.journal.splice(i,1); save(); renderJournal(opts); }
  }));
  list.querySelectorAll('[data-edit]')?.forEach(btn => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-edit');
    const e = state.journal.find(v => v.id===id);
    if (!e) return;
    const body = prompt('Edit entry text:', e.body);
    if (body!=null) { e.body = body; save(); renderJournal(opts); }
  }));
}
renderJournal();

/* -------- Vision -------- */
$('#visionForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const d = new FormData(e.currentTarget);
  const item = {id: crypto.randomUUID(), text: String(d.get('text')||''), img: String(d.get('img')||'')};
  if (!item.text && !item.img) return;
  state.vision.unshift(item); save(); renderVision();
  e.currentTarget.reset();
});
function renderVision(){
  const grid = $('#visionGrid'); if (!grid) return;
  grid.innerHTML = state.vision.map(v => `
    <div class="tile">
      ${v.img? `<img src="${escapeAttr(v.img)}" alt="">` : ''}
      ${v.text? `<p>${escapeHtml(v.text)}</p>` : ''}
      <div class="tools-row"><button class="chip" data-vdel="${v.id}">Remove</button></div>
    </div>`).join('');
  grid.querySelectorAll('[data-vdel]').forEach(b=>b.addEventListener('click',()=>{
    const id = b.getAttribute('data-vdel');
    const i = state.vision.findIndex(x=>x.id===id);
    if(i>-1){state.vision.splice(i,1); save(); renderVision();}
  }));
}
renderVision();

/* -------- Goals / Kanban -------- */
$('#goalForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const d = new FormData(e.currentTarget);
  const g = {
    id: crypto.randomUUID(),
    title: String(d.get('title')||''),
    why: String(d.get('why')||''),
    due: String(d.get('due')||''),
    category: String(d.get('category')||'General'),
    step: String(d.get('step')||''),
    col: 'todo'
  };
  state.goals.push(g); save(); renderGoals();
  e.currentTarget.reset();
});

function renderGoals(){
  $$('.drop').forEach(el => el.innerHTML='');
  state.goals.forEach(g => {
    const card = document.createElement('div');
    card.className='card-goal'; card.draggable=true; card.dataset.id=g.id;
    card.innerHTML = `<strong>${escapeHtml(g.title||'(goal)')}</strong>
      <div class="meta"><span>${escapeHtml(g.category)}</span>${g.due? `<span>due ${g.due}</span>`:''}</div>
      <p>${escapeHtml(g.step)}</p>
      <div class="tools-row"><button class="chip" data-gdel="${g.id}">Remove</button></div>`;
    const host = document.querySelector(\`.col[data-col="\${g.col}"] .drop\`);
    host.appendChild(card);
    card.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/plain', g.id));
  });
  // delete
  document.querySelectorAll('[data-gdel]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.getAttribute('data-gdel');
    const i = state.goals.findIndex(x=>x.id===id);
    if (i>-1){state.goals.splice(i,1); save(); renderGoals();}
  }));
}
renderGoals();

$$('.col').forEach(col => {
  col.addEventListener('dragover', e => e.preventDefault());
  col.addEventListener('drop', e => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const g = state.goals.find(x=>x.id===id);
    if (g) { g.col = col.dataset.col; save(); renderGoals(); }
  });
});

/* -------- Habits -------- */
$('#habitForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const d = new FormData(e.currentTarget);
  const h = {id: crypto.randomUUID(), name: String(d.get('name')||''), area: String(d.get('area')||'General'), days:{}};
  state.habits.push(h); save(); renderHabits();
  e.currentTarget.reset();
});

function renderHabits(){
  const grid = $('#habitGrid'); if (!grid) return;
  const today = new Date();
  const year = today.getFullYear(), month = today.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0..6
  const daysInMonth = new Date(year, month+1, 0).getDate();
  function btn(dateStr, active){ return `<button data-day="${dateStr}" class="${active?'active':''}">${dateStr.split('-')[2]}</button>` }

  grid.innerHTML = state.habits.map(h => {
    // build calendar for current month
    const cells = [];
    for (let i=0;i<startWeekday;i++) cells.push('<span></span>');
    for (let d=1; d<=daysInMonth; d++){
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells.push(btn(ds, !!h.days[ds]));
    }
    const streak = Object.keys(h.days).sort().reduce((acc,day)=>{
      // naive: count total marked days
      return acc + (h.days[day]?1:0);
    },0);
    return `<div class="habit">
      <h4>${escapeHtml(h.name||'(habit)')}</h4>
      <div class="meta">${escapeHtml(h.area)} • <span class="streak">${streak}</span> days</div>
      <div class="calendar">${cells.join('')}</div>
      <div class="tools-row"><button class="chip" data-hdel="${h.id}">Remove</button></div>
    </div>`;
  }).join('');

  // bind toggles
  grid.querySelectorAll('.calendar button').forEach(b=>b.addEventListener('click', ()=>{
    const ds = b.getAttribute('data-day');
    const idx = Array.from(grid.children).indexOf(b.closest('.habit'));
    const habit = state.habits[idx];
    habit.days[ds] = !habit.days[ds];
    save(); renderHabits();
  }));
  grid.querySelectorAll('[data-hdel]').forEach(b=>b.addEventListener('click', ()=>{
    const id = b.getAttribute('data-hdel');
    const i = state.habits.findIndex(x=>x.id===id);
    if (i>-1){state.habits.splice(i,1); save(); renderHabits();}
  }));
}
renderHabits();

/* -------- Export / Import -------- */
$('#exportBtn')?.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `life_compass_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

$('#importBtn')?.addEventListener('click', async () => {
  const file = $('#importFile').files[0];
  if (!file) return alert('Choose a backup file first.');
  if (!confirm('Import will REPLACE current data on this device. Continue?')) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    localStorage.setItem(KEY, JSON.stringify(data));
    alert('Import complete. Reloading…');
    location.reload();
  } catch (e) {
    alert('Invalid JSON file.');
  }
});

/* -------- helpers -------- */
function escapeHtml(str=''){ return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escapeAttr(str=''){ return str.replace(/"/g, '&quot;'); }

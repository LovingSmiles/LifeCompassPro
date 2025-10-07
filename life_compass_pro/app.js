// Life Compass Pro — App logic
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const ROOT_KEY = 'lcp_root_v1'; // holds accounts {users:[], currentEmail}
const DATA_PREFIX = 'lcp_data_'; // per-user payload

const root = JSON.parse(localStorage.getItem(ROOT_KEY) || '{"users":[]}');
function saveRoot(){ localStorage.setItem(ROOT_KEY, JSON.stringify(root)); }
function dataKey(email){ return DATA_PREFIX + email.toLowerCase(); }

function hash(s){ // NOT secure, demo only
  let h = 0; for (let i=0;i<s.length;i++) { h = (h<<5)-h + s.charCodeAt(i); h |= 0; } return String(h);
}

// per-user state helpers
function loadState(email){
  const raw = localStorage.getItem(dataKey(email));
  const obj = raw? JSON.parse(raw) : {};
  // init buckets
  obj.journal = obj.journal || [];
  obj.vision = obj.vision || [];
  obj.goals = obj.goals || [];
  obj.habits = obj.habits || [];
  obj.areas = obj.areas || {}; // area -> entries [{ts,text}]
  obj.planner = obj.planner || {}; // 'YYYY-MM-DD' -> [{id,text,tag,done}]
  obj.checkins = obj.checkins || [];
  obj.upcoming = obj.upcoming || [];
  return obj;
}
function saveState(email, obj){
  localStorage.setItem(dataKey(email), JSON.stringify(obj));
}

// UI refs
const authScreen = $('#authScreen');
const appHeader = $('#appHeader');
const mainEl = $('#main');
const appFooter = $('#appFooter');
const userBadge = $('#userBadge');

let user = null; // {email,name?,passwordHash}
let state = null;

function setSignedIn(u){
  user = u;
  root.currentEmail = u.email;
  saveRoot();
  state = loadState(u.email);
  authScreen.hidden = true;
  appHeader.hidden = false;
  mainEl.hidden = false;
  appFooter.hidden = false;
  userBadge.textContent = u.email;
  renderAll();
  checkReminders();
}

function signOut(){
  user = null; state = null;
  authScreen.hidden = false;
  appHeader.hidden = true;
  mainEl.hidden = true;
  appFooter.hidden = true;
}

function findUser(email){ return root.users.find(u => u.email.toLowerCase() === email.toLowerCase()); }

// Auth form
$('#authForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const d = new FormData(e.currentTarget);
  const email = String(d.get('email')).trim();
  const pw = String(d.get('password'));
  const existing = findUser(email);
  if (!existing) {
    $('#authMsg').textContent = 'No account. Click "Create account" first.';
    return;
  }
  if (existing.passwordHash !== hash(pw)) {
    $('#authMsg').textContent = 'Incorrect password.';
    return;
  }
  setSignedIn(existing);
});
$('#signupBtn').addEventListener('click', ()=>{
  const email = prompt('Email:');
  const password = email? prompt('Create password (8+ chars recommended):') : null;
  if (!email || !password) return;
  if (findUser(email)) { alert('Account already exists.'); return; }
  const u = {email, passwordHash: hash(password)};
  root.users.push(u); saveRoot();
  alert('Account created on this device. Sign in now.');
});

$('#signOut')?.addEventListener('click', ()=>{
  if (confirm('Sign out?')) signOut();
});

// Restore session
if (root.currentEmail && findUser(root.currentEmail)) {
  setSignedIn(findUser(root.currentEmail));
} else {
  authScreen.hidden = false;
}

// Header nav
$('#menuBtn')?.addEventListener('click', () => {
  const list = $('#navList');
  list.classList.toggle('open');
  const exp = $('#menuBtn').getAttribute('aria-expanded') === 'true';
  $('#menuBtn').setAttribute('aria-expanded', String(!exp));
});

/* ------------ Dashboard ------------ */
$('#checkinForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const d = new FormData(e.currentTarget);
  state.checkins.push({
    date: new Date().toISOString(),
    mood: Number(d.get('mood')||0),
    focus: String(d.get('focus')||''),
    gratitude: String(d.get('gratitude')||'')
  });
  saveState(user.email, state);
  $('#checkinMsg').textContent = 'Saved ✔';
  e.currentTarget.reset();
  renderUpcoming();
});
$('#quickForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const note = new FormData(e.currentTarget).get('note');
  if (!note) return;
  const today = new Date().toISOString().slice(0,10);
  state.journal.unshift({id:crypto.randomUUID(), title:'Quick Capture', tags:['#quick'], body:String(note), date:today, imgId:null});
  saveState(user.email, state);
  e.currentTarget.reset();
  renderJournal();
});

function renderUpcoming(){
  const ul = $('#upcomingList'); if (!ul) return;
  const today = new Date().toISOString().slice(0,10);
  // Build from planner
  const items = Object.entries(state.planner).flatMap(([date, arr]) => arr.map(t => ({date, ...t})));
  const soon = items.filter(x => !x.done && x.date >= today).sort((a,b) => a.date.localeCompare(b.date)).slice(0,8);
  ul.innerHTML = soon.length? soon.map(x => `
    <li>⏰ <strong>${x.date}</strong> — ${escapeHtml(x.text)} ${x.tag? '<em>'+escapeHtml(x.tag)+'</em>':''}</li>
  `).join('') : '<li class="muted">Nothing scheduled.</li>';
}

/* ------------ Journal ------------ */
$('#journalForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const f = e.currentTarget;
  const d = new FormData(f);
  let imgId = null;
  const file = d.get('img');
  if (file && file.size) {
    imgId = crypto.randomUUID();
    await idbPutImage({id: imgId, user: user.email, name: file.name, type: file.type, data: file, created: Date.now()});
  }
  const entry = {
    id: crypto.randomUUID(),
    title: String(d.get('title')||'Untitled'),
    tags: String(d.get('tags')||'').split(/[,#\s]+/).filter(Boolean).map(t => t.startsWith('#')? t : '#'+t.toLowerCase()),
    body: String(d.get('body')||''),
    date: d.get('date')? String(d.get('date')) : new Date().toISOString().slice(0,10),
    imgId
  };
  state.journal.unshift(entry); saveState(user.email, state);
  f.reset(); renderJournal();
});

$('#sortNewest')?.addEventListener('click', ()=> renderJournal({sort:'new'}));
$('#sortOldest')?.addEventListener('click', ()=> renderJournal({sort:'old'}));
$('#filterTagged')?.addEventListener('click', ()=>{
  const q = prompt('Tag (without #):','spiritual'); if (q) renderJournal({tag:'#'+q.toLowerCase()});
});
$('#searchBox')?.addEventListener('input', e => renderJournal({q: e.currentTarget.value}));

async function renderJournal(opts={}){
  const list = $('#journalList'); if (!list) return;
  let items = [...state.journal];
  if (opts.q){ const q = opts.q.toLowerCase(); items = items.filter(x => (x.title+x.body+x.tags.join(' ')).toLowerCase().includes(q)); }
  if (opts.tag){ items = items.filter(x => x.tags.includes(opts.tag)); }
  if (opts.sort==='old') items = items.reverse();
  const rows = await Promise.all(items.map(async x => {
    let imgUrl = '';
    if (x.imgId){ const rec = await idbGetImage(x.imgId); if (rec) imgUrl = URL.createObjectURL(rec.data); }
    return `<article class="item">
      <h4>${escapeHtml(x.title)}</h4>
      <div class="meta">${x.date} • ${x.tags.join(' ')}</div>
      ${imgUrl? `<img src="${imgUrl}" alt="" style="border-radius:.6rem;max-height:220px;object-fit:cover">`:''}
      <p>${escapeHtml(x.body)}</p>
      <div class="tools-row">
        <button class="chip" data-edit="${x.id}">Edit</button>
        <button class="chip danger" data-del="${x.id}">Delete</button>
      </div>
    </article>`;
  }));
  list.innerHTML = rows.join('');
  list.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', ()=>{
    const id = btn.getAttribute('data-del');
    const i = state.journal.findIndex(e => e.id===id);
    if (i>-1 && confirm('Delete this entry?')) { state.journal.splice(i,1); saveState(user.email, state); renderJournal(opts); }
  }));
  list.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', ()=>{
    const id = btn.getAttribute('data-edit');
    const e = state.journal.find(v=>v.id===id);
    if (!e) return;
    const body = prompt('Edit text:', e.body);
    if (body!=null){ e.body = body; saveState(user.email,state); renderJournal(opts); }
  }));
}
/* ------------ Vision w/ image upload ------------ */
$('#visionForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const d = new FormData(e.currentTarget);
  const text = String(d.get('text')||'');
  let imgId = null;
  const file = d.get('img');
  if (file && file.size){
    imgId = crypto.randomUUID();
    await idbPutImage({id: imgId, user:user.email, name:file.name, type:file.type, data:file, created: Date.now()});
  }
  if (!text && !imgId) return;
  state.vision.unshift({id:crypto.randomUUID(), text, imgId});
  saveState(user.email,state);
  e.currentTarget.reset(); renderVision();
});

async function renderVision(){
  const grid = $('#visionGrid'); if (!grid) return;
  const items = await Promise.all(state.vision.map(async v => {
    let img = '';
    if (v.imgId){ const rec = await idbGetImage(v.imgId); if (rec) img = URL.createObjectURL(rec.data); }
    return `<div class="tile">
      ${img? `<img src="${img}" alt="">` : ''}
      ${v.text? `<p>${escapeHtml(v.text)}</p>`:''}
      <div class="tools-row">
        <button class="chip" data-vdel="${v.id}">Remove</button>
      </div>
    </div>`;
  }));
  grid.innerHTML = items.join('');
  grid.querySelectorAll('[data-vdel]').forEach(b=>b.addEventListener('click',()=>{
    const id = b.getAttribute('data-vdel');
    const i = state.vision.findIndex(x=>x.id===id);
    if (i>-1){ state.vision.splice(i,1); saveState(user.email,state); renderVision(); }
  }));
}

/* ------------ Gallery (IndexedDB) ------------ */
$('#galleryForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const files = e.currentTarget.photos.files;
  if (!files || !files.length) return;
  for (const file of files){
    const id = crypto.randomUUID();
    await idbPutImage({id, user:user.email, name:file.name, type:file.type, data:file, created: Date.now()});
  }
  e.currentTarget.reset();
  renderGallery();
});

async function renderGallery(){
  const grid = $('#galleryGrid'); if (!grid) return;
  const list = await idbListImages(user.email);
  const cards = list.map(rec => {
    const url = URL.createObjectURL(rec.data);
    return `<div class="tile">
      <img src="${url}" alt="">
      <div class="tools-row">
        <a class="btn btn--ghost" href="${url}" download="${rec.name}">Download</a>
        <button class="chip danger" data-delimg="${rec.id}">Delete</button>
      </div>
    </div>`;
  });
  grid.innerHTML = cards.join('');
  grid.querySelectorAll('[data-delimg]').forEach(b=>b.addEventListener('click', async ()=>{
    const id = b.getAttribute('data-delimg');
    await idbDeleteImage(id);
    renderGallery();
  }));
}

/* ------------ Goals (Kanban) ------------ */
$('#goalForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const d = new FormData(e.currentTarget);
  const g = {
    id: crypto.randomUUID(),
    title: String(d.get('title')||''),
    why: String(d.get('why')||''),
    due: String(d.get('due')||''),
    category: String(d.get('category')||''),
    step: String(d.get('step')||''),
    col: 'todo'
  };
  state.goals.push(g); saveState(user.email,state); e.currentTarget.reset(); renderGoals();
});

function renderGoals(){
  $$('.drop').forEach(el => el.innerHTML='');
  state.goals.forEach(g => {
    const card = document.createElement('div');
    card.className='card-goal'; card.draggable=true; card.dataset.id=g.id;
    card.innerHTML = `<strong>${escapeHtml(g.title||'(goal)')}</strong>
      <div class="meta">${escapeHtml(g.category)} ${g.due? '• due '+g.due:''}</div>
      <p>${escapeHtml(g.step)}</p>
      <div class="tools-row"><button class="chip" data-gdel="${g.id}">Remove</button></div>`;
    const host = document.querySelector(\`.col[data-col="\${g.col}"] .drop\`);
    host.appendChild(card);
    card.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/plain', g.id));
  });
  document.querySelectorAll('[data-gdel]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.getAttribute('data-gdel'); const i=state.goals.findIndex(x=>x.id===id);
    if (i>-1){ state.goals.splice(i,1); saveState(user.email,state); renderGoals(); }
  }));
}
renderGoals();
$$('.col').forEach(col => {
  col.addEventListener('dragover', e => e.preventDefault());
  col.addEventListener('drop', e => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const g = state.goals.find(x=>x.id===id);
    if (g) { g.col = col.dataset.col; saveState(user.email,state); renderGoals(); }
  });
});

/* ------------ Habits ------------ */
$('#habitForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const d = new FormData(e.currentTarget);
  const h = {id: crypto.randomUUID(), name:String(d.get('name')||''), area:String(d.get('area')||'General'), days:{}};
  state.habits.push(h); saveState(user.email,state); e.currentTarget.reset(); renderHabits();
});
function renderHabits(){
  const grid = $('#habitGrid'); if (!grid) return;
  const today = new Date();
  const year = today.getFullYear(), month = today.getMonth();
  const first = new Date(year, month, 1);
  const startW = first.getDay(); const daysInMonth = new Date(year, month+1, 0).getDate();
  function btn(ds, on){ return `<button data-day="${ds}" class="${on?'active':''}">${ds.split('-')[2]}</button>` }
  grid.innerHTML = state.habits.map(h => {
    const cells = [];
    for (let i=0;i<startW;i++) cells.push('<span></span>');
    for (let d=1; d<=daysInMonth; d++){
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells.push(btn(ds, !!h.days[ds]));
    }
    const streak = Object.values(h.days).filter(Boolean).length;
    return `<div class="habit">
      <h4>${escapeHtml(h.name||'(habit)')}</h4>
      <div class="meta">${escapeHtml(h.area)} • <strong>${streak}</strong> days</div>
      <div class="calendar">${cells.join('')}</div>
      <div class="tools-row"><button class="chip" data-hdel="${h.id}">Remove</button></div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.calendar button').forEach(b=>b.addEventListener('click', ()=>{
    const ds = b.getAttribute('data-day');
    const idx = Array.from(grid.children).indexOf(b.closest('.habit'));
    const habit = state.habits[idx];
    habit.days[ds] = !habit.days[ds]; saveState(user.email,state); renderHabits();
  }));
  grid.querySelectorAll('[data-hdel]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.getAttribute('data-hdel'); const i=state.habits.findIndex(x=>x.id===id);
    if (i>-1){ state.habits.splice(i,1); saveState(user.email,state); renderHabits(); }
  }));
}
renderHabits();

/* ------------ Growth Areas (click to add ideas) ------------ */
const AREA_LIST = ['Spiritual','Physical','Financial','Emotional','Mental','Relationships'];
function renderAreas(){
  const grid = $('#areaGrid'); if (!grid) return;
  grid.innerHTML = AREA_LIST.map(area => {
    const entries = (state.areas[area]||[]).slice(0,5);
    return `<article class="card">
      <h3>${area}</h3>
      <ul class="list small">${entries.map(e=> `<li>${new Date(e.ts).toLocaleString()} — ${escapeHtml(e.text)}</li>`).join('') || '<li class="muted">No notes yet.</li>'}</ul>
      <div class="tools-row"><button class="btn btn--ghost" data-area="${area}">Add idea</button></div>
    </article>`;
  }).join('');
  grid.querySelectorAll('[data-area]').forEach(b=>b.addEventListener('click',()=> openAreaModal(b.getAttribute('data-area'))));
}
function openAreaModal(area){
  const modal = $('#modal'); $('#modalTitle').textContent = area + ' — quick log';
  $('#modalBody').innerHTML = `
    <form id="areaForm" class="form">
      <label>When <select name="when"><option value="now">Now</option><option value="hour">This hour</option><option value="day">Today</option><option value="week">This week</option></select></label>
      <label>Note <textarea name="text" rows="4" placeholder="What did you do or learn?"></textarea></label>
      <button class="btn" type="submit">Save</button>
    </form>
    <hr style="opacity:.2">
    <div class="list" id="areaList">${(state.areas[area]||[]).slice(0,20).map(e => `<div class="item"><div class="meta">${new Date(e.ts).toLocaleString()}</div><p>${escapeHtml(e.text)}</p></div>`).join('')}</div>
  `;
  $('#areaForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const txt = String(d.get('text')||'').trim(); if (!txt) return;
    state.areas[area] = state.areas[area] || [];
    state.areas[area].unshift({ts: Date.now(), text: txt, scope: d.get('when')});
    saveState(user.email,state); renderAreas(); modal.close();
  });
  modal.showModal();
}
renderAreas();

/* ------------ Planner (100-year) ------------ */
const yearPicker = $('#yearPicker');
const yearGrid = $('#yearGrid');
$('#todayBtn')?.addEventListener('click', ()=> { const y = new Date().getFullYear(); yearPicker.value = y; renderYear(y); });

function initPlanner(){
  const y0 = new Date().getFullYear();
  yearPicker.value = y0;
  yearPicker.min = String(y0);
  yearPicker.max = String(y0 + 100);
  yearPicker.addEventListener('change', ()=> renderYear(Number(yearPicker.value)));
  renderYear(y0);
}
function renderYear(year){
  yearGrid.innerHTML = '';
  for (let m=0;m<12;m++){
    const first = new Date(year, m, 1);
    const days = new Date(year, m+1, 0).getDate();
    const startW = first.getDay();
    const cells = [];
    for (let i=0;i<startW;i++) cells.push('<span></span>');
    for (let d=1; d<=days; d++){
      const ds = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const has = (state.planner[ds]||[]).some(t => !t.done);
      cells.push(`<button class="${has?'dot':''}" data-date="${ds}">${d}</button>`);
    }
    const box = document.createElement('div');
    box.className='month';
    box.innerHTML = `<h4>${first.toLocaleString(undefined,{month:'long'})} ${year}</h4><div class="cal">${cells.join('')}</div>`;
    yearGrid.appendChild(box);
  }
  yearGrid.querySelectorAll('button[data-date]').forEach(b=> b.addEventListener('click', ()=> openDateModal(b.getAttribute('data-date'))));
}

function openDateModal(ds){
  const modal = $('#modal'); $('#modalTitle').textContent = `Planner — ${ds}`;
  const items = state.planner[ds] || [];
  $('#modalBody').innerHTML = `
    <form id="planForm" class="form">
      <label>To-do / note <input name="text" placeholder="What needs to happen?"></label>
      <label>Topic tag (optional) <input name="tag" placeholder="#spiritual, #school"></label>
      <button class="btn" type="submit">Add</button>
    </form>
    <div class="list" id="planList">
      ${items.map((t,i)=> `<div class="item"><div class="tools-row">
          <input type="checkbox" data-tgl="${i}" ${t.done?'checked':''}>
          <span>${escapeHtml(t.text)}</span> <em class="muted">${escapeHtml(t.tag||'')}</em>
          <button class="chip danger" data-del="${i}">Delete</button>
        </div></div>`).join('') || '<div class="muted small">Nothing yet.</div>'}
    </div>
  `;
  $('#planForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const t = {id: crypto.randomUUID(), text:String(d.get('text')||''), tag:String(d.get('tag')||''), date: ds, done:false};
    if (!t.text) return;
    state.planner[ds] = state.planner[ds] || []; state.planner[ds].unshift(t);
    saveState(user.email,state); renderYear(Number(ds.slice(0,4))); renderUpcoming(); openDateModal(ds);
  });
  $('#planList').querySelectorAll('[data-tgl]').forEach(cb=> cb.addEventListener('change', ()=>{
    const i = Number(cb.getAttribute('data-tgl'));
    state.planner[ds][i].done = cb.checked; saveState(user.email,state); renderYear(Number(ds.slice(0,4))); renderUpcoming();
  }));
  $('#planList').querySelectorAll('[data-del]').forEach(btn=> btn.addEventListener('click', ()=>{
    const i = Number(btn.getAttribute('data-del'));
    state.planner[ds].splice(i,1); if (!state.planner[ds].length) delete state.planner[ds];
    saveState(user.email,state); renderYear(Number(ds.slice(0,4))); renderUpcoming(); openDateModal(ds);
  }));
  modal.showModal();
}

/* ------------ Settings / Backup / Notifications ------------ */
$('#exportBtn')?.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `life_compass_pro_${user.email.replace(/[^a-z0-9]+/gi,'_')}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
$('#importBtn')?.addEventListener('click', async ()=>{
  const f = $('#importFile').files[0]; if (!f) return alert('Choose a file first.');
  if (!confirm('Import will replace your current data for this account. Continue?')) return;
  const text = await f.text();
  try { const data = JSON.parse(text); saveState(user.email,data); alert('Import complete. Reloading…'); location.reload(); }
  catch { alert('Invalid JSON file.'); }
});
$('#darkToggle')?.addEventListener('click', ()=> document.documentElement.classList.toggle('light'));
$('#clearAll')?.addEventListener('click', ()=>{
  if (confirm('Erase ALL data for this signed-in account on this device?')) {
    localStorage.removeItem(dataKey(user.email)); location.reload();
  }
});

$('#notifyBtn')?.addEventListener('click', async ()=>{
  if (!('Notification' in window)) return alert('Notifications not supported in this browser.');
  const perm = await Notification.requestPermission();
  alert('Notification permission: ' + perm);
});

function notify(msg){
  if ('Notification' in window && Notification.permission === 'granted') new Notification('Life Compass Pro', {body: msg});
}

/* ------------ Alerts on visit ------------ */
function checkReminders(){
  const today = new Date().toISOString().slice(0,10);
  const items = (state.planner[today]||[]).filter(t=>!t.done);
  if (items.length){
    notify(`You have ${items.length} item(s) due today.`);
    // Also show in modal
    const modal = $('#modal');
    $('#modalTitle').textContent = 'Today\'s reminders';
    $('#modalBody').innerHTML = '<ul>' + items.map(t => `<li>${escapeHtml(t.text)} ${t.tag? '<em class="muted">'+escapeHtml(t.tag)+'</em>':''}</li>`).join('') + '</ul>' +
      '<p class="muted small">You can find them in Planner → Today.</p>';
    modal.showModal();
  }
}

/* ------------ Render orchestration ------------ */
function renderAll(){
  renderUpcoming();
  renderJournal();
  renderVision();
  renderGallery();
  renderGoals();
  renderHabits();
  renderAreas();
  initPlanner();
  // Footer year
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
}

function escapeHtml(str=''){ return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

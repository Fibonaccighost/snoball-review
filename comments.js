// On-page comment tool for local review. dev/serve.py injects this into every page; it is not part of the site.
// Click "Comment" (or press C), click any element, write the note. Comments are saved to dev/comments.json.
// On the hosted review link (review/build.py), window.__commentRemote points it at Supabase instead.
(() => {
  if (window.__snoComments) return;
  window.__snoComments = true;

  const API = '/__comments';
  const REMOTE = window.__commentRemote; // { url, key } on the hosted review link
  const PAGE = location.pathname.split('/').pop() || 'index.html';
  const CATEGORIES = ['Animation', 'Bug', 'Change', 'Question'];
  let comments = [];
  let commenting = false;
  let showAll = false;

  // ---------- Shadow DOM so the site's CSS and the tool's CSS never touch ----------
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;z-index:2147483000;';
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  button { font: inherit; cursor: pointer; }
  .ease { transition: opacity .3s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1); }
  .bar { position: fixed; right: 16px; bottom: 16px; display: flex; gap: 8px; }
  .bar button { height: 40px; padding: 0 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,.16);
    background: #181818; color: #fff; font-size: 14px; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,.35); }
  .bar button:hover { background: #272727; }
  .bar button:focus-visible, .pop button:focus-visible, .panel button:focus-visible { outline: 2px solid #ff3fa4; outline-offset: 2px; }
  .bar .toggle.on { background: #ff3fa4; border-color: #ff3fa4; }
  .hint { position: fixed; left: 50%; top: 92px; transform: translateX(-50%); padding: 8px 16px; border-radius: 20px;
    background: #ff3fa4; color: #fff; font-size: 13px; font-weight: 600; pointer-events: none; }
  .hl { position: fixed; pointer-events: none; border: 2px solid #ff3fa4; background: rgba(255,63,164,.08); border-radius: 4px; display: none; }
  .hl span { position: absolute; left: -2px; bottom: 100%; margin-bottom: 4px; padding: 2px 8px; border-radius: 4px;
    background: #ff3fa4; color: #fff; font-size: 12px; white-space: nowrap; max-width: 480px; overflow: hidden; text-overflow: ellipsis; }
  .pin { position: absolute; width: 28px; height: 28px; margin: -14px 0 0 -14px; border-radius: 50% 50% 50% 4px;
    background: #ff3fa4; color: #fff; font-size: 12px; font-weight: 700; border: 2px solid #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,.35); display: grid; place-items: center; padding: 0; }
  .pin.resolved { background: #313131; }
  /* Pins stay out of the way: hidden while browsing, open ones shown in comment mode, all shown with the list open */
  .layer[data-show="none"] { display: none; }
  .layer[data-show="open"] .pin.resolved { display: none; }
  .pin:hover { transform: scale(1.12); }
  .pin.flash { animation: flash 1.2s cubic-bezier(.22,1,.36,1) 2; }
  @keyframes flash { 50% { transform: scale(1.5); } }
  .pop { position: fixed; width: 320px; padding: 16px; border-radius: 16px; background: #181818; color: #fff;
    border: 1px solid rgba(255,255,255,.16); box-shadow: 0 16px 48px rgba(0,0,0,.45); }
  .pop[hidden], .panel[hidden], .hint[hidden] { display: none; }
  .meta { font-size: 12px; color: #9b9b9b; line-height: 16px; margin-bottom: 8px; word-break: break-word; }
  .meta b { color: #fff; font-weight: 600; }
  .cats { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
  .cats button { padding: 4px 8px; border-radius: 12px; border: 1px solid rgba(255,255,255,.2); background: none; color: #fff; font-size: 12px; }
  .cats button.on { background: #fff; color: #000; }
  textarea { width: 100%; min-height: 96px; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,.2);
    background: #000; color: #fff; font-size: 14px; line-height: 20px; resize: vertical; }
  textarea:focus { outline: 2px solid #ff3fa4; outline-offset: 0; }
  input.who { width: 100%; margin-bottom: 8px; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,.2);
    background: rgba(255,255,255,.06); color: inherit; font: inherit; }
  input.who:focus { outline: 2px solid #ff3fa4; outline-offset: 0; }
  .text { font-size: 14px; line-height: 20px; white-space: pre-wrap; margin-bottom: 12px; }
  .row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
  .row button { padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,.2); background: none; color: #fff; font-size: 13px; font-weight: 600; }
  .row button.primary { background: #ff3fa4; border-color: #ff3fa4; }
  .row button.danger { color: #ff6b6b; margin-right: auto; }
  .err { color: #ff6b6b; font-size: 12px; margin-top: 8px; }
  .panel { position: fixed; top: 92px; right: 16px; bottom: 72px; width: 360px; display: flex; flex-direction: column;
    border-radius: 16px; background: #181818; color: #fff; border: 1px solid rgba(255,255,255,.16); box-shadow: 0 16px 48px rgba(0,0,0,.45); }
  .panel header { display: flex; align-items: center; gap: 8px; padding: 16px; border-bottom: 1px solid rgba(255,255,255,.1); font-size: 14px; font-weight: 600; }
  .panel header label { margin-left: auto; font-size: 12px; font-weight: 400; color: #9b9b9b; display: flex; gap: 4px; align-items: center; }
  .panel ol { list-style: none; margin: 0; padding: 8px; overflow: auto; flex: 1; }
  .panel li button { width: 100%; text-align: left; padding: 12px; border-radius: 8px; border: 0; background: none; color: #fff; display: block; }
  .panel li button:hover { background: #272727; }
  .panel li .t { font-size: 13px; line-height: 18px; margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .panel li.resolved { opacity: .5; }
  .tag { display: inline-block; padding: 0 6px; border-radius: 4px; background: #313131; font-size: 11px; line-height: 16px; margin-right: 4px; }
  .empty { padding: 24px 16px; font-size: 13px; color: #9b9b9b; line-height: 20px; }
  @media (prefers-reduced-motion: reduce) { .ease, .pin { transition: none; } .pin.flash { animation: none; } }
</style>
<div class="layer"></div>
<div class="hl"><span></span></div>
<div class="hint" hidden>Click any element to comment · Esc to stop</div>
<div class="pop" hidden></div>
<aside class="panel" hidden aria-label="Comments"></aside>
<div class="bar">
  <button class="list-btn" type="button">Comments</button>
  <button class="toggle" type="button" aria-pressed="false">Comment</button>
</div>`;

  const $ = (s) => root.querySelector(s);
  const layer = $('.layer'), hl = $('.hl'), hint = $('.hint'), pop = $('.pop'), panel = $('.panel');
  const toggleBtn = $('.toggle'), listBtn = $('.list-btn');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isTool = (e) => e.composedPath().includes(host);
  // Visitors on the shared link (the server marks them) add comments with their name; only the local session
  // can resolve or delete
  const GUEST = !!window.__commentGuest || !!REMOTE;
  const NAME_KEY = 'snoball-comment-name';
  const getName = () => { try { return localStorage.getItem(NAME_KEY) || ''; } catch (_) { return ''; } };
  const setName = (v) => { try { localStorage.setItem(NAME_KEY, v); } catch (_) { /* private mode */ } };

  // ---------- Describing the element that was clicked ----------
  function cssPath(el) {
    const parts = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      if (el.id) { parts.unshift('#' + CSS.escape(el.id)); break; }
      let part = el.tagName.toLowerCase();
      const cls = [...el.classList].find((c) => !c.startsWith('is-'));
      if (cls) part += '.' + CSS.escape(cls);
      const same = [...el.parentElement.children].filter((c) => c.tagName === el.tagName);
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(el) + 1})`;
      parts.unshift(part);
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  const snippet = (el) => (el.innerText || el.getAttribute('alt') || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  function describe(el) {
    const cls = [...el.classList].filter((c) => !c.startsWith('is-')).join('.');
    const text = snippet(el);
    return `<${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}>${text ? ` "${text}"` : ''}`;
  }
  function sectionOf(el) {
    const sec = el.closest('section, header, footer');
    if (!sec) return 'page';
    const name = sec.className.split(' ')[0] || sec.tagName.toLowerCase();
    const heading = sec.querySelector('h1, h2');
    return heading ? `${name} — ${snippet(heading)}` : name;
  }

  // ---------- Data ----------
  async function api(method, url, body) {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }
  async function remote(method, body) {
    const res = await fetch(`${REMOTE.url}/rest/v1/comments?select=*&order=id`, {
      method,
      headers: { apikey: REMOTE.key, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: body && JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }
  async function refresh() {
    try { comments = REMOTE ? await remote('GET') : await api('GET', API); } catch { comments = []; }
    renderPins();
    renderPanel();
  }
  const pageComments = () => comments.filter((c) => c.page === PAGE);

  // ---------- Pins ----------
  function pinPosition(c) {
    let el = null;
    try { el = document.querySelector(c.selector); } catch {}
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + scrollX + r.width * (c.ox ?? .5), y: r.top + scrollY + r.height * (c.oy ?? .5) };
  }
  function renderPins() {
    layer.innerHTML = '';
    pageComments().forEach((c) => {
      const p = pinPosition(c);
      if (!p) return;
      const pin = document.createElement('button');
      pin.className = 'pin ease' + (c.status === 'resolved' ? ' resolved' : '');
      pin.textContent = c.id;
      pin.dataset.id = c.id;
      pin.title = c.text;
      pin.style.left = p.x + 'px';
      pin.style.top = p.y + 'px';
      pin.addEventListener('click', (e) => { e.stopPropagation(); openView(c, e.clientX, e.clientY); });
      layer.appendChild(pin);
    });
  }
  const relayout = () => { if (layer.childElementCount || pageComments().length) renderPins(); };
  addEventListener('resize', relayout);
  addEventListener('load', relayout);
  setInterval(relayout, 1500); // carousels, fonts and images can move elements after load

  // ---------- Popover ----------
  function place(x, y) {
    pop.hidden = false;
    const w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.max(16, Math.min(x + 12, innerWidth - w - 16)) + 'px';
    pop.style.top = Math.max(16, Math.min(y + 12, innerHeight - h - 16)) + 'px';
  }
  const closePop = () => { pop.hidden = true; pop.innerHTML = ''; };

  function openNew(el, e) {
    const r = el.getBoundingClientRect();
    const draft = {
      page: PAGE,
      selector: cssPath(el),
      section: sectionOf(el),
      element: describe(el),
      ox: r.width ? +((e.clientX - r.left) / r.width).toFixed(3) : .5,
      oy: r.height ? +((e.clientY - r.top) / r.height).toFixed(3) : .5,
      viewport: `${innerWidth}x${innerHeight}`,
      category: 'Animation',
    };
    pop.innerHTML = `
      <div class="meta"><b>${esc(draft.section)}</b><br>${esc(draft.element)}</div>
      <div class="cats">${CATEGORIES.map((c) => `<button type="button" class="${c === draft.category ? 'on' : ''}">${c}</button>`).join('')}</div>
      <input class="who" type="text" placeholder="Your name" value="${esc(getName())}" aria-label="Your name">
      <textarea placeholder="What should happen here? What's wrong?"></textarea>
      <div class="err" hidden></div>
      <div class="row"><button type="button" class="cancel">Cancel</button><button type="button" class="primary save">Save · ⌘↵</button></div>`;
    pop.querySelectorAll('.cats button').forEach((b) => b.addEventListener('click', () => {
      draft.category = b.textContent;
      pop.querySelectorAll('.cats button').forEach((x) => x.classList.toggle('on', x === b));
    }));
    const ta = pop.querySelector('textarea'), err = pop.querySelector('.err'), who = pop.querySelector('.who');
    const save = async () => {
      if (GUEST && !who.value.trim()) { err.hidden = false; err.textContent = 'Add your name so we know who left it.'; who.focus(); return; }
      if (!ta.value.trim()) { err.hidden = false; err.textContent = 'Write the comment first.'; ta.focus(); return; }
      setName(who.value.trim());
      try {
        const body = { ...draft, text: ta.value.trim(), author: who.value.trim() };
        const saved = REMOTE ? (await remote('POST', body))[0] : await api('POST', API, body);
        comments.push(saved);
        closePop(); renderPins(); renderPanel();
      } catch (ex) { err.hidden = false; err.textContent = GUEST ? `Not saved (${ex.message}). Try again in a moment.` : `Not saved (${ex.message}). Is dev/serve.py running?`; }
    };
    pop.querySelector('.save').addEventListener('click', save);
    pop.querySelector('.cancel').addEventListener('click', closePop);
    ta.addEventListener('keydown', (k) => { if (k.key === 'Enter' && (k.metaKey || k.ctrlKey)) save(); });
    place(e.clientX, e.clientY);
    (GUEST && !who.value ? who : ta).focus();
  }

  function openView(c, x, y) {
    pop.innerHTML = `
      <div class="meta"><span class="tag">#${c.id}</span><span class="tag">${esc(c.category)}</span><span class="tag">${esc(c.status)}</span><br><b>${esc(c.section)}</b><br>${esc(c.element)}<br>${c.author ? `${esc(c.author)} · ` : ''}${esc(c.created)} · ${esc(c.viewport)}</div>
      <div class="text">${esc(c.text)}</div>
      <div class="err" hidden></div>
      <div class="row">
        ${GUEST ? '' : `<button type="button" class="danger del">Delete</button>
        <button type="button" class="status">${c.status === 'resolved' ? 'Reopen' : 'Resolve'}</button>`}
        <button type="button" class="primary close">Close</button>
      </div>`;
    const err = pop.querySelector('.err');
    const fail = (ex) => { err.hidden = false; err.textContent = `Failed (${ex.message}).`; };
    pop.querySelector('.close').addEventListener('click', closePop);
    if (!GUEST) pop.querySelector('.status').addEventListener('click', async () => {
      try {
        const upd = await api('PATCH', `${API}/${c.id}`, { status: c.status === 'resolved' ? 'open' : 'resolved' });
        Object.assign(c, upd); closePop(); renderPins(); renderPanel();
      } catch (ex) { fail(ex); }
    });
    const del = pop.querySelector('.del');
    if (del) del.addEventListener('click', async () => {
      if (del.dataset.armed !== '1') { del.dataset.armed = '1'; del.textContent = 'Click again to delete'; return; }
      try {
        await api('DELETE', `${API}/${c.id}`);
        comments = comments.filter((x) => x.id !== c.id); closePop(); renderPins(); renderPanel();
      } catch (ex) { fail(ex); }
    });
    place(x, y);
  }

  // ---------- List panel ----------
  function renderPanel() {
    const list = showAll ? comments : pageComments();
    const open = pageComments().filter((c) => c.status !== 'resolved').length;
    listBtn.textContent = `Comments (${open})`;
    if (panel.hidden) return;
    panel.innerHTML = `
      <header>Comments<label><input type="checkbox" ${showAll ? 'checked' : ''}> All pages</label></header>
      ${list.length ? `<ol>${list.map((c) => `
        <li class="${c.status === 'resolved' ? 'resolved' : ''}"><button type="button" data-id="${c.id}">
          <span class="tag">#${c.id}</span><span class="tag">${esc(c.category)}</span>${showAll ? `<span class="tag">${esc(c.page)}</span>` : ''}${c.status === 'resolved' ? '<span class="tag">resolved</span>' : ''}
          <div class="meta" style="margin:4px 0 0">${c.author ? `${esc(c.author)} · ` : ''}${esc(c.section)}</div>
          <div class="t">${esc(c.text)}</div>
        </button></li>`).join('')}</ol>`
        : '<div class="empty">No comments yet. Click <b>Comment</b>, then click any part of the page.</div>'}`;
    panel.querySelector('input').addEventListener('change', (e) => { showAll = e.target.checked; renderPanel(); });
    panel.querySelectorAll('li button').forEach((b) => b.addEventListener('click', () => {
      const c = comments.find((x) => x.id === +b.dataset.id);
      if (c.page !== PAGE) { location.href = c.page + '#comment-' + c.id; return; }
      focusComment(c);
    }));
  }
  function focusComment(c) {
    const p = pinPosition(c);
    if (!p) { openView(c, innerWidth / 2 - 160, 120); return; }
    scrollTo({ top: p.y - innerHeight / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const pin = layer.querySelector(`[data-id="${c.id}"]`);
    if (pin) { pin.classList.remove('flash'); void pin.offsetWidth; pin.classList.add('flash'); }
  }
  function syncPins() { layer.dataset.show = !panel.hidden ? 'all' : commenting ? 'open' : 'none'; }
  syncPins();
  listBtn.addEventListener('click', () => { panel.hidden = !panel.hidden; renderPanel(); syncPins(); });

  // ---------- Comment mode ----------
  function setMode(on) {
    commenting = on;
    toggleBtn.classList.toggle('on', on);
    toggleBtn.setAttribute('aria-pressed', on);
    toggleBtn.textContent = on ? 'Stop commenting' : 'Comment';
    hint.hidden = !on;
    if (!on) hl.style.display = 'none';
    document.documentElement.style.cursor = on ? 'crosshair' : '';
    syncPins();
  }
  toggleBtn.addEventListener('click', () => setMode(!commenting));

  document.addEventListener('mousemove', (e) => {
    if (!commenting || isTool(e)) { if (commenting) hl.style.display = 'none'; return; }
    const r = e.target.getBoundingClientRect();
    Object.assign(hl.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    hl.firstElementChild.textContent = `${sectionOf(e.target)}  ›  ${describe(e.target)}`;
  }, true);

  // Capture phase, so links and buttons on the page don't fire while commenting
  ['pointerdown', 'mousedown', 'mouseup'].forEach((t) => document.addEventListener(t, (e) => {
    if (commenting && !isTool(e)) { e.preventDefault(); e.stopPropagation(); }
  }, true));
  document.addEventListener('click', (e) => {
    if (isTool(e)) return;
    if (!pop.hidden && !commenting) closePop();
    if (!commenting) return;
    e.preventDefault(); e.stopPropagation();
    setMode(false);
    openNew(e.target, e);
  }, true);

  document.addEventListener('keydown', (e) => {
    const typing = e.composedPath().some((n) => n instanceof HTMLElement && (n.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName)));
    if (e.key === 'Escape') { if (!pop.hidden) closePop(); else if (commenting) setMode(false); return; }
    if (!typing && (e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey && !e.altKey) setMode(!commenting);
  });

  refresh().then(() => {
    const m = location.hash.match(/^#comment-(\d+)$/);
    const c = m && comments.find((x) => x.id === +m[1]);
    if (c) setTimeout(() => focusComment(c), 300);
  });
})();

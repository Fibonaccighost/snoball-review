// Brands page: hero workspace demo, pinned scroll scenes (workflow stack, testimonials), case-study tabs,
// launch/always-on modes and the brief image's cursor light.
// Motion follows the landing-page-design skill: decelerating curves, transforms and opacity, one
// requestAnimationFrame loop for scroll work, and a still version for reduced motion. Below 1100px the layout is
// stacked, so nothing pins.
(() => {
  const NAV = 77;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 1100px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (pts, f) => { // piecewise linear through pts at f = 0, 1, 2, ...
    const i = clamp(Math.floor(f), 0, pts.length - 2);
    return pts[i] + (pts[i + 1] - pts[i]) * clamp(f - i);
  };
  // Between 1101 and 1439px <main> is zoomed by --fit (set in main.js); measured rects come back zoomed.
  const zoom = () => (small.matches ? 1 : parseFloat(document.documentElement.style.getPropertyValue('--fit')) || 1);
  const still = () => small.matches || reduced;

  // ---------- One frame loop for the scroll scenes ----------
  let queued = false;
  const tasks = [];
  const kick = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  function frame() {
    queued = false;
    let again = false;
    tasks.forEach((t) => { if (t()) again = true; });
    if (again) kick();
  }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { placeStages(); kick(); });

  // ---------- Pinned stages: centre each one under the nav while its section scrolls past ----------
  const stages = [...document.querySelectorAll('[data-stick]')];
  function placeStages() {
    const z = zoom();
    stages.forEach((stage) => {
      if (small.matches) { stage.style.top = ''; return; }
      // data-span="a b": the part of the stage that has content; it is centred instead of the whole stage,
      // keeping its top edge clear of the nav
      const span = stage.dataset.span && stage.dataset.span.split(' ').map(Number);
      if (span) {
        stage.style.top = Math.max(NAV / z + 16 - span[0], (innerHeight + NAV) / 2 / z - (span[0] + span[1]) / 2) + 'px';
        return;
      }
      const h = stage.getBoundingClientRect().height;
      stage.style.top = Math.max(NAV / z, (innerHeight + NAV - h) / 2 / z) + 'px';
    });
  }
  function pinProgress(section, stage) {
    const r = section.getBoundingClientRect();
    const h = stage.getBoundingClientRect().height;
    const top = parseFloat(stage.style.top || 0) * zoom();
    return clamp((top - r.top) / (r.height - h));
  }
  // Page scroll position at which a section's pin reaches progress p
  function scrollFor(section, stage, p) {
    const r = section.getBoundingClientRect(), h = stage.getBoundingClientRect().height;
    const top = parseFloat(stage.style.top || 0) * zoom();
    return scrollY + r.top - top + (r.height - h) * p;
  }
  placeStages();

  // ---------- Hero workspace: four views; goals and channels are live; it steps through on its own ----------
  const ws = document.querySelector('[data-ws]');
  if (ws) {
    const tabs = [...ws.querySelectorAll('.ws__tab')];
    const screens = [...ws.querySelectorAll('.ws__screen')];
    let view = 0, auto = !reduced, timer = 0;
    const show = (i) => {
      view = i;
      tabs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-selected', k === i); });
      screens.forEach((s, k) => s.classList.toggle('is-active', k === i));
    };
    const stop = () => { auto = false; clearInterval(timer); };
    tabs.forEach((t, i) => t.addEventListener('click', () => { stop(); show(i); }));

    const GOALS = {
      launch: { title: 'Turn your launch into a conversation.', desc: 'Build awareness with trusted tech voices, early product demonstrations and coordinated distribution.', tags: ['X + LinkedIn', 'Tech creators', 'Product demos'] },
      awareness: { title: 'Make more people know your name.', desc: 'Create a regular drumbeat of product stories and expert endorsements to reach relevant new audiences.', tags: ['Instagram + YouTube', 'Category voices', 'Education'] },
      always: { title: 'Make creators part of your growth habit.', desc: 'Build recurring creator relationships that keep discovery, consideration and adoption moving every month.', tags: ['Cross-platform', 'Recurring partners', 'Always-on'] },
    };
    const out = ws.querySelector('[data-goal-out]');
    const goalBtns = [...ws.querySelectorAll('[data-goal]')];
    goalBtns.forEach((b) => b.addEventListener('click', () => {
      stop();
      goalBtns.forEach((x) => x.classList.toggle('is-active', x === b));
      const g = GOALS[b.dataset.goal];
      out.classList.add('is-out');
      setTimeout(() => {
        out.querySelector('h4').textContent = g.title;
        out.querySelector('p').textContent = g.desc;
        out.querySelector('.ws__tags').replaceChildren(...g.tags.map((t) => Object.assign(document.createElement('span'), { textContent: t })));
        out.classList.remove('is-out');
      }, reduced ? 0 : 200);
    }));

    const CREATORS = [
      { label: 'Developer educator', platform: 'YouTube', topic: 'AI & coding' },
      { label: 'Founder voice', platform: 'LinkedIn', topic: 'B2B & startups' },
      { label: 'Tech operator', platform: 'X', topic: 'Productivity tools' },
      { label: 'Product reviewer', platform: 'YouTube', topic: 'Tech & software' },
      { label: 'Growth strategist', platform: 'LinkedIn', topic: 'Growth & marketing' },
    ];
    const people = ws.querySelector('[data-people]');
    const paint = (channel) => {
      people.replaceChildren(...CREATORS.filter((c) => channel === 'All' || c.platform === channel).map((c, i) => {
        const row = document.createElement('div');
        row.className = 'ws__person';
        row.style.animationDelay = `${i * 60}ms`;
        row.innerHTML = `<i>${c.label[0]}</i><span><b></b><small></small></span><em>Example</em>`;
        row.querySelector('b').textContent = c.label;
        row.querySelector('small').textContent = `${c.platform} · ${c.topic}`;
        return row;
      }));
    };
    const chanBtns = [...ws.querySelectorAll('[data-channels] .ws__chip')];
    chanBtns.forEach((b) => b.addEventListener('click', () => {
      stop();
      chanBtns.forEach((x) => x.classList.toggle('is-active', x === b));
      paint(b.textContent.trim());
    }));
    paint('All');

    // Steps through the views every 4.5s while the panel is on screen, until someone clicks inside it
    if (auto) {
      let visible = false;
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.4 }).observe(ws);
      timer = setInterval(() => { if (auto && visible && !document.hidden) show((view + 1) % screens.length); }, 4500);
    }
  }

  // ---------- Without the chaos: pinned; the front card lifts away and the next step comes forward ----------
  const chaos = document.querySelector('[data-chaos]');
  if (chaos) {
    const stage = chaos.querySelector('[data-stick]');
    const cards = [...chaos.querySelectorAll('.b-stack__card')].map((el) => ({
      el, body: el.querySelector('.b-stack__body'), ui: el.querySelector('.sui'),
    }));
    // The design's stack: front card, then two behind it (scale and drop in px); a fourth waits hidden behind
    const SCALE = [1, 0.9015, 0.8348, 0.78];
    const DROP = [0, 67.7, 122.9, 168];
    const last = cards.length - 1;
    cards.forEach((c, i) => { c.el.style.zIndex = cards.length - i; });
    tasks.push(() => {
      if (still()) {
        cards.forEach((c) => { c.el.style.transform = c.el.style.opacity = c.body.style.opacity = c.ui.style.opacity = ''; c.el.classList.add('is-front'); });
        return;
      }
      // Each step holds for a moment, then eases to the next
      const t = clamp((pinProgress(chaos, stage) - 0.06) / 0.88) * last;
      const k = Math.min(Math.floor(t), last - 1);
      const s = k + easeInOut(clamp((t - k - 0.2) / 0.6));
      cards.forEach((c, i) => {
        const f = i - s; // 0 = front, 1 and 2 = behind, below 0 = leaving
        let y, sc, op;
        if (f < 0) { // lifts up and fades
          y = f * 200; sc = 1 - f * 0.04; op = clamp(1 + f * 2);
        } else {
          y = lerp(DROP, f); sc = lerp(SCALE, f); op = clamp(3 - f);
        }
        c.el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
        c.el.style.opacity = op.toFixed(3);
        c.body.style.opacity = clamp(1 - Math.abs(f) * 1.6).toFixed(3);
        c.ui.style.opacity = clamp(1 - Math.abs(f) * 1.2).toFixed(3);
        c.el.classList.toggle('is-front', Math.abs(f) < 0.35);
      });
    });
  }

  // ---------- Testimonials: the frames stay put and the four perspectives step through them on their own ----------
  // Frame positions from the design (inside the track): 01 low, 02 high, 03 low. A card waits off to the right
  // before it enters frame 03 and leaves to the left after frame 01.
  const testi = document.querySelector('[data-testi]');
  if (testi) {
    const track = testi.querySelector('.b-testi__track');
    const rail = testi.querySelector('[data-track]');
    const cards = [...rail.children];
    const n = cards.length;
    const STEP = 321.7 + 58.1;
    // f = -1 (gone left), 0 (frame 01), 1 (frame 02), 2 (frame 03), 3 (waiting right)
    const X = [-STEP, 0, STEP, 2 * STEP, 3 * STEP];
    const Y = [56.6, 160.6, 56.6, 160.6, 56.6];
    const OP = [0, 1, 1, 1, 0];
    const at = (pts, f) => lerp(pts, f + 1);
    let s = 0;
    const render = () => {
      cards.forEach((c, i) => {
        let f = (((i - s) % n) + n) % n;
        if (f > n - 1) f -= n; // range (-1, 3]
        c.style.transform = `translate3d(${at(X, f).toFixed(1)}px, ${at(Y, f).toFixed(1)}px, 0)`;
        c.style.opacity = at(OP, f).toFixed(3);
      });
    };
    // One step = a 1.1s time-based tween (no scroll involved, so it stays smooth)
    let busy = false;
    const step = (dir) => {
      if (busy) return;
      busy = true;
      const from = s, start = performance.now(), DUR = 1100;
      const tick = (now) => {
        const t = clamp((now - start) / DUR);
        s = from + dir * easeInOut(t);
        render();
        if (t < 1) requestAnimationFrame(tick);
        else { s = ((Math.round(s) % n) + n) % n; busy = false; }
      };
      requestAnimationFrame(tick);
    };
    render();
    // Steps every 3.2s while the section is on screen and not hovered; an arrow click restarts the wait
    let visible = false, hovered = false, timer = 0;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.3 }).observe(testi);
    testi.addEventListener('pointerenter', () => { hovered = true; });
    testi.addEventListener('pointerleave', () => { hovered = false; });
    const auto = () => { clearInterval(timer); timer = setInterval(() => { if (visible && !hovered && !document.hidden && !still()) step(1); }, 3200); };
    if (!reduced) auto();
    const go = (dir) => {
      if (still()) { track.scrollBy({ left: dir * (cards[0].getBoundingClientRect().width + 24), behavior: 'smooth' }); return; }
      step(dir);
      if (!reduced) auto();
    };
    testi.querySelector('[data-prev]')?.addEventListener('click', () => go(-1));
    testi.querySelector('[data-next]')?.addEventListener('click', () => go(1));
    small.addEventListener('change', () => { if (still()) cards.forEach((c) => { c.style.transform = c.style.opacity = ''; }); else render(); });
  }

  // ---------- Case studies: the box shows the selected study; its scroll thumb follows the content ----------
  document.querySelectorAll('[data-tabs]').forEach((root) => {
    const tabs = [...root.querySelectorAll('[data-tab]')];
    const title = root.querySelector('[data-tab-title]');
    const desc = root.querySelector('[data-tab-desc]');
    const body = root.querySelector('[data-case-body]');
    const scroller = root.querySelector('[data-case-scroll]');
    const thumb = root.querySelector('.b-case__thumb');
    const NUM = ['01', '02', '03'];
    const syncThumb = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      const room = thumb.parentElement.offsetHeight - thumb.offsetHeight;
      thumb.style.setProperty('--thumb', (max > 0 ? (scroller.scrollTop / max) * room : 0) + 'px');
      thumb.parentElement.style.opacity = max > 0 ? 1 : 0;
    };
    scroller.addEventListener('scroll', syncThumb, { passive: true });
    const fill = (t, i) => {
      const kind = t.querySelector('.b-ctab__title').textContent;
      const text = t.querySelector('.b-ctab__desc');
      if (title) title.textContent = kind;
      if (desc) desc.innerHTML = text.innerHTML;
      root.querySelector('[data-case-num]').textContent = `${NUM[i]} / Case study`;
      root.querySelector('[data-tab-case]').textContent = t.querySelector('.b-ctab__title').dataset.case;
      root.querySelector('[data-case-kind]').textContent = kind;
      root.querySelector('[data-tab-desc2]').textContent = text.textContent.replace(/\s+/g, ' ').trim();
      scroller.scrollTop = 0;
      syncThumb();
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => {
      if (t.classList.contains('is-active')) return;
      tabs.forEach((u) => { u.classList.toggle('is-active', u === t); u.setAttribute('aria-selected', u === t); });
      body.classList.add('is-out');
      [title, desc].forEach((el) => el && el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'cubic-bezier(.22, 1, .36, 1)' }));
      setTimeout(() => {
        fill(t, i);
        body.classList.remove('is-out');
        [title, desc].forEach((el) => el && el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.22, 1, .36, 1)' }));
      }, reduced ? 0 : 200);
    }));
    syncThumb();
  });

  // ---------- Launch / Always-on modes (copy from the original site) ----------
  const MODES = [
    { label: 'Intense, coordinated momentum', lead: 'Make one announcement <br><strong>feel everywhere.</strong>',
      desc: 'An integrated creator and distribution program built around the exact moment your product has news.',
      points: ['One core story adapted for different<br class="d"> creator audiences', 'A mix of credible niche<br class="d"> experts and broader reach',
        'Capturing reactions to extend<br class="d"> the conversation', 'Planned publishing and<br class="d"> thoughtful amplification'] },
    { label: 'Consistent relevance, not sporadic posts', lead: 'Keep the conversation going <br><strong>after the spike.</strong>',
      desc: 'Recurring content and relationships that make your product useful, familiar, and top of mind all year.',
      points: ['Longer-term creator partnerships<br class="d"> and recurring integrations', 'Product education across multiple<br class="d"> use cases and audiences',
        'A consistent mix of formats, platforms,<br class="d"> and creator voices', 'Monthly learnings to refine the<br class="d"> next set of partnerships'] },
  ];
  document.querySelectorAll('[data-modes]').forEach((root) => {
    const tabs = root.querySelectorAll('.b-modes__tab');
    const lead = root.querySelector('[data-mode-lead]');
    const label = root.querySelector('[data-mode-label]');
    const desc = root.querySelector('[data-mode-desc]');
    const items = [...root.querySelectorAll('.b-modes__list li')];
    [lead, label, desc, ...items].forEach((el) => { el.dataset.swap = ''; });
    items.forEach((li, k) => { li.style.transitionDelay = `${k * 40}ms`; });
    tabs.forEach((t, i) => t.addEventListener('click', () => {
      if (+(root.dataset.mode || 0) === i) return;
      root.dataset.mode = i;
      tabs.forEach((u) => { u.classList.toggle('is-active', u === t); u.setAttribute('aria-selected', u === t); });
      root.classList.add('is-swapping');
      setTimeout(() => {
        lead.innerHTML = MODES[i].lead;
        label.textContent = MODES[i].label;
        desc.textContent = MODES[i].desc;
        items.forEach((li, k) => { const icon = li.querySelector('img'); li.innerHTML = MODES[i].points[k]; li.prepend(icon); });
        root.classList.remove('is-swapping');
      }, reduced ? 0 : 220);
    }));
  });

  // ---------- From brief to buzz: the light follows the cursor (same effect as the homepage hero) ----------
  const brief = document.querySelector('[data-brief-art]');
  const spot = brief && brief.querySelector('.b-brief__spot');
  if (spot && !reduced) {
    const target = { sx: 0, sy: 0, gx: 0, gy: 0 }, cur = { ...target };
    let fresh = true;
    brief.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      // Pointer in the image's own (unzoomed) pixels
      const r = brief.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      target.sx = fx * brief.offsetWidth;
      target.sy = fy * brief.offsetHeight;
      // No lean here: the bright copy is sharp, so any offset would show as a double image
      if (fresh) { Object.assign(cur, target); fresh = false; } // first frame: no sweep in from the corner
      brief.classList.add('is-lit');
      kick();
    });
    brief.addEventListener('pointerleave', () => {
      brief.classList.remove('is-lit');
      fresh = true;
      target.gx = target.gy = 0;
      kick();
    });
    tasks.push(() => {
      let moving = false;
      for (const k in target) {
        cur[k] += (target[k] - cur[k]) * 0.1;
        if (Math.abs(target[k] - cur[k]) > 0.1) moving = true;
      }
      spot.style.setProperty('--sx', cur.sx.toFixed(1) + 'px');
      spot.style.setProperty('--sy', cur.sy.toFixed(1) + 'px');
      spot.style.setProperty('--gx', cur.gx.toFixed(1) + 'px');
      spot.style.setProperty('--gy', cur.gy.toFixed(1) + 'px');
      return moving;
    });
  }

  small.addEventListener('change', () => { placeStages(); kick(); });
  addEventListener('load', () => { placeStages(); kick(); });
  kick();
})();

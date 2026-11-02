// CREW page animations.
// Same rules as the homepage (landing-page-design skill): decelerating curves, transforms and opacity, one
// requestAnimationFrame loop for scroll-driven scenes, and a still version for reduced motion. Below 1100px the
// layout is stacked, so nothing pins and everything shows in its final state.
(() => {
  const NAV = 77;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 1100px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
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
  placeStages();

  // ---------- Hero: headline words rise in one by one ----------
  const heroTitle = document.querySelector('.cr-hero__title');
  if (heroTitle) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement('span');
            w.className = 'cr-word';
            w.textContent = part;
            w.style.transitionDelay = `${120 + i++ * 90}ms`;
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(heroTitle);
    requestAnimationFrame(() => requestAnimationFrame(() => heroTitle.classList.add('is-in')));
  }

  // ---------- Classrooms: pinned; scroll steps through three slides ----------
  const cls = document.querySelector('[data-class]');
  if (cls) {
    const stage = cls.querySelector('[data-stick]');
    const lines = [...cls.querySelectorAll('.cr-ln')];
    const slides = [...cls.querySelectorAll('.cr-slide')];
    const dots = [...cls.querySelectorAll('.cr-dots button')];
    let current = -1;
    const show = (step) => {
      if (step === current) return;
      current = step;
      lines.forEach((l) => l.classList.toggle('is-on', +l.dataset.step === step));
      slides.forEach((s, i) => s.classList.toggle('is-on', i === step));
      dots.forEach((d, i) => { d.classList.toggle('is-active', i === step); d.setAttribute('aria-selected', i === step); });
    };
    // A dot scrolls to the middle of its step
    dots.forEach((d, i) => d.addEventListener('click', () => {
      if (still()) { show(i); return; }
      const r = cls.getBoundingClientRect(), h = stage.getBoundingClientRect().height;
      const travel = r.height - h, top = parseFloat(stage.style.top || 0) * zoom();
      scrollTo({ top: scrollY + r.top - top + travel * ((i + 0.5) / 3), behavior: 'smooth' });
    }));
    tasks.push(() => {
      if (still()) { show(current < 0 ? 0 : current); return; }
      show(Math.min(2, Math.floor(pinProgress(cls, stage) * 3)));
    });
  }

  // ---------- Expertise: pinned; disciplines come out from behind the headline, grow, and leave ----------
  const exp = document.querySelector('[data-expertise]');
  if (exp) {
    const stage = exp.querySelector('[data-stick]');
    const C = { x: 720, y: 400 }; // behind the headline
    const tags = [...exp.querySelectorAll('.cr-tag')].map((el, i) => {
      const wave = i < 7 ? 0 : 1;
      const k = wave ? i - 7 : i;
      // A blurred twin sits on the same spot: tags arrive blurred, turn sharp in place, then leave
      const ghost = el.cloneNode(true);
      ghost.classList.add('cr-tag--ghost');
      ghost.setAttribute('aria-hidden', 'true');
      el.after(ghost);
      return { el, ghost, wave, delay: wave ? 0.46 + k * 0.016 : k * 0.016, x: 0, y: 0 };
    });
    const measure = () => tags.forEach((t) => {
      t.x = t.el.offsetLeft + t.el.offsetWidth / 2 - C.x;
      t.y = t.el.offsetTop + t.el.offsetHeight / 2 - C.y;
    });
    measure();
    addEventListener('resize', measure);
    const SPAN = 0.42; // scroll share each tag takes to come out and leave
    tasks.push(() => {
      if (still()) { tags.forEach((t) => { t.el.style.transform = ''; t.el.style.opacity = ''; t.ghost.style.opacity = '0'; }); return; }
      const p = pinProgress(exp, stage);
      tags.forEach((t) => {
        let u = clamp((p - t.delay) / SPAN);
        if (t.wave === 1) u = Math.min(u, 0.5); // the last wave stays in place when the pin ends
        // u 0 → 0.5: from the centre (small) out to its place; 0.5 → 1: keeps going, grows, and fades out of view
        const out = u <= 0.5 ? ease(u / 0.5) : 1 + (u - 0.5) * 2 * 1.4;
        const pos = 0.12 + 0.88 * Math.min(out, 1) + Math.max(0, out - 1);
        const scale = 0.3 + 0.7 * Math.min(out, 1) + Math.max(0, out - 1) * 0.45;
        const op = u <= 0 ? 0 : u < 0.18 ? u / 0.18 : u > 0.72 ? clamp(1 - (u - 0.72) / 0.28) : 1;
        const sharp = clamp((u - 0.22) / 0.26); // blurred while coming in, sharp by the time it is in place
        const tf = `translate(${t.x * (pos - 1)}px, ${t.y * (pos - 1)}px) scale(${scale})`;
        t.el.style.transform = t.ghost.style.transform = tf;
        t.el.style.opacity = op * sharp;
        t.ghost.style.opacity = op * (1 - sharp);
      });
    });
  }

  // ---------- Meet the voices: six reel slots in an endless loop, three visible ----------
  // Next slides left one slot, then moves the first reel to the end, so after the sixth the first comes in from
  // the right; previous does the reverse.
  document.querySelectorAll('[data-gallery]').forEach((g) => {
    const box = g.querySelector('.cr-gallery__panels');
    const track = g.querySelector('[data-reels]');
    const STEP = 348 + 16.5;
    let busy = false;
    const slide = (to, done) => {
      track.style.transition = '';
      track.style.transform = `translateX(${to}px)`;
      const end = () => { track.removeEventListener('transitionend', end); done(); };
      if (reduced) end(); else track.addEventListener('transitionend', end);
    };
    const jump = (to) => { track.style.transition = 'none'; track.style.transform = `translateX(${to}px)`; void track.offsetWidth; };
    const go = (dir) => {
      if (box.scrollWidth > box.clientWidth + 2) { // stacked layout: native horizontal scroll
        box.scrollBy({ left: dir * (track.firstElementChild.getBoundingClientRect().width + 12), behavior: 'smooth' });
        return;
      }
      if (busy) return;
      busy = true;
      if (dir > 0) {
        slide(-STEP, () => { track.append(track.firstElementChild); jump(0); busy = false; });
      } else {
        track.prepend(track.lastElementChild);
        jump(-STEP);
        slide(0, () => { busy = false; });
      }
    };
    g.querySelector('[data-prev]')?.addEventListener('click', () => go(-1));
    g.querySelector('[data-next]')?.addEventListener('click', () => go(1));
  });

  // ---------- Brands: one name lit at a time; hover picks it, otherwise it moves on its own ----------
  const brands = document.querySelector('[data-brands]');
  if (brands) {
    const cells = [...brands.children];
    const glow = brands.parentElement.querySelector('.cr-brands__glow');
    let lit = cells.findIndex((c) => c.classList.contains('is-lit'));
    let hovering = false;
    const light = (i) => {
      lit = i;
      cells.forEach((c, k) => c.classList.toggle('is-lit', k === i));
      if (glow) {
        glow.style.setProperty('--cx', (i % 3) * 338.5 + 'px');
        glow.style.setProperty('--cy', Math.floor(i / 3) * 142 + 'px');
      }
    };
    light(Math.max(0, lit));
    cells.forEach((c, i) => {
      c.addEventListener('pointerenter', () => { hovering = true; light(i); });
      c.addEventListener('pointerleave', () => { hovering = false; });
    });
    if (!reduced) {
      setInterval(() => {
        if (hovering || document.hidden) return;
        let next;
        do { next = Math.floor(Math.random() * cells.length); } while (next === lit);
        light(next);
      }, 2400);
    }
  }

  // ---------- Build your name: the glass lens follows the pointer anywhere over the artwork ----------
  const art = document.querySelector('[data-glass]');
  if (art && !reduced) {
    const glass = art.querySelector('.cr-glass');
    art.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = art.getBoundingClientRect(), g = glass.offsetWidth / 2;
      const z = r.width / art.offsetWidth; // rects are zoomed between 1101 and 1439px
      // Pointer in the art's own pixels, kept far enough in that the lens stays inside the frame
      const m = g * 1.04 + 14; // lens radius (with its hover scale) plus the frame's rounded border
      const px = clamp((e.clientX - r.left) / z, m, art.offsetWidth - m);
      const py = clamp((e.clientY - r.top) / z, m, art.offsetHeight - m);
      const hx = glass.offsetLeft + g, hy = glass.offsetTop + g; // lens centre at rest
      glass.style.setProperty('--gx', (px - hx).toFixed(1) + 'px');
      glass.style.setProperty('--gy', (py - hy).toFixed(1) + 'px');
      glass.style.setProperty('--gs', '1.04');
      // The highlight swings toward the side the lens is moving to
      glass.style.setProperty('--hx', ((px - hx) * 0.25).toFixed(1) + 'px');
      glass.style.setProperty('--hy', ((py - hy) * 0.25).toFixed(1) + 'px');
    });
    art.addEventListener('pointerleave', () => {
      ['--gx', '--gy', '--hx', '--hy'].forEach((v) => glass.style.setProperty(v, '0px'));
      glass.style.setProperty('--gs', '1');
    });
  }

  kick();
})();

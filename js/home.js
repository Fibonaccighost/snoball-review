// Homepage animations.
// Motion follows the landing-page-design skill: decelerating curves, transforms and opacity wherever possible,
// one requestAnimationFrame loop for every scroll-driven scene (no unthrottled scroll work), and a still
// version for people who prefer reduced motion. Below 1100px the layout is stacked, so scenes don't pin.
(() => {
  const NAV = 77;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 1100px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, a, b) => clamp((p - a) / (b - a)); // where p sits between a and b, as 0..1
  const ease = (t) => 1 - Math.pow(1 - t, 3); // decelerates into place, like cubic-bezier(.22,1,.36,1)
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // Between 1101 and 1439px <main> is zoomed by --fit (set in main.js); measured rects come back zoomed.
  const zoom = () => (small.matches ? 1 : parseFloat(document.documentElement.style.getPropertyValue('--fit')) || 1);
  const CURVE = 'cubic-bezier(.22, 1, .36, 1)';

  // ---------- One frame loop for everything ----------
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
      stage.style.top = (innerHeight + NAV - h) / 2 / z + 'px';
    });
  }
  function pinProgress(section, stage) {
    const r = section.getBoundingClientRect();
    const h = stage.getBoundingClientRect().height;
    const top = parseFloat(stage.style.top || 0) * zoom();
    return clamp((top - r.top) / (r.height - h));
  }
  placeStages();

  // ---------- Hero: the light around the characters brightens where the cursor is and leans toward it;
  //            photo, people and floor stay still ----------
  const hero = document.querySelector('.hero');
  const art = hero && hero.querySelector('[data-hero-art]');
  const spot = art && art.querySelector('.hero__spot');
  if (spot && !reduced) {
    const target = { sx: 0, sy: 0, gx: 0, gy: 0 }, cur = { ...target };
    let fresh = true;
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      // Pointer in the art's own (unzoomed) pixels
      const r = art.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      target.sx = fx * art.offsetWidth;
      target.sy = fy * art.offsetHeight;
      target.gx = (fx - 0.5) * 2 * 60;
      target.gy = (fy - 0.5) * 2 * 20;
      if (fresh) { Object.assign(cur, target); fresh = false; } // first frame: no sweep in from the corner
      hero.classList.add('is-lit');
      kick();
    });
    hero.addEventListener('pointerleave', () => {
      hero.classList.remove('is-lit');
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

  // ---------- Two sides: shrink, hands meet at the ring, card splits, each half flips to its link ----------
  const sides = document.querySelector('[data-sides]');
  if (sides) {
    const stage = sides.querySelector('[data-stick]');
    const card = sides.querySelector('.sides__card');
    const [halfL, halfR] = sides.querySelectorAll('.sides__half');
    const handL = sides.querySelector('.sides__hand--l');
    const handR = sides.querySelector('.sides__hand--r');
    const ring = sides.querySelector('.sides__ring');
    // Fingertips sit at 38.7% and 61.3% of the card; the ring spans 43.5%–57%. These shifts make them touch.
    const REACH_L = 58, REACH_R = -51;
    const render = (p) => {
      const shrink = ease(range(p, 0, 0.5));
      const reach = easeInOut(range(p, 0.05, 0.5));
      const flash = range(p, 0.5, 0.6);
      const split = ease(range(p, 0.56, 0.74));
      const flip = easeInOut(range(p, 0.74, 0.94));
      card.style.transform = `scale(${1 - 0.3 * shrink})`;
      handL.style.transform = `translateX(${REACH_L * reach}px)`;
      handR.style.transform = `translateX(${REACH_R * reach}px)`;
      ring.style.opacity = 1 - flash;
      ring.style.transform = `scale(${1 + 0.4 * flash})`;
      const gap = 36 * split, r = 60 * split;
      // Each half turns about its own centre; past 90° its back face shows (CSS .is-back)
      const turn = 180 * flip;
      halfL.style.transformOrigin = '25% 50%';
      halfR.style.transformOrigin = '75% 50%';
      halfL.style.transform = `translateX(${-gap}px) perspective(1600px) rotateY(${-turn}deg)`;
      halfR.style.transform = `translateX(${gap}px) perspective(1600px) rotateY(${turn}deg)`;
      halfL.classList.toggle('is-back', turn > 90);
      halfR.classList.toggle('is-back', turn > 90);
      halfL.style.clipPath = `inset(0 50% 0 0 round 60px ${r}px ${r}px 60px)`;
      halfR.style.clipPath = `inset(0 0 0 50% round ${r}px 60px 60px ${r}px)`;
      sides.classList.toggle('is-split', flip > 0.5);
    };
    tasks.push(() => { render(small.matches || reduced ? 1 : pinProgress(sides, stage)); });
  }

  // ---------- Influencer marketing: eye opens, headline lines trade focus, likes fly out and count up ----------
  const infl = document.querySelector('[data-infl]');
  if (infl) {
    const stage = infl.querySelector('[data-stick]');
    const inner = stage.querySelector('.sec__inner');
    const [lidTop, lidBottom] = infl.querySelectorAll('.infl__lid');
    const title = infl.querySelector('.infl__title');
    const second = infl.querySelector('.infl__blur');
    const btn = infl.querySelector('.btn-glow');
    const sub = infl.querySelector('.infl__sub');
    // The button starts in the middle of the stage and travels down to its place; the paragraph it passes over
    // fades in behind it
    const BTN_FROM = 1008.8 / 2 - (708.4 + 67 / 2);
    // Bubbles start hidden behind the "Influencer marketing" headline and travel out to their places
    const ORIGIN = { x: 572 + 200, y: 245.4 + 70 };
    const likes = [...infl.querySelectorAll('.like')].map((el) => {
      const x = parseFloat(el.style.left) + 68, y = parseFloat(el.style.top) + 25.5;
      return { el, value: +el.dataset.value, dx: ORIGIN.x - x, dy: ORIGIN.y - y };
    });
    const fmt = (n) => (n < 1000 ? String(Math.round(n)) : n < 100000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : Math.round(n / 1000) + 'k');
    let opened = false;
    const openEye = () => {
      opened = true;
      const timing = { duration: 1700, easing: CURVE, fill: 'forwards' };
      // A blink: crack open, half close, then open fully
      lidTop.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16%)', offset: 0.28 }, { transform: 'translateY(-7%)', offset: 0.45 }, { transform: 'translateY(-101%)' }], timing);
      lidBottom.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(16%)', offset: 0.28 }, { transform: 'translateY(7%)', offset: 0.45 }, { transform: 'translateY(101%)' }], timing)
        .finished.then(() => infl.classList.add('is-open'));
      inner.animate([{ transform: 'scale(1.08)', opacity: 0.35 }, { transform: 'scale(1.08)', opacity: 0.35, offset: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 1900, easing: CURVE });
    };
    if (reduced || small.matches) { opened = true; infl.classList.add('is-open'); }
    const render = (p) => {
      const t = easeInOut(range(p, 0.28, 0.8));
      title.style.filter = `blur(${(7.23 * t).toFixed(2)}px)`;
      title.style.opacity = 1 - 0.52 * t;
      second.style.filter = `blur(${(7.23 * (1 - t)).toFixed(2)}px)`;
      second.style.opacity = 0.48 + 0.52 * t;
      btn.style.translate = `0 ${(BTN_FROM * (1 - t)).toFixed(1)}px`; // translate, so the hover lift (transform) still works
      sub.style.opacity = range(t, 0.55, 1);
      likes.forEach((l) => {
        const k = 1 - t;
        l.el.style.transform = `translate(${l.dx * k}px, ${l.dy * k}px) scale(${0.6 + 0.4 * t})`;
        l.el.style.opacity = range(t, 0, 0.15);
        l.el.textContent = fmt(l.value * t);
      });
    };
    tasks.push(() => {
      if (small.matches || reduced) return;
      const r = infl.getBoundingClientRect();
      if (!opened && r.top <= parseFloat(stage.style.top || 0) * zoom() + innerHeight * 0.25) openEye();
      render(pinProgress(infl, stage));
    });
  }

  // ---------- Talk: orb travels the curve, growing, and lights each label as it passes ----------
  const talk = document.querySelector('[data-talk]');
  if (talk) {
    const orb = talk.querySelector('.talk__orb');
    const labels = [...talk.querySelectorAll('.talk__label')]; // SPARK, TRACTION, MOMENTUM
    // Same path as assets/img/curve.svg, in that file's coordinates; OFF maps them into the section.
    const OFF = { x: 274, y: 5814.4 };
    const DOTS = [{ x: 621.68, y: 6208.72 }, { x: 990.87, y: 6293.99 }, { x: 1161.94, y: 6491.34 }];
    const SIZE = 481, START_SIZE = 28;
    const FINAL_X = 946.4 + 240.5 + OFF.x; // the orb ends above the same x as in the design
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M596.215 6227.08C771.183 6091.62 930.805 6197.1 1002.04 6309.37C1165.89 6567.61 1314.55 6591.06 1528 6583.04');
    svg.appendChild(path);
    document.body.appendChild(svg);
    const total = path.getTotalLength();
    const lengthNear = (pt) => {
      let best = 0, bestD = Infinity;
      for (let l = 0; l <= total; l += 2) {
        const q = path.getPointAtLength(l), d = (q.x - pt.x) ** 2 + (q.y - pt.y) ** 2;
        if (d < bestD) { bestD = d; best = l; }
      }
      return best;
    };
    const dotLen = DOTS.map(lengthNear);
    let endLen = total;
    for (let l = 0; l <= total; l += 2) if (path.getPointAtLength(l).x >= FINAL_X) { endLen = l; break; }
    // Upward normal of the curve at length l, so the orb sits on top of the line instead of being cut by it
    const normalAt = (l) => {
      const a = path.getPointAtLength(Math.max(0, l - 1)), b = path.getPointAtLength(Math.min(total, l + 1));
      let nx = b.y - a.y, ny = a.x - b.x;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len; ny /= len;
      return ny > 0 ? { x: -nx, y: -ny } : { x: nx, y: ny };
    };
    const home = { x: 946.4 + 240.5, y: 348.6 + 240.5 }; // where the CSS places the orb's centre
    const title = talk.querySelector('.talk__title');
    const lines = [...title.querySelectorAll('.talk__line')];
    const setStep = (step) => {
      // step 1: "Let's make" bold; step 2: "the internet" bold; step 3: final design state
      title.classList.toggle('is-stepping', step < 3);
      lines.forEach((ln, i) => {
        ln.classList.toggle('is-hidden', i >= step);
        ln.classList.toggle('is-current', i === step - 1);
      });
    };
    const render = (p) => {
      const along = p * endLen;
      const q = path.getPointAtLength(along), n = normalAt(along);
      const size = START_SIZE + (SIZE - START_SIZE) * Math.pow(p, 2.2), r = size / 2;
      const cx = q.x + n.x * r - OFF.x, cy = q.y + n.y * r - OFF.y;
      // Rolling: turn by distance travelled over radius, so it spins forward going down and back going up
      spin += ((along - lastAlong) / r) * (180 / Math.PI);
      lastAlong = along;
      orb.style.transform = `translate(${cx - home.x}px, ${cy - home.y}px) scale(${size / SIZE}) rotate(${spin.toFixed(2)}deg)`;
      let passed = 0;
      labels.forEach((lab, i) => {
        const on = along >= dotLen[i] - 1;
        lab.classList.toggle('is-on', on);
        if (on) passed = i + 1;
      });
      setStep(Math.max(1, passed));
    };
    // The orb trails the scroll and eases after it, so you see it roll along the line rather than jump with the page
    let spin = 0, lastAlong = 0, shown = null;
    tasks.push(() => {
      if (small.matches || reduced) { orb.style.transform = ''; labels.forEach((l) => l.classList.add('is-on')); setStep(3); return; }
      const r = talk.getBoundingClientRect();
      const start = innerHeight * 0.75, end = NAV - 180 * zoom();
      const target = clamp((start - r.top) / (start - end));
      if (shown === null) { shown = target; lastAlong = target * endLen; } // first frame: start in place
      shown += (target - shown) * 0.045;
      if (Math.abs(target - shown) < 0.0005) shown = target;
      render(shown);
      return shown !== target;
    });
  }

  // ---------- Pill: colour shows in a circle around the pointer, and the pill tilts toward it in 3D ----------
  const pill = document.querySelector('[data-color-reveal]');
  if (pill) {
    const move = (e) => {
      // The tilt is a few degrees, so the tilted box is a close enough frame for the reveal position
      const r = pill.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      pill.style.setProperty('--x', x * 100 + '%');
      pill.style.setProperty('--y', y * 100 + '%');
      if (!reduced) {
        pill.style.setProperty('--ry', ((x - 0.5) * 16).toFixed(2) + 'deg');
        pill.style.setProperty('--rx', ((0.5 - y) * 22).toFixed(2) + 'deg');
      }
      pill.classList.add('is-on');
    };
    pill.addEventListener('pointermove', move);
    pill.addEventListener('pointerdown', move);
    pill.addEventListener('pointerleave', () => {
      pill.classList.remove('is-on');
      pill.style.setProperty('--rx', '0deg');
      pill.style.setProperty('--ry', '0deg');
    });
  }

  // ---------- Impact cards: hover and focus show the testimonial in CSS; on touch screens a tap does ----------
  document.querySelectorAll('.impact__card').forEach((card) => {
    card.addEventListener('click', () => { if (matchMedia('(hover: none)').matches) card.classList.toggle('is-open'); });
  });

  small.addEventListener('change', () => { placeStages(); kick(); });
  addEventListener('load', () => { placeStages(); kick(); });
  kick();
})();

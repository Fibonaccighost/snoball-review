// Mobile nav toggle
document.querySelectorAll('.nav__toggle').forEach((btn) => {
  btn.addEventListener('click', () => btn.closest('.nav').classList.toggle('is-open'));
});

// "What we do" dropdown: click toggles it, Escape or an outside click closes it
document.querySelectorAll('.nav__drop').forEach((drop) => {
  const btn = drop.querySelector('.nav__drop-btn');
  const setOpen = (open) => { drop.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open); };
  btn.addEventListener('click', () => setOpen(!drop.classList.contains('is-open')));
  document.addEventListener('click', (e) => { if (!drop.contains(e.target)) setOpen(false); });
  drop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); btn.focus(); } });
});

// Simple prev/next carousels: [data-carousel] wraps [data-track] plus [data-prev]/[data-next]
document.querySelectorAll('[data-carousel]').forEach((root) => {
  const track = root.querySelector('[data-track]');
  if (!track) return;
  const step = () => (track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 24 : 300);
  root.querySelector('[data-prev]')?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  root.querySelector('[data-next]')?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
});

// FAQ accordions
document.querySelectorAll('[data-faq] button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const item = btn.closest('[data-faq]');
    const open = item.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open);
    // Only one answer open at a time: opening this one closes the others in the same list
    if (open) {
      item.parentElement.querySelectorAll('[data-faq].is-open').forEach((other) => {
        if (other === item) return;
        other.classList.remove('is-open');
        other.querySelector('button').setAttribute('aria-expanded', false);
      });
    }
  });
});

// Between 1101px and 1439px the 1440px desktop layout is scaled to fit (CSS reads --fit)
const setFit = () => document.documentElement.style.setProperty('--fit', Math.min(1, document.documentElement.clientWidth / 1440));
setFit();
window.addEventListener('resize', setFit);

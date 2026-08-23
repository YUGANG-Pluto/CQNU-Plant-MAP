const navToggle = document.querySelector('[data-nav-toggle]');
const navigation = document.querySelector('[data-nav]');

navToggle?.addEventListener('click', () => {
  const open = navToggle.getAttribute('aria-expanded') !== 'true';
  navToggle.setAttribute('aria-expanded', String(open));
  navigation?.classList.toggle('is-open', open);
});

navigation?.addEventListener('click', event => {
  if (!(event.target instanceof HTMLAnchorElement)) return;
  navToggle?.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
});

const revealTargets = [...document.querySelectorAll('[data-reveal]')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealTargets.forEach(target => observer.observe(target));
} else {
  revealTargets.forEach(target => target.classList.add('is-visible'));
}

const header = document.querySelector('[data-header]');
const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 16);
syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

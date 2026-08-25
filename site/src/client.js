const navToggle = document.querySelector('[data-nav-toggle]');
const navigation = document.querySelector('[data-nav]');

function closeNavigation() {
  navToggle?.setAttribute('aria-expanded', 'false');
  navigation?.classList.remove('is-open');
}

navToggle?.addEventListener('click', () => {
  const open = navToggle.getAttribute('aria-expanded') !== 'true';
  navToggle.setAttribute('aria-expanded', String(open));
  navigation?.classList.toggle('is-open', open);
});

navigation?.addEventListener('click', event => {
  if (!(event.target instanceof HTMLAnchorElement)) return;
  closeNavigation();
});

document.addEventListener('pointerdown', event => {
  if (!navigation?.classList.contains('is-open')) return;
  if (navigation.contains(event.target) || navToggle?.contains(event.target)) return;
  closeNavigation();
});

const mobileNavigationQuery = window.matchMedia('(max-width: 700px)');
mobileNavigationQuery.addEventListener?.('change', event => {
  if (!event.matches) closeNavigation();
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

const hubSearch = document.querySelector('[data-hub-search]');
const hubItems = [...document.querySelectorAll('[data-hub-item]')];
const hubGroups = [...document.querySelectorAll('[data-hub-group]')];

function normalizeSearch(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
}

function filterHub() {
  const query = normalizeSearch(hubSearch?.value);
  let visibleCount = 0;
  hubItems.forEach(item => {
    const visible = !query || normalizeSearch(item.dataset.search).includes(query);
    item.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  hubGroups.forEach(group => {
    group.hidden = !group.querySelector('[data-hub-item]:not([hidden])');
  });
  const count = document.querySelector('[data-hub-count]');
  if (count) count.textContent = String(visibleCount);
  const empty = document.querySelector('[data-hub-empty]');
  if (empty) empty.hidden = visibleCount > 0;
}

if (hubSearch) {
  hubSearch.addEventListener('input', filterHub);
  filterHub();
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (navigation?.classList.contains('is-open')) {
      closeNavigation();
      navToggle?.focus();
      return;
    }
    if (document.activeElement === hubSearch && hubSearch.value) {
      hubSearch.value = '';
      filterHub();
    }
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k' && hubSearch) {
    event.preventDefault();
    hubSearch.focus();
    hubSearch.select();
  }
});

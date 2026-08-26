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
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (revealTargets.length && !reducedMotion) {
  document.documentElement.classList.add('motion-reveal-ready');
  revealTargets.forEach((target, index) => {
    target.style.setProperty('--reveal-delay', `${(index % 6) * 72}ms`);
  });
  window.requestAnimationFrame(() => {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
      revealTargets.forEach(target => observer.observe(target));
      return;
    }
    revealTargets.forEach(target => target.classList.add('is-visible'));
  });
} else {
  revealTargets.forEach(target => target.classList.add('is-visible'));
}

const header = document.querySelector('[data-header]');
const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 16);
syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

const docProgress = document.querySelector('[data-doc-progress]');
const docLinks = [...document.querySelectorAll('[data-doc-link]')];
const docSections = [...document.querySelectorAll('[data-doc-section]')];
let docProgressFrame = 0;

function syncDocumentProgress() {
  docProgressFrame = 0;
  if (!docProgress) return;
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
  docProgress.style.transform = `scaleX(${progress})`;
}

if (docProgress) {
  syncDocumentProgress();
  window.addEventListener('scroll', () => {
    if (docProgressFrame) return;
    docProgressFrame = window.requestAnimationFrame(syncDocumentProgress);
  }, { passive: true });
}

if (docSections.length && 'IntersectionObserver' in window) {
  const docObserver = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((left, right) => Math.abs(left.boundingClientRect.top - 126) - Math.abs(right.boundingClientRect.top - 126))[0];
    if (!visible) return;
    docLinks.forEach(link => {
      const current = link.getAttribute('href') === `#${visible.target.id}`;
      link.classList.toggle('is-current', current);
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-12% 0px -68% 0px', threshold: 0.05 });
  docSections.forEach(section => docObserver.observe(section));
}

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
    const wasHidden = item.hidden;
    item.hidden = !visible;
    if (visible) {
      visibleCount += 1;
      if (wasHidden && !reducedMotion && typeof item.animate === 'function') {
        item.animate([
          { opacity: 0, transform: 'translateY(14px) scale(0.98)' },
          { opacity: 0.76, offset: 0.55 },
          { opacity: 1, transform: 'none' }
        ], {
          duration: 620,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
        });
      }
    }
  });
  hubGroups.forEach(group => {
    group.hidden = !group.querySelector('[data-hub-item]:not([hidden])');
  });
  const count = document.querySelector('[data-hub-count]');
  if (count) {
    const changed = count.textContent !== String(visibleCount);
    count.textContent = String(visibleCount);
    if (changed && !reducedMotion && typeof count.animate === 'function') {
      count.animate([
        { opacity: 0.35, transform: 'translateY(8px) scale(0.9)' },
        { opacity: 1, transform: 'none' }
      ], {
        duration: 520,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
      });
    }
  }
  const empty = document.querySelector('[data-hub-empty]');
  if (empty) empty.hidden = visibleCount > 0;
}

if (hubSearch) {
  hubSearch.addEventListener('input', filterHub);
  filterHub();
}

const hubSidebarLinks = [...document.querySelectorAll('.hub-sidebar a[href^="#"]')];
const hubSectionLinks = new Map(hubSidebarLinks.map(link => [link.getAttribute('href')?.slice(1), link]));
const hubSections = [...document.querySelectorAll('[data-hub-group]')]
  .filter(section => hubSectionLinks.has(section.id));

function setCurrentHubSection(sectionId) {
  hubSidebarLinks.forEach(link => {
    const current = link.getAttribute('href') === `#${sectionId}`;
    link.classList.toggle('is-current', current);
    if (current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

if (hubSections.length && 'IntersectionObserver' in window) {
  const visibleHubSections = new Map();
  const hubObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleHubSections.set(entry.target.id, entry.boundingClientRect.top);
      else visibleHubSections.delete(entry.target.id);
    });
    const current = [...visibleHubSections.entries()]
      .sort((left, right) => Math.abs(left[1] - 130) - Math.abs(right[1] - 130))[0];
    if (current) setCurrentHubSection(current[0]);
  }, { rootMargin: '-16% 0px -66% 0px', threshold: 0.05 });
  hubSections.forEach(section => hubObserver.observe(section));
  setCurrentHubSection(hubSections[0].id);
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

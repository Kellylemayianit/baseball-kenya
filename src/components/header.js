// header.js — site header with navigation, the theme toggle, and the
// account menu. Signing in/out here means Cloudflare Access, not a local
// demo state — see src/utilities/auth.js.
import { html, raw } from '../utilities/helpers.js';
import { icon } from '../utilities/icons.js';
import { signOut, ROLE_LABELS, ROLE_ICONS } from '../utilities/auth.js';
import { toggleTheme } from '../utilities/theme.js';

const NAV = [
  { path: '/', label: 'Home' },
  { path: '/teams', label: 'Teams' },
  { path: '/matches', label: 'Matches' },
  { path: '/dashboard', label: 'Dashboard' },
];

const isCurrent = (item, path) => (item.path === '/' ? path === '/' : path === item.path || path.startsWith(`${item.path}/`));

function themeToggle() {
  return html`
    <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch between light and dark">
      <span class="icon-moon">${icon('moon')}</span>
      <span class="icon-sun">${icon('sun')}</span>
    </button>`;
}

function sessionMenu(user) {
  if (!user) {
    return html`<a class="btn btn--outline btn--sm" href="#/dashboard">${icon('user')} Sign in</a>`;
  }
  return html`
    <details class="session">
      <summary><span class="btn btn--dark btn--sm">${icon(ROLE_ICONS[user.role] ?? 'user')} ${user.name}</span></summary>
      <div class="session__menu">
        <a class="session__item" href="#/dashboard">Dashboard <small>${ROLE_LABELS[user.role] ?? user.role}</small></a>
        <button class="session__item" type="button" data-signout>Sign out</button>
      </div>
    </details>`;
}

export function renderHeader({ path, user }) {
  return html`
    <div class="container site-header__bar">
      <a class="brand" href="#/" aria-label="Baseball Kenya, home">${icon('baseball')} Baseball Kenya</a>
      <button class="btn btn--quiet nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
        ${icon('menu')} <span>Menu</span>
      </button>
      <nav class="nav" id="site-nav" aria-label="Main">
        ${NAV.map((item) => html`
          <a class="nav__link" href="#${item.path}" ${isCurrent(item, path) ? raw('aria-current="page"') : ''}>${item.label}</a>`)}
        ${themeToggle()}
        ${sessionMenu(user)}
      </nav>
    </div>`;
}

// Bound once on the persistent header element; it survives re-renders.
export function bindHeader(root, { onNavigate }) {
  root.addEventListener('click', (event) => {
    const toggle = event.target.closest('.nav-toggle');
    if (toggle) {
      const nav = root.querySelector('.nav');
      const open = nav.dataset.open !== 'true';
      nav.dataset.open = String(open);
      toggle.setAttribute('aria-expanded', String(open));
      return;
    }

    if (event.target.closest('[data-theme-toggle]')) {
      toggleTheme();
      return;
    }

    if (event.target.closest('[data-signout]')) {
      signOut();
      return;
    }

    if (event.target.closest('.nav__link')) {
      const nav = root.querySelector('.nav');
      nav.dataset.open = 'false';
      root.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', (event) => {
    root.querySelectorAll('details.session[open]').forEach((d) => { if (!d.contains(event.target)) d.open = false; });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') root.querySelectorAll('details.session[open]').forEach((d) => { d.open = false; });
  });
}

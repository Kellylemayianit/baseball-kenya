// router.js — tiny hash router. Routes look like "#/teams/t1?tab=roster".
// Pages are async functions that return { title, html, mount? }.
import { html } from './utilities/helpers.js';

const SITE = 'Baseball Kenya';

let routes = [];
let outlet = null;
let onRoute = null;
let token = 0;
let controller = null;

function compile(path) {
  const keys = [];
  const pattern = path.replace(/\/:([A-Za-z]+)/g, (_, key) => {
    keys.push(key);
    return '/([^/]+)';
  });
  return { regex: new RegExp(`^${pattern}/?$`), keys };
}

function matchRoute(path) {
  for (const route of routes) {
    const found = route.regex.exec(path);
    if (found) {
      const params = {};
      route.keys.forEach((key, i) => { params[key] = decodeURIComponent(found[i + 1]); });
      return { route, params };
    }
  }
  return null;
}

// Returns null for hashes that are not routes (like the skip link's "#main").
export function parseHash(hash = location.hash) {
  if (!hash.startsWith('#/')) return null;
  const q = hash.indexOf('?');
  return {
    path: q < 0 ? hash.slice(1) : hash.slice(1, q),
    query: new URLSearchParams(q < 0 ? '' : hash.slice(q + 1)),
  };
}

export function navigate(to, { replace = false } = {}) {
  const target = `#${to}`;
  if (location.hash === target) refresh();
  else if (replace) location.replace(target);
  else location.hash = target;
}

// Change the query string without adding history entries or re-rendering.
export function setQuery(params) {
  const parsed = parseHash();
  if (!parsed) return;
  const next = new URLSearchParams(parsed.query);
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value); else next.delete(key);
  }
  const qs = next.toString();
  history.replaceState(null, '', `#${parsed.path}${qs ? `?${qs}` : ''}`);
}

const notFound = () => ({
  title: 'Page not found',
  html: html`
    <section class="section"><div class="container stack">
      <h1>Page not found</h1>
      <p class="muted">That address does not match anything on Baseball Kenya.</p>
      <p><a class="btn btn--primary" href="#/">Back to the home page</a></p>
    </div></section>`,
});

const failure = () => ({
  title: 'Something went wrong',
  html: html`
    <section class="section"><div class="container stack">
      <h1>We could not load this page</h1>
      <p class="muted">Check your connection and try again. Nothing you entered was lost.</p>
      <p><button class="btn btn--primary" type="button" data-retry>Try again</button></p>
    </div></section>`,
  mount(root, ctx) {
    root.querySelector('[data-retry]')?.addEventListener('click', ctx.refresh, { signal: ctx.signal });
  },
});

async function render({ keepScroll = false } = {}) {
  const parsed = parseHash();
  if (!parsed) return;

  const mine = ++token;
  controller?.abort();
  controller = new AbortController();

  const found = matchRoute(parsed.path);
  const ctx = {
    path: parsed.path,
    query: parsed.query,
    params: found?.params ?? {},
    signal: controller.signal,
    navigate,
    refresh,
  };
  onRoute?.(ctx);
  outlet.setAttribute('aria-busy', 'true');

  let result;
  try {
    const redirect = found?.route.guard?.(ctx);
    if (redirect) {
      navigate(redirect, { replace: true });
      return;
    }
    result = found ? await found.route.page(ctx) : notFound();
  } catch (error) {
    console.error(error);
    result = failure();
  }
  if (mine !== token) return;

  outlet.innerHTML = String(result.html);
  document.title = result.title.includes(SITE) ? result.title : `${result.title} | ${SITE}`;
  result.mount?.(outlet, ctx);
  outlet.removeAttribute('aria-busy');

  if (!keepScroll) {
    window.scrollTo(0, 0);
    const heading = outlet.querySelector('h1');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
}

export function refresh() {
  return render({ keepScroll: true });
}

export function startRouter({ outlet: element, routes: list, onRoute: hook }) {
  outlet = element;
  onRoute = hook;
  routes = list.map((route) => ({ ...route, ...compile(route.path) }));
  window.addEventListener('hashchange', () => render());
  if (!location.hash.startsWith('#/')) history.replaceState(null, '', '#/');
  return render();
}

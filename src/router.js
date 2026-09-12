/**
 * router.js — a small dependency-free hash router. Routes are matched
 * against `location.hash`; dynamic segments use a leading colon
 * (e.g. "/teams/:id"). Each route entry supplies a render(container,
 * params) function returning void or a Promise.
 */

let routes = [];
let notFoundHandler = null;
let container = null;
let beforeEachHook = null;
let currentCleanup = null;

function compile(path) {
  const paramNames = [];
  const pattern = path
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith(":")) {
        paramNames.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^/${pattern}/?$`), paramNames };
}

/** Register a route: path, render(container, params, query), optional meta. */
export function addRoute(path, render, meta = {}) {
  routes.push({ path, render, meta, ...compile(path) });
}

/** Register a fallback for unmatched hashes. */
export function setNotFound(render) {
  notFoundHandler = render;
}

/** Register a guard run before every navigation: (meta) => true | string (redirect hash). */
export function beforeEach(hook) {
  beforeEachHook = hook;
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [pathPart, queryPart] = raw.split("?");
  const query = Object.fromEntries(new URLSearchParams(queryPart || ""));
  return { path: pathPart || "/", query };
}

function matchRoute(path) {
  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
      return { route, params };
    }
  }
  return null;
}

async function handleChange() {
  if (!container) return;
  const { path, query } = parseHash();
  const matched = matchRoute(path);

  if (typeof currentCleanup === "function") {
    try {
      currentCleanup();
    } catch {
      /* no-op: page cleanup should not break navigation */
    }
    currentCleanup = null;
  }

  if (!matched) {
    if (notFoundHandler) notFoundHandler(container);
    return;
  }

  if (beforeEachHook) {
    const result = beforeEachHook(matched.route.meta, { path, query, params: matched.params });
    if (result === false) return;
    if (typeof result === "string") {
      location.hash = result;
      return;
    }
  }

  const cleanup = await matched.route.render(container, matched.params, query);
  if (typeof cleanup === "function") currentCleanup = cleanup;
}

/** Initialize the router against a container element. */
export function startRouter(mountEl) {
  container = mountEl;
  window.addEventListener("hashchange", handleChange);
  handleChange();
}

export function navigate(hashPath) {
  location.hash = hashPath;
}

export function getCurrentHash() {
  return location.hash || "#/";
}

/**
 * helpers.js — small, dependency-free DOM and formatting utilities
 * shared across pages and components.
 */

/** Query a single element within an optional root. */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/** Query all elements within an optional root, returned as a real array. */
export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Create a DOM element with attributes/children in one call.
 * @param {string} tag
 * @param {object} [attrs] - attributes; `class`/`className`, `html`, and
 *   `on<Event>` handlers are treated specially.
 * @param {(Node|string)[]} [children]
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === "class" || key === "className") {
      node.className = value;
    } else if (key === "html") {
      node.innerHTML = value;
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "dataset") {
      Object.entries(value).forEach(([dk, dv]) => (node.dataset[dk] = dv));
    } else {
      node.setAttribute(key, value);
    }
  });

  children.forEach((child) => {
    if (child == null) return;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  });

  return node;
}

/** Format an ISO date string as "Sat, 14 Jun 2026". */
export function formatDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Format an ISO date string as "3:30 PM". */
export function formatTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
}

/** Debounce a function by the given delay in ms. */
export function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Slugify a team/city name for use in routes and ids. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Clamp a number between min and max. */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Simple unique id generator for demo records. */
export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Remove all children from a node. */
export function empty(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Mount content (Node, array of Nodes, or HTML string) into a container. */
export function mount(container, content) {
  empty(container);
  if (Array.isArray(content)) {
    content.forEach((c) => c && container.append(c));
  } else if (content instanceof Node) {
    container.append(content);
  } else if (typeof content === "string") {
    container.innerHTML = content;
  }
}

// theme.js — light/dark toggle. The choice is a per-device display setting,
// not user data, so it lives in localStorage rather than going through the
// api.js service layer. index.html applies it before first paint (see the
// inline script in <head>) so there is no flash of the wrong theme.

const KEY = 'bk-theme'; // 'light' | 'dark' | absent (follow the system)

export function getTheme() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function apply(value) {
  if (value === 'light' || value === 'dark') document.documentElement.setAttribute('data-theme', value);
  else document.documentElement.removeAttribute('data-theme');
}

export function setTheme(value) {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch { /* private browsing or storage disabled: theme just won't persist */ }
  apply(value);
}

export function toggleTheme() {
  const current = getTheme() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

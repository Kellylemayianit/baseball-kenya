// app.js — entry point. Wires the router, header and footer together, and
// resolves the Cloudflare Access session once before the first render so
// the very first page shown already reflects who's signed in.
import { startRouter, navigate, refresh, parseHash } from './router.js';
import { renderHeader, bindHeader } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { getUser, onAuthChange, refreshSession } from './utilities/auth.js';
import { homePage } from './pages/homePage.js';
import { teamsPage } from './pages/teamsPage.js';
import { teamDetailPage } from './pages/teamDetailPage.js';
import { matchesPage } from './pages/matchesPage.js';
import { dashboardPage } from './pages/dashboardPage.js';

const headerEl = document.getElementById('site-header');
const footerEl = document.getElementById('site-footer');
const outlet = document.getElementById('main');

const drawHeader = (path) => { headerEl.innerHTML = String(renderHeader({ path, user: getUser() })); };

const routes = [
  { path: '/', page: homePage },
  { path: '/teams', page: teamsPage },
  { path: '/teams/:id', page: teamDetailPage },
  { path: '/matches', page: matchesPage },
  { path: '/dashboard', page: dashboardPage },
];

footerEl.innerHTML = String(renderFooter());
bindHeader(headerEl, { onNavigate: (path) => navigate(path) });

onAuthChange(() => {
  drawHeader(parseHash()?.path ?? '/');
  refresh();
});

await refreshSession();

startRouter({
  outlet,
  routes,
  onRoute: (ctx) => drawHeader(ctx.path),
});

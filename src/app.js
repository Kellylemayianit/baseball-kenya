/**
 * app.js — application bootstrap. Mounts the persistent header/footer,
 * registers every route, and starts the hash router. This is the only
 * module loaded directly by index.html (`type="module"`).
 */
import { addRoute, setNotFound, beforeEach, startRouter, getCurrentHash } from "./router.js";
import { renderHeader, syncHeaderActiveState } from "./components/header.js";
import { renderFooter } from "./components/footer.js";
import { el } from "./utilities/helpers.js";

import { renderHomePage } from "./pages/homePage.js";
import { renderTeamsPage } from "./pages/teamsPage.js";
import { renderTeamDetailPage } from "./pages/teamDetailPage.js";
import { renderMatchesPage } from "./pages/matchesPage.js";
import { renderDashboardPage } from "./pages/dashboardPage.js";

function renderNotFound(container) {
  container.innerHTML = "";
  container.append(
    el("section", { class: "section", style: "border-bottom:none;" }, [
      el("div", { class: "container", style: "padding-block:var(--space-9);text-align:left;" }, [
        el("span", { class: "eyebrow" }, ["Error 404"]),
        el("h1", {}, ["That page isn't on the field"]),
        el("p", {}, ["The link may be out of date. Head back to the hub to keep browsing."]),
        el("a", { class: "btn btn-primary", href: "#/" }, ["Back to home"]),
      ]),
    ])
  );
}

function bootstrap() {
  const appRoot = document.getElementById("app-root");
  const header = renderHeader();
  const main = el("main", { id: "app-main" });
  const footer = renderFooter();

  appRoot.append(header, main, footer);

  addRoute("/", renderHomePage, { title: "Baseball Kenya" });
  addRoute("/teams", renderTeamsPage, { title: "Teams · Baseball Kenya" });
  addRoute("/teams/:id", renderTeamDetailPage, { title: "Team · Baseball Kenya" });
  addRoute("/matches", renderMatchesPage, { title: "Fixtures & Results · Baseball Kenya" });
  addRoute("/dashboard", renderDashboardPage, { title: "Dashboard · Baseball Kenya" });
  setNotFound(renderNotFound);

  beforeEach((meta) => {
    if (meta.title) document.title = meta.title;
    return true;
  });

  window.addEventListener("hashchange", () => syncHeaderActiveState(header, getCurrentHash()));
  syncHeaderActiveState(header, getCurrentHash());

  startRouter(main);
  window.scrollTo(0, 0);
  window.addEventListener("hashchange", () => window.scrollTo(0, 0));
}

document.addEventListener("DOMContentLoaded", bootstrap);

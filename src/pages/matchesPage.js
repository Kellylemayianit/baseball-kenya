/**
 * matchesPage.js — full fixtures & results list with status filtering.
 */
import { el, mount } from "../utilities/helpers.js";
import { getTeams, getMatches } from "../services/dataLoader.js";
import { renderMatchCard } from "../components/matchCard.js";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "scheduled", label: "Upcoming" },
  { key: "final", label: "Results" },
];

export async function renderMatchesPage(container) {
  mount(container, [
    el("section", { class: "section", style: "border-bottom:none;" }, [
      el("div", { class: "container" }, [
        el("div", { class: "section__head" }, [
          el("div", {}, [
            el("span", { class: "eyebrow" }, ["League calendar"]),
            el("h1", {}, ["Fixtures & results"]),
            el("p", {}, ["Every match this season, from first pitch to final score."]),
          ]),
        ]),
        el("div", { id: "filter-tabs", style: "display:flex;gap:var(--space-3);margin-bottom:var(--space-6);flex-wrap:wrap;" }),
        el("div", { class: "grid", id: "matches-grid" }),
      ]),
    ]),
  ]);

  const [matches, teams] = await Promise.all([getMatches(), getTeams()]);
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const sorted = matches.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

  const tabsMount = container.querySelector("#filter-tabs");
  const gridMount = container.querySelector("#matches-grid");
  let activeFilter = "all";

  function renderTabs() {
    mount(
      tabsMount,
      FILTERS.map((f) =>
        el(
          "button",
          {
            class: f.key === activeFilter ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm",
            onClick: () => {
              activeFilter = f.key;
              renderTabs();
              renderList();
            },
          },
          [f.label]
        )
      )
    );
  }

  function renderList() {
    const filtered = activeFilter === "all" ? sorted : sorted.filter((m) => m.status === activeFilter);
    mount(
      gridMount,
      filtered.length
        ? filtered.map((m) => renderMatchCard(m, teamsById))
        : [
            el("div", { class: "empty-state" }, [
              el("h3", {}, ["Nothing here yet"]),
              el("p", {}, ["Check back once matches are scheduled or played."]),
            ]),
          ]
    );
  }

  renderTabs();
  renderList();
}

/**
 * teamsPage.js — full team listing with a client-side name/city filter.
 */
import { el, mount, debounce } from "../utilities/helpers.js";
import { getTeams } from "../services/dataLoader.js";
import { renderTeamCard } from "../components/teamCard.js";

export async function renderTeamsPage(container) {
  mount(container, [
    el("section", { class: "section", style: "border-bottom:none;" }, [
      el("div", { class: "container" }, [
        el("div", { class: "section__head" }, [
          el("div", {}, [
            el("span", { class: "eyebrow" }, ["League roster"]),
            el("h1", {}, ["Teams"]),
            el("p", {}, ["Six clubs competing across Kenya's amateur baseball circuit this season."]),
          ]),
          el("input", {
            type: "search",
            id: "team-search",
            placeholder: "Search by team or city…",
            "aria-label": "Search teams",
            style:
              "background:var(--pitch-700);border:1px solid var(--line-600);color:var(--chalk-100);border-radius:var(--radius-sm);padding:0.6em 1em;min-width:16rem;",
          }),
        ]),
        el("div", { class: "grid", id: "teams-grid" }),
      ]),
    ]),
  ]);

  const teams = await getTeams();
  const gridMount = container.querySelector("#teams-grid");
  const searchInput = container.querySelector("#team-search");

  function renderList(list) {
    mount(
      gridMount,
      list.length
        ? list.map(renderTeamCard)
        : [
            el("div", { class: "empty-state" }, [
              el("h3", {}, ["No teams match that search"]),
              el("p", {}, ["Try a different team or city name."]),
            ]),
          ]
    );
  }

  renderList(teams);

  const onSearch = debounce((event) => {
    const query = event.target.value.trim().toLowerCase();
    const filtered = teams.filter(
      (t) => t.name.toLowerCase().includes(query) || t.city.toLowerCase().includes(query)
    );
    renderList(filtered);
  }, 180);

  searchInput.addEventListener("input", onSearch);
}

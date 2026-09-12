/**
 * dashboardPage.js — league official's dashboard. Gated by the mock
 * auth module; shows a sign-in prompt until a session exists, then
 * renders the sidebar shell and a match proceedings table with full
 * create/edit/delete via matchFormModal.
 */
import { el, mount, formatDate, formatTime } from "../utilities/helpers.js";
import { icon } from "../utilities/icons.js";
import { isAuthenticated, getCurrentUser, login, logout } from "../utilities/auth.js";
import {
  getTeams,
  getMatches,
  getStandings,
  createMatch,
  updateMatch,
  deleteMatch,
} from "../services/dataLoader.js";
import { openMatchFormModal } from "../components/matchFormModal.js";

const STATUS_LABEL = { scheduled: "Scheduled", live: "Live", final: "Final" };

function renderSignInGate(container, onSignedIn) {
  mount(container, [
    el("section", { class: "section", style: "border-bottom:none;" }, [
      el("div", { class: "container", style: "max-width:28rem;padding-block:var(--space-9);" }, [
        el("span", { class: "eyebrow" }, ["Officials only"]),
        el("h1", {}, ["Sign in to the dashboard"]),
        el("p", {}, [
          "This demo dashboard uses a mock session — enter a name to continue, no password required.",
        ]),
        el(
          "form",
          {
            style: "display:flex;flex-direction:column;gap:var(--space-4);margin-top:var(--space-6);",
            onSubmit: (e) => {
              e.preventDefault();
              const name = new FormData(e.target).get("name") || "League Admin";
              login({ name: String(name).trim() || "League Admin", role: "Match Official" });
              onSignedIn();
            },
          },
          [
            el("div", { class: "form-field" }, [
              el("label", { for: "signin-name" }, ["Your name"]),
              el("input", { id: "signin-name", name: "name", type: "text", placeholder: "e.g. Grace Wambui", autofocus: true }),
            ]),
            el("button", { class: "btn btn-primary", type: "submit" }, ["Enter dashboard"]),
          ]
        ),
      ]),
    ]),
  ]);
}

export async function renderDashboardPage(container) {
  if (!isAuthenticated()) {
    renderSignInGate(container, () => renderDashboardPage(container));
    return;
  }

  const user = getCurrentUser();

  mount(container, [
    el("div", { class: "dashboard" }, [
      el("aside", { class: "dashboard__sidebar" }, [
        el("div", { class: "dashboard__identity" }, [
          el("div", { class: "dashboard__avatar" }, [user.name[0]?.toUpperCase() || "A"]),
          el("div", {}, [
            el("div", { class: "dashboard__identity-name" }, [user.name]),
            el("div", { class: "dashboard__identity-role" }, [user.role]),
          ]),
        ]),
        el("div", { class: "dashboard__nav-group" }, [
          el("h4", {}, ["Overview"]),
          el("ul", { class: "dashboard__nav-list" }, [
            el("li", {}, [
              el("a", { class: "dashboard__nav-link is-active", href: "#/dashboard" }, [
                el("span", { html: icon("chart") }),
                "Match proceedings",
              ]),
            ]),
            el("li", {}, [
              el("a", { class: "dashboard__nav-link", href: "#/teams" }, [
                el("span", { html: icon("users") }),
                "Teams",
              ]),
            ]),
            el("li", {}, [
              el("a", { class: "dashboard__nav-link", href: "#/matches" }, [
                el("span", { html: icon("calendar") }),
                "Public schedule",
              ]),
            ]),
          ]),
        ]),
        el("div", { class: "dashboard__nav-group", style: "margin-top:auto;" }, [
          el("ul", { class: "dashboard__nav-list" }, [
            el("li", {}, [
              el(
                "button",
                {
                  class: "dashboard__nav-link",
                  style: "width:100%;background:none;border:none;text-align:left;cursor:pointer;",
                  onClick: () => {
                    logout();
                    renderDashboardPage(container);
                  },
                },
                [el("span", { html: icon("logout") }), "Sign out"]
              ),
            ]),
          ]),
        ]),
      ]),
      el("main", { class: "dashboard__main" }, [
        el("div", { class: "dashboard__header" }, [
          el("div", {}, [
            el("span", { class: "eyebrow" }, ["League operations"]),
            el("h1", { style: "margin-bottom:var(--space-1);" }, ["Match proceedings"]),
            el("p", { style: "margin:0;" }, ["Create, update and finalize matches across the season."]),
          ]),
          el(
            "button",
            {
              class: "btn btn-primary",
              id: "new-match-btn",
            },
            [el("span", { html: icon("plus") }), "New match"]
          ),
        ]),
        el("div", { class: "stat-strip", id: "stat-strip" }),
        el("div", { class: "panel" }, [
          el("div", { class: "panel__head" }, [el("h3", {}, ["All matches"])]),
          el("div", { style: "overflow-x:auto;" }, [
            el("table", { class: "proceedings-table" }, [
              el("thead", {}, [
                el("tr", {}, [
                  el("th", {}, ["Matchup"]),
                  el("th", {}, ["Venue"]),
                  el("th", {}, ["Date"]),
                  el("th", {}, ["Score"]),
                  el("th", {}, ["Status"]),
                  el("th", {}, [""]),
                ]),
              ]),
              el("tbody", { id: "proceedings-body" }),
            ]),
          ]),
        ]),
      ]),
    ]),
  ]);

  await refresh(container);

  container.querySelector("#new-match-btn").addEventListener("click", async () => {
    const teams = await getTeams();
    openMatchFormModal({
      teams,
      onSubmit: async (payload) => {
        await createMatch(payload);
        await refresh(container);
      },
      onClose: () => {},
    });
  });
}

async function refresh(container) {
  const [matches, teams, standings] = await Promise.all([getMatches(), getTeams(), getStandings()]);
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const sorted = matches.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

  const statMount = container.querySelector("#stat-strip");
  if (statMount) {
    const live = matches.filter((m) => m.status === "live").length;
    const scheduled = matches.filter((m) => m.status === "scheduled").length;
    const leader = standings[0];
    mount(statMount, [
      statTile(String(matches.length), "Total matches logged"),
      statTile(String(live), "Live right now"),
      statTile(String(scheduled), "Scheduled ahead"),
      statTile(leader ? leader.name : "—", "League leader"),
    ]);
  }

  const body = container.querySelector("#proceedings-body");
  if (!body) return;

  if (!sorted.length) {
    mount(
      body,
      el("tr", {}, [
        el("td", { colspan: "6" }, [
          el("div", { class: "empty-state" }, [el("h3", {}, ["No matches yet"]), el("p", {}, ["Add the first fixture to get started."])]),
        ]),
      ])
    );
    return;
  }

  mount(
    body,
    sorted.map((m) => {
      const home = teamsById[m.homeTeamId]?.name || "TBD";
      const away = teamsById[m.awayTeamId]?.name || "TBD";
      const scoreText = m.homeScore == null && m.awayScore == null ? "—" : `${m.homeScore ?? "-"} : ${m.awayScore ?? "-"}`;

      return el("tr", {}, [
        el("td", { class: "cell-strong" }, [`${home} vs ${away}`]),
        el("td", {}, [m.venue]),
        el("td", {}, [`${formatDate(m.date)}, ${formatTime(m.date)}`]),
        el("td", {}, [scoreText]),
        el("td", {}, [el("span", { class: `status-pill status-pill--${m.status}` }, [STATUS_LABEL[m.status] || m.status])]),
        el("td", { class: "cell-actions" }, [
          el(
            "button",
            {
              class: "icon-btn",
              "aria-label": `Edit ${home} vs ${away}`,
              onClick: async () => {
                const teams2 = await getTeams();
                openMatchFormModal({
                  teams: teams2,
                  match: m,
                  onSubmit: async (payload) => {
                    await updateMatch(m.id, payload);
                    await refresh(container);
                  },
                });
              },
            },
            [el("span", { html: icon("edit") })]
          ),
          el(
            "button",
            {
              class: "icon-btn",
              "aria-label": `Delete ${home} vs ${away}`,
              onClick: async () => {
                if (!confirm(`Remove ${home} vs ${away}? This can't be undone.`)) return;
                await deleteMatch(m.id);
                await refresh(container);
              },
            },
            [el("span", { html: icon("trash") })]
          ),
        ]),
      ]);
    })
  );
}

function statTile(value, label) {
  return el("div", { class: "stat-tile" }, [
    el("div", { class: "stat-tile__value" }, [value]),
    el("div", { class: "stat-tile__label" }, [label]),
  ]);
}

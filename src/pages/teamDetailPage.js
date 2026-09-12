/**
 * teamDetailPage.js — a single team's profile: roster table and its
 * recent/upcoming matches.
 */
import { el, mount } from "../utilities/helpers.js";
import { getTeamById, getMatchesForTeam, getTeams } from "../services/dataLoader.js";
import { renderMatchCard } from "../components/matchCard.js";
import { icon } from "../utilities/icons.js";

export async function renderTeamDetailPage(container, params) {
  mount(container, [el("div", { class: "container", style: "padding-block:var(--space-8);" }, ["Loading team…"])]);

  let team;
  try {
    team = await getTeamById(params.id);
  } catch {
    team = null;
  }

  if (!team) {
    mount(container, [
      el("section", { class: "section", style: "border-bottom:none;" }, [
        el("div", { class: "container" }, [
          el("div", { class: "empty-state" }, [
            el("h3", {}, ["Team not found"]),
            el("p", {}, ["That club isn't in the league yet."]),
            el("a", { class: "btn btn-primary", href: "#/teams" }, ["Back to teams"]),
          ]),
        ]),
      ]),
    ]);
    return;
  }

  const [matches, allTeams] = await Promise.all([getMatchesForTeam(team.id), getTeams()]);
  const teamsById = Object.fromEntries(allTeams.map((t) => [t.id, t]));

  const rosterRows = team.roster.map((player) =>
    el("tr", {}, [
      el("td", { class: "cell-strong" }, [player.name]),
      el("td", {}, [player.position]),
      el("td", {}, [`#${player.number}`]),
    ])
  );

  mount(container, [
    el("section", { class: "section", style: "padding-bottom:var(--space-6);" }, [
      el("div", { class: "container" }, [
        el("a", { class: "btn-ghost", href: "#/teams" }, ["← All teams"]),
        el("div", { style: "display:flex;align-items:center;gap:var(--space-4);margin-top:var(--space-4);" }, [
          el("div", {
            style:
              "width:3.5rem;height:3.5rem;border-radius:var(--radius-md);background:var(--pitch-700);display:flex;align-items:center;justify-content:center;color:var(--floodlight-500);",
            html: icon("trophy"),
          }),
          el("div", {}, [
            el("h1", { style: "margin-bottom:var(--space-1);" }, [team.name]),
            el("p", { style: "margin:0;" }, [`${team.city} · Home field: ${team.home} · Est. ${team.founded}`]),
          ]),
        ]),
        el("div", { class: "stat-strip", style: "margin-top:var(--space-6);" }, [
          el("div", { class: "stat-tile" }, [
            el("div", { class: "stat-tile__value" }, [String(team.wins)]),
            el("div", { class: "stat-tile__label" }, ["Wins this season"]),
          ]),
          el("div", { class: "stat-tile" }, [
            el("div", { class: "stat-tile__value" }, [String(team.losses)]),
            el("div", { class: "stat-tile__label" }, ["Losses this season"]),
          ]),
          el("div", { class: "stat-tile" }, [
            el("div", { class: "stat-tile__value" }, [team.wins + team.losses ? (team.wins / (team.wins + team.losses)).toFixed(3) : "—"]),
            el("div", { class: "stat-tile__label" }, ["Win percentage"]),
          ]),
        ]),
      ]),
    ]),
    el("section", { class: "section" }, [
      el("div", { class: "container" }, [
        el("div", { class: "panel" }, [
          el("div", { class: "panel__head" }, [el("h3", {}, ["Roster"])]),
          el("table", { class: "proceedings-table" }, [
            el("thead", {}, [
              el("tr", {}, [el("th", {}, ["Player"]), el("th", {}, ["Position"]), el("th", {}, ["No."])]),
            ]),
            el("tbody", {}, rosterRows),
          ]),
        ]),
      ]),
    ]),
    el("section", { class: "section", style: "border-bottom:none;" }, [
      el("div", { class: "container" }, [
        el("div", { class: "section__head" }, [el("h2", {}, ["Recent & upcoming matches"])]),
        el(
          "div",
          { class: "grid" },
          matches.length
            ? matches.map((m) => renderMatchCard(m, teamsById))
            : [el("div", { class: "empty-state" }, [el("h3", {}, ["No matches recorded yet"])])]
        ),
      ]),
    ]),
  ]);
}

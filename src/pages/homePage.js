/**
 * homePage.js — landing page. Renders synchronously first (hero shell),
 * then fills in data-dependent sections once the mock API resolves.
 */
import { el, mount, formatDate, formatTime } from "../utilities/helpers.js";
import { getTeams, getUpcomingMatches, getLiveOrRecentMatches, getStandings } from "../services/dataLoader.js";
import { renderTeamCard } from "../components/teamCard.js";
import { renderMatchCard } from "../components/matchCard.js";

const DIAMOND_SVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="var(--line-600)" stroke-width="1.5">
    <path d="M100 170 A70 70 0 0 1 30 100" stroke-dasharray="3 5"/>
    <path d="M100 170 A70 70 0 0 0 170 100" stroke-dasharray="3 5"/>
  </g>
  <path d="M100 170 L40 110 L100 40 L160 110 Z" fill="var(--pitch-800)" stroke="var(--line-600)" stroke-width="1.5"/>
  <path d="M100 170 L40 110 L100 40 L160 110 Z" fill="none" stroke="var(--clay-500)" stroke-width="2" stroke-dasharray="1 9" stroke-linecap="round"/>
  <circle cx="100" cy="170" r="6" fill="var(--chalk-100)"/>
  <circle cx="40" cy="110" r="6" fill="var(--chalk-200)"/>
  <circle cx="100" cy="40" r="6" fill="var(--chalk-200)"/>
  <circle cx="160" cy="110" r="6" fill="var(--chalk-200)"/>
  <circle cx="100" cy="122" r="5" fill="var(--floodlight-500)"/>
</svg>`;

function renderHero() {
  return el("section", { class: "hero" }, [
    el("div", { class: "container hero__grid" }, [
      el("div", {}, [
        el("span", { class: "eyebrow" }, ["Kenya Amateur Baseball League · 2026 Season"]),
        el("h1", { class: "hero__title" }, [
          "Every diamond, every roster, ",
          el("em", {}, ["every proceeding"]),
          " — in one hub.",
        ]),
        el("p", { class: "hero__lede" }, [
          "Follow the six teams chasing this season's pennant, browse rosters city by city, and check fixtures as they're set. League officials manage matches from the dashboard in real time.",
        ]),
        el("div", { class: "hero__actions" }, [
          el("a", { class: "btn btn-primary", href: "#/matches" }, ["See this week's fixtures"]),
          el("a", { class: "btn btn-secondary", href: "#/teams" }, ["Browse teams"]),
        ]),
      ]),
      el("div", { class: "hero__diamond", html: DIAMOND_SVG }),
    ]),
    el("div", { class: "container" }, [
      el("div", { id: "scoreboard-mount" }),
    ]),
  ]);
}

function renderScoreboard(matches, teamsById) {
  const cells = matches.slice(0, 5).map((m) => {
    const home = teamsById[m.homeTeamId]?.name || "TBD";
    const away = teamsById[m.awayTeamId]?.name || "TBD";
    const scoreText =
      m.status === "scheduled" ? formatTime(m.date) : `${m.homeScore ?? "-"} – ${m.awayScore ?? "-"}`;
    return el("div", { class: "scoreboard__cell" }, [
      el("div", { class: "scoreboard__teams" }, [
        el("span", {}, [home]),
        el("span", {}, [away]),
      ]),
      el("div", { class: "scoreboard__meta" }, [
        `${m.status === "live" ? "Live · " : ""}${formatDate(m.date)} · ${scoreText}`,
      ]),
    ]);
  });

  return el("div", { class: "scoreboard" }, [
    el("div", { class: "scoreboard__head" }, [
      el("span", {}, ["Latest across the league"]),
      el("a", { class: "btn-ghost", href: "#/matches" }, ["Full schedule →"]),
    ]),
    el("div", { class: "scoreboard__row" }, cells.length ? cells : [el("div", { class: "scoreboard__cell" }, ["No matches yet."])]),
  ]);
}

function renderStandingsPanel(standings) {
  const rows = standings.slice(0, 6).map((t, i) =>
    el("tr", {}, [
      el("td", {}, [String(i + 1)]),
      el("td", { class: "cell-strong" }, [t.name]),
      el("td", {}, [String(t.wins)]),
      el("td", {}, [String(t.losses)]),
      el("td", {}, [t.pct.toFixed(3)]),
    ])
  );

  return el("div", { class: "panel" }, [
    el("div", { class: "panel__head" }, [
      el("h3", {}, ["Season standings"]),
      el("a", { class: "btn-ghost", href: "#/teams" }, ["All teams →"]),
    ]),
    el("table", { class: "proceedings-table" }, [
      el("thead", {}, [
        el("tr", {}, [
          el("th", {}, ["#"]),
          el("th", {}, ["Team"]),
          el("th", {}, ["W"]),
          el("th", {}, ["L"]),
          el("th", {}, ["Pct"]),
        ]),
      ]),
      el("tbody", {}, rows),
    ]),
  ]);
}

export async function renderHomePage(container) {
  mount(container, [
    renderHero(),
    el("section", { class: "section" }, [
      el("div", { class: "container" }, [
        el("div", { class: "section__head" }, [
          el("div", {}, [
            el("h2", {}, ["Teams to watch"]),
            el("p", {}, ["Six clubs, six cities, one pennant race."]),
          ]),
          el("a", { class: "btn btn-secondary", href: "#/teams" }, ["View all teams"]),
        ]),
        el("div", { class: "grid", id: "featured-teams-mount" }),
      ]),
    ]),
    el("section", { class: "section", style: "border-bottom:none;" }, [
      el("div", { class: "container" }, [
        el("div", { class: "section__head" }, [
          el("div", {}, [
            el("h2", {}, ["Upcoming fixtures"]),
            el("p", {}, ["Set your calendar for the next diamond dates."]),
          ]),
          el("a", { class: "btn btn-secondary", href: "#/matches" }, ["View schedule"]),
        ]),
        el("div", { class: "grid", id: "upcoming-mount" }),
        el("div", { style: "margin-top:var(--space-7);", id: "standings-mount" }),
      ]),
    ]),
  ]);

  const [teams, upcoming, recent, standings] = await Promise.all([
    getTeams(),
    getUpcomingMatches(3),
    getLiveOrRecentMatches(5),
    getStandings(),
  ]);
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));

  const scoreboardMount = container.querySelector("#scoreboard-mount");
  if (scoreboardMount) mount(scoreboardMount, renderScoreboard(recent, teamsById));

  const featuredMount = container.querySelector("#featured-teams-mount");
  if (featuredMount) mount(featuredMount, teams.slice(0, 3).map(renderTeamCard));

  const upcomingMount = container.querySelector("#upcoming-mount");
  if (upcomingMount) {
    mount(
      upcomingMount,
      upcoming.length
        ? upcoming.map((m) => renderMatchCard(m, teamsById))
        : [el("div", { class: "empty-state" }, [el("h3", {}, ["No fixtures scheduled"])])]
    );
  }

  const standingsMount = container.querySelector("#standings-mount");
  if (standingsMount) mount(standingsMount, renderStandingsPanel(standings));
}

/**
 * matchCard.js — a single fixture/result card. Accepts a map of teams
 * keyed by id so it never needs to fetch data itself.
 */
import { el, formatDate, formatTime } from "../utilities/helpers.js";

const STATUS_LABEL = {
  scheduled: "Scheduled",
  live: "Live now",
  final: "Final",
};

function teamName(teamsById, id) {
  return teamsById[id]?.name || "TBD";
}

export function renderMatchCard(match, teamsById) {
  const home = teamName(teamsById, match.homeTeamId);
  const away = teamName(teamsById, match.awayTeamId);
  const isFinal = match.status === "final";
  const homeWon = isFinal && match.homeScore > match.awayScore;
  const awayWon = isFinal && match.awayScore > match.homeScore;

  const statusEl = el(
    "span",
    { class: `match-card__status match-card__status--${match.status}` },
    [STATUS_LABEL[match.status] || match.status]
  );

  const scoreOrTime = (score) => (score == null ? "" : String(score));

  return el("article", { class: "match-card" }, [
    statusEl,
    el("div", { class: "match-card__teams" }, [
      el(
        "div",
        {
          class: `match-card__team ${homeWon ? "match-card__team--winner" : awayWon ? "match-card__team--loser" : ""}`,
        },
        [el("span", {}, [home]), el("span", { class: "match-card__score" }, [scoreOrTime(match.homeScore)])]
      ),
      el(
        "div",
        {
          class: `match-card__team ${awayWon ? "match-card__team--winner" : homeWon ? "match-card__team--loser" : ""}`,
        },
        [el("span", {}, [away]), el("span", { class: "match-card__score" }, [scoreOrTime(match.awayScore)])]
      ),
    ]),
    el("div", { class: "match-card__meta" }, [
      el("span", {}, [match.venue]),
      el("span", {}, [`${formatDate(match.date)} · ${formatTime(match.date)}`]),
    ]),
  ]);
}

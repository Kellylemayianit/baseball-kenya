/**
 * teamCard.js — compact team summary card linking to the team's
 * detail page.
 */
import { el } from "../utilities/helpers.js";

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function renderTeamCard(team) {
  return el("a", { class: "team-card", href: `#/teams/${team.id}` }, [
    el("div", { class: "team-card__crest" }, [initials(team.name)]),
    el("div", { class: "team-card__name" }, [team.name]),
    el("div", { class: "team-card__base" }, [`${team.city} · Est. ${team.founded} · ${team.home}`]),
    el("div", { class: "team-card__stats" }, [
      el("div", { class: "team-card__stat" }, [
        el("b", {}, [String(team.wins)]),
        el("span", {}, ["wins"]),
      ]),
      el("div", { class: "team-card__stat" }, [
        el("b", {}, [String(team.losses)]),
        el("span", {}, ["losses"]),
      ]),
      el("div", { class: "team-card__stat" }, [
        el("b", {}, [String(team.roster.length)]),
        el("span", {}, ["roster"]),
      ]),
    ]),
  ]);
}

/**
 * footer.js — persistent site footer, rendered once by app.js.
 */
import { el } from "../utilities/helpers.js";

export function renderFooter() {
  const year = new Date().getFullYear();

  return el("footer", { class: "site-footer" }, [
    el("div", { class: "container" }, [
      el("div", { class: "site-footer__grid" }, [
        el("div", {}, [
          el("div", { class: "site-footer__brand" }, ["Baseball Kenya"]),
          el("p", {}, [
            "The central hub for league standings, team rosters and match proceedings across Kenya's amateur baseball circuit.",
          ]),
        ]),
        el("div", {}, [
          el("h4", {}, ["Explore"]),
          el("ul", { class: "site-footer__list" }, [
            el("li", {}, [el("a", { href: "#/teams" }, ["Teams"])]),
            el("li", {}, [el("a", { href: "#/matches" }, ["Fixtures & results"])]),
            el("li", {}, [el("a", { href: "#/dashboard" }, ["Official dashboard"])]),
          ]),
        ]),
        el("div", {}, [
          el("h4", {}, ["League"]),
          el("ul", { class: "site-footer__list" }, [
            el("li", {}, [el("a", { href: "#/" }, ["About the league"])]),
            el("li", {}, [el("a", { href: "#/" }, ["Rules & season format"])]),
            el("li", {}, [el("a", { href: "#/" }, ["Get in touch"])]),
          ]),
        ]),
      ]),
      el("div", { class: "site-footer__bottom" }, [
        el("span", {}, [`© ${year} Baseball Kenya League. Demo data for illustration only.`]),
        el("span", {}, ["Built with vanilla HTML, CSS & JS — no framework."]),
      ]),
    ]),
  ]);
}

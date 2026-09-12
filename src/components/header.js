/**
 * header.js — persistent site header, rendered once by app.js and kept
 * in sync with the current hash route.
 */
import { el, qs, qsa } from "../utilities/helpers.js";
import { icon } from "../utilities/icons.js";

const NAV_LINKS = [
  { label: "Home", route: "#/" },
  { label: "Teams", route: "#/teams" },
  { label: "Matches", route: "#/matches" },
  { label: "Dashboard", route: "#/dashboard" },
];

export function renderHeader() {
  const nav = el(
    "nav",
    { class: "site-nav", id: "site-nav" },
    [
      el(
        "ul",
        { class: "site-nav__list" },
        NAV_LINKS.map((link) =>
          el("li", {}, [
            el("a", { class: "site-nav__link", href: link.route, dataset: { route: link.route } }, [
              link.label,
            ]),
          ])
        )
      ),
    ]
  );

  const toggle = el(
    "button",
    {
      class: "nav-toggle",
      "aria-expanded": "false",
      "aria-controls": "site-nav",
      onClick: () => {
        const isOpen = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      },
    },
    [el("span", { class: "visually-hidden" }, ["Toggle navigation"]), el("span", { html: icon("menu") })]
  );

  const header = el("header", { class: "site-header" }, [
    el("div", { class: "container site-header__bar" }, [
      el("a", { class: "brand", href: "#/" }, [
        el("span", { class: "brand__mark", html: icon("diamond") }),
        el("span", {}, ["Baseball Kenya"]),
        el("span", { class: "brand__locale" }, ["/ central hub"]),
      ]),
      nav,
      el("div", { class: "site-header__actions" }, [toggle]),
    ]),
  ]);

  return header;
}

/** Mark the nav link matching the current hash as current. */
export function syncHeaderActiveState(headerEl, currentHash) {
  const links = qsa(".site-nav__link", headerEl);
  links.forEach((link) => {
    const route = link.dataset.route;
    const isHome = route === "#/" && (currentHash === "#/" || currentHash === "");
    const matches = isHome || (route !== "#/" && currentHash.startsWith(route));
    if (matches) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
  const nav = qs(".site-nav", headerEl);
  const toggle = qs(".nav-toggle", headerEl);
  if (nav && nav.classList.contains("is-open")) {
    nav.classList.remove("is-open");
    toggle && toggle.setAttribute("aria-expanded", "false");
  }
}

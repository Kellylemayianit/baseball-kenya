// matchesPage.js — fixtures, results and standings for one league at a time.
import { html, groupBy, dayKey, formatDateLong } from '../utilities/helpers.js';
import { loadMatches } from '../services/dataLoader.js';
import { matchCard, standingsTable, bindMatchActions } from '../components/matchCard.js';

const VIEWS = [
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'results', label: 'Results' },
  { id: 'standings', label: 'Standings' },
];

export async function matchesPage(ctx) {
  const requested = ctx.query.get('view');
  const view = VIEWS.some((v) => v.id === requested) ? requested : 'fixtures';
  const d = await loadMatches(ctx.query.get('league'));
  const { ref, user, league } = d;
  const href = (v, l = league.id) => `#/matches?view=${v}&league=${l}`;

  const emptyFor = (title, text) => html`<div class="empty"><h3>${title}</h3><p>${text}</p></div>`;

  let body;
  if (view === 'fixtures') {
    const days = [...groupBy(d.fixtures, (m) => dayKey(m.date))];
    body = days.length
      ? days.map(([key, list]) => html`
          <h2 class="day-head">${formatDateLong(list[0].date)}</h2>
          <div class="grid-cards">${list.map((m) => matchCard(m, ref, user, { showLeague: false }))}</div>`)
      : emptyFor('No fixtures scheduled', 'The federation adds fixtures as the calendar is confirmed.');
  } else if (view === 'results') {
    body = d.results.length
      ? html`<div class="grid-cards">${d.results.map((m) => matchCard(m, ref, user, { showLeague: false }))}</div>`
      : emptyFor('No results yet', 'Scores appear here once teams submit them and the federation verifies them.');
  } else {
    body = html`
      ${standingsTable(d.standings, ref)}
      <p class="muted" style="margin-top:var(--s-3)">
        Only verified results count. PCT is wins plus half of ties, divided by games played. GB is games behind the leader.
        RS, RA and RD are runs scored, runs allowed and run difference.
      </p>`;
  }

  const page = html`
    <section class="page-head">
      <div class="container">
        <h1>Matches</h1>
        <p>${league.blurb}</p>
        <form class="filters" aria-label="Choose league">
          <div class="field field--wide">
            <label for="league-select">League or tournament</label>
            <select class="select" id="league-select">
              ${d.leagues.map((l) => html`<option value="${l.id}" ${l.id === league.id ? 'selected' : ''}>${l.name}</option>`)}
            </select>
          </div>
        </form>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <nav class="tabs" aria-label="Match views" style="margin-bottom:var(--s-5)">
          ${VIEWS.map((v) => html`<a class="tab" href="${href(v.id)}" ${v.id === view ? html`aria-current="page"` : ''}>${v.label}</a>`)}
        </nav>
        ${body}
      </div>
    </section>`;

  return {
    title: `${VIEWS.find((v) => v.id === view).label}, ${league.name}`,
    html: page,
    mount(root) {
      root.querySelector('.filters').addEventListener('submit', (e) => e.preventDefault(), { signal: ctx.signal });
      root.querySelector('#league-select').addEventListener('change', (e) => ctx.navigate(`/matches?view=${view}&league=${e.target.value}`), { signal: ctx.signal });
      bindMatchActions(root, ctx, ref);
    },
  };
}

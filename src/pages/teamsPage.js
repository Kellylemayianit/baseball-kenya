// teamsPage.js — searchable directory. Filtering happens in the browser so
// typing never re-renders the page; the URL is updated so views can be shared.
import { html, pluralize } from '../utilities/helpers.js';
import { loadTeams } from '../services/dataLoader.js';
import { teamCard } from '../components/teamCard.js';
import { bindMatchActions } from '../components/matchCard.js';
import { setQuery } from '../router.js';

export async function teamsPage(ctx) {
  const d = await loadTeams();
  const q = ctx.query.get('q') ?? '';
  const county = ctx.query.get('county') ?? '';

  const page = html`
    <section class="page-head">
      <div class="container">
        <h1>Teams</h1>
        <p>Clubs and academies playing baseball across Kenya. Open a team for its roster, home field and results.</p>
        <form class="filters" role="search" aria-label="Filter teams">
          <div class="field field--wide">
            <label for="team-q">Search by team or town</label>
            <input class="input" id="team-q" type="search" value="${q}" autocomplete="off">
          </div>
          <div class="field">
            <label for="team-county">County</label>
            <select class="select" id="team-county">
              <option value="">All counties</option>
              ${d.counties.map((c) => html`<option value="${c}" ${c === county ? 'selected' : ''}>${c}</option>`)}
            </select>
          </div>
        </form>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <p class="muted" id="team-count" aria-live="polite"></p>
        <div class="grid-cards" id="team-grid" style="margin-top:var(--s-4)"></div>
      </div>
    </section>`;

  return {
    title: 'Teams',
    html: page,
    mount(root) {
      root.querySelector('.filters').addEventListener('submit', (e) => e.preventDefault(), { signal: ctx.signal });
      const input = root.querySelector('#team-q');
      const select = root.querySelector('#team-county');
      const grid = root.querySelector('#team-grid');
      const count = root.querySelector('#team-count');

      const draw = () => {
        const text = input.value.trim().toLowerCase();
        const shown = d.teams.filter((t) =>
          (!select.value || t.county === select.value) &&
          (!text || `${t.name} ${t.region} ${t.homeField}`.toLowerCase().includes(text)));
        count.textContent = pluralize(shown.length, 'team');
        grid.innerHTML = String(shown.length
          ? shown.map(teamCard)
          : html`<div class="empty"><h3>No teams match</h3><p>Try a different spelling or clear the county filter.</p></div>`);
        setQuery({ q: input.value.trim(), county: select.value });
      };

      input.addEventListener('input', draw, { signal: ctx.signal });
      select.addEventListener('change', draw, { signal: ctx.signal });
      draw();
      bindMatchActions(root, ctx, d.ref);
    },
  };
}

// teamDetailPage.js
import { html, formatRecord, formatPct } from '../utilities/helpers.js';
import { icon } from '../utilities/icons.js';
import { loadTeamDetail } from '../services/dataLoader.js';
import { matchCard, bindMatchActions, formDots } from '../components/matchCard.js';
import { crest } from '../components/teamCard.js';
import { icon as ic } from '../utilities/icons.js';
import { can } from '../utilities/auth.js';

export async function teamDetailPage(ctx) {
  const d = await loadTeamDetail(ctx.params.id);
  if (!d) {
    return {
      title: 'Team not found',
      html: html`<section class="section"><div class="container stack">
        <h1>Team not found</h1>
        <p class="muted">This team may still be waiting for approval.</p>
        <p><a class="btn btn--primary" href="#/teams">Browse all teams</a></p></div></section>`,
    };
  }
  const { team, roster, tables, ref, user } = d;

  const page = html`
    <section class="page-head">
      <div class="container">
        <p><a class="link-more" href="#/teams">All teams</a></p>
        <div class="team-head" style="margin-top:var(--s-4)">
          ${crest(team)}
          <div>
            <h1>${team.name}</h1>
            <p style="margin-top:var(--s-2)">${team.about || 'This team has not added a description yet.'}</p>
          </div>
        </div>
        <dl class="facts">
          <div><dt>Town</dt><dd>${team.region}</dd></div>
          <div><dt>Home field</dt><dd>${team.homeField}</dd></div>
          <div><dt>Type</dt><dd>${team.type}</dd></div>
          <div><dt>Founded</dt><dd>${team.founded}</dd></div>
        </dl>
        ${team.status === 'pending' ? html`<p class="callout" style="margin-top:var(--s-4)">This team is waiting for federation approval and is only visible to you.</p>` : ''}
        <div class="btn-row" style="margin-top:var(--s-4)">
          ${can.manageTeam(user, team.id) ? html`<a class="btn btn--dark" href="#/dashboard">${icon('edit')} Manage this team</a>` : ''}
          ${user && team.status === 'approved' ? html`
            <button class="btn btn--outline follow-btn ${team.followed ? 'is-following' : ''}" type="button"
              data-action="toggle-follow" data-team="${team.id}" aria-pressed="${team.followed ? 'true' : 'false'}">
              ${ic('heart')} ${team.followed ? 'Following' : 'Follow this team'}
            </button>` : ''}
        </div>
      </div>
    </section>

    ${tables.length ? html`
      <section class="section section--tint" aria-labelledby="record-head">
        <div class="container">
          <div class="section__head"><h2 id="record-head">Record</h2></div>
          <div class="stats">
            ${tables.map(({ league, row, size }) => html`
              <div class="stat">
                <div class="stat__value">${row && row.p ? formatRecord(row) : '—'}</div>
                <div class="stat__label">${league.name}${row && row.p ? html`, ${formatPct(row.pct, row.p)}, #${row.rank} of ${size}` : ''}</div>
                ${row && row.form.length ? html`<div style="margin-top:var(--s-2)">${formDots(row.form)}</div>` : ''}
              </div>`)}
          </div>
        </div>
      </section>` : ''}

    <section class="section" aria-labelledby="roster-head">
      <div class="container">
        <div class="section__head"><h2 id="roster-head">Roster</h2><span class="muted">${roster.length} players</span></div>
        ${roster.length ? html`
          <div class="table-wrap">
            <table class="table">
              <caption class="visually-hidden">${team.name} roster</caption>
              <thead><tr><th scope="col" class="l">#</th><th scope="col" class="l">Player</th><th scope="col" class="l">Position</th></tr></thead>
              <tbody>
                ${roster.map((p) => html`<tr><td class="l">${p.jersey}</td><th scope="row" class="l">${p.name}</th><td class="l">${p.position}</td></tr>`)}
              </tbody>
            </table>
          </div>` : html`<div class="empty"><h3>No roster yet</h3><p>The team manager can add players from the dashboard.</p></div>`}
      </div>
    </section>

    <section class="section section--tint" aria-labelledby="games-head">
      <div class="container split split--even">
        <div>
          <div class="section__head"><h2 id="games-head">Upcoming</h2></div>
          <div class="stack" style="--stack:var(--s-3)">
            ${d.upcoming.length ? d.upcoming.map((m) => matchCard(m, ref, user)) : html`<div class="empty"><h3>Nothing scheduled</h3></div>`}
          </div>
        </div>
        <div>
          <div class="section__head"><h2>Results</h2></div>
          <div class="stack" style="--stack:var(--s-3)">
            ${d.results.length ? d.results.map((m) => matchCard(m, ref, user)) : html`<div class="empty"><h3>No results yet</h3></div>`}
          </div>
        </div>
      </div>
    </section>`;

  return { title: team.name, html: page, mount(root) { bindMatchActions(root, ctx, ref); } };
}

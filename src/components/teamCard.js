// teamCard.js
import { html, formatRecord } from '../utilities/helpers.js';
import { icon } from '../utilities/icons.js';

export function crest(team, size = '3rem') {
  return html`<span class="crest" style="--crest:${team.color};--size:${size}" aria-hidden="true">${team.short}</span>`;
}

function followButton(team) {
  if (team.followed === undefined) return '';
  return html`
    <button class="btn btn--quiet btn--sm follow-btn ${team.followed ? 'is-following' : ''}"
      type="button" data-action="toggle-follow" data-team="${team.id}"
      aria-pressed="${team.followed ? 'true' : 'false'}">
      ${icon('heart')} ${team.followed ? 'Following' : 'Follow'}
    </button>`;
}

export function teamCard(team) {
  const { row, league } = team;
  return html`
    <article class="card team-card">
      <a class="team-card__link" href="#/teams/${team.id}">
        <span class="team-card__top">
          ${crest(team)}
          <span>
            <h3 class="team-card__name">${team.name}</h3>
            <span class="muted">${team.region}</span>
          </span>
        </span>
        <dl class="team-card__facts">
          <div>
            <dt>${league ? league.kind === 'League' ? 'Season record' : 'Group record' : 'Record'}</dt>
            <dd class="team-card__record">${row && row.p ? formatRecord(row) : '—'}</dd>
          </div>
          <div>
            <dt>Home field</dt>
            <dd>${team.homeField}</dd>
          </div>
        </dl>
      </a>
      <span class="team-card__foot">
        <span class="badge">${team.type}</span>
        ${team.status === 'pending' ? html`<span class="badge badge--pending">Awaiting approval</span>` : ''}
        ${row && row.p ? html`<span class="badge badge--stitch">#${row.rank} in ${league.name.replace(/ 20\d\d$/, '')}</span>` : ''}
        ${followButton(team)}
      </span>
    </article>`;
}

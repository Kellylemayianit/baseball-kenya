// matchCard.js — match cards, line scores and standings tables, plus the click
// handlers for their buttons (recap image, enter result).
import {
  html, formatDate, formatTime, formatPct, totalRuns, toast, exportRecapImage,
} from '../utilities/helpers.js';
import { icon } from '../utilities/icons.js';
import { can, getUser } from '../utilities/auth.js';
import { crest } from './teamCard.js';
import { openMatchFormModal } from './matchFormModal.js';
import * as api from '../services/api.js';

// Public visitors never see a score that has not been verified.
export function canSeeScore(match, user, leagueOrgId) {
  if (!match.innings) return false;
  if (match.status === 'final') return true;
  return match.status === 'pending' && can.seePendingScore(user, match, leagueOrgId);
}

export function lineScore(match, ref, { board = false } = {}) {
  const runs = totalRuns(match);
  const count = match.innings.away.length;
  const innings = [...Array(count).keys()];
  const row = (side, teamId) => {
    const team = ref.teams[teamId];
    const won = runs.away !== runs.home && runs[side] === Math.max(runs.away, runs.home);
    return html`
      <tr>
        <th scope="row" class="ls-team"><span title="${team.name}">${team.short}</span></th>
        ${innings.map((i) => html`<td>${match.innings[side][i]}</td>`)}
        <td class="ls-total ${won ? 'ls-win' : ''}">${runs[side]}</td>
        <td>${match.hits?.[side] ?? 0}</td>
        <td>${match.errors?.[side] ?? 0}</td>
      </tr>`;
  };
  return html`
    <div class="linescore-wrap">
      <table class="linescore ${board ? 'linescore--board' : ''}">
        <caption class="visually-hidden">Inning-by-inning score, runs, hits and errors</caption>
        <thead>
          <tr>
            <th scope="col" class="ls-team">Team</th>
            ${innings.map((i) => html`<th scope="col">${i + 1}</th>`)}
            <th scope="col" class="ls-total">R</th><th scope="col">H</th><th scope="col">E</th>
          </tr>
        </thead>
        <tbody>${row('away', match.awayId)}${row('home', match.homeId)}</tbody>
      </table>
    </div>`;
}

function statusFoot(match, user) {
  if (match.status === 'final') {
    return html`<span class="badge badge--verified">${icon('shield')} Final, verified</span>`;
  }
  if (match.status === 'pending') return html`<span class="badge badge--pending">${icon('clock')} Awaiting verification</span>`;
  return html`<span class="match__venue">${icon('pin')} ${match.venue}</span>`;
}

export function matchCard(match, ref, user = getUser(), { showLeague = true } = {}) {
  const away = ref.teams[match.awayId];
  const home = ref.teams[match.homeId];
  const league = ref.leagues[match.leagueId];
  const visible = canSeeScore(match, user, league.orgId);
  const runs = visible ? totalRuns(match) : null;
  const lost = (side) => runs && runs[side] < runs[side === 'away' ? 'home' : 'away'];

  const teamRow = (team, side) => html`
    <div class="match__row ${lost(side) ? 'match__row--lost' : ''}">
      ${crest(team, '2rem')}
      <span class="match__name">
        <a class="match__team" href="#/teams/${team.id}">${team.name}</a>
        ${side === 'home' ? html`<span class="match__home">home</span>` : ''}
      </span>
      <span class="match__score">${runs ? runs[side] : ''}</span>
    </div>`;

  const canRecap = visible;
  const canEnter = can.enterResult(user, match, league.orgId);

  return html`
    <article class="card match" aria-label="${away.name} at ${home.name}">
      <div class="match__meta">
        <span>${showLeague ? league.name : match.venue}</span>
        <time datetime="${match.date}">${formatDate(match.date)}, ${formatTime(match.date)}</time>
      </div>
      ${teamRow(away, 'away')}
      ${teamRow(home, 'home')}
      ${match.adminNote && match.status === 'scheduled' && canEnter
        ? html`<p class="match__note">Sent back by the federation: ${match.adminNote}</p>` : ''}
      <div class="match__foot">
        ${statusFoot(match, user)}
        <span class="btn-row">
          ${canRecap ? html`<button class="btn btn--quiet btn--sm" type="button" data-action="export-recap" data-match="${match.id}">${icon('download')} Recap image</button>` : ''}
          ${canEnter ? html`<button class="btn btn--dark btn--sm" type="button" data-action="enter-result" data-match="${match.id}">${icon('edit')} Enter result</button>` : ''}
        </span>
      </div>
      ${visible ? html`
        <details class="match__box">
          <summary>Box score</summary>
          ${lineScore(match, ref)}
          ${match.recap ? html`<p class="match__recap">${match.recap}</p>` : ''}
        </details>` : ''}
    </article>`;
}

export function formDots(form) {
  if (!form.length) return html`<span class="faint">—</span>`;
  return html`<span class="form-dots">${form.map((r) => html`<span class="dot dot--${r}" title="${{ W: 'Win', L: 'Loss', T: 'Tie' }[r]}">${r}</span>`)}</span>`;
}

export function standingsTable(rows, ref, { limit } = {}) {
  const shown = limit ? rows.slice(0, limit) : rows;
  if (!shown.length) {
    return html`<div class="empty"><h3>No teams in this table yet</h3><p>Teams appear here once the federation approves them.</p></div>`;
  }
  return html`
    <div class="table-wrap">
      <table class="table">
        <caption class="visually-hidden">Standings. Only verified results count.</caption>
        <thead>
          <tr>
            <th scope="col" class="table__rank">#</th>
            <th scope="col" class="l">Team</th>
            <th scope="col">W</th><th scope="col">L</th>${limit ? '' : html`<th scope="col">T</th>`}
            <th scope="col">PCT</th>
            ${limit ? '' : html`<th scope="col">GB</th><th scope="col">RS</th><th scope="col">RA</th><th scope="col">RD</th>`}
            <th scope="col" class="c">Last 5</th>
          </tr>
        </thead>
        <tbody>
          ${shown.map((r) => {
            const team = ref.teams[r.teamId];
            return html`
              <tr class="${r.rank === 1 && r.p ? 'is-leader' : ''}">
                <td class="table__rank">${r.rank}</td>
                <th scope="row" class="l"><a class="table__team" href="#/teams/${team.id}">${crest(team, '1.75rem')} ${team.name}</a></th>
                <td>${r.w}</td><td>${r.l}</td>${limit ? '' : html`<td>${r.t}</td>`}
                <td class="pct">${formatPct(r.pct, r.p)}</td>
                ${limit ? '' : html`<td>${r.gb ? r.gb : '—'}</td><td>${r.rs}</td><td>${r.ra}</td><td>${r.rd > 0 ? `+${r.rd}` : r.rd}</td>`}
                <td class="c">${formDots(r.form)}</td>
              </tr>`;
          })}
        </tbody>
      </table>
    </div>`;
}

// Attach once per page render. ctx.signal removes the listener on navigation.
export function bindMatchActions(root, ctx, ref) {
  root.addEventListener('click', async (event) => {
    const followBtn = event.target.closest('[data-action="toggle-follow"]');
    if (followBtn) {
      const user = getUser();
      if (!user) { toast('Sign in to follow a team.'); return; }
      followBtn.disabled = true;
      try {
        const { following } = await api.toggleFollow(followBtn.dataset.team, user);
        followBtn.classList.toggle('is-following', following);
        followBtn.setAttribute('aria-pressed', String(following));
        followBtn.innerHTML = String(html`${icon('heart')} ${following ? 'Following' : 'Follow'}`);
        toast(following ? 'Following this team.' : 'Unfollowed.', { type: 'ok' });
      } catch (error) {
        toast(error.message, { type: 'error' });
      } finally {
        followBtn.disabled = false;
      }
      return;
    }

    const button = event.target.closest('[data-action="export-recap"], [data-action="enter-result"]');
    if (!button) return;
    const match = ref.matches[button.dataset.match];
    if (!match) return;

    if (button.dataset.action === 'enter-result') {
      openMatchFormModal({ mode: 'result', match, ref, onSaved: ctx.refresh });
      return;
    }

    button.disabled = true;
    try {
      const outcome = await exportRecapImage({ match, ref });
      if (outcome === 'downloaded') toast('Recap image saved to your device.', { type: 'ok' });
    } catch (error) {
      toast(error.message, { type: 'error' });
    } finally {
      button.disabled = false;
    }
  }, { signal: ctx.signal });
}

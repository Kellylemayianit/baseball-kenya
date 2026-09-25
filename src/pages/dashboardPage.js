// dashboardPage.js — one gate for signed-out visitors, then a role-specific
// workspace. Coach and team-manager share a view (both are team-scoped
// staff); federation and platform-admin share a view (org-scoped vs.
// unscoped). Player and fan each get their own, simpler view.
import {
  html, formatDate, formatTime, formatRecord, totalRuns, pluralize, toast,
} from '../utilities/helpers.js';
import { icon } from '../utilities/icons.js';
import { getUser, login, signup, can, ROLE_ICONS } from '../utilities/auth.js';
import * as api from '../services/api.js';
import { loadDashboard } from '../services/dataLoader.js';
import { bindMatchActions, canSeeScore } from '../components/matchCard.js';
import { openMatchFormModal } from '../components/matchFormModal.js';
import { crest } from '../components/teamCard.js';

/* ---------- Signed-out gate: sign in, create an account, register a team --- */
function loginForm() {
  return html`
    <form class="stack" data-form="login" novalidate style="--stack:var(--s-4)">
      <div class="field"><label for="li-email">Email</label><input class="input" id="li-email" name="email" type="email" required autocomplete="username"></div>
      <div class="field"><label for="li-password">Password</label><input class="input" id="li-password" name="password" type="password" required autocomplete="current-password"></div>
      <p class="form-error" role="alert" data-error hidden></p>
      <button class="btn btn--primary" type="submit">Sign in</button>
    </form>`;
}

function signupForm() {
  return html`
    <form class="stack" data-form="signup" novalidate style="--stack:var(--s-4)" hidden>
      <p class="hint">Creates a fan account — follow teams and see their fixtures. Coach, team-manager, player and federation accounts are set up for you by your team or federation, not through signup.</p>
      <div class="field"><label for="su-name">Name</label><input class="input" id="su-name" name="name" required maxlength="60" autocomplete="name"></div>
      <div class="field"><label for="su-email">Email</label><input class="input" id="su-email" name="email" type="email" required autocomplete="username"></div>
      <div class="field"><label for="su-password">Password</label><input class="input" id="su-password" name="password" type="password" required minlength="8" autocomplete="new-password"><span class="hint">At least 8 characters.</span></div>
      <p class="form-error" role="alert" data-error hidden></p>
      <button class="btn btn--primary" type="submit">Create account</button>
    </form>`;
}

function gate(ctx) {
  const page = html`
    <div class="container gate">
      <div>
        <h1>Dashboard</h1>
        <p class="muted" style="margin-top:var(--s-3)">Sign in to follow teams, manage a roster, enter results, or review registrations — whatever your account can do.</p>
        <div class="panel" style="margin-top:var(--s-4);max-width:26rem">
          <nav class="tabs" aria-label="Sign in or create an account" style="margin-bottom:var(--s-4)">
            <button class="tab" type="button" data-auth-tab="login" aria-current="page">Sign in</button>
            <button class="tab" type="button" data-auth-tab="signup">Create an account</button>
          </nav>
          ${loginForm()}
          ${signupForm()}
        </div>
      </div>

      <section class="panel" aria-labelledby="reg-head">
        <h2 id="reg-head">Register your team</h2>
        <p class="muted" style="margin-top:var(--s-2)">Tell a federation who you are. Once approved, your team gets a public page and a manager dashboard.</p>
        <form class="stack" data-form="register" novalidate style="--stack:var(--s-4);margin-top:var(--s-4)">
          <div class="form-grid">
            <div class="field"><label for="reg-name">Team name</label><input class="input" id="reg-name" name="name" required maxlength="60"></div>
            <div class="field"><label for="reg-org">Federation</label>
              <select class="select" id="reg-org" name="orgId">${ctx.orgs.map((o) => html`<option value="${o.id}">${o.name}</option>`)}</select></div>
            <div class="field"><label for="reg-county">County</label><input class="input" id="reg-county" name="county" required maxlength="40"></div>
            <div class="field"><label for="reg-field">Home field</label><input class="input" id="reg-field" name="homeField" required maxlength="80"></div>
            <div class="field"><label for="reg-manager">Manager’s name</label><input class="input" id="reg-manager" name="managerName" required maxlength="60"></div>
            <div class="field"><label for="reg-contact">Email</label><input class="input" id="reg-contact" name="contact" type="email" required maxlength="80"><span class="hint">Only the federation sees this.</span></div>
          </div>
          <p class="form-error" role="alert" data-error hidden></p>
          <button class="btn btn--primary" type="submit">Send registration</button>
        </form>
        <p class="callout callout--ok" data-done hidden style="margin-top:var(--s-4)">Registration received. The federation will review it and reply by email.</p>
      </section>
    </div>`;

  return {
    title: 'Dashboard',
    html: page,
    mount(root) {
      root.addEventListener('click', (event) => {
        const tabBtn = event.target.closest('[data-auth-tab]');
        if (tabBtn) {
          const target = tabBtn.dataset.authTab;
          root.querySelectorAll('[data-auth-tab]').forEach((b) => b.toggleAttribute('aria-current', b === tabBtn));
          root.querySelector('[data-form="login"]').hidden = target !== 'login';
          root.querySelector('[data-form="signup"]').hidden = target !== 'signup';
        }
      }, { signal: ctx.signal });

      const loginEl = root.querySelector('[data-form="login"]');
      loginEl.addEventListener('submit', async (event) => {
        event.preventDefault();
        const error = loginEl.querySelector('[data-error]');
        const submit = loginEl.querySelector('[type="submit"]');
        error.hidden = true;
        submit.disabled = true;
        try {
          await login(loginEl.elements.email.value, loginEl.elements.password.value);
          ctx.refresh();
        } catch (err) {
          error.textContent = err.message;
          error.hidden = false;
          submit.disabled = false;
        }
      }, { signal: ctx.signal });

      const signupEl = root.querySelector('[data-form="signup"]');
      signupEl.addEventListener('submit', async (event) => {
        event.preventDefault();
        const error = signupEl.querySelector('[data-error]');
        const submit = signupEl.querySelector('[type="submit"]');
        error.hidden = true;
        submit.disabled = true;
        try {
          await signup(signupEl.elements.email.value, signupEl.elements.password.value, signupEl.elements.name.value);
          ctx.refresh();
        } catch (err) {
          error.textContent = err.message;
          error.hidden = false;
          submit.disabled = false;
        }
      }, { signal: ctx.signal });

      const form = root.querySelector('[data-form="register"]');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const error = form.querySelector('[data-error]');
        const submit = form.querySelector('[type="submit"]');
        error.hidden = true;
        submit.disabled = true;
        try {
          await api.registerTeam(Object.fromEntries(new FormData(form)));
          form.reset();
          root.querySelector('[data-done]').hidden = false;
        } catch (err) {
          error.textContent = err.message;
          error.hidden = false;
        } finally {
          submit.disabled = false;
        }
      }, { signal: ctx.signal });
    },
  };
}

/* ---------- Shared pieces -------------------------------------------------- */
function shell({ user, team, items, tab, title, lead, actions = '', content }) {
  return html`
    <div class="container dash">
      <aside class="sidebar" aria-label="Dashboard sections">
        <div class="sidebar__who">
          ${team ? crest(team, '2.5rem') : icon(ROLE_ICONS[user.role])}
          <span><strong>${user.name}</strong><small>${team ? team.name : user.title}</small></span>
        </div>
        <nav class="sidebar__nav">
          ${items.map((item) => html`
            <a class="sidebar__link" href="#/dashboard?tab=${item.id}" ${item.id === tab ? html`aria-current="page"` : ''}>
              ${icon(item.icon)} ${item.label}
              ${item.count ? html`<span class="sidebar__count">${item.count}</span>` : ''}
            </a>`)}
        </nav>
      </aside>
      <div class="dash__main">
        <div class="dash__head"><div><h1>${title}</h1><p>${lead}</p></div>${actions}</div>
        ${content}
      </div>
    </div>`;
}

const stat = (value, label) => html`<div class="stat"><div class="stat__value">${value}</div><div class="stat__label">${label}</div></div>`;

const panel = (heading, body, note = '') => html`
  <section class="panel">
    <div class="panel__head"><h2 style="font-size:1.35rem">${heading}</h2>${note ? html`<p>${note}</p>` : ''}</div>
    ${body}
  </section>`;

const empty = (title, text = '') => html`<div class="empty"><h3>${title}</h3>${text ? html`<p>${text}</p>` : ''}</div>`;

function statusBadge(match) {
  if (match.status === 'final') return html`<span class="badge badge--verified">${icon('shield')} Verified</span>`;
  if (match.status === 'pending') return html`<span class="badge badge--pending">${icon('clock')} Awaiting verification</span>`;
  return html`<span class="badge">Scheduled</span>`;
}

function gamesTable(list, ref, user, emptyTitle) {
  if (!list.length) return empty(emptyTitle);
  return html`
    <div class="table-wrap">
      <table class="table">
        <caption class="visually-hidden">Games</caption>
        <thead>
          <tr>
            <th scope="col" class="l">When</th><th scope="col" class="l">Game</th><th scope="col" class="l">Venue</th>
            <th scope="col">Score</th><th scope="col" class="l">Status</th><th scope="col"><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          ${list.map((m) => {
            const away = ref.teams[m.awayId];
            const home = ref.teams[m.homeId];
            const orgId = ref.leagues[m.leagueId]?.orgId;
            const visible = canSeeScore(m, user, orgId);
            const runs = visible ? totalRuns(m) : null;
            return html`
              <tr>
                <th scope="row" class="l">${formatDate(m.date)}, ${formatTime(m.date)}</th>
                <td class="l">${away.name} at ${home.name}</td>
                <td class="l">${m.venue}</td>
                <td>${runs ? `${runs.away}-${runs.home}` : '—'}</td>
                <td class="l">
                  ${statusBadge(m)}
                  ${m.adminNote && m.status === 'scheduled' ? html`<br><span class="faint">Sent back: ${m.adminNote}</span>` : ''}
                </td>
                <td>
                  <span class="table__actions">
                    ${can.enterResult(user, m, orgId) ? html`<button class="btn btn--dark btn--sm" type="button" data-action="enter-result" data-match="${m.id}">Enter result</button>` : ''}
                    ${visible ? html`<button class="btn btn--quiet btn--sm" type="button" data-action="export-recap" data-match="${m.id}">${icon('download')} Recap image</button>` : ''}
                  </span>
                </td>
              </tr>`;
          })}
        </tbody>
      </table>
    </div>`;
}

/* ---------- Coach / team manager (team-scoped staff) ----------------------- */
function teamStaffView(d, user, tab) {
  const items = [
    { id: 'overview', label: 'Overview', icon: 'home' },
    { id: 'matches', label: 'Matches', icon: 'calendar' },
    { id: 'roster', label: 'Roster', icon: 'users' },
    { id: 'profile', label: 'Team profile', icon: 'edit' },
  ];
  const { team, ref } = d;
  const waiting = d.mine.filter((m) => m.status === 'scheduled');
  const pending = d.mine.filter((m) => m.status === 'pending');
  const finals = d.mine.filter((m) => m.status === 'final').reverse();

  let title = 'Overview';
  let lead = `Everything ${team.name} needs this week.`;
  let content;

  if (tab === 'matches') {
    title = 'Matches';
    lead = 'Every game your team plays. Enter a score after the final out.';
    content = gamesTable(d.mine, ref, user, 'No games yet');
  } else if (tab === 'roster') {
    title = 'Roster';
    lead = `${pluralize(d.roster.length, 'player')} on ${team.name}.`;
    content = html`
      ${panel('Add a player', html`
        <form class="stack" data-form="add-player" novalidate style="--stack:var(--s-4)">
          <div class="form-grid">
            <div class="field"><label for="pl-name">Name</label><input class="input" id="pl-name" name="name" required maxlength="60"></div>
            <div class="field"><label for="pl-jersey">Jersey number</label><input class="input" id="pl-jersey" name="jersey" type="number" inputmode="numeric" min="0" max="99" required></div>
            <div class="field"><label for="pl-pos">Position</label>
              <select class="select" id="pl-pos" name="position">${api.POSITIONS.map((p) => html`<option>${p}</option>`)}</select></div>
          </div>
          <p class="form-error" role="alert" data-error hidden></p>
          <div><button class="btn btn--primary" type="submit">${icon('plus')} Add player</button></div>
        </form>`)}
      ${d.roster.length ? html`
        <div class="table-wrap">
          <table class="table">
            <caption class="visually-hidden">Roster</caption>
            <thead><tr><th scope="col" class="l">#</th><th scope="col" class="l">Player</th><th scope="col" class="l">Position</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              ${d.roster.map((p) => html`
                <tr>
                  <td class="l">${p.jersey}</td><th scope="row" class="l">${p.name}</th><td class="l">${p.position}</td>
                  <td><button class="btn btn--danger btn--sm" type="button" data-do="remove-player" data-id="${p.id}" aria-label="Remove ${p.name}">${icon('trash')} Remove</button></td>
                </tr>`)}
            </tbody>
          </table>
        </div>` : empty('No players yet', 'Add your first player above.')}
      ${panel('Give someone a login', html`
        <form class="stack" data-form="create-account" novalidate style="--stack:var(--s-4)">
          <input type="hidden" name="teamId" value="${team.id}">
          <div class="form-grid">
            <div class="field"><label for="ac-role">Account type</label>
              <select class="select" id="ac-role" name="role">
                <option value="player">Player (linked to a roster spot)</option>
                <option value="coach">Coach</option>
                <option value="team">Team manager</option>
              </select></div>
            <div class="field" data-player-field ${d.roster.length ? '' : 'hidden'}>
              <label for="ac-player">Player</label>
              <select class="select" id="ac-player" name="playerId">
                ${d.roster.map((p) => html`<option value="${p.id}">#${p.jersey} ${p.name}</option>`)}
              </select></div>
            <div class="field"><label for="ac-name">Name</label><input class="input" id="ac-name" name="name" required maxlength="60"></div>
            <div class="field"><label for="ac-email">Email</label><input class="input" id="ac-email" name="email" type="email" required></div>
            <div class="field"><label for="ac-password">Temporary password</label><input class="input" id="ac-password" name="password" type="text" required minlength="8"><span class="hint">Share this with them directly — they can't reset it themselves yet, so pick something you can hand over safely.</span></div>
          </div>
          <p class="form-error" role="alert" data-error hidden></p>
          <div><button class="btn btn--primary" type="submit">Create login</button></div>
        </form>`, 'Only affects who can sign in — it doesn\u2019t add them to the roster table above.')}`;
  } else if (tab === 'profile') {
    title = 'Team profile';
    lead = 'What visitors see on your public team page.';
    content = panel('Details', html`
      <form class="stack" data-form="team-profile" novalidate style="--stack:var(--s-4);max-width:36rem">
        <div class="field"><span class="label">Team name</span><span>${team.name}</span><span class="hint">To change the name or town, contact your federation.</span></div>
        <div class="field"><label for="tp-field">Home field</label><input class="input" id="tp-field" name="homeField" value="${team.homeField}" required maxlength="80"></div>
        <div class="field"><label for="tp-about">About the team</label><textarea class="textarea" id="tp-about" name="about" maxlength="400">${team.about}</textarea></div>
        <p class="form-error" role="alert" data-error hidden></p>
        <div class="btn-row"><button class="btn btn--primary" type="submit">Save profile</button><a class="btn btn--quiet" href="#/teams/${team.id}">View public page</a></div>
      </form>`);
  } else {
    content = html`
      <div class="stats">
        ${stat(d.row && d.row.p ? formatRecord(d.row) : '—', d.league ? d.league.name : 'Record')}
        ${stat(d.row && d.row.p ? `#${d.row.rank}` : '—', d.size ? `of ${pluralize(d.size, 'team')}` : 'Rank')}
        ${stat(d.roster.length, 'Players on roster')}
        ${stat(pending.length, 'Results awaiting verification')}
      </div>
      ${panel('Games waiting for a result', gamesTable(waiting.slice(0, 5), ref, user, 'You are all caught up'), 'Enter the score after the final out.')}
      ${pending.length ? panel('Sent to the federation', gamesTable(pending, ref, user, ''), 'Only your team and the opponent can see these scores until they are verified.') : ''}
      ${finals.length ? panel('Recent results', gamesTable(finals.slice(0, 3), ref, user, ''), 'Make a recap image to share on WhatsApp or Facebook.') : ''}`;
  }

  return shell({ user, team, items, tab, title, lead, content });
}

/* ---------- Player ---------------------------------------------------------- */
function playerView(d, user, tab) {
  const items = [
    { id: 'overview', label: 'Overview', icon: 'home' },
    { id: 'profile', label: 'My profile', icon: 'edit' },
  ];
  const { team, player, ref } = d;
  const upcoming = d.mine.filter((m) => m.status === 'scheduled').slice(0, 5);
  const recent = d.mine.filter((m) => m.status === 'final').reverse().slice(0, 3);

  let title = 'Overview';
  let lead = `${team.name}, #${player.jersey} ${player.position}.`;
  let content;

  if (tab === 'profile') {
    title = 'My profile';
    lead = 'A short bio your team and fans can see on the roster.';
    content = panel('About you', html`
      <form class="stack" data-form="player-bio" novalidate style="--stack:var(--s-4);max-width:36rem">
        <div class="field"><span class="label">Name</span><span>${player.name}</span></div>
        <div class="field"><span class="label">Jersey and position</span><span>#${player.jersey}, ${player.position}</span><span class="hint">Your coach can update these from the roster.</span></div>
        <div class="field"><label for="pb-bio">Bio</label><textarea class="textarea" id="pb-bio" name="bio" maxlength="300" placeholder="A line or two for your team page.">${player.bio}</textarea></div>
        <p class="form-error" role="alert" data-error hidden></p>
        <div><button class="btn btn--primary" type="submit">Save</button></div>
      </form>`);
  } else {
    content = html`
      <div class="stats">
        ${stat(d.row && d.row.p ? formatRecord(d.row) : '—', d.league ? d.league.name : 'Record')}
        ${stat(`#${player.jersey}`, player.position)}
        ${stat(upcoming.length, 'Games coming up')}
      </div>
      ${panel('Next up', gamesTable(upcoming, ref, user, 'Nothing scheduled yet'))}
      ${recent.length ? panel('Recent results', gamesTable(recent, ref, user, '')) : ''}
      <p><a class="link-more" href="#/teams/${team.id}">View ${team.name}’s public page</a></p>`;
  }

  return shell({ user, team, items, tab, title, lead, content });
}

/* ---------- Fan / parent ----------------------------------------------------- */
function fanView(d, user) {
  const items = [{ id: 'overview', label: 'Following', icon: 'heart' }];
  const { teams, ref, upcoming } = d;

  const content = teams.length
    ? html`
        <div class="stats">${stat(teams.length, pluralize(teams.length, 'team followed'))}</div>
        ${panel('Their next games', gamesTable(upcoming.slice(0, 6), ref, user, 'Nothing scheduled yet'))}
        ${panel('Teams you follow', html`<div class="grid-cards">${teams.map((t) => html`
          <a class="card team-card team-card__link" href="#/teams/${t.id}" style="padding:var(--s-4)">
            <span class="team-card__top">${crest(t, '2.5rem')}<span><h3 class="team-card__name" style="font-size:1.05rem">${t.name}</h3><span class="muted">${t.region}</span></span></span>
            <span>${t.row && t.row.p ? formatRecord(t.row) : 'No verified games yet'}</span>
          </a>`)}</div>`)}`
    : html`
        ${empty('You are not following any teams yet', 'Open a team’s page and select Follow to see their fixtures and results here.')}
        <p style="margin-top:var(--s-4)"><a class="btn btn--primary" href="#/teams">Browse teams</a></p>`;

  return shell({ user, team: null, items, tab: 'overview', title: 'Following', lead: 'The teams you follow, in one place.', content });
}

/* ---------- Federation admin / platform admin ------------------------------- */
function orgView(d, user, tab) {
  const { ref } = d;
  const review = d.pendingTeams.length + d.pendingResults.length;
  const items = [
    { id: 'overview', label: 'Overview', icon: 'home' },
    { id: 'approvals', label: 'Approvals', icon: 'clipboard', count: review },
    { id: 'fixtures', label: 'Fixtures', icon: 'calendar' },
    { id: 'accounts', label: 'Accounts', icon: 'user' },
  ];
  if (user.role === 'super') items.push({ id: 'organizations', label: 'Organizations', icon: 'organization' });

  let title = 'Overview';
  let lead = user.role === 'super' ? 'What needs attention across every organisation.' : `What ${d.orgs[0]?.name ?? 'your federation'} needs to look at today.`;
  let actions = '';
  let content;

  if (tab === 'organizations' && user.role === 'super') {
    title = 'Organizations';
    lead = 'Every governing body on the platform.';
    content = html`
      <div class="table-wrap">
        <table class="table">
          <caption class="visually-hidden">Organizations</caption>
          <thead><tr><th scope="col" class="l">Organisation</th><th scope="col" class="l">Type</th><th scope="col">Leagues</th><th scope="col">Teams</th></tr></thead>
          <tbody>
            ${d.organizations.map((o) => html`
              <tr>
                <th scope="row" class="l">${o.name}</th><td class="l">${o.kind}</td>
                <td>${o.leagueIds.length}</td>
                <td>${d.teams.filter((t) => t.orgId === o.id && t.status === 'approved').length}</td>
              </tr>`)}
          </tbody>
        </table>
      </div>`;
  } else if (tab === 'approvals') {
    title = 'Approvals';
    lead = 'Nothing here counts in standings or appears publicly until you approve it.';
    content = html`
      ${panel('Team registrations', d.pendingTeams.length ? html`
        <div class="table-wrap"><table class="table">
          <caption class="visually-hidden">Teams waiting for approval</caption>
          <thead><tr><th scope="col" class="l">Team</th><th scope="col" class="l">County</th><th scope="col" class="l">Home field</th><th scope="col" class="l">Manager</th><th scope="col" class="l">Email</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            ${d.pendingTeams.map((t) => html`
              <tr>
                <th scope="row" class="l">${t.name}</th><td class="l">${t.county}</td><td class="l">${t.homeField}</td>
                <td class="l">${t.managerName ?? ''}</td><td class="l">${t.contact ?? ''}</td>
                <td><span class="table__actions">
                  <button class="btn btn--primary btn--sm" type="button" data-do="approve-team" data-id="${t.id}">${icon('check')} Approve</button>
                  <button class="btn btn--danger btn--sm" type="button" data-do="decline-team" data-id="${t.id}">Decline</button>
                </span></td>
              </tr>`)}
          </tbody>
        </table></div>` : empty('No registrations waiting'))}
      ${panel('Results to verify', d.pendingResults.length ? html`
        <div class="table-wrap"><table class="table">
          <caption class="visually-hidden">Results waiting for verification</caption>
          <thead><tr><th scope="col" class="l">Game</th><th scope="col">Score</th><th scope="col" class="l">Note if sending back</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            ${d.pendingResults.map((m) => {
              const away = ref.teams[m.awayId];
              const home = ref.teams[m.homeId];
              const runs = totalRuns(m);
              return html`
                <tr>
                  <th scope="row" class="l">${away.name} at ${home.name}<br><span class="faint">${formatDate(m.date)}, ${ref.leagues[m.leagueId].name}</span></th>
                  <td>${runs.away}-${runs.home}</td>
                  <td class="l"><label class="visually-hidden" for="note-${m.id}">Reason for sending back</label><input class="input" id="note-${m.id}" maxlength="200" placeholder="Optional"></td>
                  <td><span class="table__actions">
                    <button class="btn btn--primary btn--sm" type="button" data-do="verify-match" data-id="${m.id}">${icon('check')} Verify</button>
                    <button class="btn btn--danger btn--sm" type="button" data-do="send-back" data-id="${m.id}">Send back</button>
                  </span></td>
                </tr>`;
            })}
          </tbody>
        </table></div>` : empty('No results waiting'))}`;
  } else if (tab === 'fixtures') {
    title = 'Fixtures';
    lead = 'Schedule games. Teams see them on their dashboard straight away.';
    actions = html`<button class="btn btn--primary" type="button" data-do="new-fixture">${icon('plus')} Schedule fixture</button>`;
    content = gamesTable(d.scheduled, ref, user, 'No fixtures scheduled');
  } else if (tab === 'accounts') {
    title = 'Accounts';
    lead = 'Create logins for coaches, team managers, players, and — if you\u2019re the site admin — other federation admins.';
    const inScopeTeams = d.teams.filter((t) => t.status === 'approved' && (user.role === 'super' || d.orgs.some((o) => o.id === t.orgId)));
    content = panel('Create a login', html`
      <form class="stack" data-form="create-account" novalidate style="--stack:var(--s-4);max-width:32rem">
        <div class="form-grid">
          <div class="field"><label for="ac-role">Account type</label>
            <select class="select" id="ac-role" name="role">
              <option value="coach">Coach</option>
              <option value="team">Team manager</option>
              <option value="player">Player</option>
              ${user.role === 'super' ? html`<option value="federation">Federation admin</option>` : ''}
            </select></div>
          <div class="field" data-team-field>
            <label for="ac-team">Team</label>
            <select class="select" id="ac-team" name="teamId">
              ${inScopeTeams.map((t) => html`<option value="${t.id}">${t.name}</option>`)}
            </select></div>
          <div class="field" data-org-field hidden>
            <label for="ac-org">Organisation</label>
            <select class="select" id="ac-org" name="orgId">
              ${d.organizations.map((o) => html`<option value="${o.id}">${o.name}</option>`)}
            </select></div>
          <div class="field" data-player-field hidden>
            <label for="ac-player">Player</label>
            <select class="select" id="ac-player" name="playerId"></select>
            <span class="hint" data-player-hint></span></div>
          <div class="field"><label for="ac-name">Name</label><input class="input" id="ac-name" name="name" required maxlength="60"></div>
          <div class="field"><label for="ac-email">Email</label><input class="input" id="ac-email" name="email" type="email" required></div>
          <div class="field"><label for="ac-password">Temporary password</label><input class="input" id="ac-password" name="password" type="text" required minlength="8"><span class="hint">Share this with them directly — they can't reset it themselves yet.</span></div>
        </div>
        <p class="form-error" role="alert" data-error hidden></p>
        <div><button class="btn btn--primary" type="submit">Create login</button></div>
      </form>`);
  } else {
    content = html`
      <div class="stats">
        ${stat(review, 'Items waiting for review')}
        ${stat(d.approvedTeams, 'Approved teams')}
        ${stat(d.verifiedGames, 'Verified games')}
        ${stat(d.scheduled.length, 'Games scheduled')}
      </div>
      ${review
        ? html`<p class="callout">${pluralize(d.pendingTeams.length, 'team registration')} and ${pluralize(d.pendingResults.length, 'result')} are waiting. <a class="link-more" href="#/dashboard?tab=approvals">Open approvals</a></p>`
        : html`<p class="callout callout--ok">Nothing is waiting for review.</p>`}
      ${panel('Next fixtures', gamesTable(d.scheduled.slice(0, 5), ref, user, 'No fixtures scheduled'))}`;
  }

  return shell({ user, team: null, items, tab, title, lead, actions, content });
}

/* ---------- Page ------------------------------------------------------------ */
export async function dashboardPage(ctx) {
  const user = getUser();
  if (!user) {
    const orgs = await api.listOrganizations();
    return gate({ ...ctx, orgs });
  }

  const tabsByRole = {
    coach: ['overview', 'matches', 'roster', 'profile'],
    team: ['overview', 'matches', 'roster', 'profile'],
    player: ['overview', 'profile'],
    fan: ['overview'],
    federation: ['overview', 'approvals', 'fixtures'],
    super: ['overview', 'approvals', 'fixtures', 'organizations'],
  };
  const tabs = tabsByRole[user.role] ?? ['overview'];
  const requested = ctx.query.get('tab');
  const tab = tabs.includes(requested) ? requested : 'overview';

  const d = await loadDashboard(user);
  const view = user.role === 'player' ? playerView
    : user.role === 'fan' ? fanView
    : user.role === 'federation' || user.role === 'super' ? orgView
    : teamStaffView;
  const page = view(d, user, tab);

  return {
    title: 'Dashboard',
    html: page,
    mount(root) {
      bindMatchActions(root, ctx, d.ref);

      root.addEventListener('click', async (event) => {
        const el = event.target.closest('[data-do]');
        if (!el) return;
        const { id } = el.dataset;
        const actor = getUser();

        if (el.dataset.do === 'new-fixture') {
          openMatchFormModal({ mode: 'fixture', ref: d.ref, onSaved: ctx.refresh });
          return;
        }
        if (el.dataset.do === 'remove-player' && !window.confirm('Remove this player from the roster?')) return;

        el.disabled = true;
        try {
          switch (el.dataset.do) {
            case 'approve-team': await api.setTeamStatus(id, 'approved', actor); toast('Team approved and added to the league.', { type: 'ok' }); break;
            case 'decline-team': await api.setTeamStatus(id, 'rejected', actor); toast('Registration declined.'); break;
            case 'verify-match': await api.verifyMatch(id, actor); toast('Result verified. Standings are updated.', { type: 'ok' }); break;
            case 'send-back': await api.sendBackMatch(id, root.querySelector(`#note-${id}`)?.value, actor); toast('Result sent back to the team.'); break;
            case 'remove-player': await api.removePlayer(id, actor); toast('Player removed.'); break;
            default: el.disabled = false; return;
          }
          ctx.refresh();
        } catch (err) {
          toast(err.message, { type: 'error' });
          el.disabled = false;
        }
      }, { signal: ctx.signal });

      root.addEventListener('change', async (event) => {
        const form = event.target.closest('[data-form="create-account"]');
        if (!form) return;

        if (event.target.name === 'role') {
          const role = event.target.value;
          const teamField = form.querySelector('[data-team-field]');
          const orgField = form.querySelector('[data-org-field]');
          const playerField = form.querySelector('[data-player-field]');
          if (teamField) teamField.hidden = role === 'federation';
          if (orgField) orgField.hidden = role !== 'federation';
          if (playerField) {
            playerField.hidden = role !== 'player';
            if (role === 'player') form.querySelector('[name="teamId"]')?.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        if (event.target.name === 'teamId') {
          const playerSelect = form.querySelector('[name="playerId"]');
          const playerField = form.querySelector('[data-player-field]');
          if (!playerSelect || playerField?.hidden) return;
          const hint = form.querySelector('[data-player-hint]');
          if (hint) hint.textContent = 'Loading roster…';
          try {
            const roster = await api.listPlayers(event.target.value);
            playerSelect.innerHTML = roster.map((p) => `<option value="${p.id}">#${p.jersey} ${p.name.replace(/[<>&"]/g, '')}</option>`).join('');
            if (hint) hint.textContent = roster.length ? '' : 'This team has no roster yet — add players first.';
          } catch {
            if (hint) hint.textContent = 'Could not load the roster.';
          }
        }
      }, { signal: ctx.signal });

      root.addEventListener('submit', async (event) => {
        const form = event.target.closest('[data-form]');
        if (!form) return;
        event.preventDefault();
        const error = form.querySelector('[data-error]');
        const submit = form.querySelector('[type="submit"]');
        const values = Object.fromEntries(new FormData(form));
        error.hidden = true;
        submit.disabled = true;
        try {
          if (form.dataset.form === 'add-player') {
            await api.addPlayer(d.team.id, values, getUser());
            toast(`${values.name.trim()} added to the roster.`, { type: 'ok' });
          } else if (form.dataset.form === 'team-profile') {
            await api.updateTeam(d.team.id, values, getUser());
            toast('Team profile saved.', { type: 'ok' });
          } else if (form.dataset.form === 'player-bio') {
            await api.updatePlayerBio(d.player.id, values.bio, getUser());
            toast('Profile saved.', { type: 'ok' });
          } else if (form.dataset.form === 'create-account') {
            const created = await api.createUserAccount(values);
            toast(`Login created for ${created.email}.`, { type: 'ok' });
          }
          ctx.refresh();
        } catch (err) {
          error.textContent = err.message;
          error.hidden = false;
          submit.disabled = false;
        }
      }, { signal: ctx.signal });
    },
  };
}

// matchFormModal.js — one native <dialog> for two jobs:
//   mode "result":  enter an inning-by-inning score for a scheduled game
//   mode "fixture": schedule a new game (federation admin only)
import { html, esc, sum, formatDateLong, formatTime, toast } from '../utilities/helpers.js';
import * as api from '../services/api.js';
import { getUser } from '../utilities/auth.js';

const INNINGS = api.INNINGS;
const inningList = [...Array(INNINGS).keys()];

/* ---------- Result form --------------------------------------------------- */
function resultMarkup(match, ref, user) {
  const away = ref.teams[match.awayId];
  const home = ref.teams[match.homeId];
  const moderator = user?.role === 'super' || user?.role === 'federation';

  const cell = (name, label, value = 0) => html`
    <td><input class="input" type="number" inputmode="numeric" min="0" max="99" step="1" value="${value}"
      name="${name}" aria-label="${label}" required></td>`;

  const row = (side, team) => html`
    <tr>
      <th scope="row" class="ls-team">${team.name}</th>
      ${inningList.map((i) => cell(`${side}-${i}`, `${team.name} runs, inning ${i + 1}`))}
      <td class="ls-total"><output data-total="${side}" aria-label="${team.name} total runs">0</output></td>
      ${cell(`${side}-h`, `${team.name} hits`)}
      ${cell(`${side}-e`, `${team.name} errors`)}
    </tr>`;

  return html`
    <form method="dialog" novalidate>
      <div class="modal__head">
        <h2 id="modal-title">Enter result</h2>
        <p>${away.name} at ${home.name}, ${formatDateLong(match.date)}</p>
      </div>
      <div class="modal__body">
        <div class="entry-scroll">
          <table class="entry-grid">
            <caption class="visually-hidden">Runs by inning, with hits and errors</caption>
            <thead>
              <tr>
                <th scope="col" class="ls-team">Team</th>
                ${inningList.map((i) => html`<th scope="col">${i + 1}</th>`)}
                <th scope="col">R</th><th scope="col">H</th><th scope="col">E</th>
              </tr>
            </thead>
            <tbody>${row('away', away)}${row('home', home)}</tbody>
          </table>
        </div>
        <div class="field">
          <label for="recap">Recap <span class="faint">(optional)</span></label>
          <textarea class="textarea" id="recap" name="recap" maxlength="600" placeholder="Two or three sentences on how the game went."></textarea>
          <span class="hint">Shown under the box score and on the recap image.</span>
        </div>
        <p class="callout ${moderator ? 'callout--ok' : ''}">
          ${moderator
            ? 'As a federation admin, this result is verified as soon as you save it.'
            : 'The federation checks every result before it counts in the standings. Until then, only the two teams can see the score.'}
        </p>
        <p class="form-error" role="alert" data-error hidden></p>
      </div>
      <div class="modal__foot">
        <button class="btn btn--outline" type="button" data-close>Cancel</button>
        <button class="btn btn--primary" type="submit">${moderator ? 'Save verified result' : 'Submit for verification'}</button>
      </div>
    </form>`;
}

function bindResult(form, dialog, match, onSaved) {
  const field = (name) => form.elements[name];
  const runsFor = (side) => inningList.map((i) => Number(field(`${side}-${i}`).value) || 0);

  const updateTotals = () => {
    for (const side of ['away', 'home']) form.querySelector(`[data-total="${side}"]`).value = sum(runsFor(side));
  };
  form.addEventListener('input', updateTotals);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = form.querySelector('[data-error]');
    const submit = form.querySelector('[type="submit"]');
    error.hidden = true;
    submit.disabled = true;
    try {
      const user = getUser();
      await api.submitMatchResult(match.id, {
        innings: { away: runsFor('away'), home: runsFor('home') },
        hits: { away: field('away-h').value, home: field('home-h').value },
        errors: { away: field('away-e').value, home: field('home-e').value },
        recap: field('recap').value,
      }, user);
      dialog.close();
      toast((user.role === 'super' || user.role === 'federation') ? 'Result saved and verified.' : 'Result sent to the federation for verification.', { type: 'ok' });
      onSaved?.();
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
      submit.disabled = false;
    }
  });
}

/* ---------- Fixture form -------------------------------------------------- */
function fixtureMarkup(ref) {
  const leagues = Object.values(ref.leagues);
  return html`
    <form method="dialog" novalidate>
      <div class="modal__head">
        <h2 id="modal-title">Schedule a fixture</h2>
        <p>Teams see the game on their dashboard as soon as it is scheduled.</p>
      </div>
      <div class="modal__body">
        <div class="form-grid">
          <div class="field">
            <label for="fx-league">League or tournament</label>
            <select class="select" id="fx-league" name="leagueId">
              ${leagues.map((l) => html`<option value="${l.id}">${l.name}</option>`)}
            </select>
          </div>
          <div class="field">
            <label for="fx-away">Away team</label>
            <select class="select" id="fx-away" name="awayId"></select>
          </div>
          <div class="field">
            <label for="fx-home">Home team</label>
            <select class="select" id="fx-home" name="homeId"></select>
          </div>
          <div class="field">
            <label for="fx-date">Date</label>
            <input class="input" id="fx-date" name="date" type="date" required>
          </div>
          <div class="field">
            <label for="fx-time">Start time</label>
            <input class="input" id="fx-time" name="time" type="time" value="10:00" required>
          </div>
          <div class="field">
            <label for="fx-venue">Venue</label>
            <input class="input" id="fx-venue" name="venue" type="text" maxlength="80">
            <span class="hint">Defaults to the home team’s field.</span>
          </div>
        </div>
        <p class="form-error" role="alert" data-error hidden></p>
      </div>
      <div class="modal__foot">
        <button class="btn btn--outline" type="button" data-close>Cancel</button>
        <button class="btn btn--primary" type="submit">Schedule fixture</button>
      </div>
    </form>`;
}

function bindFixture(form, dialog, ref, onSaved) {
  const leagueSelect = form.elements.leagueId;
  const away = form.elements.awayId;
  const home = form.elements.homeId;
  const venue = form.elements.venue;

  const options = (ids, selected) => ids
    .filter((id) => ref.teams[id]?.status === 'approved')
    .map((id) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${esc(ref.teams[id].name)}</option>`)
    .join('');

  const fillTeams = () => {
    const ids = ref.leagues[leagueSelect.value].teamIds.filter((id) => ref.teams[id]?.status === 'approved');
    away.innerHTML = options(ids, ids[0]);
    home.innerHTML = options(ids, ids[1] ?? ids[0]);
    fillVenue();
  };
  const fillVenue = () => { venue.placeholder = ref.teams[home.value]?.homeField ?? ''; };

  leagueSelect.addEventListener('change', fillTeams);
  home.addEventListener('change', fillVenue);
  fillTeams();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = form.querySelector('[data-error]');
    const submit = form.querySelector('[type="submit"]');
    error.hidden = true;
    submit.disabled = true;
    try {
      const { date, time } = form.elements;
      await api.createFixture({
        leagueId: leagueSelect.value,
        awayId: away.value,
        homeId: home.value,
        date: date.value && time.value ? `${date.value}T${time.value}:00+03:00` : '',
        venue: venue.value,
      }, getUser());
      dialog.close();
      toast(`Fixture scheduled for ${formatDateLong(`${date.value}T${time.value}:00+03:00`)}, ${formatTime(`${date.value}T${time.value}:00+03:00`)}.`, { type: 'ok' });
      onSaved?.();
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
      submit.disabled = false;
    }
  });
}

/* ---------- Public entry point ------------------------------------------- */
export function openMatchFormModal({ mode = 'result', match = null, ref, onSaved }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'modal';
  dialog.setAttribute('aria-labelledby', 'modal-title');
  dialog.innerHTML = String(mode === 'fixture' ? fixtureMarkup(ref) : resultMarkup(match, ref, getUser()));
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => dialog.remove());

  if (mode === 'fixture') bindFixture(form, dialog, ref, onSaved);
  else bindResult(form, dialog, match, onSaved);

  dialog.showModal();
  dialog.querySelector('input, select')?.focus();
}

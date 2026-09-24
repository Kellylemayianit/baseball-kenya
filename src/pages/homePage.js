// homePage.js
import { html, formatDateLong, formatDate } from '../utilities/helpers.js';
import { icon } from '../utilities/icons.js';
import { loadHome } from '../services/dataLoader.js';
import { matchCard, lineScore, standingsTable, bindMatchActions } from '../components/matchCard.js';
import { teamCard } from '../components/teamCard.js';

function scoreboard(match, ref) {
  if (!match) return '';
  const away = ref.teams[match.awayId];
  const home = ref.teams[match.homeId];
  const league = ref.leagues[match.leagueId];
  return html`
    <aside class="board" aria-label="Latest verified result">
      <div class="board__top">
        <span>Latest verified result</span>
        <time datetime="${match.date}">${formatDateLong(match.date)}</time>
      </div>
      <p class="board__title">${league.name}</p>
      ${lineScore(match, ref, { board: true })}
      <div class="board__foot">
        <span class="badge badge--verified">${icon('shield')} Verified by the federation</span>
        <span>${away.name} at ${home.name}</span>
        <a href="#/matches?view=results&league=${league.id}">All results</a>
      </div>
    </aside>`;
}

export async function homePage(ctx) {
  const d = await loadHome();
  const { ref, user } = d;
  const leagueName = d.league?.name ?? 'the league';

  const page = html`
    <section class="hero">
      <div class="container hero__grid">
        <div>
          <h1>Every Kenyan baseball game, in one place.</h1>
          <p class="hero__lede">Fixtures, verified scores, standings and team pages, from school diamonds to community leagues. Teams publish the results themselves.</p>
          <div class="btn-row hero__actions">
            <a class="btn btn--primary" href="#/matches">${icon('calendar')} See fixtures</a>
            <a class="btn btn--outline" href="#/dashboard">Register your team</a>
          </div>
        </div>
        ${scoreboard(d.featured, ref)}
      </div>
    </section>
    <div class="container"><hr class="stitch-rule"></div>

    <section class="section" aria-labelledby="up-next">
      <div class="container">
        <div class="section__head">
          <div>
            <h2 id="up-next">Up next</h2>
            <p>The next games on the calendar, across every league and tournament.</p>
          </div>
          <a class="link-more" href="#/matches">All fixtures</a>
        </div>
        ${d.upcoming.length
          ? html`<div class="grid-cards">${d.upcoming.map((m) => matchCard(m, ref, user))}</div>`
          : html`<div class="empty"><h3>No games scheduled yet</h3><p>Fixtures appear here as soon as the federation schedules them.</p></div>`}
      </div>
    </section>

    <section class="section section--tint" aria-labelledby="table-head">
      <div class="container split">
        <div>
          <div class="section__head">
            <div>
              <h2 id="table-head">${leagueName}</h2>
              <p>Top of the table. Only results verified by the federation count.</p>
            </div>
            <a class="link-more" href="#/matches?view=standings">Full standings</a>
          </div>
          ${standingsTable(d.standings, ref, { limit: 5 })}
        </div>
        <div>
          <div class="section__head"><h2>Latest results</h2></div>
          <div class="stack" style="--stack:var(--s-3)">
            ${d.latest.map((m) => matchCard(m, ref, user, { showLeague: false }))}
          </div>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="teams-head">
      <div class="container">
        <div class="section__head">
          <div>
            <h2 id="teams-head">Teams to watch</h2>
            <p>Clubs and academies currently leading the table.</p>
          </div>
          <a class="link-more" href="#/teams">All teams</a>
        </div>
        <div class="grid-cards">
          ${d.featuredTeams.map(({ team, row }) => teamCard({ ...team, row, league: d.league }))}
        </div>
      </div>
    </section>

    <section class="section section--tint" aria-labelledby="how-head">
      <div class="container split split--even">
        <div class="stack">
          <h2 id="how-head">How a result becomes official</h2>
          <p class="muted">Anyone can follow the game, but the table only moves when the federation has checked the score.</p>
          <p><a class="btn btn--dark" href="#/dashboard">Open the team dashboard</a></p>
        </div>
        <ol class="steps">
          <li>
            <h3>A team manager enters the score</h3>
            <p>Right from the dugout, on a phone. Runs by inning, hits, errors and a short recap.</p>
          </li>
          <li>
            <h3>The federation verifies it</h3>
            <p>Until then the score stays private to the two teams. Mistakes get sent back with a note.</p>
          </li>
          <li>
            <h3>The table updates and the recap is ready</h3>
            <p>Standings recalculate automatically, and the team can share a recap image on WhatsApp or Facebook.</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="section" aria-labelledby="news-head">
      <div class="container">
        <div class="section__head"><h2 id="news-head">From the media hub</h2></div>
        <div class="news">
          ${d.news.map((item) => html`
            <article class="news__item">
              <span class="news__tag">${item.tag}</span>
              <h3>${item.title}</h3>
              <p>${item.summary}</p>
              <time class="faint" datetime="${item.date}">${formatDate(item.date)}</time>
            </article>`)}
        </div>
      </div>
    </section>`;

  return {
    title: 'Baseball Kenya: fixtures, scores and standings',
    html: page,
    mount(root) { bindMatchActions(root, ctx, ref); },
  };
}

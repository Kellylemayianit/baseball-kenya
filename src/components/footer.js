// footer.js
import { html } from '../utilities/helpers.js';
import { icon } from '../utilities/icons.js';

export function renderFooter() {
  return html`
    <div class="container">
      <div class="site-footer__grid">
        <div>
          <a class="brand" href="#/">${icon('baseball')} Baseball Kenya</a>
          <p>One place for Kenyan baseball. Teams publish their own scores, the federation verifies them, and everyone can follow along.</p>
        </div>
        <div>
          <h2>Follow the game</h2>
          <ul>
            <li><a href="#/matches">Fixtures and results</a></li>
            <li><a href="#/matches?view=standings">Standings</a></li>
            <li><a href="#/teams">Teams</a></li>
          </ul>
        </div>
        <div>
          <h2>For teams</h2>
          <ul>
            <li><a href="#/dashboard">Register your team</a></li>
            <li><a href="#/dashboard">Manager dashboard</a></li>
          </ul>
        </div>
      </div>
      <p class="site-footer__legal">Demo build. Team names, players and scores shown here are sample content, not real records.</p>
    </div>`;
}

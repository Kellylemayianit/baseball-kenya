// POST /api/private/matches { leagueId, awayId, homeId, date, venue } — schedule a fixture
import * as db from '../../../server-lib/d1.js';
import { json, route } from '../../../server-lib/respond.js';

export const onRequestPost = route(async ({ env, data, request }) => {
  const body = await request.json();
  return json(await db.createFixture(env, body, data.user), { status: 201 });
});

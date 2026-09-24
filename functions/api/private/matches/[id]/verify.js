import * as db from '../../../../../server-lib/d1.js';
import { json, route } from '../../../../../server-lib/respond.js';

export const onRequestPost = route(async ({ env, data, params }) => json(await db.verifyMatch(env, params.id, data.user)));

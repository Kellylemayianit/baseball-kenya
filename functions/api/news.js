import * as db from '../../server-lib/d1.js';
import { json, route } from '../../server-lib/respond.js';

export const onRequestGet = route(async ({ env }) => json(await db.listNews(env)));

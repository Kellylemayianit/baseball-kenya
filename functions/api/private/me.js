// GET /api/private/me — the frontend calls this on load and whenever it
// needs to know who's signed in. context.data.user was set by
// functions/api/private/_middleware.js after verifying Access.
import { json, route } from '../../../server-lib/respond.js';

export const onRequestGet = route(async ({ data }) => json(data.user));

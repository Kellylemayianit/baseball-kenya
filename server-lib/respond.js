// respond.js — tiny JSON response helpers so every route file stays short.
import { ApiError } from './d1.js';

export const json = (data, init = {}) =>
  new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' }, ...init });

// Wraps a route handler: ApiError becomes the right HTTP status with a
// { error: message } body the frontend's existing error handling already
// understands (it just reads err.message); anything unexpected becomes a
// 500 without leaking internals.
export function route(handler) {
  return async (context) => {
    try {
      return await handler(context);
    } catch (err) {
      if (err instanceof ApiError) return json({ error: err.message }, { status: err.status });
      console.error(err);
      return json({ error: 'Something went wrong on our end.' }, { status: 500 });
    }
  };
}

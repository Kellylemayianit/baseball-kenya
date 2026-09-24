// GET /api/private/login?return=/%23/dashboard
// This path is only reachable once Access has authenticated the browser
// (that's what triggers the Cloudflare login screen in the first place),
// so by the time this handler runs, Access has already set its session
// cookie for the domain. All this does is bounce the browser back into
// the single-page app — the SPA's next fetch to /api/private/* will carry
// that cookie automatically, no further login step needed.
const safeReturn = (value) => {
  if (!value) return '/';
  try {
    const url = new URL(value, 'https://x.invalid');
    return url.pathname.startsWith('/') ? `${url.pathname}${url.search}${url.hash}` : '/';
  } catch { return '/'; }
};

export const onRequestGet = async ({ request }) => {
  const to = safeReturn(new URL(request.url).searchParams.get('return'));
  return Response.redirect(new URL(to, request.url), 303);
};

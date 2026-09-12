/* Puts a password prompt in front of the whole site.

   Vercel's own Password Protection is an Enterprise feature ($150/month as a
   Pro add-on), so this does the same job in ~30 lines of our own code. It runs
   before anything is served, including static files.

   The password comes from the SITE_PASSWORD environment variable, set in the
   Vercel dashboard — never in this file, because this repository is public.

   With SITE_PASSWORD unset the site stays open. That is deliberate: deploying
   this file can't accidentally lock everyone out, and protection switches on
   the moment the variable is set. To take the site public again, delete the
   variable and redeploy. */

export const config = { runtime: 'nodejs' };

/** Compare without leaking the answer through how long it takes. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function ask(): Response {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      // The realm text is what some browsers show above the password box.
      'WWW-Authenticate': 'Basic realm="Tarmem — private preview", charset="UTF-8"',
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export default function middleware(request: Request): Response | undefined {
  const expected = process.env.SITE_PASSWORD;

  // No password configured — the site is public, as it was before.
  if (!expected) return undefined;

  const header = request.headers.get('authorization') ?? '';
  if (!header.toLowerCase().startsWith('basic ')) return ask();

  let decoded: string;
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return ask();
  }

  // "user:password" — any username is accepted, only the password is checked,
  // so there is one thing to pass on to whoever you're sharing the site with.
  const supplied = decoded.slice(decoded.indexOf(':') + 1);
  if (!sameSecret(supplied, expected)) return ask();

  // Correct — carry on to the site.
  return undefined;
}

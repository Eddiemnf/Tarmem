/* Meta's WhatsApp webhook for Tarmem (supabase/026), served at https://www.tarmem.sa/api/wa-webhook.
   GET  — when the subscription is made (wa_setup_webhook): echo Meta's challenge if the verify token matches.
   POST — every customer message to +966 53 450 7400 and every delivery update of our own messages: the raw body
          and Meta's signature go to the database, which checks the signature with the app secret it keeps.
   Nothing here is secret: the address and the publishable key are the site's own (web/site.config.json), and the
   verify token only lets Meta confirm the address; a forged POST fails the signature. */

const SUPABASE_URL = 'https://rdqlnsqdmaosghpxexup.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_n3eZdMHHA59rlCy8T49WjA_0n1TLKX5';
export const VERIFY_TOKEN = 'tarmem-whatsapp-webhook';
const MAX_BODY = 256 * 1024;

const text = (status: number, body: string) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

export function GET(request: Request): Response {
  const q = new URL(request.url).searchParams;
  const challenge = q.get('hub.challenge');
  if (q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === VERIFY_TOKEN && challenge) return text(200, challenge);
  return text(403, 'Tarmem WhatsApp webhook');
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return text(413, 'too large');
  const signature = request.headers.get('x-hub-signature-256') || '';
  let answer: { ok?: boolean; error?: string } | null = null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/wa_webhook`, {
      method: 'POST',
      headers: { apikey: PUBLISHABLE_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ p_raw: raw, p_signature: signature }),
    });
    if (!res.ok) return text(502, 'the database did not answer'); // Meta tries again later
    answer = (await res.json()) as { ok?: boolean; error?: string };
  } catch {
    return text(502, 'the database did not answer');
  }
  if (answer?.ok) return text(200, 'ok');
  if (answer?.error === 'signature') return text(401, 'the signature does not match');
  if (answer?.error === 'size' || answer?.error === 'json') return text(400, answer.error);
  return text(503, answer?.error || 'not processed'); // "not configured": the app secret is not saved yet; Meta retries
}

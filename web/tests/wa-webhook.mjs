/* The WhatsApp webhook function (api/wa-webhook.ts) on its own: Meta's handshake, and what it hands the database.
   The database is imitated by replacing fetch; supabase/tests/local-whatsapp-inbox.mjs covers the database side.
   Run: node tests/wa-webhook.mjs (Node 23.6+ reads the TypeScript file as is). */
import { GET, POST, VERIFY_TOKEN } from '../../api/wa-webhook.ts';

const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 200) : ''}`);
const base = 'https://www.tarmem.sa/api/wa-webhook';

let r = GET(new Request(`${base}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=1158201444`));
check('Meta’s handshake: the challenge comes back as plain text when the verify token matches', r.status === 200 && (await r.text()) === '1158201444' && /text\/plain/.test(r.headers.get('content-type') || ''));
r = GET(new Request(`${base}?hub.mode=subscribe&hub.verify_token=someone-else&hub.challenge=1`));
check('…and is refused with another token', r.status === 403);
r = GET(new Request(base));
check('…or without one (a visitor opening the address)', r.status === 403);

const calls = [];
let answer = { status: 200, body: { ok: true, messages: 1, statuses: 0 } };
globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { 'content-type': 'application/json' } }); };
const raw = '{"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{"messages":[{"text":{"body":"\\u0645\\u0631\\u062d\\u0628\\u0627"}}]}}]}]}';
const post = (body, sig = 'sha256=abc') => POST(new Request(base, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig }, body }));

r = await post(raw);
const sent = calls[0] ? JSON.parse(calls[0].init.body) : {};
check('an event goes to the database untouched, byte for byte, with Meta’s signature', r.status === 200 && calls.length === 1 && calls[0].url.endsWith('/rest/v1/rpc/wa_webhook')
  && sent.p_raw === raw && sent.p_signature === 'sha256=abc' && calls[0].init.headers.apikey.startsWith('sb_publishable_'), JSON.stringify(sent).slice(0, 160));
answer = { status: 200, body: { ok: false, error: 'signature' } };
r = await post(raw, 'sha256=forged');
check('a signature the database rejects is answered 401', r.status === 401);
answer = { status: 200, body: { ok: false, error: 'not configured' } };
r = await post(raw);
check('before the app secret is saved, Meta is told to try again later (503)', r.status === 503);
answer = { status: 500, body: { message: 'down' } };
r = await post(raw);
check('if the database does not answer, Meta is told to try again later (502)', r.status === 502);
globalThis.fetch = async () => { throw new Error('network'); };
r = await post(raw);
check('…including when it cannot be reached at all', r.status === 502);
const before = calls.length;
r = await post('x'.repeat(300 * 1024));
check('an oversized body is refused before it reaches the database', r.status === 413 && calls.length === before);

console.log(results.join('\n'));
const failed = results.filter((x) => x.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

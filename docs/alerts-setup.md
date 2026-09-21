# Alerts when no tab is open — email now, WhatsApp when its API is ready

While the admin console is open, its tab already counts new arrivals and can show a desktop notification.
To be told with **no tab open**, something on a server has to send the message. That is the small function in
`supabase/functions/notify/index.ts`. It holds two kinds of secret (an email key, later a WhatsApp token), which is why
**only the owner sets it up**: they are typed into Supabase and never pass through the website, this repository, or Claude.

About 20 minutes, once.

## 1. An email sender (Resend)

Your official mailbox receives the alerts; a sending service delivers them reliably (mailbox passwords must not be put in code).

1. Create an account at **resend.com** (the free plan is enough).
2. **Domains → Add domain →** `tarmem.sa`. It shows 3–4 DNS records. Add them where tarmem.sa's DNS is managed (the same
   place the site's domain was pointed at Vercel), then press **Verify**.
3. **API Keys → Create API key** (Sending access). Copy it for step 2.4 — paste it only into Supabase.

The same Resend account can also replace Supabase's built-in mailer for password-reset emails
(Supabase → Authentication → Emails → SMTP settings → Resend's SMTP details), which removes its few-emails-an-hour limit.

## 2. The function

1. Supabase → **Edge Functions → Deploy a new function → Via editor**. Name it `notify`.
2. Replace the editor's contents with the whole of `supabase/functions/notify/index.ts`, and press **Deploy**.
3. In the function's **Details**, turn **off** "Verify JWT" (the webhooks identify themselves with the secret below instead).
4. **Edge Functions → Secrets**, add:
   - `WEBHOOK_SECRET` — any long random text (for example from a password generator). Keep it for step 3.
   - `RESEND_API_KEY` — the key from step 1.3
   - `ALERT_FROM` — `Tarmem <alerts@tarmem.sa>`
   - `ALERT_TO` — the mailbox that should receive alerts, e.g. `support@tarmem.sa`

## 3. The four triggers

Supabase → **Database → Webhooks → Create a new hook**, four times — tables `projects`, `bids`,
`contractor_applications`, `contact_messages`. For each: Events = **Insert** · Type = **Supabase Edge Functions** ·
Function = `notify` · HTTP Headers: add `x-tarmem-secret` with the same text as `WEBHOOK_SECRET`.

Test: send a message from the site's contact form. An email titled "رسالة جديدة من …" should arrive within a minute.
(Rows written by the security tests, named "RLS TEST", are ignored on purpose.)

## 4. WhatsApp, later

The WhatsApp Business **app** on a phone cannot be automated; the WhatsApp Business **API** (Meta → WhatsApp → API Setup) can.
When it is set up, create a message template with one variable (for example: "ترميم: {{1}}"), wait for Meta to approve it,
and add four more secrets to the same function — nothing else changes:
`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TO` (the team's number, digits only, e.g. 9665…), `WHATSAPP_TEMPLATE` (the template's name).
The same API is what will let "Approve" tell a contractor their account is live without anyone pressing send.

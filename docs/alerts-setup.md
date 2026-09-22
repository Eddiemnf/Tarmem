# Alerts when nothing is open — an email the moment something arrives

**Status (22 September 2026): live.** Alerts go to support@tarmem.sa from `onboarding@resend.dev`, the Resend
account being registered under support@tarmem.sa. Until tarmem.sa is verified in Resend that is the one address
Resend will deliver to. Verifying the domain (section 1.2) is optional polish: it lets alerts come from
`alerts@tarmem.sa`, removes Gmail's "External" label, and allows extra recipients — switched with one line,
no key needed: `update public.app_secrets set value = 'Tarmem <alerts@tarmem.sa>' where key = 'alert_from';`

While the admin console is open in a tab, it already counts new arrivals and can show a desktop
notification. To be told with **nothing open at all** — phone in pocket, laptop shut — something on a
server has to send the message. Tarmem's database does it itself: `supabase/009_alerts.sql` calls
**Resend** whenever a project, a bid, a contractor application or a contact message is added.

There is no function to deploy and no webhooks to fill in. The owner's part is: create a Resend
account, verify tarmem.sa there, then paste one script and one line. About 20 minutes, once.
The Resend key is held in a table **nothing on the website can read** — not a visitor, not a customer,
not even an admin account. Only the SQL editor can. That is why only the owner can set it up.

## 1. Resend

1. Sign up at **resend.com** (the free plan sends 3,000 emails a month — far more than Tarmem needs).
2. **Domains → Add domain →** `tarmem.sa`. Resend shows 3–4 DNS records. Add them wherever tarmem.sa's
   DNS lives (the same place the domain was pointed at Vercel), then press **Verify**. It can take a few
   minutes. Sending works only once the domain says *Verified*.
3. **API Keys → Create API key**, permission *Sending access*. Copy it (it starts `re_`) — it is shown once.
   Paste it only into the Supabase SQL editor, never into a chat, a file, or the website.

## 2. The script

Supabase → **SQL Editor** → paste all of `supabase/009_alerts.sql` → **Run** ("Run without RLS" if asked).

## 3. Switch it on

In the same editor, one line, with the key from step 1.3 and the mailbox that should receive alerts:

```sql
select public.set_alerts('re_YOUR_KEY_HERE', 'Tarmem <alerts@tarmem.sa>', 'support@tarmem.sa');
```

It answers `alerts are on, going to support@tarmem.sa`.

## 4. Check it

Send a message through the site's contact form. An email titled **رسالة جديدة من …** should arrive within
a minute. If nothing comes, look at the log — it records every attempt:

```sql
select at, what, status, detail from public.alert_log order by at desc limit 20;
```

- `failed · pg_net is not installed` → run step 2 again; the first line of the script installs it.
- `sent`, but no email → the domain is not verified in Resend yet, or the key was pasted with a space.
  Resend's own **Logs** page shows what it received.

## Turning it off, or changing where it goes

```sql
select public.set_alerts(null, null, null);                          -- stop the emails
select public.set_alerts('re_KEY', 'Tarmem <alerts@tarmem.sa>', 'a@tarmem.sa,b@tarmem.sa');  -- two recipients
```

## Good to know

- Rows the security tests leave behind ("RLS TEST") are ignored on purpose.
- If Resend is ever down, the visitor's action still succeeds and the failure is written to `alert_log`.
  Nothing on the website waits for an email.
- The same Resend account can also send Tarmem's password-reset emails, which removes Supabase's
  built-in limit of a few an hour: Supabase → **Authentication → Emails → SMTP settings**, with Resend's
  SMTP host, port 465, user `resend`, password = the same key.

## WhatsApp, later

The WhatsApp Business **app** on a phone cannot be automated; the **API** (Meta → WhatsApp → API Setup) can.
Once it is set up — a Meta business account, a verified number, and a message template with one variable
approved by Meta — the same `send_alert` function can post to it alongside the email. That API is also what
would let **Approve** tell a contractor their account is live without anyone pressing send.

## What the first run taught us

- **Paste the key on its own line.** Double-clicking a placeholder like `re_YOUR_KEY_HERE` selects only part of it in
  the SQL editor; the key was pasted after the leftover `re_YOU`, and Resend answered *API key is invalid* for a key
  that was, underneath, correct. `set_alerts` now refuses anything that is not shaped like a Resend key.
- **"sent" in `alert_log` means handed to pg_net, not delivered.** Resend's real answer is in
  `select created, status_code, content from net._http_response order by created desc limit 3;` — and pg_net only
  sends after the transaction commits, so a check in the same run as the send always shows the previous attempt.
- **Resend's API keys page has a "Last used" column.** "No activity" on a key that should have been used means the
  key Resend received was not that key.
- **Copying Arabic to the clipboard from this shell needs `LC_CTYPE=en_US.UTF-8`**, or the Arabic in a pasted script
  arrives as `ÿ±ÿ≥ÿßŸÑÿ©…`. Only 009 contains Arabic; 001–008 were unaffected.

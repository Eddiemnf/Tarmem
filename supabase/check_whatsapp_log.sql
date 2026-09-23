-- Tarmem — every WhatsApp the database tried to send, newest first, with Meta's answer where it has arrived.
-- HOW TO RUN: Supabase → SQL Editor → paste → Run.
select public.wa_reconcile() as answers_copied;
select at, recipient, template, status, coalesce(answer, detail) as outcome, answer_code
from public.email_log
where channel = 'whatsapp'
order by at desc
limit 12;

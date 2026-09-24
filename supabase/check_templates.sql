-- Tarmem — ask Meta which templates exist on the WhatsApp account with the site's number, and their status.
-- The token stays in the database; nothing is shown but the list.
-- HOW TO RUN: Supabase → SQL Editor. Run STEP 1, wait five seconds, then select STEP 2 alone and Run it.
-- (A request leaves only when the run that made it ends, so one run cannot show its own answer.)

-- STEP 1 — the question
select net.http_get(
  'https://graph.facebook.com/v25.0/2162520270999056/message_templates?fields=name,language,status,category,rejected_reason&limit=100',
  headers := jsonb_build_object('Authorization', 'Bearer ' || (select value from public.app_secrets where key = 'wa_token'))) as request;

-- STEP 2 — Meta's answer: the latest template list, or what Meta said instead
with last as (select content from net._http_response
               where content like '%"data"%' or (content like '%error%' and content like '%OAuthException%')
               order by created desc limit 1)
select t ->> 'name' as template, t ->> 'language' as lang, t ->> 'status' as status, t ->> 'category' as category, t ->> 'rejected_reason' as why
from last, jsonb_array_elements(coalesce(public.wa_json(last.content) -> 'data', jsonb_build_array(jsonb_build_object('name', '(no list — Meta said:) ' || left(last.content, 300))))) t
order by 1, 2;

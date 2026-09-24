-- Tarmem — ask Meta how the WhatsApp account stands: business verification, what may be sent, and the number's
-- quality and daily limit. The token stays in the database; nothing is shown but Meta's answers.
-- HOW TO RUN: Supabase → SQL Editor. Run STEP 1, wait five seconds, then select STEP 2 alone and Run it.
-- (A request leaves only when the run that made it ends, so one run cannot show its own answer.)

-- STEP 1 — the two questions
select net.http_get('https://graph.facebook.com/v25.0/2162520270999056?fields=name,account_review_status,business_verification_status,health_status',
         headers := jsonb_build_object('Authorization', 'Bearer ' || (select value from public.app_secrets where key = 'wa_token'))) as account,
       net.http_get('https://graph.facebook.com/v25.0/1377051788817873?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,name_status',
         headers := jsonb_build_object('Authorization', 'Bearer ' || (select value from public.app_secrets where key = 'wa_token'))) as number;

-- STEP 2 — Meta's answers, in plain columns
select coalesce(a ->> 'business_verification_status', a -> 'error' ->> 'message') as business_verification,
       a -> 'health_status' ->> 'can_send_message' as can_send,
       (select string_agg(e ->> 'entity_type' || ': ' || coalesce(e -> 'errors' -> 0 ->> 'error_description', e ->> 'can_send_message'), ' / ')
          from jsonb_array_elements(a -> 'health_status' -> 'entities') e) as details,
       n ->> 'quality_rating' as number_quality, n ->> 'messaging_limit_tier' as daily_limit
from (select public.wa_json(content) a from net._http_response where content like '%health_status%' order by created desc limit 1) x,
     (select public.wa_json(content) n from net._http_response where content like '%messaging_limit_tier%' order by created desc limit 1) y;

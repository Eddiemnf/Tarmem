-- Tarmem — what Meta answered to the last things the database sent it (template submissions, messages).
-- HOW TO RUN: Supabase → SQL Editor → paste → Run. Shows the newest answers first; nothing secret is shown.
select r.created, r.status_code, left(r.content, 500) as answer
from net._http_response r
order by r.created desc
limit 8;

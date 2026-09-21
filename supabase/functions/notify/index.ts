// Tarmem — tell the team when something arrives, even with no tab open.
//
// A Supabase Edge Function. Supabase calls it (Database → Webhooks) each time a row is added to
// projects, bids, contractor_applications or contact_messages. It sends a short email through Resend,
// and — once the WhatsApp Business API is set up — a WhatsApp template message too.
// Setup, step by step: docs/alerts-setup.md. Secrets are typed into Supabase by the owner; they are
// never in this repository and never reach the website.
//
//   WEBHOOK_SECRET     any long random text; the webhooks send it back in the x-tarmem-secret header
//   RESEND_API_KEY     from resend.com (the sending domain tarmem.sa must be verified there)
//   ALERT_FROM         e.g.  Tarmem <alerts@tarmem.sa>
//   ALERT_TO           where alerts go, e.g.  support@tarmem.sa   (several: comma-separated)
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TO, WHATSAPP_TEMPLATE   optional, for later

const env = (k: string) => Deno.env.get(k) ?? '';
const money = (n: unknown) => Number(n || 0).toLocaleString('en-US');

/** One line per kind of arrival. Nothing here that the team could not already see in the admin console. */
function describe(table: string, r: Record<string, unknown>): { subject: string; lines: string[] } | null {
  if (table === 'projects') return { subject: `مشروع جديد ${r.code}: ${r.title}`, lines: [`المدينة: ${r.city}`, `الميزانية: ${money(r.budget_min)} – ${money(r.budget_max)} ريال`, `التخصص: ${r.trade}`] };
  if (table === 'bids') return { subject: `عرض جديد بقيمة ${money(r.price)} ريال`, lines: [`المدة: ${r.days} يوم`, `المشروع: ${r.project_id}`] };
  if (table === 'contractor_applications') return { subject: `طلب انضمام مقاول: ${r.company}`, lines: [`المدينة: ${r.city}`, `المسؤول: ${r.person}`, `الجوال: ${r.mobile}`] };
  if (table === 'contact_messages') return { subject: `رسالة جديدة من ${r.name}`, lines: [r.topic ? `الموضوع: ${r.topic}` : '', String(r.message || '').slice(0, 400)].filter(Boolean) };
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' || req.headers.get('x-tarmem-secret') !== env('WEBHOOK_SECRET') || !env('WEBHOOK_SECRET')) return new Response('forbidden', { status: 403 });
  const event = await req.json().catch(() => null);
  if (event?.type !== 'INSERT' || !event.record) return new Response('ignored');
  if (String(event.record.title || event.record.name || event.record.company || '').startsWith('RLS TEST')) return new Response('test row ignored');
  const what = describe(String(event.table), event.record);
  if (!what) return new Response('ignored');
  const link = 'https://www.tarmem.sa/admin';
  const sent: string[] = [];

  if (env('RESEND_API_KEY') && env('ALERT_TO')) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env('ALERT_FROM') || 'Tarmem <alerts@tarmem.sa>', to: env('ALERT_TO').split(',').map((x) => x.trim()), subject: what.subject,
        html: `<div dir="rtl" style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.8"><p><strong>${what.subject}</strong></p>${what.lines.map((l) => `<p>${l.replace(/</g, '&lt;')}</p>`).join('')}<p><a href="${link}">افتح لوحة الإدارة</a></p></div>` }),
    });
    sent.push(`email:${res.status}`);
  }
  if (env('WHATSAPP_TOKEN') && env('WHATSAPP_PHONE_ID') && env('WHATSAPP_TO') && env('WHATSAPP_TEMPLATE')) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${env('WHATSAPP_PHONE_ID')}/messages`, {
      method: 'POST', headers: { authorization: `Bearer ${env('WHATSAPP_TOKEN')}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: env('WHATSAPP_TO'), type: 'template',
        template: { name: env('WHATSAPP_TEMPLATE'), language: { code: 'ar' }, components: [{ type: 'body', parameters: [{ type: 'text', text: what.subject.slice(0, 200) }] }] } }),
    });
    sent.push(`whatsapp:${res.status}`);
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'content-type': 'application/json' } });
});

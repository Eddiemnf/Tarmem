/* What has arrived, for the Tarmem team: posted projects with the owner's contact details,
   contact messages, and contractor applications. The database returns these rows only to an
   account the owner has marked as admin in the SQL editor; for anyone else this page is empty
   and the guard never opens it. Plain and functional on purpose — the designed admin console
   replaces it in a later slice. */

import { useEffect, useState } from 'react';
import type { VM } from '../state/viewModel';
import { fileLink, listFiles, type StoredFile } from './files';
import { currentAccount, loadInbox, markFunded, type Inbox, type SentRow } from './session';

const when = (iso: unknown) => String(iso || '').slice(0, 16).replace('T', ' ');
const H = ({ children }: { children: string }) => <h2 style={{ fontSize: '18px', color: '#1B1464', margin: '34px 0 10px' }}>{children}</h2>;
/** A project's photos and files, fetched when asked for; each link opens the file for the next hour. */
function ProjectFiles({ ownerId, projectId, ar }: { ownerId: string; projectId: string; ar: boolean }) {
  const [files, setFiles] = useState<(StoredFile & { url: string | null })[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    const found = await listFiles(ownerId, projectId);
    setFiles(await Promise.all(found.map(async (f) => ({ ...f, url: await fileLink(f.path) }))));
    setBusy(false);
  };
  if (!files) return <button type="button" className="lnkbtn" disabled={busy} onClick={load} style={{ fontSize: '12.5px' }}>{busy ? '…' : ar ? 'عرض الصور والملفات' : 'Show photos and files'}</button>;
  if (!files.length) return <span className="muted" style={{ fontSize: '12.5px' }}>{ar ? 'لا ملفات.' : 'No files.'}</span>;
  return <span style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12.5px' }}>{files.map((f) => (f.url
    ? <a key={f.path} href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: '#FF5A3C' }}>{f.name}</a>
    : <span key={f.path} className="muted">{f.name}</span>))}</span>;
}

const cell = { padding: '10px 12px', borderBottom: '1px solid #EEEDF5', verticalAlign: 'top', fontSize: '13.5px', lineHeight: 1.7 } as const;

/** What an event is called on the delivery log, from the template name the database logged. */
const EVENT_LABELS: Record<string, [string, string]> = {
  project_posted: ['نشر المشروع', 'Project posted'], new_bid: ['عطاء جديد', 'New bid'], agreement_accepted: ['قبول العطاء', 'Bid accepted'],
  agreement_signed: ['توقيع الاتفاقية', 'Agreement signed'], application_verified: ['توثيق الحساب', 'Account verified'], stage_submitted: ['تقديم مرحلة', 'Stage submitted'],
  stage_released: ['اعتماد مرحلة', 'Stage approved'], stage_disputed: ['ملاحظة على مرحلة', 'Stage issue'], wa_test: ['رسالة تجريبية', 'Test message'], contact_receipt: ['إيصال رسالة', 'Message receipt'],
};
/** One line about what happened to a message, in the team's language: the provider's answer where it has arrived, our own reason otherwise. */
function outcome(r: SentRow, ar: boolean): { text: string; cls: string } {
  const provider = r.channel === 'whatsapp' ? 'Meta' : 'Resend';
  if (r.recipient === 'meta') return { text: r.status === 'submitted' ? (ar ? `قالب مُرسل للمراجعة (${r.detail || ''})` : `template submitted for review (${r.detail || ''})`) : (ar ? 'قالب محذوف' : 'template deleted'), cls: 'tag-n' };
  if (r.status === 'sent' && r.answer === 'accepted') return { text: ar ? `قبلها ${provider}` : `accepted by ${provider}`, cls: 'tag-g' };
  if (r.status === 'sent' && r.answer) return { text: ar ? `رفضها ${provider}: ${r.answer}` : `refused by ${provider}: ${r.answer}`, cls: 'tag-p' };
  if (r.status === 'sent') return { text: ar ? 'أُرسلت، بانتظار رد المزوّد' : 'sent, awaiting the provider\u2019s answer', cls: 'tag-n' };
  if (r.status === 'queued') return { text: ar ? `مؤجّلة (وضع عدم الإزعاج): ${r.detail || ''}` : `held (quiet hours): ${r.detail || ''}`, cls: 'tag-n' };
  if (r.status === 'skipped') return { text: ar ? `لم تُرسل: ${r.detail || ''}` : `not sent: ${r.detail || ''}`, cls: 'tag-n' };
  if (r.status === 'throttled') return { text: ar ? `أُوقفت مؤقتًا: ${r.detail || ''}` : `throttled: ${r.detail || ''}`, cls: 'tag-p' };
  return { text: ar ? `فشلت: ${r.detail || ''}` : `failed: ${r.detail || ''}`, cls: 'tag-p' };
}

export default function InboxPage({ vm }: { vm: VM }) {
  const ar = vm.dir !== 'ltr';
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void loadInbox().then((result) => { if (live) { if (result.ok) setInbox(result.ok); else setFailed(true); } });
    return () => { live = false; };
  }, []);

  const label = (list: { id: string; label: string }[] | undefined, id: string) => list?.find((x) => x.id === id)?.label || id;

  return (
    <section className="wrap fade" style={{ paddingBlock: '40px 80px' }}>
      <span className="kick">{ar ? 'فريق ترميم' : 'Tarmem team'}</span>
      <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', marginTop: '8px' }}>{ar ? 'الوارد' : 'Inbox'}</h1>
      {failed ? <p className="autherr" role="alert">{ar ? 'تعذّر تحميل الوارد.' : 'The inbox could not be loaded.'}</p> : null}
      {!inbox && !failed ? <p className="muted">{ar ? 'جارٍ التحميل…' : 'Loading…'}</p> : null}
      {inbox ? (<>
        <H>{`${ar ? 'المشاريع' : 'Projects'} (${inbox.projects.length})`}</H>
        <div className="card" style={{ padding: '4px 8px', overflowX: 'auto' }}><table className="inbox-table" style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {inbox.projects.map((p) => (
            <tr key={p.id}>
              <td style={cell} className="num">{p.code}<br /><span className="muted">{when(p.created_at)}</span><br /><span className="tag tag-n">{p.status}</span></td>
              <td style={cell}><strong style={{ color: '#1B1464' }}>{p.title}</strong><br />{label(vm.trades, p.trade)} · {label(vm.cities, p.city)}{p.district ? ` · ${p.district}` : ''}<br /><span className="num">{p.budget_min.toLocaleString('en-US')} – {p.budget_max.toLocaleString('en-US')} SAR</span> · {p.timing}<br /><span style={{ whiteSpace: 'pre-wrap', color: '#3A385C' }}>{p.description}</span><br /><ProjectFiles ownerId={p.owner_id} projectId={p.id} ar={ar} />
                {currentAccount()?.paymentsLive && p.status === 'active' ? (p.funded_at
                  ? <div style={{ marginTop: '6px', fontSize: '12.5px', color: '#0F7B4B' }}>{ar ? '✔ الدفعة مستلمة' : '✔ Payment received'}</div>
                  : <button type="button" className="btn btn-s btn-sm" style={{ marginTop: '8px' }} onClick={() => { void markFunded(p.id).then((r) => { if (r.ok) void loadInbox().then((x) => { if (x.ok) setInbox(x.ok); }); }); }}>{ar ? 'تأكيد استلام الدفعة' : 'Confirm payment received'}</button>) : null}
                {p.bids.map((b) => (
                  <div key={b.id} className="num" style={{ marginTop: '6px', fontSize: '12.5px', color: b.status === 'chosen' ? '#0F7B4B' : '#3A385C' }}>
                    {b.status === 'chosen' ? '✔ ' : '• '}{b.company} — {b.price.toLocaleString('en-US')} SAR · {b.days} {ar ? 'يوم' : 'days'} · <a dir="ltr" href={`tel:${b.mobile}`}>{b.mobile}</a>{b.status === 'chosen' ? (ar ? ' — اختاره العميل' : ' — chosen by the customer') : ''}
                  </div>
                ))}</td>
              <td style={cell}>{p.owner?.full_name || '—'}<br /><a className="num" dir="ltr" href={`tel:${p.owner?.mobile || ''}`}>{p.owner?.mobile}</a><br /><a dir="ltr" href={`mailto:${p.owner?.email || ''}`}>{p.owner?.email}</a></td>
            </tr>
          ))}
          {!inbox.projects.length ? <tr><td style={cell} className="muted">{ar ? 'لا مشاريع بعد.' : 'No projects yet.'}</td></tr> : null}
        </tbody></table></div>

        <H>{`${ar ? 'طلبات المقاولين' : 'Contractor applications'} (${inbox.applications.length})`}</H>
        <div className="card" style={{ padding: '4px 8px', overflowX: 'auto' }}><table className="inbox-table" style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {inbox.applications.map((a) => (
            <tr key={String(a.id)}>
              <td style={cell} className="num"><span className="muted">{when(a.created_at)}</span><br /><span className="tag tag-n">{String(a.status)}</span></td>
              <td style={cell}><strong style={{ color: '#1B1464' }}>{String(a.company)}</strong> — {String(a.person)}<br />{label(vm.cities, String(a.city))} · {(a.trades as string[] || []).map((t) => label(vm.trades, t)).join(ar ? '، ' : ', ')}{a.cr_number ? <><br />CR <span className="num">{String(a.cr_number)}</span></> : null}{a.note ? <><br /><span style={{ whiteSpace: 'pre-wrap', color: '#3A385C' }}>{String(a.note)}</span></> : null}</td>
              <td style={cell}><a className="num" dir="ltr" href={`tel:${String(a.mobile)}`}>{String(a.mobile)}</a>{a.email ? <><br /><a dir="ltr" href={`mailto:${String(a.email)}`}>{String(a.email)}</a></> : null}</td>
            </tr>
          ))}
          {!inbox.applications.length ? <tr><td style={cell} className="muted">{ar ? 'لا طلبات بعد.' : 'No applications yet.'}</td></tr> : null}
        </tbody></table></div>

        <H>{`${ar ? 'الرسائل' : 'Messages'} (${inbox.messages.length})`}</H>
        <div className="card" style={{ padding: '4px 8px', overflowX: 'auto' }}><table className="inbox-table" style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {inbox.messages.map((m) => (
            <tr key={String(m.id)}>
              <td style={cell} className="num"><span className="muted">{when(m.created_at)}</span></td>
              <td style={cell}><strong style={{ color: '#1B1464' }}>{String(m.name)}</strong>{m.topic ? ` — ${String(m.topic)}` : ''}<br /><span style={{ whiteSpace: 'pre-wrap', color: '#3A385C' }}>{String(m.message)}</span></td>
              <td style={cell}>{m.mobile ? <a className="num" dir="ltr" href={`tel:${String(m.mobile)}`}>{String(m.mobile)}</a> : null}{m.email ? <><br /><a dir="ltr" href={`mailto:${String(m.email)}`}>{String(m.email)}</a></> : null}</td>
            </tr>
          ))}
          {!inbox.messages.length ? <tr><td style={cell} className="muted">{ar ? 'لا رسائل بعد.' : 'No messages yet.'}</td></tr> : null}
        </tbody></table></div>

        <H>{`${ar ? 'الرسائل المرسلة' : 'Messages sent'} (${inbox.sent.length})`}</H>
        <p className="muted" style={{ fontSize: '12.5px', margin: '-4px 0 10px' }}>{ar ? 'كل بريد وكل رسالة واتساب أرسلها الموقع، وما ردّ به المزوّد عليها.' : 'Every email and WhatsApp the site sent, and what the provider answered.'}</p>
        <div className="card sent-log" style={{ padding: '4px 8px', overflowX: 'auto' }}><table className="inbox-table" style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {inbox.sent.map((r) => { const o = outcome(r, ar); const ev = EVENT_LABELS[r.template]; return (
            <tr key={r.id}>
              <td style={cell} className="num"><span className="muted">{when(r.at)}</span><br /><span className="tag tag-n">{r.channel === 'whatsapp' ? 'WhatsApp' : ar ? 'بريد' : 'Email'}</span></td>
              <td style={cell}><strong style={{ color: '#1B1464' }}>{ev ? (ar ? ev[0] : ev[1]) : r.template}</strong><br /><span className="num" dir="ltr">{r.recipient === 'meta' ? '' : r.recipient}</span></td>
              <td style={cell}><span className={`tag ${o.cls}`}>{o.text}</span></td>
            </tr>); })}
          {!inbox.sent.length ? <tr><td style={cell} className="muted">{ar ? 'لم يُرسل شيء بعد.' : 'Nothing sent yet.'}</td></tr> : null}
        </tbody></table></div>
      </>) : null}
    </section>
  );
}

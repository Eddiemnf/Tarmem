/* What has arrived, for the Tarmem team: posted projects with the owner's contact details,
   contact messages, and contractor applications. The database returns these rows only to an
   account the owner has marked as admin in the SQL editor; for anyone else this page is empty
   and the guard never opens it. Plain and functional on purpose — the designed admin console
   replaces it in a later slice. */

import { useEffect, useState } from 'react';
import type { VM } from '../state/viewModel';
import { loadInbox, type Inbox } from './session';

const when = (iso: unknown) => String(iso || '').slice(0, 16).replace('T', ' ');
const H = ({ children }: { children: string }) => <h2 style={{ fontSize: '18px', color: '#1B1464', margin: '34px 0 10px' }}>{children}</h2>;
const cell = { padding: '10px 12px', borderBottom: '1px solid #EEEDF5', verticalAlign: 'top', fontSize: '13.5px', lineHeight: 1.7 } as const;

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
        <div className="card" style={{ padding: '4px 8px', overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {inbox.projects.map((p) => (
            <tr key={p.id}>
              <td style={cell} className="num">{p.code}<br /><span className="muted">{when(p.created_at)}</span><br /><span className="tag tag-n">{p.status}</span></td>
              <td style={cell}><strong style={{ color: '#1B1464' }}>{p.title}</strong><br />{label(vm.trades, p.trade)} · {label(vm.cities, p.city)}{p.district ? ` · ${p.district}` : ''}<br /><span className="num">{p.budget_min.toLocaleString('en-US')} – {p.budget_max.toLocaleString('en-US')} SAR</span> · {p.timing}<br /><span style={{ whiteSpace: 'pre-wrap', color: '#3A385C' }}>{p.description}</span></td>
              <td style={cell}>{p.owner?.full_name || '—'}<br /><a className="num" dir="ltr" href={`tel:${p.owner?.mobile || ''}`}>{p.owner?.mobile}</a><br /><a dir="ltr" href={`mailto:${p.owner?.email || ''}`}>{p.owner?.email}</a></td>
            </tr>
          ))}
          {!inbox.projects.length ? <tr><td style={cell} className="muted">{ar ? 'لا مشاريع بعد.' : 'No projects yet.'}</td></tr> : null}
        </tbody></table></div>

        <H>{`${ar ? 'طلبات المقاولين' : 'Contractor applications'} (${inbox.applications.length})`}</H>
        <div className="card" style={{ padding: '4px 8px', overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
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
        <div className="card" style={{ padding: '4px 8px', overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {inbox.messages.map((m) => (
            <tr key={String(m.id)}>
              <td style={cell} className="num"><span className="muted">{when(m.created_at)}</span></td>
              <td style={cell}><strong style={{ color: '#1B1464' }}>{String(m.name)}</strong>{m.topic ? ` — ${String(m.topic)}` : ''}<br /><span style={{ whiteSpace: 'pre-wrap', color: '#3A385C' }}>{String(m.message)}</span></td>
              <td style={cell}>{m.mobile ? <a className="num" dir="ltr" href={`tel:${String(m.mobile)}`}>{String(m.mobile)}</a> : null}{m.email ? <><br /><a dir="ltr" href={`mailto:${String(m.email)}`}>{String(m.email)}</a></> : null}</td>
            </tr>
          ))}
          {!inbox.messages.length ? <tr><td style={cell} className="muted">{ar ? 'لا رسائل بعد.' : 'No messages yet.'}</td></tr> : null}
        </tbody></table></div>
      </>) : null}
    </section>
  );
}

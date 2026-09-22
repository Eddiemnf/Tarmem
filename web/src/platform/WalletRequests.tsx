/* Under the admin console's payments table: every deposit and payout still waiting for the team's confirmation.
   Shown only once payments are live (platform_flags.payments_live); until then the section does not exist. */

import { useEffect, useState } from 'react';
import type { VM } from '../state/viewModel';
import { PLATFORM_COPY } from './copy';
import { currentAccount, loadWalletRequests, walletDecide, type WalletRequest } from './session';

export default function WalletRequests({ vm }: { vm: VM }) {
  const account = currentAccount();
  const live = Boolean(account?.logicUser.admin && account.paymentsLive);
  const [rows, setRows] = useState<WalletRequest[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => { if (live) void loadWalletRequests().then(setRows); }, [live]);
  if (!live) return null;
  const copy = PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  const decide = async (r: WalletRequest, status: 'confirmed' | 'paid' | 'rejected') => {
    setBusy(r.id);
    const result = await walletDecide(r.id, status);
    setBusy(null);
    if (result.ok) setRows(await loadWalletRequests());
  };
  return (
    <div className="card" style={{ marginTop: '16px', padding: '18px 20px', gap: '12px' }}>
      <span className="kick">{copy.wrTitle}</span>
      <p className="muted" style={{ fontSize: '13px', margin: 0 }}>{copy.wrNote}</p>
      {rows === null ? <p className="muted" style={{ fontSize: '13px' }}>…</p> : !rows.length ? <p className="muted" style={{ fontSize: '13px' }}>{copy.wrNone}</p> : (
        <table className="table"><tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="muted num" style={{ fontSize: '12.5px' }}>{r.created_at.slice(0, 10)}</td>
              <td style={{ fontWeight: 500 }}>{r.person}</td>
              <td><span className={`tag ${r.type === 'deposit' ? 'tag-n' : 'tag-w'}`}>{r.type === 'deposit' ? copy.wrDeposit : copy.wrPayout}</span>{r.code ? <span className="muted num" style={{ fontSize: '12px', marginInlineStart: '6px' }}>{r.code}</span> : null}</td>
              <td className="num">{vm.curPre}{r.amount.toLocaleString('en-US')}{vm.curPost}</td>
              <td style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
                <button type="button" className="btn btn-p btn-sm" disabled={busy === r.id} onClick={() => decide(r, r.type === 'deposit' ? 'confirmed' : 'paid')}>{r.type === 'deposit' ? copy.wrConfirm : copy.wrPaid}</button>
                {' '}<button type="button" className="btn btn-s btn-sm" disabled={busy === r.id} onClick={() => decide(r, 'rejected')}>{copy.wrReject}</button>
              </td>
            </tr>
          ))}
        </tbody></table>
      )}
    </div>
  );
}

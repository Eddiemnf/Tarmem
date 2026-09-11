/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import type { VM } from '../state/viewModel';

export default function BackLink({ vm }: { vm: VM }) {
  return (<>
    <div className="wrap" style={{ paddingBlock: '20px 0' }}><a className="lnk" onClick={vm.back} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: '#FF5A3C', cursor: 'pointer' }}><span aria-hidden="true" style={{ fontSize: '12px', lineHeight: '1' }}>{vm.backArrow}</span>{vm.backWord}</a></div>
  </>);
}

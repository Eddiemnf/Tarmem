/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import type { VM } from '../state/viewModel';
import { ImageSlot } from '../components/ImageSlot';

export default function AboutPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '56px 80px' }}>
      <span className="kick">{vm.t.about.kicker}</span>
      <h1 style={{ fontSize: 'clamp(30px,3.4vw,44px)', lineHeight: '1.2', color: '#1B1464', margin: '10px 0 24px', maxWidth: '24ch', textWrap: 'balance' }}>{vm.t.about.title}</h1>
      <div className="gside" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr)', gap: '48px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#5B5A7A', fontSize: '16px' }}><p>{vm.t.about.p1}</p><p>{vm.t.about.p2}</p><p>{vm.t.about.p2b}</p><p>{vm.t.about.p3}</p></div>
        <div style={{ aspectRatio: '4/5', borderRadius: '24px', overflow: 'hidden' }}><ImageSlot id="about" shape="rect" placeholder="Team or site photograph" style={{ width: '100%', height: '100%' }} /></div>
      </div>
      <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '20px', marginTop: '56px' }}>
        <div className="card" style={{ padding: '28px', background: '#1B1464', color: '#fff', border: '0' }}><span className="kick" style={{ color: '#FF9A6B' }}>{vm.t.about.missionK}</span><p style={{ fontSize: '18px', fontWeight: '500', lineHeight: '1.5' }}>{vm.t.about.mission}</p></div>
        <div className="card" style={{ padding: '28px', background: '#F7F6FC', border: '0' }}><span className="kick">{vm.t.about.visionK}</span><p style={{ fontSize: '18px', fontWeight: '500', lineHeight: '1.5', color: '#1B1464' }}>{vm.t.about.vision}</p></div>
        <div className="card" style={{ padding: '28px' }}><span className="kick">{vm.t.about.growthK}</span><p style={{ fontSize: '14px', color: '#5B5A7A' }}>{vm.t.about.growth}</p></div>
      </div>

    </section>
  </>);
}

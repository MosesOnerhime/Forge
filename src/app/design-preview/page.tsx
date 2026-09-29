import { notFound } from 'next/navigation'
import { Barbell, ForkKnife, ArrowRight, Timer, Plus } from '@phosphor-icons/react/dist/ssr'
import { Nav } from '@/components/nav'

export default function DesignPreview() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <div className="shell">
    <aside className="sidebar"><div className="brand">FORGE<span>.</span></div><Nav activePath="/today" /></aside>
    <main className="main">
      <div className="page-head today-head"><div className="eyebrow">Monday, September 28</div><h1>Today starts here.</h1><p>One clear view of the work ahead.</p></div>
      <div className="notice success" style={{ marginBottom: 16 }}>Sample data for layout review. These numbers are not from an account.</div>
      <div className="grid-2">
        <section className="card strong">
          <div className="row"><div className="eyebrow">Training plan</div><Barbell size={24} color="var(--accent)" /></div>
          <h2 style={{ fontSize: 30, marginTop: 24 }}>Back + Biceps + Forearms</h2>
          <p className="muted">7 exercises · 85–110 min</p>
          <div className="row wrap" style={{ marginTop: 20 }}><button className="btn primary">Start workout <ArrowRight size={18} /></button><span className="muted small">Weekly plan →</span></div>
        </section>
        <section className="card">
          <div className="row"><div className="eyebrow">Fuel today</div><ForkKnife size={24} color="var(--amber)" /></div>
          <div style={{ marginTop: 20 }}><div className="metric">1,840 <small>/ 2,900 kcal</small></div><div className="progress-track" style={{ marginTop: 14 }}><div className="progress-fill" style={{ width: '63%' }} /></div></div>
          {([['Protein', '112 / 170 g'], ['Carbs', '220 / 375 g'], ['Fat', '54 / 80 g']] as const).map(([name, value]) => <div className="row" style={{ marginTop: 12 }} key={name}><span className="muted small">{name}</span><strong>{value}</strong></div>)}
          <button className="btn full" style={{ marginTop: 12 }}>Log food <ArrowRight size={18} /></button>
        </section>
      </div>
      <section className="card today-exercises"><h2>Exercises today</h2><ol>{['Weighted Pull-ups', 'Chest-Supported Row', 'Lat Pulldown', 'Incline Dumbbell Curl', 'Preacher Curl / Cable Curl', 'Reverse Curl', 'Wrist Curl / Reverse Wrist Curl'].map((name, index) => <li key={name}><span>{String(index + 1).padStart(2, '0')}</span>{name}</li>)}</ol></section>
      <div className="section-head"><h2>In the gym</h2></div>
      <section className="card">
        <div className="row wrap"><div className="row" style={{ justifyContent: 'flex-start' }}><span className="pill orange">01</span><h2>Weighted Pull-ups</h2></div></div>
        <div className="row wrap" style={{ justifyContent: 'flex-start', marginTop: 12 }}><span className="pill">3 × 6–10 reps</span><span className="pill"><Timer size={13} /> 3 min rest</span></div>
        <p className="muted small">Last time: 10 kg × 8 · 10 kg × 7 · 10 kg × 6</p>
        <div className="fields cols-3"><div><label>Set 1 · Weight kg</label><input defaultValue="10" /></div><div><label>Reps</label><input defaultValue="9" /></div><div><label>RIR</label><input defaultValue="2" /></div></div>
        <button className="btn primary" style={{ marginTop: 12 }}><Plus size={17} /> Log set</button>
      </section>
      <div className="section-head"><h2>Keep the streak moving</h2></div>
      <div className="grid-2">
        <div className="card"><div className="eyebrow">Body weight</div><div className="metric" style={{ marginTop: 14 }}>78.4 <small>kg</small></div><p className="muted small">Last logged yesterday</p><p className="muted small">+0.4 kg since the previous check-in</p></div>
        <div className="card"><div className="eyebrow">Training notes</div><h2 style={{ marginTop: 14 }}>What did you notice?</h2><p className="muted small">Keep the details that numbers miss.</p></div>
      </div>
    </main>
    <Nav mobile activePath="/today" />
  </div>
}

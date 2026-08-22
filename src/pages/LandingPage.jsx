import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'

const G = '#C9A84C', GL = '#e8c97a'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d0d0d; color: #e8e8e8; font-family: 'Inter', sans-serif; }

  .land { min-height: 100vh; display: flex; flex-direction: column; }

  /* NAV */
  .nav { display: flex; align-items: center; justify-content: space-between;
    padding: 1.2rem 2.5rem; border-bottom: .5px solid #1e1e1e; position: sticky;
    top: 0; background: rgba(13,13,13,.92); backdrop-filter: blur(12px); z-index: 100; }
  .nav-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; }
  .nav-icon { width: 38px; height: 38px; background: #C9A84C; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .nav-name { font-family: 'Cormorant Garamond', serif; font-size: 22px;
    font-weight: 600; color: #e8e8e8; letter-spacing: .5px; }
  .nav-name span { color: #C9A84C; }
  .nav-actions { display: flex; gap: 12px; align-items: center; }
  .btn-ghost { background: transparent; border: .5px solid #333; border-radius: 8px;
    padding: 8px 20px; color: #aaa; font-size: 13px; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: all .2s; }
  .btn-ghost:hover { border-color: #C9A84C; color: #C9A84C; }
  .btn-gold { background: #C9A84C; border: none; border-radius: 8px; padding: 9px 22px;
    color: #0d0d0d; font-size: 13px; font-weight: 600; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: all .2s; }
  .btn-gold:hover { background: #e8c97a; }

  /* HERO */
  .hero { flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center; padding: 5rem 1.5rem 4rem;
    position: relative; overflow: hidden; }
  .hero::before { content: ''; position: absolute; width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(201,168,76,.08) 0%, transparent 70%);
    top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none; }
  .hero-eyebrow { font-size: 11px; letter-spacing: 3px; color: #C9A84C;
    text-transform: uppercase; margin-bottom: 1.5rem; font-weight: 500; }
  .hero-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(2.8rem, 7vw, 5.5rem);
    font-weight: 600; line-height: 1.05; color: #fff; margin-bottom: 1.4rem;
    max-width: 820px; }
  .hero-title em { color: #C9A84C; font-style: normal; }
  .hero-sub { font-size: 16px; color: #888; line-height: 1.7; max-width: 520px;
    margin-bottom: 2.8rem; font-weight: 300; }
  .hero-cta { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
  .btn-hero { background: #C9A84C; border: none; border-radius: 12px; padding: 15px 36px;
    color: #0d0d0d; font-size: 15px; font-weight: 600; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: all .25s; letter-spacing: .3px; }
  .btn-hero:hover { background: #e8c97a; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(201,168,76,.25); }
  .btn-hero-ghost { background: transparent; border: .5px solid #333; border-radius: 12px;
    padding: 15px 36px; color: #ccc; font-size: 15px; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: all .25s; }
  .btn-hero-ghost:hover { border-color: #C9A84C; color: #C9A84C; }

  /* STATS */
  .stats { display: flex; justify-content: center; gap: 0; border-top: .5px solid #1e1e1e;
    border-bottom: .5px solid #1e1e1e; }
  .stat { flex: 1; max-width: 220px; padding: 2rem 1rem; text-align: center;
    border-right: .5px solid #1e1e1e; }
  .stat:last-child { border-right: none; }
  .stat-n { font-family: 'Cormorant Garamond', serif; font-size: 2.6rem;
    color: #C9A84C; font-weight: 600; line-height: 1; margin-bottom: .3rem; }
  .stat-l { font-size: 11px; color: #555; letter-spacing: 1.5px; text-transform: uppercase; }

  /* FEATURES */
  .features { padding: 5rem 2rem; max-width: 1100px; margin: 0 auto; width: 100%; }
  .section-label { font-size: 11px; letter-spacing: 3px; color: #C9A84C;
    text-transform: uppercase; text-align: center; margin-bottom: 1rem; font-weight: 500; }
  .section-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.8rem, 4vw, 2.8rem);
    font-weight: 600; text-align: center; color: #fff; margin-bottom: 3.5rem; }
  .feat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5px;
    background: #1a1a1a; border: 1.5px solid #1a1a1a; border-radius: 16px; overflow: hidden; }
  .feat-item { background: #0d0d0d; padding: 2.2rem 2rem; transition: background .25s; }
  .feat-item:hover { background: #111; }
  .feat-icon { font-size: 28px; margin-bottom: 1rem; }
  .feat-title { font-size: 15px; font-weight: 500; color: #e8c97a; margin-bottom: .5rem; }
  .feat-desc { font-size: 13px; color: #666; line-height: 1.7; }

  /* HOW IT WORKS */
  .how { padding: 5rem 2rem; background: #080808; }
  .how-inner { max-width: 900px; margin: 0 auto; }
  .steps-list { display: flex; flex-direction: column; gap: 0; margin-top: 3rem; }
  .step-row { display: flex; gap: 2rem; align-items: flex-start; padding: 2rem 0;
    border-bottom: .5px solid #1a1a1a; }
  .step-row:last-child { border-bottom: none; }
  .step-num { font-family: 'Cormorant Garamond', serif; font-size: 3rem; color: #1e1e1e;
    font-weight: 700; line-height: 1; flex-shrink: 0; width: 60px; }
  .step-body { flex: 1; padding-top: .3rem; }
  .step-title { font-size: 16px; font-weight: 500; color: #e8e8e8; margin-bottom: .4rem; }
  .step-desc { font-size: 13px; color: #666; line-height: 1.7; }

  /* CTA FINALE */
  .cta-section { padding: 6rem 2rem; text-align: center; }
  .cta-box { max-width: 600px; margin: 0 auto; }
  .cta-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 600; color: #fff; margin-bottom: 1rem; }
  .cta-sub { font-size: 14px; color: #666; margin-bottom: 2.5rem; line-height: 1.7; }

  /* FOOTER */
  .footer { border-top: .5px solid #1a1a1a; padding: 2rem 2.5rem;
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
  .footer-copy { font-size: 12px; color: #444; }
  .footer-note { font-size: 11px; color: #333; }

  @media (max-width: 600px) {
    .nav { padding: 1rem 1.2rem; }
    .stats { flex-wrap: wrap; }
    .stat { border-right: none; border-bottom: .5px solid #1e1e1e; max-width: 100%; width: 50%; }
    .step-row { flex-direction: column; gap: .8rem; }
    .step-num { font-size: 2rem; width: auto; }
    .footer { flex-direction: column; text-align: center; }
  }
`

const buildFeatures = (t) => [
  { icon: '🗺️', title: t('land.feat.1.title'), desc: t('land.feat.1.desc') },
  { icon: '🏨', title: t('land.feat.2.title'), desc: t('land.feat.2.desc') },
  { icon: '🍽️', title: t('land.feat.3.title'), desc: t('land.feat.3.desc') },
  { icon: '✈️', title: t('land.feat.4.title'), desc: t('land.feat.4.desc') },
  { icon: '🧭', title: t('land.feat.5.title'), desc: t('land.feat.5.desc') },
  { icon: '💾', title: t('land.feat.6.title'), desc: t('land.feat.6.desc') },
]

const buildHowSteps = (t) => [
  { title: t('land.how.1.title'), desc: t('land.how.1.desc') },
  { title: t('land.how.2.title'), desc: t('land.how.2.desc') },
  { title: t('land.how.3.title'), desc: t('land.how.3.desc') },
  { title: t('land.how.4.title'), desc: t('land.how.4.desc') },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, lang, setLang, languages } = useLang()

  const FEATURES = buildFeatures(t)
  const HOW_STEPS = buildHowSteps(t)
  const STATS = [['15+', t('land.stat.steps')], ['3', t('land.stat.budget')], ['100%', t('land.stat.custom')], ['AI', t('land.stat.powered')]]

  return (
    <>
      <style>{css}</style>
      <div className="land">

        {/* NAV */}
        <nav className="nav">
          <a className="nav-logo" href="/">
            <div className="nav-icon">✈️</div>
            <div className="nav-name">Travel <span>AI</span> Agent</div>
          </a>
          <div className="nav-actions">
            <select value={lang} onChange={e => setLang(e.target.value)} aria-label="Lingua"
              style={{ background:'transparent', color:'#aaa', border:'.5px solid #333', borderRadius:8, padding:'7px 10px', fontSize:13, fontFamily:'Inter,sans-serif', cursor:'pointer' }}>
              {languages.map(l => <option key={l.code} value={l.code} style={{ background:'#0d0d0d' }}>{l.label}</option>)}
            </select>
            {user ? (
              <button className="btn-gold" onClick={() => navigate('/dashboard')}>{t('land.nav.profile')}</button>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => navigate('/auth?mode=login')}>{t('land.nav.login')}</button>
                <button className="btn-gold" onClick={() => navigate('/auth?mode=signup')}>{t('land.nav.signup')}</button>
              </>
            )}
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="hero-eyebrow">{t('land.hero.eyebrow')}</div>
          <h1 className="hero-title">
            {t('land.hero.title1')}<br /><em>{t('land.hero.title2')}</em>
          </h1>
          <p className="hero-sub">
            {t('land.hero.sub')}
          </p>
          <div className="hero-cta">
            <button className="btn-hero" onClick={() => navigate(user ? '/planner' : '/auth?mode=signup')}>
              {t('land.hero.ctaMain')}
            </button>
            <button className="btn-hero-ghost" onClick={() => navigate('/auth?mode=login')}>
              {t('land.hero.ctaGhost')}
            </button>
          </div>
        </section>

        {/* STATS */}
        <div className="stats">
          {STATS.map(([n,l]) => (
            <div className="stat" key={l}>
              <div className="stat-n">{n}</div>
              <div className="stat-l">{l}</div>
            </div>
          ))}
        </div>

        {/* FEATURES */}
        <section className="features">
          <div className="section-label">{t('land.feat.label')}</div>
          <h2 className="section-title">{t('land.feat.title')}</h2>
          <div className="feat-grid">
            {FEATURES.map(f => (
              <div className="feat-item" key={f.title}>
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="how">
          <div className="how-inner">
            <div className="section-label">{t('land.how.label')}</div>
            <h2 className="section-title">{t('land.how.title')}</h2>
            <div className="steps-list">
              {HOW_STEPS.map((s, i) => (
                <div className="step-row" key={s.title}>
                  <div className="step-num">0{i+1}</div>
                  <div className="step-body">
                    <div className="step-title">{s.title}</div>
                    <div className="step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINALE */}
        <section className="cta-section">
          <div className="cta-box">
            <h2 className="cta-title">{t('land.cta.title')}</h2>
            <p className="cta-sub">{t('land.cta.sub')}</p>
            <button className="btn-hero" onClick={() => navigate('/auth?mode=signup')}>
              {t('land.cta.btn')}
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-copy">{t('land.footer.copy')}</div>
          <div className="footer-note">{t('land.footer.note')}</div>
        </footer>

      </div>
    </>
  )
}

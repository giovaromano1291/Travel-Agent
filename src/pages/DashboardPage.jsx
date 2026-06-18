import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const G = '#C9A84C', GL = '#e8c97a'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d0d0d; color: #e8e8e8; font-family: 'Inter', sans-serif; }

  .dash-wrap { min-height: 100vh; background: #0d0d0d; }

  /* NAV */
  .nav { display: flex; align-items: center; justify-content: space-between;
    padding: 1.2rem 2.5rem; border-bottom: .5px solid #1e1e1e; background: #0d0d0d; }
  .nav-logo { display: flex; align-items: center; gap: 12px; cursor: pointer; }
  .nav-icon { width: 36px; height: 36px; background: #C9A84C; border-radius: 9px;
    display: flex; align-items: center; justify-content: center; font-size: 17px; }
  .nav-name { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; }
  .nav-name span { color: #C9A84C; }
  .nav-right { display: flex; align-items: center; gap: 12px; }
  .user-badge { background: #161616; border: .5px solid #2a2a2a; border-radius: 20px;
    padding: 6px 14px; font-size: 12px; color: #888; }
  .btn-sm { background: transparent; border: .5px solid #2a2a2a; border-radius: 8px;
    padding: 7px 16px; color: #888; font-size: 12px; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: all .2s; }
  .btn-sm:hover { border-color: #C9A84C; color: #C9A84C; }
  .btn-sm-gold { background: #C9A84C; border: none; border-radius: 8px; padding: 8px 18px;
    color: #0d0d0d; font-size: 12px; font-weight: 600; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: all .2s; }
  .btn-sm-gold:hover { background: #e8c97a; }

  /* BODY */
  .dash-body { max-width: 900px; margin: 0 auto; padding: 3rem 1.5rem; }

  .welcome { margin-bottom: 3rem; }
  .welcome-sub { font-size: 11px; letter-spacing: 2px; color: #C9A84C;
    text-transform: uppercase; margin-bottom: .5rem; font-weight: 500; }
  .welcome-title { font-family: 'Cormorant Garamond', serif; font-size: 2.4rem;
    font-weight: 600; color: #fff; margin-bottom: .5rem; }
  .welcome-hint { font-size: 13px; color: #555; }

  /* NUOVO VIAGGIO CTA */
  .new-trip-card { background: linear-gradient(135deg, #161600 0%, #1a1200 100%);
    border: .5px solid #C9A84C; border-radius: 16px; padding: 2rem;
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; margin-bottom: 3rem; flex-wrap: wrap; }
  .ntc-text {}
  .ntc-title { font-family: 'Cormorant Garamond', serif; font-size: 1.5rem;
    color: #e8c97a; margin-bottom: .3rem; }
  .ntc-sub { font-size: 13px; color: #888; }
  .btn-new { background: #C9A84C; border: none; border-radius: 10px; padding: 12px 28px;
    color: #0d0d0d; font-size: 14px; font-weight: 600; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: all .2s; white-space: nowrap; }
  .btn-new:hover { background: #e8c97a; }

  /* SEZIONE ITINERARI */
  .section-hd { display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 1.2rem; }
  .section-title { font-size: 11px; letter-spacing: 2px; color: #C9A84C;
    text-transform: uppercase; font-weight: 600; }
  .section-count { font-size: 12px; color: #444; }

  .trip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  .trip-card { background: #111; border: .5px solid #222; border-radius: 14px;
    padding: 1.4rem; cursor: pointer; transition: all .25s; }
  .trip-card:hover { border-color: #C9A84C; background: #161600; transform: translateY(-2px); }
  .tc-dest { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem;
    color: #e8c97a; margin-bottom: .5rem; }
  .tc-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: .8rem; }
  .tc-tag { background: #0d0d0d; border: .5px solid #1e1e1e; border-radius: 10px;
    padding: 3px 9px; font-size: 10px; color: #666; }
  .tc-date { font-size: 11px; color: #444; margin-top: .6rem; }
  .tc-del { float: right; background: transparent; border: none; color: #333;
    font-size: 14px; cursor: pointer; padding: 0; transition: color .2s; }
  .tc-del:hover { color: #ff4444; }

  .empty-state { text-align: center; padding: 4rem 2rem; color: #444; }
  .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
  .empty-text { font-size: 14px; line-height: 1.7; }

  .loading-trips { text-align: center; padding: 3rem; color: #555; font-size: 13px; }

  /* MODAL DETTAGLIO */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.85);
    display: flex; align-items: center; justify-content: center; z-index: 1000;
    padding: 1rem; }
  .modal { background: #111; border: .5px solid #2a2a2a; border-radius: 20px;
    width: 100%; max-width: 700px; max-height: 85vh; overflow-y: auto; }
  .modal::-webkit-scrollbar { width: 4px; }
  .modal::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
  .modal-head { display: flex; align-items: center; justify-content: space-between;
    padding: 1.5rem 1.8rem; border-bottom: .5px solid #1e1e1e; }
  .modal-title { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; color: #e8c97a; }
  .modal-close { background: transparent; border: .5px solid #333; border-radius: 8px;
    width: 34px; height: 34px; color: #888; font-size: 16px; cursor: pointer; transition: all .2s; }
  .modal-close:hover { border-color: #C9A84C; color: #C9A84C; }
  .modal-body { padding: 1.8rem; font-size: 13px; color: #ccc; line-height: 1.9;
    white-space: pre-wrap; }

  @media (max-width: 600px) {
    .nav { padding: 1rem 1.2rem; }
    .dash-body { padding: 2rem 1rem; }
    .new-trip-card { flex-direction: column; align-items: flex-start; }
    .btn-new { width: 100%; }
  }
`

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [trips, setTrips] = useState([])
  const [loadingTrips, setLoadingTrips] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState(null)

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Viaggiatore'

  useEffect(() => { fetchTrips() }, [])

  async function fetchTrips() {
    setLoadingTrips(true)
    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setTrips(data || [])
    setLoadingTrips(false)
  }

  async function deleteTrip(id, e) {
    e.stopPropagation()
    if (!confirm('Eliminare questo itinerario?')) return
    await supabase.from('itineraries').delete().eq('id', id)
    setTrips(trips.filter(t => t.id !== id))
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <>
      <style>{css}</style>
      <div className="dash-wrap">

        <nav className="nav">
          <div className="nav-logo" onClick={() => navigate('/')}>
            <div className="nav-icon">✈️</div>
            <div className="nav-name">Travel <span>AI</span> Agent</div>
          </div>
          <div className="nav-right">
            <div className="user-badge">👤 {userName}</div>
            <button className="btn-sm" onClick={handleSignOut}>Esci</button>
            <button className="btn-sm-gold" onClick={() => navigate('/planner')}>+ Nuovo viaggio</button>
          </div>
        </nav>

        <div className="dash-body">

          <div className="welcome">
            <div className="welcome-sub">✦ Il tuo profilo</div>
            <div className="welcome-title">Bentornato, {userName.split(' ')[0]}.</div>
            <div className="welcome-hint">Qui trovi tutti i tuoi itinerari salvati.</div>
          </div>

          <div className="new-trip-card">
            <div className="ntc-text">
              <div className="ntc-title">✈️ Pianifica un nuovo viaggio</div>
              <div className="ntc-sub">Destinazione, date, budget — l'AI costruisce tutto il resto.</div>
            </div>
            <button className="btn-new" onClick={() => navigate('/planner')}>Inizia ora →</button>
          </div>

          <div className="section-hd">
            <div className="section-title">I tuoi itinerari</div>
            <div className="section-count">{trips.length} salvati</div>
          </div>

          {loadingTrips ? (
            <div className="loading-trips">⏳ Carico i tuoi viaggi...</div>
          ) : trips.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🗺️</div>
              <div className="empty-text">
                Non hai ancora pianificato nessun viaggio.<br />
                Clicca su "Inizia ora" per creare il tuo primo itinerario!
              </div>
            </div>
          ) : (
            <div className="trip-grid">
              {trips.map(trip => (
                <div className="trip-card" key={trip.id} onClick={() => setSelectedTrip(trip)}>
                  <button className="tc-del" onClick={(e) => deleteTrip(trip.id, e)}>🗑</button>
                  <div className="tc-dest">{trip.destination}</div>
                  <div className="tc-tags">
                    {[trip.period, trip.duration, trip.budget].filter(Boolean).map(t => (
                      <span className="tc-tag" key={t}>{t}</span>
                    ))}
                  </div>
                  <div className="tc-date">
                    Salvato il {new Date(trip.created_at).toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL DETTAGLIO ITINERARIO */}
        {selectedTrip && (
          <div className="modal-overlay" onClick={() => setSelectedTrip(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                <div className="modal-title">{selectedTrip.destination} {selectedTrip.trip_year}</div>
                <button className="modal-close" onClick={() => setSelectedTrip(null)}>✕</button>
              </div>
              <div className="modal-body">
                {selectedTrip.itinerary_text || 'Nessun dettaglio disponibile.'}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}

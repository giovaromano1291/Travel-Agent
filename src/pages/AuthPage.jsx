import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d0d0d; color: #e8e8e8; font-family: 'Inter', sans-serif; }

  .auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 2rem 1rem; background: #0d0d0d; }
  .auth-card { background: #111; border: .5px solid #222; border-radius: 20px;
    padding: 2.5rem 2.2rem; width: 100%; max-width: 420px; }

  .auth-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 2rem;
    justify-content: center; cursor: pointer; text-decoration: none; }
  .auth-icon { width: 40px; height: 40px; background: #C9A84C; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .auth-name { font-family: 'Cormorant Garamond', serif; font-size: 22px;
    font-weight: 600; color: #e8e8e8; }
  .auth-name span { color: #C9A84C; }

  .auth-title { font-family: 'Cormorant Garamond', serif; font-size: 26px;
    font-weight: 500; color: #e8c97a; text-align: center; margin-bottom: .4rem; }
  .auth-sub { font-size: 13px; color: #666; text-align: center; margin-bottom: 2rem; }

  .tabs { display: flex; background: #0d0d0d; border-radius: 10px; padding: 4px;
    margin-bottom: 1.8rem; }
  .tab { flex: 1; padding: 9px; border: none; background: transparent; color: #666;
    font-size: 13px; cursor: pointer; border-radius: 8px; font-family: 'Inter', sans-serif;
    transition: all .2s; }
  .tab.active { background: #C9A84C; color: #0d0d0d; font-weight: 600; }

  .field { margin-bottom: 1rem; }
  .field label { display: block; font-size: 11px; color: #666; letter-spacing: 1px;
    text-transform: uppercase; margin-bottom: .4rem; font-weight: 500; }
  .field input { width: 100%; background: #0d0d0d; border: .5px solid #2a2a2a;
    border-radius: 10px; padding: 12px 14px; font-size: 14px; color: #e8e8e8;
    font-family: 'Inter', sans-serif; outline: none; transition: border .2s; }
  .field input:focus { border-color: #C9A84C; }
  .field input::placeholder { color: #444; }

  .btn-submit { width: 100%; background: #C9A84C; border: none; border-radius: 10px;
    height: 46px; font-size: 14px; font-weight: 600; color: #0d0d0d; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: all .2s; margin-top: .5rem; }
  .btn-submit:hover { background: #e8c97a; }
  .btn-submit:disabled { opacity: .5; cursor: not-allowed; }

  .divider { display: flex; align-items: center; gap: 12px; margin: 1.2rem 0; }
  .divider-line { flex: 1; height: .5px; background: #222; }
  .divider-text { font-size: 11px; color: #444; }

  .btn-google { width: 100%; background: transparent; border: .5px solid #2a2a2a;
    border-radius: 10px; height: 44px; font-size: 13px; color: #aaa; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: all .2s; display: flex;
    align-items: center; justify-content: center; gap: 10px; }
  .btn-google:hover { border-color: #C9A84C; color: #C9A84C; }

  .error-msg { background: #1a0a0a; border: .5px solid #5a1a1a; border-radius: 8px;
    padding: 10px 14px; font-size: 12px; color: #ff6b6b; margin-bottom: 1rem; line-height: 1.5; }
  .success-msg { background: #0a1a0a; border: .5px solid #1a5a1a; border-radius: 8px;
    padding: 10px 14px; font-size: 12px; color: #6bff6b; margin-bottom: 1rem; line-height: 1.5; }

  .back-link { display: block; text-align: center; margin-top: 1.5rem; font-size: 12px;
    color: #444; cursor: pointer; transition: color .2s; }
  .back-link:hover { color: #C9A84C; }

  .terms { font-size: 11px; color: #444; text-align: center; margin-top: 1.2rem; line-height: 1.6; }
`

export default function AuthPage() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'login' ? 'login' : 'signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { signIn, signUp, signInWithGoogle, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { if (user) navigate('/dashboard') }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)

    if (mode === 'signup') {
      if (!fullName.trim()) { setError('Inserisci il tuo nome'); setLoading(false); return }
      if (password.length < 6) { setError('La password deve essere di almeno 6 caratteri'); setLoading(false); return }
      const { error } = await signUp(email, password, fullName)
      if (error) setError(error.message)
      else setSuccess('Registrazione completata! Controlla la tua email per confermare l\'account.')
    } else {
      const { error } = await signIn(email, password)
      if (error) setError('Email o password non corretti')
      else navigate('/dashboard')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError('Errore con Google: ' + error.message)
  }

  return (
    <>
      <style>{css}</style>
      <div className="auth-wrap">
        <div className="auth-card">

          <a className="auth-logo" onClick={() => navigate('/')}>
            <div className="auth-icon">✈️</div>
            <div className="auth-name">Travel <span>AI</span> Agent</div>
          </a>

          <div className="tabs">
            <button className={`tab ${mode==='signup'?'active':''}`} onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>
              Registrati
            </button>
            <button className={`tab ${mode==='login'?'active':''}`} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
              Accedi
            </button>
          </div>

          {error && <div className="error-msg">⚠️ {error}</div>}
          {success && <div className="success-msg">✅ {success}</div>}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="field">
                <label>Nome completo</label>
                <input type="text" placeholder="Mario Rossi" value={fullName}
                  onChange={e => setFullName(e.target.value)} required />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="mario@email.com" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder={mode==='signup'?'Minimo 6 caratteri':'La tua password'} value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>

            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? '⏳ Attendi...' : mode === 'signup' ? 'Crea il tuo account →' : 'Accedi →'}
            </button>
          </form>

          <div className="divider">
            <div className="divider-line" />
            <div className="divider-text">oppure</div>
            <div className="divider-line" />
          </div>

          <button className="btn-google" onClick={handleGoogle}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continua con Google
          </button>

          {mode === 'signup' && (
            <div className="terms">
              Registrandoti accetti i Termini di servizio.<br />
              I tuoi dati sono al sicuro e non vengono condivisi.
            </div>
          )}

          <div className="back-link" onClick={() => navigate('/')}>← Torna alla home</div>
        </div>
      </div>
    </>
  )
}

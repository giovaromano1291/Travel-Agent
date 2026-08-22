// src/lib/translations.js
// Dizionario delle traduzioni dell'interfaccia.
// Struttura scalabile: per aggiungere una lingua (es. 'fr'), aggiungi un blocco
// con le stesse chiavi. Le pagine usano t('chiave') e non vanno toccate.
//
// Le chiavi sono raggruppate per pagina tramite prefisso (auth., dash., land., planner.)
// per mantenere ordine con ~140 stringhe totali.

export const LANGUAGES = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  // Futuro: { code: 'fr', label: 'Français' }, { code: 'es', label: 'Español' }, { code: 'de', label: 'Deutsch' },
];

export const translations = {
  it: {
    /* ---- Comuni ---- */
    'common.appName': 'Travel AI Agent',
    'common.loading': 'Caricamento...',

    /* ---- AuthPage ---- */
    'auth.tab.signup': 'Registrati',
    'auth.tab.login': 'Accedi',
    'auth.title.signup': 'Crea il tuo account',
    'auth.title.login': 'Bentornato',
    'auth.sub.signup': 'Inizia a pianificare i tuoi viaggi',
    'auth.sub.login': 'Accedi per continuare',
    'auth.field.fullName': 'Nome completo',
    'auth.field.email': 'Email',
    'auth.field.password': 'Password',
    'auth.placeholder.fullName': 'Mario Rossi',
    'auth.placeholder.email': 'mario@email.com',
    'auth.placeholder.passwordSignup': 'Minimo 6 caratteri',
    'auth.placeholder.passwordLogin': 'La tua password',
    'auth.btn.wait': '⏳ Attendi...',
    'auth.btn.signup': 'Crea il tuo account →',
    'auth.btn.login': 'Accedi →',
    'auth.divider': 'oppure',
    'auth.btn.google': 'Continua con Google',
    'auth.terms': 'Registrandoti accetti i Termini di servizio. I tuoi dati sono al sicuro e non vengono condivisi.',
    'auth.backHome': '← Torna alla home',
    'auth.err.noName': 'Inserisci il tuo nome',
    'auth.err.shortPassword': 'La password deve essere di almeno 6 caratteri',
    'auth.err.badCredentials': 'Email o password non corretti',
    'auth.err.google': 'Errore con Google: ',
    'auth.success.signup': 'Registrazione completata! Controlla la tua email per confermare l\'account.',
    'auth.langLabel': 'Lingua',
  },

  en: {
    /* ---- Common ---- */
    'common.appName': 'Travel AI Agent',
    'common.loading': 'Loading...',

    /* ---- AuthPage ---- */
    'auth.tab.signup': 'Sign up',
    'auth.tab.login': 'Log in',
    'auth.title.signup': 'Create your account',
    'auth.title.login': 'Welcome back',
    'auth.sub.signup': 'Start planning your trips',
    'auth.sub.login': 'Log in to continue',
    'auth.field.fullName': 'Full name',
    'auth.field.email': 'Email',
    'auth.field.password': 'Password',
    'auth.placeholder.fullName': 'John Smith',
    'auth.placeholder.email': 'john@email.com',
    'auth.placeholder.passwordSignup': 'At least 6 characters',
    'auth.placeholder.passwordLogin': 'Your password',
    'auth.btn.wait': '⏳ Please wait...',
    'auth.btn.signup': 'Create your account →',
    'auth.btn.login': 'Log in →',
    'auth.divider': 'or',
    'auth.btn.google': 'Continue with Google',
    'auth.terms': 'By signing up you accept the Terms of Service. Your data is safe and never shared.',
    'auth.backHome': '← Back to home',
    'auth.err.noName': 'Please enter your name',
    'auth.err.shortPassword': 'Password must be at least 6 characters',
    'auth.err.badCredentials': 'Incorrect email or password',
    'auth.err.google': 'Google error: ',
    'auth.success.signup': 'Registration complete! Check your email to confirm your account.',
    'auth.langLabel': 'Language',
  },
};

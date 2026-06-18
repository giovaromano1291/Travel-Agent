# ✈️ Travel AI Agent — Guida all'installazione

Questa guida ti accompagna passo passo, senza bisogno di saper programmare.

---

## COSA HAI IN QUESTA CARTELLA

```
travel-app/
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx     ← Homepage pubblica
│   │   ├── AuthPage.jsx        ← Login e registrazione
│   │   ├── DashboardPage.jsx   ← Profilo utente e itinerari salvati
│   │   └── PlannerPage.jsx     ← Il cuore dell'app (il tuo artefatto)
│   ├── hooks/
│   │   └── useAuth.jsx         ← Gestione autenticazione
│   ├── lib/
│   │   └── supabase.js         ← Connessione al database
│   ├── App.jsx                 ← Router tra le pagine
│   └── main.jsx                ← Punto di ingresso
├── supabase_setup.sql          ← SQL per creare il database
├── .env.example                ← Template variabili d'ambiente
├── package.json
└── vite.config.js
```

---

## STEP 1 — Installa Node.js sul tuo computer

1. Vai su **https://nodejs.org**
2. Clicca sul pulsante verde grande (versione LTS)
3. Scarica e installa come un normale programma
4. Verifica: apri il Terminale (Mac) o il Prompt dei comandi (Windows) e scrivi:
   ```
   node --version
   ```
   Dovresti vedere qualcosa tipo: `v20.11.0`

---

## STEP 2 — Crea il tuo account Supabase (database gratis)

1. Vai su **https://supabase.com**
2. Clicca "Start your project" → registrati con GitHub o email
3. Clicca "New project"
4. Dai un nome al progetto (es. "travel-ai-agent")
5. Scegli una password per il database (salvala!)
6. Seleziona la region più vicina (es. "West EU - Ireland")
7. Clicca "Create new project" e aspetta 1-2 minuti

### Crea la tabella del database:
1. Nel tuo progetto Supabase, vai su **SQL Editor** (icona database a sinistra)
2. Clicca **New query**
3. Copia e incolla TUTTO il contenuto del file `supabase_setup.sql`
4. Clicca **Run** (il triangolo verde)
5. Dovresti vedere "Success. No rows returned"

### Recupera le credenziali:
1. Vai su **Settings** → **API**
2. Copia il valore di **Project URL** (es. https://abcxyz.supabase.co)
3. Copia il valore di **anon public** (la chiave lunga)
4. Tienili a portata di mano per lo Step 4

---

## STEP 3 — Ottieni la tua API key di Anthropic

1. Vai su **https://console.anthropic.com**
2. Registrati o accedi
3. Vai su **API Keys** → **Create Key**
4. Dai un nome alla chiave (es. "travel-app")
5. Copia la chiave (inizia con `sk-ant-...`)
6. ⚠️ Salvala subito — non puoi rivederla dopo!

---

## STEP 4 — Configura le variabili d'ambiente

1. Nella cartella `travel-app`, crea un file chiamato `.env.local`
   (puoi copiare `.env.example` e rinominarlo)
2. Apri `.env.local` con un editor di testo (es. Blocco Note su Windows)
3. Sostituisci i valori con i tuoi:

```
VITE_SUPABASE_URL=https://tuocodice.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...la tua chiave...
VITE_ANTHROPIC_KEY=sk-ant-...la tua chiave anthropic...
```

---

## STEP 5 — Avvia l'app in locale

Apri il Terminale nella cartella `travel-app` e scrivi questi comandi uno alla volta:

```bash
# Installa le dipendenze (solo la prima volta, ci vogliono 1-2 minuti)
npm install

# Avvia l'app in modalità sviluppo
npm run dev
```

Dovresti vedere qualcosa tipo:
```
  VITE v5.0.0  ready in 300ms
  ➜  Local:   http://localhost:5173/
```

Apri **http://localhost:5173** nel browser — l'app è pronta!

---

## STEP 6 — Pubblica online con Vercel (gratis)

### Prima volta: installa Git
Se non hai Git: **https://git-scm.com/downloads**

### Crea un repository su GitHub:
1. Vai su **https://github.com** e registrati/accedi
2. Clicca **New repository**
3. Nome: "travel-ai-agent"
4. Visibilità: **Private** (importante!)
5. Clicca "Create repository"
6. Segui le istruzioni per fare "push" della cartella

### Pubblica su Vercel:
1. Vai su **https://vercel.com** e accedi con GitHub
2. Clicca **Add New → Project**
3. Importa il repository "travel-ai-agent"
4. Nella sezione **Environment Variables**, aggiungi:
   - `VITE_SUPABASE_URL` → il tuo valore
   - `VITE_SUPABASE_ANON_KEY` → il tuo valore
   - `VITE_ANTHROPIC_KEY` → il tuo valore
5. Clicca **Deploy**
6. In 2-3 minuti ricevi il link pubblico (es. travel-ai-agent.vercel.app)

---

## STEP 7 — Abilita il login con Google (opzionale)

1. Su Supabase: **Authentication** → **Providers** → **Google**
2. Attiva Google e segui le istruzioni per ottenere Client ID e Secret
3. Vai su **https://console.cloud.google.com** → crea progetto → OAuth

---

## STRUTTURA DELLE PAGINE

| URL | Cosa fa |
|-----|---------|
| `/` | Landing page pubblica |
| `/auth` | Login e registrazione |
| `/dashboard` | Profilo + itinerari salvati |
| `/planner` | Il pianificatore AI |

---

## PROBLEMI COMUNI

**"npm: command not found"**
→ Node.js non è installato correttamente. Reinstalla da nodejs.org e riavvia il terminale.

**"Invalid API key"**
→ Controlla che le chiavi nel file .env.local siano corrette e senza spazi.

**La pagina si carica ma l'AI non risponde**
→ Verifica che VITE_ANTHROPIC_KEY sia corretta e che l'account Anthropic abbia credito.

**Login non funziona**
→ Controlla che VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY siano corrette.

---

## SUPPORTO

Per qualsiasi problema, porta questo file e descrivi l'errore a Claude.
Ogni messaggio di errore contiene tutte le informazioni necessarie per risolverlo.

// src/hooks/useLang.jsx
// Contenitore globale della lingua (gemello di useAuth).
// - Mantiene la lingua attiva per tutta l'app
// - La salva nel browser (localStorage) cosi sopravvive al ricaricamento
// - Espone t('chiave') per tradurre le stringhe dell'interfaccia
//
// Nota: il collegamento all'account (Supabase) sara aggiunto in un secondo momento;
// la logica di priorita (account -> browser -> default) vivra qui.

import { createContext, useContext, useState, useEffect } from 'react';
import { translations, LANGUAGES } from '../lib/translations';

const LangContext = createContext(null);

const DEFAULT_LANG = 'it';
const STORAGE_KEY = 'travelai_lang';

function getInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch (e) { /* localStorage non disponibile: ignora */ }
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);

  // Salva nel browser a ogni cambio
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignora */ }
  }, [lang]);

  const setLang = (code) => {
    if (translations[code]) setLangState(code);
  };

  // Funzione di traduzione: t('chiave') -> stringa nella lingua attiva.
  // Fallback: se manca la chiave nella lingua attiva prova in italiano, poi mostra la chiave.
  const t = (key) => {
    const dict = translations[lang] || translations[DEFAULT_LANG];
    if (dict && dict[key] != null) return dict[key];
    const fallback = translations[DEFAULT_LANG];
    if (fallback && fallback[key] != null) return fallback[key];
    return key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => {
  const ctx = useContext(LangContext);
  // Sicurezza: se per qualche motivo il provider non c'e, restituisco un fallback
  // che non rompe l'app (italiano, nessuna persistenza).
  if (!ctx) {
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      t: (key) => (translations[DEFAULT_LANG]?.[key] ?? key),
      languages: LANGUAGES,
    };
  }
  return ctx;
};

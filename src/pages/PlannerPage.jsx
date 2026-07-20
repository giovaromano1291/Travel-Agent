import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

/* ─── Design tokens ─────────────────────────────────────────────────────── */
const G   = '#C9A84C';
const GL  = '#e8c97a';
const DK  = '#0d0d0d';
const BRD = '#2a2a2a';
const CY  = 2026;

/* ─── Static data ───────────────────────────────────────────────────────── */
const MONTHS  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const SEASONS = ['Primavera','Estate','Autunno','Inverno'];
const TTYPES  = ['Solo','Coppia','Famiglia','Gruppo di amici','Gruppo con bambini','Viaggio di nozze'];
const DURS    = ['Weekend (2-3 giorni)','3-4 giorni','1 settimana','10 giorni','2 settimane','3+ settimane'];
const STYLES  = ['Cultura & Storia','Relax & Natura','Avventura & Sport','Gastronomia','Benessere & Spa','Enogastronomia','Mix equilibrato'];
const CAGES   = ['< 1 anno','1 anno','2 anni','3 anni','4 anni','5 anni','6-8 anni','9-12 anni','13-17 anni'];
const LANGS   = ['Italiano','Inglese','Francese','Spagnolo','Tedesco','Arabo','Altra lingua'];
const STEPS   = ['Destinazione','Periodo','Viaggiatori','Durata','Tipologia','Budget','Partenza','Anteprima','Conferma','Alloggi','Bozza','Guide','Ristorazione','Formato','Itinerario'];
const BUDGETS = [
  { k: 'economico', l: 'Economico', d: 'Ostelli, low-cost, street food' },
  { k: 'medio',     l: 'Medio',     d: 'Hotel 3-4 stelle, voli diretti' },
  { k: 'luxury',    l: 'Luxury',    d: 'Hotel 5 stelle, business class' },
];
const FMTS = [
  { k: 'mps',    l: 'Mattina / Pomeriggio / Sera', d: 'Tre blocchi giornalieri' },
  { k: 'orario', l: 'Per fasce orarie',            d: '9:00, 13:00, 15:00, 20:00' },
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function detectYear(p) {
  const m = { gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12 };
  const n = m[String(p || '').toLowerCase()];
  return n ? (n >= new Date().getMonth() + 1 ? CY : CY + 1) : CY;
}

function imgUrl(q, w = 700, h = 260) {
  return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(q)}&sig=${Math.random().toString(36).slice(2, 6)}`;
}

function starsStr(n) {
  return '★'.repeat(Math.min(n || 3, 5));
}

function parseDurationToNights(d) {
  if (!d) return null;
  const exact = d.match(/\((\d+)\s*giorni esatti\)/);
  if (exact) return parseInt(exact[1]);
  const s = d.toLowerCase();
  if (s.includes('weekend')) return 2;
  if (s.includes('3-4'))     return 4;
  if (s.includes('2 settimane')) return 14;
  if (s.includes('settimana'))   return 7;
  if (s.includes('10'))  return 10;
  if (s.includes('3+'))  return 21;
  const num = s.match(/(\d+)/);
  return num ? parseInt(num[1]) : null;
}

function mdHtml(t) {
  t = t.replace(/\r/g, '');
  t = t.replace(/^# .+$/gm, '');
  const MPS = ['Mattina','MATTINA','Pomeriggio','POMERIGGIO','Sera','SERA'];
  const lns = t.split('\n');
  const out = [];
  for (let i = 0; i < lns.length; i++) {
    const ln = lns[i];
    let found = false;
    for (const tag of MPS) {
      if (ln.length > tag.length && ln.slice(-tag.length) === tag && ln.slice(-tag.length - 1, -tag.length) === ' ') {
        const before = ln.slice(0, ln.length - tag.length - 1).trim();
        if (before.length > 0) { out.push(before); out.push(''); out.push(tag.toUpperCase()); found = true; break; }
      }
    }
    if (!found) {
      const tr = ln.trim();
      out.push(tr === 'Mattina' || tr === 'Pomeriggio' || tr === 'Sera' ? tr.toUpperCase() : ln);
    }
  }
  t = out.join('\n');
  t = t.replace(/\.[ \t]+-[ \t]+/g, '.\n- ');
  t = t.replace(/([.!?])\s+(Trasporti|Pagamenti|App utili|Prenotazioni|Budget|App|Visto|Valigia):/g, '$1\n- $2:');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t
    .replace(/\*\*(.*?)\*\*/g, `<strong style='color:${GL};font-weight:500'>$1</strong>`)
    .replace(/\*([^*\n]+?)\*/g, `<em style='color:#bbb;font-style:italic'>$1</em>`)
    .replace(/^([A-Z][A-ZÀÈÉÌÒÙ\s&'"-]+:[^\n]+\[(?:QUARTIERE|CIT))/gm, '### $1')
    .replace(/^### (.+)$/gm, `<div style='display:flex;align-items:center;gap:10px;margin:1.6rem 0 0.8rem;padding:10px 14px;background:linear-gradient(90deg,#1a1400,transparent);border-left:3px solid ${G};border-radius:0 8px 8px 0'><span style='font-family:Cormorant Garamond,serif;font-size:16px;font-weight:600;color:${GL}'>$1</span></div>`)
    .replace(/^## (.+)$/gm, `<div style='font-size:11px;letter-spacing:2px;color:${G};text-transform:uppercase;margin:1.4rem 0 0.6rem;border-top:0.5px solid #2a2a2a;padding-top:1rem;font-weight:600'>$1</div>`)
    .replace(/^(Giorno \d+(?:(?!MATTINA|POMERIGGIO|SERA).)+)$/gm, `<div style='color:${GL};font-weight:700;margin-top:1.8rem;font-size:15px;border-top:0.5px solid #2a2a2a;padding-top:1.2rem;display:block'>$1</div>`)
    .replace(/^MATTINA$/gm,    `<div style='display:block;clear:both;color:${G};font-size:12px;font-weight:600;letter-spacing:1px;margin:1rem 0 0.5rem'><span style='padding:5px 12px;background:#1a1400;border-radius:6px;display:inline-block'>Mattina</span></div>`)
    .replace(/^POMERIGGIO$/gm, `<div style='display:block;clear:both;color:${G};font-size:12px;font-weight:600;letter-spacing:1px;margin:1.2rem 0 0.5rem'><span style='padding:5px 12px;background:#1a1400;border-radius:6px;display:inline-block'>Pomeriggio</span></div>`)
    .replace(/^SERA$/gm,       `<div style='display:block;clear:both;color:${G};font-size:12px;font-weight:600;letter-spacing:1px;margin:1.2rem 0 0.5rem'><span style='padding:5px 12px;background:#1a1400;border-radius:6px;display:inline-block'>Sera</span></div>`)
    .replace(/^---$/gm, `<div style='height:1px;background:#2a2a2a;margin:1.4rem 0'></div>`)
    .replace(/^LINK\s+(.+)$/gm, (_, rest) => {
      const m = rest.match(/https?:\/\/[^\s)]+/);
      const url = m ? m[0] : '';
      if (!url) return `<div style='margin:0.3rem 0 0.3rem 1rem;color:#6ab0ff;font-size:12px'>Prenota: ${rest}</div>`;
      return `<div style='margin:0.3rem 0 0.3rem 1rem;font-size:12px'><a href='${url}' target='_blank' rel='noopener noreferrer' style='color:#6ab0ff;text-decoration:none'>🔗 Prenota / Apri link</a></div>`;
    })
    .replace(/^[*-] (.+)$/gm, (_, p1) => {
      const lb = p1.replace(/^([A-Za-z\u00c0-\u00ff\s]+:)\s*/, `<strong style='color:${GL};font-weight:600'>$1</strong> `);
      return `<div style='display:flex;align-items:flex-start;gap:8px;margin:0.35rem 0;color:#ccc;font-size:13px;line-height:1.6'><span style='color:${G};flex-shrink:0'>◆</span><span>${lb}</span></div>`;
    });
}

/* ─── Mobile detection (iOS / Android / iPadOS 13+) ────────────────────── */
function isMobile() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  if (/iPad/i.test(ua)) return true;
  // iPadOS 13+ si identifica come "MacIntel" con supporto touch
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

/* Estrae il testo dagli eventi SSE "data: {...}" (usato dal fallback mobile) */
function parseSSEText(raw) {
  let full = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const jj = JSON.parse(line.slice(6));
        if (jj.delta?.text) full += jj.delta.text;
      } catch {}
    }
  }
  return full;
}

async function callAI(userMsg, maxTok = 1000, onChunk) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTok,
        stream: true,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });
    if (!res.ok) return '';

    // Fallback per Safari iOS / browser mobile che non supportano res.body.getReader()
    const canStream = res.body && typeof res.body.getReader === 'function';
    if (!canStream || isMobile()) {
      const raw = await res.text();
      const full = parseSSEText(raw);
      if (onChunk) onChunk(full);
      return full;
    }

    const reader = res.body.getReader();
    const dc = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dc.decode(value).split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const jj = JSON.parse(line.slice(6));
            if (jj.delta?.text) { full += jj.delta.text; if (onChunk) onChunk(full); }
          } catch {}
        }
      }
    }
    return full;
  } catch { return ''; }
}

/* ─── Distance helper (Haversine) ──────────────────────────────────────── */
const COORDS = {
  // Italia
  roma:[41.9,12.5],milan:[45.5,9.2],milano:[45.5,9.2],napoli:[40.8,14.3],
  firenze:[43.8,11.2],venezia:[45.4,12.3],torino:[45.1,7.7],bologna:[44.5,11.3],
  genova:[44.4,8.9],palermo:[38.1,13.4],bari:[41.1,16.9],catania:[37.5,15.1],
  verona:[45.4,11.0],trieste:[45.7,13.8],parma:[44.8,10.3],modena:[44.6,10.9],
  padova:[45.4,11.9],bergamo:[45.7,9.7],brescia:[45.5,10.2],lecce:[40.4,18.2],
  trento:[46.1,11.1],perugia:[43.1,12.4],cagliari:[39.2,9.1],reggio:[38.1,15.7],
  // Europa
  paris:[48.9,2.3],parigi:[48.9,2.3],londra:[51.5,-0.1],london:[51.5,-0.1],
  berlin:[52.5,13.4],berlino:[52.5,13.4],madrid:[40.4,-3.7],barcellona:[41.4,2.2],
  barcelona:[41.4,2.2],amsterdam:[52.4,4.9],vienna:[48.2,16.4],praga:[50.1,14.4],
  budapest:[47.5,19.1],bruxelles:[50.8,4.4],zurigo:[47.4,8.5],ginevra:[46.2,6.1],
  monaco:[48.1,11.6],munich:[48.1,11.6],francoforte:[50.1,8.7],lisbona:[38.7,-9.1],
  atene:[37.9,23.7],istanbul:[41.0,29.0],varsavia:[52.2,21.0],stoccolma:[59.3,18.1],
  oslo:[59.9,10.7],copenaghen:[55.7,12.6],helsinki:[60.2,25.0],dublino:[53.3,-6.3],
  edimburgo:[55.9,-3.2],lione:[45.7,4.8],marsiglia:[43.3,5.4],nizza:[43.7,7.3],
  siviglia:[37.4,-6.0],valencia:[39.5,-0.4],porto:[41.1,-8.6],cracovia:[50.1,20.0],
  bucarest:[44.4,26.1],sofia:[42.7,23.3],belgrado:[44.8,20.5],zagabria:[45.8,16.0],
  // Medio Oriente e Africa
  cairo:[30.0,31.2],dubai:[25.2,55.3],nairobi:[-1.3,36.8],kenya:[-0.0,37.9],
  doha:[25.3,51.5],abudhabi:[24.5,54.4],marrakech:[31.6,-8.0],casablanca:[33.6,-7.6],
  johannesburg:[-26.2,28.0],capetown:[-33.9,18.4],'capetown':[-33.9,18.4],
  // Asia
  tokyo:[35.7,139.7],osaka:[34.7,135.5],bangkok:[13.8,100.5],singapore:[1.3,103.8],
  pechino:[39.9,116.4],shanghai:[31.2,121.5],hongkong:[22.3,114.2],
  seoul:[37.6,127.0],delhi:[28.6,77.2],mumbai:[19.1,72.9],bali:[-8.4,115.2],
  // America del Nord - USA
  newyork:[40.7,-74.0],newyorkcity:[40.7,-74.0],nyc:[40.7,-74.0],
  losangeles:[34.1,-118.2],chicago:[41.9,-87.6],miami:[25.8,-80.2],
  florida:[27.7,-82.6],orlando:[28.5,-81.4],miamibeach:[25.8,-80.1],
  keywest:[24.6,-81.8],lasvegas:[36.2,-115.2],sanfrancisco:[37.8,-122.4],
  boston:[42.4,-71.1],seattle:[47.6,-122.3],houston:[29.8,-95.4],dallas:[32.8,-96.8],
  atlanta:[33.7,-84.4],nashville:[36.2,-86.8],denver:[39.7,-104.9],phoenix:[33.4,-112.1],
  hawaii:[21.3,-157.8],alaska:[64.2,-153.4],
  // America del Nord - Canada/Messico
  toronto:[43.7,-79.4],vancouver:[49.3,-123.1],montreal:[45.5,-73.6],
  cancun:[21.2,-86.9],messico:[23.6,-102.6],mexico:[23.6,-102.6],mexicocity:[19.4,-99.1],
  // America del Sud
  brasile:[-14.2,-51.9],brasil:[-14.2,-51.9],riodejaneiro:[-22.9,-43.2],
  buenosaires:[-34.6,-58.4],lima:[-12.0,-77.0],bogota:[4.7,-74.1],
  santiago:[-33.5,-70.6],
  // Oceania
  sydney:[-33.9,151.2],melbourne:[-37.8,145.0],auckland:[-36.9,174.8],
  // Isole e destinazioni tropicali
  cuba:[21.5,-79.5],giamaica:[18.1,-77.3],maldive:[3.2,73.2],
  mauritius:[-20.3,57.6],seychelles:[-4.7,55.5],
};

function getCoords(place) {
  const p = (place || '').toLowerCase().trim().replace(/[^a-zà-ÿ\s]/g, '').trim();
  if (COORDS[p]) return COORDS[p];
  for (const k in COORDS) { if (p.includes(k) || k.includes(p)) return COORDS[k]; }
  return null;
}

function haversine([lat1,lon1],[lat2,lon2]) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* ─── Ottimizzazione geografica "a goccia" (viaggio in auto) ───────────── */
function isCarTransport(transport) {
  const t = (transport || '').toLowerCase();
  return t.includes('auto') || t.includes('noleggio');
}

/* Testo da iniettare nei prompt AI quando il viaggio è in auto:
   percorso ottimizzato "a goccia" — prima le mete più lontane dalla partenza,
   poi progressivamente quelle sulla via del ritorno. */
function dropRouteHint(departure, dest, transport) {
  if (!isCarTransport(transport)) return '';
  return (
    `\n\nOTTIMIZZAZIONE GEOGRAFICA (viaggio in ${transport} da ${departure}):\n` +
    `L'utente viaggia in auto e torna al punto di partenza. Ordina le tappe con la logica del "percorso a goccia":\n` +
    `1. Raggiungi PRIMA la meta più LONTANA da ${departure}.\n` +
    `2. Prosegui verso le tappe intermedie lungo il percorso di ritorno.\n` +
    `3. Le ultime tappe devono essere quelle più VICINE a ${departure}.\n` +
    `Esempio: partenza Roma, Umbria → Spoleto (più lontano) → Assisi → Perugia → Orvieto (già verso Roma).\n` +
    `Applica questa logica geografica all'ordine delle tappe.`
  );
}

/* ─── Inline CSS (scoped to the planner) ───────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500&display=swap');
.planner-wrap *{box-sizing:border-box;margin:0;padding:0}
.planner-wrap{background:#0d0d0d;min-height:100vh;font-family:'Inter',sans-serif;color:#e8e8e8;display:flex;flex-direction:column;align-items:center;padding:2rem 1rem 3rem}
.p-logo{display:flex;align-items:center;gap:14px;margin-bottom:6px}
.p-li{width:48px;height:48px;background:#C9A84C;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px}
.p-lt{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:500;letter-spacing:1px}
.p-lt span{color:#C9A84C}
.p-sub{font-size:11px;letter-spacing:3px;color:#888;margin-bottom:1.5rem;text-align:center}
.p-dl{width:100%;max-width:800px;height:.5px;background:#2a2a2a;margin-bottom:1.5rem}
.p-back{display:flex;align-items:center;gap:6px;background:transparent;border:none;color:#777;font-size:12px;cursor:pointer;margin-bottom:.8rem;padding:4px 0;font-family:'Inter',sans-serif;transition:color .2s;width:100%;max-width:720px}
.p-back:hover{color:#C9A84C}
.p-prog{display:flex;align-items:center;justify-content:center;margin-bottom:2rem;width:100%;max-width:920px;overflow-x:auto;padding:.5rem 0 .8rem;scrollbar-width:none}
.p-prog::-webkit-scrollbar{display:none}
.p-sn{display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0}
.p-sc{width:28px;height:28px;border-radius:50%;border:1.5px solid #2a2a2a;display:flex;align-items:center;justify-content:center;font-size:10px;color:#888;transition:all .3s;flex-shrink:0}
.p-sc.act{border-color:#C9A84C;background:#C9A84C;color:#0d0d0d;font-weight:700}
.p-sc.dn{border-color:#C9A84C;color:#C9A84C}
.p-sl{font-size:8px;color:#555;text-align:center;max-width:54px}
.p-sl.act{color:#C9A84C}
.p-cn{height:1px;background:#2a2a2a;width:12px;flex-shrink:0;margin-bottom:16px}
.p-cn.dn{background:#C9A84C}
.p-card{background:#161616;border:.5px solid #2a2a2a;border-radius:16px;padding:2rem 1.8rem;width:100%;max-width:640px}
.p-tt{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:500;color:#e8c97a;margin-bottom:.4rem}
.p-ht{font-size:13px;color:#777;margin-bottom:1.3rem;line-height:1.6}
.p-ir{display:flex;gap:10px;align-items:center}
.p-inp{flex:1;background:#111;border:.5px solid #333;border-radius:10px;padding:12px 16px;font-size:15px;color:#e8e8e8;font-family:'Inter',sans-serif;outline:none;transition:border .2s}
.p-inp:focus{border-color:#C9A84C}
.p-inp::placeholder{color:#555}
.p-inp[type="date"]{color-scheme:dark;width:100%}
.p-ta{width:100%;background:#111;border:.5px solid #333;border-radius:10px;padding:12px 16px;font-size:13px;color:#e8e8e8;font-family:'Inter',sans-serif;outline:none;resize:vertical;min-height:80px;line-height:1.6}
.p-ta:focus{border-color:#C9A84C}
.p-ta::placeholder{color:#555}
.p-go{background:#C9A84C;color:#0d0d0d;border:none;border-radius:10px;width:42px;height:42px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700}
.p-go:hover{background:#e8c97a}
.p-chips{display:flex;flex-wrap:wrap;gap:10px}
.p-chip{background:#111;border:.5px solid #333;border-radius:20px;padding:9px 16px;font-size:13px;color:#ccc;cursor:pointer;transition:all .2s}
.p-chip:hover,.p-chip.sel{border-color:#C9A84C;color:#C9A84C}
.p-sep{border-top:.5px solid #2a2a2a;padding-top:1.1rem;margin-top:1.1rem}
.p-slbl{font-size:12px;color:#666;margin-bottom:7px}
.p-nr{display:flex;align-items:center;gap:12px;margin-bottom:.8rem}
.p-nb{width:32px;height:32px;border-radius:50%;background:#111;border:.5px solid #333;color:#e8e8e8;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.p-nb:hover{border-color:#C9A84C;color:#C9A84C}
.p-nv{font-size:18px;font-weight:500;color:#e8c97a;min-width:22px;text-align:center}
.p-ar{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px}
.p-alb{font-size:12px;color:#aaa;flex-shrink:0;width:74px;padding-top:5px}
.p-acs{display:flex;flex-wrap:wrap;gap:5px}
.p-ac{background:#111;border:.5px solid #333;border-radius:14px;padding:4px 10px;font-size:11px;color:#ccc;cursor:pointer;transition:all .2s}
.p-ac:hover,.p-ac.sel{border-color:#C9A84C;color:#C9A84C}
.p-bc{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.p-bci{background:#111;border:.5px solid #333;border-radius:12px;padding:1.2rem 1rem;cursor:pointer;transition:all .2s;text-align:center}
.p-bci:hover,.p-bci.sel{border-color:#C9A84C;background:#1a1400}
.p-aib{background:#111;border:.5px solid #2a2a2a;border-radius:10px;padding:14px 16px;font-size:13px;color:#ccc;line-height:1.8;margin-bottom:1.2rem;min-height:48px}
.p-hcard{background:#111;border:.5px solid #333;border-radius:12px;padding:1.2rem 1.4rem;cursor:pointer;transition:all .2s;margin-bottom:12px}
.p-hcard:hover,.p-hcard.sel{border-color:#C9A84C;background:#1a1400}
.p-dot{width:6px;height:6px;border-radius:50%;background:#C9A84C;animation:p-pulse 1.2s infinite;flex-shrink:0}
.p-dot:nth-child(2){animation-delay:.2s}.p-dot:nth-child(3){animation-delay:.4s}
@keyframes p-pulse{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
.p-cur{display:inline-block;width:2px;height:14px;background:#C9A84C;animation:p-blink 1s infinite;vertical-align:middle;margin-left:2px}
@keyframes p-blink{0%,100%{opacity:1}50%{opacity:0}}
.p-btn{width:100%;border-radius:10px;height:44px;font-size:14px;font-family:'Inter',sans-serif;border:none;cursor:pointer;transition:all .2s;font-weight:500}
.p-btng{background:#C9A84C;color:#0d0d0d}.p-btng:hover{background:#e8c97a}
.p-btno{background:transparent;color:#888;border:.5px solid #2a2a2a}.p-btno:hover{border-color:#C9A84C;color:#C9A84C}
.p-brow{display:flex;gap:10px;margin-top:1.2rem}
.p-fc{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.p-fcard{background:#111;border:.5px solid #333;border-radius:12px;padding:1.4rem 1rem;cursor:pointer;transition:all .2s;text-align:center}
.p-fcard:hover,.p-fcard.sel{border-color:#C9A84C;background:#1a1400}
.p-rbox{background:#161616;border:.5px solid #2a2a2a;border-radius:16px;width:100%;max-width:780px;overflow:hidden}
.p-rhero{width:100%;height:200px;object-fit:cover;display:block}
.p-rhead{padding:1.5rem 1.8rem 1rem}
.p-rdest{font-family:'Cormorant Garamond',serif;font-size:28px;color:#e8c97a}
.p-rmeta{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.p-mtag{background:#111;border:.5px solid #2a2a2a;border-radius:20px;padding:4px 12px;color:#aaa;font-size:11px}
.p-rbody{padding:0 1.8rem 1.8rem}
.p-rtxt{font-size:13.5px;line-height:1.9;color:#d0d0d0;white-space:pre-wrap}
.p-stit{font-size:11px;letter-spacing:2px;color:#C9A84C;text-transform:uppercase;margin:1.5rem 0 .8rem;border-top:.5px solid #2a2a2a;padding-top:1.2rem;font-weight:600}
.p-lgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.p-lcard{background:#111;border:.5px solid #333;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;text-decoration:none;transition:all .2s}
.p-lcard:hover{border-color:#C9A84C}
.p-igrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:.8rem}
.p-igrid img{width:100%;height:90px;object-fit:cover;border-radius:8px;display:block}
.p-badge{display:inline-flex;align-items:center;gap:6px;background:#1a1400;border:.5px solid #C9A84C;border-radius:20px;padding:5px 14px;font-size:12px;color:#e8c97a;margin-bottom:1rem}
.p-yn{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:.5rem}
.p-ync{background:#111;border:.5px solid #333;border-radius:12px;padding:1.4rem 1rem;cursor:pointer;transition:all .2s;text-align:center}
.p-ync:hover{border-color:#C9A84C;background:#1a1400}
.p-dpick{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.p-save-bar{background:#1a1400;border:.5px solid #C9A84C;border-radius:10px;padding:10px 16px;font-size:12px;color:#e8c97a;margin-top:1rem;display:flex;align-items:center;gap:8px}
/* ─── Mobile (iOS / Android) ─── */
.planner-wrap input,.planner-wrap textarea,.planner-wrap select{font-size:16px}
.planner-wrap *{-webkit-tap-highlight-color:transparent}
.p-prog{-webkit-overflow-scrolling:touch}
@media (max-width:600px){
  .planner-wrap{padding:1.2rem .8rem 3rem}
  .p-card{padding:1.4rem 1.2rem}
  .p-bc{grid-template-columns:1fr}
  .p-fc,.p-yn,.p-dpick,.p-lgrid{grid-template-columns:1fr}
  .p-igrid{grid-template-columns:1fr 1fr}
  .p-brow{flex-direction:column}
  .p-rbody,.p-rhead{padding-left:1.1rem;padding-right:1.1rem}
  .p-sl{font-size:7px;max-width:44px}
  .p-sc{width:24px;height:24px}
}
`;

/* ─── Sub-components ────────────────────────────────────────────────────── */
function Dots({ text }) {
  return (
    <div style={{ display:'flex', gap:8, alignItems:'center', padding:'.8rem 0' }}>
      <div className="p-dot"/><div className="p-dot"/><div className="p-dot"/>
      <span style={{ color:G, fontSize:13 }}>{text}</span>
    </div>
  );
}

function ABox({ text, loading, lt, style: extraStyle }) {
  return (
    <div className="p-aib" style={extraStyle}>
      {loading && !text
        ? <Dots text={lt || 'Elaboro...'} />
        : <div dangerouslySetInnerHTML={{ __html: mdHtml(text || '') + (loading ? "<span class='p-cur'></span>" : '') }} />
      }
    </div>
  );
}

function Chip({ label, sel, onClick }) {
  return <div className={`p-chip${sel ? ' sel' : ''}`} onClick={onClick}>{label}</div>;
}

function Btn({ label, ghost, style: extraStyle, onClick, disabled }) {
  return (
    <button
      className={`p-btn ${ghost ? 'p-btno' : 'p-btng'}`}
      style={extraStyle}
      onClick={onClick}
      disabled={!!disabled}
    >{label}</button>
  );
}

function YN({ icon, title, sub, onClick }) {
  return (
    <div className="p-ync" onClick={onClick}>
      <div style={{ fontSize:26, marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:14, color:GL, fontWeight:500, marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:11, color:'#666' }}>{sub}</div>
    </div>
  );
}

function Badge({ text }) {
  return <div className="p-badge">{text}</div>;
}

/* ─── HCard — top-level component (must be outside PlannerPage) ─────────── */
function HCard({ h, bi, city: cityName, budget, selKeys, setSelKeys, selNames, setSelNames }) {
  const nm = h.name || 'Hotel';
  const st = h.stars || 3;
  const zn = h.zone || h.zona || 'centro';
  const pr = h.price || h.prezzo || '';
  const wh = h.why || h.perche || '';
  const ps = h.pros || [];
  const bs = h.best || false;
  const ur = h.url || `https://www.booking.com/search.html?ss=${encodeURIComponent(cityName)}`;
  const sk = `${bi}-${nm}`;
  const isSel = selKeys.includes(sk);
  function select() {
    const ck = [...selKeys], cn = [...selNames];
    const ex = ck.findIndex(k => k.startsWith(`${bi}-`));
    if (ex >= 0) { ck[ex] = sk; cn[ex] = `${cityName}: ${nm}`; }
    else { ck.push(sk); cn.push(`${cityName}: ${nm}`); }
    setSelKeys(ck); setSelNames(cn);
  }
  return (
    <div className={`p-hcard${isSel ? ' sel' : ''}`} onClick={select}>
      {bs && <div style={{ display:'inline-block', background:'#1a1400', border:`.5px solid ${G}`, borderRadius:10, padding:'2px 10px', fontSize:10, color:G, marginBottom:6 }}>★ Miglior rapporto qualità/prezzo</div>}
      <div style={{ fontSize:15, color:GL, fontWeight:500, marginBottom:4 }}>{nm} {starsStr(st)}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:6 }}>
        {[zn, pr, budget].filter(Boolean).map(tag => (
          <span key={tag} style={{ background:'#1a1a1a', border:'.5px solid #333', borderRadius:12, padding:'3px 10px', fontSize:11, color:'#aaa' }}>{tag}</span>
        ))}
      </div>
      {wh && <div style={{ fontSize:12, color:'#bbb', marginBottom:6 }}>{wh}</div>}
      {ps.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:6 }}>
          {ps.map((pf, pi) => <span key={pi} style={{ background:'#1a1a1a', border:'.5px solid #333', borderRadius:10, padding:'3px 9px', fontSize:11, color:'#bbb' }}>✓ {pf}</span>)}
        </div>
      )}
      <a href={ur} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'#6ab0ff', textDecoration:'none' }} onClick={e => e.stopPropagation()}>🔗 Prenota su Booking.com</a>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
export default function PlannerPage() {
  const { user } = useAuth();

  /* ── step & destination ── */
  const [step, setStep]         = useState(1);
  const [dest, setDest]         = useState('');
  const [period, setPeriod]     = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]   = useState('');
  const [tripYear, setTripYear] = useState(CY);
  const [travType, setTravType] = useState('');
  const [adults, setAdults]     = useState(2);
  const [children, setChildren] = useState(0);
  const [childAges, setChildAges] = useState([]);
  const [duration, setDuration] = useState('');
  const [style, setStyle]       = useState('');
  const [budget, setBudget]     = useState('');
  const [departure, setDeparture] = useState('');
  const [fmt, setFmt]           = useState('mps');
  const [mods, setMods]         = useState('');
  const [wantsFood, setWantsFood] = useState(null);
  const [inp, setInp]           = useState('');

  /* ── transport ── */
  const [transport, setTransport]   = useState(null);
  const [distClose, setDistClose]   = useState(null);

  /* ── AI text ── */
  const [aiPer, setAiPer]         = useState(''); const [aiPerLoad, setAiPerLoad] = useState(false);
  const [planText, setPlanText]   = useState(''); const [planLoad, setPlanLoad]   = useState(false);
  const [revText, setRevText]     = useState(''); const [revLoad, setRevLoad]     = useState(false);
  const [draftText, setDraftText] = useState(''); const [draftLoad, setDraftLoad] = useState(false);
  const [foodText, setFoodText]   = useState(''); const [foodLoad, setFoodLoad]   = useState(false);
  const [finText, setFinText]     = useState(''); const [finLoad, setFinLoad]     = useState(false);

  /* ── hotels ── */
  const [hotelBases, setHotelBases]         = useState([]);
  const [hotelLoad, setHotelLoad]           = useState(false);
  const [selKeys, setSelKeys]               = useState([]);
  const [selNames, setSelNames]             = useState([]);
  const [selStr, setSelStr]                 = useState('');
  const [custH, setCustH]                   = useState('');
  const [showCust, setShowCust]             = useState(false);
  const [exclHotels, setExclHotels]         = useState([]);
  const [hotelNotes, setHotelNotes]         = useState('');
  const [showHotelNotes, setShowHotelNotes] = useState(false);

  /* ── guide ── */
  const [guide, setGuide]             = useState(null);
  const [guideDays, setGuideDays]     = useState('Tutto il viaggio');
  const [guideLang, setGuideLang]     = useState('Italiano');
  const [guideCustom, setGuideCustom] = useState('');

  /* ── media ── */
  const [dImg, setDImg] = useState(''); const [gal, setGal] = useState([]);

  /* ── save state ── */
  const [saveStatus, setSaveStatus] = useState('');

  const finRef  = useRef(null);
  const draftRef = useRef(null);
  const finLoadRef   = useRef(false);
  const draftLoadRef = useRef(false);

  useEffect(() => {
    if (finLoad) finLoadRef.current = true;
    if (!finLoad && finLoadRef.current) { finLoadRef.current = false; if (finRef.current) finRef.current.scrollTop = 0; }
  }, [finLoad]);

  useEffect(() => {
    if (draftLoad) draftLoadRef.current = true;
    if (!draftLoad && draftLoadRef.current) { draftLoadRef.current = false; if (draftRef.current) draftRef.current.scrollTop = 0; }
  }, [draftLoad]);

  /* ── helpers ── */
  function trav() {
    const b = `${adults} adult${adults > 1 ? 'i' : 'o'}`;
    const k = children > 0 ? `, ${children} bambin${children > 1 ? 'i' : 'o'} (eta: ${childAges.filter(Boolean).join(', ')})` : '';
    return `${b}${k} - ${travType}`;
  }

  function goBack() {
    if (step <= 1) return;
    const target = step - 1;
    // Tornando allo step 12 (Guide) resetto la scelta a null: cosi ricompaiono
    // i pulsanti Si/No e l'utente puo ri-scegliere e riavanzare.
    if (target === 12) setGuide(null);
    setStep(target);
  }

  /* ── save to Supabase ── */
  async function saveItinerary() {
    if (!user) { setSaveStatus('Accedi per salvare'); return; }
    setSaveStatus('Salvataggio...');
    const { error } = await supabase.from('itineraries').insert({
      user_id:        user.id,
      destination:    dest,
      period,
      trip_year:      tripYear,
      duration,
      style,
      budget,
      departure,
      trav_type:      travType,
      adults,
      children,
      hotels:         selStr,
      itinerary_text: finText,
      food_text:      foodText,
    });
    setSaveStatus(error ? '❌ Errore nel salvataggio' : '✅ Itinerario salvato!');
    setTimeout(() => setSaveStatus(''), 4000);
  }

  /* ── distance check ── */
  const NEAR_DESTINATIONS = [
    "italia","italy","sicilia","sardegna","puglia","toscana","lombardia","veneto",
    "piemonte","liguria","campania","calabria","basilicata","abruzzo","molise",
    "umbria","marche","lazio","friuli","trentino","valdaosta","emilia","romagna",
    "francia","france","spagna","spain","portogallo","portugal","germania","germany",
    "austria","svizzera","switzerland","belgio","belgium","olanda","netherlands",
    "paesi bassi","lussemburgo","luxembourg","liechtenstein",
    "slovenia","croazia","croatia","bosnia","serbia","montenegro","albania","kosovo",
    "macedonia","grecia","greece","bulgaria","romania","ungheria","hungary",
    "slovacchia","czechia","cechia","polonia","poland",
    "danimarca","denmark","svezia","sweden","norvegia","norway","finlandia","finland",
    "estonia","lettonia","lituania","irlanda","ireland","galles","scozia","inghilterra",
    "regno unito","uk","gran bretagna",
    "parigi","paris","londra","london","berlino","berlin","madrid","barcellona",
    "barcelona","amsterdam","vienna","praga","budapest","bruxelles","zurigo",
    "ginevra","monaco","francoforte","lisbona","atene","varsavia","stoccolma",
    "oslo","copenaghen","helsinki","dublino","edimburgo","lione","marsiglia",
    "nizza","siviglia","valencia","porto","cracovia","bucarest","sofia","belgrado",
    "zagabria","lubiana","sarajevo","tirana","riga","vilnius","tallinn",
    "istanbul","turchia","turkey","tunisia","marocco","morocco","egitto",
  ];
  function checkDistance(dep, dst) {
    const dstLower = (dst || '').toLowerCase().trim();
    const isNear = NEAR_DESTINATIONS.some(place =>
      dstLower.includes(place) || place.includes(dstLower)
    );
    if (isNear) {
      const c1 = getCoords(dep), c2 = getCoords(dst);
      setDistClose(c1 && c2 ? haversine(c1, c2) < 1200 : true);
    } else {
      setDistClose(false);
    }
  }

  /* ── AI flows ── */
  async function onDest() {
    if (!inp.trim()) return;
    const d = inp.trim(); setDest(d); setInp(''); setAiPerLoad(true); setStep(2);
    await callAI(
      `In 3-4 righe in italiano, i periodi migliori per visitare ${d} nel ${CY} o ${CY+1} (clima, eventi, affluenza). Usa bullet -.`,
      600, t => setAiPer(t)
    );
    setAiPerLoad(false);
  }

  function confirmDates() {
    if (!startDate || !endDate) return;
    const d1 = new Date(startDate), d2 = new Date(endDate);
    const diffDays = Math.round((d2 - d1) / 86400000);
    const monthName = MONTHS[d1.getMonth()];
    setPeriod(monthName);
    setTripYear(d1.getFullYear());
    let durLabel = '3+ settimane';
    if (diffDays <= 4)  durLabel = '3-4 giorni';
    else if (diffDays <= 8)  durLabel = '1 settimana';
    else if (diffDays <= 11) durLabel = '10 giorni';
    else if (diffDays <= 15) durLabel = '2 settimane';
    setDuration(`${durLabel} (${diffDays} giorni esatti)`);
    setStep(3);
  }

  async function genPlan(dep) {
    setStep(8); setPlanLoad(true); setPlanText('');
    const y = detectYear(period); setTripYear(y);
    checkDistance(dep, dest);
    const msg =
      `Crea un piano visivo dell'itinerario per: ${dest}, ${period} ${y}, ${duration}${duration.includes('Weekend') ? ' (solo 2-3 giorni, max 2 destinazioni vicine)' : ''}, ${style}, ${trav()}, budget ${budget}.\n\n` +
      `REGOLA CRITICA SUL TIPO:\n- Usa [QUARTIERE] se ${dest} e una SINGOLA CITTA\n- Usa [CITTA] SOLO se l'itinerario tocca piu CITTA DIVERSE\n- Quartieri, arrondissement, zone di una stessa citta = SEMPRE [QUARTIERE]\n\n` +
      `FORMATO OBBLIGATORIO per ogni blocco:\n### NOME (N giorni) [TIPO]\n- **Cosa vedere**: luogo - perche\n- **Cosa fare**: attivita - descrizione\n- **Da non perdere**: esperienza - perche\n\n` +
      `REGOLE:\n1. Solo ### per i titoli\n2. Niente tabelle\n3. Inizia subito col primo ###\n4. La somma dei giorni deve corrispondere a: ${duration}\n5. Scrivi in italiano\n6. OGNI citta/tappa deve avere il PROPRIO titolo ### su una riga separata; non unire mai due localita nello stesso blocco e non attaccare un nuovo titolo alla fine di un bullet\n7. Dopo ogni blocco lascia una riga vuota prima del ### successivo\n\n` +
      `ESEMPIO singola citta (Parigi, 5gg):\n### LOUVRE & MARAIS (2 giorni) [QUARTIERE]\n- **Cosa vedere**: Museo del Louvre\n### MONTMARTRE (1 giorno) [QUARTIERE]\n### EIFFEL & SAINT-GERMAIN (2 giorni) [QUARTIERE]\n\n` +
      `ESEMPIO piu citta (Costa Azzurra, 7gg):\n### NIZZA (3 giorni) [CITTA]\n### MONACO (2 giorni) [CITTA]\n### CANNES (2 giorni) [CITTA]` +
      dropRouteHint(dep, dest, transport);
    await callAI(msg, 1800, t => setPlanText(t));
    setPlanLoad(false);
  }

  async function genRevised() {
    setStep(9); setRevLoad(true); setRevText(''); setMods('');
    const y = tripYear || detectYear(period);
    const msg =
      `Piano originale per ${dest} (${period} ${y}):\n${planText}\n\n` +
      `Modifiche richieste: ${mods}\n\n` +
      `Rielabora con STESSO FORMATO: ### NOME (N giorni) [TIPO]\n- **Cosa vedere/fare/da non perdere**\n` +
      `REGOLE: solo ###, niente tabelle, somma giorni = ${duration}. OGNI citta ha il proprio titolo ### su riga separata, non unire mai due localita nello stesso blocco. Scrivi in italiano.` +
      dropRouteHint(departure, dest, transport);
    await callAI(msg, 2000, t => setRevText(t));
    setRevLoad(false);
  }

  function extractClusters(text) {
    const lines = text.split('\n');
    let out = [], cur = null;
    for (const l of lines) {
      const t = l.trim();
      if (t.startsWith('###')) {
        if (cur) out.push(cur);
        const body = t.replace(/^#+\s*/, '');
        const typeMatch = body.match(/\[(QUARTIERE|CITTA|CITTÀ)\]/i);
        const type = typeMatch ? (typeMatch[1].toUpperCase().includes('QUART') ? 'quartiere' : 'citta') : null;
        const nm = body.replace(/\[.*?\]/g, '').replace(/\(.*\)/, '').trim();
        const dg = body.match(/\((\d+)/);
        cur = { name: nm, days: dg ? parseInt(dg[1]) : null, type };
      }
    }
    if (cur) out.push(cur);
    if (!out.length) out = [{ name: dest, days: null, type: null }];

    const totalNights = parseDurationToNights(duration);
    const cities = out.filter(o => o.type === 'citta');
    // Se non c'e nessuna CITTA (solo quartieri o blocchi senza tipo) => destinazione
    // singola divisa in zone interne: una base unica.
    if (cities.length === 0) {
      return [{ name: dest, days: totalNights || 2, type: 'citta', isSingleCity: true }];
    }
    // Altrimenti (una o piu CITTA, con o senza quartieri) uso le CITTA come basi:
    // i quartieri sono suddivisioni interne e non diventano basi separate.
    out = cities;
    let sumDays = out.reduce((s, o) => s + (o.days || 0), 0);
    if (totalNights && sumDays !== totalNights) {
      const n = out.length, base = Math.floor(totalNights / n), rem = totalNights - base * n;
      out = out.map((o, i) => ({ ...o, days: Math.max(1, base + (i < rem ? 1 : 0)) }));
    }
    return out;
  }

  async function fetchHotelsForCity(cityName, bdg) {
    const hint = bdg === 'luxury'
      ? '5 stelle lusso: Four Seasons, Rocco Forte, Belmond. Fascia 400+ eur/notte.'
      : bdg === 'economico'
      ? '2-3 stelle o B&B boutique. Fascia 60-120 eur/notte.'
      : '3-4 stelle: NH Hotels, Starhotels, Marriott Courtyard. Fascia 120-250 eur/notte.';
    const msg =
      `Proponi ESATTAMENTE 3 hotel REALI ed esistenti a ${cityName}, TUTTI E 3 della fascia ${bdg} (${hint}).\n` +
      `Periodo: ${period} ${tripYear || CY}. Viaggiatori: ${trav()}.\n` +
      `VINCOLO: tutti e 3 gli hotel devono appartenere alla fascia ${bdg}; il prezzo indicato deve essere coerente con quella fascia. Nomi propri reali, niente placeholder.\n` +
      `Per ognuno indica: prezzo a notte coerente con la fascia, zona, 3 pro. Il migliore qualita/prezzo ha best:true (uno solo).\n` +
      `Rispondi SOLO con JSON array di 3 oggetti, senza testo prima o dopo:\n` +
      `[{"name":"Nome Hotel","stars":4,"zone":"quartiere","price":"euro150/notte","why":"perche sceglierlo","pros":["p1","p2","p3"],"best":true,"url":"https://www.booking.com/search.html?ss=${encodeURIComponent(cityName)}"}]`;
    const txt = await callAI(msg, 900, null);
    if (!txt) return null;
    try {
      const m = txt.match(/\[[\s\S]*\]/);
      if (m) {
        const arr = JSON.parse(m[0]);
        if (Array.isArray(arr) && arr.length > 0) {
          if (!arr.some(h => h.best)) arr[0].best = true;
          return arr;
        }
      }
    } catch {}
    return null;
  }

  async function genHotels(append) {
    setStep(10); setHotelLoad(true);
    if (!append) setHotelBases([]);
    const activeText = revText || planText;
    const clusters = extractClusters(activeText);
    const starsQ = budget === 'luxury' ? '&stars=5' : budget === 'economico' ? '&stars=2' : '&stars=4';
    let bases = append ? JSON.parse(JSON.stringify(hotelBases)) : [];

    // Fallback usato quando la chiamata AI per una citta non restituisce hotel validi
    const makeFallback = (cityName) => [{
      name: `Cerca hotel ${budget} a ${cityName}`, stars: budget === 'luxury' ? 5 : budget === 'economico' ? 3 : 4,
      zone: 'centro', price: 'vedi Booking',
      why: `Hotel ${budget} disponibili a ${cityName}`,
      pros: ['prezzi aggiornati', 'recensioni reali', 'cancellazione gratuita'], best: true,
      url: `https://www.booking.com/search.html?ss=${encodeURIComponent(cityName)}${starsQ}`,
    }];

    // Lancio TUTTE le citta in parallelo: evita il timeout 25s del piano Hobby
    // (in sequenza 4 chiamate superavano il limite e le ultime citta fallivano).
    const results = await Promise.all(clusters.map(async (cl) => {
      const searchCity = cl.isSingleCity ? dest : cl.name;
      try {
        let hotels = await fetchHotelsForCity(searchCity, budget);
        if (!hotels || !Array.isArray(hotels) || hotels.length === 0) hotels = makeFallback(searchCity);
        return { cl, hotels };
      } catch (err) {
        console.error('Errore hotel per', cl.name, err);
        return { cl, hotels: makeFallback(searchCity) };
      }
    }));

    // Inserisco i risultati mantenendo l'ordine dell'itinerario e la logica append
    for (const { cl, hotels } of results) {
      const existIdx = bases.findIndex(b => b.city === cl.name);
      if (existIdx >= 0) {
        bases[existIdx].hotels = append ? [...bases[existIdx].hotels, ...hotels] : hotels;
      } else {
        bases.push({ city: cl.name, days: cl.days || 2, hotels });
      }
    }
    setHotelBases(JSON.parse(JSON.stringify(bases)));
    setHotelLoad(false);
  }

  async function genHotelsRevised() {
    setHotelLoad(true);
    const totalNights = parseDurationToNights(duration);
    const basesDesc = hotelBases.map(b => `- ${b.city}: ${b.days} notti`).join('\n');
    const msg =
      `Viaggio a ${dest} (${duration}, ${period} ${tripYear}).\nAlloggi attuali:\n${basesDesc}\n\nNote: ${hotelNotes}\n\n` +
      `Rielabora tenendo conto delle note. Totale notti: ${totalNights}.\n` +
      `Rispondi SOLO con JSON: [{"city":"Nome","days":2,"note":"perche"}]. Somma days = ${totalNights}.`;
    const txt = await callAI(msg, 800, null);
    let newBases = null;
    try { const m = txt.match(/\[[\s\S]*\]/); if (m) { const arr = JSON.parse(m[0]); if (Array.isArray(arr) && arr.length) newBases = arr; } } catch {}
    if (!newBases) { setHotelLoad(false); return; }

    const starsQ = budget === 'luxury' ? '&stars=5' : budget === 'economico' ? '&stars=2' : '&stars=4';
    let bases = [];
    for (const nb of newBases) {
      let hotels = await fetchHotelsForCity(nb.city, budget);
      if (!hotels) hotels = [{
        name: `Cerca hotel ${budget} a ${nb.city}`, stars: budget === 'luxury' ? 5 : 4,
        zone: 'centro', price: 'vedi Booking', why: nb.note || 'Hotel consigliato',
        pros: ['prezzi aggiornati', 'recensioni reali', 'cancellazione gratuita'], best: true,
        url: `https://www.booking.com/search.html?ss=${encodeURIComponent(nb.city)}${starsQ}`,
      }];
      bases.push({ city: nb.city, days: nb.days, note: nb.note || '', hotels });
      setHotelBases(JSON.parse(JSON.stringify(bases)));
    }
    setSelKeys([]); setSelNames([]); setSelStr('');
    setShowHotelNotes(false); setHotelNotes(''); setHotelLoad(false);
  }

  async function genDraft(hotel) {
    setStep(11); setDraftLoad(true); setDraftText('');
    const y = tripYear || detectYear(period);
    const activeText = (revText || planText).slice(0, 1500);
    const msg =
      `Itinerario bozza per ${dest}, ${period} ${y}, ${duration}, ${style}, budget ${budget}, alloggio ${hotel}, ${trav()}.\n` +
      `Piano visite:\n${activeText}\n\n` +
      `FORMATO OBBLIGATORIO:\n\n**Giorno 1 - Titolo**\n\nMATTINA\n- Attivita 1 (tempo)\n- Attivita 2 (tempo)\n\nPOMERIGGIO\n- Attivita 1\n\nSERA\n- Attivita 1\n\n---\n\n` +
      `REGOLE: MATTINA/POMERIGGIO/SERA su riga isolata maiuscolo. Ogni attivita inizia con - su riga separata. Riga vuota tra sezioni.\n\n` +
      `## LOGISTICA GENERALE\nOGNI punto su riga separata con -:\n- Trasporti: ...\n- Pagamenti: ...\n- App utili: ...\n- Prenotazioni: ...\n- Budget: ...\n` +
      `Scrivi in italiano.` +
      dropRouteHint(departure, dest, transport);
    await callAI(msg, 8000, t => setDraftText(t));
    setDraftLoad(false);
  }

  async function genFood() {
    setStep(13); setFoodLoad(true); setFoodText('');
    const y = tripYear || detectYear(period);
    const msg =
      `Suggerisci ristoranti per ogni giorno a ${dest} (${period} ${y}), budget ${budget}, ${trav()}, alloggio ${selStr}.\n` +
      `## PREZZI MEDI A ${dest.toUpperCase()}\n(costo medio a persona per tipologia)\n` +
      `## DOVE MANGIARE - GIORNO PER GIORNO\nPer ogni giorno: pranzo e cena con nome locale, tipo, zona, prezzo, specialita. LINK url\n` +
      `## ESPERIENZE CULINARIE DA NON PERDERE\n3-4 esperienze con LINK url. Scrivi in italiano.`;
    await callAI(msg, 3000, t => setFoodText(t));
    setFoodLoad(false);
  }

  async function genFinal(f) {
    setStep(15); setFinLoad(true); setFinText('');
    setDImg(imgUrl(dest, 780, 260));
    setGal([imgUrl(`${dest} landscape`), imgUrl(`${dest} food`), imgUrl(`${dest} hotel`)]);
    const y = tripYear || detectYear(period);
    const isMPS = f !== 'orario';
    const gdStr = guide && guide !== false
      ? `\n## GUIDE TURISTICHE\nGiorni: ${guide.days} - Lingua: ${guide.language}\n2-3 servizi con LINK url\n`
      : '';
    const transportBlock = (() => {
      const tr = (transport || '').toLowerCase();
      if (tr.includes('auto'))  return `## TRASPORTO\nViaggio in ${transport} da ${departure} a ${dest}. Percorso ottimizzato "a goccia" (prima le mete più lontane, poi quelle sulla via del ritorno verso ${departure}). Autostrade consigliate, soste e parcheggi.\n`;
      if (tr.includes('treno')) return `## TRASPORTO\nViaggio in treno da ${departure} a ${dest}. Trenitalia o Italo: orari, prezzi, stazione.\nLINK https://www.trenitalia.com\n`;
      if (tr.includes('bus'))   return `## TRASPORTO\nViaggio in bus da ${departure} a ${dest}. Compagnie, fermate, orari.\n`;
      return `## VOLO CONSIGLIATO\nRotta ${departure} - ${dest} ${period} ${y}: compagnie, prezzi, miglior opzione.\nLINK https://www.google.com/travel/flights?q=${encodeURIComponent(`${departure} ${dest}`)}\nLINK https://www.skyscanner.it/voli-per/${encodeURIComponent(dest.toLowerCase())}\n`;
    })();
    const formatStr = isMPS
      ? 'Dividi ogni giorno in tre blocchi: MATTINA / POMERIGGIO / SERA (righe separate maiuscolo). Elenca attivita come bullet - sotto ogni blocco.'
      : `SCHEDULE ORE PER ORA: ogni attivita con orario preciso. Formato:\nGiorno 1 - Titolo\n07:00 - Partenza da ${departure}\n09:30 - Arrivo e check-in\n10:00 - Visita sito X (durata: 1.5 ore)\nOgni riga deve avere ORARIO - ATTIVITA. Includi tempi di spostamento, mezzi, durate.`;
    const msg =
      `Itinerario completo per ${dest}, ${period} ${y}, ${duration}, ${style}, budget ${budget}, ${trav()}, partenza ${departure}, alloggio ${selStr}.\n` +
      `Formato giorni: ${formatStr}. Separa giorni con ---. Scrivi in italiano con ## per sezioni:\n` +
      `## PRESENTAZIONE DELLA DESTINAZIONE\n` +
      transportBlock +
      `## ALLOGGIO\n${selStr}: zona e perche ottimale\nLINK https://www.booking.com/search.html?ss=${encodeURIComponent(dest)}\n` +
      `## ITINERARIO GIORNO PER GIORNO\nSEGUI ESATTAMENTE questa bozza approvata aggiungendo solo dettagli e link:\n${draftText.slice(0, 2500)}\n\nPer ogni attivita aggiungi: LINK url-biglietti${wantsFood ? ' e LINK url-ristorante' : ''}\n` +
      gdStr +
      `## ESPERIENZE LOCALI E CUCINA\n3-4 con LINK url\n` +
      `## CONSIGLI PRATICI\n- Trasporti\n- Pagamenti\n- App utili\n- Visto\n- Valigia` +
      dropRouteHint(departure, dest, transport);
    try { await callAI(msg, 8000, t => setFinText(t)); }
    catch (e) { setFinText(`Errore: ${e.message}`); }
    setFinLoad(false);
  }

  function resetAll() {
    setStep(1); setDest(''); setPeriod(''); setStartDate(''); setEndDate(''); setTripYear(CY);
    setTravType(''); setAdults(2); setChildren(0); setChildAges([]); setDuration(''); setStyle('');
    setBudget(''); setDeparture(''); setFmt('mps'); setMods(''); setWantsFood(null); setInp('');
    setAiPer(''); setPlanText(''); setRevText(''); setDraftText(''); setFoodText(''); setFinText('');
    setHotelBases([]); setSelKeys([]); setSelNames([]); setSelStr(''); setExclHotels([]);
    setHotelNotes(''); setShowHotelNotes(false); setGuide(null); setShowCust(false); setCustH('');
    setTransport(null); setDistClose(null); setSaveStatus('');
  }

  /* ── draft summary for step 12 ── */
  const draftClusters = (() => {
    const lines = (draftText || '').split('\n');
    const giorni = []; let cur = null;
    for (const l of lines) {
      const t = l.trim();
      if (/^#{0,3}\s*\*{0,2}giorno\s*\d+/i.test(t)) {
        if (cur) giorni.push(cur);
        cur = { title: t.replace(/^#{1,3}\s*/, '').replace(/\*\*/g, '').trim(), items: [] };
      } else if (cur && (t[0] === '-' || t[0] === '*') && t.length > 2) {
        const item = t.slice(1).trim().replace(/\*\*/g, '');
        const low = item.toLowerCase();
        if (item.length > 3 && !['trasport','pagament','budget','app utili','prenotazion'].some(x => low.includes(x))) {
          let syn = item.replace(/\s*\([^)]*\)\s*$/, '').trim();
          const cutIdx = syn.search(/\s[-–]\s|:\s|,\s(per|con|dove|che|e\s)/i);
          if (cutIdx > 10) syn = syn.slice(0, cutIdx);
          if (syn.length > 55) syn = syn.slice(0, 52).trim() + '...';
          if (cur.items.length < 4) cur.items.push(syn);
        }
      }
    }
    if (cur) giorni.push(cur);
    // Rete di sicurezza: se la bozza non usa il formato "Giorno N", mostro almeno
    // i blocchi ### del piano cosi il riepilogo non resta vuoto.
    if (giorni.length === 0 && (draftText || planText || revText)) {
      const src = (revText || planText || '').split('\n');
      for (const l of src) {
        const t = l.trim();
        if (t.startsWith('###')) {
          const title = t.replace(/^#+\s*/, '').replace(/\[.*?\]/g, '').replace(/\*\*/g, '').trim();
          if (title) giorni.push({ title, items: [] });
        }
      }
    }
    return giorni;
  })();

  /* ── progress bar ── */
  const progressBar = STEPS.flatMap((label, si) => {
    const snum = si + 1;
    const nodes = [
      <div className="p-sn" key={snum}>
        <div className={`p-sc${step === snum ? ' act' : step > snum ? ' dn' : ''}`}>{step > snum ? '✓' : snum}</div>
        <div className={`p-sl${step === snum ? ' act' : ''}`}>{label}</div>
      </div>
    ];
    if (si < STEPS.length - 1) nodes.push(<div className={`p-cn${step > snum ? ' dn' : ''}`} key={`c${snum}`} />);
    return nodes;
  });

  const lks = [
    { l:'Google Flights', s:`Voli da ${departure}`, h:`https://www.google.com/travel/flights?q=${encodeURIComponent(`${departure} ${dest}`)}` },
    { l:'Skyscanner',     s:'Confronta voli',       h:`https://www.skyscanner.it/voli-per/${encodeURIComponent((dest||'').toLowerCase().replace(/ /g,'-'))}` },
    { l:'Booking.com',    s:`Hotel a ${dest}`,      h:`https://www.booking.com/search.html?ss=${encodeURIComponent(dest)}&group_adults=${adults}` },
    { l:'TripAdvisor',    s:'Ristoranti e attività',h:`https://www.tripadvisor.it/Search?q=${encodeURIComponent(dest)}` },
    { l:'Google Maps',    s:'Esplora',              h:`https://www.google.com/maps/search/${encodeURIComponent(`cose da fare ${dest}`)}` },
    { l:'Viator',         s:'Tour ed esperienze',   h:`https://www.viator.com/search/${encodeURIComponent(dest)}` },
  ];

  const metaTags = [period, travType, `${adults} adult${adults>1?'i':'o'}${children>0?` + ${children} bambin${children>1?'i':'o'}`:''}`, duration, style, budget].filter(Boolean);

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{CSS}</style>
      <div className="planner-wrap">

        {/* Header */}
        <div className="p-logo">
          <div className="p-li">✈</div>
          <div className="p-lt">Travel <span>AI</span> Agent</div>
        </div>
        <div className="p-sub">IL TUO CONSULENTE DI VIAGGIO PERSONALE</div>
        <div className="p-dl" />

        {/* Progress */}
        {step <= 14 && <div className="p-prog">{progressBar}</div>}
        {step > 1 && step <= 14 && (
          <button className="p-back" onClick={goBack}>← Torna indietro</button>
        )}

        {/* ── Step 1: Destinazione ── */}
        {step === 1 && (
          <div className="p-card">
            <div className="p-tt">🌍 Dove vuoi andare?</div>
            <div className="p-ht">Inserisci una destinazione, paese o regione</div>
            <div className="p-ir">
              <input className="p-inp" placeholder="Es. Italia, Giappone, Kenya..." value={inp}
                onChange={e => setInp(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && inp.trim()) onDest(); }} />
              <button className="p-go" onClick={() => { if (inp.trim()) onDest(); }}>›</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Periodo ── */}
        {step === 2 && (
          <div className="p-card">
            <div className="p-tt">📅 Quando vuoi partire?</div>
            <div className="p-ht">Stagionalità per {dest}</div>
            <ABox text={aiPer} loading={aiPerLoad} lt="Analizzo stagionalità..." />
            <div style={{ marginBottom:'1.2rem' }}>
              <div style={{ fontSize:12, color:G, marginBottom:8, fontWeight:600 }}>🗓️ Scegli le date esatte (opzionale)</div>
              <div className="p-dpick">
                <div>
                  <div style={{ fontSize:11, color:'#777', marginBottom:4 }}>Partenza</div>
                  <input type="date" className="p-inp" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:'#777', marginBottom:4 }}>Ritorno</div>
                  <input type="date" className="p-inp" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              {startDate && endDate && <Btn label="Conferma date →" style={{ marginTop:10 }} onClick={confirmDates} />}
            </div>
            <div style={{ fontSize:12, color:'#666', margin:'1rem 0 .8rem', borderTop:`.5px solid ${BRD}`, paddingTop:'1rem' }}>Oppure scegli un periodo generico</div>
            <div className="p-chips">{MONTHS.map(mo => <Chip key={mo} label={mo} onClick={() => { setPeriod(mo); setTripYear(detectYear(mo)); setStep(3); }} />)}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:10 }}>{SEASONS.map(s => <Chip key={s} label={s} onClick={() => { setPeriod(s); setStep(3); }} />)}</div>
          </div>
        )}

        {/* ── Step 3: Viaggiatori ── */}
        {step === 3 && (
          <div className="p-card">
            <div className="p-tt">👥 Chi viaggia?</div>
            <div className="p-ht">Tipo di gruppo</div>
            <div className="p-chips" style={{ marginBottom:'1.2rem' }}>
              {TTYPES.map(t => <Chip key={t} label={t} sel={travType === t} onClick={() => setTravType(t)} />)}
            </div>
            {['Gruppo di amici','Famiglia','Gruppo con bambini'].includes(travType) && (
              <div className="p-sep">
                <div className="p-slbl">Adulti</div>
                <div className="p-nr">
                  <button className="p-nb" onClick={() => setAdults(a => Math.max(1, a - 1))}>−</button>
                  <span className="p-nv">{adults}</span>
                  <button className="p-nb" onClick={() => setAdults(a => a + 1)}>+</button>
                </div>
              </div>
            )}
            {['Famiglia','Gruppo con bambini'].includes(travType) && (
              <div className="p-sep">
                <div className="p-slbl">Bambini</div>
                <div className="p-nr">
                  <button className="p-nb" onClick={() => { setChildren(c => Math.max(0,c-1)); setChildAges(p => p.slice(0,-1)); }}>−</button>
                  <span className="p-nv">{children}</span>
                  <button className="p-nb" onClick={() => setChildren(c => c + 1)}>+</button>
                </div>
                {children > 0 && (
                  <div>
                    <div className="p-slbl">Età dei bambini</div>
                    {Array.from({ length: children }, (_, ci) => (
                      <div className="p-ar" key={ci}>
                        <span className="p-alb">Bambino {ci + 1}</span>
                        <div className="p-acs">
                          {CAGES.map(a => (
                            <div key={a} className={`p-ac${childAges[ci] === a ? ' sel' : ''}`}
                              onClick={() => setChildAges(p => { const ag = [...p]; ag[ci] = a; return ag; })}>{a}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {travType && <Btn label="Continua →" style={{ marginTop:'1.2rem' }} onClick={() => { if (duration && duration.includes('giorni esatti')) setStep(5); else setStep(4); }} />}
          </div>
        )}

        {/* ── Step 4: Durata ── */}
        {step === 4 && (
          <div className="p-card">
            <div className="p-tt">⏳ Per quanto tempo?</div>
            <div className="p-ht">Giorni disponibili</div>
            <div className="p-chips">{DURS.map(d => <Chip key={d} label={d} onClick={() => { setDuration(d); setStep(5); }} />)}</div>
          </div>
        )}

        {/* ── Step 5: Tipologia ── */}
        {step === 5 && (
          <div className="p-card">
            <div className="p-tt">✨ Che tipo di viaggio?</div>
            <div className="p-ht">Stile preferito</div>
            <div className="p-chips">{STYLES.map(s => <Chip key={s} label={s} onClick={() => { setStyle(s); setStep(6); }} />)}</div>
          </div>
        )}

        {/* ── Step 6: Budget ── */}
        {step === 6 && (
          <div className="p-card">
            <div className="p-tt">💳 Budget?</div>
            <div className="p-ht">Adattiamo tutto alle tue aspettative</div>
            <div className="p-bc">
              {BUDGETS.map(b => (
                <div key={b.k} className={`p-bci${budget === b.k ? ' sel' : ''}`} onClick={() => { setBudget(b.k); setStep(7); }}>
                  <div style={{ fontSize:14, color:GL, fontWeight:600, marginBottom:4 }}>{b.l}</div>
                  <div style={{ fontSize:11, color:'#666', lineHeight:1.5 }}>{b.d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 7: Partenza ── */}
        {step === 7 && (
          <div className="p-card">
            <div className="p-tt">🛫 Da dove parti?</div>
            <div className="p-ht">Città di partenza</div>
            <div className="p-ir">
              <input className="p-inp" placeholder="Es. Milano, Roma..." value={inp}
                onChange={e => setInp(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && inp.trim()) { const d = inp.trim(); setDeparture(d); setInp(''); genPlan(d); } }} />
              <button className="p-go" onClick={() => { if (inp.trim()) { const d = inp.trim(); setDeparture(d); setInp(''); genPlan(d); } }}>›</button>
            </div>
          </div>
        )}

        {/* ── Step 8: Piano ── */}
        {step === 8 && (
          <div className="p-card" style={{ maxWidth:700 }}>
            <Badge text={`${dest} · ${duration} · ${period} ${tripYear}`} />
            <div className="p-tt">🗺️ Il tuo piano di viaggio</div>
            <div className="p-ht">Ecco le città e le esperienze da non perdere</div>
            <ABox text={planText} loading={planLoad} lt="Analizzo la destinazione..." />
            {!planLoad && planText && (
              <div>
                {distClose === true && transport === null && (
                  <div style={{ background:'#111', border:`.5px solid ${G}`, borderRadius:12, padding:'1.2rem 1.4rem', margin:'1rem 0' }}>
                    <div style={{ fontSize:13, color:GL, fontWeight:600, marginBottom:8 }}>Come vuoi raggiungere {dest}?</div>
                    <div style={{ fontSize:12, color:'#888', marginBottom:12 }}>La destinazione è raggiungibile anche senza volare</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {['Auto propria','Auto a noleggio','Treno','Bus','Aereo'].map(opt => (
                        <div key={opt} className="p-chip" onClick={() => setTransport(opt)}>{opt}</div>
                      ))}
                    </div>
                  </div>
                )}
                {transport !== null && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#1a1400', border:`.5px solid ${G}`, borderRadius:20, padding:'4px 12px', fontSize:12, color:GL, marginBottom:8 }}>
                    {transport} selezionato
                  </div>
                )}
                <div style={{ fontSize:13, color:'#888', margin:'1rem 0 .5rem' }}>Vuoi aggiungere o modificare qualcosa?</div>
                <textarea className="p-ta" placeholder="Es. Aggiungi Venezia, voglio una notte in glamping..." value={mods} onChange={e => setMods(e.target.value)} />
                <div className="p-brow">
                  <Btn label={mods.trim() ? 'Rielabora →' : 'Vai agli alloggi →'} onClick={() => { if (mods.trim()) genRevised(); else genHotels(false); }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 9: Piano rivisto ── */}
        {step === 9 && (
          <div className="p-card" style={{ maxWidth:700 }}>
            <Badge text={`Piano aggiornato · ${dest}`} />
            <div className="p-tt">Piano rivisto</div>
            <div className="p-ht">Ho integrato le tue indicazioni</div>
            <ABox text={revText} loading={revLoad} lt="Rielaboro il piano..." />
            {!revLoad && revText && (
              <div>
                <div style={{ fontSize:13, color:'#888', margin:'1rem 0 .5rem' }}>Altre modifiche o procediamo?</div>
                <textarea className="p-ta" placeholder="Altre modifiche? Lascia vuoto per confermare..." value={mods} onChange={e => setMods(e.target.value)} />
                <div className="p-brow">
                  <Btn label={mods.trim() ? 'Rielabora ancora →' : 'Confermo, vai agli alloggi →'} onClick={() => { if (mods.trim()) genRevised(); else genHotels(false); }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 10: Alloggi ── */}
        {step === 10 && (
          <div className="p-card" style={{ maxWidth:720 }}>
            <Badge text={`🏨 Alloggi · ${dest} ${tripYear}`} />
            <div className="p-tt">Scegli il tuo alloggio</div>
            <div className="p-ht">Strutture per fascia {budget}, una base per ogni area del tuo itinerario</div>
            {hotelLoad && hotelBases.length === 0 && <div className="p-aib"><Dots text="Cerco hotel per ogni città..." /></div>}
            {hotelBases.length > 0 && (
              <div>
                {/* Summary bar */}
                <div style={{ background:'#111', border:`.5px solid ${BRD}`, borderRadius:12, padding:'14px 18px', marginBottom:'1.2rem' }}>
                  <div style={{ fontSize:11, letterSpacing:'2px', color:G, textTransform:'uppercase', fontWeight:600, marginBottom:'0.9rem' }}>
                    {hotelBases.length > 1 ? `🗺️ Soggiorno in ${hotelBases.length} basi` : '🏨 Alloggio unico'}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:6 }}>
                    {hotelBases.map((b, bi) => (
                      <>
                        <div key={bi} style={{ background:'#1a1400', border:`.5px solid ${G}`, borderRadius:20, padding:'6px 14px', display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:12, color:GL, fontWeight:600 }}>{b.city}</span>
                          <span style={{ fontSize:10, color:G, background:'#111', borderRadius:10, padding:'1px 7px' }}>{b.days || '?'} notti</span>
                        </div>
                        {bi < hotelBases.length - 1 && <span style={{ color:'#444', fontSize:16, margin:'0 2px' }}>→</span>}
                      </>
                    ))}
                    {hotelLoad && <><div className="p-dot"/><div className="p-dot"/><div className="p-dot"/><span style={{ fontSize:11, color:G, marginLeft:2 }}>ricerca in corso...</span></>}
                  </div>
                </div>

                {hotelBases.map((base, bi) => (
                  <div key={bi} style={{ marginBottom:'1.8rem' }}>
                    <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:8, marginBottom:'.8rem', paddingBottom:'.6rem', borderBottom:`.5px solid ${BRD}` }}>
                      <div style={{ background:G, borderRadius:8, padding:'4px 14px', fontSize:12, color:DK, fontWeight:700 }}>📍 {base.city}</div>
                      <div style={{ background:'#1a1400', border:`.5px solid ${G}`, borderRadius:12, padding:'3px 10px', fontSize:11, color:G }}>{base.days} notti</div>
                      {hotelLoad && <div style={{ fontSize:11, color:'#888' }}>caricamento...</div>}
                    </div>
                    {base.hotels.map((h, hi) => (
                <HCard key={hi} h={h} bi={bi} city={base.city}
                  budget={budget}
                  selKeys={selKeys} setSelKeys={setSelKeys}
                  selNames={selNames} setSelNames={setSelNames}
                />
              ))}
                  </div>
                ))}

                {selNames.length > 0 && (
                  <div style={{ background:'#111', border:`.5px solid ${G}`, borderRadius:10, padding:'12px 14px', marginBottom:'1rem', fontSize:12, color:'#ccc' }}>
                    <div style={{ color:G, fontSize:11, letterSpacing:'1px', textTransform:'uppercase', marginBottom:6 }}>✅ Selezione</div>
                    {selNames.map((n, ni) => <div key={ni}>• {n}</div>)}
                  </div>
                )}
                {selKeys.length > 0 && !showCust && (
                  <Btn label="✅ Confermo – Genera bozza →" style={{ marginBottom:10 }} onClick={() => { const hn = selNames.join(' | '); setSelStr(hn); genDraft(hn); }} />
                )}
                {!showCust && !showHotelNotes && (
                  <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap' }}>
                    <Btn ghost label="➕ Altri hotel" onClick={() => { const names = hotelBases.flatMap(b => b.hotels.map(h => h.name || '')); setExclHotels([...exclHotels, ...names]); genHotels(true); }} />
                    <Btn ghost label="✏️ Inserisci il tuo" onClick={() => { setShowCust(true); setSelKeys([]); setSelNames([]); }} />
                    <Btn ghost label="✒️ Modifica basi e notti" onClick={() => setShowHotelNotes(true)} />
                  </div>
                )}

                {/* Modifica basi */}
                {showHotelNotes && (
                  <div style={{ background:'#111', border:`.5px solid ${G}`, borderRadius:12, padding:'1.2rem 1.4rem', marginTop:'1rem' }}>
                    <div style={{ fontSize:13, color:GL, fontWeight:600, marginBottom:4 }}>✒️ Modifica basi e distribuzione notti</div>
                    <div style={{ fontSize:12, color:'#888', marginBottom:'0.8rem', lineHeight:1.6 }}>Indica come vorresti cambiare gli alloggi: elimina una base, redistribuisci le notti, aggiungi gite in giornata...</div>
                    {hotelBases.length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:'0.8rem' }}>
                        {hotelBases.map((b, bi) => (
                          <div key={bi} style={{ background:'#1a1400', border:`.5px solid ${G}`, borderRadius:20, padding:'5px 12px', display:'flex', alignItems:'center', gap:7 }}>
                            <span style={{ fontSize:12, color:GL, fontWeight:600 }}>{b.city}</span>
                            <button style={{ background:'#111', border:'.5px solid #444', borderRadius:'50%', width:18, height:18, color:'#aaa', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                              onClick={e => { e.stopPropagation(); const nb = JSON.parse(JSON.stringify(hotelBases)); nb[bi].days = Math.max(1, nb[bi].days - 1); setHotelBases(nb); }}>−</button>
                            <span style={{ fontSize:11, color:G, minWidth:18, textAlign:'center', fontWeight:600 }}>{b.days}n</span>
                            <button style={{ background:'#111', border:'.5px solid #444', borderRadius:'50%', width:18, height:18, color:'#aaa', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                              onClick={e => { e.stopPropagation(); const nb = JSON.parse(JSON.stringify(hotelBases)); nb[bi].days++; setHotelBases(nb); }}>+</button>
                            <button style={{ background:'transparent', border:'none', color:'#555', fontSize:14, cursor:'pointer', padding:'0 3px' }}
                              onClick={e => { e.stopPropagation(); setHotelBases(hotelBases.filter((_, i) => i !== bi)); }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <textarea className="p-ta" style={{ marginBottom:'0.8rem' }}
                      placeholder="Es. Voglio eliminare Santa Barbara e aggiungere una notte in più a Los Angeles."
                      value={hotelNotes} onChange={e => setHotelNotes(e.target.value)} />
                    <div style={{ display:'flex', gap:10 }}>
                      <Btn label={hotelLoad ? '⏳ Rielaboro...' : '🔄 Rielabora alloggi →'} onClick={() => { if (!hotelLoad && hotelNotes.trim()) genHotelsRevised(); }} disabled={hotelLoad || !hotelNotes.trim()} />
                      <Btn ghost label="Annulla" style={{ maxWidth:120 }} onClick={() => setShowHotelNotes(false)} />
                    </div>
                  </div>
                )}

                {/* Hotel personalizzato */}
                {showCust && (
                  <div style={{ marginTop:'.5rem' }}>
                    <div style={{ fontSize:12, color:G, marginBottom:6 }}>Nome hotel (o più separati da virgola)</div>
                    <div className="p-ir">
                      <input className="p-inp" placeholder="Es. Bauer Palazzo Venezia..." value={custH}
                        onChange={e => setCustH(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && custH.trim()) { setSelStr(custH.trim()); setSelNames([custH.trim()]); setShowCust(false); } }} />
                      <button className="p-go" onClick={() => { if (custH.trim()) { setSelStr(custH.trim()); setSelNames([custH.trim()]); setShowCust(false); } }}>✓</button>
                    </div>
                    <Btn ghost label="← Torna alle proposte" style={{ marginTop:8 }} onClick={() => setShowCust(false)} />
                  </div>
                )}
                {!showCust && !showHotelNotes && selStr && selKeys.length === 0 && (
                  <Btn label={`✅ Scelgo ${selStr} →`} style={{ marginTop:10 }} onClick={() => genDraft(selStr)} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 11: Bozza ── */}
        {step === 11 && (
          <div className="p-card" style={{ maxWidth:700 }}>
            <Badge text="📋 Bozza itinerario" />
            <div className="p-tt">Prima bozza</div>
            <div className="p-ht">Ottimizzato per il tuo alloggio</div>
            <ABox text={draftText} loading={draftLoad} lt="Ottimizzo gli spostamenti..." />
            {!draftLoad && draftText && (
              <div>
                <div style={{ fontSize:13, color:'#888', margin:'1rem 0 .8rem' }}>Come trovi questa bozza?</div>
                <div className="p-yn">
                  <YN icon="✅" title="Ottima, procedi" sub="Passa alle guide" onClick={() => setStep(12)} />
                  <YN icon="🔄" title="Rigenera" sub="Crea nuova versione" onClick={() => genDraft(selStr)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 12: Guide ── */}
        {step === 12 && (
          <div className="p-card" style={{ maxWidth:780 }}>
            <Badge text={`🧭 Guide · ${dest}`} />
            <div className="p-tt">Vuoi una guida turistica?</div>
            <div className="p-ht">Guide locali certificate lungo il percorso</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>
              <div>
                {guide === null && (
                  <div className="p-yn">
                    <YN icon="🙋" title="Sì, voglio una guida" sub="Scegli giorni e lingua" onClick={() => setGuide('yes')} />
                    <YN icon="🚶" title="No, esploro da solo" sub="Procedi senza guida" onClick={() => { setGuide(false); setStep(13); }} />
                  </div>
                )}
                {guide === 'yes' && (
                  <div>
                    <div style={{ fontSize:12, color:G, marginBottom:6, marginTop:'.5rem' }}>In quali giorni?</div>
                    <div className="p-chips" style={{ marginBottom:'1rem' }}>
                      {['Tutto il viaggio','Solo alcuni giorni'].map(o => <Chip key={o} label={o} sel={guideDays === o} onClick={() => setGuideDays(o)} />)}
                    </div>
                    {guideDays === 'Solo alcuni giorni' && (
                      <input className="p-inp" style={{ marginBottom:'1rem', width:'100%' }} placeholder="Es. Giorno 1, Giorno 3..." value={guideCustom} onChange={e => setGuideCustom(e.target.value)} />
                    )}
                    <div style={{ fontSize:12, color:G, marginBottom:6 }}>Lingua della guida</div>
                    <div className="p-chips" style={{ marginBottom:'1.4rem' }}>
                      {LANGS.map(l => <Chip key={l} label={l} sel={guideLang === l} onClick={() => setGuideLang(l)} />)}
                    </div>
                    <Btn label="✅ Confermo →" onClick={() => { setGuide({ days: guideDays === 'Solo alcuni giorni' ? guideCustom : 'Tutto il viaggio', language: guideLang }); setStep(13); }} />
                  </div>
                )}
              </div>
              <div style={{ background:'#111', border:'.5px solid #2a2a2a', borderRadius:12, padding:'14px 16px', maxHeight:360, overflowY:'auto' }}>
                <div style={{ fontSize:11, letterSpacing:'2px', color:G, textTransform:'uppercase', fontWeight:600, marginBottom:'0.8rem' }}>Riepilogo itinerario</div>
                {draftClusters.length === 0
                  ? <div style={{ fontSize:12, color:'#666' }}>La bozza dell'itinerario non è ancora disponibile.</div>
                  : draftClusters.map((g, gi) => (
                    <div key={gi} style={{ marginBottom:'1rem', paddingBottom:'0.8rem', borderBottom: gi < draftClusters.length - 1 ? '.5px solid #1a1a1a' : 'none' }}>
                      <div style={{ fontSize:12, color:GL, fontWeight:600, marginBottom:'0.4rem' }}>{g.title}</div>
                      {g.items.length > 0
                        ? g.items.map((it, ii) => <div key={ii} style={{ display:'flex', gap:6, fontSize:11, color:'#aaa', marginBottom:2 }}><span style={{ color:G, flexShrink:0 }}>◆</span><span>{it}</span></div>)
                        : <div style={{ fontSize:11, color:'#555' }}>Attività da definire</div>
                      }
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* ── Step 13: Ristorazione ── */}
        {step === 13 && (
          <div className="p-card" style={{ maxWidth:700 }}>
            <Badge text={`🍽️ Ristorazione · ${dest}`} />
            <div className="p-tt">Suggerimenti culinari?</div>
            <div className="p-ht">Ristoranti e locali · budget {budget}</div>
            {!foodText && !foodLoad && (
              <div className="p-yn">
                <YN icon="🍽️" title="Sì, suggerisci" sub="Pranzo e cena per ogni giorno" onClick={() => { setWantsFood(true); genFood(); }} />
                <YN icon="⏭️" title="No, scelgo da solo" sub="Salta questa sezione" onClick={() => { setWantsFood(false); setStep(14); }} />
              </div>
            )}
            {(foodLoad || foodText) && <ABox text={foodText} loading={foodLoad} lt="Cerco ristoranti..." />}
            {!foodLoad && foodText && (
              <div className="p-brow">
                <Btn label="✅ Ottimo, scegli formato →" onClick={() => setStep(14)} />
              </div>
            )}
          </div>
        )}

        {/* ── Step 14: Formato ── */}
        {step === 14 && (
          <div className="p-card">
            <div className="p-tt">📋 Formato itinerario?</div>
            <div className="p-ht">Livello di dettaglio preferito</div>
            <div className="p-fc">
              {FMTS.map(f => (
                <div key={f.k} className={`p-fcard${fmt === f.k ? ' sel' : ''}`} onClick={() => { setFmt(f.k); genFinal(f.k); }}>
                  <div style={{ fontSize:14, color:GL, fontWeight:500, marginBottom:4 }}>{f.l}</div>
                  <div style={{ fontSize:11, color:'#666' }}>{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 15: Itinerario finale ── */}
        {step === 15 && (
          <div className="p-rbox">
            {dImg && <img className="p-rhero" src={dImg} alt={dest} onError={e => { e.target.style.display = 'none'; }} />}
            <div className="p-rhead">
              <div className="p-rdest">{dest ? dest.charAt(0).toUpperCase() + dest.slice(1) : dest} {tripYear}</div>
              <div className="p-rmeta">{metaTags.map(t => <span key={t} className="p-mtag">{t}</span>)}</div>
            </div>
            <div className="p-rbody">
              {finLoad && !finText && <Dots text="Genero l'itinerario definitivo..." />}
              {finText && (
                <div className="p-rtxt" ref={finRef} dangerouslySetInnerHTML={{ __html: mdHtml(finText) + (finLoad ? "<span class='p-cur'></span>" : '') }} />
              )}
              {!finLoad && finText && (
                <div>
                  {/* Save bar */}
                  {user && (
                    <div style={{ margin:'1rem 0', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                      <button
                        onClick={saveItinerary}
                        style={{ background:G, color:DK, border:'none', borderRadius:10, padding:'10px 20px', fontSize:13, fontFamily:'Inter,sans-serif', cursor:'pointer', fontWeight:600 }}
                      >💾 Salva itinerario</button>
                      {saveStatus && <span style={{ fontSize:12, color: saveStatus.startsWith('✅') ? GL : '#f88' }}>{saveStatus}</span>}
                    </div>
                  )}

                  <div className="p-stit">Galleria</div>
                  <div className="p-igrid">
                    {gal.map((s, gi) => <img key={gi} src={s} alt={dest} onError={e => { e.target.style.display = 'none'; }} />)}
                  </div>

                  <div className="p-stit">Prenota e Esplora</div>
                  <div className="p-lgrid">
                    {lks.map(lc => (
                      <a key={lc.l} className="p-lcard" href={lc.h} target="_blank" rel="noopener noreferrer">
                        <div>
                          <div style={{ fontSize:12, color:GL, fontWeight:500 }}>{lc.l}</div>
                          <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{lc.s}</div>
                        </div>
                      </a>
                    ))}
                  </div>

                  <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:'1.5rem', borderTop:`.5px solid ${BRD}`, paddingTop:'1.2rem', alignItems:'center' }}>
                    <Btn ghost style={{ maxWidth:180 }} label="← Nuovo itinerario" onClick={resetAll} />
                    <button
                      style={{ background:'#1a1400', border:`.5px solid ${G}`, borderRadius:10, padding:'10px 18px', color:G, fontSize:13, fontFamily:'Inter,sans-serif', cursor:'pointer', fontWeight:500 }}
                      onClick={() => { try { window.scrollTo({ top:0, behavior:'smooth' }); } catch {} }}
                    >↑ Torna all'inizio</button>
                    <p style={{ fontSize:11, color:'#555' }}>Suggerimenti orientativi. Verifica prima di prenotare.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

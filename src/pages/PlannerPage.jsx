import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import "../planner.css";

// ─── COSTANTI ────────────────────────────────────────────────────────────────
const G = "#C9A84C", GL = "#e8c97a", DK = "#0d0d0d", BRD = "#2a2a2a", CY = 2026;
const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const SEASONS = ["Primavera","Estate","Autunno","Inverno"];
const TTYPES = ["Solo","Coppia","Famiglia","Gruppo di amici","Gruppo con bambini","Viaggio di nozze"];
const DURS = ["Weekend (2-3 giorni)","3-4 giorni","1 settimana","10 giorni","2 settimane","3+ settimane"];
const STYLES = ["Cultura & Storia","Relax & Natura","Avventura & Sport","Gastronomia","Benessere & Spa","Enogastronomia","Mix equilibrato"];
const CAGES = ["< 1 anno","1 anno","2 anni","3 anni","4 anni","5 anni","6-8 anni","9-12 anni","13-17 anni"];
const LANGS = ["Italiano","Inglese","Francese","Spagnolo","Tedesco","Arabo","Altra lingua"];
const STEPS = ["Destinazione","Periodo","Viaggiatori","Durata","Tipologia","Budget","Partenza","Anteprima","Conferma","Alloggi","Bozza","Guide","Ristorazione","Formato","Itinerario"];
const BUDGETS = [
  { k: "economico", l: "Economico", d: "Ostelli, low-cost, street food" },
  { k: "medio",     l: "Medio",     d: "Hotel 3-4 stelle, voli diretti" },
  { k: "luxury",    l: "Luxury",    d: "Hotel 5 stelle, business class" },
];
const FMTS = [
  { k: "mps",    l: "Mattina / Pomeriggio / Sera", d: "Tre blocchi giornalieri" },
  { k: "orario", l: "Per fasce orarie",             d: "9:00, 13:00, 15:00, 20:00" },
];

// ─── UTILS ───────────────────────────────────────────────────────────────────
function detectYear(p) {
  const m = { gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12 };
  const n = m[String(p||"").toLowerCase()];
  return n ? (n >= new Date().getMonth()+1 ? CY : CY+1) : CY;
}

function imgUrl(q, w, h) {
  return `https://source.unsplash.com/${w||700}x${h||260}/?${encodeURIComponent(q)}&sig=${Math.random().toString(36).slice(2,6)}`;
}

function starsStr(n) {
  let s = "";
  for (let i = 0; i < Math.min(n||3, 5); i++) s += "★";
  return s;
}

function parseDurationToNights(d) {
  if (!d) return null;
  const exact = d.match(/\((\d+)\s*giorni esatti\)/);
  if (exact) return parseInt(exact[1]);
  const s = d.toLowerCase();
  if (s.includes("weekend")) return 2;
  if (s.includes("3-4")) return 4;
  if (s.includes("2 settimane")) return 14;
  if (s.includes("settimana")) return 7;
  if (s.includes("10")) return 10;
  if (s.includes("3+")) return 21;
  const num = s.match(/(\d+)/);
  return num ? parseInt(num[1]) : null;
}

// ─── DETECT iOS ──────────────────────────────────────────────────────────────
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// ─── MARKDOWN → HTML ─────────────────────────────────────────────────────────
function mdHtml(t) {
  t = t.replace(/\r/g, "");
  t = t.replace(/^# .+$/gm, "");
  const MPS = ["Mattina","MATTINA","Pomeriggio","POMERIGGIO","Sera","SERA"];
  const lns = t.split("\n"); const out = [];
  for (let li = 0; li < lns.length; li++) {
    let ln = lns[li]; let found = false;
    for (let mi = 0; mi < MPS.length; mi++) {
      const tag = MPS[mi];
      if (ln.length > tag.length && ln.slice(-tag.length) === tag && ln.slice(-tag.length-1,-tag.length) === " ") {
        const before = ln.slice(0, ln.length-tag.length-1).trim();
        if (before.length > 0) { out.push(before); out.push(""); out.push(tag.toUpperCase()); found = true; break; }
      }
    }
    if (!found) { const tr = ln.trim(); if (tr==="Mattina"||tr==="Pomeriggio"||tr==="Sera") out.push(tr.toUpperCase()); else out.push(ln); }
  }
  t = out.join("\n");
  t = t.replace(/\.[ \t]+-[ \t]+/g, ".\n- ");
  t = t.replace(/([.!?])\s+(Trasporti|Pagamenti|App utili|Prenotazioni|Budget|App|Visto|Valigia):/g, "$1\n- $2:");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t
    .replace(/\*\*(.*?)\*\*/g, `<strong style='color:${GL};font-weight:500'>$1</strong>`)
    .replace(/\*([^*\n]+?)\*/g, `<em style='color:#bbb;font-style:italic'>$1</em>`)
    .replace(/^([A-Z][A-ZÀÈÉÌÒÙ\s&'"-]+:[^\n]+\[(?:QUARTIERE|CIT))/gm, "### $1")
    .replace(/^### (.+)$/gm, `<div style='display:flex;align-items:center;gap:10px;margin:1.6rem 0 0.8rem;padding:10px 14px;background:linear-gradient(90deg,#1a1400,transparent);border-left:3px solid ${G};border-radius:0 8px 8px 0'><span style='font-family:Cormorant Garamond,serif;font-size:16px;font-weight:600;color:${GL}'>$1</span></div>`)
    .replace(/^## (.+)$/gm, `<div style='font-size:11px;letter-spacing:2px;color:${G};text-transform:uppercase;margin:1.4rem 0 0.6rem;border-top:0.5px solid #2a2a2a;padding-top:1rem;font-weight:600'>$1</div>`)
    .replace(/^(Giorno \d+(?:(?!MATTINA|POMERIGGIO|SERA).)+)$/gm, `<div style='color:${GL};font-weight:700;margin-top:1.8rem;font-size:15px;border-top:0.5px solid #2a2a2a;padding-top:1.2rem;display:block'>$1</div>`)
    .replace(/^MATTINA$/gm, `<div style='display:block;clear:both;color:${G};font-size:12px;font-weight:600;letter-spacing:1px;margin:1rem 0 0.5rem'><span style='padding:5px 12px;background:#1a1400;border-radius:6px;display:inline-block'>Mattina</span></div>`)
    .replace(/^POMERIGGIO$/gm, `<div style='display:block;clear:both;color:${G};font-size:12px;font-weight:600;letter-spacing:1px;margin:1.2rem 0 0.5rem'><span style='padding:5px 12px;background:#1a1400;border-radius:6px;display:inline-block'>Pomeriggio</span></div>`)
    .replace(/^SERA$/gm, `<div style='display:block;clear:both;color:${G};font-size:12px;font-weight:600;letter-spacing:1px;margin:1.2rem 0 0.5rem'><span style='padding:5px 12px;background:#1a1400;border-radius:6px;display:inline-block'>Sera</span></div>`)
    .replace(/^---$/gm, `<div style='height:1px;background:#2a2a2a;margin:1.4rem 0'></div>`)
    .replace(/^LINK (.+)$/gm, `<div style='margin:0.3rem 0 0.3rem 1rem;color:#6ab0ff;font-size:12px'>Prenota: $1</div>`)
    .replace(/^[*-] (.+)$/gm, (m, p1) => {
      const lb = p1.replace(/^([A-Za-z\u00c0-\u00ff\s]+:)\s*/, `<strong style='color:${GL};font-weight:600'>$1</strong> `);
      return `<div style='display:flex;align-items:flex-start;gap:8px;margin:0.35rem 0;color:#ccc;font-size:13px;line-height:1.6'><span style='color:${G};flex-shrink:0'>◆</span><span>${lb}</span></div>`;
    });
}

// ─── API CALL con fallback iOS ────────────────────────────────────────────────
async function callAI(userMsg, maxTok, onChunk) {
  maxTok = maxTok || 1000;
  const ios = isIOS();
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg, maxTokens: maxTok, stream: !ios }),
    });
    if (!res.ok) return "";

    // iOS: risposta non-streaming (JSON diretto)
    if (ios) {
      const data = await res.json();
      const text = data?.content?.[0]?.text || "";
      if (onChunk) onChunk(text);
      return text;
    }

    // Desktop/Android: streaming normale
    const rdr = res.body.getReader();
    const dc = new TextDecoder();
    let full = "";
    while (true) {
      const ck = await rdr.read();
      if (ck.done) break;
      const lines = dc.decode(ck.value).split("\n");
      for (const line of lines) {
        if (line.indexOf("data: ") === 0) {
          try {
            const jj = JSON.parse(line.slice(6));
            if (jj.delta?.text) { full += jj.delta.text; if (onChunk) onChunk(full); }
          } catch (e) {}
        }
      }
    }
    return full;
  } catch (e) { return ""; }
}

// ─── LOGISTICA: ottimizzazione percorso auto ──────────────────────────────────
function logisticaPrompt(departure, dest, transport) {
  const isAuto = transport && (transport.toLowerCase().includes("auto") || transport.toLowerCase().includes("noleggio"));
  if (!isAuto) return "";
  return `\n\nOTTIMIZZAZIONE LOGISTICA OBBLIGATORIA (viaggio in ${transport}):
Ordina le tappe geograficamente come un percorso "a goccia":
1. Parti da ${departure}
2. Raggiungi prima le mete PIÙ LONTANE da ${departure}
3. Prosegui verso mete intermedie
4. Concludi con le tappe già sulla via del ritorno verso ${departure}
Esempio corretto (Roma → Umbria): Spoleto (più lontana) → Assisi → Perugia → Orvieto (già verso Roma)
NON suggerire un percorso casuale. Il viaggio deve formare un arco geografico efficiente andata/ritorno.`;
}

// ─── COMPONENTE HCard (DEVE stare FUORI da PlannerPage) ──────────────────────
function HCard({ h, bi, city, selKeys, setSelKeys, selNames, setSelNames, budget }) {
  const nm = h.name || h.nome || "Hotel";
  const st = h.stars || h.stelle || 3;
  const zn = h.zone || h.zona || h.area || "centro";
  const pr = h.price || h.prezzo || "";
  const wh = h.why || h.perche || "";
  const ps = h.pros || h.punti_forza || [];
  const bs = h.best || h.miglior_rapporto || false;
  const ur = h.url || h.link || h.booking_link || `https://www.booking.com/search.html?ss=${encodeURIComponent(city)}`;
  const sk = `${bi}-${nm}`;
  const isSel = selKeys.includes(sk);

  return (
    <div
      className={`hcard${isSel ? " sel" : ""}`}
      onClick={() => {
        const ck = [...selKeys], cn = [...selNames];
        const ex = ck.findIndex(k => k.startsWith(`${bi}-`));
        if (ex >= 0) { ck[ex] = sk; cn[ex] = `${city}: ${nm}`; }
        else { ck.push(sk); cn.push(`${city}: ${nm}`); }
        setSelKeys(ck); setSelNames(cn);
      }}
    >
      {bs && <div style={{display:"inline-block",background:"#1a1400",border:`.5px solid ${G}`,borderRadius:10,padding:"2px 10px",fontSize:10,color:G,marginBottom:6}}>★ Miglior rapporto qualità/prezzo</div>}
      <div style={{fontSize:15,color:GL,fontWeight:500,marginBottom:4}}>{nm} {starsStr(st)}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
        {[zn, pr, budget].filter(Boolean).map(tt => (
          <span key={tt} style={{background:"#1a1a1a",border:".5px solid #333",borderRadius:12,padding:"3px 10px",fontSize:11,color:"#aaa"}}>{tt}</span>
        ))}
      </div>
      {wh && <div style={{fontSize:12,color:"#bbb",marginBottom:6}}>{wh}</div>}
      {ps.length > 0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
          {ps.map((pf, pi) => <span key={pi} style={{background:"#1a1a1a",border:".5px solid #333",borderRadius:10,padding:"3px 9px",fontSize:11,color:"#bbb"}}>✓ {pf}</span>)}
        </div>
      )}
      <a href={ur} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#6ab0ff",textDecoration:"none"}} onClick={e => e.stopPropagation()}>
        🔗 Prenota su Booking.com
      </a>
    </div>
  );
}

// ─── COMPONENTI UI ────────────────────────────────────────────────────────────
function Dots({ text }) {
  return (
    <div style={{display:"flex",gap:8,alignItems:"center",padding:".8rem 0"}}>
      <div className="dot"/><div className="dot"/><div className="dot"/>
      <span style={{color:G,fontSize:13}}>{text}</span>
    </div>
  );
}

function ABox({ text, loading, lt, style: extraStyle }) {
  return (
    <div className="aib" style={extraStyle||{}}>
      {loading && !text
        ? <Dots text={lt||"Elaboro..."}/>
        : <div dangerouslySetInnerHTML={{__html: mdHtml(text||"") + (loading ? "<span class='cur'></span>" : "")}}/>
      }
    </div>
  );
}

function Chip({ label, sel, onClick }) {
  return <div className={`chip${sel?" sel":""}`} onClick={onClick}>{label}</div>;
}

function Btn({ label, ghost, style: s, onClick, disabled }) {
  return (
    <button className={`btn ${ghost?"btno":"btng"}`} style={s||{}} onClick={onClick} disabled={disabled||false}>
      {label}
    </button>
  );
}

function YN({ icon, title, sub, onClick }) {
  return (
    <div className="ync" onClick={onClick}>
      <div style={{fontSize:26,marginBottom:8}}>{icon}</div>
      <div style={{fontSize:14,color:GL,fontWeight:500,marginBottom:4}}>{title}</div>
      <div style={{fontSize:11,color:"#666"}}>{sub}</div>
    </div>
  );
}

function Badge({ text }) {
  return <div className="badge">{text}</div>;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PlannerPage() {
  const { user } = useAuth();

  // Step & navigazione
  const [step, setStep] = useState(1);

  // Dati viaggio
  const [dest, setDest] = useState("");
  const [period, setPeriod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tripYear, setTripYear] = useState(CY);
  const [travType, setTravType] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childAges, setChildAges] = useState([]);
  const [duration, setDuration] = useState("");
  const [style, setStyle] = useState("");
  const [budget, setBudget] = useState("");
  const [departure, setDeparture] = useState("");
  const [fmt, setFmt] = useState("mps");
  const [mods, setMods] = useState("");
  const [wantsFood, setWantsFood] = useState(null);
  const [inp, setInp] = useState("");
  const [transport, setTransport] = useState(null);
  const [distClose, setDistClose] = useState(null);

  // Testi AI
  const [aiPer, setAiPer] = useState("");       const [aiPerLoad, setAiPerLoad] = useState(false);
  const [planText, setPlanText] = useState("");  const [planLoad, setPlanLoad] = useState(false);
  const [revText, setRevText] = useState("");    const [revLoad, setRevLoad] = useState(false);
  const [draftText, setDraftText] = useState(""); const [draftLoad, setDraftLoad] = useState(false);
  const [foodText, setFoodText] = useState("");  const [foodLoad, setFoodLoad] = useState(false);
  const [finText, setFinText] = useState("");    const [finLoad, setFinLoad] = useState(false);

  // Hotel
  const [hotelBases, setHotelBases] = useState([]);
  const [hotelLoad, setHotelLoad] = useState(false);
  const [selKeys, setSelKeys] = useState([]);
  const [selNames, setSelNames] = useState([]);
  const [selStr, setSelStr] = useState("");
  const [custH, setCustH] = useState("");
  const [showCust, setShowCust] = useState(false);
  const [exclHotels, setExclHotels] = useState([]);
  const [hotelNotes, setHotelNotes] = useState("");
  const [showHotelNotes, setShowHotelNotes] = useState(false);

  // Guide
  const [guide, setGuide] = useState(null);
  const [guideDays, setGuideDays] = useState("Tutto il viaggio");
  const [guideLang, setGuideLang] = useState("Italiano");
  const [guideCustom, setGuideCustom] = useState("");

  // Immagini
  const [dImg, setDImg] = useState("");
  const [gal, setGal] = useState([]);

  // Refs
  const finRef = useRef(null);
  const draftRef = useRef(null);
  const finLoadRef = useRef(false);
  const draftLoadRef = useRef(false);
  // FIX Android: ref per la barra progress
  const progBarRef = useRef(null);

  // FIX Android: scroll automatico della barra step per portare il cerchio attivo in vista
  useEffect(() => {
    if (!progBarRef.current) return;
    const bar = progBarRef.current;
    // Trova il cerchio attivo
    const active = bar.querySelector(".sc.act");
    if (active) {
      const barRect = bar.getBoundingClientRect();
      const elRect = active.getBoundingClientRect();
      const scrollLeft = bar.scrollLeft + (elRect.left - barRect.left) - (barRect.width / 2) + (elRect.width / 2);
      bar.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [step]);

  useEffect(() => {
    if (finLoad) { finLoadRef.current = true; }
    if (!finLoad && finLoadRef.current) { finLoadRef.current = false; if (finRef.current) finRef.current.scrollTop = 0; }
  }, [finLoad]);

  useEffect(() => {
    if (draftLoad) { draftLoadRef.current = true; }
    if (!draftLoad && draftLoadRef.current) { draftLoadRef.current = false; if (draftRef.current) draftRef.current.scrollTop = 0; }
  }, [draftLoad]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function trav() {
    const b = `${adults} adult${adults > 1 ? "i" : "o"}`;
    const k = children > 0 ? `, ${children} bambin${children > 1 ? "i" : "o"} (età: ${childAges.filter(Boolean).join(", ")})` : "";
    return b + k + " - " + travType;
  }

  function goBack() { if (step > 1) setStep(step - 1); }

  // ── Distanza ───────────────────────────────────────────────────────────────
  function checkDistance() {
    const COORDS = {
      "roma":[41.9,12.5],"milan":[45.5,9.2],"milano":[45.5,9.2],"napoli":[40.8,14.3],
      "firenze":[43.8,11.2],"venezia":[45.4,12.3],"torino":[45.1,7.7],"bologna":[44.5,11.3],
      "genova":[44.4,8.9],"palermo":[38.1,13.4],"bari":[41.1,16.9],"catania":[37.5,15.1],
      "verona":[45.4,11.0],"trieste":[45.7,13.8],"parma":[44.8,10.3],"modena":[44.6,10.9],
      "padova":[45.4,11.9],"bergamo":[45.7,9.7],"brescia":[45.5,10.2],"lecce":[40.4,18.2],
      "paris":[48.9,2.3],"parigi":[48.9,2.3],"londra":[51.5,-0.1],"london":[51.5,-0.1],
      "berlin":[52.5,13.4],"berlino":[52.5,13.4],"madrid":[40.4,-3.7],"barcellona":[41.4,2.2],
      "barcelona":[41.4,2.2],"amsterdam":[52.4,4.9],"vienna":[48.2,16.4],"praga":[50.1,14.4],
      "budapest":[47.5,19.1],"bruxelles":[50.8,4.4],"zurigo":[47.4,8.5],"ginevra":[46.2,6.1],
      "monaco":[48.1,11.6],"munich":[48.1,11.6],"francoforte":[50.1,8.7],"lisbona":[38.7,-9.1],
      "atene":[37.9,23.7],"istanbul":[41.0,29.0],"cairo":[30.0,31.2],"dubai":[25.2,55.3],
      "newyork":[40.7,-74.0],"losangeles":[34.1,-118.2],"chicago":[41.9,-87.6],
      "tokyo":[35.7,139.7],"osaka":[34.7,135.5],"bangkok":[13.8,100.5],"singapore":[1.3,103.8],
      "sydney":[-33.9,151.2],"nairobi":[-1.3,36.8],"kenya":[-0.0,37.9],"miami":[25.8,-80.2],
      "toronto":[43.7,-79.4],"umbria":[42.9,12.7],"toscana":[43.4,11.2],"sicilia":[37.6,14.0],
      "sardegna":[40.1,9.0],"calabria":[38.9,16.5],"puglia":[40.8,17.2],"campania":[40.8,14.8],
    };
    function norm(s) { return (s||"").toLowerCase().trim().replace(/\s+/g,"").replace(/[^a-zàèéìòù]/g,""); }
    function getC(place) {
      const p = norm(place);
      if (COORDS[p]) return COORDS[p];
      for (const k in COORDS) { if (p.includes(k) || k.includes(p)) return COORDS[k]; }
      return null;
    }
    function hav(c1, c2) {
      const R=6371, dLat=(c2[0]-c1[0])*Math.PI/180, dLon=(c2[1]-c1[1])*Math.PI/180;
      const a = Math.sin(dLat/2)**2 + Math.cos(c1[0]*Math.PI/180)*Math.cos(c2[0]*Math.PI/180)*Math.sin(dLon/2)**2;
      return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    }
    const c1 = getC(departure), c2 = getC(dest);
    if (c1 && c2) { setDistClose(hav(c1,c2) < 1200); }
    else { setDistClose(true); }
  }

  // ── Conferma date ──────────────────────────────────────────────────────────
  function confirmDates() {
    if (!startDate || !endDate) return;
    const d1 = new Date(startDate), d2 = new Date(endDate);
    const diffDays = Math.round((d2-d1)/86400000);
    const monthName = MONTHS[d1.getMonth()];
    setPeriod(monthName);
    setTripYear(d1.getFullYear());
    let durLabel = "3+ settimane";
    if (diffDays <= 4) durLabel = "3-4 giorni";
    else if (diffDays <= 8) durLabel = "1 settimana";
    else if (diffDays <= 11) durLabel = "10 giorni";
    else if (diffDays <= 15) durLabel = "2 settimane";
    setDuration(`${durLabel} (${diffDays} giorni esatti)`);
    setStep(3);
  }

  // ── Gen Piano ──────────────────────────────────────────────────────────────
  async function genPlan(dep) {
    setStep(8); setPlanLoad(true); setPlanText("");
    const y = detectYear(period); setTripYear(y);
    const logistica = logisticaPrompt(dep, dest, transport);
    const msg =
      `Crea un piano visivo dell'itinerario per: ${dest}, ${period} ${y}, ${duration}${duration.includes("Weekend") ? " (solo 2-3 giorni, max 2 destinazioni vicine)" : ""}, ${style}, ${trav()}, budget ${budget}.\n\n` +
      `REGOLA CRITICA SUL TIPO:\n` +
      `- Usa [QUARTIERE] se ${dest} è una SINGOLA CITTÀ (es. Parigi, Roma, Tokyo, New York, Londra, Barcellona, Amsterdam...)\n` +
      `- Usa [CITTA] SOLO se l'itinerario tocca più CITTÀ DIVERSE (es. Italia = Roma+Firenze+Venezia)\n` +
      `- Quartieri, arrondissement, zone, aree di una stessa città = SEMPRE [QUARTIERE]\n\n` +
      `FORMATO OBBLIGATORIO per ogni blocco:\n### NOME (N giorni) [TIPO]\n- **Cosa vedere**: luogo - perché\n- **Cosa fare**: attività - descrizione\n- **Da non perdere**: esperienza - perché\n\n` +
      `REGOLE:\n1. Solo ### per i titoli\n2. Niente tabelle (pipe |)\n3. Inizia subito col primo ###\n4. La somma dei giorni deve corrispondere a: ${duration}\n5. Nomi reali, scrivi in italiano\n` +
      logistica +
      `\n\nESEMPIO singola città (Parigi, 5gg):\n### LOUVRE & MARAIS (2 giorni) [QUARTIERE]\n- **Cosa vedere**: Museo del Louvre - capolavori imperdibili\n### MONTMARTRE & OPERA (1 giorno) [QUARTIERE]\n- **Cosa vedere**: Sacre-Coeur - vista panoramica\n### EIFFEL & SAINT-GERMAIN (2 giorni) [QUARTIERE]\n- **Cosa vedere**: Torre Eiffel - simbolo della città\n\n` +
      `ESEMPIO più città (Costa Azzurra, 7gg):\n### NIZZA (3 giorni) [CITTA]\n- **Cosa vedere**: Promenade des Anglais\n### MONACO (2 giorni) [CITTA]\n- **Cosa vedere**: Casinò di Monte Carlo\n### CANNES (2 giorni) [CITTA]\n- **Cosa vedere**: La Croisette`;
    await callAI(msg, 1800, t => setPlanText(t));
    setPlanLoad(false);
    checkDistance();
  }

  // ── Gen Piano Rivisto ──────────────────────────────────────────────────────
  async function genRevised() {
    setStep(9); setRevLoad(true); setRevText(""); setMods("");
    const y = tripYear || detectYear(period);
    const logistica = logisticaPrompt(departure, dest, transport);
    const msg =
      `Piano originale per ${dest} (${period} ${y}):\n${planText}\n\n` +
      `Modifiche richieste: ${mods}\n\n` +
      `Rielabora con STESSO FORMATO OBBLIGATORIO:\n### NOME (N giorni) [TIPO]\n- **Cosa vedere**: luogo - perché\n- **Cosa fare**: attività - descrizione\n- **Da non perdere**: esperienza - perché\n\n` +
      `REGOLE: solo ###, niente tabelle, includi TUTTE le città originali più quelle aggiunte, somma giorni = ${duration}. Scrivi in italiano.` +
      logistica;
    await callAI(msg, 2000, t => setRevText(t));
    setRevLoad(false);
  }

  // ── Extract Clusters ───────────────────────────────────────────────────────
  function extractClusters(text) {
    const lines = text.split("\n");
    let out = [], cur = null;
    for (const l of lines) {
      if (l.trim().slice(0,3) === "###") {
        if (cur) out.push(cur);
        const t = l.replace(/^#+\s*/,"");
        const typeMatch = t.match(/\[(QUARTIERE|CITTA|CITTÀ)\]/i);
        const type = typeMatch ? (typeMatch[1].toUpperCase().includes("QUART") ? "quartiere" : "citta") : null;
        const nm = t.replace(/\[.*?\]/,"").replace(/\(.*\)/,"").trim();
        const dg = t.match(/\((\d+)/);
        cur = { name: nm, days: dg ? parseInt(dg[1]) : null, type };
      }
    }
    if (cur) out.push(cur);
    if (out.length === 0) out = [{ name: dest, days: null, type: null }];

    const totalNights = parseDurationToNights(duration);
    const hasQuartiere = out.some(o => o.type === "quartiere");
    if (hasQuartiere) return [{ name: dest, days: totalNights||2, type: "citta", isSingleCity: true }];

    let sumDays = out.reduce((a,o) => a+(o.days||0), 0);
    if (totalNights && (sumDays === 0 || sumDays !== totalNights)) {
      const n = out.length, base = Math.floor(totalNights/n), rem = totalNights - base*n;
      out = out.map((o,i) => ({ ...o, days: Math.max(1, base + (i < rem ? 1 : 0)) }));
    }
    return out;
  }

  // ── Fetch Hotels ───────────────────────────────────────────────────────────
  async function fetchHotelsForCity(cityName, bdg) {
    const hint = bdg === "luxury"
      ? "5 stelle lusso: Four Seasons, Rocco Forte, Belmond, Aman, Rosewood. Fascia 400+ eur/notte."
      : bdg === "economico"
      ? "2-3 stelle o B&B boutique con Booking 8+. Fascia 60-120 eur/notte."
      : "3-4 stelle: NH Hotels, Starhotels, Boscolo, Una Hotels, Marriott Courtyard. Fascia 120-250 eur/notte.";
    const msg =
      `Proponi 3 hotel REALI esistenti a ${cityName}, fascia ${bdg} (${hint}).\n` +
      `Periodo: ${period} ${tripYear||CY}. Viaggiatori: ${trav()}.\n` +
      `SOLO fascia ${bdg}. Nomi propri reali. Il migliore qualità/prezzo ha best:true.\n` +
      `Rispondi SOLO con JSON array:\n` +
      `[{"name":"Nome Hotel Reale","stars":4,"zone":"quartiere","price":"euro150/notte","why":"perché sceglierlo per ${cityName}","pros":["p1","p2","p3"],"best":true,"url":"https://www.booking.com/search.html?ss=${encodeURIComponent(cityName)}"}]`;
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
    } catch (e) {}
    return null;
  }

  // ── Gen Hotels ─────────────────────────────────────────────────────────────
  async function genHotels(append) {
    setStep(10); setHotelLoad(true);
    if (!append) setHotelBases([]);
    const activeText = revText || planText;
    const clusters = extractClusters(activeText);
    const starsQ = budget === "luxury" ? "&stars=5" : budget === "economico" ? "&stars=2" : "&stars=4";
    let bases = append ? JSON.parse(JSON.stringify(hotelBases)) : [];
    try {
      for (const cl of clusters) {
        const searchCity = cl.isSingleCity ? dest : cl.name;
        let hotels = await fetchHotelsForCity(searchCity, budget);
        if (!hotels) {
          hotels = [{ name:`Cerca hotel ${budget} a ${searchCity}`, stars: budget==="luxury"?5:budget==="economico"?3:4,
            zone:"centro", price:"vedi Booking", why:`Clicca per hotel ${budget} disponibili a ${searchCity}`,
            pros:["prezzi aggiornati","recensioni reali","cancellazione gratuita"], best:true,
            url:`https://www.booking.com/search.html?ss=${encodeURIComponent(searchCity)}${starsQ}` }];
        }
        const existIdx = bases.findIndex(b => b.city === cl.name);
        if (existIdx >= 0) {
          bases[existIdx].hotels = append ? bases[existIdx].hotels.concat(hotels) : hotels;
        } else {
          bases.push({ city: cl.name, days: cl.days||2, hotels });
        }
        setHotelBases(JSON.parse(JSON.stringify(bases)));
      }
    } catch(e) { console.error("genHotels error:", e); }
    setHotelLoad(false);
  }

  // ── Gen Hotels Revised ─────────────────────────────────────────────────────
  async function genHotelsRevised() {
    setHotelLoad(true);
    const totalNights = parseDurationToNights(duration);
    const basesDesc = hotelBases.map(b => `- ${b.city}: ${b.days} notti`).join("\n");
    const msg = `L'utente sta pianificando un viaggio a ${dest} (${duration}, ${period} ${tripYear}).\nPiano attuale degli alloggi:\n${basesDesc}\n\nNote e preferenze dell'utente: ${hotelNotes}\n\nRielabora la lista delle basi di alloggio tenendo conto delle note. Totale notti: ${totalNights}. Puoi ridistribuire le notti, aggiungere basi, eliminarne alcune, o sostituirle. Rispondi SOLO con un JSON array nel formato: [{"city":"Nome Città","days":2,"note":"perché"}] La somma di tutti i days deve essere ${totalNights}. Niente testo aggiuntivo.`;
    const txt = await callAI(msg, 800, null);
    let newBases = null;
    try { const m = txt.match(/\[[\s\S]*\]/); if (m) { const arr = JSON.parse(m[0]); if (Array.isArray(arr) && arr.length > 0) newBases = arr; } } catch(e) {}
    if (!newBases) { setHotelLoad(false); return; }
    const starsQ = budget === "luxury" ? "&stars=5" : budget === "economico" ? "&stars=2" : "&stars=4";
    let bases = [];
    for (const nb of newBases) {
      let hotels = await fetchHotelsForCity(nb.city, budget);
      if (!hotels) {
        hotels = [{ name:`Cerca hotel ${budget} a ${nb.city}`, stars:budget==="luxury"?5:budget==="economico"?3:4,
          zone:"centro", price:"vedi Booking", why:nb.note||"Hotel consigliato",
          pros:["prezzi aggiornati","recensioni reali","cancellazione gratuita"], best:true,
          url:`https://www.booking.com/search.html?ss=${encodeURIComponent(nb.city)}${starsQ}` }];
      }
      bases.push({ city:nb.city, days:nb.days, note:nb.note||"", hotels });
      setHotelBases(JSON.parse(JSON.stringify(bases)));
    }
    setSelKeys([]); setSelNames([]); setSelStr("");
    setShowHotelNotes(false); setHotelNotes("");
    setHotelLoad(false);
  }

  // ── Gen Draft ──────────────────────────────────────────────────────────────
  async function genDraft(hotel) {
    setStep(11); setDraftLoad(true); setDraftText("");
    const y = tripYear || detectYear(period);
    const activeText = (revText || planText).slice(0, 1500);
    const logistica = logisticaPrompt(departure, dest, transport);
    const msg =
      `Itinerario bozza per ${dest}, ${period} ${y}, ${duration}, ${style}, budget ${budget}, alloggio ${hotel}, ${trav()}.\n` +
      `Piano visite:\n${activeText}\n\n` +
      `FORMATO OBBLIGATORIO, ogni elemento su riga separata:\n\n` +
      `**Giorno 1 - Titolo del giorno**\n\nMATTINA\n- Attività 1 (tempo percorrenza)\n- Attività 2 (tempo percorrenza)\n\nPOMERIGGIO\n- Attività 1 (tempo percorrenza)\n- Attività 2 (tempo percorrenza)\n\nSERA\n- Attività 1\n\n---\n\n` +
      `Ripeti per ogni giorno. REGOLE:\n1. MATTINA/POMERIGGIO/SERA su riga isolata, maiuscolo\n2. Vai a capo prima delle attività\n3. Ogni attività inizia con - su riga separata\n4. Niente testo descrittivo lungo attaccato alle sezioni\n5. Riga vuota tra sezioni\n` +
      logistica + "\n\n" +
      `## LOGISTICA GENERALE\nOBBLIGATORIO: ogni punto su riga separata che inizia con -. NON scrivere testo continuo.\n- Trasporti: [come spostarsi]\n- Pagamenti: [carta o contanti]\n- App utili: [2-3 app]\n- Prenotazioni: [cosa prenotare]\n- Budget: [stima giornaliera]\n` +
      `NO orari precisi. Ottimizza spostamenti per posizione alloggio. Scrivi in italiano.`;
    await callAI(msg, 8000, t => setDraftText(t));
    setDraftLoad(false);
  }

  // ── Gen Food ───────────────────────────────────────────────────────────────
  async function genFood() {
    setStep(13); setFoodLoad(true); setFoodText("");
    const y = tripYear || detectYear(period);
    const msg =
      `Suggerisci ristoranti per ogni giorno del viaggio a ${dest} (${period} ${y}), budget ${budget}, ${trav()}, alloggio ${selStr}.\n` +
      `## PREZZI MEDI A ${dest.toUpperCase()}\n(costo medio a persona per tipologia)\n` +
      `## DOVE MANGIARE - GIORNO PER GIORNO\nPer ogni giorno: pranzo e cena con nome locale, tipo, zona, prezzo, specialità. LINK url\n` +
      `## ESPERIENZE CULINARIE DA NON PERDERE\n3-4 esperienze con LINK url. Scrivi in italiano.`;
    await callAI(msg, 3000, t => setFoodText(t));
    setFoodLoad(false);
  }

  // ── Gen Final ──────────────────────────────────────────────────────────────
  async function genFinal(f) {
    setStep(15); setFinLoad(true); setFinText("");
    setDImg(imgUrl(dest, 780, 260));
    setGal([imgUrl(`${dest} landscape`), imgUrl(`${dest} food`), imgUrl(`${dest} hotel`)]);
    const y = tripYear || detectYear(period);
    const isMPS = f !== "orario";
    const gdStr = guide && guide !== false
      ? `\n## GUIDE TURISTICHE\nGiorni: ${guide.days} - Lingua: ${guide.language}\n2-3 servizi con LINK url\n`
      : "";
    const logistica = logisticaPrompt(departure, dest, transport);
    const trasportoSection = (() => {
      const tr = transport || "";
      const tl = tr.toLowerCase();
      if (tl.includes("auto")) return `## TRASPORTO\nViaggio in ${tr} da ${departure} a ${dest}. Percorso ottimizzato a goccia: prima le mete più lontane, poi quelle già sulla via del ritorno. Autostrade consigliate, soste e parcheggi in centro.\n`;
      if (tl.includes("treno")) return `## TRASPORTO\nViaggio in treno da ${departure} a ${dest}. Trenitalia o Italo: orari, prezzi, stazione di arrivo.\nLINK https://www.trenitalia.com\n`;
      if (tl.includes("bus")) return `## TRASPORTO\nViaggio in bus da ${departure} a ${dest}. Principali compagnie, fermate, orari.\n`;
      return `## VOLO CONSIGLIATO\nRotta ${departure} - ${dest} ${period} ${y}: compagnie, prezzi, miglior opzione.\nLINK https://www.google.com/travel/flights?q=${encodeURIComponent(`${departure} ${dest}`)}\nLINK https://www.skyscanner.it/voli-per/${encodeURIComponent(dest.toLowerCase())}\n`;
    })();
    const msg =
      `Itinerario completo per ${dest}, ${period} ${y}, ${duration}, ${style}, budget ${budget}, ${trav()}, partenza ${departure}, alloggio ${selStr}.\n` +
      `Formato giorni: ${isMPS
        ? "Dividi ogni giorno in tre blocchi: MATTINA / POMERIGGIO / SERA (su righe separate maiuscolo). Elenca le attività come bullet - sotto ogni blocco."
        : `SCHEDULE ORE PER ORA: ogni attività deve avere un orario preciso. Esempio:\nGiorno 1 - Titolo\n07:00 - Partenza da ${departure}\n09:30 - Arrivo e check-in hotel\n10:00 - Visita al sito X (durata: 1.5 ore)\n12:00 - Pranzo al ristorante Y\n14:00 - Visita quartiere / museo\n17:00 - Aperitivo\n20:00 - Cena\nOgni riga deve avere ORARIO - ATTIVITÀ. Includi tempi di spostamento reali, mezzi, durate stimate.`
      }. Separa giorni con ---. Scrivi in italiano con ## per sezioni:\n` +
      `## PRESENTAZIONE DELLA DESTINAZIONE\n` +
      trasportoSection +
      `## ALLOGGIO\n${selStr}: zona e perché ottimale\nLINK https://www.booking.com/search.html?ss=${encodeURIComponent(dest)}\n` +
      `## ITINERARIO GIORNO PER GIORNO\n` +
      `SEGUI ESATTAMENTE questa bozza approvata, giorno per giorno, aggiungendo solo dettagli e link:\n` +
      draftText.slice(0, 2500) +
      `\n\nPer ogni attività aggiungi: LINK url-biglietti${wantsFood ? " e LINK url-ristorante" : ""}\n` +
      logistica +
      gdStr +
      `## ESPERIENZE LOCALI E CUCINA\n3-4 con LINK url\n` +
      `## CONSIGLI PRATICI\n- Trasporti\n- Pagamenti\n- App utili\n- Visto\n- Valigia`;
    try { await callAI(msg, 8000, t => setFinText(t)); }
    catch (e) { setFinText(`Errore: ${e.message}`); }

    // Salvataggio Supabase
    if (user) {
      try {
        await supabase.from("itineraries").insert({
          user_id: user.id, destination: dest, period, trip_year: tripYear,
          duration, style, budget, departure, trav_type: travType,
          adults, children, hotels: selStr,
          itinerary_text: finText, food_text: foodText,
        });
      } catch (e) { console.error("Supabase save error:", e); }
    }
    setFinLoad(false);
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetAll() {
    setStep(1); setDest(""); setPeriod(""); setStartDate(""); setEndDate(""); setTripYear(CY);
    setTravType(""); setAdults(2); setChildren(0); setChildAges([]);
    setDuration(""); setStyle(""); setBudget(""); setDeparture(""); setFmt("mps");
    setMods(""); setWantsFood(null); setInp(""); setTransport(null); setDistClose(null);
    setAiPer(""); setPlanText(""); setRevText(""); setDraftText(""); setFoodText(""); setFinText("");
    setHotelBases([]); setSelKeys([]); setSelNames([]); setSelStr(""); setExclHotels([]);
    setHotelNotes(""); setShowHotelNotes(false); setGuide(null); setShowCust(false); setCustH("");
  }

  // ── Links finali ───────────────────────────────────────────────────────────
  const lks = [
    { l:"Google Flights", s:`Voli da ${departure}`, h:`https://www.google.com/travel/flights?q=${encodeURIComponent(`${departure} ${dest}`)}` },
    { l:"Skyscanner", s:"Confronta voli", h:`https://www.skyscanner.it/voli-per/${encodeURIComponent((dest||"").toLowerCase().replace(/ /g,"-"))}` },
    { l:"Booking.com", s:`Hotel a ${dest}`, h:`https://www.booking.com/search.html?ss=${encodeURIComponent(dest)}&group_adults=${adults}` },
    { l:"TripAdvisor", s:"Ristoranti e attività", h:`https://www.tripadvisor.it/Search?q=${encodeURIComponent(dest)}` },
    { l:"Google Maps", s:"Esplora", h:`https://www.google.com/maps/search/${encodeURIComponent(`cose da fare ${dest}`)}` },
    { l:"Viator", s:"Tour ed esperienze", h:`https://www.viator.com/search/${encodeURIComponent(dest)}` },
  ];

  const metaTags = [period, travType, `${adults} adult${adults>1?"i":"o"}${children>0?` + ${children} bambin${children>1?"i":"o"}`:""  }`, duration, style, budget].filter(Boolean);

  // ── Draft clusters per riepilogo guide ────────────────────────────────────
  const draftClusters = (() => {
    const lines = (draftText||"").split("\n");
    let giorni = [], cur = null;
    for (const l of lines) {
      const lt = l.trim();
      if (lt.match(/^\*{0,2}giorno\s*\d+/i)) {
        if (cur) giorni.push(cur);
        cur = { title: lt.replace(/\*\*/g,"").trim(), items: [] };
      } else if (cur && (lt.startsWith("-")||lt.startsWith("*")) && lt.length > 2) {
        const item = lt.slice(1).trim().replace(/\*\*/g,"");
        const lowIt = item.toLowerCase();
        if (item.length > 3 && !lowIt.includes("trasport") && !lowIt.includes("pagament") && !lowIt.includes("budget") && !lowIt.includes("app utili") && !lowIt.includes("prenotazion")) {
          let syn = item.replace(/\s*\([^)]*\)\s*$/, "").trim();
          const cutIdx = syn.search(/\s[-–]\s|:\s|,\s(per|con|dove|che|e\s)/i);
          if (cutIdx > 10) syn = syn.slice(0, cutIdx);
          if (syn.length > 55) syn = syn.slice(0, 52).trim() + "...";
          if (cur.items.length < 4) cur.items.push(syn);
        }
      }
    }
    if (cur) giorni.push(cur);
    return giorni;
  })();

  // ── Progress bar ───────────────────────────────────────────────────────────
  const progressBar = STEPS.map((label, si) => {
    const snum = si + 1;
    return [
      <div className="sn" key={snum}>
        <div className={`sc${step===snum?" act":step>snum?" dn":""}`}>{step>snum?"✓":snum}</div>
        <div className={`sl${step===snum?" act":""}`}>{label}</div>
      </div>,
      si < STEPS.length-1 && <div className={`cn${step>snum?" dn":""}`} key={`c${snum}`}/>,
    ];
  }).flat().filter(Boolean);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="wrap">
      {/* LOGO */}
      <div className="logo">
        <div className="li">✈</div>
        <div className="lt">Travel <span>AI</span> Agent</div>
      </div>
      <div className="sub">IL TUO CONSULENTE DI VIAGGIO PERSONALE</div>
      <div className="dl"/>

      {/* PROGRESS BAR — FIX Android: ref + scrollIntoView via useEffect */}
      {step <= 14 && (
        <div className="prog" ref={progBarRef}>
          {progressBar}
        </div>
      )}

      {/* BACK BUTTON */}
      {step > 1 && step <= 14 && (
        <button className="back" onClick={goBack}>← Torna indietro</button>
      )}

      {/* ── STEP 1: DESTINAZIONE ── */}
      {step === 1 && (
        <div className="card">
          <div className="tt">🌍 Dove vuoi andare?</div>
          <div className="ht">Inserisci una destinazione, paese o regione</div>
          <div className="ir">
            <input className="inp" placeholder="Es. Italia, Giappone, Kenya..."
              value={inp} onChange={e => setInp(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter" && inp.trim()) { const d=inp.trim(); setDest(d); setInp(""); setAiPerLoad(true); setStep(2); callAI(`In 3-4 righe in italiano, i periodi migliori per visitare ${d} nel ${CY} o ${CY+1} (clima, eventi, affluenza). Usa bullet -.`, 600, t => setAiPer(t)).then(() => setAiPerLoad(false)); }}}
            />
            <button className="go" onClick={() => { if (inp.trim()) { const d=inp.trim(); setDest(d); setInp(""); setAiPerLoad(true); setStep(2); callAI(`In 3-4 righe in italiano, i periodi migliori per visitare ${d} nel ${CY} o ${CY+1} (clima, eventi, affluenza). Usa bullet -.`, 600, t => setAiPer(t)).then(() => setAiPerLoad(false)); }}}>›</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: PERIODO ── */}
      {step === 2 && (
        <div className="card">
          <div className="tt">📅 Quando vuoi partire?</div>
          <div className="ht">Stagionalità per {dest}</div>
          <ABox text={aiPer} loading={aiPerLoad} lt="Analizzo stagionalità..."/>
          <div style={{marginBottom:"1.2rem"}}>
            <div style={{fontSize:12,color:G,marginBottom:8,fontWeight:600}}>🗓️ Scegli le date esatte (opzionale)</div>
            <div className="dpick">
              <div>
                <div style={{fontSize:11,color:"#777",marginBottom:4}}>Partenza</div>
                <input type="date" className="inp" style={{width:"100%",colorScheme:"dark"}} value={startDate} onChange={e => setStartDate(e.target.value)}/>
              </div>
              <div>
                <div style={{fontSize:11,color:"#777",marginBottom:4}}>Ritorno</div>
                <input type="date" className="inp" style={{width:"100%",colorScheme:"dark"}} value={endDate} onChange={e => setEndDate(e.target.value)}/>
              </div>
            </div>
            {startDate && endDate && <Btn label="Conferma date →" style={{marginTop:10}} onClick={confirmDates}/>}
          </div>
          <div style={{fontSize:12,color:"#666",margin:"1rem 0 .8rem",borderTop:`.5px solid ${BRD}`,paddingTop:"1rem"}}>Oppure scegli un periodo generico</div>
          <div className="chips">
            {MONTHS.map(mo => <Chip key={mo} label={mo} onClick={() => { setPeriod(mo); setTripYear(detectYear(mo)); setStep(3); }}/>)}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:10}}>
            {SEASONS.map(s => <Chip key={s} label={s} onClick={() => { setPeriod(s); setStep(3); }}/>)}
          </div>
        </div>
      )}

      {/* ── STEP 3: VIAGGIATORI ── */}
      {step === 3 && (
        <div className="card">
          <div className="tt">👥 Chi viaggia?</div>
          <div className="ht">Tipo di gruppo</div>
          <div className="chips" style={{marginBottom:"1.2rem"}}>
            {TTYPES.map(t => <Chip key={t} label={t} sel={travType===t} onClick={() => setTravType(t)}/>)}
          </div>
          {(travType==="Gruppo di amici"||travType==="Famiglia"||travType==="Gruppo con bambini") && (
            <div className="sep">
              <div className="slbl">Adulti</div>
              <div className="nr">
                <button className="nb" onClick={() => setAdults(Math.max(1,adults-1))}>−</button>
                <span className="nv">{adults}</span>
                <button className="nb" onClick={() => setAdults(adults+1)}>+</button>
              </div>
            </div>
          )}
          {(travType==="Famiglia"||travType==="Gruppo con bambini") && (
            <div className="sep">
              <div className="slbl">Bambini</div>
              <div className="nr">
                <button className="nb" onClick={() => { setChildren(Math.max(0,children-1)); setChildAges(p => p.slice(0,-1)); }}>−</button>
                <span className="nv">{children}</span>
                <button className="nb" onClick={() => setChildren(children+1)}>+</button>
              </div>
              {children > 0 && (
                <div>
                  <div className="slbl">Età dei bambini</div>
                  {Array.from({length:children},(_,ci) => (
                    <div className="ar" key={ci}>
                      <span className="alb">Bambino {ci+1}</span>
                      <div className="acs">
                        {CAGES.map(a => (
                          <div className={`ac${childAges[ci]===a?" sel":""}`} key={a}
                            onClick={() => setChildAges(p => { const ag=[...p]; ag[ci]=a; return ag; })}>
                            {a}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {travType && (
            <Btn label="Continua →" style={{marginTop:"1.2rem"}}
              onClick={() => { if (duration && duration.includes("giorni esatti")) setStep(5); else setStep(4); }}/>
          )}
        </div>
      )}

      {/* ── STEP 4: DURATA ── */}
      {step === 4 && (
        <div className="card">
          <div className="tt">⏳ Per quanto tempo?</div>
          <div className="ht">Giorni disponibili</div>
          <div className="chips">
            {DURS.map(d => <Chip key={d} label={d} onClick={() => { setDuration(d); setStep(5); }}/>)}
          </div>
        </div>
      )}

      {/* ── STEP 5: STILE ── */}
      {step === 5 && (
        <div className="card">
          <div className="tt">✨ Che tipo di viaggio?</div>
          <div className="ht">Stile preferito</div>
          <div className="chips">
            {STYLES.map(s => <Chip key={s} label={s} onClick={() => { setStyle(s); setStep(6); }}/>)}
          </div>
        </div>
      )}

      {/* ── STEP 6: BUDGET ── */}
      {step === 6 && (
        <div className="card">
          <div className="tt">💳 Budget?</div>
          <div className="ht">Adattiamo tutto alle tue aspettative</div>
          <div className="bc">
            {BUDGETS.map(b => (
              <div className={`bci${budget===b.k?" sel":""}`} key={b.k} onClick={() => { setBudget(b.k); setStep(7); }}>
                <div style={{fontSize:14,color:GL,fontWeight:600,marginBottom:4}}>{b.l}</div>
                <div style={{fontSize:11,color:"#666",lineHeight:1.5}}>{b.d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 7: PARTENZA ── */}
      {step === 7 && (
        <div className="card">
          <div className="tt">🛫 Da dove parti?</div>
          <div className="ht">Città di partenza</div>
          <div className="ir">
            <input className="inp" placeholder="Es. Milano, Roma..."
              value={inp} onChange={e => setInp(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter" && inp.trim()) { const d=inp.trim(); setDeparture(d); setInp(""); genPlan(d); }}}
            />
            <button className="go" onClick={() => { if (inp.trim()) { const d=inp.trim(); setDeparture(d); setInp(""); genPlan(d); }}}>›</button>
          </div>
        </div>
      )}

      {/* ── STEP 8: PIANO DI VIAGGIO ── */}
      {step === 8 && (
        <div className="card" style={{maxWidth:700}}>
          <Badge text={`${dest} · ${duration} · ${period} ${tripYear}`}/>
          <div className="tt">🗺️ Il tuo piano di viaggio</div>
          <div className="ht">Ecco le città e le esperienze da non perdere</div>
          <ABox text={planText} loading={planLoad} lt="Analizzo la destinazione..."/>
          {!planLoad && planText && (
            <div>
              {distClose === true && transport === null && (
                <div style={{background:"#111",border:`.5px solid ${G}`,borderRadius:12,padding:"1.2rem 1.4rem",margin:"1rem 0"}}>
                  <div style={{fontSize:13,color:GL,fontWeight:600,marginBottom:8}}>Come vuoi raggiungere {dest}?</div>
                  <div style={{fontSize:12,color:"#888",marginBottom:12}}>La destinazione è raggiungibile anche senza volare</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {["Auto propria","Auto a noleggio","Treno","Bus","Aereo"].map(opt => (
                      <div key={opt} className="chip" onClick={() => setTransport(opt)}>{opt}</div>
                    ))}
                  </div>
                </div>
              )}
              {transport !== null && (
                <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#1a1400",border:`.5px solid ${G}`,borderRadius:20,padding:"4px 12px",fontSize:12,color:GL,marginBottom:8}}>
                  {transport} selezionato
                </div>
              )}
              <div style={{fontSize:13,color:"#888",margin:"1rem 0 .5rem"}}>Vuoi aggiungere o modificare qualcosa?</div>
              <textarea className="ta" placeholder="Es. Aggiungi Venezia, voglio una notte in glamping..." value={mods} onChange={e => setMods(e.target.value)}/>
              <div className="brow">
                <Btn label={mods.trim() ? "Rielabora →" : "Vai agli alloggi →"} onClick={() => { if (mods.trim()) genRevised(); else genHotels(false); }}/>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 9: PIANO RIVISTO ── */}
      {step === 9 && (
        <div className="card" style={{maxWidth:700}}>
          <Badge text={`Piano aggiornato · ${dest}`}/>
          <div className="tt">Piano rivisto</div>
          <div className="ht">Ho integrato le tue indicazioni</div>
          <ABox text={revText} loading={revLoad} lt="Rielaboro il piano..."/>
          {!revLoad && revText && (
            <div>
              <div style={{fontSize:13,color:"#888",margin:"1rem 0 .5rem"}}>Altre modifiche o procediamo?</div>
              <textarea className="ta" placeholder="Altre modifiche? Lascia vuoto per confermare..." value={mods} onChange={e => setMods(e.target.value)}/>
              <div className="brow">
                <Btn label={mods.trim() ? "Rielabora ancora →" : "Confermo, vai agli alloggi →"} onClick={() => { if (mods.trim()) genRevised(); else genHotels(false); }}/>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 10: ALLOGGI ── */}
      {step === 10 && (
        <div className="card" style={{maxWidth:720}}>
          <Badge text={`🏨 Alloggi · ${dest} ${tripYear}`}/>
          <div className="tt">Scegli il tuo alloggio</div>
          <div className="ht">Strutture per fascia {budget}, una base per ogni area del tuo itinerario</div>
          {hotelLoad && hotelBases.length === 0 && <div className="aib"><Dots text="Cerco hotel per ogni città..."/></div>}
          {hotelBases.length > 0 && (
            <div>
              {/* Mappa basi */}
              <div style={{background:"#111",border:`.5px solid ${BRD}`,borderRadius:12,padding:"14px 18px",marginBottom:"1.2rem"}}>
                <div style={{fontSize:11,letterSpacing:"2px",color:G,textTransform:"uppercase",fontWeight:600,marginBottom:"0.9rem"}}>
                  {hotelBases.length > 1 ? `🗺️ Soggiorno in ${hotelBases.length} basi` : "🏨 Alloggio unico"}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:6}}>
                  {hotelBases.map((b,bi) => (
                    <div key={bi} style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{background:"#1a1400",border:`.5px solid ${G}`,borderRadius:20,padding:"6px 14px",display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:12,color:GL,fontWeight:600}}>{b.city}</span>
                        <span style={{fontSize:10,color:G,background:"#111",borderRadius:10,padding:"1px 7px"}}>{b.days||"?"} notti</span>
                      </div>
                      {bi < hotelBases.length-1 && <span style={{color:"#444",fontSize:16,margin:"0 2px"}}>→</span>}
                    </div>
                  ))}
                  {hotelLoad && <Dots text="ricerca in corso..."/>}
                </div>
              </div>
              {/* Hotel per città */}
              {hotelBases.map((base,bi) => (
                <div key={bi} style={{marginBottom:"1.8rem"}}>
                  <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:".8rem",paddingBottom:".6rem",borderBottom:`.5px solid ${BRD}`}}>
                    <div style={{background:G,borderRadius:8,padding:"4px 14px",fontSize:12,color:DK,fontWeight:700}}>📍 {base.city}</div>
                    <div style={{background:"#1a1400",border:`.5px solid ${G}`,borderRadius:12,padding:"3px 10px",fontSize:11,color:G}}>{base.days} notti</div>
                    {hotelLoad && <div style={{fontSize:11,color:"#888"}}>caricamento...</div>}
                  </div>
                  {base.hotels.map((h,hi) => (
                    <HCard key={hi} h={h} bi={bi} city={base.city} selKeys={selKeys} setSelKeys={setSelKeys} selNames={selNames} setSelNames={setSelNames} budget={budget}/>
                  ))}
                </div>
              ))}
              {/* Selezione corrente */}
              {selNames.length > 0 && (
                <div style={{background:"#111",border:`.5px solid ${G}`,borderRadius:10,padding:"12px 14px",marginBottom:"1rem",fontSize:12,color:"#ccc"}}>
                  <div style={{color:G,fontSize:11,letterSpacing:"1px",textTransform:"uppercase",marginBottom:6}}>✅ Selezione</div>
                  {selNames.map((n,ni) => <div key={ni}>• {n}</div>)}
                </div>
              )}
              {selKeys.length > 0 && !showCust && (
                <Btn label="✅ Confermo – Genera bozza →" style={{marginBottom:10}} onClick={() => { const hn=selNames.join(" | "); setSelStr(hn); genDraft(hn); }}/>
              )}
              {!showCust && !showHotelNotes && (
                <div style={{display:"flex",gap:10,marginTop:8,flexWrap:"wrap"}}>
                  <Btn ghost label="➕ Altri hotel" onClick={() => { const names=hotelBases.flatMap(b=>b.hotels.map(h=>h.name||h.nome||"")); setExclHotels(exclHotels.concat(names)); genHotels(true); }}/>
                  <Btn ghost label="✏️ Inserisci il tuo" onClick={() => { setShowCust(true); setSelKeys([]); setSelNames([]); }}/>
                  <Btn ghost label="✒️ Modifica basi e notti" onClick={() => setShowHotelNotes(true)}/>
                </div>
              )}
              {/* Modifica basi */}
              {showHotelNotes && (
                <div style={{background:"#111",border:`.5px solid ${G}`,borderRadius:12,padding:"1.2rem 1.4rem",marginTop:"1rem"}}>
                  <div style={{fontSize:13,color:GL,fontWeight:600,marginBottom:4}}>✒️ Modifica basi e distribuzione notti</div>
                  <div style={{fontSize:12,color:"#888",marginBottom:"0.8rem",lineHeight:1.6}}>Indica come vorresti cambiare gli alloggi: elimina una base, redistribuisci le notti, aggiungi gite in giornata...</div>
                  {hotelBases.length > 0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:"0.8rem"}}>
                      {hotelBases.map((b,bi) => (
                        <div key={bi} style={{background:"#1a1400",border:`.5px solid ${G}`,borderRadius:20,padding:"5px 12px",display:"flex",alignItems:"center",gap:7}}>
                          <span style={{fontSize:12,color:GL,fontWeight:600}}>{b.city}</span>
                          <button style={{background:"#111",border:".5px solid #444",borderRadius:"50%",width:18,height:18,color:"#aaa",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
                            onClick={e => { e.stopPropagation(); const nb=JSON.parse(JSON.stringify(hotelBases)); nb[bi].days=Math.max(1,nb[bi].days-1); setHotelBases(nb); }}>−</button>
                          <span style={{fontSize:11,color:G,minWidth:18,textAlign:"center",fontWeight:600}}>{b.days}n</span>
                          <button style={{background:"#111",border:".5px solid #444",borderRadius:"50%",width:18,height:18,color:"#aaa",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
                            onClick={e => { e.stopPropagation(); const nb=JSON.parse(JSON.stringify(hotelBases)); nb[bi].days=nb[bi].days+1; setHotelBases(nb); }}>+</button>
                          <button style={{background:"transparent",border:"none",color:"#555",fontSize:14,cursor:"pointer",padding:"0 3px"}}
                            onClick={e => { e.stopPropagation(); setHotelBases(hotelBases.filter((_,i)=>i!==bi)); }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea className="ta" placeholder="Es. Voglio eliminare Santa Barbara ed aggiungere una notte in più a Los Angeles. Preferisco fare gite in giornata verso Malibu senza fermarmi lì." value={hotelNotes} onChange={e => setHotelNotes(e.target.value)} style={{marginBottom:"0.8rem"}}/>
                  <div style={{display:"flex",gap:10}}>
                    <Btn label={hotelLoad ? "⏳ Rielaboro..." : "🔄 Rielabora alloggi →"} onClick={() => { if (!hotelLoad && hotelNotes.trim()) genHotelsRevised(); }} disabled={hotelLoad || !hotelNotes.trim()}/>
                    <Btn ghost label="Annulla" style={{maxWidth:120}} onClick={() => setShowHotelNotes(false)}/>
                  </div>
                </div>
              )}
              {/* Hotel custom */}
              {showCust && (
                <div style={{marginTop:".5rem"}}>
                  <div style={{fontSize:12,color:G,marginBottom:6}}>Nome hotel (o più separati da virgola)</div>
                  <div className="ir">
                    <input className="inp" placeholder="Es. Bauer Palazzo Venezia..." value={custH} onChange={e => setCustH(e.target.value)}
                      onKeyDown={e => { if (e.key==="Enter" && custH.trim()) { setSelStr(custH.trim()); setSelNames([custH.trim()]); setShowCust(false); }}}/>
                    <button className="go" onClick={() => { if (custH.trim()) { setSelStr(custH.trim()); setSelNames([custH.trim()]); setShowCust(false); }}}>✓</button>
                  </div>
                  <Btn ghost label="← Torna alle proposte" style={{marginTop:8}} onClick={() => setShowCust(false)}/>
                </div>
              )}
              {!showCust && !showHotelNotes && selStr && selKeys.length === 0 && (
                <Btn label={`✅ Scelgo ${selStr} →`} style={{marginTop:10}} onClick={() => genDraft(selStr)}/>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 11: BOZZA ── */}
      {step === 11 && (
        <div className="card" style={{maxWidth:700}}>
          <Badge text="📋 Bozza itinerario"/>
          <div className="tt">Prima bozza</div>
          <div className="ht">Ottimizzato per il tuo alloggio</div>
          <ABox text={draftText} loading={draftLoad} lt="Ottimizzo gli spostamenti..."/>
          {!draftLoad && draftText && (
            <div>
              <div style={{fontSize:13,color:"#888",margin:"1rem 0 .8rem"}}>Come trovi questa bozza?</div>
              <div className="yn">
                <YN icon="✅" title="Ottima, procedi" sub="Passa alle guide" onClick={() => setStep(12)}/>
                <YN icon="🔄" title="Rigenera" sub="Crea nuova versione" onClick={() => genDraft(selStr)}/>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 12: GUIDE ── */}
      {step === 12 && (
        <div className="card" style={{maxWidth:780}}>
          <Badge text={`🧭 Guide · ${dest}`}/>
          <div className="tt">Vuoi una guida turistica?</div>
          <div className="ht">Guide locali certificate lungo il percorso</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start"}}>
            <div>
              {guide === null && (
                <div className="yn">
                  <YN icon="🙋" title="Sì, voglio una guida" sub="Scegli giorni e lingua" onClick={() => setGuide("yes")}/>
                  <YN icon="🚶" title="No, esploro da solo" sub="Procedi senza guida" onClick={() => { setGuide(false); setStep(13); }}/>
                </div>
              )}
              {guide === "yes" && (
                <div>
                  <div style={{fontSize:12,color:G,marginBottom:6,marginTop:".5rem"}}>In quali giorni?</div>
                  <div className="chips" style={{marginBottom:"1rem"}}>
                    {["Tutto il viaggio","Solo alcuni giorni"].map(o => <Chip key={o} label={o} sel={guideDays===o} onClick={() => setGuideDays(o)}/>)}
                  </div>
                  {guideDays === "Solo alcuni giorni" && (
                    <input className="inp" style={{marginBottom:"1rem",width:"100%"}} placeholder="Es. Giorno 1, Giorno 3..." value={guideCustom} onChange={e => setGuideCustom(e.target.value)}/>
                  )}
                  <div style={{fontSize:12,color:G,marginBottom:6}}>Lingua della guida</div>
                  <div className="chips" style={{marginBottom:"1.4rem"}}>
                    {LANGS.map(l => <Chip key={l} label={l} sel={guideLang===l} onClick={() => setGuideLang(l)}/>)}
                  </div>
                  <Btn label="✅ Confermo →" onClick={() => { setGuide({ days: guideDays==="Solo alcuni giorni" ? guideCustom : "Tutto il viaggio", language: guideLang }); setStep(13); }}/>
                </div>
              )}
            </div>
            <div style={{background:"#111",border:".5px solid #2a2a2a",borderRadius:12,padding:"14px 16px",maxHeight:360,overflowY:"auto"}}>
              <div style={{fontSize:11,letterSpacing:"2px",color:G,textTransform:"uppercase",fontWeight:600,marginBottom:"0.8rem"}}>Riepilogo itinerario</div>
              {draftClusters.length === 0
                ? <div style={{fontSize:12,color:"#666"}}>{draftLoad ? "Sto generando la bozza..." : "La bozza dell'itinerario non è ancora disponibile."}</div>
                : draftClusters.map((g,gi) => (
                  <div key={gi} style={{marginBottom:"1rem",paddingBottom:"0.8rem",borderBottom:gi<draftClusters.length-1?".5px solid #1a1a1a":"none"}}>
                    <div style={{fontSize:12,color:GL,fontWeight:600,marginBottom:"0.4rem"}}>{g.title}</div>
                    {g.items.length > 0
                      ? g.items.map((it,ii) => (
                        <div key={ii} style={{display:"flex",gap:6,fontSize:11,color:"#aaa",marginBottom:2,lineHeight:1.5}}>
                          <span style={{color:G,flexShrink:0}}>◆</span><span>{it}</span>
                        </div>
                      ))
                      : <div style={{fontSize:11,color:"#555"}}>Attività da definire</div>
                    }
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 13: RISTORAZIONE ── */}
      {step === 13 && (
        <div className="card" style={{maxWidth:700}}>
          <Badge text={`🍽️ Ristorazione · ${dest}`}/>
          <div className="tt">Suggerimenti culinari?</div>
          <div className="ht">Ristoranti e locali · budget {budget}</div>
          {!foodText && !foodLoad && (
            <div className="yn">
              <YN icon="🍽️" title="Sì, suggerisci" sub="Pranzo e cena per ogni giorno" onClick={() => { setWantsFood(true); genFood(); }}/>
              <YN icon="⏭️" title="No, scelgo da solo" sub="Salta questa sezione" onClick={() => { setWantsFood(false); setStep(14); }}/>
            </div>
          )}
          {(foodLoad || foodText) && <ABox text={foodText} loading={foodLoad} lt="Cerco ristoranti..."/>}
          {!foodLoad && foodText && (
            <div className="brow">
              <Btn label="✅ Ottimo, scegli formato →" onClick={() => setStep(14)}/>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 14: FORMATO ── */}
      {step === 14 && (
        <div className="card">
          <div className="tt">📋 Formato itinerario?</div>
          <div className="ht">Livello di dettaglio preferito</div>
          <div className="fc">
            {FMTS.map(f => (
              <div className={`fcard${fmt===f.k?" sel":""}`} key={f.k} onClick={() => { setFmt(f.k); genFinal(f.k); }}>
                <div style={{fontSize:14,color:GL,fontWeight:500,marginBottom:4}}>{f.l}</div>
                <div style={{fontSize:11,color:"#666"}}>{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 15: ITINERARIO FINALE ── */}
      {step === 15 && (
        <div className="rbox">
          {dImg && <img className="rhero" src={dImg} alt={dest} onError={e => e.target.style.display="none"}/>}
          <div className="rhead">
            <div className="rdest">{dest ? dest.charAt(0).toUpperCase()+dest.slice(1) : dest} {tripYear}</div>
            <div className="rmeta">{metaTags.map(t => <span className="mtag" key={t}>{t}</span>)}</div>
          </div>
          <div className="rbody">
            {finLoad && !finText && <Dots text="Genero l'itinerario definitivo..."/>}
            {finText && (
              <div className="rtxt" ref={finRef} dangerouslySetInnerHTML={{__html: mdHtml(finText) + (finLoad ? "<span class='cur'></span>" : "")}}/>
            )}
            {!finLoad && finText && (
              <div>
                <div className="stit">Galleria</div>
                <div className="igrid">
                  {gal.map((s,gi) => <img key={gi} src={s} alt={dest} onError={e => e.target.style.display="none"}/>)}
                </div>
                <div className="stit">Prenota e Esplora</div>
                <div className="lgrid">
                  {lks.map(lc => (
                    <a className="lcard" key={lc.l} href={lc.h} target="_blank" rel="noreferrer">
                      <div>
                        <div style={{fontSize:12,color:GL,fontWeight:500}}>{lc.l}</div>
                        <div style={{fontSize:11,color:"#666",marginTop:2}}>{lc.s}</div>
                      </div>
                    </a>
                  ))}
                </div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:"1.5rem",borderTop:`.5px solid ${BRD}`,paddingTop:"1.2rem",alignItems:"center"}}>
                  <Btn ghost style={{maxWidth:180}} label="← Nuovo itinerario" onClick={resetAll}/>
                  <button style={{background:"#1a1400",border:`.5px solid ${G}`,borderRadius:10,padding:"10px 18px",color:G,fontSize:13,fontFamily:"'Inter',sans-serif",cursor:"pointer",fontWeight:500}}
                    onClick={() => { try { document.querySelector(".rbox")?.scrollIntoView({behavior:"smooth",block:"start"}); window.scrollTo({top:0,behavior:"smooth"}); } catch(ex){} }}>
                    ↑ Torna all'inizio
                  </button>
                  <p style={{fontSize:11,color:"#555"}}>Suggerimenti orientativi. Verifica prima di prenotare.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

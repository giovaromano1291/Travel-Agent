import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

// ─── COSTANTI ────────────────────────────────────────────
const G="#C9A84C", GL="#e8c97a", DK="#0d0d0d", CRD="#161616", BRD="#2a2a2a", CY=2026
const MONTHS=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"]
const SEASONS=["Primavera","Estate","Autunno","Inverno"]
const TTYPES=["Solo","Coppia","Famiglia","Gruppo di amici","Gruppo con bambini","Viaggio di nozze"]
const DURS=["3-4 giorni","1 settimana","10 giorni","2 settimane","3+ settimane"]
const STYLES=["Cultura & Storia","Relax & Natura","Avventura & Sport","Gastronomia","Benessere & Spa","Enogastronomia","Mix equilibrato"]
const CAGES=["< 1 anno","1 anno","2 anni","3 anni","4 anni","5 anni","6-8 anni","9-12 anni","13-17 anni"]
const LANGS=["Italiano","Inglese","Francese","Spagnolo","Tedesco","Arabo","Altra lingua"]
const STEPS=["Destinazione","Periodo","Viaggiatori","Durata","Tipologia","Budget","Partenza","Anteprima","Conferma","Alloggi","Bozza","Guide","Ristorazione","Formato","Itinerario"]
const BUDGETS=[{k:"economico",l:"Economico",d:"Ostelli, low-cost, street food"},{k:"medio",l:"Medio",d:"Hotel 3-4 stelle, voli diretti"},{k:"luxury",l:"Luxury",d:"Hotel 5 stelle, business class"}]
const FMTS=[{k:"mps",l:"Mattina / Pomeriggio / Sera",d:"Tre blocchi giornalieri"},{k:"orario",l:"Per fasce orarie",d:"9:00, 13:00, 15:00, 20:00"}]

// ─── HELPERS ─────────────────────────────────────────────
function detectYear(p){
  const m={gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12}
  const n=m[String(p||"").toLowerCase()]
  return n?(n>=new Date().getMonth()+1?CY:CY+1):CY
}
function imgUrl(q,w,h){return "https://source.unsplash.com/"+(w||700)+"x"+(h||260)+"/?"+encodeURIComponent(q)+"&sig="+Math.random().toString(36).slice(2,6)}
function starsStr(n){let s="";for(let i=0;i<Math.min(n||3,5);i++)s+="★";return s}

function parseDurationToNights(d){
  if(!d)return null
  const exact=d.match(/\((\d+)\s*giorni esatti\)/)
  if(exact)return parseInt(exact[1])
  const s=d.toLowerCase()
  if(s.indexOf("3-4")>=0)return 4
  if(s.indexOf("2 settimane")>=0)return 14
  if(s.indexOf("settimana")>=0)return 7
  if(s.indexOf("10")>=0)return 10
  if(s.indexOf("3+")>=0)return 21
  const num=s.match(/(\d+)/)
  return num?parseInt(num[1]):null
}

function mdHtml(t){
  t=t.replace(/([^\n])(MATTINA|POMERIGGIO|SERA)\b/g,"$1\n\n$2")
  t=t.replace(/^(MATTINA|POMERIGGIO|SERA)\s+(?!$)/gm,"$1\n")
  return t
    .replace(/\*\*(.*?)\*\*/g,`<strong style='color:${GL};font-weight:500'>$1</strong>`)
    .replace(/^### (.+)$/gm,`<div style='display:flex;align-items:center;gap:10px;margin:1.6rem 0 0.8rem;padding:10px 14px;background:linear-gradient(90deg,#1a1400,transparent);border-left:3px solid ${G};border-radius:0 8px 8px 0'><span style='font-family:Cormorant Garamond,serif;font-size:16px;font-weight:600;color:${GL}'>$1</span></div>`)
    .replace(/^## (.+)$/gm,`<div style='font-size:11px;letter-spacing:2px;color:${G};text-transform:uppercase;margin:1.4rem 0 0.6rem;border-top:0.5px solid #2a2a2a;padding-top:1rem;font-weight:600'>$1</div>`)
    .replace(/^(Giorno \d+.+)$/gm,`<div style='color:${GL};font-weight:700;margin-top:1.8rem;font-size:15px;border-top:0.5px solid #2a2a2a;padding-top:1.2rem'>$1</div>`)
    .replace(/^MATTINA$/gm,`<div style='color:${G};font-size:12px;font-weight:600;letter-spacing:1px;margin:1rem 0 0.5rem;padding:5px 12px;background:#1a1400;border-radius:6px;display:inline-block'>Mattina</div>`)
    .replace(/^POMERIGGIO$/gm,`<div style='color:${G};font-size:12px;font-weight:600;letter-spacing:1px;margin:1.2rem 0 0.5rem;padding:5px 12px;background:#1a1400;border-radius:6px;display:inline-block'>Pomeriggio</div>`)
    .replace(/^SERA$/gm,`<div style='color:${G};font-size:12px;font-weight:600;letter-spacing:1px;margin:1.2rem 0 0.5rem;padding:5px 12px;background:#1a1400;border-radius:6px;display:inline-block'>Sera</div>`)
    .replace(/^---$/gm,`<div style='height:1px;background:#2a2a2a;margin:1.4rem 0'></div>`)
    .replace(/^LINK (.+)$/gm,`<div style='margin:0.3rem 0 0.3rem 1rem;color:#6ab0ff;font-size:12px'>Prenota: $1</div>`)
    .replace(/^[*-] (.+)$/gm,`<div style='display:flex;align-items:flex-start;gap:8px;margin:0.35rem 0;color:#ccc;font-size:13px;line-height:1.6'><span style='color:${G};flex-shrink:0'>◆</span><span>$1</span></div>`)
}

// ─── API AI ───────────────────────────────────────────────
async function callAI(userMsg, maxTok, onChunk){
  maxTok=maxTok||1000
  const apiKey = import.meta.env.VITE_ANTHROPIC_KEY
  const ctrl=new AbortController()
  const tid=setTimeout(()=>ctrl.abort(),60000)
  try{
    const res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",signal:ctrl.signal,
      headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:maxTok,stream:true,
        messages:[{role:"user",content:userMsg}]})
    })
    clearTimeout(tid)
    if(!res.ok)return ""
    const rdr=res.body.getReader(),dc=new TextDecoder()
    let full=""
    while(true){
      const ck=await rdr.read();if(ck.done)break
      const lines=dc.decode(ck.value).split("\n")
      for(const line of lines){
        if(line.indexOf("data: ")===0){
          try{const jj=JSON.parse(line.slice(6));if(jj.delta?.text){full+=jj.delta.text;if(onChunk)onChunk(full)}}catch(e){}
        }
      }
    }
    return full
  }catch(e){clearTimeout(tid);return ""}
}

// ─── CSS ──────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.planner-page{background:#0d0d0d;min-height:100vh;font-family:'Inter',sans-serif;color:#e8e8e8}

/* TOP NAV */
.pl-nav{display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;border-bottom:.5px solid #1a1a1a;background:#0d0d0d;position:sticky;top:0;z-index:50}
.pl-nav-logo{display:flex;align-items:center;gap:10px;cursor:pointer;text-decoration:none}
.pl-nav-icon{width:34px;height:34px;background:#C9A84C;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}
.pl-nav-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#e8e8e8}
.pl-nav-name span{color:#C9A84C}
.pl-nav-right{display:flex;gap:10px;align-items:center}
.pl-btn-sm{background:transparent;border:.5px solid #2a2a2a;border-radius:8px;padding:7px 14px;color:#888;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s}
.pl-btn-sm:hover{border-color:#C9A84C;color:#C9A84C}

/* WRAP CONTENUTO */
.wrap{background:#0d0d0d;font-family:'Inter',sans-serif;color:#e8e8e8;display:flex;flex-direction:column;align-items:center;padding:2rem 1rem 3rem}
.logo{display:flex;align-items:center;gap:14px;margin-bottom:6px}
.li{width:48px;height:48px;background:#C9A84C;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px}
.lt{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:500;letter-spacing:1px}
.lt span{color:#C9A84C}
.sub{font-size:11px;letter-spacing:3px;color:#888;margin-bottom:1.5rem;text-align:center}
.dl{width:100%;max-width:800px;height:.5px;background:#2a2a2a;margin-bottom:1.5rem}
.back{display:flex;align-items:center;gap:6px;background:transparent;border:none;color:#777;font-size:12px;cursor:pointer;margin-bottom:.8rem;padding:4px 0;font-family:'Inter',sans-serif;transition:color .2s;width:100%;max-width:720px;text-align:left}
.back:hover{color:#C9A84C}
.prog{display:flex;align-items:center;justify-content:center;margin-bottom:2rem;width:100%;max-width:920px;overflow-x:auto;padding:.5rem 0 .8rem;scrollbar-width:none}
.prog::-webkit-scrollbar{display:none}
.sn{display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0}
.sc{width:28px;height:28px;border-radius:50%;border:1.5px solid #2a2a2a;display:flex;align-items:center;justify-content:center;font-size:10px;color:#888;transition:all .3s;flex-shrink:0}
.sc.act{border-color:#C9A84C;background:#C9A84C;color:#0d0d0d;font-weight:700}
.sc.dn{border-color:#C9A84C;color:#C9A84C}
.sl{font-size:8px;color:#555;text-align:center;max-width:54px}
.sl.act{color:#C9A84C}
.cn{height:1px;background:#2a2a2a;width:12px;flex-shrink:0;margin-bottom:16px}
.cn.dn{background:#C9A84C}
.card{background:#161616;border:.5px solid #2a2a2a;border-radius:16px;padding:2rem 1.8rem;width:100%;max-width:640px}
.tt{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:500;color:#e8c97a;margin-bottom:.4rem}
.ht{font-size:13px;color:#777;margin-bottom:1.3rem;line-height:1.6}
.ir{display:flex;gap:10px;align-items:center}
.inp{flex:1;background:#111;border:.5px solid #333;border-radius:10px;padding:12px 16px;font-size:15px;color:#e8e8e8;font-family:'Inter',sans-serif;outline:none;transition:border .2s}
.inp:focus{border-color:#C9A84C}
.inp::placeholder{color:#555}
.ta{width:100%;background:#111;border:.5px solid #333;border-radius:10px;padding:12px 16px;font-size:13px;color:#e8e8e8;font-family:'Inter',sans-serif;outline:none;resize:vertical;min-height:80px;line-height:1.6}
.ta:focus{border-color:#C9A84C}
.ta::placeholder{color:#555}
.go{background:#C9A84C;color:#0d0d0d;border:none;border-radius:10px;width:42px;height:42px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700}
.go:hover{background:#e8c97a}
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chip{background:#111;border:.5px solid #333;border-radius:20px;padding:9px 16px;font-size:13px;color:#ccc;cursor:pointer;transition:all .2s}
.chip:hover,.chip.sel{border-color:#C9A84C;color:#C9A84C}
.sep{border-top:.5px solid #2a2a2a;padding-top:1.1rem;margin-top:1.1rem}
.slbl{font-size:12px;color:#666;margin-bottom:7px}
.nr{display:flex;align-items:center;gap:12px;margin-bottom:.8rem}
.nb{width:32px;height:32px;border-radius:50%;background:#111;border:.5px solid #333;color:#e8e8e8;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.nb:hover{border-color:#C9A84C;color:#C9A84C}
.nv{font-size:18px;font-weight:500;color:#e8c97a;min-width:22px;text-align:center}
.ar{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px}
.alb{font-size:12px;color:#aaa;flex-shrink:0;width:74px;padding-top:5px}
.acs{display:flex;flex-wrap:wrap;gap:5px}
.ac{background:#111;border:.5px solid #333;border-radius:14px;padding:4px 10px;font-size:11px;color:#ccc;cursor:pointer;transition:all .2s}
.ac:hover,.ac.sel{border-color:#C9A84C;color:#C9A84C}
.bc{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.bci{background:#111;border:.5px solid #333;border-radius:12px;padding:1.2rem 1rem;cursor:pointer;transition:all .2s;text-align:center}
.bci:hover,.bci.sel{border-color:#C9A84C;background:#1a1400}
.aib{background:#111;border:.5px solid #2a2a2a;border-radius:10px;padding:14px 16px;font-size:13px;color:#ccc;line-height:1.8;margin-bottom:1.2rem;min-height:48px;overflow-y:auto}
.aib::-webkit-scrollbar{width:4px}
.aib::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
.hcard{background:#111;border:.5px solid #333;border-radius:12px;padding:1.2rem 1.4rem;cursor:pointer;transition:all .2s;margin-bottom:12px}
.hcard:hover,.hcard.sel{border-color:#C9A84C;background:#1a1400}
.dot{width:6px;height:6px;border-radius:50%;background:#C9A84C;animation:pulse 1.2s infinite;flex-shrink:0}
.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
@keyframes pulse{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
.cur{display:inline-block;width:2px;height:14px;background:#C9A84C;animation:blink 1s infinite;vertical-align:middle;margin-left:2px}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.btn{width:100%;border-radius:10px;height:44px;font-size:14px;font-family:'Inter',sans-serif;border:none;cursor:pointer;transition:all .2s;font-weight:500}
.btng{background:#C9A84C;color:#0d0d0d}.btng:hover{background:#e8c97a}
.btno{background:transparent;color:#888;border:.5px solid #2a2a2a}.btno:hover{border-color:#C9A84C;color:#C9A84C}
.brow{display:flex;gap:10px;margin-top:1.2rem}
.fc{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fcard{background:#111;border:.5px solid #333;border-radius:12px;padding:1.4rem 1rem;cursor:pointer;transition:all .2s;text-align:center}
.fcard:hover,.fcard.sel{border-color:#C9A84C;background:#1a1400}
.rbox{background:#161616;border:.5px solid #2a2a2a;border-radius:16px;width:100%;max-width:780px;overflow:hidden}
.rhero{width:100%;height:200px;object-fit:cover;display:block}
.rhead{padding:1.5rem 1.8rem 1rem}
.rdest{font-family:'Cormorant Garamond',serif;font-size:28px;color:#e8c97a}
.rmeta{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.mtag{background:#111;border:.5px solid #2a2a2a;border-radius:20px;padding:4px 12px;color:#aaa;font-size:11px}
.rbody{padding:0 1.8rem 1.8rem}
.rtxt{font-size:13.5px;line-height:1.9;color:#d0d0d0;white-space:pre-wrap;max-height:520px;overflow-y:auto}
.rtxt::-webkit-scrollbar{width:4px}.rtxt::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
.stit{font-size:11px;letter-spacing:2px;color:#C9A84C;text-transform:uppercase;margin:1.5rem 0 .8rem;border-top:.5px solid #2a2a2a;padding-top:1.2rem;font-weight:600}
.lgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.lcard{background:#111;border:.5px solid #333;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;text-decoration:none;transition:all .2s}
.lcard:hover{border-color:#C9A84C}
.igrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:.8rem}
.igrid img{width:100%;height:90px;object-fit:cover;border-radius:8px;display:block}
.badge{display:inline-flex;align-items:center;gap:6px;background:#1a1400;border:.5px solid #C9A84C;border-radius:20px;padding:5px 14px;font-size:12px;color:#e8c97a;margin-bottom:1rem}
.yn{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:.5rem}
.ync{background:#111;border:.5px solid #333;border-radius:12px;padding:1.4rem 1rem;cursor:pointer;transition:all .2s;text-align:center}
.ync:hover{border-color:#C9A84C;background:#1a1400}
.dpick{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* TOAST SALVATAGGIO */
.toast{position:fixed;bottom:2rem;right:2rem;background:#1a1400;border:.5px solid #C9A84C;border-radius:12px;padding:12px 20px;font-size:13px;color:#e8c97a;z-index:9999;animation:fadeIn .3s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
`

export default function PlannerPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // step & form state
  const [step,setStep]=useState(1)
  const [dest,setDest]=useState("")
  const [period,setPeriod]=useState("")
  const [startDate,setStartDate]=useState("")
  const [endDate,setEndDate]=useState("")
  const [tripYear,setTripYear]=useState(CY)
  const [travType,setTravType]=useState("")
  const [adults,setAdults]=useState(2)
  const [children,setChildren]=useState(0)
  const [childAges,setChildAges]=useState([])
  const [duration,setDuration]=useState("")
  const [style,setStyle]=useState("")
  const [budget,setBudget]=useState("")
  const [departure,setDeparture]=useState("")
  const [fmt,setFmt]=useState("mps")
  const [mods,setMods]=useState("")
  const [wantsFood,setWantsFood]=useState(null)
  const [inp,setInp]=useState("")

  // AI content
  const [aiPer,setAiPer]=useState(""); const [aiPerLoad,setAiPerLoad]=useState(false)
  const [planText,setPlanText]=useState(""); const [planLoad,setPlanLoad]=useState(false)
  const [revText,setRevText]=useState(""); const [revLoad,setRevLoad]=useState(false)
  const [draftText,setDraftText]=useState(""); const [draftLoad,setDraftLoad]=useState(false)
  const [foodText,setFoodText]=useState(""); const [foodLoad,setFoodLoad]=useState(false)
  const [finText,setFinText]=useState(""); const [finLoad,setFinLoad]=useState(false)

  // hotel state
  const [hotelBases,setHotelBases]=useState([])
  const [hotelLoad,setHotelLoad]=useState(false)
  const [selKeys,setSelKeys]=useState([])
  const [selNames,setSelNames]=useState([])
  const [selStr,setSelStr]=useState("")
  const [custH,setCustH]=useState("")
  const [showCust,setShowCust]=useState(false)
  const [exclHotels,setExclHotels]=useState([])

  // guide state
  const [guide,setGuide]=useState(null)
  const [guideDays,setGuideDays]=useState("Tutto il viaggio")
  const [guideLang,setGuideLang]=useState("Italiano")
  const [guideCustom,setGuideCustom]=useState("")

  // final & save
  const [dImg,setDImg]=useState(""); const [gal,setGal]=useState([])
  const [saving,setSaving]=useState(false)
  const [saved,setSaved]=useState(false)
  const [toast,setToast]=useState("")

  const finRef=useRef(null); const draftRef=useRef(null)
  useEffect(()=>{if(finRef.current)finRef.current.scrollTop=finRef.current.scrollHeight},[finText])
  useEffect(()=>{if(draftRef.current)draftRef.current.scrollTop=draftRef.current.scrollHeight},[draftText])

  function showToast(msg){setToast(msg);setTimeout(()=>setToast(""),3000)}

  function trav(){
    const b=adults+" adult"+(adults>1?"i":"o")
    const k=children>0?", "+children+" bambin"+(children>1?"i":"o")+" (età: "+childAges.filter(Boolean).join(", ")+")":""
    return b+k+" - "+travType
  }

  function goBack(){
    if(step<=1)return
    if(step===5 && startDate && endDate && duration && duration.indexOf("giorni esatti")>=0){
      setStep(2)
      return
    }
    setStep(step-1)
  }

  function confirmDates(){
    if(!startDate||!endDate)return
    const d1=new Date(startDate), d2=new Date(endDate)
    const diffDays=Math.round((d2-d1)/86400000)
    const monthName=MONTHS[d1.getMonth()]
    setPeriod(monthName)
    setTripYear(d1.getFullYear())
    let durLabel="3+ settimane"
    if(diffDays<=4)durLabel="3-4 giorni"
    else if(diffDays<=8)durLabel="1 settimana"
    else if(diffDays<=11)durLabel="10 giorni"
    else if(diffDays<=15)durLabel="2 settimane"
    setDuration(durLabel+" ("+diffDays+" giorni esatti)")
    setStep(5)
  }

  // ── SALVA SU SUPABASE ─────────────────────────────────
  async function saveItinerary(){
    if(!user||saved)return
    setSaving(true)
    const { error } = await supabase.from('itineraries').insert({
      user_id: user.id,
      destination: dest,
      period: period,
      trip_year: tripYear,
      duration: duration,
      style: style,
      budget: budget,
      departure: departure,
      trav_type: travType,
      adults: adults,
      children: children,
      hotels: selStr,
      itinerary_text: finText,
      food_text: foodText || null,
      created_at: new Date().toISOString()
    })
    setSaving(false)
    if(!error){ setSaved(true); showToast("✅ Itinerario salvato nel tuo profilo!") }
    else showToast("⚠️ Errore nel salvataggio. Riprova.")
  }

  // ── STEP 1 ───────────────────────────────────────────
  async function onDest(){
    if(!inp.trim())return
    const d=inp.trim(); setDest(d); setInp(""); setAiPerLoad(true); setStep(2)
    await callAI("In 3-4 righe in italiano, i periodi migliori per visitare "+d+" nel "+CY+" o "+(CY+1)+" (clima, eventi, affluenza). Usa bullet -.",600,t=>setAiPer(t))
    setAiPerLoad(false)
  }

  // ── STEP 8 ───────────────────────────────────────────
  async function genPlan(dep){
    setStep(8); setPlanLoad(true); setPlanText("")
    const y=detectYear(period); setTripYear(y)
    const msg="Crea un piano visivo dell'itinerario per: "+dest+", "+period+" "+y+", "+duration+", "+style+", "+trav()+", budget "+budget+".\n\n"+
      "STEP PRELIMINARE: stabilisci se "+dest+" e (A) una SINGOLA CITTA o (B) una REGIONE/PAESE vasto.\n"+
      "Se (A): dividi per QUARTIERI della stessa citta.\n"+
      "Se (B): dividi per CITTA DIVERSE.\n\n"+
      "FORMATO OBBLIGATORIO per ogni blocco:\n"+
      "### NOME (N giorni) [TIPO]\n"+
      "- **Cosa vedere**: luogo - perche\n"+
      "- **Cosa fare**: attivita - descrizione\n"+
      "- **Da non perdere**: esperienza - perche\n\n"+
      "[TIPO] e SEMPRE [QUARTIERE] o [CITTA].\n\n"+
      "REGOLE:\n"+
      "1. Solo ### per i titoli\n"+
      "2. Niente tabelle (pipe |)\n"+
      "3. Inizia subito col primo ###\n"+
      "4. La somma dei giorni deve corrispondere a: "+duration+"\n"+
      "5. Nomi reali, scrivi in italiano\n\n"+
      "ESEMPIO A (Venezia, 4gg):\n### SESTIERE DI SAN MARCO (2 giorni) [QUARTIERE]\n- **Cosa vedere**: Piazza San Marco - cuore della citta\n### CANNAREGIO (2 giorni) [QUARTIERE]\n- **Cosa vedere**: Ghetto ebraico - quartiere storico\n\n"+
      "ESEMPIO B (Italia, 6gg):\n### VENEZIA (2 giorni) [CITTA]\n- **Cosa vedere**: Piazza San Marco\n### FIRENZE (2 giorni) [CITTA]\n- **Cosa vedere**: Uffizi\n### ROMA (2 giorni) [CITTA]\n- **Cosa vedere**: Colosseo"
    await callAI(msg,1800,t=>setPlanText(t))
    setPlanLoad(false)
  }

  // ── STEP 9 ───────────────────────────────────────────
  async function genRevised(){
    setStep(9); setRevLoad(true); setRevText(""); setMods("")
    const y=tripYear||detectYear(period)
    const msg="Piano originale per "+dest+" ("+period+" "+y+"):\n"+planText+"\n\nModifiche richieste: "+mods+"\n\n"+
      "Rielabora con STESSO FORMATO OBBLIGATORIO:\n### NOME (N giorni) [TIPO]\n- **Cosa vedere**: luogo - perche\n- **Cosa fare**: attivita - descrizione\n- **Da non perdere**: esperienza - perche\n\n"+
      "REGOLE: solo ###, niente tabelle, includi TUTTE le citta originali piu quelle aggiunte, somma giorni = "+duration+". Scrivi in italiano."
    await callAI(msg,2000,t=>setRevText(t))
    setRevLoad(false)
  }

  // ── ESTRAI CLUSTER (con classificazione quartiere/città) ──
  function extractClusters(text){
    const lines=text.split("\n")
    let out=[]; let cur=null
    for(const l of lines){
      const lt=l.trim()
      if(lt.slice(0,3)==="###"){
        if(cur)out.push(cur)
        const t=lt.replace(/^#+\s*/,"")
        const typeMatch=t.match(/\[(QUARTIERE|CITTA|CITTÀ)\]/i)
        const type=typeMatch?(typeMatch[1].toUpperCase().indexOf("QUART")>=0?"quartiere":"citta"):null
        const nm=t.replace(/\[.*?\]/,"").replace(/\(.*\)/,"").trim()
        const dg=t.match(/\((\d+)/)
        cur={name:nm,days:dg?parseInt(dg[1]):null,type:type}
      }
    }
    if(cur)out.push(cur)

    if(out.length===0)out=[{name:dest,days:null,type:null}]

    let allQuartiere=out.length>0
    for(const o of out){ if(o.type!=="quartiere")allQuartiere=false }

    const totalNights=parseDurationToNights(duration)

    if(allQuartiere){
      return [{name:dest, days:totalNights||2, type:"citta", isSingleCity:true}]
    }

    let sumDays=0
    for(const c of out){ if(c.days)sumDays+=c.days }

    if(totalNights && (sumDays===0 || sumDays!==totalNights)){
      const n=out.length
      const base=Math.floor(totalNights/n)
      const rem=totalNights-(base*n)
      out.forEach((o,i)=>{
        o.days=base+(i<rem?1:0)
        if(o.days<1)o.days=1
      })
    }

    return out
  }

  // ── HOTEL PER CITTÀ ───────────────────────────────────
  async function fetchHotelsForCity(cityName,bdg){
    const hint=bdg==="luxury"?"5 stelle lusso. Fascia 400+ eur/notte.":bdg==="economico"?"2-3 stelle o B&B. Fascia 60-120 eur/notte.":"3-4 stelle. Fascia 120-250 eur/notte."
    const msg="Proponi 3 hotel REALI esistenti a "+cityName+", fascia "+bdg+" ("+hint+").\nRispondi SOLO con JSON array:\n[{\"name\":\"Nome Hotel\",\"stars\":4,\"zone\":\"quartiere\",\"price\":\"euro150/notte\",\"why\":\"perche sceglierlo\",\"pros\":[\"p1\",\"p2\",\"p3\"],\"best\":true,\"url\":\"https://www.booking.com/search.html?ss="+encodeURIComponent(cityName)+"\"}]"
    const txt=await callAI(msg,900,null)
    if(!txt)return null
    try{
      const m=txt.match(/\[[\s\S]*\]/)
      if(m){
        const arr=JSON.parse(m[0])
        if(Array.isArray(arr)&&arr.length>0){
          if(!arr.some(h=>h.best))arr[0].best=true
          return arr
        }
      }
    }catch(e){}
    return null
  }

  // ── GENERA HOTEL ──────────────────────────────────────
  async function genHotels(append){
    setStep(10); setHotelLoad(true)
    if(!append)setHotelBases([])
    const activeText=revText||planText
    const clusters=extractClusters(activeText)
    const starsQ=budget==="luxury"?"&stars=5":budget==="economico"?"&stars=2":"&stars=4"
    const bases=append?JSON.parse(JSON.stringify(hotelBases)):[]
    for(const cl of clusters){
      const searchCity=cl.isSingleCity?dest:cl.name
      let hotels=await fetchHotelsForCity(searchCity,budget)
      if(!hotels)hotels=[{name:"Cerca hotel a "+searchCity,stars:3,zone:"centro",price:"vedi Booking",why:"Clicca per hotel disponibili",pros:["prezzi aggiornati","recensioni reali"],best:true,url:"https://www.booking.com/search.html?ss="+encodeURIComponent(searchCity)+starsQ}]
      const existIdx=bases.findIndex(b=>b.city===cl.name)
      if(existIdx>=0){if(append)bases[existIdx].hotels=[...bases[existIdx].hotels,...hotels];else bases[existIdx].hotels=hotels}
      else bases.push({city:cl.name,days:cl.days||2,hotels})
      setHotelBases(JSON.parse(JSON.stringify(bases)))
    }
    setHotelLoad(false)
  }

  // ── BOZZA ITINERARIO ──────────────────────────────────
  async function genDraft(hotel){
    setStep(11); setDraftLoad(true); setDraftText("")
    const y=tripYear||detectYear(period)
    const activeText=(revText||planText).slice(0,500)
    const msg="Itinerario bozza per "+dest+", "+period+" "+y+", "+duration+", "+style+", budget "+budget+", alloggio "+hotel+", "+trav()+".\n"+
      "Piano visite:\n"+activeText+"\n\n"+
      "FORMATO OBBLIGATORIO, ogni elemento su riga separata:\n\n"+
      "**Giorno 1 - Titolo del giorno**\n\nMATTINA\n- Attivita 1 (tempo percorrenza)\n- Attivita 2 (tempo percorrenza)\n\nPOMERIGGIO\n- Attivita 1 (tempo percorrenza)\n- Attivita 2 (tempo percorrenza)\n\nSERA\n- Attivita 1\n\n---\n\n"+
      "Ripeti per ogni giorno. REGOLE:\n1. MATTINA/POMERIGGIO/SERA su riga isolata, maiuscolo\n2. Vai a capo prima delle attivita\n3. Ogni attivita inizia con - su riga separata\n4. Niente testo descrittivo lungo attaccato alle sezioni\n5. Riga vuota tra sezioni\n\n"+
      "## LOGISTICA GENERALE\n- Trasporti: come spostarsi\n- Pagamenti: carta/contanti\n- App utili: 2-3 app\n- Prenotazioni essenziali\n- Budget indicativo\n"+
      "NO orari precisi. Ottimizza spostamenti per posizione alloggio. Scrivi in italiano."
    await callAI(msg,3000,t=>setDraftText(t))
    setDraftLoad(false)
  }

  // ── RISTORAZIONE ──────────────────────────────────────
  async function genFood(){
    setStep(13); setFoodLoad(true); setFoodText("")
    const y=tripYear||detectYear(period)
    const msg="Suggerisci ristoranti per ogni giorno del viaggio a "+dest+" ("+period+" "+y+"), budget "+budget+", "+trav()+", alloggio "+selStr+".\n## PREZZI MEDI A "+dest.toUpperCase()+"\n## DOVE MANGIARE - GIORNO PER GIORNO\nPer ogni giorno: pranzo e cena con nome locale, tipo, zona, prezzo. LINK url\n## ESPERIENZE CULINARIE DA NON PERDERE\nScrivi in italiano."
    await callAI(msg,3000,t=>setFoodText(t))
    setFoodLoad(false)
  }

  // ── ITINERARIO FINALE ─────────────────────────────────
  async function genFinal(f){
    setStep(15); setFinLoad(true); setFinText(""); setSaved(false)
    setDImg(imgUrl(dest,780,260))
    setGal([imgUrl(dest+" landscape"),imgUrl(dest+" food"),imgUrl(dest+" hotel")])
    const y=tripYear||detectYear(period)
    const isMPS=f!=="orario"
    const gdStr=guide&&guide!==false?"\n## GUIDE TURISTICHE\nGiorni: "+guide.days+" - Lingua: "+guide.language+"\n2-3 servizi con LINK url\n":""
    const msg="Itinerario completo per "+dest+", "+period+" "+y+", "+duration+", "+style+", budget "+budget+", "+trav()+", partenza "+departure+", alloggio "+selStr+".\n"+
      "Formato: "+(isMPS?"MATTINA/POMERIGGIO/SERA":"fasce orarie 9:00/13:00/15:00/20:00")+". Separa giorni con ---. Scrivi in italiano con ## per sezioni:\n"+
      "## PRESENTAZIONE DELLA DESTINAZIONE\n## VOLO CONSIGLIATO\nRotta "+departure+" verso "+dest+" "+period+" "+y+": vettori, prezzi\nLINK https://www.google.com/travel/flights?q="+encodeURIComponent(departure+" "+dest)+"\n"+
      "## ALLOGGIO\n"+selStr+": zona e perche ottimale\n## ITINERARIO GIORNO PER GIORNO\nPer ogni attivita: LINK url-biglietti"+(wantsFood?" e LINK url-ristorante":"")+"\n"+gdStr+
      "## ESPERIENZE LOCALI E CUCINA\n3-4 con LINK url\n## CONSIGLI PRATICI\n- Trasporti\n- Pagamenti\n- App utili\n- Visto\n- Valigia"
    try{await callAI(msg,8000,t=>setFinText(t))}catch(e){setFinText("Errore: "+e.message)}
    setFinLoad(false)
  }

  function resetAll(){
    setStep(1);setDest("");setPeriod("");setStartDate("");setEndDate("");setTripYear(CY);setTravType("");setAdults(2);setChildren(0);setChildAges([])
    setDuration("");setStyle("");setBudget("");setDeparture("");setFmt("mps");setMods("");setWantsFood(null)
    setInp("");setAiPer("");setPlanText("");setRevText("");setDraftText("");setFoodText("");setFinText("")
    setHotelBases([]);setSelKeys([]);setSelNames([]);setSelStr("");setExclHotels([]);setGuide(null);setShowCust(false);setCustH("")
    setSaved(false)
  }

  // ── SOTTO-COMPONENTI ──────────────────────────────────
  function Dots({text}){return <div style={{display:"flex",gap:8,alignItems:"center",padding:".8rem 0"}}><div className="dot"/><div className="dot"/><div className="dot"/><span style={{color:G,fontSize:13}}>{text}</span></div>}
  function ABox({text,loading,lt,style:st}){return <div className="aib" style={st}>{(loading&&!text)?<Dots text={lt||"Elaboro..."}/>:<div dangerouslySetInnerHTML={{__html:mdHtml(text||"")+(loading?"<span class='cur'></span>":"")}}/>}</div>}
  function Chip({label,sel,onClick}){return <div className={`chip${sel?" sel":""}`} onClick={onClick}>{label}</div>}
  function Btn({label,ghost,style:st,onClick,disabled}){return <button className={`btn ${ghost?"btno":"btng"}`} style={st||{}} onClick={onClick} disabled={disabled||false}>{label}</button>}
  function YN({icon,title,sub,onClick}){return <div className="ync" onClick={onClick}><div style={{fontSize:26,marginBottom:8}}>{icon}</div><div style={{fontSize:14,color:GL,fontWeight:500,marginBottom:4}}>{title}</div><div style={{fontSize:11,color:"#666"}}>{sub}</div></div>}
  function Badge({text}){return <div className="badge">{text}</div>}
  function BackBtn(){
    if(step<=1)return null
    return <button className="back" onClick={goBack}>← Torna indietro</button>
  }

  function HCard({h,bi,city}){
    const nm=h.name||h.nome||"Hotel"
    const st=h.stars||h.stelle||3
    const zn=h.zone||h.zona||"centro"
    const pr=h.price||h.prezzo||""
    const wh=h.why||h.perche||""
    const ps=h.pros||h.punti_forza||[]
    const bs=h.best||false
    const ur=h.url||"https://www.booking.com/search.html?ss="+encodeURIComponent(city)
    const sk=bi+"-"+nm
    const isSel=selKeys.includes(sk)
    return <div className={`hcard${isSel?" sel":""}`} onClick={()=>{
      const ck=[...selKeys],cn=[...selNames]
      const ex=ck.findIndex(k=>k.startsWith(bi+"-"))
      if(ex>=0){ck[ex]=sk;cn[ex]=city+": "+nm}else{ck.push(sk);cn.push(city+": "+nm)}
      setSelKeys(ck);setSelNames(cn)
    }}>
      {bs&&<div style={{display:"inline-block",background:"#1a1400",border:".5px solid "+G,borderRadius:10,padding:"2px 10px",fontSize:10,color:G,marginBottom:6}}>★ Miglior rapporto qualità/prezzo</div>}
      <div style={{fontSize:15,color:GL,fontWeight:500,marginBottom:4}}>{nm} {starsStr(st)}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
        {[zn,pr,budget].filter(Boolean).map(tt=><span key={tt} style={{background:"#1a1a1a",border:".5px solid #333",borderRadius:12,padding:"3px 10px",fontSize:11,color:"#aaa"}}>{tt}</span>)}
      </div>
      {wh&&<div style={{fontSize:12,color:"#bbb",marginBottom:6}}>{wh}</div>}
      {ps.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>{ps.map((pf,pi)=><span key={pi} style={{background:"#1a1a1a",border:".5px solid #333",borderRadius:10,padding:"3px 9px",fontSize:11,color:"#bbb"}}>✓ {pf}</span>)}</div>}
      <a href={ur} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#6ab0ff",textDecoration:"none"}} onClick={e=>e.stopPropagation()}>🔗 Prenota su Booking.com</a>
    </div>
  }

  // progress bar
  const progressBar=[]
  for(let si=0;si<STEPS.length;si++){
    const snum=si+1
    progressBar.push(<div className="sn" key={snum}><div className={`sc${step===snum?" act":step>snum?" dn":""}`}>{step>snum?"✓":snum}</div><div className={`sl${step===snum?" act":""}`}>{STEPS[si]}</div></div>)
    if(si<STEPS.length-1)progressBar.push(<div className={`cn${step>snum?" dn":""}`} key={"c"+snum}/>)
  }

  const lks=[
    {l:"Google Flights",s:"Voli da "+departure,h:"https://www.google.com/travel/flights?q="+encodeURIComponent(departure+" "+dest)},
    {l:"Skyscanner",s:"Confronta voli",h:"https://www.skyscanner.it"},
    {l:"Booking.com",s:"Hotel a "+dest,h:"https://www.booking.com/search.html?ss="+encodeURIComponent(dest)+"&group_adults="+adults},
    {l:"TripAdvisor",s:"Ristoranti e attività",h:"https://www.tripadvisor.it/Search?q="+encodeURIComponent(dest)},
    {l:"Google Maps",s:"Esplora",h:"https://www.google.com/maps/search/"+encodeURIComponent("cose da fare "+dest)},
    {l:"Viator",s:"Tour ed esperienze",h:"https://www.viator.com/search/"+encodeURIComponent(dest)}
  ]

  const metaTags=[period,travType,adults+" adult"+(adults>1?"i":"o")+(children>0?" + "+children+" bambin"+(children>1?"i":"o"):""),duration,style,budget,selStr].filter(Boolean)

  // riepilogo bozza (giorni → attività brevi) per lo step Guide
  const draftClusters=(function(){
    const text=draftText||""
    const lines=text.split("\n")
    const giorni=[]; let cur=null
    for(const l0 of lines){
      const l=l0.trim()
      if(l.match(/^\*{0,2}giorno\s*\d+/i)){
        if(cur)giorni.push(cur)
        const title=l.replace(/\*\*/g,"").trim()
        cur={title:title,items:[]}
      } else if(cur&&(l.slice(0,1)==="-"||l.slice(0,1)==="*")&&l.length>2){
        const item=l.slice(1).trim().replace(/\*\*/g,"")
        const lowIt=item.toLowerCase()
        if(item.length>3&&lowIt.indexOf("trasport")<0&&lowIt.indexOf("pagament")<0&&lowIt.indexOf("budget")<0&&lowIt.indexOf("app utili")<0&&lowIt.indexOf("prenotazion")<0){
          let syn=item.replace(/\s*\([^)]*\)\s*$/,"").trim()
          const cutIdx=syn.search(/\s[-–]\s|:\s|,\s(per|con|dove|che|e\s)/i)
          if(cutIdx>10)syn=syn.slice(0,cutIdx)
          if(syn.length>55)syn=syn.slice(0,52).trim()+"..."
          if(cur.items.length<4)cur.items.push(syn)
        }
      }
    }
    if(cur)giorni.push(cur)
    return giorni
  })()

  return (
    <>
      <style>{CSS}</style>
      <div className="planner-page">

        {/* NAV */}
        <nav className="pl-nav">
          <div className="pl-nav-logo" onClick={()=>navigate('/')}>
            <div className="pl-nav-icon">✈️</div>
            <div className="pl-nav-name">Travel <span>AI</span> Agent</div>
          </div>
          <div className="pl-nav-right">
            <button className="pl-btn-sm" onClick={()=>navigate('/dashboard')}>← Dashboard</button>
          </div>
        </nav>

        {/* TOAST */}
        {toast&&<div className="toast">{toast}</div>}

        <div className="wrap">

          <div className="logo"><div className="li">✈</div><div className="lt">Travel <span>AI</span> Agent</div></div>
          <div className="sub">IL TUO CONSULENTE DI VIAGGIO PERSONALE</div>
          <div className="dl"/>

          {step<=14&&<div className="prog">{progressBar}</div>}
          {step>1&&step<=14&&<BackBtn/>}

          {/* S1 */}
          {step===1&&<div className="card">
            <div className="tt">🌍 Dove vuoi andare?</div>
            <div className="ht">Inserisci una destinazione, paese o regione</div>
            <div className="ir">
              <input className="inp" placeholder="Es. Italia, Giappone, Kenya..." value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&inp.trim())onDest()}}/>
              <button className="go" onClick={()=>{if(inp.trim())onDest()}}>›</button>
            </div>
          </div>}

          {/* S2 */}
          {step===2&&<div className="card">
            <div className="tt">📅 Quando vuoi partire?</div>
            <div className="ht">Stagionalità per {dest}</div>
            <ABox text={aiPer} loading={aiPerLoad} lt="Analizzo stagionalità..."/>

            <div style={{marginBottom:"1.2rem"}}>
              <div style={{fontSize:12,color:G,marginBottom:8,fontWeight:600}}>🗓️ Scegli le date esatte (opzionale)</div>
              <div className="dpick">
                <div>
                  <div style={{fontSize:11,color:"#777",marginBottom:4}}>Partenza</div>
                  <input type="date" className="inp" style={{width:"100%",colorScheme:"dark"}} value={startDate} onChange={e=>setStartDate(e.target.value)}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#777",marginBottom:4}}>Ritorno</div>
                  <input type="date" className="inp" style={{width:"100%",colorScheme:"dark"}} value={endDate} onChange={e=>setEndDate(e.target.value)}/>
                </div>
              </div>
              {(startDate&&endDate)&&<Btn label="Conferma date →" style={{marginTop:10}} onClick={confirmDates}/>}
            </div>

            <div style={{fontSize:12,color:"#666",margin:"1rem 0 .8rem",borderTop:".5px solid "+BRD,paddingTop:"1rem"}}>Oppure scegli un periodo generico</div>
            <div className="chips">{MONTHS.map(mo=><Chip key={mo} label={mo} onClick={()=>{setPeriod(mo);setTripYear(detectYear(mo));setStep(3)}}/>)}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:10}}>{SEASONS.map(s=><Chip key={s} label={s} onClick={()=>{setPeriod(s);setStep(3)}}/>)}</div>
          </div>}

          {/* S3 */}
          {step===3&&<div className="card">
            <div className="tt">👥 Chi viaggia?</div>
            <div className="ht">Tipo di gruppo</div>
            <div className="chips" style={{marginBottom:"1.2rem"}}>{TTYPES.map(t=><Chip key={t} label={t} sel={travType===t} onClick={()=>setTravType(t)}/>)}</div>
            {(travType==="Gruppo di amici"||travType==="Famiglia"||travType==="Gruppo con bambini")&&<div className="sep">
              <div className="slbl">Adulti</div>
              <div className="nr"><button className="nb" onClick={()=>setAdults(Math.max(1,adults-1))}>−</button><span className="nv">{adults}</span><button className="nb" onClick={()=>setAdults(adults+1)}>+</button></div>
            </div>}
            {(travType==="Famiglia"||travType==="Gruppo con bambini")&&<div className="sep">
              <div className="slbl">Bambini</div>
              <div className="nr"><button className="nb" onClick={()=>{setChildren(Math.max(0,children-1));setChildAges(p=>p.slice(0,-1))}}>−</button><span className="nv">{children}</span><button className="nb" onClick={()=>setChildren(children+1)}>+</button></div>
              {children>0&&<div><div className="slbl">Età dei bambini</div>{Array.from({length:children},(_,ci)=><div className="ar" key={ci}><span className="alb">Bambino {ci+1}</span><div className="acs">{CAGES.map(a=><div className={`ac${childAges[ci]===a?" sel":""}`} key={a} onClick={()=>setChildAges(p=>{const ag=[...p];ag[ci]=a;return ag})}>{a}</div>)}</div></div>)}</div>}
            </div>}
            {travType&&<Btn label="Continua →" style={{marginTop:"1.2rem"}} onClick={()=>setStep(4)}/>}
          </div>}

          {/* S4 */}
          {step===4&&<div className="card"><div className="tt">⏳ Per quanto tempo?</div><div className="ht">Giorni disponibili</div><div className="chips">{DURS.map(d=><Chip key={d} label={d} onClick={()=>{setDuration(d);setStep(5)}}/>)}</div></div>}

          {/* S5 */}
          {step===5&&<div className="card"><div className="tt">✨ Che tipo di viaggio?</div><div className="ht">Stile preferito</div><div className="chips">{STYLES.map(s=><Chip key={s} label={s} onClick={()=>{setStyle(s);setStep(6)}}/>)}</div></div>}

          {/* S6 */}
          {step===6&&<div className="card">
            <div className="tt">💳 Budget?</div>
            <div className="ht">Adattiamo tutto alle tue aspettative</div>
            <div className="bc">{BUDGETS.map(b=><div className={`bci${budget===b.k?" sel":""}`} key={b.k} onClick={()=>{setBudget(b.k);setStep(7)}}><div style={{fontSize:14,color:GL,fontWeight:600,marginBottom:4}}>{b.l}</div><div style={{fontSize:11,color:"#666",lineHeight:1.5}}>{b.d}</div></div>)}</div>
          </div>}

          {/* S7 */}
          {step===7&&<div className="card">
            <div className="tt">🛫 Da dove parti?</div>
            <div className="ht">Città di partenza</div>
            <div className="ir">
              <input className="inp" placeholder="Es. Milano, Roma..." value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&inp.trim()){const d=inp.trim();setDeparture(d);setInp("");genPlan(d)}}}/>
              <button className="go" onClick={()=>{if(inp.trim()){const d=inp.trim();setDeparture(d);setInp("");genPlan(d)}}}>›</button>
            </div>
          </div>}

          {/* S8 */}
          {step===8&&<div className="card" style={{maxWidth:700}}>
            <Badge text={`${dest} · ${duration} · ${period} ${tripYear}`}/>
            <div className="tt">🗺️ Il tuo piano di viaggio</div>
            <div className="ht">Ecco le città e le esperienze da non perdere</div>
            <ABox text={planText} loading={planLoad} lt="Analizzo la destinazione..."/>
            {!planLoad&&planText&&<div>
              <div style={{fontSize:13,color:"#888",margin:"1rem 0 .5rem"}}>Vuoi aggiungere o modificare qualcosa?</div>
              <textarea className="ta" placeholder="Es. Aggiungi Venezia, voglio una notte in glamping..." value={mods} onChange={e=>setMods(e.target.value)}/>
              <div className="brow"><Btn label={mods.trim()?"Rielabora →":"Vai agli alloggi →"} onClick={()=>{if(mods.trim())genRevised();else genHotels(false)}}/></div>
            </div>}
          </div>}

          {/* S9 */}
          {step===9&&<div className="card" style={{maxWidth:700}}>
            <Badge text={`Piano aggiornato · ${dest}`}/>
            <div className="tt">Piano rivisto</div>
            <div className="ht">Ho integrato le tue indicazioni</div>
            <ABox text={revText} loading={revLoad} lt="Rielaboro il piano..."/>
            {!revLoad&&revText&&<div>
              <div style={{fontSize:13,color:"#888",margin:"1rem 0 .5rem"}}>Altre modifiche o procediamo?</div>
              <textarea className="ta" placeholder="Altre modifiche? Lascia vuoto per confermare..." value={mods} onChange={e=>setMods(e.target.value)}/>
              <div className="brow"><Btn label={mods.trim()?"Rielabora ancora →":"Confermo, vai agli alloggi →"} onClick={()=>{if(mods.trim())genRevised();else genHotels(false)}}/></div>
            </div>}
          </div>}

          {/* S10 */}
          {step===10&&<div className="card" style={{maxWidth:720}}>
            <Badge text={`🏨 Alloggi · ${dest} ${tripYear}`}/>
            <div className="tt">Scegli il tuo alloggio</div>
            <div className="ht">Strutture fascia {budget}, una base per ogni area</div>
            {hotelLoad&&hotelBases.length===0&&<div className="aib"><Dots text="Cerco hotel per ogni città..."/></div>}
            {hotelBases.length>0&&<div>
              <div style={{background:"#111",border:".5px solid "+BRD,borderRadius:10,padding:"12px 16px",marginBottom:"1.2rem",fontSize:13,color:"#ccc",lineHeight:1.7}}>
                <div style={{color:GL,fontWeight:600,fontSize:14,marginBottom:4}}>{hotelBases.length>1?`🗺️ Soggiorno diviso in ${hotelBases.length} basi`:`🏨 Alloggio unico a ${hotelBases[0].city}`}</div>
                {hotelBases.length>1&&<div style={{fontSize:12,color:"#aaa"}}>{hotelBases.map(b=>`${b.city} (${b.days} notti)`).join(" → ")}</div>}
              </div>
              {hotelBases.map((base,bi)=>(
                <div key={bi} style={{marginBottom:"1.8rem"}}>
                  <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:".8rem",paddingBottom:".6rem",borderBottom:".5px solid "+BRD}}>
                    <div style={{background:G,borderRadius:8,padding:"4px 14px",fontSize:12,color:DK,fontWeight:700}}>📍 {base.city}</div>
                    <div style={{background:"#1a1400",border:".5px solid "+G,borderRadius:12,padding:"3px 10px",fontSize:11,color:G}}>{base.days} notti</div>
                    {hotelLoad&&<div style={{fontSize:11,color:"#888"}}>caricamento...</div>}
                  </div>
                  {base.hotels.map((h,hi)=><HCard key={hi} h={h} bi={bi} city={base.city}/>)}
                </div>
              ))}
              {selNames.length>0&&<div style={{background:"#111",border:".5px solid "+G,borderRadius:10,padding:"12px 14px",marginBottom:"1rem",fontSize:12,color:"#ccc"}}>
                <div style={{color:G,fontSize:11,letterSpacing:"1px",textTransform:"uppercase",marginBottom:6}}>✅ Selezione</div>
                {selNames.map((n,ni)=><div key={ni}>• {n}</div>)}
              </div>}
              {selKeys.length>0&&!showCust&&<Btn label="✅ Confermo – Genera bozza →" style={{marginBottom:10}} onClick={()=>{const hn=selNames.join(" | ");setSelStr(hn);genDraft(hn)}}/>}
              {!showCust&&<div style={{display:"flex",gap:10,marginTop:8}}>
                <Btn ghost label="＋ Altri hotel" onClick={()=>{const names=[];hotelBases.forEach(b=>b.hotels.forEach(h=>names.push(h.name||"")));setExclHotels([...exclHotels,...names]);genHotels(true)}}/>
                <Btn ghost label="✏️ Inserisci il tuo" onClick={()=>{setShowCust(true);setSelKeys([]);setSelNames([])}}/>
              </div>}
              {showCust&&<div style={{marginTop:".5rem"}}>
                <div style={{fontSize:12,color:G,marginBottom:6}}>Nome hotel (o più separati da virgola)</div>
                <div className="ir">
                  <input className="inp" placeholder="Es. Bauer Palazzo Venezia..." value={custH} onChange={e=>setCustH(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&custH.trim()){setSelStr(custH.trim());setSelNames([custH.trim()]);setShowCust(false)}}}/>
                  <button className="go" onClick={()=>{if(custH.trim()){setSelStr(custH.trim());setSelNames([custH.trim()]);setShowCust(false)}}}>✓</button>
                </div>
                <Btn ghost label="← Torna alle proposte" style={{marginTop:8}} onClick={()=>setShowCust(false)}/>
              </div>}
              {!showCust&&selStr&&selKeys.length===0&&<Btn label={`✅ Scelgo ${selStr} →`} style={{marginTop:10}} onClick={()=>genDraft(selStr)}/>}
            </div>}
          </div>}

          {/* S11 */}
          {step===11&&<div className="card" style={{maxWidth:700}}>
            <Badge text="📋 Bozza itinerario"/>
            <div className="tt">Prima bozza</div>
            <div className="ht">Ottimizzato per il tuo alloggio</div>
            <ABox text={draftText} loading={draftLoad} lt="Ottimizzo gli spostamenti..."/>
            {!draftLoad&&draftText&&<div>
              <div style={{fontSize:13,color:"#888",margin:"1rem 0 .8rem"}}>Come trovi questa bozza?</div>
              <div className="yn">
                <YN icon="✅" title="Ottima, procedi" sub="Passa alle guide" onClick={()=>setStep(12)}/>
                <YN icon="🔄" title="Rigenera" sub="Crea nuova versione" onClick={()=>genDraft(selStr)}/>
              </div>
            </div>}
          </div>}

          {/* S12 — con riepilogo bozza affiancato */}
          {step===12&&<div className="card" style={{maxWidth:780}}>
            <Badge text={`🧭 Guide · ${dest}`}/>
            <div className="tt">Vuoi una guida turistica?</div>
            <div className="ht">Guide locali certificate lungo il percorso</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start"}}>
              <div>
                {guide===null&&<div className="yn">
                  <YN icon="🙋" title="Sì, voglio una guida" sub="Scegli giorni e lingua" onClick={()=>setGuide("yes")}/>
                  <YN icon="🚶" title="No, esploro da solo" sub="Procedi senza guida" onClick={()=>{setGuide(false);setStep(13)}}/>
                </div>}
                {guide==="yes"&&<div>
                  <div style={{fontSize:12,color:G,marginBottom:6,marginTop:".5rem"}}>In quali giorni?</div>
                  <div className="chips" style={{marginBottom:"1rem"}}>{["Tutto il viaggio","Solo alcuni giorni"].map(o=><Chip key={o} label={o} sel={guideDays===o} onClick={()=>setGuideDays(o)}/>)}</div>
                  {guideDays==="Solo alcuni giorni"&&<input className="inp" style={{marginBottom:"1rem",width:"100%"}} placeholder="Es. Giorno 1, Giorno 3..." value={guideCustom} onChange={e=>setGuideCustom(e.target.value)}/>}
                  <div style={{fontSize:12,color:G,marginBottom:6}}>Lingua della guida</div>
                  <div className="chips" style={{marginBottom:"1.4rem"}}>{LANGS.map(l=><Chip key={l} label={l} sel={guideLang===l} onClick={()=>setGuideLang(l)}/>)}</div>
                  <Btn label="✅ Confermo →" onClick={()=>{setGuide({days:guideDays==="Solo alcuni giorni"?guideCustom:"Tutto il viaggio",language:guideLang});setStep(13)}}/>
                </div>}
              </div>
              <div style={{background:"#111",border:".5px solid #2a2a2a",borderRadius:12,padding:"14px 16px",maxHeight:360,overflowY:"auto"}}>
                <div style={{fontSize:11,letterSpacing:"2px",color:G,textTransform:"uppercase",fontWeight:600,marginBottom:"0.8rem"}}>Riepilogo itinerario</div>
                {draftClusters.length===0
                  ? <div style={{fontSize:12,color:"#666"}}>{draftLoad?"Sto generando la bozza...":"La bozza dell'itinerario non è ancora disponibile."}</div>
                  : draftClusters.map((g,gi)=>(
                      <div key={gi} style={{marginBottom:"1rem",paddingBottom:"0.8rem",borderBottom:gi<draftClusters.length-1?".5px solid #1a1a1a":"none"}}>
                        <div style={{fontSize:12,color:GL,fontWeight:600,marginBottom:"0.4rem"}}>{g.title}</div>
                        {g.items.length>0
                          ? g.items.map((it,ii)=><div key={ii} style={{display:"flex",gap:6,fontSize:11,color:"#aaa",marginBottom:2,lineHeight:1.5}}><span style={{color:G,flexShrink:0}}>◆</span><span>{it}</span></div>)
                          : <div style={{fontSize:11,color:"#555"}}>Attività da definire</div>}
                      </div>
                    ))
                }
              </div>
            </div>
          </div>}

          {/* S13 */}
          {step===13&&<div className="card" style={{maxWidth:700}}>
            <Badge text={`🍽️ Ristorazione · ${dest}`}/>
            <div className="tt">Suggerimenti culinari?</div>
            <div className="ht">Ristoranti e locali · budget {budget}</div>
            {!foodText&&!foodLoad&&<div className="yn">
              <YN icon="🍽️" title="Sì, suggerisci" sub="Pranzo e cena per ogni giorno" onClick={()=>{setWantsFood(true);genFood()}}/>
              <YN icon="⏭️" title="No, scelgo da solo" sub="Salta questa sezione" onClick={()=>{setWantsFood(false);setStep(14)}}/>
            </div>}
            {(foodLoad||foodText)&&<ABox text={foodText} loading={foodLoad} lt="Cerco ristoranti..."/>}
            {!foodLoad&&foodText&&<div className="brow"><Btn label="✅ Ottimo, scegli formato →" onClick={()=>setStep(14)}/></div>}
          </div>}

          {/* S14 */}
          {step===14&&<div className="card">
            <div className="tt">📋 Formato itinerario?</div>
            <div className="ht">Livello di dettaglio preferito</div>
            <div className="fc">{FMTS.map(f=><div className={`fcard${fmt===f.k?" sel":""}`} key={f.k} onClick={()=>{setFmt(f.k);genFinal(f.k)}}><div style={{fontSize:14,color:GL,fontWeight:500,marginBottom:4}}>{f.l}</div><div style={{fontSize:11,color:"#666"}}>{f.d}</div></div>)}</div>
          </div>}

          {/* S15 — RISULTATO FINALE */}
          {step===15&&<div className="rbox">
            {dImg&&<img className="rhero" src={dImg} alt={dest} onError={e=>e.target.style.display="none"}/>}
            <div className="rhead">
              <div className="rdest">{dest} {tripYear}</div>
              <div className="rmeta">{metaTags.map(t=><span className="mtag" key={t}>{t}</span>)}</div>
            </div>
            <div className="rbody">
              {finLoad&&!finText&&<Dots text="Genero l'itinerario definitivo..."/>}
              {finText&&<div className="rtxt" ref={finRef} dangerouslySetInnerHTML={{__html:mdHtml(finText)+(finLoad?"<span class='cur'></span>":"")}}/>}
              {!finLoad&&finText&&<div>
                <div className="stit">Galleria</div>
                <div className="igrid">{gal.map((s,gi)=><img key={gi} src={s} alt={dest} onError={e=>e.target.style.display="none"}/>)}</div>

                {/* PULSANTE SALVA */}
                <div style={{background:"#1a1400",border:".5px solid #C9A84C",borderRadius:12,padding:"1.2rem 1.4rem",margin:"1.5rem 0 1rem"}}>
                  <div style={{fontSize:13,color:GL,fontWeight:500,marginBottom:".5rem"}}>💾 Vuoi salvare questo itinerario?</div>
                  <div style={{fontSize:12,color:"#666",marginBottom:"1rem"}}>Lo troverai sempre nel tuo profilo</div>
                  <button onClick={saveItinerary} disabled={saving||saved} style={{background:saved?"#1a3a1a":G,border:"none",borderRadius:9,padding:"10px 24px",color:saved?"#6bff6b":DK,fontSize:13,fontWeight:600,cursor:saved?"default":"pointer",fontFamily:"'Inter',sans-serif",transition:"all .2s"}}>
                    {saving?"⏳ Salvataggio...":saved?"✅ Salvato nel profilo":"💾 Salva itinerario"}
                  </button>
                </div>

                <div className="stit">Prenota e Esplora</div>
                <div className="lgrid">{lks.map(lc=><a className="lcard" key={lc.l} href={lc.h} target="_blank" rel="noreferrer"><div><div style={{fontSize:12,color:GL,fontWeight:500}}>{lc.l}</div><div style={{fontSize:11,color:"#666",marginTop:2}}>{lc.s}</div></div></a>)}</div>

                <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:"1.5rem",borderTop:".5px solid "+BRD,paddingTop:"1.2rem",alignItems:"center"}}>
                  <Btn ghost style={{maxWidth:180}} label="← Nuovo itinerario" onClick={resetAll}/>
                  <button onClick={()=>navigate('/dashboard')} style={{background:"transparent",border:".5px solid #2a2a2a",borderRadius:10,padding:"10px 20px",color:"#888",fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all .2s"}}>👤 Vai al profilo</button>
                  <p style={{fontSize:11,color:"#555"}}>Suggerimenti orientativi. Verifica prima di prenotare.</p>
                </div>
              </div>}
            </div>
          </div>}

        </div>
      </div>
    </>
  )
}

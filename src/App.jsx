import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ═══════════════════════════════════════════════════════════════════
// DONNÉES STATIQUES (utilisateurs — gérés en dur pour l'instant)
// ═══════════════════════════════════════════════════════════════════
const USERS = [
  { id: "u1", nom: "École Emile MORIN",       role: "demandeur",  org: "École Emile MORIN",        avatar: "🏫", color: "#0ea5e9" },
  { id: "u2", nom: "Association Sportive",    role: "demandeur",  org: "Association Omnisports Municipale", avatar: "⚽", color: "#10b981" },
  { id: "u3", nom: "Maison de Quartier Nord", role: "demandeur",  org: "MJC du Quartier Nord",              avatar: "🏢", color: "#f59e0b" },
  { id: "u4", nom: "Frank Leloup",             role: "technicien", org: "Service Voirie & Bâtiments",        avatar: "🔧", color: "#8b5cf6" },
  { id: "u5", nom: "Richard Chartier",         role: "technicien", org: "Service Eau & Électricité",         avatar: "💧", color: "#06b6d4" },
  { id: "u6", nom: "Franck Maury",            role: "admin",      org: "Direction des Services Techniques", avatar: "👩‍💼", color: "#ef4444" },
];

const INVENTAIRE_DEFAUT = [
  { id: "m1",  nom: "Table pliante",         categorie: "Mobilier",     qte: 30,  dispo: 28, etat: "bon",   icon: "🪑", reservable: true,  description: "Tables rectangulaires 180cm" },
  { id: "m2",  nom: "Chaise rouge",        categorie: "Mobilier",     qte: 120, dispo: 112,etat: "bon",   icon: "🪑", reservable: true,  description: "Chaises empilables légères" },
  { id: "m3",  nom: "Barrière Heras",        categorie: "Sécurité",     qte: 50,  dispo: 40, etat: "bon",   icon: "🚧", reservable: true,  description: "Clôtures temporaires 3.5m" },
  { id: "m4",  nom: "Podium mobile",         categorie: "Événementiel", qte: 4,   dispo: 3,  etat: "bon",   icon: "🎤", reservable: true,  description: "Estrades modulables 1×2m" },
  { id: "m5",  nom: "Sono portable",         categorie: "Événementiel", qte: 3,   dispo: 2,  etat: "bon",   icon: "🔊", reservable: true,  description: "Système PA 2×200W avec micro" },
  { id: "m6",  nom: "Groupe électrogène",    categorie: "Énergie",      qte: 2,   dispo: 2,  etat: "bon",   icon: "⚡", reservable: true,  description: "Génératrice 5kVA silencieuse" },
  { id: "m7",  nom: "Tondeuse thermique",    categorie: "Espaces verts",qte: 5,   dispo: 3,  etat: "moyen", icon: "🌿", reservable: false, description: "Tondeuses autotractées 53cm" },
  { id: "m8",  nom: "Karcher haute pression",categorie: "Nettoyage",    qte: 4,   dispo: 4,  etat: "bon",   icon: "💦", reservable: false, description: "Nettoyeurs haute pression" },
  { id: "m9",  nom: "Barnums",    categorie: "Événementiel", qte: 3,   dispo: 3,  etat: "bon",   icon: "⛺", reservable: true,  description: "Chapiteaux 6×12m ignifugés" },
  { id: "m10", nom: "Panneau signalisation", categorie: "Voirie",       qte: 20,  dispo: 15, etat: "moyen", icon: "🚦", reservable: true,  description: "Panneaux K10 / K1 / B0" },
];

const SERVICES  = ["Voirie","Eau & Assainissement","Espaces Verts","Bâtiments","Électricité","Propreté"];
const PRIORITES = ["urgente","haute","normale","basse"];
const STATUTS_DEM = ["ouvert","en_cours","approuve","resolu","refuse"];
const CATEGORIES  = ["Tous","Mobilier","Événementiel","Sécurité","Énergie","Espaces verts","Nettoyage","Voirie"];

const fmt = (d) => d instanceof Date ? d.toISOString().split("T")[0] : d;
const today = new Date();

const PC = {
  urgente:{ c:"#dc2626", bg:"#fef2f2", dot:"🔴", l:"Urgente" },
  haute:  { c:"#ea580c", bg:"#fff7ed", dot:"🟠", l:"Haute" },
  normale:{ c:"#2563eb", bg:"#eff6ff", dot:"🔵", l:"Normale" },
  basse:  { c:"#6b7280", bg:"#f9fafb", dot:"⚪", l:"Basse" },
};
const SC = {
  ouvert:  { c:"#6b7280", bg:"#f3f4f6", l:"Ouvert",   i:"○", s:0 },
  en_cours:{ c:"#d97706", bg:"#fffbeb", l:"En cours", i:"◐", s:1 },
  approuve:{ c:"#7c3aed", bg:"#f5f3ff", l:"Approuvé", i:"✓", s:2 },
  resolu:  { c:"#059669", bg:"#ecfdf5", l:"Résolu",   i:"●", s:3 },
  refuse:  { c:"#dc2626", bg:"#fef2f2", l:"Refusé",   i:"✕", s:-1 },
};
const RSC = {
  approuve:  { c:"#059669", bg:"#ecfdf5", l:"Approuvée", i:"✓" },
  en_attente:{ c:"#d97706", bg:"#fffbeb", l:"En attente",i:"◷" },
  refuse:    { c:"#dc2626", bg:"#fef2f2", l:"Refusée",   i:"✕" },
};
const ETATC = {
  bon:    { c:"#059669", bg:"#ecfdf5", l:"Bon état" },
  moyen:  { c:"#d97706", bg:"#fffbeb", l:"État moyen" },
  mauvais:{ c:"#dc2626", bg:"#fef2f2", l:"Mauvais état" },
};

// ═══════════════════════════════════════════════════════════════════
// COMPOSANTS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════
const Chip = ({ color, bg, children, small }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:small?"2px 8px":"3px 10px", borderRadius:20, fontSize:small?11:12, fontWeight:700, color, background:bg }}>
    {children}
  </span>
);

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background:"white", borderRadius:14, border:"1px solid #e2e8f0", ...style }}>
    {children}
  </div>
);

// Barre de progression
const ProgressBar = ({ statut }) => {
  const steps = ["ouvert","en_cours","approuve","resolu"];
  const cur = SC[statut]?.s ?? 0;
  if (statut === "refuse") return (
    <div style={{ padding:"9px 14px", background:"#fef2f2", borderRadius:10, border:"1px solid #fca5a5", color:"#dc2626", fontWeight:700, fontSize:13 }}>
      ✕ Demande refusée
    </div>
  );
  return (
    <div style={{ display:"flex", alignItems:"flex-start" }}>
      {steps.map((s,i) => (
        <div key={s} style={{ display:"flex", alignItems:"center", flex:i<steps.length-1?1:"none" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:i<=cur?"#2563eb":"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:i<=cur?"white":"#9ca3af", boxShadow:i===cur?"0 0 0 4px rgba(37,99,235,.15)":"none" }}>
              {i<cur?"✓":i+1}
            </div>
            <div style={{ fontSize:10, fontWeight:700, color:i<=cur?"#2563eb":"#9ca3af", whiteSpace:"nowrap" }}>{SC[s].l}</div>
          </div>
          {i<steps.length-1 && <div style={{ flex:1, height:3, background:i<cur?"#2563eb":"#e2e8f0", margin:"0 5px", marginBottom:20, borderRadius:2 }} />}
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MODULE PLANNING
// ═══════════════════════════════════════════════════════════════════
const Planning = ({ reservations, inventaire, currentUser, onUpdate, onNew }) => {
  const [semaine, setSemaine] = useState(0);
  const [filterMat, setFilterMat] = useState("tous");
  const [modalRes, setModalRes] = useState(null);
  const [newRes, setNewRes] = useState({ materielId:"", qte:1, debut:"", fin:"", motif:"" });

  const isAdmin = currentUser.role === "admin";
  const isDemandeur = currentUser.role === "demandeur";
  const addDays = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
  const startDay = addDays(today, semaine*7);
  const days = Array.from({length:14},(_,i)=>addDays(startDay,i));
  const materielsReservables = inventaire.filter(m=>m.reservable);
  const filteredMats = filterMat==="tous" ? materielsReservables : materielsReservables.filter(m=>m.id===filterMat);
  const joursNoms = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
  const moisNoms  = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

  const getDispoJour = (matId, jour) => {
    const mat = inventaire.find(m=>m.id===matId);
    if (!mat) return { dispo:0, reserveQte:0, total:0 };
    const jourStr = fmt(jour);
    const reserveQte = reservations.filter(r=>r.materiel_id===matId&&r.statut!=="refuse"&&r.debut<=jourStr&&r.fin>=jourStr).reduce((s,r)=>s+r.qte,0);
    return { dispo:Math.max(0,mat.qte-reserveQte), reserveQte, total:mat.qte };
  };

  const submitReservation = async () => {
    if (!newRes.materielId||!newRes.debut||!newRes.fin||!newRes.motif) return;
    const mat = inventaire.find(m=>m.id===newRes.materielId);
    const res = {
      id: `r${Date.now()}`,
      materiel_id: newRes.materielId,
      materiel_nom: mat?.nom,
      qte: +newRes.qte,
      demandeur_id: currentUser.id,
      demandeur: currentUser.nom,
      debut: newRes.debut,
      fin: newRes.fin,
      motif: newRes.motif,
      statut: "en_attente",
    };
    await onNew(res);
    setModalRes(null);
    setNewRes({ materielId:"", qte:1, debut:"", fin:"", motif:"" });
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={()=>setSemaine(s=>s-1)} style={{ background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontWeight:700, fontSize:15, fontFamily:"inherit" }}>‹</button>
          <div style={{ fontWeight:700, fontSize:14, minWidth:180, textAlign:"center" }}>
            {fmt(startDay)} → {fmt(addDays(startDay,13))}
          </div>
          <button onClick={()=>setSemaine(s=>s+1)} style={{ background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontWeight:700, fontSize:15, fontFamily:"inherit" }}>›</button>
          <button onClick={()=>setSemaine(0)} style={{ background:"#eff6ff", border:"1px solid #93c5fd", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontWeight:700, fontSize:12, color:"#2563eb", fontFamily:"inherit" }}>Aujourd'hui</button>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <select value={filterMat} onChange={e=>setFilterMat(e.target.value)} style={{ padding:"7px 12px", border:"1.5px solid #e2e8f0", borderRadius:9, fontSize:13, fontFamily:"inherit", background:"white" }}>
            <option value="tous">Tous les matériels</option>
            {materielsReservables.map(m=><option key={m.id} value={m.id}>{m.icon} {m.nom}</option>)}
          </select>
          {(isDemandeur||isAdmin) && (
            <button onClick={()=>setModalRes("new")} style={{ background:"#2563eb", color:"white", padding:"8px 18px", borderRadius:9, border:"none", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
              + Réserver
            </button>
          )}
        </div>
      </div>

      {/* Légende */}
      <div style={{ display:"flex", gap:14, marginBottom:14, flexWrap:"wrap" }}>
        {[["#dcfce7","#16a34a","Disponible"],["#fef9c3","#ca8a04","Partiel"],["#fee2e2","#dc2626","Indisponible"]].map(([bg,c,l])=>(
          <div key={l} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:600, color:"#6b7280" }}>
            <div style={{ width:14, height:14, borderRadius:3, background:bg, border:`1.5px solid ${c}` }} />{l}
          </div>
        ))}
      </div>

      {/* Grille */}
      <Card style={{ overflow:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:900 }}>
          <thead>
            <tr style={{ background:"#f8fafc" }}>
              <th style={{ padding:"10px 14px", textAlign:"left", fontSize:12, fontWeight:700, color:"#64748b", borderBottom:"2px solid #e2e8f0", minWidth:180, position:"sticky", left:0, background:"#f8fafc", zIndex:2 }}>Matériel</th>
              {days.map((d,i) => {
                const isToday = fmt(d)===fmt(today);
                const isWE = d.getDay()===0||d.getDay()===6;
                return (
                  <th key={i} style={{ padding:"6px 4px", textAlign:"center", fontSize:11, fontWeight:700, borderBottom:"2px solid #e2e8f0", minWidth:52, background:isToday?"#eff6ff":isWE?"#f8fafc":"#f8fafc", color:isToday?"#2563eb":isWE?"#94a3b8":"#64748b" }}>
                    <div>{joursNoms[d.getDay()]}</div>
                    <div style={{ fontSize:13, fontWeight:800 }}>{d.getDate()}</div>
                    <div style={{ fontSize:10 }}>{moisNoms[d.getMonth()]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredMats.map(mat => (
              <tr key={mat.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                <td style={{ padding:"8px 14px", position:"sticky", left:0, background:"white", zIndex:1, borderRight:"2px solid #e2e8f0" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:20 }}>{mat.icon}</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{mat.nom}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>Total : {mat.qte}</div>
                    </div>
                  </div>
                </td>
                {days.map((d,i) => {
                  const { dispo, total } = getDispoJour(mat.id, d);
                  const ratio = total>0?dispo/total:1;
                  const bg = dispo===0?"#fee2e2":ratio<0.4?"#fef9c3":"#dcfce7";
                  const textC = dispo===0?"#dc2626":ratio<0.4?"#ca8a04":"#16a34a";
                  const isWE = d.getDay()===0||d.getDay()===6;
                  const isToday = fmt(d)===fmt(today);
                  return (
                    <td key={i} style={{ padding:"4px 3px", textAlign:"center", background:isWE?"#f8fafc":isToday?"#fffbeb":"white" }}>
                      <div style={{ background:bg, borderRadius:6, padding:"4px 2px", margin:"0 2px" }}>
                        <div style={{ fontSize:12, fontWeight:800, color:textC }}>{dispo}</div>
                        <div style={{ fontSize:9, color:"#94a3b8" }}>/{total}</div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Liste réservations */}
      <div style={{ marginTop:24 }}>
        <h3 style={{ fontWeight:800, fontSize:16, marginBottom:14 }}>{isAdmin?"Toutes les réservations":"Mes réservations"}</h3>
        <Card>
          {reservations.filter(r=>isDemandeur?r.demandeur_id===currentUser.id:true).length===0&&(
            <div style={{ textAlign:"center", padding:36, color:"#cbd5e1" }}>Aucune réservation</div>
          )}
          {reservations.filter(r=>isDemandeur?r.demandeur_id===currentUser.id:true).map(r=>(
            <div key={r.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 16px", borderBottom:"1px solid #f1f5f9" }}>
              <span style={{ fontSize:24 }}>{inventaire.find(m=>m.id===r.materiel_id)?.icon||"📦"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{r.materiel_nom} <span style={{ fontWeight:500, color:"#6b7280" }}>×{r.qte}</span></div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{r.motif} · {r.debut} → {r.fin}</div>
                {isAdmin&&<div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>👤 {r.demandeur}</div>}
              </div>
              <Chip color={RSC[r.statut]?.c} bg={RSC[r.statut]?.bg}>{RSC[r.statut]?.i} {RSC[r.statut]?.l}</Chip>
              {isAdmin&&r.statut==="en_attente"&&(
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>onUpdate(r.id,{statut:"approuve"})} style={{ padding:"6px 12px", borderRadius:8, background:"#ecfdf5", color:"#059669", border:"1.5px solid #6ee7b7", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>✓ Approuver</button>
                  <button onClick={()=>onUpdate(r.id,{statut:"refuse"})} style={{ padding:"6px 12px", borderRadius:8, background:"#fef2f2", color:"#dc2626", border:"1.5px solid #fca5a5", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>✕ Refuser</button>
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>

      {/* Modal réservation */}
      {modalRes==="new"&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModalRes(null)}>
          <div style={{ background:"white", borderRadius:16, width:"100%", maxWidth:480, padding:28 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:18, marginBottom:20 }}>📅 Nouvelle réservation</div>
            <div style={{ display:"grid", gap:14 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>Matériel *</label>
                <select value={newRes.materielId} onChange={e=>setNewRes({...newRes,materielId:e.target.value})} style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #e2e8f0", borderRadius:9, fontSize:14, fontFamily:"inherit", background:"#f8fafc" }}>
                  <option value="">— Choisir —</option>
                  {materielsReservables.map(m=><option key={m.id} value={m.id}>{m.icon} {m.nom} (dispo: {m.dispo}/{m.qte})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>Quantité *</label>
                <input type="number" min="1" value={newRes.qte} onChange={e=>setNewRes({...newRes,qte:e.target.value})} style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #e2e8f0", borderRadius:9, fontSize:14, fontFamily:"inherit", background:"#f8fafc" }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>Début *</label>
                  <input type="date" value={newRes.debut} onChange={e=>setNewRes({...newRes,debut:e.target.value})} style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #e2e8f0", borderRadius:9, fontSize:14, fontFamily:"inherit", background:"#f8fafc" }} />
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>Fin *</label>
                  <input type="date" value={newRes.fin} onChange={e=>setNewRes({...newRes,fin:e.target.value})} style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #e2e8f0", borderRadius:9, fontSize:14, fontFamily:"inherit", background:"#f8fafc" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>Motif *</label>
                <input type="text" placeholder="Ex : Kermesse, tournoi sportif…" value={newRes.motif} onChange={e=>setNewRes({...newRes,motif:e.target.value})} style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #e2e8f0", borderRadius:9, fontSize:14, fontFamily:"inherit", background:"#f8fafc" }} />
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
              <button onClick={()=>setModalRes(null)} style={{ padding:"9px 18px", borderRadius:9, border:"1.5px solid #e2e8f0", background:"white", color:"#6b7280", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Annuler</button>
              <button onClick={submitReservation} style={{ padding:"9px 22px", borderRadius:9, background:"#2563eb", color:"white", fontWeight:700, cursor:"pointer", border:"none", fontFamily:"inherit" }}>Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MODULE INVENTAIRE
// ═══════════════════════════════════════════════════════════════════
const Inventaire = ({ inventaire, onUpdate, onAdd, reservations, currentUser }) => {
  const [cat, setCat] = useState("Tous");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nom:"", categorie:"Mobilier", qte:1, dispo:1, etat:"bon", icon:"📦", reservable:true, description:"" });
  const isAdmin = currentUser.role==="admin";
  const filtered = cat==="Tous"?inventaire:inventaire.filter(m=>m.categorie===cat);

  const addMateriel = async () => {
    const m = { ...form, id:`m${Date.now()}`, qte:+form.qte, dispo:+form.dispo };
    await onAdd(m);
    setModal(null);
    setForm({ nom:"", categorie:"Mobilier", qte:1, dispo:1, etat:"bon", icon:"📦", reservable:true, description:"" });
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
          {CATEGORIES.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{ padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:700, border:`1.5px solid ${cat===c?"#2563eb":"#e2e8f0"}`, background:cat===c?"#eff6ff":"transparent", color:cat===c?"#2563eb":"#6b7280", cursor:"pointer", fontFamily:"inherit" }}>{c}</button>
          ))}
        </div>
        {isAdmin&&<button onClick={()=>setModal("add")} style={{ background:"#2563eb", color:"white", padding:"8px 18px", borderRadius:9, border:"none", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>+ Ajouter</button>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
        {filtered.map(m=>{
          const ratio = m.dispo/m.qte;
          return (
            <Card key={m.id} style={{ padding:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{m.icon}</div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14 }}>{m.nom}</div>
                    <div style={{ fontSize:12, color:"#64748b" }}>{m.categorie}</div>
                  </div>
                </div>
                <Chip color={ETATC[m.etat]?.c} bg={ETATC[m.etat]?.bg} small>{ETATC[m.etat]?.l}</Chip>
              </div>
              <div style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>{m.description}</div>
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:12, fontWeight:700 }}>Disponibilité</span>
                  <span style={{ fontSize:13, fontWeight:800, color:ratio===0?"#dc2626":ratio<0.4?"#d97706":"#059669" }}>{m.dispo} / {m.qte}</span>
                </div>
                <div style={{ height:8, background:"#f1f5f9", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ width:`${ratio*100}%`, height:"100%", background:ratio===0?"#fca5a5":ratio<0.4?"#fde68a":"#86efac", borderRadius:4 }} />
                </div>
              </div>
              <Chip color={m.reservable?"#2563eb":"#6b7280"} bg={m.reservable?"#eff6ff":"#f9fafb"} small>
                {m.reservable?"✓ Réservable":"× Usage interne"}
              </Chip>
              {isAdmin&&(
                <div style={{ marginTop:12, display:"flex", gap:8 }}>
                  <select value={m.etat} onChange={e=>onUpdate(m.id,{etat:e.target.value})} style={{ flex:1, padding:"6px 10px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:12, fontFamily:"inherit", background:"#f8fafc" }}>
                    <option value="bon">Bon état</option>
                    <option value="moyen">État moyen</option>
                    <option value="mauvais">Mauvais état</option>
                  </select>
                  <input type="number" value={m.dispo} min={0} max={m.qte}
                    onChange={e=>onUpdate(m.id,{dispo:+e.target.value})}
                    style={{ width:64, padding:"6px 10px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:12, fontFamily:"inherit", background:"#f8fafc" }} />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {modal==="add"&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"white", borderRadius:16, width:"100%", maxWidth:480, padding:28 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:18, marginBottom:20 }}>📦 Ajouter un matériel</div>
            <div style={{ display:"grid", gap:13 }}>
              {[["nom","Nom *","text","Ex: Chaise pliante"],["icon","Icône","text","Ex: 🪑"],["description","Description","text","Courte description"]].map(([k,l,t,ph])=>(
                <div key={k}>
                  <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:4 }}>{l}</label>
                  <input type={t} placeholder={ph} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:14, fontFamily:"inherit", background:"#f8fafc" }} />
                </div>
              ))}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:4 }}>Qté totale</label>
                  <input type="number" min="1" value={form.qte} onChange={e=>setForm({...form,qte:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:14, fontFamily:"inherit", background:"#f8fafc" }} />
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:4 }}>Dispo</label>
                  <input type="number" min="0" value={form.dispo} onChange={e=>setForm({...form,dispo:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:14, fontFamily:"inherit", background:"#f8fafc" }} />
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:4 }}>Catégorie</label>
                  <select value={form.categorie} onChange={e=>setForm({...form,categorie:e.target.value})} style={{ width:"100%", padding:"9px 10px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, fontFamily:"inherit", background:"#f8fafc" }}>
                    {CATEGORIES.filter(c=>c!=="Tous").map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:4 }}>Réservable ?</label>
                <div style={{ display:"flex", gap:10 }}>
                  {[true,false].map(v=>(
                    <button key={String(v)} onClick={()=>setForm({...form,reservable:v})} style={{ flex:1, padding:"9px", border:`2px solid ${form.reservable===v?"#2563eb":"#e2e8f0"}`, borderRadius:8, background:form.reservable===v?"#eff6ff":"white", color:form.reservable===v?"#2563eb":"#6b7280", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                      {v?"✓ Oui":"× Non"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:18 }}>
              <button onClick={()=>setModal(null)} style={{ padding:"9px 18px", borderRadius:9, border:"1.5px solid #e2e8f0", background:"white", color:"#6b7280", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Annuler</button>
              <button onClick={addMateriel} style={{ padding:"9px 22px", borderRadius:9, background:"#2563eb", color:"white", fontWeight:700, cursor:"pointer", border:"none", fontFamily:"inherit" }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// APP PRINCIPALE
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [demandes,    setDemandes]    = useState([]);
  const [inventaire,  setInventaire]  = useState([]);
  const [reservations,setReservations]= useState([]);
  const [loading,     setLoading]     = useState(false);
  const [tab,         setTab]         = useState("demandes");
  const [page,        setPage]        = useState("liste");
  const [selected,    setSelected]    = useState(null);
  const [filtreStatut,  setFiltreStatut]  = useState("tous");
  const [filtreService, setFiltreService] = useState("tous");
  const [recherche,     setRecherche]     = useState("");
  const [newComment,    setNewComment]    = useState("");
  const [newForm, setNewForm] = useState({ type:"intervention", titre:"", description:"", service:"Bâtiments", priorite:"normale", localisation:"", quantite:"", budget:"" });

  const isAdmin = currentUser?.role==="admin";
  const isTech  = currentUser?.role==="technicien";
  const isDem   = currentUser?.role==="demandeur";
  const getUser = id => USERS.find(u=>u.id===id);

  // ── Chargement données Supabase ───────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    chargerDonnees();
  }, [currentUser]);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      // Inventaire
      const { data: inv } = await supabase.from("inventaire").select("*");
      if (inv && inv.length > 0) {
        setInventaire(inv);
      } else {
        // Premier lancement : insérer les données par défaut
        await supabase.from("inventaire").insert(INVENTAIRE_DEFAUT);
        setInventaire(INVENTAIRE_DEFAUT);
      }
      // Demandes
      const { data: dem } = await supabase.from("demandes").select("*").order("date", { ascending: false });
      setDemandes(dem || []);
      // Réservations
      const { data: res } = await supabase.from("reservations").select("*").order("debut", { ascending: true });
      setReservations(res || []);
    } catch(e) {
      console.error("Erreur chargement:", e);
    }
    setLoading(false);
  };

  // ── DEMANDES ──────────────────────────────────────────────────
  const submitDemande = async () => {
    if (!newForm.titre) return;
    const d = {
      id: `DEM-${Date.now()}`,
      type: newForm.type,
      titre: newForm.titre,
      description: newForm.description,
      service: newForm.service,
      priorite: newForm.priorite,
      statut: "ouvert",
      demandeur_id: currentUser.id,
      technicien_id: null,
      date: fmt(today),
      localisation: newForm.localisation || null,
      quantite: newForm.quantite ? +newForm.quantite : null,
      budget: newForm.budget ? +newForm.budget : null,
      commentaires: [],
    };
    const { error } = await supabase.from("demandes").insert(d);
    if (!error) {
      setDemandes(prev => [d, ...prev]);
      setPage("liste");
      setNewForm({ type:"intervention", titre:"", description:"", service:"Bâtiments", priorite:"normale", localisation:"", quantite:"", budget:"" });
    }
  };

  const updateDemande = async (id, changes) => {
    const { error } = await supabase.from("demandes").update(changes).eq("id", id);
    if (!error) {
      setDemandes(prev => prev.map(d => d.id===id ? {...d,...changes} : d));
      if (selected?.id===id) setSelected(prev => ({...prev,...changes}));
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    const c = { auteur:currentUser.nom, date:fmt(today), texte:newComment, role:currentUser.role };
    const newCommentaires = [...(selected.commentaires||[]), c];
    await updateDemande(selected.id, { commentaires: newCommentaires });
    setNewComment("");
  };

  // ── INVENTAIRE ────────────────────────────────────────────────
  const updateInventaire = async (id, changes) => {
    const { error } = await supabase.from("inventaire").update(changes).eq("id", id);
    if (!error) setInventaire(prev => prev.map(m => m.id===id ? {...m,...changes} : m));
  };

  const addInventaire = async (m) => {
    const { error } = await supabase.from("inventaire").insert(m);
    if (!error) setInventaire(prev => [...prev, m]);
  };

  // ── RÉSERVATIONS ──────────────────────────────────────────────
  const updateReservation = async (id, changes) => {
    const { error } = await supabase.from("reservations").update(changes).eq("id", id);
    if (!error) setReservations(prev => prev.map(r => r.id===id ? {...r,...changes} : r));
  };

  const addReservation = async (r) => {
    const { error } = await supabase.from("reservations").insert(r);
    if (!error) setReservations(prev => [r, ...prev]);
  };

  // ── Filtres ───────────────────────────────────────────────────
  const visDemandes = demandes.filter(d => {
    if (isDem && d.demandeur_id !== currentUser.id) return false;
    if (filtreStatut!=="tous" && d.statut!==filtreStatut) return false;
    if (filtreService!=="tous" && d.service!==filtreService) return false;
    if (recherche && !d.titre.toLowerCase().includes(recherche.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total:   visDemandes.length,
    ouvert:  visDemandes.filter(d=>d.statut==="ouvert").length,
    enCours: visDemandes.filter(d=>d.statut==="en_cours").length,
    resolus: visDemandes.filter(d=>d.statut==="resolu").length,
    urgentes:demandes.filter(d=>d.priorite==="urgente"&&d.statut!=="resolu"&&(isDem?d.demandeur_id===currentUser?.id:true)).length,
    resaAttente:reservations.filter(r=>r.statut==="en_attente"&&(isDem?r.demandeur_id===currentUser?.id:true)).length,
  };

  const TABS = [
    { id:"demandes",     icon:"📋", label:"Demandes",  badge:stats.urgentes },
    { id:"inventaire",   icon:"📦", label:"Inventaire", badge:0 },
    { id:"reservations", icon:"📅", label:"Planning",   badge:stats.resaAttente },
  ];

  // ══════════════════════════════════════════════════════════════
  // ÉCRAN LOGIN
  // ══════════════════════════════════════════════════════════════
  if (!currentUser) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#0d1b3e 0%,#1a3a6e 55%,#0d1b3e 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        .ucard{cursor:pointer;transition:all .2s;border:2px solid rgba(255,255,255,.08);}
        .ucard:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.4)!important;border-color:rgba(255,255,255,.28)!important;}
      `}</style>
      <div style={{ textAlign:"center", marginBottom:42, animation:"float 3.2s ease-in-out infinite" }}>
        <div style={{ fontSize:56, marginBottom:12 }}>🏛️</div>
        <div style={{ fontWeight:800, fontSize:28, color:"white" }}>Services Techniques</div>
        <div style={{ fontSize:14, color:"#7da4d8", marginTop:6 }}>Portail municipal — Coeur de Sologne</div>
      </div>
      <div style={{ width:"100%", maxWidth:700 }}>
        {[["Établissements & Associations","demandeur"],["Agents & Administration",null]].map(([titre,roleFilter])=>(
          <div key={titre} style={{ marginBottom:22 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#4e7aab", textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:12 }}>{titre}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
              {USERS.filter(u=>roleFilter?u.role===roleFilter:u.role!=="demandeur").map(u=>(
                <div key={u.id} className="ucard" onClick={()=>{ setCurrentUser(u); setTab("demandes"); setPage("liste"); }}
                  style={{ background:"rgba(255,255,255,.06)", borderRadius:14, padding:"18px 20px", backdropFilter:"blur(12px)" }}>
                  <div style={{ fontSize:32, marginBottom:9 }}>{u.avatar}</div>
                  <div style={{ fontWeight:700, fontSize:14, color:"white", marginBottom:3 }}>{u.nom}</div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginBottom:10 }}>{u.org}</div>
                  <span style={{ fontSize:11, fontWeight:700, color:u.color, background:`${u.color}22`, padding:"3px 10px", borderRadius:20 }}>
                    {u.role==="admin"?"Administrateur":u.role==="technicien"?"Technicien":"Demandeur"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // APP
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", minHeight:"100vh", background:"#f1f5f9", color:"#0f172a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
        input,select,textarea{font-family:inherit;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .anim{animation:fadeIn .2s ease;}
        .row{cursor:pointer;transition:background .12s;border-bottom:1px solid #f1f5f9;}
        .row:hover{background:#f8fafc!important}.row:last-child{border-bottom:none;}
        input[type=text],input[type=number],input[type=date],select,textarea{width:100%;padding:10px 13px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:14px;color:#0f172a;outline:none;transition:border-color .15s;background:#f8fafc;}
        input:focus,select:focus,textarea:focus{border-color:#2563eb;background:white;box-shadow:0 0 0 3px rgba(37,99,235,.1);}
        label{font-size:13px;font-weight:600;color:#374151;margin-bottom:5px;display:block;}
        .btn{cursor:pointer;border:none;font-family:inherit;transition:all .15s;}
        .btn:hover{opacity:.87;transform:translateY(-1px)}.btn:active{transform:translateY(0)}
      `}</style>

      {/* HEADER */}
      <div style={{ background:"white", borderBottom:"1px solid #e2e8f0", padding:"0 24px", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:1240, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>🏛️</div>
            <div>
              <div style={{ fontWeight:800, fontSize:15 }}>Services Techniques</div>
              <div style={{ fontSize:10, color:"#94a3b8" }}>Portail municipal · Coeur de Sologne</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {TABS.map(t=>(
              <button key={t.id} className="btn" onClick={()=>{ setTab(t.id); setPage("liste"); }}
                style={{ padding:"6px 16px", borderRadius:8, fontSize:13, fontWeight:700, background:tab===t.id?"#eff6ff":"transparent", color:tab===t.id?"#2563eb":"#6b7280", position:"relative" }}>
                {t.icon} {t.label}
                {t.badge>0&&<span style={{ position:"absolute", top:2, right:4, width:16, height:16, borderRadius:"50%", background:"#ef4444", color:"white", fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{t.badge}</span>}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {loading && <div style={{ fontSize:12, color:"#94a3b8" }}>⏳ Chargement…</div>}
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 12px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:20 }}>
              <span style={{ fontSize:18 }}>{currentUser.avatar}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700 }}>{currentUser.nom}</div>
                <div style={{ fontSize:10, color:currentUser.color, fontWeight:700 }}>{currentUser.role==="admin"?"Admin":currentUser.role==="technicien"?"Technicien":"Demandeur"}</div>
              </div>
            </div>
            <button className="btn" onClick={()=>setCurrentUser(null)} style={{ background:"#f1f5f9", color:"#64748b", padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:700, border:"1px solid #e2e8f0" }}>← Changer</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1240, margin:"0 auto", padding:22 }}>

        {/* INVENTAIRE */}
        {tab==="inventaire"&&(
          <div className="anim">
            <h1 style={{ fontWeight:800, fontSize:22, marginBottom:18 }}>📦 Inventaire du matériel</h1>
            <Inventaire inventaire={inventaire} onUpdate={updateInventaire} onAdd={addInventaire} reservations={reservations} currentUser={currentUser} />
          </div>
        )}

        {/* PLANNING */}
        {tab==="reservations"&&(
          <div className="anim">
            <h1 style={{ fontWeight:800, fontSize:22, marginBottom:18 }}>📅 Planning des réservations</h1>
            <Planning reservations={reservations} inventaire={inventaire} currentUser={currentUser} onUpdate={updateReservation} onNew={addReservation} />
          </div>
        )}

        {/* DEMANDES */}
        {tab==="demandes"&&(
          <div className="anim">

            {/* Nouvelle demande */}
            {page==="nouvelle"&&(
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
                  <button className="btn" onClick={()=>setPage("liste")} style={{ background:"#f1f5f9", color:"#374151", padding:"7px 14px", borderRadius:8, fontSize:13, fontWeight:700, border:"1px solid #e2e8f0" }}>← Retour</button>
                  <h1 style={{ fontSize:22, fontWeight:800 }}>Nouvelle demande</h1>
                </div>
                <div style={{ background:"white", borderRadius:14, border:"1px solid #e2e8f0", maxWidth:580, padding:28 }}>
                  <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                    {["intervention","materiel"].map(t=>(
                      <button key={t} className="btn" onClick={()=>setNewForm({...newForm,type:t})}
                        style={{ flex:1, padding:12, border:`2px solid ${newForm.type===t?"#2563eb":"#e2e8f0"}`, borderRadius:10, background:newForm.type===t?"#eff6ff":"white", color:newForm.type===t?"#2563eb":"#6b7280", fontWeight:700, fontSize:14 }}>
                        {t==="intervention"?"🔧 Intervention":"📦 Matériel"}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:"grid", gap:15 }}>
                    <div><label>Titre *</label><input type="text" placeholder="Décrivez le problème en quelques mots" value={newForm.titre} onChange={e=>setNewForm({...newForm,titre:e.target.value})} /></div>
                    <div><label>Description</label><textarea rows={3} placeholder="Détails, contexte, impact…" value={newForm.description} onChange={e=>setNewForm({...newForm,description:e.target.value})} style={{ resize:"vertical" }} /></div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div><label>Service</label><select value={newForm.service} onChange={e=>setNewForm({...newForm,service:e.target.value})}>{SERVICES.map(s=><option key={s}>{s}</option>)}</select></div>
                      <div><label>Urgence</label><select value={newForm.priorite} onChange={e=>setNewForm({...newForm,priorite:e.target.value})}>{PRIORITES.map(p=><option key={p} value={p}>{PC[p].l}</option>)}</select></div>
                    </div>
                    {newForm.type==="intervention"
                      ?<div><label>Localisation</label><input type="text" placeholder="Salle, bâtiment, étage…" value={newForm.localisation} onChange={e=>setNewForm({...newForm,localisation:e.target.value})} /></div>
                      :<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        <div><label>Quantité</label><input type="number" min="1" value={newForm.quantite} onChange={e=>setNewForm({...newForm,quantite:e.target.value})} /></div>
                        <div><label>Budget (€)</label><input type="number" min="0" value={newForm.budget} onChange={e=>setNewForm({...newForm,budget:e.target.value})} /></div>
                      </div>
                    }
                    <div style={{ display:"flex", justifyContent:"flex-end", gap:10, paddingTop:8, borderTop:"1px solid #f1f5f9" }}>
                      <button className="btn" onClick={()=>setPage("liste")} style={{ padding:"10px 20px", borderRadius:9, border:"1.5px solid #e2e8f0", background:"white", color:"#6b7280", fontWeight:600 }}>Annuler</button>
                      <button className="btn" onClick={submitDemande} style={{ padding:"10px 24px", borderRadius:9, background:newForm.titre?"#2563eb":"#cbd5e1", color:"white", fontWeight:700 }}>Envoyer →</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Détail demande */}
            {page==="detail"&&selected&&(
              <div>
                <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:20 }}>
                  <button className="btn" onClick={()=>setPage("liste")} style={{ background:"#f1f5f9", color:"#374151", padding:"7px 14px", borderRadius:8, fontSize:13, fontWeight:700, border:"1px solid #e2e8f0" }}>← Retour</button>
                  <span style={{ fontSize:13, color:"#2563eb", fontWeight:600 }}>{selected.id}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 330px", gap:18, alignItems:"start" }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <Card style={{ padding:22 }}>
                      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                        <Chip color={selected.type==="intervention"?"#2563eb":"#7c3aed"} bg={selected.type==="intervention"?"#eff6ff":"#f5f3ff"}>{selected.type==="intervention"?"🔧 Intervention":"📦 Matériel"}</Chip>
                        <Chip color={PC[selected.priorite]?.c} bg={PC[selected.priorite]?.bg}>{PC[selected.priorite]?.dot} {PC[selected.priorite]?.l}</Chip>
                      </div>
                      <h2 style={{ fontSize:20, fontWeight:800, marginBottom:10 }}>{selected.titre}</h2>
                      <p style={{ fontSize:14, color:"#475569", lineHeight:1.7 }}>{selected.description||"—"}</p>
                    </Card>
                    <Card style={{ padding:"16px 22px" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:14 }}>Avancement</div>
                      <ProgressBar statut={selected.statut} />
                    </Card>
                    <Card style={{ padding:22 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:14 }}>Informations</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        {[["Service",selected.service],["Date",selected.date],["Demandeur",getUser(selected.demandeur_id)?.nom],["Technicien",selected.technicien_id?getUser(selected.technicien_id)?.nom:"Non assigné"],selected.localisation?["Lieu",selected.localisation]:null].filter(Boolean).map(([k,v])=>(
                          <div key={k}>
                            <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>{k}</div>
                            <div style={{ fontSize:14, fontWeight:500 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <Card style={{ padding:22 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:14 }}>Suivi ({(selected.commentaires||[]).length})</div>
                      {(selected.commentaires||[]).length===0&&<div style={{ color:"#cbd5e1", textAlign:"center", padding:"18px 0", fontSize:14 }}>Aucun commentaire</div>}
                      {(selected.commentaires||[]).map((c,i)=>(
                        <div key={i} style={{ borderRadius:11, padding:"11px 13px", marginBottom:8, background:c.role==="admin"?"#fef2f2":c.role==="technicien"?"#f5f3ff":"#f0f9ff", border:`1px solid ${c.role==="admin"?"#fca5a5":c.role==="technicien"?"#c4b5fd":"#bae6fd"}` }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                            <span style={{ fontWeight:700, fontSize:13, color:c.role==="admin"?"#dc2626":c.role==="technicien"?"#7c3aed":"#0ea5e9" }}>{c.role==="admin"?"👩‍💼":c.role==="technicien"?"🔧":"🏢"} {c.auteur}</span>
                            <span style={{ fontSize:11, color:"#94a3b8" }}>{c.date}</span>
                          </div>
                          <p style={{ fontSize:14, color:"#374151", lineHeight:1.6 }}>{c.texte}</p>
                        </div>
                      ))}
                      {selected.statut!=="resolu"&&selected.statut!=="refuse"&&(
                        <div style={{ display:"flex", gap:10, marginTop:10 }}>
                          <textarea rows={2} placeholder="Commentaire ou mise à jour…" value={newComment} onChange={e=>setNewComment(e.target.value)} style={{ flex:1, resize:"none" }} />
                          <button className="btn" onClick={addComment} style={{ padding:"0 18px", borderRadius:9, background:"#2563eb", color:"white", fontWeight:700, alignSelf:"stretch", fontSize:13 }}>→</button>
                        </div>
                      )}
                    </Card>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <Card style={{ padding:18 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:12 }}>Statut</div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 13px", background:SC[selected.statut]?.bg, borderRadius:10, border:`1px solid ${SC[selected.statut]?.c}44`, marginBottom:12 }}>
                        <span style={{ fontSize:18 }}>{SC[selected.statut]?.i}</span>
                        <span style={{ fontWeight:800, color:SC[selected.statut]?.c, fontSize:14 }}>{SC[selected.statut]?.l}</span>
                      </div>
                      {(isAdmin||isTech)&&STATUTS_DEM.filter(s=>s!==selected.statut).map(s=>(
                        <button key={s} className="btn" onClick={()=>updateDemande(selected.id,{statut:s})}
                          style={{ width:"100%", marginBottom:6, padding:"8px 12px", borderRadius:8, border:`1.5px solid ${SC[s].c}55`, background:SC[s].bg, color:SC[s].c, fontWeight:700, fontSize:13, textAlign:"left" }}>
                          {SC[s].i} {SC[s].l}
                        </button>
                      ))}
                      {isAdmin&&(
                        <div style={{ marginTop:14 }}>
                          <label>Technicien assigné</label>
                          <select value={selected.technicien_id||""} onChange={e=>updateDemande(selected.id,{technicien_id:e.target.value||null})}>
                            <option value="">— Non assigné</option>
                            {USERS.filter(u=>u.role==="technicien").map(u=><option key={u.id} value={u.id}>{u.nom}</option>)}
                          </select>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* Liste demandes */}
            {page==="liste"&&(
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
                  <div>
                    <h1 style={{ fontSize:22, fontWeight:800 }}>{isDem?"Mes demandes":"Toutes les demandes"}</h1>
                    <p style={{ fontSize:13, color:"#64748b", marginTop:3 }}>{isDem?currentUser.org:`Vue ${currentUser.role==="admin"?"administrateur":"technicien"}`}</p>
                  </div>
                  {isDem&&<button className="btn" onClick={()=>setPage("nouvelle")} style={{ background:"#2563eb", color:"white", padding:"9px 18px", borderRadius:9, fontSize:13, fontWeight:700 }}>+ Nouvelle demande</button>}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:11, marginBottom:16 }}>
                  {[{l:"Total",v:stats.total,i:"📋",c:"#2563eb"},{l:"Ouvertes",v:stats.ouvert,i:"○",c:"#6b7280"},{l:"En cours",v:stats.enCours,i:"◐",c:"#d97706"},{l:"Résolues",v:stats.resolus,i:"●",c:"#059669"}].map(s=>(
                    <Card key={s.l} style={{ padding:"13px 15px" }}>
                      <div style={{ fontSize:18 }}>{s.i}</div>
                      <div style={{ fontSize:26, fontWeight:800, color:s.c, margin:"3px 0 2px" }}>{s.v}</div>
                      <div style={{ fontSize:12, color:"#9ca3af", fontWeight:500 }}>{s.l}</div>
                    </Card>
                  ))}
                </div>
                <Card style={{ padding:"11px 15px", marginBottom:12, display:"flex", flexWrap:"wrap", gap:9, alignItems:"center" }}>
                  <input type="text" placeholder="🔍  Rechercher…" value={recherche} onChange={e=>setRecherche(e.target.value)} style={{ width:200, flex:"0 0 200px" }} />
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {["tous",...STATUTS_DEM].map(s=>(
                      <button key={s} onClick={()=>setFiltreStatut(s)} style={{ padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700, border:`1.5px solid ${filtreStatut===s?"#2563eb":"#e2e8f0"}`, background:filtreStatut===s?"#eff6ff":"transparent", color:filtreStatut===s?"#2563eb":"#6b7280", cursor:"pointer", fontFamily:"inherit" }}>
                        {s==="tous"?"Tous":SC[s]?.l}
                      </button>
                    ))}
                  </div>
                  {(isAdmin||isTech)&&(
                    <select value={filtreService} onChange={e=>setFiltreService(e.target.value)} style={{ width:170, flex:"0 0 170px" }}>
                      <option value="tous">Tous services</option>
                      {SERVICES.map(s=><option key={s}>{s}</option>)}
                    </select>
                  )}
                </Card>
                <Card style={{ overflow:"hidden" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"120px 1fr 130px 95px 105px 85px", background:"#f8fafc", borderBottom:"2px solid #e2e8f0", padding:"9px 15px" }}>
                    {["Référence","Titre","Service","Priorité","Statut","Date"].map(h=>(
                      <div key={h} style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</div>
                    ))}
                  </div>
                  {loading&&<div style={{ textAlign:"center", padding:40, color:"#94a3b8" }}>⏳ Chargement des demandes…</div>}
                  {!loading&&visDemandes.length===0&&<div style={{ textAlign:"center", padding:40, color:"#cbd5e1" }}>📭 Aucune demande</div>}
                  {visDemandes.map(d=>(
                    <div key={d.id} className="row" style={{ display:"grid", gridTemplateColumns:"120px 1fr 130px 95px 105px 85px", padding:"12px 15px", alignItems:"center" }}
                      onClick={()=>{ setSelected(d); setPage("detail"); }}>
                      <div>
                        <div style={{ fontSize:11, color:"#2563eb", fontWeight:600 }}>{d.id}</div>
                        <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{d.type==="intervention"?"🔧":"📦"} {getUser(d.demandeur_id)?.avatar}</div>
                      </div>
                      <div style={{ fontWeight:600, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"93%" }}>{d.titre}</div>
                      <div style={{ fontSize:13, color:"#64748b" }}>{d.service}</div>
                      <div><Chip color={PC[d.priorite]?.c} bg={PC[d.priorite]?.bg} small>{PC[d.priorite]?.dot} {PC[d.priorite]?.l}</Chip></div>
                      <div><Chip color={SC[d.statut]?.c} bg={SC[d.statut]?.bg} small>{SC[d.statut]?.i} {SC[d.statut]?.l}</Chip></div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{d.date}</div>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

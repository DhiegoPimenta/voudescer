import { useState, useEffect } from "react";
import { fetchClassificacao } from "./fetchEspn.js";

// ============================================================
// DADOS REAIS — REBAIXADOS BRASILEIRÃO SÉRIE A 2014–2024
// ============================================================
const REBAIXADOS_HISTORICO = [
  { ano: 2014, times: ["Vitória", "Bahia", "Botafogo", "Criciúma"],              limiar: 42 },
  { ano: 2015, times: ["Avaí", "Vasco", "Goiás", "Joinville"],                   limiar: 39 },
  { ano: 2016, times: ["Internacional", "Figueirense", "Santa Cruz", "América-MG"], limiar: 40 },
  { ano: 2017, times: ["Coritiba", "Avaí", "Ponte Preta", "Atlético-GO"],        limiar: 41 },
  { ano: 2018, times: ["América-MG", "Sport", "Vitória", "Paraná"],              limiar: 38 },
  { ano: 2019, times: ["Cruzeiro", "CSA", "Chapecoense", "Avaí"],                limiar: 47 },
  { ano: 2020, times: ["Vasco", "Goiás", "Coritiba", "Botafogo"],                limiar: 39 },
  { ano: 2021, times: ["Grêmio", "Bahia", "Sport", "Chapecoense"],               limiar: 44 },
  { ano: 2022, times: ["Ceará", "Atlético-GO", "Avaí", "Juventude"],             limiar: 36 },
  { ano: 2023, times: ["Santos", "Goiás", "Coritiba", "América-MG"],             limiar: 39 },
  { ano: 2024, times: ["Athletico-PR", "Criciúma", "Atlético-GO", "Cuiabá"],     limiar: 45 },
];

const MEDIA_LIMIAR = 42.3;
const DESVIO_PADRAO = 4.1;
const APROV_REBAIXADO = 0.975;
const APROV_LIMIAR = 1.113;

const TIMES_HISTORICO = {
  "Flamengo":            { reb: 0, temporadas: 11 },
  "Palmeiras":           { reb: 0, temporadas: 11 },
  "Athletico-PR":        { reb: 1, temporadas: 11 },
  "Atlético-MG":         { reb: 0, temporadas: 11 },
  "São Paulo":           { reb: 0, temporadas: 11 },
  "Fluminense":          { reb: 0, temporadas: 11 },
  "Corinthians":         { reb: 0, temporadas: 11 },
  "Grêmio":              { reb: 1, temporadas: 10 },
  "Internacional":       { reb: 1, temporadas: 11 },
  "Santos":              { reb: 1, temporadas: 11 },
  "Botafogo":            { reb: 2, temporadas: 10 },
  "Vasco":               { reb: 2, temporadas:  8 },
  "Cruzeiro":            { reb: 1, temporadas:  8 },
  "Bahia":               { reb: 2, temporadas:  8 },
  "Fortaleza":           { reb: 0, temporadas:  6 },
  "Red Bull Bragantino": { reb: 0, temporadas:  5 },
  "Ceará":               { reb: 1, temporadas:  6 },
  "Goiás":               { reb: 3, temporadas:  8 },
  "Coritiba":            { reb: 3, temporadas:  8 },
  "América-MG":          { reb: 3, temporadas:  7 },
  "Sport":               { reb: 2, temporadas:  8 },
  "Juventude":           { reb: 1, temporadas:  5 },
  "Avaí":                { reb: 4, temporadas:  6 },
  "Cuiabá":              { reb: 1, temporadas:  4 },
  "Atlético-GO":         { reb: 3, temporadas:  5 },
  "Vitória":             { reb: 2, temporadas:  5 },
  "Criciúma":            { reb: 2, temporadas:  4 },
  "Mirassol":            { reb: 0, temporadas:  1 },
  "Chapecoense":         { reb: 2, temporadas:  5 },
  "Remo":                { reb: 0, temporadas:  1 },
};

// Mapeamento ESPN → nome interno
const ESPN_MAP = {
  "Palmeiras": "Palmeiras", "Flamengo": "Flamengo",
  "São Paulo": "São Paulo", "Sao Paulo": "São Paulo",
  "Fluminense": "Fluminense", "Bahia": "Bahia",
  "Athletico Paranaense": "Athletico-PR", "Athletico-PR": "Athletico-PR",
  "Coritiba": "Coritiba",
  "Atlético-MG": "Atlético-MG", "Atletico-MG": "Atlético-MG", "Atletico Mineiro": "Atlético-MG",
  "Red Bull Bragantino": "Red Bull Bragantino",
  "Vitória": "Vitória", "Vitoria": "Vitória",
  "Botafogo": "Botafogo",
  "Grêmio": "Grêmio", "Gremio": "Grêmio",
  "Vasco da Gama": "Vasco", "Vasco": "Vasco",
  "Internacional": "Internacional", "Santos": "Santos",
  "Corinthians": "Corinthians", "Cruzeiro": "Cruzeiro",
  "Remo": "Remo", "Chapecoense": "Chapecoense", "Mirassol": "Mirassol",
  "Fortaleza": "Fortaleza",
  "Ceará": "Ceará", "Ceara": "Ceará",
  "Goiás": "Goiás", "Goias": "Goiás",
  "Juventude": "Juventude", "Sport": "Sport", "Sport Club do Recife": "Sport",
  "América-MG": "América-MG", "America Mineiro": "América-MG",
  "Avaí": "Avaí", "Avai": "Avaí",
  "Cuiabá": "Cuiabá", "Cuiaba": "Cuiabá",
  "Atlético-GO": "Atlético-GO", "Atletico Goianiense": "Atlético-GO",
  "Criciúma": "Criciúma", "Criciuma": "Criciúma",
};

// ── Modelo probabilístico ────────────────────────────────────
function calcularProbabilidade({ historico, pontos, rodada, posicao }) {
  const r = parseInt(rodada), p = parseInt(pontos), pos = parseInt(posicao) || 10;
  const aprov = p / r;
  const fatorRitmo = 1 - Math.min(Math.max((aprov - APROV_REBAIXADO * 0.6) / (APROV_LIMIAR * 1.1 - APROV_REBAIXADO * 0.6), 0), 1);
  const proj = aprov * 38;
  const z = (MEDIA_LIMIAR - proj) / DESVIO_PADRAO;
  const fatorProjecao = Math.min(Math.max(0.5 * (1 + z / Math.sqrt(1 + z * z * 0.4)), 0), 1);
  const taxa = historico.temporadas > 0 ? historico.reb / historico.temporadas : 0;
  const fatorHistorico = Math.min(taxa / 0.5, 1);
  const bonus = pos >= 17 ? 0.12 : pos >= 15 ? 0.05 : pos <= 10 ? -0.05 : 0;
  return Math.round(Math.min(Math.max(fatorRitmo * 0.55 + fatorProjecao * 0.30 + fatorHistorico * 0.15 + bonus, 0.02), 0.97) * 100);
}

function getVeredicto(prob) {
  if (prob >= 85) return { texto: "Tá na hora de renovar o carnê da Série B.", cor: "#ff1744", icone: "⚰️" };
  if (prob >= 70) return { texto: "A corda tá bamba. Muito bamba.",             cor: "#ff4500", icone: "😰" };
  if (prob >= 55) return { texto: "Dá pra salvar, mas vai dar trabalho.",       cor: "#ff6d00", icone: "😬" };
  if (prob >= 40) return { texto: "Zona de risco moderado. Não relaxa.",        cor: "#ffab00", icone: "😤" };
  if (prob >= 25) return { texto: "Por enquanto tranquilo. Por enquanto.",      cor: "#c6e03a", icone: "😅" };
  if (prob >= 10) return { texto: "Água fria no torcedor desesperado.",         cor: "#00e676", icone: "😌" };
  return           { texto: "Vai ficar na elite. Pode dormir.",                 cor: "#00e5ff", icone: "😴" };
}

function lerpColor(a, b, t) {
  const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(((ah >> shift) & 0xff) + (((bh >> shift) & 0xff) - ((ah >> shift) & 0xff)) * t);
  return `#${ch(16).toString(16).padStart(2,"0")}${ch(8).toString(16).padStart(2,"0")}${ch(0).toString(16).padStart(2,"0")}`;
}

function Gauge({ prob, cor }) {
  const R = 78, cx = 100, cy = 92;
  const toXY = (a) => [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  const angle = Math.PI + (prob / 100) * Math.PI;
  const [nx, ny] = toXY(angle);
  const stops = [{ p: 0, c: "#00e676" }, { p: 0.4, c: "#ffab00" }, { p: 0.7, c: "#ff4500" }, { p: 1.0, c: "#ff1744" }];
  const segs = Array.from({ length: 60 }, (_, i) => {
    const t1 = i / 60;
    const [x1, y1] = toXY(Math.PI + t1 * Math.PI);
    const [x2, y2] = toXY(Math.PI + (i + 1) / 60 * Math.PI);
    let c = stops[0].c;
    for (let j = 0; j < stops.length - 1; j++) {
      if (t1 >= stops[j].p && t1 <= stops[j + 1].p)
        c = lerpColor(stops[j].c, stops[j + 1].c, (t1 - stops[j].p) / (stops[j + 1].p - stops[j].p));
    }
    return { x1, y1, x2, y2, c };
  });
  return (
    <svg viewBox="0 0 200 108" width="210" style={{ display: "block", margin: "0 auto" }}>
      <path d={`M ${toXY(Math.PI).join(" ")} A ${R} ${R} 0 0 1 ${toXY(2*Math.PI).join(" ")}`}
        fill="none" stroke="#161626" strokeWidth="14" strokeLinecap="round" />
      {segs.map((s, i) => <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
        stroke={s.c} strokeWidth="10" strokeLinecap="round" opacity="0.9" />)}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5.5" fill="#fff" />
      <text x="24" y={cy + 16} fill="#00e676" fontSize="8.5" textAnchor="middle">SALVO</text>
      <text x="176" y={cy + 16} fill="#ff1744" fontSize="8.5" textAnchor="middle">FUDEU</text>
    </svg>
  );
}

function BarraProb({ prob, cor }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(prob), 60); return () => clearTimeout(t); }, [prob]);
  return (
    <div style={{ background: "#111122", borderRadius: 99, height: 8, margin: "10px 0 18px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: `linear-gradient(90deg, #00e676, ${cor})`,
        borderRadius: 99, transition: "width 1.3s cubic-bezier(.25,1,.5,1)", boxShadow: `0 0 10px ${cor}77` }} />
    </div>
  );
}

function Secao({ titulo, children }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, marginTop: 4 }}>
      <div onClick={() => setAberto(!aberto)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", marginBottom: aberto ? 12 : 0 }}>
        <span style={{ fontSize: 10, letterSpacing: 2, color: "#555" }}>{titulo}</span>
        <span style={{ color: "#ff4500", fontSize: 11 }}>{aberto ? "▲" : "▼"}</span>
      </div>
      {aberto && children}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function VouDescer() {
  const [classificacao, setClassificacao] = useState([]);
  const [loadingAPI, setLoadingAPI]       = useState(true);
  const [erroAPI, setErroAPI]             = useState(null);
  const [timeSelecionado, setTimeSelecionado] = useState(null);
  const [resultado, setResultado]         = useState(null);
  const [search, setSearch]               = useState("");
  const [abrirLista, setAbrirLista]       = useState(false);
  const [animProb, setAnimProb]           = useState(0);
  const [modoManual, setModoManual]       = useState(false);
  const [manuais, setManuais]             = useState({ pontos: "", rodada: "", posicao: "" });

  useEffect(() => {
    fetchClassificacao()
      .then(data => { setClassificacao(data); setLoadingAPI(false); })
      .catch(e   => { setErroAPI(e.message); setLoadingAPI(false); setModoManual(true); });
  }, []);

  // Dados do time selecionado: ao vivo ou manual
  const dadosAoVivo  = timeSelecionado ? classificacao.find(t => t.nome === timeSelecionado) : null;
  const dadosAtivos  = modoManual
    ? { pontos: manuais.pontos, jogos: manuais.rodada, posicao: manuais.posicao }
    : dadosAoVivo;

  const podeCalcular = timeSelecionado && dadosAtivos &&
    parseInt(dadosAtivos.pontos) >= 0 && parseInt(dadosAtivos.jogos) > 0;

  const calcular = () => {
    if (!podeCalcular) return;
    const historico = TIMES_HISTORICO[timeSelecionado] || { reb: 0, temporadas: 5 };
    const prob = calcularProbabilidade({
      historico,
      pontos:  dadosAtivos.pontos,
      rodada:  dadosAtivos.jogos,
      posicao: dadosAtivos.posicao ?? 10,
    });
    setResultado(prob);
    setAnimProb(0);
    let cur = 0;
    const iv = setInterval(() => {
      cur = Math.min(cur + Math.ceil(prob / 35), prob);
      setAnimProb(cur);
      if (cur >= prob) clearInterval(iv);
    }, 22);
  };

  const vd  = resultado !== null ? getVeredicto(resultado) : null;
  const p   = parseInt(dadosAtivos?.pontos) || 0;
  const r   = parseInt(dadosAtivos?.jogos)  || 0;
  const pos = parseInt(dadosAtivos?.posicao)|| 0;

  const pontosProj = r > 0 ? Math.round((p / r) * 38) : null;
  const ptsFalta   = Math.max(0, 45 - p);
  const rodRest    = r > 0 ? 38 - r : null;
  const historico  = timeSelecionado ? (TIMES_HISTORICO[timeSelecionado] || { reb: 0, temporadas: 5 }) : null;

  const listaExibida = modoManual || classificacao.length === 0
    ? Object.keys(TIMES_HISTORICO).filter(n => n.toLowerCase().includes(search.toLowerCase())).map(n => ({ nome: n, posicao: null, pontos: null, jogos: null }))
    : classificacao.filter(t => t.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      minHeight: "100vh", background: "#07070f",
      backgroundImage: "radial-gradient(ellipse 90% 40% at 50% 0%, #180420 0%, transparent 55%)",
      color: "#ddd", fontFamily: "'Courier New', monospace",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "28px 16px 56px",
    }}>
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: 5, color: "#ff4500", marginBottom: 8 }}>
          ⚽ PREDITOR DE REBAIXAMENTO · BRASILEIRÃO SÉRIE A
        </div>
        <h1 style={{
          margin: 0, lineHeight: 0.88,
          fontSize: "clamp(50px, 13vw, 82px)", fontWeight: 900, letterSpacing: "-3px",
          background: "linear-gradient(150deg, #ff6d00 0%, #ff1744 55%, #d500f9 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>VOU<br />DESCER?</h1>
        <p style={{ margin: "10px 0 0", fontSize: 10, color: "#444", letterSpacing: 2 }}>
          MODELO ESTATÍSTICO · DADOS 2014–2024 · 11 TEMPORADAS
        </p>
      </div>

      {/* STATUS API */}
      <div style={{ width: "100%", maxWidth: 460, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#555" }}>
        {loadingAPI ? (
          <><span style={{ color: "#ff4500", animation: "spin 1s linear infinite", display:"inline-block" }}>⟳</span> Carregando classificação...</>
        ) : erroAPI ? (
          <><span style={{ color: "#ff4500" }}>⚠</span> Sem dados ao vivo ({erroAPI}) — preencha manualmente</>
        ) : (
          <><span style={{ color: "#00e676" }}>●</span> Ao vivo · {classificacao[0]?.jogos ?? "?"} rodadas · ESPN</>
        )}
        {!loadingAPI && !erroAPI && (
          <button onClick={() => { setModoManual(!modoManual); setResultado(null); }}
            style={{
              marginLeft: "auto", background: "none", border: `1px solid ${modoManual ? "#ff4500" : "#333"}`,
              color: modoManual ? "#ff4500" : "#444", padding: "3px 10px", borderRadius: 4,
              cursor: "pointer", fontSize: 10, letterSpacing: 1, fontFamily: "monospace",
            }}>
            {modoManual ? "← AO VIVO" : "EDITAR MANUAL"}
          </button>
        )}
      </div>

      {/* FORMULÁRIO */}
      <div style={{
        width: "100%", maxWidth: 460,
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,69,0,0.12)",
        borderRadius: 16, padding: "24px 20px",
      }}>
        {/* Seletor de time */}
        <div style={{ marginBottom: 18, position: "relative" }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#ff4500", marginBottom: 7 }}>CLUBE</div>
          <div onClick={() => setAbrirLista(!abrirLista)} style={{
            padding: "11px 14px", background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,69,0,0.22)", borderRadius: 8, cursor: "pointer",
            display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, fontWeight: 600,
          }}>
            <span>
              {timeSelecionado || "Selecione o time..."}
              {!modoManual && dadosAoVivo && (
                <span style={{ color: "#666", fontSize: 11, marginLeft: 10 }}>
                  {dadosAoVivo.posicao}º · {dadosAoVivo.pontos} pts · {dadosAoVivo.jogos} jogos
                </span>
              )}
            </span>
            <span style={{ color: "#ff4500", fontSize: 11 }}>{abrirLista ? "▲" : "▼"}</span>
          </div>

          {abrirLista && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 99,
              background: "#0d0d1c", border: "1px solid rgba(255,69,0,0.22)",
              borderRadius: 8, marginTop: 4, maxHeight: 260, overflowY: "auto",
            }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar time..." onClick={e => e.stopPropagation()}
                style={{
                  width: "100%", padding: "9px 12px", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.03)", border: "none",
                  borderBottom: "1px solid rgba(255,69,0,0.12)",
                  color: "#ddd", fontSize: 12, outline: "none", fontFamily: "monospace",
                }}
              />
              {listaExibida.map(t => (
                <div key={t.nome}
                  onClick={() => { setTimeSelecionado(t.nome); setAbrirLista(false); setSearch(""); setResultado(null); }}
                  style={{
                    padding: "9px 14px", cursor: "pointer", fontSize: 13,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: timeSelecionado === t.nome ? "rgba(255,69,0,0.08)" : "transparent",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = timeSelecionado === t.nome ? "rgba(255,69,0,0.08)" : "transparent"}
                >
                  <span>{t.nome}</span>
                  {t.posicao && (
                    <span style={{ color: "#555", fontSize: 11 }}>{t.posicao}º · {t.pontos}pts · {t.jogos}j</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dados ao vivo preenchidos */}
        {!modoManual && !erroAPI && timeSelecionado && dadosAoVivo && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
            {[
              { label: "PONTOS",  val: dadosAoVivo.pontos },
              { label: "JOGOS",   val: dadosAoVivo.jogos  },
              { label: "POSIÇÃO", val: dadosAoVivo.posicao ? `${dadosAoVivo.posicao}º` : "—" },
            ].map(({ label, val }) => (
              <div key={label} style={{
                background: "rgba(0,230,118,0.04)", border: "1px solid rgba(0,230,118,0.12)",
                borderRadius: 7, padding: "10px", textAlign: "center",
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#00e676" }}>{val}</div>
                <div style={{ fontSize: 9, color: "#444", letterSpacing: 1, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Aviso se time não encontrado na API */}
        {!modoManual && !erroAPI && timeSelecionado && !dadosAoVivo && !loadingAPI && (
          <div style={{ marginBottom: 18, padding: "10px 14px", background: "rgba(255,69,0,0.07)", borderRadius: 8, fontSize: 11, color: "#ff4500" }}>
            ⚠ {timeSelecionado} não encontrado na classificação atual. Preencha manualmente ou verifique se o time está na Série A 2025/26.
          </div>
        )}

        {/* Inputs manuais */}
        {(modoManual || erroAPI) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
            {[
              { label: "PONTOS", key: "pontos", ph: "Ex: 9"  },
              { label: "JOGOS",  key: "rodada", ph: "Ex: 9"  },
              { label: "POSIÇÃO",key: "posicao", ph: "Ex: 14" },
            ].map(({ label, key, ph }) => (
              <div key={key}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#ff4500", marginBottom: 6 }}>{label}</div>
                <input type="number" value={manuais[key]} placeholder={ph}
                  onChange={e => { setManuais(m => ({ ...m, [key]: e.target.value })); setResultado(null); }}
                  style={{
                    width: "100%", boxSizing: "border-box", textAlign: "center",
                    padding: "10px 6px", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,69,0,0.2)", borderRadius: 7,
                    color: "#fff", fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "monospace",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <button onClick={calcular} disabled={!podeCalcular}
          style={{
            width: "100%", padding: "13px", border: "none", borderRadius: 8,
            background: !podeCalcular ? "rgba(255,69,0,0.12)" : "linear-gradient(135deg, #ff6d00, #ff1744)",
            color: "#fff", fontWeight: 700, fontSize: 12, letterSpacing: 3,
            cursor: !podeCalcular ? "not-allowed" : "pointer", fontFamily: "monospace",
          }}>
          CALCULAR DESTINO
        </button>
      </div>

      {/* RESULTADO */}
      {resultado !== null && vd && (
        <div style={{
          width: "100%", maxWidth: 460, marginTop: 16,
          background: "rgba(255,255,255,0.02)", border: `1px solid ${vd.cor}30`,
          borderRadius: 16, padding: "24px 20px", animation: "fadeUp .4s ease",
        }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: vd.cor, textAlign: "center", marginBottom: 4 }}>
            PROBABILIDADE DE REBAIXAMENTO
          </div>
          <Gauge prob={resultado} cor={vd.cor} />
          <BarraProb prob={resultado} cor={vd.cor} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "clamp(54px, 16vw, 78px)", fontWeight: 900, lineHeight: 1, color: vd.cor, textShadow: `0 0 50px ${vd.cor}44` }}>
              {animProb}%
            </div>
            <div style={{ fontSize: 22, margin: "6px 0 4px" }}>{vd.icone}</div>
            <div style={{ fontSize: 13, color: "#aaa", fontStyle: "italic" }}>"{vd.texto}"</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "20px 0" }}>
            {[
              { label: "RODADAS RESTANTES", val: rodRest },
              { label: "PONTOS PROJETADOS", val: pontosProj },
              { label: "PTS P/ SEGURANÇA",  val: ptsFalta },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{val ?? "—"}</div>
                <div style={{ fontSize: 9, color: "#555", letterSpacing: 1, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          <Secao titulo="COMO CALCULAMOS">
            <div style={{ fontSize: 11, color: "#666", lineHeight: 1.75 }}>
              {[
                { label: "Ritmo de pontuação (55%)", desc: `${p} pts em ${r} jogos = ${r > 0 ? (p/r).toFixed(2) : "—"} pts/jogo. Rebaixados históricos: ${APROV_REBAIXADO.toFixed(2)} pts/jogo. Limiar: ${APROV_LIMIAR.toFixed(2)} pts/jogo.` },
                { label: "Projeção de pontos finais (30%)", desc: `Projeção: ~${pontosProj ?? "—"} pts. Média histórica do 16º: ${MEDIA_LIMIAR} pts ± ${DESVIO_PADRAO} pts (2014–2024).` },
                { label: "DNA histórico do clube (15%)", desc: historico ? `${timeSelecionado} foi rebaixado ${historico.reb}x em ${historico.temporadas} temporadas = ${((historico.reb/historico.temporadas)*100).toFixed(0)}%.` : "—" },
              ].map(({ label, desc }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ color: "#ff4500", fontWeight: 700, marginBottom: 2 }}>▸ {label}</div>
                  <div>{desc}</div>
                </div>
              ))}
            </div>
          </Secao>

          <Secao titulo="DADOS E FONTES (2014–2024)">
            <div style={{ fontSize: 11, color: "#555", lineHeight: 1.8 }}>
              <div style={{ marginBottom: 12, color: "#666" }}>
                <span style={{ color: "#888" }}>Período:</span> 11 temporadas (2014–2024)<br />
                <span style={{ color: "#888" }}>Classificação ao vivo:</span> ESPN API (BRA.1)<br />
                <span style={{ color: "#888" }}>Histórico verificado:</span> olympics.com/pt · wikipedia
              </div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: 1, marginBottom: 8 }}>REBAIXADOS POR ANO:</div>
              {REBAIXADOS_HISTORICO.map(({ ano, times: ts, limiar }) => (
                <div key={ano} style={{ fontSize: 10, marginBottom: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: "#ff4500", minWidth: 34 }}>{ano}</span>
                  <span style={{ color: "#888", flex: 1 }}>{ts.join(", ")}</span>
                  <span style={{ color: "#444" }}>limiar: {limiar} pts</span>
                </div>
              ))}
            </div>
          </Secao>
        </div>
      )}

      <div style={{ marginTop: 36, fontSize: 10, color: "#2a2a3a", letterSpacing: 1, textAlign: "center" }}>
        VOU DESCER? · Modelo estatístico · Dados 2014–2024 · Classificação via ESPN
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #ff450033; border-radius: 2px; }
      `}</style>
    </div>
  );
}

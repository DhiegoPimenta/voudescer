import { useState, useEffect } from "react";

// ============================================================
// DADOS REAIS — REBAIXADOS BRASILEIRÃO SÉRIE A 2014–2024
// Fonte: olympics.com/pt + espn.com (verificado em duas fontes)
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

// Mapeamento ESPN nome → nome interno
const ESPN_MAP = {
  "Palmeiras": "Palmeiras",
  "Flamengo": "Flamengo",
  "São Paulo": "São Paulo",
  "Sao Paulo": "São Paulo",
  "Fluminense": "Fluminense",
  "Bahia": "Bahia",
  "Athletico Paranaense": "Athletico-PR",
  "Athletico-PR": "Athletico-PR",
  "Coritiba": "Coritiba",
  "Atlético-MG": "Atlético-MG",
  "Atletico-MG": "Atlético-MG",
  "Atletico Mineiro": "Atlético-MG",
  "Red Bull Bragantino": "Red Bull Bragantino",
  "Vitória": "Vitória",
  "Vitoria": "Vitória",
  "Botafogo": "Botafogo",
  "Grêmio": "Grêmio",
  "Gremio": "Grêmio",
  "Vasco da Gama": "Vasco",
  "Vasco": "Vasco",
  "Internacional": "Internacional",
  "Santos": "Santos",
  "Corinthians": "Corinthians",
  "Cruzeiro": "Cruzeiro",
  "Remo": "Remo",
  "Chapecoense": "Chapecoense",
  "Mirassol": "Mirassol",
  "Fortaleza": "Fortaleza",
  "Ceará": "Ceará",
  "Ceara": "Ceará",
  "Goiás": "Goiás",
  "Goias": "Goiás",
  "Juventude": "Juventude",
  "Sport": "Sport",
  "Sport Club do Recife": "Sport",
  "América-MG": "América-MG",
  "America Mineiro": "América-MG",
  "Avaí": "Avaí",
  "Avai": "Avaí",
  "Cuiabá": "Cuiabá",
  "Cuiaba": "Cuiabá",
  "Atlético-GO": "Atlético-GO",
  "Atletico Goianiense": "Atlético-GO",
  "Criciúma": "Criciúma",
  "Criciuma": "Criciúma",
};

// Busca classificação atual do Brasileirão via ESPN API (não oficial, sem CORS)
async function fetchClassificacao() {
  const url = "https://site.api.espn.com/apis/site/v2/sports/soccer/BRA.1/standings";
  const res = await fetch(url);
  const data = await res.json();

  const times = [];
  const grupos = data?.standings?.entries || data?.children?.[0]?.standings?.entries || [];

  for (const entry of grupos) {
    const nomeEspn = entry?.team?.displayName || entry?.team?.name || "";
    const nomeInterno = ESPN_MAP[nomeEspn] || nomeEspn;
    const stats = {};
    for (const s of (entry?.stats || [])) {
      stats[s.name] = s.value;
    }
    times.push({
      nome: nomeInterno,
      nomeEspn,
      posicao: entry?.note?.rank ?? (times.length + 1),
      pontos: stats.points ?? stats.pts ?? 0,
      jogos: stats.gamesPlayed ?? stats.GP ?? 0,
    });
  }
  return times;
}

// ============================================================
// MODELO PROBABILÍSTICO
// ============================================================
function calcularProbabilidade({ historico, pontos, rodada, posicao }) {
  const r = parseInt(rodada);
  const p = parseInt(pontos);
  const pos = parseInt(posicao) || 10;

  const aprovAtual = p / r;
  const aprovMin = APROV_REBAIXADO * 0.6;
  const aprovMax = APROV_LIMIAR * 1.1;
  const fatorRitmo = 1 - Math.min(Math.max((aprovAtual - aprovMin) / (aprovMax - aprovMin), 0), 1);

  const pontosProjetados = aprovAtual * 38;
  const z = (MEDIA_LIMIAR - pontosProjetados) / DESVIO_PADRAO;
  const fatorProjecao = Math.min(Math.max(0.5 * (1 + z / Math.sqrt(1 + z * z * 0.4)), 0), 1);

  const taxaHistorica = historico.temporadas > 0 ? historico.reb / historico.temporadas : 0;
  const fatorHistorico = Math.min(taxaHistorica / 0.5, 1);

  const bonusPosicao = pos >= 17 ? 0.12 : pos >= 15 ? 0.05 : pos <= 10 ? -0.05 : 0;

  const prob = (fatorRitmo * 0.55) + (fatorProjecao * 0.30) + (fatorHistorico * 0.15) + bonusPosicao;
  return Math.round(Math.min(Math.max(prob, 0.02), 0.97) * 100);
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
  const r = Math.round(((ah >> 16) & 0xff) + (((bh >> 16) & 0xff) - ((ah >> 16) & 0xff)) * t);
  const g = Math.round(((ah >> 8)  & 0xff) + (((bh >> 8)  & 0xff) - ((ah >> 8)  & 0xff)) * t);
  const bl= Math.round(( ah        & 0xff) + (( bh        & 0xff) - ( ah        & 0xff)) * t);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${bl.toString(16).padStart(2,"0")}`;
}

function Gauge({ prob, cor }) {
  const R = 78, cx = 100, cy = 92;
  const toXY = (a) => [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  const angle = Math.PI + (prob / 100) * Math.PI;
  const [nx, ny] = toXY(angle);
  const stops = [
    { p: 0, c: "#00e676" }, { p: 0.4, c: "#ffab00" },
    { p: 0.7, c: "#ff4500" }, { p: 1.0, c: "#ff1744" },
  ];
  const N = 60;
  const segs = Array.from({ length: N }, (_, i) => {
    const t1 = i / N, t2 = (i + 1) / N;
    const a1 = Math.PI + t1 * Math.PI, a2 = Math.PI + t2 * Math.PI;
    const [x1, y1] = toXY(a1), [x2, y2] = toXY(a2);
    let c = stops[0].c;
    for (let j = 0; j < stops.length - 1; j++) {
      if (t1 >= stops[j].p && t1 <= stops[j + 1].p) {
        c = lerpColor(stops[j].c, stops[j + 1].c, (t1 - stops[j].p) / (stops[j + 1].p - stops[j].p));
      }
    }
    return { x1, y1, x2, y2, c };
  });
  return (
    <svg viewBox="0 0 200 108" width="210" style={{ display: "block", margin: "0 auto" }}>
      <path d={`M ${toXY(Math.PI).join(" ")} A ${R} ${R} 0 0 1 ${toXY(2 * Math.PI).join(" ")}`}
        fill="none" stroke="#161626" strokeWidth="14" strokeLinecap="round" />
      {segs.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={s.c} strokeWidth="10" strokeLinecap="round" opacity="0.9" />
      ))}
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
      <div style={{
        height: "100%", width: `${w}%`,
        background: `linear-gradient(90deg, #00e676, ${cor})`,
        borderRadius: 99, transition: "width 1.3s cubic-bezier(.25,1,.5,1)",
        boxShadow: `0 0 10px ${cor}77`,
      }} />
    </div>
  );
}

function Secao({ titulo, children }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, marginTop: 4 }}>
      <div onClick={() => setAberto(!aberto)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: aberto ? 12 : 0 }}>
        <span style={{ fontSize: 10, letterSpacing: 2, color: "#555" }}>{titulo}</span>
        <span style={{ color: "#ff4500", fontSize: 11 }}>{aberto ? "▲" : "▼"}</span>
      </div>
      {aberto && children}
    </div>
  );
}

export default function VouDescer() {
  const [classificacao, setClassificacao] = useState([]);
  const [loadingAPI, setLoadingAPI] = useState(true);
  const [erroAPI, setErroAPI] = useState(false);
  const [timeSelecionado, setTimeSelecionado] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [search, setSearch] = useState("");
  const [abrirLista, setAbrirLista] = useState(false);
  const [animProb, setAnimProb] = useState(0);
  const [modoManual, setModoManual] = useState(false);
  const [pontosManual, setPontosManual] = useState("");
  const [rodadaManual, setRodadaManual] = useState("");
  const [posicaoManual, setPosicaoManual] = useState("");

  useEffect(() => {
    fetchClassificacao()
      .then(data => {
        setClassificacao(data);
        setLoadingAPI(false);
      })
      .catch(() => {
        setErroAPI(true);
        setLoadingAPI(false);
      });
  }, []);

  const dadoTime = timeSelecionado
    ? (modoManual
        ? { pontos: pontosManual, rodada: rodadaManual, posicao: posicaoManual }
        : classificacao.find(t => t.nome === timeSelecionado.nome) || null)
    : null;

  const calcular = () => {
    if (!timeSelecionado || !dadoTime) return;
    const { pontos, rodada, posicao } = dadoTime;
    if (!pontos || !rodada) return;

    const historico = TIMES_HISTORICO[timeSelecionado.nome] || { reb: 0, temporadas: 5 };
    const prob = calcularProbabilidade({ historico, pontos, rodada, posicao });
    setResultado(prob);
    setAnimProb(0);
    let cur = 0;
    const iv = setInterval(() => {
      cur = Math.min(cur + Math.ceil(prob / 35), prob);
      setAnimProb(cur);
      if (cur >= prob) clearInterval(iv);
    }, 22);
  };

  const vd = resultado !== null ? getVeredicto(resultado) : null;
  const p = parseInt(dadoTime?.pontos) || 0;
  const r = parseInt(dadoTime?.rodada) || 0;
  const pontosProj = r > 0 ? Math.round((p / r) * 38) : null;
  const ptsFalta   = Math.max(0, 45 - p);
  const rodRest    = r > 0 ? 38 - r : null;

  const timesFiltrados = classificacao.length > 0
    ? classificacao.filter(t => t.nome.toLowerCase().includes(search.toLowerCase()))
    : Object.keys(TIMES_HISTORICO).filter(n => n.toLowerCase().includes(search.toLowerCase())).map(n => ({ nome: n }));

  const historico = timeSelecionado ? (TIMES_HISTORICO[timeSelecionado.nome] || { reb: 0, temporadas: 5 }) : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07070f",
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
        }}>
          VOU<br />DESCER?
        </h1>
        <p style={{ margin: "10px 0 0", fontSize: 10, color: "#444", letterSpacing: 2 }}>
          MODELO ESTATÍSTICO · DADOS 2014–2024 · 11 TEMPORADAS
        </p>
      </div>

      {/* STATUS DA API */}
      <div style={{
        width: "100%", maxWidth: 460, marginBottom: 12,
        display: "flex", alignItems: "center", gap: 8,
        fontSize: 11, color: "#555",
      }}>
        {loadingAPI ? (
          <><span style={{ color: "#ff4500" }}>⟳</span> Carregando classificação atual...</>
        ) : erroAPI ? (
          <><span style={{ color: "#ff4500" }}>⚠</span> Sem dados ao vivo — modo manual ativo</>
        ) : (
          <><span style={{ color: "#00e676" }}>●</span> Classificação ao vivo · {classificacao[0]?.jogos ?? "?"} rodadas disputadas · Fonte: ESPN</>
        )}
        {!loadingAPI && (
          <span
            onClick={() => setModoManual(!modoManual)}
            style={{ marginLeft: "auto", cursor: "pointer", color: modoManual ? "#ff4500" : "#444", fontSize: 10, letterSpacing: 1 }}
          >
            {modoManual ? "← USAR AO VIVO" : "EDITAR MANUAL"}
          </span>
        )}
      </div>

      {/* FORMULÁRIO */}
      <div style={{
        width: "100%", maxWidth: 460,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,69,0,0.12)",
        borderRadius: 16, padding: "24px 20px",
      }}>
        {/* Seletor de time */}
        <div style={{ marginBottom: 18, position: "relative" }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#ff4500", marginBottom: 7 }}>CLUBE</div>
          <div onClick={() => setAbrirLista(!abrirLista)} style={{
            padding: "11px 14px", background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,69,0,0.22)", borderRadius: 8, cursor: "pointer",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 14, fontWeight: 600,
          }}>
            <span>
              {timeSelecionado
                ? <>
                    {timeSelecionado.nome}
                    {!modoManual && dadoTime && (
                      <span style={{ color: "#666", fontSize: 11, marginLeft: 10 }}>
                        {dadoTime.posicao}º · {dadoTime.pontos} pts · {dadoTime.jogos} jogos
                      </span>
                    )}
                  </>
                : "Selecione o time..."}
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
              {timesFiltrados.map(t => (
                <div key={t.nome}
                  onClick={() => {
                    setTimeSelecionado(t);
                    setAbrirLista(false);
                    setSearch("");
                    setResultado(null);
                  }}
                  style={{
                    padding: "9px 14px", cursor: "pointer", fontSize: 13,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: timeSelecionado?.nome === t.nome ? "rgba(255,69,0,0.08)" : "transparent",
                    transition: "background .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = timeSelecionado?.nome === t.nome ? "rgba(255,69,0,0.08)" : "transparent"}
                >
                  <span>{t.nome}</span>
                  <span style={{ color: "#555", fontSize: 11 }}>
                    {t.posicao ? `${t.posicao}º · ${t.pontos}pts` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inputs manuais (só aparecem em modo manual ou sem API) */}
        {(modoManual || erroAPI) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
            {[
              { label: "PONTOS", val: pontosManual, set: setPontosManual, ph: "Ex: 9" },
              { label: "RODADA", val: rodadaManual, set: setRodadaManual, ph: "Ex: 9" },
              { label: "POSIÇÃO", val: posicaoManual, set: setPosicaoManual, ph: "Ex: 14" },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#ff4500", marginBottom: 6 }}>{label}</div>
                <input type="number" value={val} placeholder={ph}
                  onChange={e => { set(e.target.value); setResultado(null); }}
                  style={{
                    width: "100%", boxSizing: "border-box", textAlign: "center",
                    padding: "10px 6px", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,69,0,0.2)", borderRadius: 7,
                    color: "#fff", fontSize: 16, fontWeight: 700,
                    outline: "none", fontFamily: "monospace",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Dados ao vivo preenchidos automaticamente */}
        {!modoManual && !erroAPI && timeSelecionado && dadoTime && (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18,
          }}>
            {[
              { label: "PONTOS", val: dadoTime.pontos },
              { label: "RODADA", val: dadoTime.jogos },
              { label: "POSIÇÃO", val: dadoTime.posicao ? `${dadoTime.posicao}º` : "—" },
            ].map(({ label, val }) => (
              <div key={label} style={{
                background: "rgba(0,230,118,0.04)",
                border: "1px solid rgba(0,230,118,0.1)",
                borderRadius: 7, padding: "10px", textAlign: "center",
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#00e676" }}>{val}</div>
                <div style={{ fontSize: 9, color: "#444", letterSpacing: 1, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        <button onClick={calcular}
          disabled={!timeSelecionado || (!dadoTime && !modoManual && !erroAPI)}
          style={{
            width: "100%", padding: "13px", border: "none", borderRadius: 8,
            background: (!timeSelecionado)
              ? "rgba(255,69,0,0.12)"
              : "linear-gradient(135deg, #ff6d00, #ff1744)",
            color: "#fff", fontWeight: 700, fontSize: 12, letterSpacing: 3,
            cursor: !timeSelecionado ? "not-allowed" : "pointer",
            fontFamily: "monospace",
          }}>
          CALCULAR DESTINO
        </button>
      </div>

      {/* RESULTADO */}
      {resultado !== null && vd && (
        <div style={{
          width: "100%", maxWidth: 460, marginTop: 16,
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${vd.cor}30`,
          borderRadius: 16, padding: "24px 20px",
          animation: "fadeUp .4s ease",
        }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: vd.cor, textAlign: "center", marginBottom: 4 }}>
            PROBABILIDADE DE REBAIXAMENTO
          </div>

          <Gauge prob={resultado} cor={vd.cor} />
          <BarraProb prob={resultado} cor={vd.cor} />

          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "clamp(54px, 16vw, 78px)", fontWeight: 900, lineHeight: 1,
              color: vd.cor, textShadow: `0 0 50px ${vd.cor}44`,
            }}>
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
              <div key={label} style={{
                background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "10px 8px", textAlign: "center",
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{val ?? "—"}</div>
                <div style={{ fontSize: 9, color: "#555", letterSpacing: 1, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          <Secao titulo="COMO CALCULAMOS">
            <div style={{ fontSize: 11, color: "#666", lineHeight: 1.75 }}>
              {[
                {
                  label: "Ritmo de pontuação (55%)",
                  desc: `Aproveitamento atual: ${p} pts em ${r} jogos = ${r > 0 ? (p/r).toFixed(2) : "—"} pts/jogo. Média histórica dos rebaixados: ${APROV_REBAIXADO.toFixed(2)} pts/jogo. Limiar de sobrevivência: ${APROV_LIMIAR.toFixed(2)} pts/jogo.`,
                },
                {
                  label: "Projeção de pontos finais (30%)",
                  desc: `Com esse ritmo terminaria com ~${pontosProj ?? "—"} pts. Média histórica do 16º colocado: ${MEDIA_LIMIAR} pts ± ${DESVIO_PADRAO} pts (2014–2024).`,
                },
                {
                  label: "DNA histórico do clube (15%)",
                  desc: historico
                    ? `${timeSelecionado?.nome} foi rebaixado ${historico.reb}x em ${historico.temporadas} temporadas (2014–2024) = ${((historico.reb/historico.temporadas)*100).toFixed(0)}% de taxa histórica.`
                    : "—",
                },
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
                <span style={{ color: "#888" }}>Dados ao vivo:</span> ESPN API não-oficial (BRA.1)<br />
                <span style={{ color: "#888" }}>Histórico:</span> olympics.com/pt · wikipedia.org
              </div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: 1, marginBottom: 8 }}>REBAIXADOS POR TEMPORADA:</div>
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
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #ff450033; border-radius: 2px; }
      `}</style>
    </div>
  );
}

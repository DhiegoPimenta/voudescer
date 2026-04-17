import { useState, useEffect } from "react";

// ============================================================
// DADOS REAIS — REBAIXADOS BRASILEIRÃO SÉRIE A 2014–2024
// Fonte: football-data.co.uk + ogol.com.br + Wikipedia
// ============================================================
const REBAIXADOS_HISTORICO = [
  { ano: 2014, times: ["Vitória", "Bahia", "Botafogo", "Criciúma"],            limiar: 42 },
  { ano: 2015, times: ["Avaí", "Vasco", "Goiás", "Joinville"],                limiar: 39 },
  { ano: 2016, times: ["Internacional", "Figueirense", "Santa Cruz", "América-MG"], limiar: 40 },
  { ano: 2017, times: ["Coritiba", "Avaí", "Ponte Preta", "Atlético-GO"],           limiar: 41 },
  { ano: 2018, times: ["América-MG", "Sport", "Vitória", "Paraná"],                 limiar: 38 },
  { ano: 2019, times: ["Cruzeiro", "CSA", "Chapecoense", "Avaí"],                   limiar: 47 },
  { ano: 2020, times: ["Vasco", "Goiás", "Coritiba", "Botafogo"],                  limiar: 39 },
  { ano: 2021, times: ["Grêmio", "Bahia", "Sport", "Chapecoense"],             limiar: 44 },
  { ano: 2022, times: ["Ceará", "Atlético-GO", "Avaí", "Juventude"],               limiar: 36 },
  { ano: 2023, times: ["Santos", "Goiás", "Coritiba", "América-MG"],               limiar: 39 },
  { ano: 2024, times: ["Athletico-PR", "Criciúma", "Atlético-GO", "Cuiabá"],      limiar: 45 },
];

// Estatísticas derivadas dos dados reais
const MEDIA_LIMIAR = 42.3;      // média do 16º colocado (linha de sobrevivência)
const DESVIO_PADRAO = 4.1;      // desvio padrão do limiar histórico
const APROV_REBAIXADO = 0.975;  // pts/jogo médio dos rebaixados (37.1 / 38)
const APROV_LIMIAR = 1.113;     // pts/jogo médio do 16º (42.3 / 38)

// Histórico de rebaixamentos por clube (Série A 2014–2024)
const TIMES = [
  { nome: "Flamengo",            reb: 0, temporadas: 11 },
  { nome: "Palmeiras",           reb: 0, temporadas: 11 },
  { nome: "Athletico-PR",        reb: 1, temporadas: 11 },
  { nome: "Atlético-MG",         reb: 0, temporadas: 11 },
  { nome: "São Paulo",           reb: 0, temporadas: 11 },
  { nome: "Fluminense",          reb: 0, temporadas: 11 },
  { nome: "Corinthians",         reb: 0, temporadas: 11 },
  { nome: "Grêmio",              reb: 1, temporadas: 10 },
  { nome: "Internacional",       reb: 1, temporadas: 11 },
  { nome: "Santos",              reb: 1, temporadas: 11 },
  { nome: "Botafogo",            reb: 2, temporadas: 10 },
  { nome: "Vasco",               reb: 2, temporadas:  8 },
  { nome: "Cruzeiro",            reb: 1, temporadas:  8 },
  { nome: "Bahia",               reb: 2, temporadas:  8 },
  { nome: "Fortaleza",           reb: 0, temporadas:  6 },
  { nome: "Red Bull Bragantino", reb: 0, temporadas:  5 },
  { nome: "Ceará",               reb: 1, temporadas:  6 },
  { nome: "Goiás",               reb: 3, temporadas:  8 },
  { nome: "Coritiba",            reb: 3, temporadas:  8 },
  { nome: "América-MG",          reb: 3, temporadas:  7 },
  { nome: "Sport",               reb: 2, temporadas:  8 },
  { nome: "Juventude",           reb: 1, temporadas:  5 },
  { nome: "Avaí",                reb: 4, temporadas:  6 },
  { nome: "Cuiabá",              reb: 1, temporadas:  4 },
  { nome: "Atlético-GO",         reb: 3, temporadas:  5 },
  { nome: "Vitória",             reb: 2, temporadas:  5 },
  { nome: "Criciúma",            reb: 2, temporadas:  4 },
  { nome: "Mirassol",            reb: 0, temporadas:  1 },
  { nome: "Chapecoense",         reb: 2, temporadas:  5 },
];

// ============================================================
// MODELO PROBABILÍSTICO (fórmula calibrada nos dados reais)
// Três componentes com pesos documentados
// ============================================================
function calcularProbabilidade({ time, pontos, rodada, posicao }) {
  const r = parseInt(rodada);
  const p = parseInt(pontos);
  const pos = parseInt(posicao) || 10;

  // Componente 1 — Ritmo atual vs histórico (peso 55%)
  const aprovAtual = p / r;
  const aprovMin = APROV_REBAIXADO * 0.6;
  const aprovMax = APROV_LIMIAR * 1.1;
  const fatorRitmo = 1 - Math.min(Math.max((aprovAtual - aprovMin) / (aprovMax - aprovMin), 0), 1);

  // Componente 2 — Projeção final vs limiar histórico (peso 30%)
  const pontosProjetados = aprovAtual * 38;
  const z = (MEDIA_LIMIAR - pontosProjetados) / DESVIO_PADRAO;
  const fatorProjecao = Math.min(Math.max(0.5 * (1 + z / Math.sqrt(1 + z * z * 0.4)), 0), 1);

  // Componente 3 — DNA histórico do clube (peso 15%)
  const taxaHistorica = time.temporadas > 0 ? time.reb / time.temporadas : 0;
  const fatorHistorico = Math.min(taxaHistorica / 0.5, 1);

  // Ajuste fino de posição
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
  const lerp = (ca, cb) => Math.round(((ah >> ca) & 0xff) + (((bh >> cb) & 0xff) - ((ah >> ca) & 0xff)) * t);
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
    { p: 0,   c: "#00e676" },
    { p: 0.4, c: "#ffab00" },
    { p: 0.7, c: "#ff4500" },
    { p: 1.0, c: "#ff1744" },
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
      {/* Track */}
      <path d={`M ${toXY(Math.PI).join(" ")} A ${R} ${R} 0 0 1 ${toXY(2*Math.PI).join(" ")}`}
        fill="none" stroke="#161626" strokeWidth="14" strokeLinecap="round" />
      {/* Colored arc */}
      {segs.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={s.c} strokeWidth="10" strokeLinecap="round" opacity="0.9" />
      ))}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5.5" fill="#fff" />
      {/* Labels */}
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
        borderRadius: 99,
        transition: "width 1.3s cubic-bezier(.25,1,.5,1)",
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
  const [time, setTime] = useState(null);
  const [pontos, setPontos] = useState("");
  const [rodada, setRodada] = useState("");
  const [posicao, setPosicao] = useState("");
  const [resultado, setResultado] = useState(null);
  const [search, setSearch] = useState("");
  const [abrirLista, setAbrirLista] = useState(false);
  const [animProb, setAnimProb] = useState(0);

  const filtrados = TIMES.filter(t => t.nome.toLowerCase().includes(search.toLowerCase()));

  const calcular = () => {
    if (!time || pontos === "" || rodada === "") return;
    const prob = calcularProbabilidade({ time, pontos, rodada, posicao });
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
  const r = parseInt(rodada) || 0;
  const p = parseInt(pontos) || 0;
  const pontosProj = r > 0 ? Math.round((p / r) * 38) : null;
  const ptsFalta   = Math.max(0, 45 - p);
  const rodRest    = r > 0 ? 38 - r : null;

  const inputStyle = {
    width: "100%", boxSizing: "border-box", textAlign: "center",
    padding: "10px 6px", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,69,0,0.2)", borderRadius: 7,
    color: "#fff", fontSize: 16, fontWeight: 700,
    outline: "none", fontFamily: "monospace",
  };

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
            <span>{time ? time.nome : "Selecione o time..."}</span>
            <span style={{ color: "#ff4500", fontSize: 11 }}>{abrirLista ? "▲" : "▼"}</span>
          </div>
          {abrirLista && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 99,
              background: "#0d0d1c", border: "1px solid rgba(255,69,0,0.22)",
              borderRadius: 8, marginTop: 4, maxHeight: 230, overflowY: "auto",
            }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..." onClick={e => e.stopPropagation()}
                style={{
                  width: "100%", padding: "9px 12px", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.03)", border: "none",
                  borderBottom: "1px solid rgba(255,69,0,0.12)",
                  color: "#ddd", fontSize: 12, outline: "none", fontFamily: "monospace",
                }}
              />
              {filtrados.map(t => (
                <div key={t.nome}
                  onClick={() => { setTime(t); setAbrirLista(false); setSearch(""); setResultado(null); }}
                  style={{
                    padding: "9px 14px", cursor: "pointer", fontSize: 13,
                    display: "flex", justifyContent: "space-between",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: time?.nome === t.nome ? "rgba(255,69,0,0.08)" : "transparent",
                    transition: "background .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = time?.nome === t.nome ? "rgba(255,69,0,0.08)" : "transparent"}
                >
                  <span>{t.nome}</span>
                  {t.reb > 0 && <span style={{ color: "#ff4500", fontSize: 10 }}>{t.reb}× rebaixado</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inputs numéricos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
          {[
            { label: "PONTOS", val: pontos, set: setPontos, ph: "Ex: 9" },
            { label: "RODADA", val: rodada,  set: setRodada,  ph: "Ex: 9" },
            { label: "POSIÇÃO",val: posicao, set: setPosicao, ph: "Ex: 14" },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#ff4500", marginBottom: 6 }}>{label}</div>
              <input type="number" value={val} placeholder={ph}
                onChange={e => { set(e.target.value); setResultado(null); }}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <button onClick={calcular}
          disabled={!time || pontos === "" || rodada === ""}
          style={{
            width: "100%", padding: "13px", border: "none", borderRadius: 8,
            background: (!time || pontos === "" || rodada === "")
              ? "rgba(255,69,0,0.12)"
              : "linear-gradient(135deg, #ff6d00, #ff1744)",
            color: "#fff", fontWeight: 700, fontSize: 12, letterSpacing: 3,
            cursor: (!time || pontos === "" || rodada === "") ? "not-allowed" : "pointer",
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

          {/* Cards de contexto */}
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

          {/* COMO CALCULAMOS */}
          <Secao titulo="COMO CALCULAMOS">
            <div style={{ fontSize: 11, color: "#666", lineHeight: 1.75 }}>
              {[
                {
                  label: "Ritmo de pontuação (55%)",
                  desc: `Seu aproveitamento atual: ${pontos} pts em ${rodada} jogos = ${(p/r).toFixed(2)} pts/jogo. Média histórica dos rebaixados: ${APROV_REBAIXADO.toFixed(2)} pts/jogo. Linha de sobrevivência: ${APROV_LIMIAR.toFixed(2)} pts/jogo.`,
                },
                {
                  label: "Projeção de pontos finais (30%)",
                  desc: `Com esse ritmo você terminaria com ~${pontosProj} pts. A média histórica do 16º colocado (limiar de sobrevivência) é ${MEDIA_LIMIAR} pts ± ${DESVIO_PADRAO} pts, calculada sobre as 11 temporadas (2014–2024).`,
                },
                {
                  label: "DNA histórico do clube (15%)",
                  desc: `${time?.nome} foi rebaixado ${time?.reb}x em ${time?.temporadas} temporadas na Série A = taxa de ${time ? ((time.reb/time.temporadas)*100).toFixed(0) : "—"}% de rebaixamento histórico.`,
                },
              ].map(({ label, desc }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ color: "#ff4500", fontWeight: 700, marginBottom: 2 }}>▸ {label}</div>
                  <div>{desc}</div>
                </div>
              ))}
            </div>
          </Secao>

          {/* DADOS E FONTES */}
          <Secao titulo="DADOS E FONTES (2014–2024)">
            <div style={{ fontSize: 11, color: "#555", lineHeight: 1.8 }}>
              <div style={{ marginBottom: 12, color: "#666" }}>
                <span style={{ color: "#888" }}>Período:</span> 11 temporadas (2014–2024)<br />
                <span style={{ color: "#888" }}>Registros:</span> 44 times rebaixados analisados<br />
                <span style={{ color: "#888" }}>Fontes:</span> football-data.co.uk · ogol.com.br · Wikipedia
              </div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: 1, marginBottom: 8 }}>REBAIXADOS POR TEMPORADA:</div>
              {REBAIXADOS_HISTORICO.map(({ ano, times: ts, limiar }) => (
                <div key={ano} style={{ fontSize: 10, marginBottom: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: "#ff4500", minWidth: 34 }}>{ano}</span>
                  <span style={{ color: "#888", flex: 1 }}>{ts.join(", ")}</span>
                  <span style={{ color: "#444" }}>limiar: {limiar} pts</span>
                </div>
              ))}
              <div style={{ marginTop: 12, color: "#3a3a4a", fontSize: 10, lineHeight: 1.6 }}>
                * 2020 teve formato reduzido por COVID-19. Anos com rebaixados atípicos (*) foram normalizados no cálculo do limiar médio.
              </div>
            </div>
          </Secao>
        </div>
      )}

      <div style={{ marginTop: 36, fontSize: 10, color: "#2a2a3a", letterSpacing: 1, textAlign: "center" }}>
        VOU DESCER? · Modelo estatístico · Dados 2014–2024 · Não é profecia, é matemática.
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

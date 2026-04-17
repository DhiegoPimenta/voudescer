// Tenta múltiplos endpoints ESPN e retorna o primeiro que funcionar
const ENDPOINTS = [
  // v2 com season (mais correto para soccer)
  "https://site.web.api.espn.com/apis/v2/sports/soccer/BRA.1/standings?season=2026",
  "https://site.web.api.espn.com/apis/v2/sports/soccer/BRA.1/standings?season=2025",
  // site.api.espn com v2
  "https://site.api.espn.com/apis/v2/sports/soccer/BRA.1/standings?season=2026",
  "https://site.api.espn.com/apis/v2/sports/soccer/BRA.1/standings?season=2025",
  // Fallback: site.api sem season
  "https://site.api.espn.com/apis/site/v2/sports/soccer/BRA.1/standings",
];

function getStat(stats, ...keys) {
  if (!Array.isArray(stats)) return null;
  for (const key of keys) {
    const s = stats.find(s => s.name === key || s.abbreviation === key || s.shortDisplayName === key);
    if (s != null) return s.value ?? parseFloat(s.displayValue) ?? null;
  }
  return null;
}

function parseEntries(entries) {
  return entries.map((entry, idx) => {
    const nomeEspn = entry?.team?.displayName || entry?.team?.shortDisplayName || entry?.team?.name || "";
    const stats = entry?.stats || [];
    return {
      nomeEspn,
      posicao: idx + 1,
      pontos:  getStat(stats, "points",      "pts",         "PTS",  "P")  ?? 0,
      jogos:   getStat(stats, "gamesPlayed", "GP",          "GJ",   "gp") ?? 0,
      vitorias:getStat(stats, "wins",        "W",           "V")          ?? 0,
      empates: getStat(stats, "ties",        "D",           "E")          ?? 0,
      derrotas:getStat(stats, "losses",      "L")                         ?? 0,
    };
  });
}

function findEntries(data) {
  // Caminho 1: data.standings.entries
  if (data?.standings?.entries?.length) return data.standings.entries;
  // Caminho 2: data.children[*].standings.entries
  if (data?.children?.length) {
    for (const child of data.children) {
      if (child?.standings?.entries?.length) return child.standings.entries;
      // Caminho 3: mais aninhado
      if (child?.children?.length) {
        for (const sub of child.children) {
          if (sub?.standings?.entries?.length) return sub.standings.entries;
        }
      }
    }
  }
  // Caminho 4: data diretamente é array
  if (Array.isArray(data?.entries)) return data.entries;
  return null;
}

export async function fetchClassificacao() {
  const errors = [];

  for (const url of ENDPOINTS) {
    try {
      console.log("[VouDescer] Tentando:", url);
      const res = await fetch(url);
      if (!res.ok) { errors.push(`${url}: HTTP ${res.status}`); continue; }
      
      const data = await res.json();
      console.log("[VouDescer] JSON recebido de", url, "— chaves:", Object.keys(data));

      const entries = findEntries(data);

      if (!entries || entries.length === 0) {
        console.warn("[VouDescer] Sem entries em", url, "— JSON completo:", JSON.stringify(data).slice(0, 500));
        errors.push(`${url}: sem entries`);
        continue;
      }

      console.log("[VouDescer] ✅ Sucesso! ", entries.length, "times em", url);
      console.log("[VouDescer] Exemplo entry[0]:", JSON.stringify(entries[0]).slice(0, 400));
      return parseEntries(entries);

    } catch (e) {
      console.error("[VouDescer] Erro em", url, e.message);
      errors.push(`${url}: ${e.message}`);
    }
  }

  throw new Error(`Todos os endpoints falharam: ${errors.join(" | ")}`);
}

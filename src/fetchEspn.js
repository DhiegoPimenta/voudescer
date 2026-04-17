const YEAR = new Date().getFullYear();

const ENDPOINTS = [
  `https://site.web.api.espn.com/apis/v2/sports/soccer/BRA.1/standings?season=${YEAR}`,
  `https://site.web.api.espn.com/apis/v2/sports/soccer/BRA.1/standings?season=${YEAR - 1}`,
  `https://site.api.espn.com/apis/v2/sports/soccer/BRA.1/standings?season=${YEAR}`,
  `https://site.api.espn.com/apis/site/v2/sports/soccer/BRA.1/standings`,
];

const ESPN_MAP = {
  "Palmeiras": "Palmeiras", "Flamengo": "Flamengo",
  "São Paulo": "São Paulo", "Sao Paulo": "São Paulo",
  "Fluminense": "Fluminense", "Bahia": "Bahia",
  "Athletico Paranaense": "Athletico-PR", "Athletico-PR": "Athletico-PR",
  "Coritiba": "Coritiba",
  "Atlético-MG": "Atlético-MG", "Atletico-MG": "Atlético-MG", "Atletico Mineiro": "Atlético-MG",
  "Red Bull Bragantino": "Red Bull Bragantino",
  "Vitória": "Vitória", "Vitoria": "Vitória",
  "Botafogo": "Botafogo", "Grêmio": "Grêmio", "Gremio": "Grêmio",
  "Vasco da Gama": "Vasco", "Vasco": "Vasco",
  "Internacional": "Internacional", "Santos": "Santos",
  "Corinthians": "Corinthians", "Cruzeiro": "Cruzeiro",
  "Remo": "Remo", "Chapecoense": "Chapecoense", "Mirassol": "Mirassol",
  "Fortaleza": "Fortaleza", "Ceará": "Ceará", "Ceara": "Ceará",
  "Goiás": "Goiás", "Goias": "Goiás", "Juventude": "Juventude",
  "Sport": "Sport", "Sport Club do Recife": "Sport",
  "América-MG": "América-MG", "America Mineiro": "América-MG",
  "Avaí": "Avaí", "Avai": "Avaí",
  "Cuiabá": "Cuiabá", "Cuiaba": "Cuiabá",
  "Atlético-GO": "Atlético-GO", "Atletico Goianiense": "Atlético-GO",
  "Criciúma": "Criciúma", "Criciuma": "Criciúma",
};

function getStat(stats, ...keys) {
  if (!Array.isArray(stats)) return null;
  for (const key of keys) {
    const s = stats.find(s => s.name === key || s.abbreviation === key || s.shortDisplayName === key);
    if (s != null) return s.value ?? parseFloat(s.displayValue) ?? null;
  }
  return null;
}

function findEntries(data) {
  if (data?.standings?.entries?.length) return data.standings.entries;
  if (data?.children?.length) {
    for (const child of data.children) {
      if (child?.standings?.entries?.length) return child.standings.entries;
      if (child?.children?.length) {
        for (const sub of child.children) {
          if (sub?.standings?.entries?.length) return sub.standings.entries;
        }
      }
    }
  }
  if (Array.isArray(data?.entries) && data.entries.length) return data.entries;
  return null;
}

function parseEntries(entries) {
  return entries
    .map((entry, idx) => {
      const nomeEspn =
        entry?.team?.displayName ||
        entry?.team?.shortDisplayName ||
        entry?.team?.name || "";

      // Se nome vazio, pula
      if (!nomeEspn) return null;

      const nome = ESPN_MAP[nomeEspn] || nomeEspn; // fallback: usa o nome da ESPN mesmo
      const stats = entry?.stats || [];

      return {
        nome,          // ← SEMPRE uma string válida
        nomeEspn,
        posicao: idx + 1,
        pontos:   getStat(stats, "points",      "pts",  "PTS", "P")   ?? 0,
        jogos:    getStat(stats, "gamesPlayed", "GP",   "GJ",  "gp")  ?? 0,
        vitorias: getStat(stats, "wins",        "W",    "V")           ?? 0,
        empates:  getStat(stats, "ties",        "D",    "E")           ?? 0,
        derrotas: getStat(stats, "losses",      "L")                   ?? 0,
      };
    })
    .filter(Boolean); // remove nulls
}

export async function fetchClassificacao() {
  const errors = [];

  for (const url of ENDPOINTS) {
    try {
      console.log("[VouDescer] Tentando:", url);
      const res = await fetch(url);
      if (!res.ok) { errors.push(`${url}: HTTP ${res.status}`); continue; }

      const data = await res.json();
      const entries = findEntries(data);

      if (!entries?.length) {
        errors.push(`${url}: sem entries`);
        continue;
      }

      console.log("[VouDescer] ✅", entries.length, "times via", url);
      return parseEntries(entries);
    } catch (e) {
      errors.push(`${url}: ${e.message}`);
    }
  }

  throw new Error(errors.join(" | "));
}

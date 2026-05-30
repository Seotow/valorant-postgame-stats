/* ── Configurable CSS vars (set by applyOverlayConfig) ─── */
let _overlayConfig = {};

/* ── Demo data ─────────────────────────────────────────── */
const postgameData = {
  match: {
    leftTeamName: "MY TEAM", rightTeamName: "ENEMY",
    leftTeamLogo: "", rightTeamLogo: "", leagueLogo: "",
    leftScore: 13, rightScore: 11,
    leftResult: "THẮNG", rightResult: "THUA",
    mapName: "ASCENT", mapNameLeft: "ASCENT",
    queueName: "COMPETITIVE", duration: "38:24",
    mapImageLeft: "", sponsorImage: "",
  },
  mvp: {
    left:  { agent: "JETT",  name: "HIEU#VN2",   kills: 24, deaths: 12, acs: 286, portrait: "" },
    right: { agent: "REYNA", name: "ENEMY#TAG",  kills: 21, deaths: 14, acs: 251, portrait: "" },
  },
  rows: [
    { leftSub: "SOVA",    leftMain: "PLAYER01#VN", leftKills: 18, leftAcs: 220, leftIcon: "",
      rightSub: "OMEN",   rightMain: "PLAYER06#VN", rightKills: 15, rightAcs: 185, rightIcon: "" },
    { leftSub: "KILLJOY", leftMain: "PLAYER02#VN", leftKills: 14, leftAcs: 180, leftIcon: "",
      rightSub: "RAZE",   rightMain: "PLAYER07#VN", rightKills: 12, rightAcs: 162, rightIcon: "" },
    { leftSub: "OMEN",    leftMain: "PLAYER03#VN", leftKills: 11, leftAcs: 155, leftIcon: "",
      rightSub: "SAGE",   rightMain: "PLAYER08#VN", rightKills: 9,  rightAcs: 130, rightIcon: "" },
    { leftSub: "PHOENIX", leftMain: "PLAYER04#VN", leftKills: 8,  leftAcs: 120, leftIcon: "",
      rightSub: "VIPER",  rightMain: "PLAYER09#VN", rightKills: 7,  rightAcs: 110, rightIcon: "" },
  ],
};

/* ── DOM helpers ──────────────────────────────────────── */
function setText(selector, value) {
  document.querySelectorAll(selector).forEach(function(el) {
    el.textContent = value ?? "";
  });
}

function setImg(name, src) {
  const el = document.querySelector(`[data-bind-img="${name}"]`);
  if (el) el.src = src || "";
}

/* ── Config: apply CSS vars + store ──────────────────── */
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function applyOverlayConfig(cfg) {
  _overlayConfig = cfg;
  const root = document.documentElement.style;
  if (cfg.primaryColor) root.setProperty("--primary-rgb", hexToRgb(cfg.primaryColor));
  if (cfg.primaryOpacity != null) root.setProperty("--primary-a", cfg.primaryOpacity);
  if (cfg.cellColor)  root.setProperty("--cell-rgb",  hexToRgb(cfg.cellColor));
  if (cfg.cellOpacity  != null) root.setProperty("--cell-a",  cfg.cellOpacity);
  if (cfg.cell2Color) root.setProperty("--cell2-rgb", hexToRgb(cfg.cell2Color));
  if (cfg.cell2Opacity != null) root.setProperty("--cell2-a", cfg.cell2Opacity);
  if (cfg.fontFamily)  root.setProperty("--font-overlay", `"${cfg.fontFamily}"`);
  if (cfg.headerTextColor) root.setProperty("--header-text", cfg.headerTextColor);
  if (cfg.bodyTextColor)   root.setProperty("--body-text",   cfg.bodyTextColor);
  if (cfg.headerBgColor)   root.setProperty("--header-bg-rgb", hexToRgb(cfg.headerBgColor));
  if (cfg.headerBgOpacity != null) root.setProperty("--header-bg-a", cfg.headerBgOpacity);

  const bgEl = document.getElementById("bg-layer");
  if (bgEl) {
    bgEl.style.backgroundImage = cfg.overlayBg ? `url("${cfg.overlayBg}")` : "none";
    bgEl.style.backgroundColor = cfg.overlayBgColor || "transparent";
    bgEl.style.opacity         = String(cfg.overlayBgOpacity ?? 0);
  }
}

/* ── Render ───────────────────────────────────────────── */
function render(data) {
  const m = data.match;

  /* bind plain text values */
  Object.entries(m).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number")
      setText(`[data-bind="${key}"]`, value);
  });

  /* MVP text */
  setText('[data-bind="leftMvpAgent"]',   data.mvp.left.agent);
  setText('[data-bind="leftMvpName"]',    data.mvp.left.name);
  setText('[data-bind="leftMvpKills"]',   data.mvp.left.kills);
  setText('[data-bind="leftMvpDeaths"]',  data.mvp.left.deaths);
  setText('[data-bind="leftMvpAcs"]',     data.mvp.left.acs);
  setText('[data-bind="rightMvpAgent"]',  data.mvp.right.agent);
  setText('[data-bind="rightMvpName"]',   data.mvp.right.name);
  setText('[data-bind="rightMvpKills"]',  data.mvp.right.kills);
  setText('[data-bind="rightMvpDeaths"]', data.mvp.right.deaths);
  setText('[data-bind="rightMvpAcs"]',    data.mvp.right.acs);

  /* images */
  setImg("leftMvpPortrait",  data.mvp.left.portrait  || "");
  setImg("rightMvpPortrait", data.mvp.right.portrait || "");
  setImg("leftTeamLogo",     m.leftTeamLogo  || "");
  setImg("rightTeamLogo",    m.rightTeamLogo || "");
  setImg("leagueLogo",       m.leagueLogo    || "");
  setImg("mapImageLeft",  m.mapImageLeft  || "");
  setImg("sponsorImage",  m.sponsorImage  || "");

  /* Map name auto from match data */
  setText('[data-bind="mapNameLeft"]',  (m.mapNameLeft  || "MAP").toUpperCase());

  /* player rows */
  data.rows.slice(0, 4).forEach((row, i) => {
    const setRowImg = (sel, src) => {
      const el = document.querySelector(sel);
      if (el) el.src = src || "";
    };
    setText(`[data-round-left-sub="${i}"]`,    row.leftSub);
    setText(`[data-round-left-main="${i}"]`,   row.leftMain);
    setText(`[data-round-left-kills="${i}"]`,  row.leftKills);
    setText(`[data-round-left-acs="${i}"]`,    row.leftAcs);
    setText(`[data-round-right-sub="${i}"]`,   row.rightSub);
    setText(`[data-round-right-main="${i}"]`,  row.rightMain);
    setText(`[data-round-right-kills="${i}"]`, row.rightKills);
    setText(`[data-round-right-acs="${i}"]`,   row.rightAcs);
    setRowImg(`[data-round-left-icon="${i}"]`,  row.leftIcon  || "");
    setRowImg(`[data-round-right-icon="${i}"]`, row.rightIcon || "");
  });
}

/* ── Build render data from v4 API response ──────────── */
function buildPostgameData(match, myPuuid) {
  const myPlayer    = match.players.find((p) => p.puuid === myPuuid);
  const leftTeamId  = myPlayer?.team_id ?? "Blue";
  const rightTeamId = leftTeamId === "Blue" ? "Red" : "Blue";

  const leftTeam  = match.teams?.find((t) => t.team_id === leftTeamId);
  const rightTeam = match.teams?.find((t) => t.team_id === rightTeamId);

  const leftScore  = leftTeam?.rounds?.won  ?? 0;
  const rightScore = rightTeam?.rounds?.won ?? 0;
  const isTie      = leftScore === rightScore;

  const totalRounds = leftTeam ? (leftTeam.rounds.won + leftTeam.rounds.lost) : 1;

  const leftPlayers  = match.players.filter((p) => p.team_id === leftTeamId);
  const rightPlayers = match.players.filter((p) => p.team_id === rightTeamId);

  const acs   = (p) => Math.round((p.stats?.score ?? 0) / totalRounds);
  const byAcs = (arr) => [...arr].sort((a, b) => acs(b) - acs(a));

  const leftSorted  = byAcs(leftPlayers);
  const rightSorted = byAcs(rightPlayers);
  const lMvp = leftSorted[0];
  const rMvp = rightSorted[0];

  const agentName  = (p) => p?.agent?.name ?? "?";
  const portrait   = (p) => p?.agent?.id ? `https://media.valorant-api.com/agents/${p.agent.id}/fullportrait.png`  : "";
  const agentIcon  = (p) => p?.agent?.id ? `https://media.valorant-api.com/agents/${p.agent.id}/displayicon.png`   : "";
  const playerName = (p) => (p ? `${p.name}#${p.tag}` : "");

  const mapName   = (match.metadata?.map?.name   ?? "MAP").toUpperCase();
  const queueName = (match.metadata?.queue?.name ?? match.metadata?.queue?.id ?? "").toUpperCase();
  const durSec    = Math.floor((match.metadata?.game_length_in_ms ?? 0) / 1000);
  const duration  = `${Math.floor(durSec / 60)}:${String(durSec % 60).padStart(2, "0")}`;

  const cfg = _overlayConfig;
  const mapId = match.metadata?.map?.id ?? "";

  return {
    match: {
      leftTeamName:   cfg.leftTeamName  || "MY TEAM",
      rightTeamName:  cfg.rightTeamName || "ENEMY",
      leftTeamLogo:   cfg.leftTeamLogo  || "",
      rightTeamLogo:  cfg.rightTeamLogo || "",
      leagueLogo:     cfg.leagueLogo    || "",
      leftScore,
      rightScore,
      leftResult:     isTie ? "THUA" : (leftTeam?.won  ? "THẮNG" : "THUA"),
      rightResult:    isTie ? "THUA" : (rightTeam?.won ? "THẮNG" : "THUA"),
      mapName,
      mapNameLeft:  mapName,
      queueName,
      duration,
      mapImageLeft:  mapId ? `https://media.valorant-api.com/maps/${mapId}/splash.png` : "",
      sponsorImage:  cfg.sponsorImage || "",
    },
    mvp: {
      left: {
        agent:    agentName(lMvp),
        name:     playerName(lMvp),
        kills:    lMvp?.stats?.kills  ?? 0,
        deaths:   lMvp?.stats?.deaths ?? 0,
        acs:      acs(lMvp),
        portrait: portrait(lMvp),
      },
      right: {
        agent:    agentName(rMvp),
        name:     playerName(rMvp),
        kills:    rMvp?.stats?.kills  ?? 0,
        deaths:   rMvp?.stats?.deaths ?? 0,
        acs:      acs(rMvp),
        portrait: portrait(rMvp),
      },
    },
    rows: Array.from({ length: 4 }, (_, i) => {
      const lp = leftSorted[i + 1];
      const rp = rightSorted[i + 1];
      return {
        leftSub:    agentName(lp),   leftMain:   playerName(lp),
        leftIcon:   agentIcon(lp),   leftKills:  lp?.stats?.kills ?? 0,  leftAcs:  acs(lp),
        rightSub:   agentName(rp),   rightMain:  playerName(rp),
        rightIcon:  agentIcon(rp),   rightKills: rp?.stats?.kills ?? 0,  rightAcs: acs(rp),
      };
    }),
  };
}

/* ── API: load current match ─────────────────────────── */
async function loadFromApi() {
  try {
    const resp = await fetch("/api/current-match").then((r) => r.json());
    if (resp.error) { render(postgameData); return; }
    render(buildPostgameData(resp, resp._puuid ?? ""));
  } catch (err) {
    console.error("[overlay] API load failed:", err);
    render(postgameData);
  }
}

/* ── SSE: listen for live updates from dashboard ─────── */
(function connectSSE() {
  const es = new EventSource("/api/events");

  es.onmessage = function (e) {
    const ev = JSON.parse(e.data);
    if (ev.type === "match-updated") loadFromApi();
    if (ev.type === "config-updated") {
      /* re-fetch to avoid large base64 payloads in SSE */
      fetch("/api/overlay-config").then((r) => r.json()).then((cfg) => {
        applyOverlayConfig(cfg);
        loadFromApi();
      });
    }
  };

  es.onerror = function () {
    es.close();
    setTimeout(connectSSE, 5000); /* reconnect after 5 s */
  };
})();

/* ── Boot ────────────────────────────────────────────── */
(async function boot() {
  try {
    const cfg = await fetch("/api/overlay-config").then((r) => r.json());
    applyOverlayConfig(cfg);
  } catch (_) { /* use CSS defaults */ }
  loadFromApi();
})();

/* ── Config store ──────────────────────────────────────── */
let _cfg = {};

/* ── Demo data (shown when no match is selected) ────────── */
const demoMvp = {
  name:             "HYY",
  tag:              "RRQ",
  is_my_team:       true,
  agent_id:         "",
  agent_name:       "NEON",
  acs:              281,
  kills:            22,
  deaths:           19,
  assists:          5,
  damage_per_round: 160.9,
  first_kill_pct:   17.4,
  kast_pct:         78.3,
};

/* ── CSS variable helper ─────────────────────────────────── */
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/* ── Apply overlay-config CSS variables ─────────────────── */
function applyOverlayConfig(cfg) {
  _cfg = cfg;
  const root = document.documentElement.style;
  if (cfg.primaryColor)          root.setProperty("--primary-rgb",    hexToRgb(cfg.primaryColor));
  if (cfg.primaryOpacity != null) root.setProperty("--primary-a",      cfg.primaryOpacity);
  if (cfg.cellColor)             root.setProperty("--cell-rgb",        hexToRgb(cfg.cellColor));
  if (cfg.cellOpacity    != null) root.setProperty("--cell-a",         cfg.cellOpacity);
  if (cfg.cell2Color)            root.setProperty("--cell2-rgb",       hexToRgb(cfg.cell2Color));
  if (cfg.cell2Opacity   != null) root.setProperty("--cell2-a",        cfg.cell2Opacity);
  if (cfg.fontFamily)            root.setProperty("--font-overlay",    `"${cfg.fontFamily}"`);
  if (cfg.headerTextColor)       root.setProperty("--header-text",     cfg.headerTextColor);
  if (cfg.bodyTextColor)         root.setProperty("--body-text",       cfg.bodyTextColor);
  if (cfg.headerBgColor)         root.setProperty("--header-bg-rgb",   hexToRgb(cfg.headerBgColor));
  if (cfg.headerBgOpacity != null) root.setProperty("--header-bg-a",   cfg.headerBgOpacity);

  const bgEl = document.getElementById("bg-layer");
  if (bgEl) {
    bgEl.style.backgroundImage = cfg.overlayBg ? `url("${cfg.overlayBg}")` : "none";
    bgEl.style.backgroundColor = cfg.overlayBgColor || "transparent";
    bgEl.style.opacity         = String(cfg.overlayBgOpacity ?? 0);
  }
}

/* ── Render MVP data ─────────────────────────────────────── */
function render(mvp) {
  const agentId = mvp.agent_id || "";

  const el    = (id)       => document.getElementById(id);
  const set   = (id, val)  => { const e = el(id); if (e) e.textContent = val ?? ""; };
  const setSrc = (id, src) => { const e = el(id); if (e) e.src = src || ""; };

  /* Agent images: background art + transparent portrait layered */
  setSrc("mvp-agent-bg",
    agentId ? `https://media.valorant-api.com/agents/${agentId}/background.png` : ""
  );
  setSrc("mvp-agent-portrait",
    agentId ? `https://media.valorant-api.com/agents/${agentId}/fullportrait.png` : ""
  );

  /* Team info from overlay config */
  const teamName = mvp.is_my_team
    ? (_cfg.leftTeamName  || mvp.tag || "")
    : (_cfg.rightTeamName || mvp.tag || "");
  const teamLogo = mvp.is_my_team
    ? (_cfg.leftTeamLogo  || "")
    : (_cfg.rightTeamLogo || "");

  set("mvp-name",      mvp.name || "");
  set("mvp-team-name", teamName);
  setSrc("mvp-team-logo", teamLogo);

  /* Stats */
  set("mvp-acs",  mvp.acs              ?? 0);
  set("mvp-kda",  `${mvp.kills ?? 0}/${mvp.deaths ?? 0}`);
  set("mvp-dpr",  mvp.damage_per_round ?? 0);
  set("mvp-fk",   mvp.first_kill_pct  ?? 0);
  set("mvp-kast", mvp.kast_pct        ?? 0);
}

/* ── API fetch ───────────────────────────────────────────── */
async function loadMvp() {
  try {
    const resp = await fetch("/api/current-mvp").then((r) => r.json());
    if (resp.error) { render(demoMvp); return; }
    render(resp);
  } catch (err) {
    console.error("[mvp] load failed:", err);
    render(demoMvp);
  }
}

/* ── SSE: live updates ───────────────────────────────────── */
(function connectSSE() {
  const es = new EventSource("/api/events");

  es.onmessage = function (e) {
    const ev = JSON.parse(e.data);
    if (ev.type === "match-updated") loadMvp();
    if (ev.type === "config-updated") {
      fetch("/api/overlay-config").then((r) => r.json()).then((cfg) => {
        applyOverlayConfig(cfg);
        loadMvp();
      });
    }
  };

  es.onerror = function () {
    es.close();
    setTimeout(connectSSE, 5000);
  };
})();

/* ── Boot ────────────────────────────────────────────────── */
(async function boot() {
  try {
    const cfg = await fetch("/api/overlay-config").then((r) => r.json());
    applyOverlayConfig(cfg);
  } catch (_) { /* use CSS defaults */ }
  loadMvp();
})();

const postgameData = {
  match: {
    leftTeamName: "TEAM A",
    rightTeamName: "TEAM B",
    leftScore: 13,
    rightScore: 11,
    leftResult: "THẮNG",
    rightResult: "THUA",
    mapName: "ASCENT",
    queueName: "COMPETITIVE",
    duration: "38:24"
  },
  mvp: {
    left: { agent: "JETT", name: "HIEU#VN2", kills: 24, acs: 286 },
    right: { agent: "REYNA", name: "ENEMY#TAG", kills: 21, acs: 251 }
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
  ]
};

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value ?? "";
}

function setImg(selector, src) {
  const el = document.querySelector(selector);
  if (el) el.src = src || "";
}

function render(data) {
  const m = data.match;
  Object.entries(m).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number")
      setText(`[data-bind="${key}"]`, value);
  });

  setText('[data-bind="leftMvpAgent"]',  data.mvp.left.agent);
  setText('[data-bind="leftMvpName"]',   data.mvp.left.name);
  setText('[data-bind="leftMvpKills"]',  data.mvp.left.kills);
  setText('[data-bind="leftMvpAcs"]',    data.mvp.left.acs);

  setText('[data-bind="rightMvpAgent"]', data.mvp.right.agent);
  setText('[data-bind="rightMvpName"]',  data.mvp.right.name);
  setText('[data-bind="rightMvpKills"]', data.mvp.right.kills);
  setText('[data-bind="rightMvpAcs"]',   data.mvp.right.acs);

  setImg('[data-panel-img="left"]',  data.match.leftPanelImg  || "");
  setImg('[data-panel-img="right"]', data.match.rightPanelImg || "");

  data.rows.slice(0, 4).forEach((row, i) => {
    setText(`[data-round-left-sub="${i}"]`,    row.leftSub);
    setText(`[data-round-left-main="${i}"]`,   row.leftMain);
    setText(`[data-round-left-kills="${i}"]`,  row.leftKills);
    setText(`[data-round-left-acs="${i}"]`,    row.leftAcs);
    setText(`[data-round-right-sub="${i}"]`,   row.rightSub);
    setText(`[data-round-right-main="${i}"]`,  row.rightMain);
    setText(`[data-round-right-kills="${i}"]`, row.rightKills);
    setText(`[data-round-right-acs="${i}"]`,   row.rightAcs);
    setImg(`[data-round-left-icon="${i}"]`,    row.leftIcon  || "");
    setImg(`[data-round-right-icon="${i}"]`,   row.rightIcon || "");
  });
}

// ─── API integration ─────────────────────────────────────────────────────

function buildPostgameData(match, myPuuid) {
  const myPlayer    = match.players.find((p) => p.puuid === myPuuid);
  const leftTeamId  = myPlayer?.team_id ?? "Blue";
  const rightTeamId = leftTeamId === "Blue" ? "Red" : "Blue";

  const leftTeam  = match.teams?.find((t) => t.team_id === leftTeamId);
  const rightTeam = match.teams?.find((t) => t.team_id === rightTeamId);

  const totalRounds = leftTeam ? (leftTeam.rounds.won + leftTeam.rounds.lost) : 1;

  const leftPlayers  = match.players.filter((p) => p.team_id === leftTeamId);
  const rightPlayers = match.players.filter((p) => p.team_id === rightTeamId);

  const acs   = (p) => Math.round((p.stats?.score         ?? 0) / totalRounds);
  const byAcs = (arr) => [...arr].sort((a, b) => acs(b) - acs(a));

  const leftSorted  = byAcs(leftPlayers);
  const rightSorted = byAcs(rightPlayers);
  const lMvp = leftSorted[0];
  const rMvp = rightSorted[0];

  const agentName  = (p) => p?.agent?.name ?? "?";
  const agentImg   = (p) => p?.agent?.id
    ? `https://media.valorant-api.com/agents/${p.agent.id}/fullportrait.png` : "";
  const agentIcon  = (p) => p?.agent?.id
    ? `https://media.valorant-api.com/agents/${p.agent.id}/displayicon.png`  : "";
  const playerName = (p) => (p ? `${p.name}#${p.tag}` : "");

  const mapName   = (match.metadata?.map?.name   ?? "MAP").toUpperCase();
  const queueName = (match.metadata?.queue?.name ?? match.metadata?.queue?.id ?? "").toUpperCase();

  const durSec  = Math.floor((match.metadata?.game_length_in_ms ?? 0) / 1000);
  const duration = `${Math.floor(durSec / 60)}:${String(durSec % 60).padStart(2, "0")}`;

  return {
    match: {
      leftTeamName:  "MY TEAM",
      rightTeamName: "ENEMY",
      leftScore:     leftTeam?.rounds?.won  ?? 0,
      rightScore:    rightTeam?.rounds?.won ?? 0,
      leftResult:    leftTeam?.won  ? "THẮNG" : "THUA",
      rightResult:   rightTeam?.won ? "THẮNG" : "THUA",
      mapName,
      queueName,
      duration,
      leftPanelImg:  agentImg(lMvp),
      rightPanelImg: agentImg(rMvp),
    },
    mvp: {
      left:  { agent: agentName(lMvp), name: playerName(lMvp), kills: lMvp?.stats?.kills ?? 0, acs: acs(lMvp) },
      right: { agent: agentName(rMvp), name: playerName(rMvp), kills: rMvp?.stats?.kills ?? 0, acs: acs(rMvp) },
    },
    rows: Array.from({ length: 4 }, (_, i) => {
      const lp = leftSorted[i + 1];
      const rp = rightSorted[i + 1];
      return {
        leftSub:    agentName(lp),
        leftMain:   playerName(lp),
        leftIcon:   agentIcon(lp),
        leftKills:  lp?.stats?.kills ?? 0,
        leftAcs:    acs(lp),
        rightSub:   agentName(rp),
        rightMain:  playerName(rp),
        rightIcon:  agentIcon(rp),
        rightKills: rp?.stats?.kills ?? 0,
        rightAcs:   acs(rp),
      };
    }),
  };
}

async function loadFromApi() {
  try {
    const resp = await fetch("/api/current-match").then((r) => r.json());
    if (resp.error) { render(postgameData); return; }
    const puuid = resp._puuid ?? "";
    render(buildPostgameData(resp, puuid));
  } catch (err) {
    console.error("[overlay] API load failed:", err);
    render(postgameData);
  }
}

loadFromApi();

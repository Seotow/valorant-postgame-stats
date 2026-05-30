"""
Valorant Postgame Stats — Henrik Dev API v4 Backend
Run   : python app.py
Open  : http://localhost:7123
Config: Edit config.json with your Riot name, tag and region
"""

import json
from pathlib import Path
from queue import Empty, Queue
from threading import Lock
from flask import Flask, Response, jsonify, send_from_directory, request
import requests

app = Flask(__name__)

BASE_URL     = "https://api.henrikdev.xyz"
CONFIG_FILE          = Path(__file__).parent / "config.json"
OVERLAY_CONFIG_FILE  = Path(__file__).parent / "overlay-config.json"

DEFAULT_OVERLAY_CONFIG = {
    "leftTeamName":      "",
    "rightTeamName":     "",
    "leftTeamLogo":      "",
    "rightTeamLogo":     "",
    "leagueLogo":        "",
    "sponsorImage":      "",
    "primaryColor":      "#ff5a00",
    "primaryOpacity":    1.0,
    "cellColor":         "#343434",
    "cellOpacity":       1.0,
    "cell2Color":        "#1b1d1b",
    "cell2Opacity":      1.0,
    "headerBgColor":     "#343434",
    "headerBgOpacity":   1.0,
    "headerTextColor":   "#f5f5f5",
    "bodyTextColor":     "#f5f5f5",
    "fontFamily":        "Tungsten",
    "fallbackIcon":      "",
    "overlayBg":         "",
    "overlayBgColor":    "#000000",
    "overlayBgOpacity":  0.0,
}

DEFAULT_CONFIG = {
    "name":     "",
    "tag":      "",
    "region":   "ap",
    "platform": "pc",
    "api_key":  "",
}

_account_cache:    dict       = {}
_current_match_id: str        = ""
_sse_clients:      list[Queue] = []
_sse_lock          = Lock()
_maps_cache:       list       = []


# ─── Config ───────────────────────────────────────────────────────────────────

def load_config() -> dict:
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r") as f:
            return {**DEFAULT_CONFIG, **json.load(f)}
    return DEFAULT_CONFIG.copy()


def save_config(data: dict) -> None:
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=2)


def load_overlay_config() -> dict:
    if OVERLAY_CONFIG_FILE.exists():
        with open(OVERLAY_CONFIG_FILE, "r", encoding="utf-8") as f:
            return {**DEFAULT_OVERLAY_CONFIG, **json.load(f)}
    return DEFAULT_OVERLAY_CONFIG.copy()


def save_overlay_config(data: dict) -> None:
    with open(OVERLAY_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ─── SSE helpers ─────────────────────────────────────────────────────────────

def _safe_put(q: Queue, msg: str) -> bool:
    try:
        q.put_nowait(msg)
        return True
    except Exception:
        return False


def notify_overlay(event_type: str, data: dict | None = None) -> None:
    payload = json.dumps({"type": event_type, "data": data or {}})
    with _sse_lock:
        dead = [q for q in _sse_clients if not _safe_put(q, payload)]
        for q in dead:
            _sse_clients.remove(q)


# ─── Henrik Dev API helpers ───────────────────────────────────────────────────

def henrik_headers() -> dict[str, str]:
    cfg = load_config()
    headers: dict[str, str] = {"Accept": "application/json"}
    if cfg.get("api_key"):
        headers["Authorization"] = cfg["api_key"]
    return headers


def get_account() -> dict:
    """Fetch and cache account info (puuid, name, tag, region) via Henrik API."""
    global _account_cache
    if _account_cache:
        return _account_cache
    cfg = load_config()
    if not cfg["name"] or not cfg["tag"]:
        raise ValueError("Player name and tag not configured")
    r = requests.get(
        f"{BASE_URL}/valorant/v1/account/{cfg['name']}/{cfg['tag']}",
        headers=henrik_headers(),
        timeout=10,
    )
    r.raise_for_status()
    data = r.json().get("data", {})
    _account_cache = {
        "puuid":  data["puuid"],
        "name":   data["name"],
        "tag":    data["tag"],
        "region": data.get("region") or cfg["region"],
    }
    return _account_cache


# ─── Static file routes ───────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/preview.html")
def overlay():
    return send_from_directory(".", "preview.html")


@app.route("/mvp.html")
def mvp_overlay():
    return send_from_directory(".", "mvp.html")


@app.route("/custom/<path:filename>")
def custom_overlay(filename: str):
    return send_from_directory("custom", filename)



@app.route("/font/<path:filename>")
def fonts(filename: str):
    return send_from_directory("font", filename)


# ─── API routes ───────────────────────────────────────────────────────────────

@app.route("/api/config", methods=["GET"])
def api_config_get():
    cfg = load_config()
    return jsonify({
        "name":        cfg["name"],
        "tag":         cfg["tag"],
        "region":      cfg["region"],
        "platform":    cfg["platform"],
        "has_api_key": bool(cfg["api_key"]),
    })


@app.route("/api/config", methods=["POST"])
def api_config_post():
    body = request.get_json(force=True) or {}
    cfg  = load_config()
    for key in ("name", "tag", "region", "platform", "api_key"):
        if key in body:
            cfg[key] = body[key]
    save_config(cfg)
    global _account_cache
    _account_cache = {}  # invalidate on config change
    return jsonify({"ok": True})


@app.route("/api/account")
def api_account():
    """Return account info for the configured player."""
    try:
        return jsonify(get_account())
    except ValueError as e:
        return jsonify({"error": str(e), "setup_required": True}), 400
    except requests.HTTPError as e:
        status = e.response.status_code if e.response else 500
        return jsonify({"error": str(e)}), status
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/history")
def api_history():
    """Return last 10 matches as lightweight cards (map, score, queue, date)."""
    try:
        acc      = get_account()
        cfg      = load_config()
        region   = acc["region"] or cfg["region"]
        platform = cfg["platform"]
        r = requests.get(
            f"{BASE_URL}/valorant/v4/by-puuid/matches/{region}/{platform}/{acc['puuid']}",
            headers=henrik_headers(),
            params={"size": 10},
            timeout=20,
        )
        r.raise_for_status()

        matches = []
        for m in r.json().get("data", []):
            meta       = m.get("metadata", {})
            teams      = m.get("teams", [])
            my_player  = next(
                (p for p in m.get("players", []) if p.get("puuid") == acc["puuid"]),
                None,
            )
            my_team_id = my_player.get("team_id") if my_player else "Blue"
            my_team    = next((t for t in teams if t["team_id"] == my_team_id),  None)
            enemy_team = next((t for t in teams if t["team_id"] != my_team_id),  None)
            my_agent = my_player.get("agent", {}) if my_player else {}
            matches.append({
                "match_id":   meta.get("match_id"),
                "map":        meta.get("map",   {}).get("name", ""),
                "queue":      meta.get("queue", {}).get("name") or meta.get("queue", {}).get("id", ""),
                "queue_id":   meta.get("queue", {}).get("id",   ""),
                "started_at": meta.get("started_at"),
                "won":        my_team.get("won") if my_team else None,
                "score":      f"{my_team['rounds']['won']}-{enemy_team['rounds']['won']}"
                              if my_team and enemy_team else "",
                "agent_id":   my_agent.get("id",   ""),
                "agent_name": my_agent.get("name", ""),
            })

        return jsonify({
            "puuid":   acc["puuid"],
            "name":    acc["name"],
            "tag":     acc["tag"],
            "matches": matches,
        })
    except ValueError as e:
        return jsonify({"error": str(e), "setup_required": True}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/match/<match_id>")
def api_match(match_id: str):
    """Return full v4 match data for the overlay."""
    try:
        acc    = get_account()
        cfg    = load_config()
        region = acc["region"] or cfg["region"]
        r = requests.get(
            f"{BASE_URL}/valorant/v4/match/{region}/{match_id}",
            headers=henrik_headers(),
            timeout=20,
        )
        r.raise_for_status()
        data = r.json().get("data", {})
        data["_puuid"] = acc["puuid"]  # attach so overlay knows which team is "mine"
        return jsonify(data)
    except ValueError as e:
        return jsonify({"error": str(e), "setup_required": True}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/overlay-config", methods=["GET"])
def api_overlay_config_get():
    cfg = load_overlay_config()
    # Migrate: clear old low-resolution listviewicon URLs (456x100px)
    for key in ("mapImageLeft", "mapImageRight"):
        if "listviewicon.png" in cfg.get(key, "").lower():
            cfg[key] = ""
    return jsonify(cfg)


@app.route("/api/overlay-config", methods=["POST"])
def api_overlay_config_post():
    body = request.get_json(force=True) or {}
    cfg  = load_overlay_config()
    cfg.update(body)
    save_overlay_config(cfg)
    notify_overlay("config-updated")   # overlay re-fetches; avoids large SSE payload
    return jsonify({"ok": True})


@app.route("/api/maps")
def api_maps():
    """Proxies valorant-api.com map list; filtered & cached in memory."""
    global _maps_cache
    if _maps_cache:
        return jsonify(_maps_cache)
    try:
        r = requests.get("https://valorant-api.com/v1/maps", timeout=10)
        r.raise_for_status()
        _maps_cache = [
            {
                "uuid":                    m.get("uuid"),
                "displayName":             m.get("displayName"),
                "splash":        m.get("splash"),
                "listViewIcon":  m.get("listViewIcon"),
            }
            for m in r.json().get("data", [])
            if m.get("displayName") and m.get("splash")
        ]
        return jsonify(_maps_cache)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/set-match", methods=["POST"])
def api_set_match():
    """Store which match the OBS overlay should display."""
    global _current_match_id
    body = request.get_json(force=True) or {}
    _current_match_id = body.get("match_id", "")
    notify_overlay("match-updated", {"match_id": _current_match_id})
    return jsonify({"ok": True})


@app.route("/api/current-match")
def api_current_match():
    """Return the currently selected match data (used by the OBS overlay)."""
    if not _current_match_id:
        return jsonify({"error": "No match selected yet"}), 404
    return api_match(_current_match_id)


# ─── MVP stats ────────────────────────────────────────────────────────────────

def compute_mvp_stats(match: dict, my_puuid: str = "") -> dict | None:
    """Find the match MVP (highest ACS, any team) and compute advanced stats.

    Advanced stats derived from raw round/kill data:
    - acs             : stats.score / total_rounds
    - damage_per_round: sum of rounds[].player_stats[].damage[].damage / total_rounds
    - first_kill_pct  : rounds where player secured the opening kill / total_rounds * 100
    - kast_pct        : rounds where player got Kill, Assist, Survived, or was Traded / total_rounds * 100
    """
    players      = match.get("players", [])
    rounds_data  = match.get("rounds",  [])
    kills_global = match.get("kills",   [])

    total_rounds = max(len(rounds_data), 1)

    # Index global kill events by round number
    kills_by_round: dict[int, list] = {}
    for k in kills_global:
        kills_by_round.setdefault(k.get("round", 0), []).append(k)

    def acs(p: dict) -> float:
        return p.get("stats", {}).get("score", 0) / total_rounds

    best = max(players, key=acs, default=None)
    if not best:
        return None

    puuid   = best["puuid"]
    stats   = best.get("stats", {})
    kills   = stats.get("kills",   0)
    deaths  = stats.get("deaths",  0)
    assists = stats.get("assists", 0)

    # Damage per round — use top-level stats.damage.dealt (total across match)
    total_damage = best.get("stats", {}).get("damage", {}).get("dealt", 0)
    damage_per_round = round(total_damage / total_rounds, 1)

    # First kill %: rounds where this player got the earliest kill of the round
    # v4 kills[].killer is an object { puuid, name, tag, team }
    first_kill_count = sum(
        1 for rnd_kills in kills_by_round.values()
        if rnd_kills
        and min(rnd_kills, key=lambda k: k.get("time_in_round_in_ms", 0))
               .get("killer", {}).get("puuid") == puuid
    )
    first_kill_pct = round(first_kill_count / total_rounds * 100, 1)

    # KAST: per round check
    # v4: kills[].killer.puuid, kills[].victim.puuid, kills[].assistants[].puuid
    kast_count = 0
    for rnd_idx in range(total_rounds):
        rnd_kills = kills_by_round.get(rnd_idx, [])

        got_kill   = any(k.get("killer", {}).get("puuid") == puuid for k in rnd_kills)
        got_assist = any(
            any(a.get("puuid") == puuid for a in k.get("assistants", []))
            for k in rnd_kills
        )
        got_killed = any(k.get("victim", {}).get("puuid") == puuid for k in rnd_kills)
        survived   = not got_killed

        # Trade: player was killed but their killer was killed within 5 s
        traded = False
        if got_killed:
            for death in (k for k in rnd_kills if k.get("victim", {}).get("puuid") == puuid):
                killer  = death.get("killer", {}).get("puuid", "")
                death_t = death.get("time_in_round_in_ms", 0)
                if any(
                    k.get("victim", {}).get("puuid") == killer
                    and 0 <= k.get("time_in_round_in_ms", 0) - death_t <= 5000
                    for k in rnd_kills
                ):
                    traded = True
                    break

        if got_kill or got_assist or survived or traded:
            kast_count += 1

    kast_pct = round(kast_count / total_rounds * 100, 1)

    agent    = best.get("agent", {})
    agent_id = agent.get("id", "")

    # Determine team assignment relative to logged-in player
    my_player  = next((p for p in players if p.get("puuid") == my_puuid), None)
    my_team_id = my_player.get("team_id", "Blue") if my_player else "Blue"
    is_my_team = best.get("team_id", "") == my_team_id

    return {
        "puuid":            puuid,
        "name":             best.get("name", ""),
        "tag":              best.get("tag",  ""),
        "team_id":          best.get("team_id", ""),
        "is_my_team":       is_my_team,
        "agent_id":         agent_id,
        "agent_name":       agent.get("name", ""),
        "acs":              round(acs(best)),
        "kills":            kills,
        "deaths":           deaths,
        "assists":          assists,
        "damage_per_round": damage_per_round,
        "first_kill_pct":   first_kill_pct,
        "kast_pct":         kast_pct,
    }


@app.route("/api/current-mvp")
def api_current_mvp():
    """Return advanced MVP stats for the currently selected match."""
    if not _current_match_id:
        return jsonify({"error": "No match selected yet"}), 404
    try:
        acc    = get_account()
        cfg    = load_config()
        region = acc["region"] or cfg["region"]
        r = requests.get(
            f"{BASE_URL}/valorant/v4/match/{region}/{_current_match_id}",
            headers=henrik_headers(),
            timeout=20,
        )
        r.raise_for_status()
        match = r.json().get("data", {})
        mvp   = compute_mvp_stats(match, acc["puuid"])
        if not mvp:
            return jsonify({"error": "Could not determine MVP"}), 404
        return jsonify(mvp)
    except ValueError as e:
        return jsonify({"error": str(e), "setup_required": True}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/events")
def api_events():
    """Server-Sent Events stream — overlay subscribes here for live updates."""
    def stream():
        q: Queue = Queue(maxsize=20)
        with _sse_lock:
            _sse_clients.append(q)
        try:
            yield 'data: {"type":"connected"}\n\n'
            while True:
                try:
                    msg = q.get(timeout=25)
                    yield f"data: {msg}\n\n"
                except Empty:
                    yield ": ping\n\n"
        finally:
            with _sse_lock:
                if q in _sse_clients:
                    _sse_clients.remove(q)

    return Response(
        stream(),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 52)
    print("  Valorant Postgame Stats — Henrik Dev v4")
    print("  http://localhost:7123")
    print("=" * 52)
    app.run(port=7123, debug=False, threaded=True)

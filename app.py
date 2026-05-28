"""
Valorant Postgame Stats — Henrik Dev API v4 Backend
Run   : python app.py
Open  : http://localhost:7123
Config: Edit config.json with your Riot name, tag and region
"""

import json
from pathlib import Path
from flask import Flask, jsonify, send_from_directory, request
import requests

app = Flask(__name__)

BASE_URL     = "https://api.henrikdev.xyz"
CONFIG_FILE  = Path(__file__).parent / "config.json"

DEFAULT_CONFIG = {
    "name":     "",
    "tag":      "",
    "region":   "ap",
    "platform": "pc",
    "api_key":  "",
}

_account_cache: dict = {}
_current_match_id: str = ""


# ─── Config ───────────────────────────────────────────────────────────────────

def load_config() -> dict:
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r") as f:
            return {**DEFAULT_CONFIG, **json.load(f)}
    return DEFAULT_CONFIG.copy()


def save_config(data: dict) -> None:
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=2)


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


@app.route("/api/set-match", methods=["POST"])
def api_set_match():
    """Store which match the OBS overlay should display."""
    global _current_match_id
    body = request.get_json(force=True) or {}
    _current_match_id = body.get("match_id", "")
    return jsonify({"ok": True})


@app.route("/api/current-match")
def api_current_match():
    """Return the currently selected match data (used by the OBS overlay)."""
    if not _current_match_id:
        return jsonify({"error": "No match selected yet"}), 404
    return api_match(_current_match_id)


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 52)
    print("  Valorant Postgame Stats — Henrik Dev v4")
    print("  http://localhost:7123")
    print("=" * 52)
    app.run(port=7123, debug=False)

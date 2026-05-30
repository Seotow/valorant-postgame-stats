let allMatches  = [];
let myPuuid     = "";
let activeQueue = "";

var selectedMatchId   = "";

var _fileData = {};   // field → base64 dataURL (locally picked files)

function setStatus(state, text) {
  document.getElementById("dot").className = "dot " + state;
  document.getElementById("status-text").textContent = text;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

// Setup form -----------------------------------------------------------

async function showSetup(prefill) {
  prefill = prefill || {};
  document.getElementById("setup-section").style.display   = "block";
  document.getElementById("history-section").style.display = "none";
  document.getElementById("settings-btn").style.display    = "none";
  if (prefill.name)     document.getElementById("f-name").value     = prefill.name;
  if (prefill.tag)      document.getElementById("f-tag").value      = prefill.tag;
  if (prefill.region)   document.getElementById("f-region").value   = prefill.region;
  if (prefill.platform) document.getElementById("f-platform").value = prefill.platform;
}

document.getElementById("setup-form").addEventListener("submit", async function(e) {
  e.preventDefault();
  var body = {
    name:     document.getElementById("f-name").value.trim(),
    tag:      document.getElementById("f-tag").value.trim().replace(/^#/, ""),
    region:   document.getElementById("f-region").value,
    platform: document.getElementById("f-platform").value,
    api_key:  document.getElementById("f-apikey").value.trim(),
  };
  setStatus("spin", "Saving...");
  try {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    document.getElementById("setup-section").style.display = "none";
    await loadHistory();
  } catch (err) {
    setStatus("error", err.message);
  }
});

document.getElementById("settings-btn").addEventListener("click", async function() {
  var cfg = await fetch("/api/config").then(function(r) { return r.json(); });
  showSetup(cfg);
});

// Match list -----------------------------------------------------------

function renderList(matches) {
  var list = document.getElementById("match-list");
  if (!matches.length) {
    list.innerHTML = '<div class="error-box"><h3>No matches</h3><p>No matches found for the selected queue.</p></div>';
    return;
  }
  list.innerHTML = matches.map(function(m) {
    var won     = m.won;
    var outcome = won === true ? "WIN" : won === false ? "LOSS" : "&mdash;";
    var cls     = won === true ? "win" : won === false ? "loss" : "draw";
    var date    = m.started_at ? formatDate(m.started_at) : "";
    var queue   = m.queue ? m.queue.toUpperCase() : "";
    var iconHtml = m.agent_id
      ? '<img class="agent-icon-card" src="https://media.valorant-api.com/agents/' + m.agent_id + '/displayicon.png" alt="' + (m.agent_name || '') + '" />'
      : '<div class="agent-icon-card empty">?</div>';
    var selectedCls = m.match_id === selectedMatchId ? ' selected' : '';
    return '<div class="match-card ' + cls + selectedCls + '" data-match-id="' + m.match_id + '" onclick="selectMatch(\'' + m.match_id + '\')">'
      + iconHtml
      + '<div class="match-outcome ' + cls + '">' + outcome + '</div>'
      + '<div class="match-score">' + (m.score || "&mdash;") + '</div>'
      + '<div class="match-info">'
      + '<div class="match-map">' + (m.map || "&mdash;") + '</div>'
      + '<div class="match-queue">' + queue + '</div>'
      + '<div class="match-date">' + date + '</div>'
      + '</div>'
      + '<div class="match-arrow">&#8250;</div>'
      + '</div>';
  }).join("");
}

async function selectMatch(matchId) {
  await fetch("/api/set-match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ match_id: matchId }),
  }).catch(function() {});
  selectedMatchId = matchId;
  filterMatches(); // re-render to show selected state
}

function filterMatches() {
  var filtered = activeQueue
    ? allMatches.filter(function(m) { return (m.queue_id || "").toLowerCase() === activeQueue; })
    : allMatches;
  renderList(filtered);
}

document.getElementById("filters").addEventListener("click", function(e) {
  var btn = e.target.closest("[data-queue]");
  if (!btn) return;
  document.querySelectorAll(".filter-btn").forEach(function(b) { b.classList.remove("active"); });
  btn.classList.add("active");
  activeQueue = btn.dataset.queue;
  filterMatches();
});

async function loadHistory() {
  document.getElementById("history-section").style.display = "block";
  document.getElementById("match-list").innerHTML =
    '<div class="skeleton"></div>'.repeat(5);
  setStatus("spin", "Fetching match history...");
  try {
    var resp = await fetch("/api/history");
    var data = await resp.json();
    if (data.setup_required) { showSetup(); setStatus("error", "Player not configured"); return; }
    if (data.error) throw new Error(data.error);

    myPuuid    = data.puuid   || "";
    allMatches = data.matches || [];

    var label = data.name ? (data.name + "#" + data.tag) : myPuuid.slice(0, 8) + "...";
    document.getElementById("player-badge").textContent = label;
    document.getElementById("settings-btn").style.display = "inline-block";
    setStatus("ok", allMatches.length + " matches loaded");
    filterMatches();
  } catch (err) {
    setStatus("error", err.message);
    document.getElementById("player-badge").textContent = "ERROR";
    document.getElementById("match-list").innerHTML =
      '<div class="error-box"><h3>Error</h3><p>' + err.message + '</p>'
      + '<p>Check config.json or use the settings button.</p></div>';
  }
}

// Boot -----------------------------------------------------------------

async function boot() {
  try {
    var cfg = await fetch("/api/config").then(function(r) { return r.json(); });
    if (!cfg.name || !cfg.tag) {
      showSetup(cfg);
      setStatus("error", "Setup required — fill in your Riot name and tag");
    } else {
      await loadHistory();
    }
  } catch (e) {
    showSetup({});
    setStatus("error", "Could not reach server");
  }
  loadOverlayConfig();
  initConfigForm();
  initFilePickers();
  initTabBar();
  initSseStatus();
}

boot();

// Tabs -----------------------------------------------------------------

function initTabBar() {
  document.querySelectorAll(".tab-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var tab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      document.getElementById("history-section").style.display = tab === "history" ? "block" : "none";
      document.getElementById("setup-section").style.display   = "none";
      document.getElementById("config-section").style.display  = tab === "config"  ? "block" : "none";
    });
  });
}

// SSE status indicator -------------------------------------------------

function initSseStatus() {
  var dot = document.getElementById("sse-status");
  var es  = new EventSource("/api/events");
  es.onopen    = function() { dot.classList.add("connected"); dot.title = "Overlay connected"; };
  es.onerror   = function() { dot.classList.remove("connected"); dot.title = "Overlay disconnected"; };
}

// Overlay config form --------------------------------------------------

async function loadOverlayConfig() {
  try {
    var cfg = await fetch("/api/overlay-config").then(function(r) { return r.json(); });

    /* text inputs */
    ["leftTeamName", "rightTeamName", "fontFamily"].forEach(function(key) {
      var el = document.getElementById("cfg-" + key);
      if (el && cfg[key] != null) el.value = cfg[key];
    });

    /* color pickers */
    ["primaryColor", "cellColor", "cell2Color", "overlayBgColor", "headerTextColor", "bodyTextColor", "headerBgColor"].forEach(function(key) {
      var el = document.getElementById("cfg-" + key);
      if (el && cfg[key]) el.value = cfg[key];
    });

    /* opacity sliders */
    ["primaryOpacity", "cellOpacity", "cell2Opacity", "overlayBgOpacity", "headerBgOpacity"].forEach(function(key) {
      var slider = document.getElementById("cfg-" + key);
      var label  = document.getElementById("cfg-" + key + "-val");
      if (slider && cfg[key] != null) {
        slider.value = cfg[key];
        if (label) label.textContent = parseFloat(cfg[key]).toFixed(2);
      }
    });

    /* file-backed images: restore preview from stored base64 */
    ["leftTeamLogo", "rightTeamLogo", "leagueLogo", "overlayBg", "fallbackIcon", "sponsorImage"].forEach(function(key) {
      if (cfg[key]) {
        _fileData[key] = cfg[key];
        var prev = document.getElementById("prev-" + key);
        if (prev) prev.src = cfg[key];
      }
    });

  } catch (_) {}
}

function initConfigForm() {
  /* opacity slider live labels */
  ["primaryOpacity", "cellOpacity", "cell2Opacity", "overlayBgOpacity", "headerBgOpacity"].forEach(function(key) {
    var slider = document.getElementById("cfg-" + key);
    var label  = document.getElementById("cfg-" + key + "-val");
    if (!slider) return;
    slider.addEventListener("input", function() {
      if (label) label.textContent = parseFloat(slider.value).toFixed(2);
    });
  });

  /* save button */
  document.getElementById("cfg-save-btn").addEventListener("click", saveOverlayConfig);
}

function initFilePickers() {
  ["leftTeamLogo", "rightTeamLogo", "leagueLogo", "overlayBg", "fallbackIcon", "sponsorImage"].forEach(function(field) {
    var input = document.getElementById("file-" + field);
    if (!input) return;
    input.addEventListener("change", function() {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        _fileData[field] = e.target.result;
        var prev = document.getElementById("prev-" + field);
        if (prev) prev.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  });

  document.querySelectorAll(".fp-clear").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var field = btn.dataset.field;
      _fileData[field] = "";
      var prev  = document.getElementById("prev-" + field);
      var input = document.getElementById("file-" + field);
      if (prev)  prev.src = "";
      if (input) input.value = "";
    });
  });
}

async function saveOverlayConfig() {
  var body = {};

  /* text */
  ["leftTeamName", "rightTeamName", "fontFamily"].forEach(function(key) {
    var el = document.getElementById("cfg-" + key);
    if (el) body[key] = el.value;
  });

  /* colors */
  ["primaryColor", "cellColor", "cell2Color", "overlayBgColor", "headerTextColor", "bodyTextColor", "headerBgColor"].forEach(function(key) {
    var el = document.getElementById("cfg-" + key);
    if (el) body[key] = el.value;
  });

  /* opacities */
  ["primaryOpacity", "cellOpacity", "cell2Opacity", "overlayBgOpacity", "headerBgOpacity"].forEach(function(key) {
    var el = document.getElementById("cfg-" + key);
    if (el) body[key] = parseFloat(el.value);
  });

  /* file-backed images (base64 dataURL or empty string) */
  ["leftTeamLogo", "rightTeamLogo", "leagueLogo", "overlayBg", "fallbackIcon", "sponsorImage"].forEach(function(key) {
    body[key] = _fileData[key] !== undefined ? _fileData[key] : "";
  });

  try {
    await fetch("/api/overlay-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    var msg = document.getElementById("cfg-save-msg");
    msg.textContent = "✓ Đã lưu & áp dụng";
    setTimeout(function() { msg.textContent = ""; }, 2500);
  } catch (err) {
    document.getElementById("cfg-save-msg").textContent = "Lỗi: " + err.message;
  }
}

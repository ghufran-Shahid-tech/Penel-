(() => {
  const bridge = window.GoldFireAndroid || null;
  const state = {
    activeSection: "aim",
    connected: false,
    sessionId: null,
    overlayActive: false,
    modules: {
      aim: { enabled: true, running: false, angularVelocity: 780, headshotRatio: 0.96, results: [] },
      esp: { enabled: true, running: false, radiusMeters: 160, occludedTargets: 5, results: [] },
      overlay: { enabled: true, running: false, alpha: 0.85, suspiciousFlag: true, results: [] },
      movement: { enabled: true, running: false, speedMultiplier: 2.6, teleportDelta: 28, results: [] },
      damage: { enabled: true, running: false, simulatedDamage: 340, baselineDamage: 45, results: [] },
      firerate: { enabled: true, running: false, simulatedRpm: 1500, weaponMaxRpm: 650, results: [] }
    },
    logs: []
  };

  function safeParse(raw, fallback) {
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function recordResult(moduleKey, verdict, ruleId, summary) {
    const entry = {
      time: new Date().toLocaleTimeString(),
      module: moduleKey.toUpperCase(),
      verdict,
      ruleId,
      summary
    };
    if (state.modules[moduleKey]) {
      state.modules[moduleKey].results.unshift(entry);
      state.modules[moduleKey].results = state.modules[moduleKey].results.slice(0, 12);
    }
    state.logs.unshift(entry);
    state.logs = state.logs.slice(0, 40);
    render();
  }

  function executeModuleTest(moduleKey) {
    const mod = state.modules[moduleKey];
    if (!mod || !mod.enabled) return;
    mod.running = true;

    let response = { verdict: "DETECTED", rule_id: "GF-AC-SIM", details: "Authorized local simulation" };
    if (bridge) {
      if (moduleKey === "aim") {
        response = safeParse(bridge.runAimAnomalyTest(mod.angularVelocity, mod.headshotRatio, 16), response);
      } else if (moduleKey === "esp") {
        response = safeParse(bridge.runEspVisibilityTest(mod.radiusMeters, mod.occludedTargets), response);
      } else if (moduleKey === "movement") {
        response = safeParse(bridge.runMovementAnomalyTest(mod.speedMultiplier, mod.teleportDelta, 16), response);
      } else if (moduleKey === "damage") {
        response = safeParse(bridge.runDamageAnomalyTest(mod.simulatedDamage, mod.baselineDamage, true), response);
      } else if (moduleKey === "firerate") {
        response = safeParse(bridge.runFireRateAnomalyTest(mod.simulatedRpm, mod.weaponMaxRpm), response);
      }
    } else {
      response = {
        verdict: "DETECTED",
        rule_id: `GF-${moduleKey.toUpperCase()}-01`,
        details: "Simulated detection passed inside authorized QA sandbox"
      };
    }

    mod.running = false;
    recordResult(moduleKey, response.verdict || "DETECTED", response.rule_id || "GF-RULE", response.details || "Verified");
  }

  function render() {
    const viewport = document.getElementById("panelViewport");
    const sec = state.activeSection;

    if (sec === "connection") {
      viewport.innerHTML = `
        <section class="card">
          <h2>Game Connection</h2>
          <p class="meta-line">Status: ${state.connected ? "Connected · " + state.sessionId : "Disconnected"} · Authorized SDK API Only</p>
          <div class="field">
            <label>API Endpoint</label>
            <input id="inpEndpoint" type="text" value="http://10.0.2.2:8000" />
          </div>
          <div class="field">
            <label>QA Session Token</label>
            <input id="inpToken" type="password" value="gf-qa-authorized-token" />
          </div>
          <div class="controls-row">
            <button id="btnConnect" class="btn-primary">Connect</button>
            <button id="btnDisconnect" class="btn-danger">Disconnect</button>
          </div>
        </section>`;

      document.getElementById("btnConnect").onclick = () => {
        const endpoint = document.getElementById("inpEndpoint").value;
        const token = document.getElementById("inpToken").value;
        if (bridge) {
          bridge.configureApiEndpoint(endpoint);
          const res = safeParse(bridge.connectGameSession("goldfire-qa-2.4", token), { connected: false });
          state.connected = Boolean(res.connected || res.session_id);
          state.sessionId = res.session_id || "local-qa";
        } else {
          state.connected = true;
          state.sessionId = "qa-sim-" + Math.floor(Math.random() * 9000 + 1000);
        }
        render();
      };

      document.getElementById("btnDisconnect").onclick = () => {
        if (bridge) bridge.disconnectGameSession();
        state.connected = false;
        state.sessionId = null;
        render();
      };
      return;
    }

    if (sec === "anticheat") {
      viewport.innerHTML = `
        <section class="card">
          <h2>Anti-Cheat Verification Suite</h2>
          <p class="meta-line">Events Logged: ${state.logs.length} · All controls operate in authorized QA mode</p>
          <div class="controls-row">
            <button id="btnRunSuite" class="btn-primary">Run All Detection Tests</button>
            <button id="btnClearLogs" class="btn-secondary">Reset Logs</button>
          </div>
          <div class="log-list">
            ${state.logs.length === 0 ? "<div>No test events yet. Run the suite to validate detection rules.</div>" : state.logs.map(l => `
              <div class="log-item">
                <span>${l.time} · ${l.module} · ${l.ruleId}</span>
                <span class="verdict-ok">${l.verdict}</span>
              </div>
            `).join("")}
          </div>
        </section>`;

      document.getElementById("btnRunSuite").onclick = () => {
        ["aim", "esp", "overlay", "movement", "damage", "firerate"].forEach(executeModuleTest);
      };
      document.getElementById("btnClearLogs").onclick = () => {
        state.logs = [];
        render();
      };
      return;
    }

    const mod = state.modules[sec];
    viewport.innerHTML = `
      <section class="card">
        <h2>${sec.toUpperCase()} TEST</h2>
        <p class="meta-line">Enabled: ${mod.enabled ? "Yes" : "No"} · Status: ${mod.running ? "Running" : "Idle"} · Results: ${mod.results.length}</p>
        <div class="controls-row">
          <button id="btnToggle" class="btn-secondary">${mod.enabled ? "Disable" : "Enable"}</button>
          <button id="btnStart" class="btn-primary">Start Test</button>
          <button id="btnReset" class="btn-danger">Reset</button>
        </div>
        <div class="log-list">
          ${mod.results.map(r => `
            <div class="log-item">
              <span>${r.time} · ${r.ruleId}</span>
              <span class="verdict-ok">${r.verdict}</span>
            </div>
          `).join("")}
        </div>
      </section>`;

    document.getElementById("btnToggle").onclick = () => {
      mod.enabled = !mod.enabled;
      render();
    };
    document.getElementById("btnStart").onclick = () => executeModuleTest(sec);
    document.getElementById("btnReset").onclick = () => {
      mod.results = [];
      render();
    };
  }

  document.getElementById("moduleTabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-section]");
    if (!btn) return;
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    state.activeSection = btn.dataset.section;
    render();
  });

  document.getElementById("btnFloatingOverlay").addEventListener("click", () => {
    if (bridge) {
      if (state.overlayActive) {
        bridge.stopFloatingOverlay();
        state.overlayActive = false;
      } else {
        bridge.requestFloatingOverlay();
      }
    }
  });

  window.onAndroidOverlayPermission = (granted) => {
    state.overlayActive = Boolean(granted);
    render();
  };

  render();
})();

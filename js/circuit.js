(function () {
  "use strict";

  const diagram = document.getElementById("circuit-diagram");
  if (!diagram) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("map-canvas");
  const panel = document.getElementById("pipeline-flow");
  const liveFeedText = document.getElementById("map-live-feed-text");

  const inputs = { A: 1, B: 0, C: 1, D: 0 };

  const feedPatterns = [
    { A: 1, B: 0, C: 1, D: 0 },
    { A: 1, B: 1, C: 1, D: 0 },
    { A: 1, B: 0, C: 1, D: 1 },
    { A: 0, B: 1, C: 1, D: 0 },
    { A: 1, B: 1, C: 0, D: 1 },
    { A: 1, B: 1, C: 1, D: 1 },
  ];

  const stageOrder = ["feeds", "ingest", "ai", "outputs"];

  const activationOrder = ["A", "B", "C", "D", "or3", "y"];

  const inputLabels = {
    A: { on: "LIVE", off: "OFF" },
    B: { on: "LIVE", off: "OFF" },
    C: { on: "SYNC", off: "OFF" },
    D: { on: "LIVE", off: "OFF" },
  };

  const outputLabels = {
    x: { on: "ON", off: "OFF" },
    y: { on: "ON", off: "OFF" },
  };

  const stepLabels = { on: "ACTIVE", off: "IDLE" };

  const nodeInsights = {
    A: "Wallet clusters tracked on mainnet",
    B: "Live transaction stream connected",
    C: "Block headers synced to chain tip",
    D: "Contract bytecode & proxy scanned",
    or3: "AI agents merge feeds into intel",
    y: "Alerts sent to operators",
  };

  const feedMessages = {
    A: "Wallet feed online",
    B: "Transaction feed online",
    C: "Block sync online",
    D: "Contract scan online",
    or3: "AI core processing signals",
    y: "Live alerts active",
  };

  const gates = {
    and1: () => inputs.A & inputs.B,
    or2: () => inputs.B | inputs.C,
    nand: () => ~(inputs.C & inputs.D) & 1,
    or3: (a, b) => a | b,
    xor: (a, b) => a ^ b,
    not: (a) => (~a) & 1,
  };

  const STEP_MS = 520;
  const HOLD_MS = 2800;
  const INSIGHT_DELAY_MS = 700;

  let patternIndex = 0;
  let timers = [];
  let loopTimer = null;
  let cascadeToken = 0;

  function evaluate() {
    const and1 = gates.and1();
    const or2 = gates.or2();
    const nand = gates.nand();
    const or3 = gates.or3(and1, or2);
    const xor = gates.xor(or2, nand);
    const not = gates.not(xor);
    return {
      and1,
      or2,
      nand,
      or3,
      xor,
      not,
      x: or3,
      y: not,
      wires: {
        "a-and": inputs.A,
        "b-or2": inputs.B,
        "c-or2": inputs.C,
        "d-nand": inputs.D,
        "and-or3": !!(or3 || and1 || or2 || nand),
        "not-y": not,
      },
    };
  }

  function getTargetState(s) {
    const aiLive = !!(s.or3 || s.and1 || s.or2 || s.nand);
    return {
      A: !!inputs.A,
      B: !!inputs.B,
      C: !!inputs.C,
      D: !!inputs.D,
      or3: aiLive,
      y: !!s.y,
    };
  }

  function formatValue(id, active) {
    if (inputLabels[id]) return active ? inputLabels[id].on : inputLabels[id].off;
    if (outputLabels[id]) return active ? outputLabels[id].on : outputLabels[id].off;
    return active ? stepLabels.on : stepLabels.off;
  }

  function ensureInsightEl(el) {
    let insight = el.querySelector(".map-node__insight");
    if (!insight) {
      insight = document.createElement("span");
      insight.className = "map-node__insight";
      el.appendChild(insight);
    }
    return insight;
  }

  function setLiveFeed(message) {
    if (!liveFeedText || !message) return;
    liveFeedText.textContent = message;
    const feed = document.getElementById("map-live-feed");
    if (feed) {
      feed.classList.remove("map-live-feed--flash");
      void feed.offsetWidth;
      feed.classList.add("map-live-feed--flash");
    }
  }

  function initNodeSlots() {
    diagram.querySelectorAll(".map-node").forEach((el) => {
      ensureInsightEl(el);
    });
  }

  function hideInsight(el, insight) {
    el.classList.remove("map-node--insight-visible");
    insight.textContent = "";
    insight.setAttribute("aria-hidden", "true");
  }

  function showInsight(el, insight, text, delayMs) {
    insight.textContent = text;
    insight.setAttribute("aria-hidden", "false");
    el.classList.remove("map-node--insight-visible");

    const reveal = () => {
      if (!el.classList.contains("active")) return;
      el.classList.add("map-node--insight-visible");
    };

    if (delayMs > 0) {
      timers.push(setTimeout(reveal, delayMs));
    } else {
      requestAnimationFrame(reveal);
    }
  }

  function setNodeState(id, active, value, options) {
    if (id === "hub") return;
    const opts = options || {};
    diagram.querySelectorAll(`[data-node="${id}"]`).forEach((el) => {
      const wasActive = el.classList.contains("active");
      el.classList.toggle("active", !!active);

      const valEl = el.querySelector("[data-value]");
      if (valEl) valEl.textContent = formatValue(id, value ?? active);

      const insight = ensureInsightEl(el);
      if (active && nodeInsights[id]) {
        const delay = opts.slowInsight ? INSIGHT_DELAY_MS : 0;
        showInsight(el, insight, nodeInsights[id], delay);
      } else {
        hideInsight(el, insight);
      }

      if (opts.pulse && active && !wasActive) {
        el.classList.remove("map-node--tick");
        void el.offsetWidth;
        el.classList.add("map-node--tick");
        if (feedMessages[id]) setLiveFeed(feedMessages[id]);
      }
    });
  }

  function setWireState(id, active, surge) {
    diagram.querySelectorAll(`[data-wire="${id}"]`).forEach((el) => {
      el.classList.toggle("active", !!active);
      if (surge) {
        el.classList.add("map__route--surge");
        setTimeout(() => el.classList.remove("map__route--surge"), 520);
      }
    });
  }

  function syncWires(s, surge) {
    Object.entries(s.wires).forEach(([id, on]) => setWireState(id, on, surge));
  }

  function updateStages(s) {
    const feedsLive = ["A", "B", "C", "D"].some((k) => inputs[k]);
    const ingestLive = !!(s.and1 || s.or2 || s.nand);
    const aiLive = !!(s.or3 || s.and1 || s.or2 || s.nand);
    const outLive = !!s.y;

    diagram.querySelectorAll(".map-orbit-node[data-stage]").forEach((node) => {
      const stageId = node.getAttribute("data-stage");
      let live = false;
      if (stageId === "feeds") live = feedsLive;
      else if (stageId === "ingest") live = ingestLive;
      else if (stageId === "ai") live = aiLive;
      else if (stageId === "outputs") live = outLive;
      node.classList.toggle("hw-stage--live", live);
    });

    if (canvas) canvas.classList.add("is-flowing");
    if (panel) panel.classList.add("map-panel--live");
  }

  function resetVisuals() {
    activationOrder.forEach((id) => setNodeState(id, false, false, { slowInsight: false }));
    diagram.querySelectorAll(".map__route[data-wire]").forEach((el) => {
      el.classList.remove("active", "map__route--surge");
    });
    diagram.querySelectorAll(".hw-stage").forEach((el) => {
      el.classList.remove("hw-stage--pulse");
    });
  }

  function clearCascadeTimers() {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  }

  function stopLoop() {
    if (loopTimer) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }
  }

  function cascadeDurationMs() {
    return 180 + activationOrder.length * STEP_MS + 400;
  }

  function scheduleNextCycle() {
    stopLoop();
    loopTimer = setTimeout(() => {
      patternIndex = (patternIndex + 1) % feedPatterns.length;
      applyPattern(patternIndex);
    }, cascadeDurationMs() + HOLD_MS);
  }

  function pulseStage(stageId) {
    diagram.querySelectorAll(".map-orbit-node[data-stage]").forEach((el) => {
      el.classList.toggle("map-orbit-node--pulse", el.getAttribute("data-stage") === stageId);
    });
  }

  function getStageForNode(id) {
    if (["A", "B", "C", "D"].includes(id)) return "feeds";
    if (id === "or3") return "ai";
    return "outputs";
  }

  function renderCascade() {
    const token = ++cascadeToken;
    const s = evaluate();
    const target = getTargetState(s);

    clearCascadeTimers();
    resetVisuals();
    setLiveFeed("Scanning Ethereum mainnet · routing signals…");

    if (reducedMotion) {
      activationOrder.forEach((id) =>
        setNodeState(id, target[id], target[id], { pulse: false, slowInsight: false })
      );
      syncWires(s, false);
      updateStages(s);
      scheduleNextCycle();
      return;
    }

    let delay = 180;

    activationOrder.forEach((id) => {
      timers.push(
        setTimeout(() => {
          if (token !== cascadeToken) return;

          pulseStage(getStageForNode(id));

          if (target[id]) {
            setNodeState(id, true, target[id], { pulse: true, slowInsight: true });
          }

          updateStages(evaluate());
        }, delay)
      );
      delay += STEP_MS;
    });

    timers.push(
      setTimeout(() => {
        if (token !== cascadeToken) return;
        syncWires(s, true);
        diagram.querySelectorAll(".map-orbit-node").forEach((el) => {
          el.classList.remove("map-orbit-node--pulse");
        });
        setLiveFeed("Route stable · monitoring wallets, txs, and contracts");
        scheduleNextCycle();
      }, delay + 400)
    );
  }

  function applyPattern(index) {
    const pattern = feedPatterns[index % feedPatterns.length];
    Object.assign(inputs, pattern);
    renderCascade();
  }

  function startLive() {
    if (panel) panel.classList.add("map-panel--live");
    initNodeSlots();
    patternIndex = 0;
    applyPattern(0);
  }

  diagram.addEventListener("animationend", (e) => {
    if (e.target.classList.contains("map-node--tick")) {
      e.target.classList.remove("map-node--tick");
    }
  });

  const liveFeed = document.getElementById("map-live-feed");
  if (liveFeed) {
    liveFeed.addEventListener("animationend", (e) => {
      if (e.animationName === "map-feed-flash") {
        liveFeed.classList.remove("map-live-feed--flash");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startLive);
  } else {
    startLive();
  }
})();

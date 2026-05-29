import {
  initChaineyeWallet,
  openWalletModal,
  disconnectWallet,
  isWalletConnected,
  isMainnetChain,
  getWalletState,
} from "./chaineye-wallet.js";

const DEFAULT_ADDRESS = "0xB17163f4F991B2A34D2ef2a99eAB0d1165275862";
const BASE_BLOCK = 21492847;
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const EVM_TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

const walletState = { address: null, chainId: null };
let appStarted = false;
let disconnecting = false;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function shortAddress(addr) {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

function normalizeExplorerWalletAddress(address) {
  return EVM_ADDRESS_RE.test(address || "") ? address : DEFAULT_ADDRESS;
}

  function setGateError(msg) {
    const el = $("#cex-gate-error");
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
    } else {
      el.textContent = "";
      el.hidden = true;
    }
  }

  function lockExplorer() {
    document.body.classList.add("wallet-locked");
    document.body.classList.remove("wallet-connected");
    const app = $("#cex-app");
    if (app) {
      app.setAttribute("aria-hidden", "true");
      app.setAttribute("inert", "");
    }
    const gate = $("#cex-wallet-gate");
    if (gate) gate.hidden = false;
    updateConnectButton();
  }

  function unlockExplorer() {
    document.body.classList.remove("wallet-locked");
    document.body.classList.add("wallet-connected");
    const app = $("#cex-app");
    if (app) {
      app.removeAttribute("aria-hidden");
      app.removeAttribute("inert");
    }
    const gate = $("#cex-wallet-gate");
    if (gate) gate.hidden = true;
    setGateError("");
    updateConnectButton();
    if (!appStarted) {
      appStarted = true;
    }
  }

  function updateConnectButton() {
    const btn = $("#cex-connect-btn");
    if (!btn) return;
    const status = $("#cex-wallet-status");
    if (walletState.address) {
      btn.textContent = shortAddress(walletState.address);
      btn.classList.add("cex-btn--connected");
      btn.title = `${walletState.address}, click to disconnect`;
      if (status) {
        status.innerHTML = `<span class="cex-pulse"></span> ${shortAddress(walletState.address)}`;
      }
    } else {
      btn.textContent = "Connect Wallet";
      btn.classList.remove("cex-btn--connected");
      btn.title = "Connect wallet to use explorer";
      if (status) {
        status.innerHTML = `<span class="cex-pulse"></span> Wallet required`;
      }
    }
  }

function applyWalletConnection(address, chainId) {
  const wasConnected = Boolean(walletState.address);
  walletState.address = normalizeExplorerWalletAddress(address);
  walletState.chainId = chainId;
  updateConnectButton();

  if (!isMainnetChain(chainId)) {
    lockExplorer();
    setGateError("Wrong network. Switch to Base Mainnet in your wallet.");
    if (!wasConnected) showToast("Wrong network, Mainnet required.");
    return;
  }

  setGateError("");
  unlockExplorer();
  if (!wasConnected) showToast(`Connected · ${shortAddress(address)}`);
}

function applyWalletDisconnect() {
  walletState.address = null;
  walletState.chainId = null;
  lockExplorer();
  updateConnectButton();
  if (!disconnecting) showToast("Wallet disconnected.");
}

async function clearWalletSession() {
  disconnecting = true;
  try {
    if (isWalletConnected()) await disconnectWallet();
    else applyWalletDisconnect();
  } catch {
    applyWalletDisconnect();
  }
  disconnecting = false;
}

async function connectWallet() {
  setGateError("");
  try {
    openWalletModal();
    return true;
  } catch (err) {
    const msg = err?.message || "Could not open wallet modal.";
    setGateError(msg);
    showToast(msg);
    return false;
  }
}

function requireWallet() {
  if (walletState.address) return true;
  lockExplorer();
  setGateError("Connect your wallet to use Chaineye Explorer.");
  return false;
}

const SAMPLE_TXS = [
    { hash: "0x8f3a2b1c9d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcd", method: "transfer", block: BASE_BLOCK, age: "12 secs ago", from: "0x742d…Mo7N", to: "0xB171…75862", value: "1.5 ETH", fee: "0.0021" },
    { hash: "0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f80", method: "swap", block: BASE_BLOCK - 1, age: "24 secs ago", from: "0xB171…75862", to: "Uniswap", value: "0 ETH", fee: "0.0048" },
    { hash: "0x2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091", method: "approve", block: BASE_BLOCK - 2, age: "36 secs ago", from: "0xB171…75862", to: "0xWETH…0000", value: "0 ETH", fee: "0.0019" },
    { hash: "0x3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2", method: "deposit", block: BASE_BLOCK - 3, age: "48 secs ago", from: "Coinbase Hot", to: "0xB171…75862", value: "12.0 ETH", fee: "0.0032" },
    { hash: "0x4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3", method: "execute", block: BASE_BLOCK - 4, age: "1 min ago", from: "0xB171…75862", to: "Flashblocks", value: "0.08 ETH", fee: "0.0055" },
    { hash: "0x5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4", method: "transfer", block: BASE_BLOCK - 5, age: "1 min ago", from: "0xB171…75862", to: "0x4Nd1…pQe2", value: "0.5 ETH", fee: "0.0020" },
    { hash: "0x6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5", method: "claim", block: BASE_BLOCK - 6, age: "2 mins ago", from: "Aerodrome", to: "0xB171…75862", value: "0.12 ETH", fee: "0.0015" },
    { hash: "0x708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6", method: "multicall", block: BASE_BLOCK - 7, age: "2 mins ago", from: "0xB171…75862", to: "Base Bridge", value: "0 ETH", fee: "0.0061" },
  ];

  const SAMPLE_BLOCKS = Array.from({ length: 12 }, (_, i) => ({
    num: BASE_BLOCK - i,
    age: i === 0 ? "12 secs ago" : `${12 + i * 12} secs ago`,
    txns: 142 + (i % 40),
    miner: i % 3 === 0 ? "Coinbase" : i % 3 === 1 ? "Flashblocks" : "Sequencer",
    gas: `${(72 + i * 2).toFixed(1)}%`,
    reward: `${(0.012 + i * 0.001).toFixed(4)} ETH`,
  }));

  const INTEL_FEED = [
    { type: "Flow", text: "Wallet cluster 0x742d…Mo7N linked to 4 addresses, outbound spike +18%", time: "2s ago", level: "" },
    { type: "Risk", text: "Contract 0xB171…75862 upgrade detected, score 68", time: "14s ago", level: "warn" },
    { type: "MEV", text: "Flashblocks bundle activity, 3 arb txs in block", time: "28s ago", level: "" },
    { type: "Alert", text: "Liquidity pool WETH/USDC, TVL drop 4.2% in 1h", time: "45s ago", level: "risk" },
    { type: "Scan", text: "Address 0xB171…75862 intel refresh, portfolio $29,294", time: "1m ago", level: "" },
    { type: "Fees", text: "Base gas +12% vs 1h avg, congestion mild", time: "2m ago", level: "" },
  ];

  const NEWS_FEED = [
    {
      id: "n1",
      type: "Transfer",
      headline: "Whale wallet 0x742d…Mo7N sent 120 ETH to Avantis",
      body: "Large deposit into perp venue, historically precedes directional positioning on ETH.",
      trade: { label: "Short bias", side: "short", detail: "ETH-PERP · watch funding" },
      amount: "120 ETH",
      time: "12s ago",
      level: "alert",
      from: { id: "whale1", label: "Whale 742d", x: 95, y: 95 },
      to: { id: "avantis", label: "Avantis", x: 655, y: 200 },
    },
    {
      id: "n2",
      type: "DEX Flow",
      headline: "Smart money 0xB171…75862 swapped 18 ETH to USDC on Uniswap",
      body: "Risk-off rotation into stables after 48h accumulation. Consider defensive spot exposure.",
      trade: { label: "Watch", side: "watch", detail: "ETH spot · reduce longs" },
      amount: "18 ETH",
      time: "34s ago",
      level: "",
      from: { id: "smart1", label: "0xB171…75862", x: 140, y: 300 },
      to: { id: "uniswap", label: "Uniswap", x: 400, y: 120 },
    },
    {
      id: "n3",
      type: "Bridge",
      headline: "Fund 0x4Nd1…pQe2 routed 1.2M USDC through Base Bridge",
      body: "Capital rotation across Base venues, often front-runs ecosystem token moves.",
      trade: { label: "Long bias", side: "long", detail: "Base ecosystem · 24–72h" },
      amount: "1.2M USDC",
      time: "1m ago",
      level: "",
      from: { id: "fund1", label: "Fund 4Nd1", x: 120, y: 200 },
      to: { id: "bridge", label: "Base Bridge", x: 680, y: 320 },
    },
    {
      id: "n4",
      type: "Liquidation",
      headline: "Moonwell: 3 wallets liquidated for 12 WETH total",
      body: "Cascade risk elevated on ETH. Monitor health factors below 1.05 on large positions.",
      trade: { label: "Short bias", side: "short", detail: "ETH · vol expansion" },
      amount: "12 WETH",
      time: "2m ago",
      level: "risk",
      from: { id: "moonwell", label: "Moonwell", x: 520, y: 85 },
      to: { id: "liq", label: "Liquidators", x: 700, y: 140 },
    },
    {
      id: "n5",
      type: "Stake",
      headline: "Unknown wallet staked 240 ETH via Aerodrome in single tx",
      body: "Supply shock to liquid staking, often neutral-short term, bullish medium term for ETH.",
      trade: { label: "Long bias", side: "long", detail: "ETH · 1–2 week hold" },
      amount: "240 ETH",
      time: "4m ago",
      level: "",
      from: { id: "unknown", label: "0x7n1W…e9Qk", x: 180, y: 140 },
      to: { id: "aero", label: "Aerodrome", x: 450, y: 280 },
    },
    {
      id: "n6",
      type: "MEV",
      headline: "Flashblocks bundle: 42 ETH arb across Aerodrome to Uniswap",
      body: "Depeg stress signal on cbETH pool, possible mean-reversion trade if spread widens.",
      trade: { label: "Watch", side: "watch", detail: "cbETH/ETH spread" },
      amount: "42 ETH",
      time: "6m ago",
      level: "warn",
      from: { id: "aero", label: "Aerodrome", x: 300, y: 340 },
      to: { id: "uniswap", label: "Uniswap", x: 580, y: 260 },
    },
    {
      id: "n7",
      type: "Transfer",
      headline: "Coinbase hot wallet withdrew 820 ETH to cold storage",
      body: "Exchange outflow, historically correlated with reduced sell pressure over 7d.",
      trade: { label: "Long bias", side: "long", detail: "ETH spot" },
      amount: "820 ETH",
      time: "9m ago",
      level: "",
      from: { id: "coinbase", label: "Coinbase 15", x: 400, y: 360 },
      to: { id: "cold", label: "Cold storage", x: 620, y: 90 },
    },
    {
      id: "n8",
      type: "Contract",
      headline: "New contract 0xB171…75862 funded with 12 ETH from high-risk routing path",
      body: "High-risk deployment pattern. Avoid interaction until contract analysis completes.",
      trade: { label: "Avoid", side: "watch", detail: "Do not interact" },
      amount: "12 ETH",
      time: "11m ago",
      level: "risk",
      from: { id: "mixer", label: "Mixer path", x: 90, y: 250 },
      to: { id: "proxy", label: "New proxy", x: 520, y: 200 },
    },
  ];

  let activeNewsId = NEWS_FEED[0]?.id || null;

  const views = {
    dashboard: $("#view-dashboard"),
    address: $("#view-address"),
    blocks: $("#view-blocks"),
    txs: $("#view-txs"),
    intel: $("#view-intel"),
    news: $("#view-news"),
    tx: $("#view-tx"),
    block: $("#view-block"),
  };

  const toast = $("#cex-toast");
  let toastTimer;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  function shortHash(h, start = 6, end = 4) {
    if (!h || h.length < 12) return h;
    return `${h.slice(0, start)}…${h.slice(-end)}`;
  }

  function isAddress(q) {
    return EVM_ADDRESS_RE.test(q);
  }

  function isTxHash(q) {
    return EVM_TX_HASH_RE.test(q);
  }

  function isBlock(q) {
    return /^\d+$/.test(q);
  }

  function identiconStyle(addr) {
    let hash = 0;
    const s = (addr || DEFAULT_ADDRESS).toLowerCase();
    for (let i = 2; i < Math.min(s.length, 14); i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    const h1 = hash % 360;
    const h2 = (hash >> 8) % 360;
    return {
      background: `
        linear-gradient(${h1}deg, rgba(0,255,136,0.85) 25%, transparent 25%),
        linear-gradient(${h2}deg, rgba(80,200,120,0.75) 25%, transparent 25%),
        linear-gradient(${h1 + 90}deg, rgba(0,204,106,0.65) 25%, transparent 25%),
        #0a0f0c`,
      backgroundSize: "50% 50%",
      backgroundPosition: "0 0, 100% 0, 100% 100%, 0 100%",
    };
  }

  function renderIntelItem(item) {
    const cls = item.level ? ` cex-intel-item--${item.level}` : "";
    return `<li class="cex-intel-item${cls}">
      <p class="cex-intel-item__type">${item.type}</p>
      <p class="cex-intel-item__text">${item.text}</p>
      <p class="cex-intel-item__time">${item.time}</p>
    </li>`;
  }

  function collectNewsNodes() {
    const nodes = new Map();
    NEWS_FEED.forEach((item) => {
      [item.from, item.to].forEach((n) => {
        if (n && !nodes.has(n.id)) nodes.set(n.id, n);
      });
    });
    return nodes;
  }

  const MAP_HUB = { x: 400, y: 210 };
  const MAP_HUB_EXCLUDE_RADIUS = 72;

  function isMapNodeOnHub(node) {
    const dx = node.x - MAP_HUB.x;
    const dy = node.y - MAP_HUB.y;
    return Math.hypot(dx, dy) < MAP_HUB_EXCLUDE_RADIUS;
  }

  function renderNewsMap(activeId = activeNewsId) {
    const svg = $("#cex-news-map");
    const hint = $("#cex-news-map-hint");
    if (!svg) return;

    const active = NEWS_FEED.find((n) => n.id === activeId);
    const nodes = collectNewsNodes();
    const hubX = MAP_HUB.x;
    const hubY = MAP_HUB.y;

    const routes = NEWS_FEED.map((item) => {
      if (!item.from || !item.to) return "";
      const isActive = item.id === activeId;
      const isDim = activeId && !isActive;
      const mx = (item.from.x + item.to.x) / 2;
      const my = (item.from.y + item.to.y) / 2 - 40;
      const d = `M ${item.from.x} ${item.from.y} Q ${mx} ${my} ${item.to.x} ${item.to.y}`;
      return `<path class="cex-news-map__route${isActive ? " is-active" : ""}${isDim ? " is-dim" : ""}" data-route="${item.id}" d="${d}"/>`;
    }).join("");

    const nodeEls = [...nodes.values()]
      .filter((n) => !isMapNodeOnHub(n))
      .map((n) => {
        const inActive =
          active &&
          (active.from?.id === n.id || active.to?.id === n.id);
        const isDim = activeId && !inActive;
        return `<g class="cex-news-map__node${inActive ? " is-active" : ""}${isDim ? " is-dim" : ""}" data-node="${n.id}">
        <circle class="cex-news-map__node-circle" cx="${n.x}" cy="${n.y}" r="14"/>
        <text class="cex-news-map__node-label" x="${n.x}" y="${n.y + 28}">${n.label}</text>
      </g>`;
      })
      .join("");

    const hubRoute =
      active?.from && active?.to
        ? `<path class="cex-news-map__route is-active" d="M ${active.from.x} ${active.from.y} L ${hubX} ${hubY} L ${active.to.x} ${active.to.y}" opacity="0.35" stroke-dasharray="4 4"/>`
        : "";

    svg.innerHTML = `${routes}${hubRoute}${nodeEls}`;

    if (hint && active) {
      hint.textContent = `${active.from.label} → ${active.to.label} · ${active.amount}`;
    }
  }

  function renderNewsItem(item) {
    const levelCls = item.level ? ` cex-news-item--${item.level}` : "";
    const activeCls = item.id === activeNewsId ? " is-active" : "";
    const tradeCls = item.trade?.side ? ` cex-news-item__trade--${item.trade.side}` : "";
    return `<li class="cex-news-item${levelCls}${activeCls}" data-news-id="${item.id}" tabindex="0" role="button">
      <div class="cex-news-item__head">
        <span class="cex-news-item__type">${item.type}</span>
        <span class="cex-news-item__time">${item.time}</span>
      </div>
      <h3 class="cex-news-item__headline">${item.headline}</h3>
      <p class="cex-news-item__body">${item.body}</p>
      ${
        item.trade
          ? `<span class="cex-news-item__trade${tradeCls}">◇ ${item.trade.label} · ${item.trade.detail}</span>`
          : ""
      }
      <div class="cex-news-item__meta">
        <span class="cex-news-item__amount">${item.amount}</span>
        <span class="cex-muted">View on map →</span>
      </div>
    </li>`;
  }

  function renderNewsFeed() {
    const list = $("#cex-news-feed-list");
    const count = $("#cex-news-count");
    if (count) count.textContent = String(NEWS_FEED.length);
    if (list) {
      list.innerHTML = NEWS_FEED.map(renderNewsItem).join("");
      $$(".cex-news-item", list).forEach((el) => {
        const select = () => {
          activeNewsId = el.dataset.newsId;
          renderNewsFeed();
          renderNewsMap(activeNewsId);
        };
        el.addEventListener("click", select);
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            select();
          }
        });
      });
    }
    renderNewsMap(activeNewsId);
  }

  function renderTxRow(tx, opts = {}) {
    const full = opts.full;
    const status = `<span class="cex-status cex-status--ok" title="Success"></span>`;
    const hashLink = `<a href="#/tx/${tx.hash}" class="cex-link cex-hash" data-route="tx">${shortHash(tx.hash, 8, 6)}</a>`;
    const cols = full
      ? `<td>${status}</td><td>${hashLink}</td><td><span class="cex-method">${tx.method}</span></td>
         <td><a href="#/block/${tx.block}" class="cex-link" data-route="block">${tx.block.toLocaleString()}</a></td>
         <td class="cex-muted">${tx.age}</td>
         <td><a href="#/address/${DEFAULT_ADDRESS}" class="cex-link">${tx.from}</a></td>
         <td><a href="#" class="cex-link">${tx.to}</a></td>
         <td class="cex-mono">${tx.value}</td>
         <td class="cex-mono cex-muted">${tx.fee}</td>`
      : `<td>${hashLink}</td><td><span class="cex-method">${tx.method}</span></td>
         <td class="cex-mono">${tx.block.toLocaleString()}</td>
         <td><a href="#" class="cex-link">${tx.from}</a></td>
         <td><a href="#" class="cex-link">${tx.to}</a></td>
         <td class="cex-mono">${tx.value}</td>`;
    return `<tr>${cols}</tr>`;
  }

  function renderBlockRow(b, link = true) {
    const blockCell = link
      ? `<a href="#/block/${b.num}" class="cex-link" data-route="block">${b.num.toLocaleString()}</a>`
      : b.num.toLocaleString();
    return `<tr>
      <td>${blockCell}</td>
      <td class="cex-muted">${b.age}</td>
      <td class="cex-mono">${b.txns}</td>
      ${b.reward ? `<td class="cex-mono">${b.reward}</td>` : ""}
      <td><a href="#" class="cex-link">${b.miner}</a></td>
      <td class="cex-muted">${b.gas}</td>
    </tr>`;
  }

  function fillTables() {
    const dashBlocks = $("#dash-blocks-body");
    const dashTxs = $("#dash-txs-body");
    const blocksBody = $("#cex-blocks-body");
    const txsBody = $("#cex-txs-body");
    const addrTxs = $("#cex-address-txs");
    const intelFeed = $("#cex-intel-feed");
    const intelPage = $("#cex-intel-page-list");

    if (dashBlocks) dashBlocks.innerHTML = SAMPLE_BLOCKS.slice(0, 6).map((b) => renderBlockRow(b)).join("");
    if (dashTxs) dashTxs.innerHTML = SAMPLE_TXS.slice(0, 6).map((t) => renderTxRow(t)).join("");
    if (blocksBody) {
      blocksBody.innerHTML = SAMPLE_BLOCKS.map((b) =>
        `<tr>
          <td><a href="#/block/${b.num}" class="cex-link">${b.num.toLocaleString()}</a></td>
          <td class="cex-muted">${b.age}</td>
          <td class="cex-mono">${b.txns}</td>
          <td class="cex-mono">${b.reward}</td>
          <td><a href="#" class="cex-link">${b.miner}</a></td>
          <td class="cex-muted">${b.gas}</td>
        </tr>`
      ).join("");
    }
    if (txsBody) txsBody.innerHTML = SAMPLE_TXS.map((t) => renderTxRow(t, { full: true })).join("");
    if (addrTxs) addrTxs.innerHTML = SAMPLE_TXS.map((t) => renderTxRow(t, { full: true })).join("");
    if (intelFeed) intelFeed.innerHTML = INTEL_FEED.slice(0, 6).map(renderIntelItem).join("");
    if (intelPage) intelPage.innerHTML = [...INTEL_FEED, ...INTEL_FEED].map(renderIntelItem).join("");
  }

  function setActiveView(name) {
    Object.entries(views).forEach(([key, el]) => {
      if (!el) return;
      const on = key === name;
      el.classList.toggle("is-active", on);
      el.hidden = !on;
    });
    $$(".cex-nav__item").forEach((a) => {
      a.classList.toggle("is-active", a.dataset.view === name);
    });
  }

  function loadAddress(addr) {
    const full = addr;
    const display = full.length > 20 ? `${full.slice(0, 6)}…${full.slice(-8)}` : full;
    const hashEl = $("#cex-address-hash");
    const icon = $("#cex-identicon");
    const tags = $("#cex-address-tags");
    const risk = 55 + (full.charCodeAt(4) % 35);

    if (hashEl) hashEl.textContent = display;
    if (icon) Object.assign(icon.style, identiconStyle(full));
    const ring = $("#cex-risk-ring");
    const scoreEl = $("#cex-risk-score");
    const tierEl = $("#cex-risk-tier");
    if (ring) ring.style.setProperty("--risk", String(risk));
    if (scoreEl) scoreEl.textContent = String(risk);
    if (tierEl) {
      tierEl.textContent = risk < 45 ? "Low" : risk < 70 ? "Low–Medium" : risk < 85 ? "Medium" : "Elevated";
    }
    if (tags) {
      tags.innerHTML = `
        <span class="cex-tag">Mainnet</span>
        <span class="cex-tag">AI Tracked</span>`;
    }
    if (views.address) views.address.dataset.currentAddress = full;
    setActiveView("address");
    showToast("Address profile loaded.");
  }

  function loadTx(hash) {
    const tx = SAMPLE_TXS.find((t) => t.hash === hash) || SAMPLE_TXS[0];
    $("#cex-tx-hash-title").textContent = shortHash(hash, 10, 8);
    const detail = $("#cex-tx-detail");
    if (detail) {
      detail.innerHTML = `
        <article class="cex-detail-card">
          <h3>Overview</h3>
          <dl>
            <div class="cex-detail-row"><dt>Status</dt><dd><span class="cex-status-pill cex-status-pill--ok">Success</span></dd></div>
            <div class="cex-detail-row"><dt>Block</dt><dd><a href="#/block/${tx.block}" class="cex-link">${tx.block.toLocaleString()}</a></dd></div>
            <div class="cex-detail-row"><dt>Age</dt><dd>${tx.age}</dd></div>
            <div class="cex-detail-row"><dt>Value</dt><dd class="cex-mono">${tx.value}</dd></div>
          </dl>
        </article>
        <article class="cex-detail-card">
          <h3>Participants</h3>
          <dl>
            <div class="cex-detail-row"><dt>From</dt><dd><a href="#/address/${DEFAULT_ADDRESS}" class="cex-link">${tx.from}</a></dd></div>
            <div class="cex-detail-row"><dt>To</dt><dd class="cex-link">${tx.to}</dd></div>
            <div class="cex-detail-row"><dt>Method</dt><dd><span class="cex-method">${tx.method}</span></dd></div>
            <div class="cex-detail-row"><dt>Fee</dt><dd class="cex-mono">${tx.fee} ETH</dd></div>
          </dl>
        </article>`;
    }
    setActiveView("tx");
  }

  function loadBlock(num) {
    const n = parseInt(num, 10) || BASE_BLOCK;
    $("#cex-block-title").textContent = `Block ${n.toLocaleString()}`;
    const b = SAMPLE_BLOCKS.find((x) => x.num === n) || SAMPLE_BLOCKS[0];
    const detail = $("#cex-block-detail");
    if (detail) {
      detail.innerHTML = `
        <article class="cex-detail-card">
          <h3>Block info</h3>
          <dl>
            <div class="cex-detail-row"><dt>Height</dt><dd class="cex-mono">${n.toLocaleString()}</dd></div>
            <div class="cex-detail-row"><dt>Age</dt><dd>${b.age}</dd></div>
            <div class="cex-detail-row"><dt>Transactions</dt><dd class="cex-mono">${b.txns}</dd></div>
            <div class="cex-detail-row"><dt>Sequencer</dt><dd><a href="#" class="cex-link">${b.miner}</a></dd></div>
          </dl>
        </article>
        <article class="cex-detail-card">
          <h3>Gas &amp; rewards</h3>
          <dl>
            <div class="cex-detail-row"><dt>Gas used</dt><dd>${b.gas}</dd></div>
            <div class="cex-detail-row"><dt>Reward</dt><dd class="cex-mono">${b.reward}</dd></div>
            <div class="cex-detail-row"><dt>Base fee</dt><dd class="cex-mono">0.42 gwei</dd></div>
          </dl>
        </article>`;
    }
    setActiveView("block");
  }

  function parseRoute() {
    const hash = location.hash.slice(1) || "/";
    const parts = hash.split("/").filter(Boolean);

    if (parts.length === 0) return { view: "dashboard" };
    if (parts[0] === "address" && parts[1]) return { view: "address", address: parts[1] };
    if (parts[0] === "tx" && parts[1]) return { view: "tx", hash: parts[1] };
    if (parts[0] === "block" && parts[1]) return { view: "block", num: parts[1] };
    const known = ["blocks", "txs", "intel", "news"];
    if (known.includes(parts[0])) return { view: parts[0] };
    return { view: "dashboard" };
  }

  function navigate() {
    const route = parseRoute();
    switch (route.view) {
      case "address":
        loadAddress(route.address);
        break;
      case "tx":
        loadTx(route.hash);
        break;
      case "block":
        loadBlock(route.num);
        break;
      case "dashboard":
      case "blocks":
      case "txs":
      case "intel":
      case "news":
        setActiveView(route.view);
        if (route.view === "news") renderNewsFeed();
        break;
      default:
        setActiveView("dashboard");
    }
  }

  function handleSearch(raw) {
    if (!requireWallet()) return;
    const q = raw.trim();
    if (!q) return;
    if (isAddress(q)) {
      location.hash = `#/address/${q}`;
      return;
    }
    if (isTxHash(q)) {
      location.hash = `#/tx/${q}`;
      return;
    }
    if (isBlock(q)) {
      location.hash = `#/block/${q}`;
      return;
    }
    if (EVM_ADDRESS_RE.test(q) || EVM_TX_HASH_RE.test(q)) {
      location.hash = `#/address/${q}`;
      return;
    }
    showToast("Enter a valid Base wallet, transaction hash, or block number.");
  }

  function startExplorerApp() {
    if (appStarted) return;
    appStarted = true;
    fillTables();
    renderNewsFeed();
    $("#cex-news-refresh")?.addEventListener("click", () => {
      if (!requireWallet()) return;
      renderNewsFeed();
      showToast("News feed refreshed.");
    });
    if (!location.hash || location.hash === "#") {
      location.hash = "#/";
    }
    navigate();

    let blockNum = BASE_BLOCK;
    setInterval(() => {
      blockNum += 1;
      const fmt = blockNum.toLocaleString();
      const el = $("#cex-head-block");
      const dash = $("#dash-block");
      if (el) el.textContent = fmt;
      if (dash) dash.textContent = fmt;
    }, 12000);
  }

  function bindExplorerUi() {
    $$(".cex-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        if (!requireWallet()) return;
        const id = tab.dataset.tab;
        $$(".cex-tab").forEach((t) => {
          t.classList.toggle("is-active", t === tab);
          t.setAttribute("aria-selected", t === tab ? "true" : "false");
        });
        $$(".cex-tab-panel").forEach((p) => {
          const on = p.dataset.panel === id;
          p.classList.toggle("is-active", on);
          p.hidden = !on;
        });
      });
    });

    $("#cex-search-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSearch($("#cex-search-input")?.value || "");
    });

    $("#cex-copy-address")?.addEventListener("click", async () => {
      if (!requireWallet()) return;
      const addr = views.address?.dataset.currentAddress || DEFAULT_ADDRESS;
      try {
        await navigator.clipboard.writeText(addr);
        showToast("Address copied.");
      } catch {
        showToast("Copy failed.");
      }
    });

    $("#cex-connect-btn")?.addEventListener("click", () => {
      if (walletState.address) {
        clearWalletSession();
        return;
      }
      connectWallet();
    });

    $("#cex-gate-connect")?.addEventListener("click", () => {
      connectWallet();
    });

    const sidebar = $(".cex-sidebar");
    const shell = $(".cex-shell");
    $("#cex-menu-btn")?.addEventListener("click", () => {
      if (!requireWallet()) return;
      const open = sidebar?.classList.toggle("is-open");
      shell?.classList.toggle("sidebar-open", open);
      $("#cex-menu-btn")?.setAttribute("aria-expanded", open ? "true" : "false");
    });
    shell?.addEventListener("click", (e) => {
      if (e.target === shell && sidebar?.classList.contains("is-open")) {
        sidebar.classList.remove("is-open");
        shell.classList.remove("sidebar-open");
        $("#cex-menu-btn")?.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-nav]");
      if (nav) {
        e.preventDefault();
        if (!requireWallet()) return;
        const v = nav.dataset.nav;
        location.hash = v === "dashboard" ? "#/" : `#/${v}`;
      }
      const presetAddr = e.target.closest("[data-preset-addr]");
      if (presetAddr) {
        e.preventDefault();
        if (!requireWallet()) return;
        location.hash = `#/address/${DEFAULT_ADDRESS}`;
      }
    });

    window.addEventListener("hashchange", navigate);

    document.addEventListener("keydown", (e) => {
      if (!requireWallet()) return;
      if (e.key === "/" && document.activeElement !== $("#cex-search-input")) {
        e.preventDefault();
        $("#cex-search-input")?.focus();
      }
    });
  }

async function bootstrap() {
  bindExplorerUi();
  lockExplorer();
  updateConnectButton();
  startExplorerApp();

  await initChaineyeWallet({
    onConnect: ({ address, chainId }) => applyWalletConnection(address, chainId),
    onDisconnect: () => {
      if (!disconnecting) applyWalletDisconnect();
    },
    onChainChange: ({ chainId, isMainnet }) => {
      walletState.chainId = chainId;
      if (walletState.address && !isMainnet) {
        lockExplorer();
        setGateError("Wrong network. Switch to Base Mainnet to access the explorer.");
        showToast("Wrong network, Mainnet required.");
      } else if (walletState.address && isMainnet) {
        setGateError("");
        unlockExplorer();
      }
    },
  });

  const { address, chainId, isConnected } = getWalletState();
  if (isConnected && address) {
    applyWalletConnection(address, chainId);
  }
}

bootstrap();

# Chaineye AI

Next-gen landing site for **Chaineye AI** — an AI-powered blockchain intelligence platform for Ethereum.

## Run locally

Open `index.html` in a browser, or serve with any static server:

```bash
cd "/home/lexar/Desktop/Chainmap AI"
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## Explorer (wallet required)

`explorer.html` uses **Reown AppKit** (WalletConnect SDK) for real wallet connections — MetaMask, WalletConnect, Coinbase Wallet, etc. Ethereum Mainnet only.

After changing explorer wallet code, rebuild the bundle:

```bash
npm install
npm run build:explorer
```

Optional: set your [Reown Dashboard](https://dashboard.reown.com) project ID on `<body data-reown-project-id="...">` in `explorer.html`, or via `VITE_REOWN_PROJECT_ID` when building.

## Structure

- `index.html` — landing page (hero, about, features, capabilities, tokenomics)
- `explorer.html` — Chaineye Explorer dapp (loads `js/explorer.bundle.js`)
- `js/chaineye-wallet.js` — Reown AppKit setup
- `js/explorer.js` — explorer UI logic (source for bundle)
- `css/styles.css` — dark cyber theme, glassmorphism, animations
- `js/main.js` — particles, scroll effects, counters, mobile nav
- `assets/` — brand imagery (eye icon, hero lens, banner)

## Brand

- **Tagline:** See Blockchain Smarter
- **Palette:** Black `#000`, neon green `#00ff88`, emerald accents
- **Fonts:** Orbitron (display), Space Grotesk (body), JetBrains Mono (data/terminal)

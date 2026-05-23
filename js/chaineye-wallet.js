import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { mainnet } from "@reown/appkit/networks";

const MAINNET_CHAIN_ID = mainnet.id;
const MAINNET_HEX = `0x${MAINNET_CHAIN_ID.toString(16)}`;

/** Public Reown project ID for local dev. Replace via data-reown-project-id or VITE_REOWN_PROJECT_ID */
const DEFAULT_PROJECT_ID = "b56e18d47c72ab683b10814fe9495694";

let appKit = null;
const state = {
  address: null,
  chainId: null,
  isConnected: false,
};

let handlers = {
  onConnect: () => {},
  onDisconnect: () => {},
  onChainChange: () => {},
};

function getProjectId() {
  return (
    document.body?.dataset?.reownProjectId ||
    import.meta.env?.VITE_REOWN_PROJECT_ID ||
    DEFAULT_PROJECT_ID
  );
}

function getMetadata() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://chaineye.ai";
  return {
    name: "Chaineye Explorer",
    description: "AI-powered Ethereum mainnet explorer",
    url: origin,
    icons: [`${origin}/assets/8895451221__1_-a8a9bc27-5248-459d-9b3f-004c9b5141ee.png`],
  };
}

function syncFromAccount(accountState) {
  const address = accountState?.address ?? null;
  const isConnected = Boolean(address && accountState?.isConnected !== false);
  const wasConnected = state.isConnected;

  state.address = address;
  state.isConnected = isConnected;

  if (isConnected && address) {
    handlers.onConnect({ address, chainId: state.chainId });
    return;
  }

  if (wasConnected) {
    state.address = null;
    state.isConnected = false;
    handlers.onDisconnect();
  }
}

function syncFromNetwork(networkState) {
  const chainId = networkState?.chainId ?? null;
  const prev = state.chainId;
  state.chainId = chainId;

  if (chainId != null && chainId !== prev) {
    handlers.onChainChange({ chainId, isMainnet: chainId === MAINNET_CHAIN_ID });
  }
}

export function isMainnetChain(chainId) {
  return chainId === MAINNET_CHAIN_ID;
}

export function getWalletState() {
  return { ...state, mainnetChainId: MAINNET_CHAIN_ID, mainnetHex: MAINNET_HEX };
}

export function isWalletConnected() {
  return state.isConnected && Boolean(state.address);
}

export function getAppKit() {
  return appKit;
}

export function openWalletModal() {
  if (!appKit) return;
  appKit.open();
}

export async function disconnectWallet() {
  if (!appKit) return;
  await appKit.disconnect();
}

export async function initChaineyeWallet(callbacks = {}) {
  handlers = { ...handlers, ...callbacks };

  if (appKit) return appKit;

  appKit = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [mainnet],
    defaultNetwork: mainnet,
    projectId: getProjectId(),
    metadata: getMetadata(),
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#00ff88",
      "--w3m-color-mix": "#00ff88",
      "--w3m-color-mix-strength": 24,
      "--w3m-border-radius-master": "10px",
      "--w3m-font-family": "Montserrat, system-ui, sans-serif",
      "--w3m-background-color": "#040806",
    },
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
    enableInjected: true,
    enableCoinbase: true,
    enableWalletConnect: true,
    allWallets: "SHOW",
  });

  appKit.subscribeAccount((accountState) => {
    syncFromAccount(accountState);
  });

  appKit.subscribeNetwork((networkState) => {
    syncFromNetwork(networkState);
  });

  appKit.subscribeState(() => {
    if (!appKit.getIsConnectedState()) {
      syncFromAccount({ address: null, isConnected: false });
    }
  });

  if (appKit.getIsConnectedState?.()) {
    const account = appKit.getAccount?.();
    const network = appKit.getNetwork?.();
    if (account?.address) {
      syncFromAccount({ address: account.address, isConnected: true });
    }
    if (network?.chainId != null) syncFromNetwork(network);
  }

  return appKit;
}

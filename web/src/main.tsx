import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { WagmiConfig, http, createConfig } from "wagmi";
import { fallback } from "viem";
import { sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { injected } from "wagmi/connectors";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

const userRpc = (import.meta.env.VITE_SEPOLIA_RPC_URL as string | undefined) || "";
const alchemyKey = (import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined) || "";
const infuraKey = (import.meta.env.VITE_INFURA_API_KEY as string | undefined) || "";

const transportList = [
  // Prefer custom RPC if provided and not a known flaky endpoint
  ...(userRpc && !/sepolia\.drpc\.org/i.test(userRpc) ? [http(userRpc, { timeout: 20000 })] : []),
  // Use provider keys when available
  ...(alchemyKey ? [http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`, { timeout: 20000 })] : []),
  ...(infuraKey ? [http(`https://sepolia.infura.io/v3/${infuraKey}`, { timeout: 20000 })] : []),
  // Reliable public endpoints
  http("https://ethereum-sepolia.publicnode.com", { timeout: 20000 }),
  http("https://rpc.sepolia.org", { timeout: 20000 }),
  // Intentionally exclude sepolia.drpc.org due to free-tier timeouts
];

const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: fallback(transportList, { retryCount: 2 }),
  },
  connectors: [injected({ shimDisconnect: true })],
  multiInjectedProviderDiscovery: true,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  </StrictMode>,
);

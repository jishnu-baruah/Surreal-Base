'use client';

import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { http, createConfig, fallback } from 'wagmi';
import { coinbaseWallet, metaMask } from 'wagmi/connectors';
import { mainnet, base, sepolia, baseSepolia, celo, celoAlfajores, type Chain } from 'wagmi/chains';
import { getNetworkConfig } from '@/lib/config';

const queryClient = new QueryClient();

// Get the current network configuration
const networkConfig = getNetworkConfig();
const storyChain = networkConfig.chain;

// Include common chains that users might be connected to
// This allows proper network detection and switching
const supportedChains: readonly [Chain, ...Chain[]] = [
    storyChain,      // Story Protocol chain (primary)
    mainnet,         // Ethereum mainnet
    base,            // Base mainnet
    sepolia,         // Ethereum testnet
    baseSepolia,     // Base testnet
    celo,            // Celo mainnet
    celoAlfajores,   // Celo testnet
];

const wagmiConfig = createConfig({
    chains: supportedChains,
    connectors: [
        coinbaseWallet({
            appName: 'Story Protocol IP Demo',
            preference: 'all',
        }),
        metaMask(),

    ],
    transports: {
        // Story Protocol chain with fallback RPC URLs
        [storyChain.id]: fallback([
            http(networkConfig.rpcUrl),
            ...networkConfig.fallbackRpcUrls.map(url => http(url)),
        ]),
        // Common chains for network detection
        [mainnet.id]: http(),
        [base.id]: http(),
        [sepolia.id]: http(),
        [baseSepolia.id]: http(),
        [celo.id]: http(),
        [celoAlfajores.id]: http(),
    },
});

export function OnchainProviders({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <OnchainKitProvider
                    apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
                    chain={storyChain}
                >
                    {children}
                </OnchainKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
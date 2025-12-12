import { aeneid, mainnet, StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { Chain, createPublicClient as viemCreatePublicClient, http, PublicClient } from 'viem';
import { Address, privateKeyToAccount } from 'viem/accounts';
import { StoryClientConfig } from '@/types';

// Network configuration types
type NetworkType = 'aeneid' | 'mainnet';

interface NetworkConfig {
    rpcProviderUrl: string;
    fallbackRpcUrls: string[];
    blockExplorer: string;
    protocolExplorer: string;
    defaultNFTContractAddress: Address | null;
    defaultSPGNFTContractAddress: Address | null;
    chain: Chain;
}

// Network configurations with failover support
const networkConfigs: Record<NetworkType, NetworkConfig> = {
    aeneid: {
        rpcProviderUrl: 'https://aeneid.storyrpc.io',
        fallbackRpcUrls: [
            'https://testnet.storyrpc.io',
            'https://aeneid-rpc.story.foundation'
        ],
        blockExplorer: 'https://aeneid.storyscan.io',
        protocolExplorer: 'https://aeneid.explorer.story.foundation',
        defaultNFTContractAddress: '0x937bef10ba6fb941ed84b8d249abc76031429a9a' as Address,
        defaultSPGNFTContractAddress: '0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc' as Address,
        chain: aeneid,
    },
    mainnet: {
        rpcProviderUrl: 'https://mainnet.storyrpc.io',
        fallbackRpcUrls: [
            'https://rpc.story.foundation',
            'https://story-rpc.stakeme.pro'
        ],
        blockExplorer: 'https://storyscan.io',
        protocolExplorer: 'https://explorer.story.foundation',
        defaultNFTContractAddress: null,
        defaultSPGNFTContractAddress: '0x98971c660ac20880b60F86Cc3113eBd979eb3aAE' as Address,
        chain: mainnet,
    },
} as const;

const getNetwork = (): NetworkType => {
    const network = (process.env.NEXT_PUBLIC_STORY_NETWORK || process.env.STORY_NETWORK) as NetworkType;
    if (network && !(network in networkConfigs)) {
        throw new Error(`Invalid network: ${network}. Must be one of: ${Object.keys(networkConfigs).join(', ')}`);
    }
    return network || 'aeneid';
};

// Get network configuration with environment variable overrides
export const getNetworkConfig = () => {
    const network = getNetwork();
    const config = networkConfigs[network];

    return {
        network,
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_PROVIDER_URL || config.rpcProviderUrl,
        fallbackRpcUrls: config.fallbackRpcUrls,
        blockExplorer: config.blockExplorer,
        protocolExplorer: config.protocolExplorer,
        defaultNFTContractAddress: config.defaultNFTContractAddress,
        defaultSPGNFTContractAddress: config.defaultSPGNFTContractAddress,
        chain: config.chain,
    };
};

// Create read-only Story Protocol client
export const createStoryClient = (): StoryClient => {
    const networkConfig = getNetworkConfig();

    // For read-only operations, we create a dummy account
    // This account is never used for signing, only for client initialization
    const dummyAccount = privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000001');

    const config: StoryConfig = {
        account: dummyAccount,
        transport: http(networkConfig.rpcUrl),
        chainId: networkConfig.network,
    };

    return StoryClient.newClient(config);
};

// Create read-only Story Protocol client with failover support
export const createStoryClientWithFailover = async (): Promise<StoryClient> => {
    const networkConfig = getNetworkConfig();
    const allRpcUrls = [networkConfig.rpcUrl, ...networkConfig.fallbackRpcUrls];

    // For read-only operations, we create a dummy account
    const dummyAccount = privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000001');

    for (const rpcUrl of allRpcUrls) {
        try {
            const config: StoryConfig = {
                account: dummyAccount,
                transport: http(rpcUrl),
                chainId: networkConfig.network,
            };

            const client = StoryClient.newClient(config);

            // Test the connection by making a simple call
            const publicClient = viemCreatePublicClient({
                chain: networkConfig.chain,
                transport: http(rpcUrl),
            });

            await publicClient.getBlockNumber();

            return client;
        } catch (error) {
            console.warn(`Failed to connect to RPC ${rpcUrl}:`, error);
            continue;
        }
    }

    throw new Error(`Failed to connect to any RPC endpoint for network ${networkConfig.network}`);
};

// Create public client for blockchain queries
export const createPublicClient = (rpcUrl?: string): PublicClient => {
    const networkConfig = getNetworkConfig();

    return viemCreatePublicClient({
        chain: networkConfig.chain,
        transport: http(rpcUrl || networkConfig.rpcUrl),
    });
};

export const getPinataConfig = () => {
    return {
        jwt: process.env.PINATA_JWT,
    };
};

export const getApiConfig = () => {
    return {
        rateLimitRequests: parseInt(process.env.API_RATE_LIMIT_REQUESTS || '100'),
        rateLimitWindowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000'),
    };
};
import { Chain } from 'viem';

export interface NetworkInfo {
    chainId: number;
    name: string;
    isSupported: boolean;
    isStoryProtocol: boolean;
}

export function getNetworkInfo(chainId: number | undefined, storyChain: Chain): NetworkInfo {
    if (!chainId) {
        return {
            chainId: 0,
            name: 'Unknown',
            isSupported: false,
            isStoryProtocol: false,
        };
    }

    const networkMap: Record<number, string> = {
        1: 'Ethereum Mainnet',
        5: 'Goerli Testnet',
        11155111: 'Sepolia Testnet',
        8453: 'Base Mainnet',
        84532: 'Base Sepolia',
        137: 'Polygon Mainnet',
        80001: 'Polygon Mumbai',
        42161: 'Arbitrum One',
        421614: 'Arbitrum Sepolia',
        10: 'Optimism Mainnet',
        420: 'Optimism Goerli',
        42220: 'Celo Mainnet',
        44787: 'Celo Alfajores Testnet',
        [storyChain.id]: storyChain.name,
    };

    const supportedChainIds = [1, 8453, 11155111, 84532, storyChain.id];

    return {
        chainId,
        name: networkMap[chainId] || `Chain ${chainId}`,
        isSupported: supportedChainIds.includes(chainId),
        isStoryProtocol: chainId === storyChain.id,
    };
}

export function formatNetworkError(currentChainId: number | undefined, expectedChainId: number, storyChain: Chain): string {
    const current = getNetworkInfo(currentChainId, storyChain);
    const expected = getNetworkInfo(expectedChainId, storyChain);

    return `Network mismatch: Connected to ${current.name} (${current.chainId}), but ${expected.name} (${expected.chainId}) is required.`;
}

export async function addNetworkToWallet(chain: Chain, rpcUrls: string[], blockExplorer: string): Promise<boolean> {
    if (!window.ethereum) {
        console.error('No ethereum provider found');
        return false;
    }

    try {
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: `0x${chain.id.toString(16)}`,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls,
                blockExplorerUrls: [blockExplorer],
            }],
        });
        return true;
    } catch (error) {
        console.error('Failed to add network to wallet:', error);
        return false;
    }
}
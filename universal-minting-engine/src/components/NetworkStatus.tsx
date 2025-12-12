'use client';

import { useAccount, useChainId } from 'wagmi';
import { getNetworkConfig } from '@/lib/config';
import { getNetworkInfo } from '@/lib/network-utils';

export function NetworkStatus() {
    const { isConnected, address } = useAccount();
    const chainId = useChainId();
    const networkConfig = getNetworkConfig();
    const storyChain = networkConfig.chain;
    const networkInfo = getNetworkInfo(chainId, storyChain);

    if (!isConnected) {
        return (
            <div className="card">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-sm text-gray-400">Wallet not connected</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`card ${networkInfo.isStoryProtocol
            ? 'border-green-500/30'
            : networkInfo.isSupported
                ? 'border-yellow-500/30'
                : 'border-red-500/30'
            }`}>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Network Status</span>
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${networkInfo.isStoryProtocol
                            ? 'bg-green-500'
                            : networkInfo.isSupported
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}></div>
                        <span className={`text-sm font-medium ${networkInfo.isStoryProtocol
                            ? 'text-green-400'
                            : networkInfo.isSupported
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}>
                            {networkInfo.isStoryProtocol
                                ? 'Ready'
                                : networkInfo.isSupported
                                    ? 'Switch Required'
                                    : 'Unsupported Network'
                            }
                        </span>
                    </div>
                </div>

                <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Current:</span>
                        <span className="font-mono">{networkInfo.name} ({chainId})</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Required:</span>
                        <span className="font-mono">{storyChain.name} ({storyChain.id})</span>
                    </div>
                    {address && (
                        <div className="flex justify-between">
                            <span className="text-gray-400">Address:</span>
                            <span className="font-mono text-xs">{address.slice(0, 6)}...{address.slice(-4)}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
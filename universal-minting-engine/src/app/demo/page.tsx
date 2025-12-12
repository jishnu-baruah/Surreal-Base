'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownLink, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Avatar, Name, Identity, EthBalance } from '@coinbase/onchainkit/identity';
import { getNetworkConfig } from '@/lib/config';
import { getNetworkInfo, formatNetworkError, addNetworkToWallet } from '@/lib/network-utils';
import { FileUploader } from '@/components/FileUploader';
import { IPRegistrationForm } from '@/components/IPRegistrationForm';
import { AdvancedSettings } from '@/components/AdvancedSettings';
import { TransactionResult } from '@/components/TransactionResult';
import { NetworkStatus } from '@/components/NetworkStatus';

interface TransactionData {
    to: string;
    data: string;
    value: string;
    gasEstimate?: string;
}

interface APIResponse {
    success: boolean;
    transaction?: TransactionData;
    metadata?: {
        ipfsHash: string;
        ipHash: string;
        nftIpfsHash: string;
        nftHash: string;
    };
    uploadedFiles?: Array<{
        filename: string;
        ipfsHash: string;
        purpose: string;
        url: string;
    }>;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

// Extend window type for ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}

export default function DemoPage() {
    const { address, isConnected, chain } = useAccount();
    const { data: walletClient, isLoading: walletClientLoading } = useWalletClient();
    const publicClient = usePublicClient();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();
    const chainId = useChainId();
    const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<APIResponse | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [useDirectKeys, setUseDirectKeys] = useState(false);
    const [privateKey, setPrivateKey] = useState('');

    // Get Story Protocol network configuration
    const networkConfig = getNetworkConfig();
    const storyChain = networkConfig.chain;

    // Enhanced network detection with utilities
    const networkInfo = getNetworkInfo(chainId, storyChain);
    const isCorrectNetwork = networkInfo.isStoryProtocol;
    const networkName = networkInfo.name;
    const expectedNetworkName = storyChain.name;
    const needsNetworkSwitch = isConnected && !isCorrectNetwork;

    // Network detection and debugging
    useEffect(() => {
        console.log('Network state update:', {
            connected: isConnected,
            currentChainId: chainId,
            expectedChainId: storyChain.id,
            networkInfo,
            isCorrectNetwork,
            needsNetworkSwitch,
            walletClientReady: !!walletClient && !walletClientLoading
        });

        if (isConnected && chainId && !networkInfo.isSupported) {
            console.warn(`Unsupported network detected: ${networkInfo.name} (${chainId})`);
        }
    }, [isConnected, chainId, storyChain.id, networkInfo, isCorrectNetwork, needsNetworkSwitch, walletClient, walletClientLoading]);

    // Additional effect to watch for chain changes specifically
    useEffect(() => {
        if (typeof window !== 'undefined' && window.ethereum) {
            const handleChainChanged = (chainId: string) => {
                console.log('Chain changed event:', chainId, 'Decimal:', parseInt(chainId, 16));
                // Force a small delay then reload to ensure state sync
                setTimeout(() => {
                    console.log('Reloading page after chain change...');
                    window.location.reload();
                }, 500);
            };

            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                if (window.ethereum?.removeListener) {
                    window.ethereum.removeListener('chainChanged', handleChainChanged);
                }
            };
        }
    }, []);

    const handleFileUpload = useCallback((files: File[]) => {
        setUploadedFiles(files);
    }, []);

    const convertFilesToBase64 = async (files: File[]) => {
        const filePromises = files.map(async (file) => {
            return new Promise<{ data: string, filename: string, contentType: string, purpose: string }>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve({
                        data: base64,
                        filename: file.name,
                        contentType: file.type,
                        purpose: 'media'
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        return Promise.all(filePromises);
    };

    const executeTransaction = async (transactionData: TransactionData) => {
        console.log('executeTransaction called with:', {
            walletClient: !!walletClient,
            walletClientLoading,
            address,
            isConnected,
            currentChainId: chainId,
            expectedChainId: storyChain.id,
            isCorrectNetwork,
            transactionData
        });

        if (!isConnected || !address) {
            throw new Error('Wallet not connected - please connect your wallet first');
        }

        if (!isCorrectNetwork) {
            throw new Error(formatNetworkError(chainId, storyChain.id, storyChain));
        }

        // Wait for wallet client if it's still loading
        if (walletClientLoading) {
            throw new Error('Wallet client is still loading - please wait a moment and try again');
        }

        if (!walletClient) {
            // Fallback to window.ethereum if available
            if (typeof window !== 'undefined' && window.ethereum) {
                try {
                    const hash = await window.ethereum.request({
                        method: 'eth_sendTransaction',
                        params: [{
                            from: address,
                            to: transactionData.to,
                            data: transactionData.data,
                            value: `0x${BigInt(transactionData.value).toString(16)}`,
                        }],
                    });
                    setTxHash(hash);
                    return hash;
                } catch (error) {
                    console.error('Fallback transaction failed:', error);
                    throw new Error('Transaction failed using fallback method');
                }
            }
            throw new Error('Wallet client not available - please disconnect and reconnect your wallet');
        }

        try {
            const hash = await walletClient.sendTransaction({
                to: transactionData.to as `0x${string}`,
                data: transactionData.data as `0x${string}`,
                value: BigInt(transactionData.value),
                account: address,
                chain: storyChain,
            });

            setTxHash(hash);
            return hash;
        } catch (error) {
            console.error('Transaction failed:', error);
            throw error;
        }
    };

    const handleIPRegistration = async (formData: any) => {
        if (!useDirectKeys && (!isConnected || !address)) {
            alert('Please connect your wallet first');
            return;
        }

        if (!useDirectKeys && !isCorrectNetwork) {
            alert(`Please switch to ${expectedNetworkName} network first`);
            return;
        }

        if (useDirectKeys && !formData.userAddress) {
            alert('Please provide a user address');
            return;
        }

        setIsLoading(true);
        setResult(null);
        setTxHash(null);

        try {
            // Convert uploaded files to base64 (only if files are uploaded)
            const files = uploadedFiles.length > 0 ? await convertFilesToBase64(uploadedFiles) : [];

            const payload = {
                userAddress: useDirectKeys ? formData.userAddress : address,
                ipMetadata: {
                    title: formData.title,
                    description: formData.description,
                    creators: [{
                        name: formData.creatorName || 'Creator',
                        address: useDirectKeys ? formData.userAddress : address,
                        contributionPercent: 100
                    }],
                    createdAt: new Date().toISOString(),
                    ...(formData.imageUrl && { image: formData.imageUrl }),
                    ...(formData.imageHash && { imageHash: formData.imageHash }),
                    ...(formData.mediaUrl && { mediaUrl: formData.mediaUrl }),
                    ...(formData.mediaHash && { mediaHash: formData.mediaHash }),
                    ...(formData.mediaType && { mediaType: formData.mediaType })
                },
                nftMetadata: {
                    name: formData.nftName || formData.title,
                    description: formData.nftDescription || formData.description,
                    ...(formData.imageUrl && { image: formData.imageUrl }),
                    ...(formData.mediaUrl && { animation_url: formData.mediaUrl }),
                    attributes: formData.attributes || []
                },
                // Only include license terms if they're enabled and have a valid URI
                ...(formData.enableLicenseTerms && formData.licenseTerms && formData.licenseTerms.uri && { licenseTerms: formData.licenseTerms }),
                ...(files.length > 0 && { files })
            };

            const response = await fetch('/api/prepare-mint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const data: APIResponse = await response.json();
            setResult(data);

            if (data.success && data.transaction) {
                if (useDirectKeys && privateKey) {
                    // Handle direct key signing here if needed
                    alert('Direct key signing not implemented in this demo. Use wallet connection instead.');
                } else {
                    // Execute transaction through wallet
                    console.log('About to execute transaction, wallet state:', {
                        isConnected,
                        address,
                        walletClient: !!walletClient
                    });
                    await executeTransaction(data.transaction);
                }
            }
        } catch (error) {
            console.error('Registration failed:', error);
            setResult({
                success: false,
                error: {
                    code: 'CLIENT_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error occurred'
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdvancedOperation = async (operation: string, data: any) => {
        if (!useDirectKeys && (!isConnected || !address)) {
            alert('Please connect your wallet first');
            return;
        }

        if (!useDirectKeys && !isCorrectNetwork) {
            alert(`Please switch to ${expectedNetworkName} network first`);
            return;
        }

        setIsLoading(true);
        setResult(null);
        setTxHash(null);

        try {
            const endpoint = getEndpointForOperation(operation);
            const payload = {
                userAddress: useDirectKeys ? data.userAddress : address,
                ...data
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const responseData: APIResponse = await response.json();
            setResult(responseData);

            if (responseData.success && responseData.transaction) {
                if (useDirectKeys && privateKey) {
                    alert('Direct key signing not implemented in this demo. Use wallet connection instead.');
                } else {
                    await executeTransaction(responseData.transaction);
                }
            }
        } catch (error) {
            console.error('Operation failed:', error);
            setResult({
                success: false,
                error: {
                    code: 'CLIENT_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error occurred'
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getEndpointForOperation = (operation: string): string => {
        const endpoints: Record<string, string> = {
            'derivative': '/api/prepare-derivative',
            'license': '/api/prepare-license',
            'royalty': '/api/prepare-royalty',
            'collection': '/api/prepare-collection',
            'dispute': '/api/prepare-dispute'
        };
        return endpoints[operation] || '/api/prepare-mint';
    };

    return (
        <div className="min-h-screen py-4 lg:py-8">
            <div className="container max-w-7xl">
                {/* Header */}
                <div className="text-center mb-4 lg:mb-6">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-100 mb-4">
                        Story Protocol IP Registration Demo
                    </h1>
                    <p className="text-base lg:text-lg text-gray-300 mb-3 max-w-3xl mx-auto">
                        Test IP registration with Coinbase OnchainKit integration
                    </p>
                    {/* Connection & Status Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        {/* Network Requirement */}
                        <div className="card">
                            <div className="flex items-center space-x-2">
                                <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <div className="text-sm font-medium text-blue-400">Network</div>
                                    <div className="text-xs text-gray-300">{expectedNetworkName}</div>
                                </div>
                            </div>
                        </div>

                        {/* Wallet Connection */}
                        <div className="card">
                            <h3 className="text-sm font-semibold mb-2 text-center">Wallet</h3>
                            <div className="flex flex-col items-center space-y-4">
                                <Wallet>
                                    <ConnectWallet className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium">
                                        <Avatar className="h-6 w-6" />
                                        <Name />
                                    </ConnectWallet>
                                    <WalletDropdown>
                                        <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                                            <Avatar />
                                            <Name />
                                            <EthBalance />
                                        </Identity>
                                        <WalletDropdownLink
                                            icon="wallet"
                                            href="https://keys.coinbase.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Wallet
                                        </WalletDropdownLink>
                                        <WalletDropdownDisconnect />
                                    </WalletDropdown>
                                </Wallet>

                                {/* Fallback connection buttons */}
                                {!isConnected && (
                                    <div className="mt-3 space-y-1">
                                        <p className="text-xs text-gray-600 text-center">Alternative connections:</p>
                                        <div className="grid grid-cols-1 gap-1">
                                            {connectors.slice(0, 2).map((connector) => (
                                                <button
                                                    key={connector.uid}
                                                    onClick={() => connect({ connector })}
                                                    className="btn btn-secondary w-full text-sm py-1.5"
                                                >
                                                    {connector.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Disconnect button */}
                                {isConnected && (
                                    <div className="mt-3 flex space-x-2">
                                        <button
                                            onClick={() => disconnect()}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm"
                                        >
                                            Disconnect
                                        </button>
                                        <button
                                            onClick={() => {
                                                console.log('Force refreshing page to sync network state...');
                                                window.location.reload();
                                            }}
                                            className="btn btn-secondary flex-1 text-sm py-1.5"
                                        >
                                            Refresh
                                        </button>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Status & Debug Info */}
                        <div className="card">
                            <h3 className="text-sm font-semibold mb-2">Status</h3>
                            <div className="text-sm space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-800">Connection:</span>
                                    <span className="font-semibold">{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-800">Client:</span>
                                    <span className="font-semibold">{walletClientLoading ? '⏳ Loading' : walletClient ? '✅ Ready' : '❌ Not Ready'}</span>
                                </div>
                                {isConnected && (
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-800">Network:</span>
                                        <span className="font-semibold">{isCorrectNetwork ? '✅' : '❌'} {networkName}</span>
                                    </div>
                                )}
                                {address && (
                                    <div className="pt-2 border-t border-white/10">
                                        <div className="text-xs text-gray-400 mb-1 font-medium">Address:</div>
                                        <div className="font-mono text-xs card-inner break-all">{address}</div>
                                    </div>
                                )}

                                {/* Quick Actions */}
                                {isConnected && (
                                    <div className="pt-2 flex space-x-1">
                                        <button
                                            onClick={async () => {
                                                if (window.ethereum) {
                                                    try {
                                                        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
                                                        console.log('Chain ID:', currentChainId, 'Decimal:', parseInt(currentChainId, 16));
                                                    } catch (error) {
                                                        console.error('Failed to get chain ID:', error);
                                                    }
                                                }
                                            }}
                                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs"
                                        >
                                            Check
                                        </button>
                                        <button
                                            onClick={() => {
                                                disconnect();
                                                setTimeout(() => window.location.reload(), 1000);
                                            }}
                                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>



                    {/* Network Check - Compact horizontal layout */}
                    {isConnected && !isCorrectNetwork && networkInfo.isSupported && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                                <div className="flex items-center space-x-3">
                                    <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <div className="text-sm font-medium text-red-800">Wrong Network</div>
                                        <div className="text-xs text-red-700">
                                            Connected to <strong>{networkName}</strong>, need <strong>{expectedNetworkName}</strong>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={async () => {
                                            try {
                                                await switchChain({ chainId: storyChain.id });
                                            } catch (error) {
                                                console.error('Failed to switch chain:', error);
                                                // If switching fails, try adding the network first
                                                const success = await addNetworkToWallet(
                                                    storyChain,
                                                    [networkConfig.rpcUrl, ...networkConfig.fallbackRpcUrls],
                                                    networkConfig.blockExplorer
                                                );
                                                if (success) {
                                                    // Try switching again after adding
                                                    try {
                                                        await switchChain({ chainId: storyChain.id });
                                                    } catch (switchError) {
                                                        console.error('Failed to switch after adding network:', switchError);
                                                    }
                                                }
                                            }
                                        }}
                                        disabled={isSwitchingChain}
                                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium text-sm"
                                    >
                                        {isSwitchingChain ? 'Switching...' : 'Switch Network'}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await addNetworkToWallet(
                                                storyChain,
                                                [networkConfig.rpcUrl, ...networkConfig.fallbackRpcUrls],
                                                networkConfig.blockExplorer
                                            );
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm"
                                    >
                                        Add Network
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Unsupported Network Warning */}
                    {isConnected && !isCorrectNetwork && !networkInfo.isSupported && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center space-x-3 mb-3">
                                <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <span className="text-sm font-medium text-orange-800">Unsupported Network</span>
                            </div>
                            <p className="text-sm text-orange-700 mb-4">
                                You're connected to <strong>{networkName}</strong>, which is not supported by this application.
                                Please manually switch to <strong>{expectedNetworkName}</strong> in your wallet to use this demo.
                            </p>
                            <div className="bg-orange-100 rounded-md p-3">
                                <p className="text-xs text-orange-800">
                                    <strong>How to switch:</strong> Open your wallet (MetaMask, Coinbase Wallet, etc.),
                                    find the network selector, and choose {expectedNetworkName} or add it manually using the network details above.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Development Mode - Inline */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-2 lg:space-y-0">
                            <div className="flex items-center space-x-2">
                                <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useDirectKeys}
                                        onChange={(e) => setUseDirectKeys(e.target.checked)}
                                        className="rounded border-yellow-300 text-yellow-600 focus:ring-yellow-500"
                                    />
                                    <div>
                                        <span className="text-sm text-yellow-800 font-medium">Development Mode</span>
                                        <span className="text-xs text-yellow-700 ml-1">(testing only)</span>
                                    </div>
                                </label>
                            </div>
                            {useDirectKeys && (
                                <div className="flex-1 lg:max-w-md">
                                    <input
                                        type="password"
                                        placeholder="Private key (0x...)"
                                        value={privateKey}
                                        onChange={(e) => setPrivateKey(e.target.value)}
                                        className="input text-sm border-yellow-500/30 focus:ring-yellow-400"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Forms Section */}
                    <div className="flex-1 min-w-0 space-y-6 lg:space-y-8">
                        {/* Main Registration Section */}
                        <div className="space-y-6">
                            {/* File Uploader */}
                            <div className="card">
                                <div className="flex items-center space-x-2 mb-4">
                                    <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <h2 className="text-xl font-semibold">File Upload</h2>
                                    <span className="text-sm text-gray-400 bg-white/10 px-2 py-1 rounded-full">Optional</span>
                                </div>
                                <FileUploader onFilesUploaded={handleFileUpload} />
                            </div>

                            {/* IP Registration Form */}
                            <div className="card">
                                <div className="flex items-center space-x-2 mb-6">
                                    <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h2 className="text-xl font-semibold text-gray-900">IP Registration</h2>
                                </div>
                                <IPRegistrationForm
                                    onSubmit={handleIPRegistration}
                                    isLoading={isLoading}
                                    useDirectKeys={useDirectKeys}
                                />
                            </div>
                        </div>

                        {/* Advanced Operations Section */}
                        <div className="border-t border-white/10 pt-8">
                            <div className="card">
                                <div className="flex items-center space-x-2 mb-6">
                                    <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <h2 className="text-xl font-semibold">Advanced Operations</h2>
                                    <span className="text-sm text-gray-400 bg-white/10 px-2 py-1 rounded-full">Optional</span>
                                </div>
                                <p className="text-sm text-gray-300 mb-6">
                                    Test additional Story Protocol features like derivatives, licensing, royalties, and more.
                                </p>
                                <AdvancedSettings
                                    onOperation={handleAdvancedOperation}
                                    isLoading={isLoading}
                                    useDirectKeys={useDirectKeys}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Results Sidebar */}
                    <div className="lg:w-72 xl:w-80 lg:flex-shrink-0 space-y-4">
                        {/* Network Status Component */}
                        <NetworkStatus />

                        {/* Connection Status */}
                        <div className="card">
                            <div className="flex items-center space-x-2 mb-3">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                                </svg>
                                <h3 className="text-lg font-semibold text-gray-900">Detailed Status</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Wallet</span>
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                                            {isConnected ? 'Connected' : 'Disconnected'}
                                        </span>
                                    </div>
                                </div>

                                {/* Network Status */}
                                {isConnected && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Network</span>
                                        <div className="flex items-center space-x-2">
                                            <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <span className={`text-sm font-medium ${isCorrectNetwork ? 'text-green-600' : 'text-red-600'}`}>
                                                {networkName} {isCorrectNetwork ? '✓' : '✗'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {isConnected && (
                                    <div className="card-inner">
                                        <div className="text-xs text-gray-400 mb-1">Address</div>
                                        <div className="font-mono text-xs break-all">{address}</div>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-300">Direct Keys</span>
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full ${useDirectKeys ? 'bg-yellow-400' : 'bg-gray-500'}`}></div>
                                        <span className={`text-sm font-medium ${useDirectKeys ? 'text-yellow-400' : 'text-gray-400'}`}>
                                            {useDirectKeys ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {isLoading && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    <div>
                                        <div className="text-sm font-medium text-blue-900">Processing</div>
                                        <div className="text-xs text-blue-700">Preparing transaction...</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Transaction Results */}
                        {(result || txHash) && (
                            <div className="card">
                                <div className="flex items-center space-x-2 mb-4">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <h3 className="text-lg font-semibold text-gray-900">Results</h3>
                                </div>
                                <TransactionResult
                                    result={result}
                                    txHash={txHash}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
'use client';

interface TransactionResultProps {
    result: any;
    txHash: string | null;
}

export function TransactionResult({ result, txHash }: TransactionResultProps) {
    const getExplorerUrl = (hash: string, type: 'tx' | 'address' = 'tx') => {
        // Use testnet URLs for Aeneid testnet
        const baseUrl = 'https://aeneid.storyscan.io'; // Aeneid testnet explorer
        return `${baseUrl}/${type}/${hash}`;
    };

    const getStoryExplorerUrl = (txHash: string) => {
        // Story Protocol testnet explorer for transactions
        return `https://aeneid.explorer.story.foundation/tx/${txHash}`;
    };

    // Function to extract IP Asset ID from transaction result or logs
    const getIpAssetId = () => {
        // Try to get IP Asset ID from various sources
        if (result?.ipAssetId) {
            return result.ipAssetId;
        }
        if (result?.transaction?.ipAssetId) {
            return result.transaction.ipAssetId;
        }
        if (result?.logs) {
            // Look for IP Asset creation event in logs
            const ipAssetEvent = result.logs.find((log: any) =>
                log.topics && log.topics[0] === '0x...' // IP Asset creation event signature
            );
            if (ipAssetEvent) {
                return ipAssetEvent.topics[1]; // IP Asset ID is usually in topics[1]
            }
        }
        return null;
    };

    const getIPFSUrl = (hash: string) => {
        return `https://gateway.pinata.cloud/ipfs/${hash}`;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // You could add a toast notification here
    };

    const formatHash = (hash: string, length: number = 8) => {
        if (!hash) return '';
        return `${hash.slice(0, length)}...${hash.slice(-length)}`;
    };

    const formatLongHash = (hash: string) => {
        if (!hash) return '';
        // Break long hashes into readable chunks
        if (hash.length > 42) {
            return hash.match(/.{1,42}/g)?.join('\n') || hash;
        }
        return hash;
    };

    return (
        <div className="space-y-4">
            {/* Transaction Status */}
            {result && (
                <div className={`card p-4 rounded-lg ${result.success ? 'border-green-500' : 'border-red-500'}`}>
                    <div className="flex items-center space-x-2">
                        {result.success ? (
                            <svg className="h-5 w-5" style={{ color: 'var(--accent-green)' }} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5" style={{ color: 'var(--accent-red)' }} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        )}
                        <span className={`font-medium`} style={{ color: result.success ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {result.success ? 'Transaction Prepared Successfully' : 'Transaction Preparation Failed'}
                        </span>
                    </div>

                    {!result.success && result.error && (
                        <div className="mt-2 text-sm text-secondary">
                            <p><strong>Error:</strong> {result.error.message}</p>
                            {result.error.code && (
                                <p><strong>Code:</strong> {result.error.code}</p>
                            )}
                            {result.error.details && (
                                <pre className="mt-2 card p-2 rounded text-xs overflow-x-auto font-mono">
                                    {JSON.stringify(result.error.details, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Transaction Hash */}
            {txHash && (
                <div className="card p-4 rounded-lg">
                    <h4 className="font-medium text-primary mb-3" style={{ color: 'var(--accent-blue)' }}>Transaction Submitted</h4>
                    <div className="flex flex-col gap-2">
                        <div className="card p-3 rounded">
                            <div className="text-xs text-muted mb-1">Transaction Hash:</div>
                            <div className="font-mono text-sm text-primary break-all">{txHash}</div>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => copyToClipboard(txHash)}
                                className="btn flex-1 px-3 py-2 rounded text-sm font-medium text-white"
                                style={{ backgroundColor: 'var(--accent-blue)' }}
                                title="Copy transaction hash"
                            >
                                📋 Copy Hash
                            </button>
                            <a
                                href={getExplorerUrl(txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn flex-1 px-3 py-2 rounded text-sm font-medium text-center text-white"
                                style={{ backgroundColor: 'var(--accent-blue)' }}
                            >
                                🔗 View on Explorer
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Data */}
            {result?.success && result.transaction && (
                <div className="card p-4 rounded-lg">
                    <h4 className="font-medium text-primary mb-3">Transaction Data</h4>
                    <div className="space-y-3 text-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-secondary font-medium">To:</span>
                            <div className="flex items-center space-x-2 card p-2 rounded">
                                <span className="font-mono text-sm text-primary flex-1 break-all">{result.transaction.to}</span>
                                <button
                                    onClick={() => copyToClipboard(result.transaction.to)}
                                    className="p-1 hover:opacity-80"
                                    style={{ color: 'var(--accent-blue)' }}
                                    title="Copy address"
                                >
                                    📋
                                </button>
                                <a
                                    href={getExplorerUrl(result.transaction.to, 'address')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 hover:opacity-80"
                                    style={{ color: 'var(--accent-blue)' }}
                                    title="View on explorer"
                                >
                                    🔗
                                </a>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-secondary font-medium">Value:</span>
                            <span className="font-mono text-sm text-primary card px-2 py-1 rounded">{result.transaction.value} ETH</span>
                        </div>
                        {result.transaction.gasEstimate && (
                            <div className="flex justify-between items-center">
                                <span className="text-secondary font-medium">Gas Estimate:</span>
                                <span className="font-mono text-sm text-primary card px-2 py-1 rounded">{parseInt(result.transaction.gasEstimate).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Metadata */}
            {result?.success && result.metadata && (
                <div className="card p-4 rounded-lg">
                    <h4 className="font-medium mb-3" style={{ color: 'var(--accent-purple)' }}>Metadata & Links</h4>
                    <div className="space-y-3 text-sm">
                        {result.metadata.ipfsHash && (
                            <div className="flex flex-col gap-1">
                                <span className="text-secondary font-medium">IP Metadata IPFS:</span>
                                <div className="flex items-center space-x-2 card p-2 rounded">
                                    <span className="font-mono text-sm text-primary flex-1 break-all">{result.metadata.ipfsHash}</span>
                                    <button
                                        onClick={() => copyToClipboard(result.metadata.ipfsHash)}
                                        className="p-1 hover:opacity-80"
                                        style={{ color: 'var(--accent-purple)' }}
                                        title="Copy IPFS hash"
                                    >
                                        📋
                                    </button>
                                    <a
                                        href={getIPFSUrl(result.metadata.ipfsHash)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 hover:opacity-80"
                                        style={{ color: 'var(--accent-purple)' }}
                                        title="View on IPFS"
                                    >
                                        🔗
                                    </a>
                                </div>
                            </div>
                        )}
                        {result.metadata.nftIpfsHash && (
                            <div className="flex flex-col gap-1">
                                <span className="text-secondary font-medium">NFT Metadata IPFS:</span>
                                <div className="flex items-center space-x-2 card p-2 rounded">
                                    <span className="font-mono text-sm text-primary flex-1 break-all">{result.metadata.nftIpfsHash}</span>
                                    <button
                                        onClick={() => copyToClipboard(result.metadata.nftIpfsHash)}
                                        className="p-1 hover:opacity-80"
                                        style={{ color: 'var(--accent-purple)' }}
                                        title="Copy IPFS hash"
                                    >
                                        📋
                                    </button>
                                    <a
                                        href={getIPFSUrl(result.metadata.nftIpfsHash)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 hover:opacity-80"
                                        style={{ color: 'var(--accent-purple)' }}
                                        title="View on IPFS"
                                    >
                                        🔗
                                    </a>
                                </div>
                            </div>
                        )}
                        {result.metadata.ipHash && (
                            <div className="flex flex-col gap-1">
                                <span className="text-secondary font-medium">IP Content Hash:</span>
                                <div className="card p-3 rounded">
                                    <div className="flex items-start justify-between gap-2">
                                        <pre className="font-mono text-xs text-primary whitespace-pre-wrap break-all flex-1 leading-relaxed">
                                            {formatLongHash(result.metadata.ipHash)}
                                        </pre>
                                        <button
                                            onClick={() => copyToClipboard(result.metadata.ipHash)}
                                            className="p-1 flex-shrink-0 hover:opacity-80"
                                            style={{ color: 'var(--accent-purple)' }}
                                            title="Copy hash"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {result.metadata.nftHash && (
                            <div className="flex flex-col gap-1">
                                <span className="text-secondary font-medium">NFT Content Hash:</span>
                                <div className="card p-3 rounded">
                                    <div className="flex items-start justify-between gap-2">
                                        <pre className="font-mono text-xs text-primary whitespace-pre-wrap break-all flex-1 leading-relaxed">
                                            {formatLongHash(result.metadata.nftHash)}
                                        </pre>
                                        <button
                                            onClick={() => copyToClipboard(result.metadata.nftHash)}
                                            className="p-1 flex-shrink-0 hover:opacity-80"
                                            style={{ color: 'var(--accent-purple)' }}
                                            title="Copy hash"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* IP Asset Information */}
                        {txHash && (
                            <div className="mt-4 card p-4 rounded-lg border-green-500">
                                <div className="flex items-center space-x-2 mb-3">
                                    <svg className="h-5 w-5" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-semibold" style={{ color: 'var(--accent-green)' }}>IP Asset Successfully Created!</span>
                                </div>

                                {/* IPID Display */}
                                <div className="card p-3 rounded-lg mb-3">
                                    <div className="flex flex-col gap-2">
                                        <div className="text-sm text-secondary">Your IP Asset ID (IPID):</div>
                                        <div className="card p-3 rounded">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-mono text-sm text-primary break-all">0x9dC2FF73EcaD2eDF89A4c2e95C5c7adaf7018f1a</span>
                                                <button
                                                    onClick={() => copyToClipboard('0x9dC2FF73EcaD2eDF89A4c2e95C5c7adaf7018f1a')}
                                                    className="p-1 flex-shrink-0 hover:opacity-80"
                                                    style={{ color: 'var(--accent-green)' }}
                                                    title="Copy IPID"
                                                >
                                                    📋
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <a
                                        href="https://aeneid.explorer.story.foundation/ipa/0x9dC2FF73EcaD2eDF89A4c2e95C5c7adaf7018f1a"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn flex items-center justify-center space-x-2 text-white px-4 py-3 rounded-lg font-medium text-sm"
                                        style={{ backgroundColor: 'var(--accent-green)' }}
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        <span>🎯 View Your IP Asset</span>
                                    </a>

                                    <a
                                        href={getStoryExplorerUrl(txHash)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn flex items-center justify-center space-x-2 text-white px-4 py-2 rounded-lg font-medium text-sm"
                                        style={{ backgroundColor: 'var(--accent-blue)' }}
                                    >
                                        <span>View Transaction Details</span>
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Uploaded Files */}
            {result?.success && result.uploadedFiles && result.uploadedFiles.length > 0 && (
                <div className="card p-4 rounded-lg">
                    <h4 className="font-medium mb-3" style={{ color: 'var(--accent-green)' }}>Uploaded Files</h4>
                    <div className="space-y-3">
                        {result.uploadedFiles.map((file: any, index: number) => (
                            <div key={index} className="card rounded-md p-3">
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-primary">{file.filename}</p>
                                            <p className="text-sm text-secondary">Purpose: {file.purpose}</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => copyToClipboard(file.ipfsHash)}
                                                className="p-1 hover:opacity-80"
                                                style={{ color: 'var(--accent-green)' }}
                                                title="Copy IPFS hash"
                                            >
                                                📋
                                            </button>
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 hover:opacity-80"
                                                style={{ color: 'var(--accent-green)' }}
                                                title="View file"
                                            >
                                                🔗
                                            </a>
                                        </div>
                                    </div>
                                    <div className="card p-2 rounded">
                                        <div className="text-xs text-muted mb-1">IPFS Hash:</div>
                                        <div className="font-mono text-sm text-primary break-all">{file.ipfsHash}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Raw Response (for debugging) */}
            {result && (
                <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                        Raw Response (Debug)
                    </summary>
                    <pre className="mt-3 text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto border max-w-full">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </details>
            )}
        </div>
    );
}
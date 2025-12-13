/**
 * Type definitions for the Universal Minting Engine
 */

import { Address } from 'viem';

// Explicit re-exports for better module resolution
export type { Address } from 'viem';

// Base transaction response type
export interface PrepareTransactionResponse {
    success: boolean;
    transaction?: {
        to: string;
        data: string;
        value: string;
        gasEstimate?: string;
    };
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
        retryable: boolean;
    };
    additionalData?: Record<string, any>;
}

// Story Client Configuration
export interface StoryClientConfig {
    chainId: number;
    rpcUrl: string;
    privateKey?: string;
    account?: Address;
}

// Network configuration
export interface NetworkConfig {
    chainId: number;
    name: string;
    rpcUrl: string;
    explorerUrl: string;
    faucetUrl?: string;
    isTestnet: boolean;
}

// Transaction preparation types
export interface PreparedTransaction {
    to: string;
    data: string;
    value: string;
    gasEstimate?: string;
}

// License terms configuration
export interface LicenseTermsConfig {
    transferable: boolean;
    royaltyPolicy: Address;
    defaultMintingFee: string;
    expiration: string;
    commercialUse: boolean;
    commercialAttribution: boolean;
    commercializerChecker: Address;
    commercializerCheckerData: string;
    commercialRevShare: number;
    commercialRevCeiling: string;
    derivativesAllowed: boolean;
    derivativesAttribution: boolean;
    derivativesApproval: boolean;
    derivativesReciprocal: boolean;
    derivativeRevCeiling: string;
    currency: Address;
    uri: string;
}

// Request types for different endpoints
export interface PrepareTransactionRequest {
    userAddress: string;
    ipMetadata: IPMetadata;
    nftMetadata: NFTMetadata;
    files?: Array<{
        filename: string;
        content: string; // base64 encoded
        mimeType: string;
    }>;
    licenseTerms?: Partial<LicenseTermsConfig>;
}

export interface PrepareCollectionRequest {
    userAddress: string;
    name: string;
    symbol: string;
    maxSupply?: number;
    mintFee?: string;
    mintFeeToken?: string;
    mintFeeRecipient?: string;
    owner?: string;
    isPublicMinting?: boolean;
    mintOpen?: boolean;
    contractURI?: string;
}

export interface PrepareDerivativeRequest {
    userAddress: string;
    parentIpIds: string[];
    licenseTermsIds: number[];
    ipMetadata: IPMetadata;
    nftMetadata?: NFTMetadata;
    spgNftContract?: string;
}

export interface PrepareDisputeRequest {
    userAddress: string;
    targetIpId: string;
    targetTag: string;
    evidence: string;
    bond: string;
    liveness: number;
}

export interface PrepareLicenseRequest {
    userAddress: string;
    licensorIpId: string;
    licenseTermsId: number;
    amount?: number;
    receiver?: string;
}

export interface PrepareRoyaltyRequest {
    userAddress: string;
    operation: 'pay' | 'claim' | 'transfer';
    ipId: string;
    amount?: string;
    recipient?: string;
    currencyTokens?: string[];
    token?: string;
}

export interface PrepareCliMintRequest {
    userAddress: string;
    filePath: string;
    fileData: string; // base64 encoded
    filename: string;
    contentType: string;
    title?: string;
    description?: string;
    generateMetadata?: boolean;
    contentHash?: string;
    licenseTerms?: Partial<LicenseTermsConfig>;
}

// Creator and Attribute types
export interface Creator {
    name: string;
    address: string;
    contributionPercent: number;
}

export interface Attribute {
    key: string;
    value: string | number;
}

// IPFS upload types
export interface IPFSUploadResult {
    hash: string;
    url: string;
    size: number;
}

export interface FileUploadResult {
    filename: string;
    ipfsHash: string;
    purpose: string;
    url: string;
    size: number;
    mimeType: string;
}

// Metadata types
export interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    attributes?: Array<{
        trait_type: string;
        value: string | number;
        display_type?: string;
    }>;
    external_url?: string;
    animation_url?: string;
    background_color?: string;
}

export interface IPMetadata {
    title: string;
    description: string;
    ipType: string;
    relationships: Array<{
        type: string;
        ipId: string;
    }>;
    createdAt: string;
    watermarkImg?: string;
    image?: string;
    imageHash?: string;
    mediaUrl?: string;
    mediaHash?: string;
    mediaType?: string;
    creators?: Array<{
        name: string;
        address: string;
        contributionPercent: number;
    }>;
    media?: Array<{
        name: string;
        url: string;
        mimeType: string;
    }>;
    attributes?: Array<{
        key: string;
        value: string | number;
    }>;
    app?: {
        id: string;
        name: string;
        website?: string;
    };
    tags?: string[];
    robotsTerms?: string;
    additionalProperties?: Record<string, any>;
}

// Validation types
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

// Rate limiting types
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}

// Security types
export interface SecurityConfig {
    rateLimit: RateLimitConfig;
    corsOrigins: string[];
    maxFileSize: number;
    allowedMimeTypes: string[];
}

// Wallet utility types
export interface WalletBalance {
    address: string;
    balance: string;
    formattedBalance: string;
    network: string;
}

export interface TransactionCost {
    gasEstimate: string;
    gasPriceGwei: string;
    estimatedCostEth: string;
    estimatedCostUsd?: string;
}

export interface FaucetInfo {
    name: string;
    url: string;
    chainId: number;
    description: string;
}

// Network utility types
export interface NetworkInfo {
    chainId: number;
    name: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls: string[];
    blockExplorerUrls: string[];
    iconUrls?: string[];
    isTestnet: boolean;
}

// Error types
export interface APIError {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
    statusCode: number;
}

// Response wrapper types
export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: APIError;
    requestId?: string;
    timestamp?: string;
}

// Health check types
export interface HealthCheckResult {
    service: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime?: number;
    error?: string;
    details?: Record<string, any>;
}

export interface SystemHealth {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    services: HealthCheckResult[];
    version?: string;
    uptime?: number;
}
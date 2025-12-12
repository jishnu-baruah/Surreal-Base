// Core API Types
export interface PrepareTransactionRequest {
    userAddress: string;
    ipMetadata: IPMetadata;
    nftMetadata: NFTMetadata;
    licenseTerms?: LicenseTermsConfig;
    files?: FileUpload[];
}

export interface PrepareDerivativeRequest {
    userAddress: string;
    parentIpIds: string[];
    licenseTermsIds: number[];
    ipMetadata: IPMetadata;
    nftMetadata?: NFTMetadata;
    spgNftContract?: string;
}

export interface PrepareLicenseRequest {
    userAddress: string;
    licenseTermsId: number;
    licensorIpId: string;
    amount: number;
}

export interface PrepareRoyaltyRequest {
    userAddress: string;
    operation: 'pay' | 'claim' | 'transfer';
    ipId: string;
    amount?: string;
    token?: string;
    recipient?: string;
    currencyTokens?: string[];
}

export interface PrepareCollectionRequest {
    userAddress: string;
    name: string;
    symbol: string;
    isPublicMinting: boolean;
    mintOpen: boolean;
    mintFeeRecipient?: string;
    contractURI?: string;
}

export interface PrepareDisputeRequest {
    userAddress: string;
    targetIpId: string;
    evidence: string;
    targetTag: string;
    bond: string;
    liveness: number;
}

export interface PrepareCliMintRequest {
    userAddress: string;
    filePath: string;
    fileData: string;
    filename: string;
    contentType: string;
    title?: string;
    description?: string;
    generateMetadata?: boolean;
    contentHash?: string;
    licenseTerms?: LicenseTermsConfig;
}

export interface FileUpload {
    data: string;
    filename: string;
    contentType: string;
    purpose: 'media' | 'metadata' | 'evidence' | 'attachment';
}

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
    additionalData?: Record<string, any>;
    error?: {
        code: string;
        message: string;
        details?: any;
        retryable?: boolean;
    };
}

// Metadata Types
export interface IPMetadata {
    title: string;
    description: string;
    createdAt?: string;
    creators: Creator[];
    image?: string;
    imageHash?: string;
    mediaUrl?: string;
    mediaHash?: string;
    mediaType?: string;
}

export interface Creator {
    name: string;
    address: string;
    contributionPercent: number;
}

export interface NFTMetadata {
    name: string;
    description: string;
    image?: string;
    animation_url?: string;
    attributes?: Attribute[];
}

export interface Attribute {
    key: string;
    value: string;
}

// Configuration Types
export interface LicenseTermsConfig {
    transferable: boolean;
    royaltyPolicy: string;
    defaultMintingFee: string;
    expiration: string;
    commercialUse: boolean;
    commercialAttribution: boolean;
    commercializerChecker: string;
    commercializerCheckerData: string;
    commercialRevShare: number;
    derivativesAllowed: boolean;
    derivativesAttribution: boolean;
    derivativesApproval: boolean;
    derivativesReciprocal: boolean;
    derivativeRevShare: number;
    currency: string;
    uri: string;
}

export interface StoryClientConfig {
    transport: any;
    chainId: 'aeneid' | 'mainnet';
}

export interface PreparedTransaction {
    to: string;
    data: string;
    value: string;
    gasEstimate?: string;
}

// Error Types
export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
        retryable?: boolean;
    };
}
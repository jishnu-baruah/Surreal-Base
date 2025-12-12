import {
    StoryClient,
    IpMetadata,
    PILFlavor,
    WIP_TOKEN_ADDRESS
} from '@story-protocol/core-sdk';
import { Address, parseEther, PublicClient } from 'viem';
import { createHash } from 'crypto';
import { getStoryClient, getNetworkInfo } from '@/lib/story-client';
import { createPublicClient } from '@/lib/config';
import {
    PrepareTransactionRequest,
    PrepareDerivativeRequest,
    PrepareLicenseRequest,
    PrepareRoyaltyRequest,
    PrepareCollectionRequest,
    PrepareDisputeRequest,
    PreparedTransaction,
    LicenseTermsConfig
} from '@/types';

/**
 * Contract addresses for different networks
 */
const getContractAddresses = () => {
    const networkInfo = getNetworkInfo();
    return {
        spgNftContract: networkInfo.defaultSPGNFTContractAddress,
        nftContract: networkInfo.defaultNFTContractAddress,
        wipToken: WIP_TOKEN_ADDRESS,
    };
};

/**
 * Generate IP metadata hash
 */
export const generateMetadataHash = (metadata: object): string => {
    return createHash('sha256').update(JSON.stringify(metadata)).digest('hex');
};

/**
 * Convert license terms config to PIL flavor
 */
const convertLicenseTerms = (licenseTerms?: Partial<LicenseTermsConfig>) => {
    if (!licenseTerms) {
        return PILFlavor.commercialRemix({
            commercialRevShare: 5, // 5% default
            defaultMintingFee: parseEther('1'), // 1 $IP default
            currency: WIP_TOKEN_ADDRESS,
        });
    }

    if (licenseTerms.commercialUse) {
        // If no revenue sharing, use non-commercial license
        if (!licenseTerms.commercialRevShare || licenseTerms.commercialRevShare === 0) {
            return PILFlavor.nonCommercialSocialRemixing();
        }

        return PILFlavor.commercialRemix({
            commercialRevShare: licenseTerms.commercialRevShare,
            defaultMintingFee: parseEther(licenseTerms.defaultMintingFee || '0'),
            currency: licenseTerms.currency as Address || WIP_TOKEN_ADDRESS,
        });
    } else {
        return PILFlavor.nonCommercialSocialRemixing();
    }
};

/**
 * Estimate gas for a transaction
 */
export const estimateGas = async (
    publicClient: PublicClient,
    transaction: {
        to: Address;
        data: `0x${string}`;
        value?: bigint;
        from?: Address;
    }
): Promise<string> => {
    try {
        const gasEstimate = await publicClient.estimateGas({
            to: transaction.to,
            data: transaction.data,
            value: transaction.value || BigInt(0),
            account: transaction.from || '0x0000000000000000000000000000000000000000',
        });

        // Add 20% buffer to gas estimate
        const bufferedGas = (gasEstimate * BigInt(120)) / BigInt(100);
        return bufferedGas.toString();
    } catch (error) {
        console.warn('Gas estimation failed:', error);
        // Return a reasonable default gas limit
        return '500000';
    }
};

/**
 * Build transaction parameters for IP asset registration
 * Note: This prepares the parameters that will be used by the Story SDK
 */
export const buildRegisterIpAssetTransaction = async (
    request: PrepareTransactionRequest,
    ipfsHashes: {
        ipMetadataHash: string;
        ipMetadataURI: string;
        nftMetadataHash: string;
        nftMetadataURI: string;
    }
): Promise<PreparedTransaction> => {
    const contracts = getContractAddresses();

    if (!contracts.spgNftContract) {
        throw new Error('SPG NFT contract address not available for current network');
    }

    // Return transaction structure that will be used by the API endpoint
    // The actual transaction encoding will be done by the Story SDK in the API
    return {
        to: contracts.spgNftContract,
        data: '0x', // Will be encoded by Story SDK
        value: '0',
        gasEstimate: '500000',
    };
};

/**
 * Build transaction parameters for derivative IP asset registration
 */
export const buildRegisterDerivativeTransaction = async (
    request: PrepareDerivativeRequest,
    ipfsHashes: {
        ipMetadataHash: string;
        ipMetadataURI: string;
        nftMetadataHash?: string;
        nftMetadataURI?: string;
    }
): Promise<PreparedTransaction> => {
    const contracts = getContractAddresses();

    const spgContract = request.spgNftContract as Address || contracts.spgNftContract;
    if (!spgContract) {
        throw new Error('SPG NFT contract address not available');
    }

    return {
        to: spgContract,
        data: '0x', // Will be encoded by Story SDK
        value: '0',
        gasEstimate: '500000',
    };
};

/**
 * Build transaction parameters for license token minting
 */
export const buildMintLicenseTransaction = async (
    request: PrepareLicenseRequest
): Promise<PreparedTransaction> => {
    const networkInfo = getNetworkInfo();

    // License minting typically goes through the licensing module
    // The exact contract address will be determined by the Story SDK
    return {
        to: '0x0000000000000000000000000000000000000000', // Will be set by Story SDK
        data: '0x', // Will be encoded by Story SDK
        value: '0',
        gasEstimate: '300000',
    };
};

/**
 * Build transaction parameters for royalty operations
 */
export const buildRoyaltyTransaction = async (
    request: PrepareRoyaltyRequest
): Promise<PreparedTransaction> => {
    // Royalty operations go through the royalty module
    return {
        to: '0x0000000000000000000000000000000000000000', // Will be set by Story SDK
        data: '0x', // Will be encoded by Story SDK
        value: request.operation === 'pay' ? request.amount || '0' : '0',
        gasEstimate: '400000',
    };
};

/**
 * Build transaction parameters for NFT collection creation
 */
export const buildCreateCollectionTransaction = async (
    request: PrepareCollectionRequest
): Promise<PreparedTransaction> => {
    // Collection creation goes through the NFT client
    return {
        to: '0x0000000000000000000000000000000000000000', // Will be set by Story SDK
        data: '0x', // Will be encoded by Story SDK
        value: '0',
        gasEstimate: '600000',
    };
};

/**
 * Build transaction parameters for dispute raising
 */
export const buildRaiseDisputeTransaction = async (
    request: PrepareDisputeRequest
): Promise<PreparedTransaction> => {
    // Dispute raising goes through the dispute module
    return {
        to: '0x0000000000000000000000000000000000000000', // Will be set by Story SDK
        data: '0x', // Will be encoded by Story SDK
        value: request.bond, // Bond amount required for dispute
        gasEstimate: '400000',
    };
};

/**
 * Validate wallet address format
 */
export const validateWalletAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Get contract address for specific function
 */
export const getContractAddress = (contractType: 'spg' | 'nft' | 'wip'): Address | null => {
    const contracts = getContractAddresses();

    switch (contractType) {
        case 'spg':
            return contracts.spgNftContract;
        case 'nft':
            return contracts.nftContract;
        case 'wip':
            return contracts.wipToken;
        default:
            return null;
    }
};

/**
 * Prepare Story SDK request parameters for IP asset registration
 */
export const prepareRegisterIpAssetParams = (
    request: PrepareTransactionRequest,
    ipfsHashes: {
        ipMetadataHash: string;
        ipMetadataURI: string;
        nftMetadataHash: string;
        nftMetadataURI: string;
    }
) => {
    const contracts = getContractAddresses();

    if (!contracts.spgNftContract) {
        throw new Error('SPG NFT contract address not available for current network');
    }

    return {
        nft: {
            type: 'mint' as const,
            spgNftContract: contracts.spgNftContract
        },
        licenseTermsData: request.licenseTerms ? [
            { terms: convertLicenseTerms(request.licenseTerms) }
        ] : [
            { terms: convertLicenseTerms() }
        ],
        ipMetadata: {
            ipMetadataURI: ipfsHashes.ipMetadataURI,
            ipMetadataHash: ipfsHashes.ipMetadataHash,
            nftMetadataURI: ipfsHashes.nftMetadataURI,
            nftMetadataHash: ipfsHashes.nftMetadataHash,
        },
    };
};

/**
 * Prepare Story SDK request parameters for derivative IP asset registration
 */
export const prepareRegisterDerivativeParams = (
    request: PrepareDerivativeRequest,
    ipfsHashes: {
        ipMetadataHash: string;
        ipMetadataURI: string;
        nftMetadataHash?: string;
        nftMetadataURI?: string;
    }
) => {
    const contracts = getContractAddresses();
    const spgContract = request.spgNftContract as Address || contracts.spgNftContract;

    if (!spgContract) {
        throw new Error('SPG NFT contract address not available');
    }

    return {
        nft: {
            type: 'mint' as const,
            spgNftContract: spgContract
        },
        derivData: {
            parentIpIds: request.parentIpIds as Address[],
            licenseTermsIds: request.licenseTermsIds,
        },
        ipMetadata: {
            ipMetadataURI: ipfsHashes.ipMetadataURI,
            ipMetadataHash: `0x${ipfsHashes.ipMetadataHash}`,
            nftMetadataURI: ipfsHashes.nftMetadataURI || ipfsHashes.ipMetadataURI,
            nftMetadataHash: `0x${ipfsHashes.nftMetadataHash || ipfsHashes.ipMetadataHash}`,
        },
    };
};

/**
 * Prepare Story SDK request parameters for license token minting
 */
export const prepareMintLicenseParams = (request: PrepareLicenseRequest) => {
    return {
        licenseTermsId: request.licenseTermsId,
        licensorIpId: request.licensorIpId as Address,
        amount: request.amount,
    };
};

/**
 * Prepare Story SDK request parameters for royalty operations
 */
export const prepareRoyaltyParams = (request: PrepareRoyaltyRequest) => {
    const baseParams = {
        ipId: request.ipId as Address,
        userAddress: request.userAddress as Address,
    };

    switch (request.operation) {
        case 'pay':
            return {
                ...baseParams,
                operation: 'pay' as const,
                amount: request.amount!,
                token: request.token! as Address,
            };
        case 'claim':
            return {
                ...baseParams,
                operation: 'claim' as const,
                currencyTokens: (request.currencyTokens || []) as Address[],
            };
        case 'transfer':
            return {
                ...baseParams,
                operation: 'transfer' as const,
                amount: request.amount!,
                recipient: request.recipient! as Address,
            };
        default:
            throw new Error(`Unsupported royalty operation: ${request.operation}`);
    }
};
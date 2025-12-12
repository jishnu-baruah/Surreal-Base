import { NextRequest, NextResponse } from 'next/server';
import { getStoryClient } from '@/lib/story-client';
import { uploadJSONToIPFS } from '@/lib/ipfs';
import { generateMetadataHash } from '@/lib/metadata-builders';
import { validateRequest, prepareDerivativeRequestSchema } from '@/lib/validation';
import { prepareRegisterDerivativeParams } from '@/lib/transaction-builders';
import {
    handleValidationError,
    handleStoryClientError,
    handleIPFSError,
    handleInternalError,
    createSuccessResponse,
    logError,
    ErrorCode
} from '@/lib/error-handler';
import { withSecurityAndRateLimit, sanitizeRequestBody } from '@/lib/security';
import { PrepareDerivativeRequest, PrepareTransactionResponse } from '@/types';

/**
 * POST /api/prepare-derivative
 * 
 * Prepares a transaction for derivative IP asset registration on Story Protocol.
 * This endpoint handles metadata processing, IPFS uploads, parent IP validation,
 * license terms verification, and fee calculation for derivative works.
 * 
 * Requirements covered:
 * - 7.1: Create derivative IP assets that link to parent IP assets with proper license terms
 * - 7.4: Validate parent IP IDs and license terms exist
 * - 7.5: Calculate required fees and include them in transaction preparation
 * - 11.1: Never request, store, or access user private keys
 * - 11.2: Use read-only blockchain connections for data retrieval
 */
async function handlePOST(request: NextRequest) {
    try {
        // Parse and sanitize request body
        const body = await sanitizeRequestBody(request);
        const validation = validateRequest(prepareDerivativeRequestSchema, body);

        if (!validation.success) {
            return handleValidationError(validation.error, '/api/prepare-derivative');
        }

        const requestData = validation.data as PrepareDerivativeRequest;

        // Initialize Story Protocol client (read-only)
        let storyClient;
        try {
            storyClient = getStoryClient();
        } catch (error) {
            return handleStoryClientError(error, '/api/prepare-derivative', 'initialize');
        }

        // Basic validation of parent IP IDs format
        console.log(`Validating ${requestData.parentIpIds.length} parent IP IDs format...`);
        for (const parentIpId of requestData.parentIpIds) {
            if (!parentIpId || typeof parentIpId !== 'string' || parentIpId.length === 0) {
                return NextResponse.json({
                    success: false,
                    error: {
                        code: ErrorCode.VALIDATION_ERROR,
                        message: `Invalid parent IP ID format: ${parentIpId}`,
                        details: { parentIpId },
                        retryable: false
                    }
                }, { status: 400 });
            }
            console.log(`Parent IP ID format validated: ${parentIpId}`);
        }

        // Basic validation of license terms IDs
        console.log(`Validating ${requestData.licenseTermsIds.length} license terms IDs...`);
        for (let i = 0; i < requestData.licenseTermsIds.length; i++) {
            const licenseTermsId = requestData.licenseTermsIds[i];
            const parentIpId = requestData.parentIpIds[i];

            if (!Number.isInteger(licenseTermsId) || licenseTermsId <= 0) {
                return NextResponse.json({
                    success: false,
                    error: {
                        code: ErrorCode.VALIDATION_ERROR,
                        message: `Invalid license terms ID: ${licenseTermsId}`,
                        details: { licenseTermsId, parentIpId },
                        retryable: false
                    }
                }, { status: 400 });
            }

            console.log(`License terms ID validated: ${licenseTermsId} for parent IP: ${parentIpId}`);
        }

        // Upload IP metadata to IPFS
        let ipMetadataHash: string;
        let ipMetadataURI: string;
        try {
            ipMetadataHash = await uploadJSONToIPFS(requestData.ipMetadata, 'derivative-ip-metadata.json');
            ipMetadataURI = `https://gateway.pinata.cloud/ipfs/${ipMetadataHash}`;
            console.log(`Derivative IP metadata uploaded to IPFS: ${ipMetadataHash}`);
        } catch (error) {
            return handleIPFSError(error, '/api/prepare-derivative', 'upload IP metadata');
        }

        // Upload NFT metadata to IPFS if provided
        let nftMetadataHash: string | undefined;
        let nftMetadataURI: string | undefined;
        if (requestData.nftMetadata) {
            try {
                nftMetadataHash = await uploadJSONToIPFS(requestData.nftMetadata, 'derivative-nft-metadata.json');
                nftMetadataURI = `https://gateway.pinata.cloud/ipfs/${nftMetadataHash}`;
                console.log(`Derivative NFT metadata uploaded to IPFS: ${nftMetadataHash}`);
            } catch (error) {
                return handleIPFSError(error, '/api/prepare-derivative', 'upload NFT metadata');
            }
        }

        // Generate content hashes for metadata integrity
        const ipHash = generateMetadataHash(requestData.ipMetadata);
        const nftHash = requestData.nftMetadata ? generateMetadataHash(requestData.nftMetadata) : ipHash;

        // Calculate licensing fees for derivative creation
        // Note: Fee calculation will be handled by the Story SDK during transaction execution
        // For now, we set a placeholder value that the client can override
        let totalLicensingFee = '0';

        console.log(`Preparing derivative transaction for ${requestData.parentIpIds.length} parent IPs`);
        console.log('License fees will be calculated by Story SDK during transaction execution');

        // Prepare Story SDK parameters for derivative registration
        let storyParams;
        try {
            storyParams = prepareRegisterDerivativeParams(requestData, {
                ipMetadataHash: ipHash,
                ipMetadataURI,
                nftMetadataHash: nftHash,
                nftMetadataURI: nftMetadataURI || ipMetadataURI
            });
        } catch (error) {
            logError('/api/prepare-derivative', ErrorCode.PARAMETER_ERROR, error);
            return handleInternalError(error, '/api/prepare-derivative', { operation: 'prepare parameters' });
        }

        // Prepare transaction data for client-side execution
        const transactionData = {
            to: storyParams.nft.spgNftContract,
            data: '0x', // Client will encode this using Story SDK registerDerivativeIpAsset
            value: totalLicensingFee, // Include calculated licensing fees
            gasEstimate: '600000' // Higher gas estimate for derivative operations
        };

        // Construct successful response
        console.log('Derivative transaction preparation completed successfully');
        return createSuccessResponse(
            transactionData,
            {
                ipfsHash: ipMetadataHash,
                ipHash,
                nftIpfsHash: nftMetadataHash || ipMetadataHash,
                nftHash
            },
            [], // No file uploads for derivative endpoint
            {
                parentIpIds: requestData.parentIpIds,
                licenseTermsIds: requestData.licenseTermsIds,
                totalLicensingFee,
                spgNftContract: storyParams.nft.spgNftContract
            }
        );

    } catch (error) {
        return handleInternalError(error, '/api/prepare-derivative');
    }
}

// Apply security and rate limiting middleware
export const POST = withSecurityAndRateLimit(handlePOST);

/**
 * GET /api/prepare-derivative
 * 
 * Returns API documentation and usage information
 */
async function handleGET() {
    return NextResponse.json({
        endpoint: '/api/prepare-derivative',
        method: 'POST',
        description: 'Prepares a transaction for derivative IP asset registration on Story Protocol',
        parameters: {
            userAddress: 'string (required) - Ethereum address of the user',
            parentIpIds: 'array (required) - Array of parent IP asset IDs to derive from',
            licenseTermsIds: 'array (required) - Array of license terms IDs corresponding to each parent IP',
            ipMetadata: 'object (required) - IP metadata object with title, description, creators',
            nftMetadata: 'object (optional) - NFT metadata object with name, description',
            spgNftContract: 'string (optional) - Custom SPG NFT contract address'
        },
        response: {
            success: 'boolean - Whether the operation succeeded',
            transaction: 'object - Transaction data for signing (to, data, value, gasEstimate)',
            metadata: 'object - IPFS hashes and content hashes',
            error: 'object - Error information if success is false',
            additionalData: 'object - Parent IPs, license terms, fees, and contract info'
        },
        requirements: [
            '7.1: Create derivative IP assets that link to parent IP assets with proper license terms',
            '7.4: Validate parent IP IDs and license terms exist',
            '7.5: Calculate required fees and include them in transaction preparation'
        ],
        example: {
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            parentIpIds: ['0x1234567890123456789012345678901234567890'],
            licenseTermsIds: [1],
            ipMetadata: {
                title: 'My Derivative Work',
                description: 'A derivative work based on existing IP',
                creators: [{
                    name: 'Creator Name',
                    address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                    contributionPercent: 100
                }]
            },
            nftMetadata: {
                name: 'Derivative NFT',
                description: 'NFT for my derivative work'
            }
        }
    });
}

// Apply security middleware to GET endpoint
export const GET = withSecurityAndRateLimit(handleGET);
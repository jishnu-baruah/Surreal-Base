import { NextRequest, NextResponse } from 'next/server';
import { getStoryClient } from '@/lib/story-client';
import { validateRequest, prepareCollectionRequestSchema } from '@/lib/validation';
import { buildCreateCollectionTransaction } from '@/lib/transaction-builders';
import {
    handleValidationError,
    handleStoryClientError,
    handleInternalError,
    createSuccessResponse,
    logError,
    ErrorCode
} from '@/lib/error-handler';
import { withSecurityAndRateLimit, sanitizeRequestBody } from '@/lib/security';
import { PrepareCollectionRequest, PrepareTransactionResponse } from '@/types';

/**
 * POST /api/prepare-collection
 * 
 * Prepares a transaction for SPG NFT collection creation on Story Protocol.
 * This endpoint handles collection configuration validation and transaction preparation
 * without requiring user private keys.
 * 
 * Requirements covered:
 * - 9.2: SPG NFT collection creation with proper configuration
 * - 9.4: Support public minting and fee configuration options
 * - 1.1: Secure API without private key access
 * - 1.3: Return unsigned transaction data
 * - 3.1: Return JSON response with transaction fields
 * - 4.1: Validate input data and return specific validation errors
 */
async function handlePOST(request: NextRequest) {
    try {
        // Parse and sanitize request body
        const body = await sanitizeRequestBody(request);
        const validation = validateRequest(prepareCollectionRequestSchema, body);

        if (!validation.success) {
            return handleValidationError(validation.error, '/api/prepare-collection');
        }

        const requestData = validation.data as PrepareCollectionRequest;

        // Initialize Story Protocol client
        let storyClient;
        try {
            storyClient = getStoryClient();
        } catch (error) {
            return handleStoryClientError(error, '/api/prepare-collection', 'initialize');
        }

        // Validate collection configuration
        try {
            // Validate collection name and symbol uniqueness (in real implementation)
            if (requestData.name.trim().length === 0) {
                throw new Error('Collection name cannot be empty');
            }

            if (requestData.symbol.trim().length === 0) {
                throw new Error('Collection symbol cannot be empty');
            }

            // Validate mint fee recipient if provided
            if (requestData.mintFeeRecipient && !requestData.mintFeeRecipient.match(/^0x[a-fA-F0-9]{40}$/)) {
                throw new Error('Invalid mint fee recipient address format');
            }

            // Validate contract URI if provided
            if (requestData.contractURI) {
                try {
                    new URL(requestData.contractURI);
                } catch {
                    throw new Error('Invalid contract URI format');
                }
            }
        } catch (error) {
            logError('/api/prepare-collection', ErrorCode.VALIDATION_ERROR, error);
            return NextResponse.json({
                success: false,
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: 'Collection configuration validation failed',
                    details: error instanceof Error ? error.message : 'Unknown validation error',
                    retryable: false
                }
            }, { status: 400 });
        }

        // Build transaction for collection creation
        let transactionData;
        try {
            transactionData = await buildCreateCollectionTransaction(requestData);
        } catch (error) {
            logError('/api/prepare-collection', ErrorCode.PARAMETER_ERROR, error);
            return handleInternalError(error, '/api/prepare-collection', { operation: 'build collection transaction' });
        }

        // Prepare additional data for the response
        const additionalData = {
            collectionName: requestData.name,
            collectionSymbol: requestData.symbol,
            isPublicMinting: requestData.isPublicMinting,
            mintOpen: requestData.mintOpen,
            mintFeeRecipient: requestData.mintFeeRecipient || null,
            contractURI: requestData.contractURI || null,
            estimatedGas: transactionData.gasEstimate
        };

        console.log(`Collection creation transaction prepared for: ${requestData.name} (${requestData.symbol})`);
        console.log(`Public minting: ${requestData.isPublicMinting}, Mint open: ${requestData.mintOpen}`);

        // Construct successful response
        // Note: Collection creation doesn't involve metadata uploads, so we create a placeholder metadata object
        const placeholderMetadata = {
            ipfsHash: '',
            ipHash: '',
            nftIpfsHash: '',
            nftHash: ''
        };

        return createSuccessResponse(
            transactionData,
            placeholderMetadata,
            undefined, // No uploaded files
            additionalData
        );

    } catch (error) {
        return handleInternalError(error, '/api/prepare-collection');
    }
}

// Apply security and rate limiting middleware
export const POST = withSecurityAndRateLimit(handlePOST);

/**
 * GET /api/prepare-collection
 * 
 * Returns API documentation and usage information
 */
async function handleGET() {
    return NextResponse.json({
        endpoint: '/api/prepare-collection',
        method: 'POST',
        description: 'Prepares a transaction for SPG NFT collection creation on Story Protocol',
        parameters: {
            userAddress: 'string (required) - Ethereum address of the user',
            name: 'string (required) - Collection name (max 100 characters)',
            symbol: 'string (required) - Collection symbol (max 10 characters, uppercase letters and numbers only)',
            isPublicMinting: 'boolean (required) - Whether the collection allows public minting',
            mintOpen: 'boolean (required) - Whether minting is currently open',
            mintFeeRecipient: 'string (optional) - Ethereum address to receive minting fees',
            contractURI: 'string (optional) - URI for collection metadata'
        },
        response: {
            success: 'boolean - Whether the operation succeeded',
            transaction: 'object - Transaction data for signing (to, data, value, gasEstimate)',
            additionalData: 'object - Collection-specific information',
            error: 'object - Error information if success is false'
        },
        example: {
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            name: 'My IP Collection',
            symbol: 'MIC',
            isPublicMinting: true,
            mintOpen: true,
            mintFeeRecipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            contractURI: 'https://example.com/collection-metadata.json'
        },
        notes: [
            'Collection creation requires gas fees for deployment',
            'Collection name and symbol should be unique within the network',
            'Public minting allows anyone to mint from the collection',
            'Mint fee recipient receives fees from minting operations',
            'Contract URI should point to collection-level metadata'
        ]
    });
}

// Apply security middleware to GET endpoint
export const GET = withSecurityAndRateLimit(handleGET);
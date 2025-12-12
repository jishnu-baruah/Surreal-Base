import { NextRequest, NextResponse } from 'next/server';
import { getStoryClient } from '@/lib/story-client';
import { uploadJSONToIPFS } from '@/lib/ipfs';
import { validateRequest, prepareDisputeRequestSchema } from '@/lib/validation';
import { buildRaiseDisputeTransaction } from '@/lib/transaction-builders';
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
import { PrepareDisputeRequest, PrepareTransactionResponse } from '@/types';

/**
 * POST /api/prepare-dispute
 * 
 * Prepares a transaction for dispute raising on Story Protocol.
 * This endpoint handles evidence upload to IPFS and dispute parameter validation
 * without requiring user private keys.
 * 
 * Requirements covered:
 * - 9.1: Dispute raising transaction preparation with evidence upload
 * - 9.3: Evidence format validation and decentralized storage
 * - 9.5: Dispute parameter validation (tags, bond amounts)
 * - 1.1: Secure API without private key access
 * - 1.3: Return unsigned transaction data
 * - 3.1: Return JSON response with transaction fields
 * - 4.1: Validate input data and return specific validation errors
 */
async function handlePOST(request: NextRequest) {
    try {
        // Parse and sanitize request body
        const body = await sanitizeRequestBody(request);
        const validation = validateRequest(prepareDisputeRequestSchema, body);

        if (!validation.success) {
            return handleValidationError(validation.error, '/api/prepare-dispute');
        }

        const requestData = validation.data as PrepareDisputeRequest;

        // Initialize Story Protocol client
        let storyClient;
        try {
            storyClient = getStoryClient();
        } catch (error) {
            return handleStoryClientError(error, '/api/prepare-dispute', 'initialize');
        }

        // Validate dispute parameters
        try {
            // Validate target IP ID format
            if (!requestData.targetIpId || requestData.targetIpId.trim() === '') {
                throw new Error('Target IP ID is required');
            }

            // Validate dispute tag
            const validTags = ['PLAGIARISM', 'NON_COMMERCIAL_USE', 'ATTRIBUTION', 'COMMERCIAL_USE', 'OTHER'];
            if (!validTags.includes(requestData.targetTag)) {
                throw new Error(`Invalid target tag. Must be one of: ${validTags.join(', ')}`);
            }

            // Validate bond amount (must be positive)
            const bondAmount = BigInt(requestData.bond);
            if (bondAmount <= 0) {
                throw new Error('Bond amount must be positive');
            }

            // Validate liveness period (reasonable bounds)
            if (requestData.liveness < 3600 || requestData.liveness > 2592000) { // 1 hour to 30 days
                throw new Error('Liveness period must be between 1 hour (3600 seconds) and 30 days (2592000 seconds)');
            }

            // Validate evidence content
            if (requestData.evidence.trim().length < 10) {
                throw new Error('Evidence must be at least 10 characters long');
            }

        } catch (error) {
            logError('/api/prepare-dispute', ErrorCode.VALIDATION_ERROR, error);
            return NextResponse.json({
                success: false,
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: 'Dispute parameter validation failed',
                    details: error instanceof Error ? error.message : 'Unknown validation error',
                    retryable: false
                }
            }, { status: 400 });
        }

        // Prepare evidence object for IPFS upload
        const evidenceObject = {
            targetIpId: requestData.targetIpId,
            targetTag: requestData.targetTag,
            evidence: requestData.evidence,
            submittedBy: requestData.userAddress,
            submittedAt: new Date().toISOString(),
            disputeType: 'IP_INFRINGEMENT',
            metadata: {
                version: '1.0',
                format: 'story-protocol-dispute-evidence'
            }
        };

        // Upload evidence to IPFS
        let evidenceHash: string;
        let evidenceURI: string;
        try {
            evidenceHash = await uploadJSONToIPFS(evidenceObject, 'dispute-evidence.json');
            evidenceURI = `https://gateway.pinata.cloud/ipfs/${evidenceHash}`;
            console.log(`Dispute evidence uploaded to IPFS: ${evidenceHash}`);
        } catch (error) {
            return handleIPFSError(error, '/api/prepare-dispute', 'upload dispute evidence');
        }

        // Build transaction for dispute raising
        let transactionData;
        try {
            transactionData = await buildRaiseDisputeTransaction(requestData);
        } catch (error) {
            logError('/api/prepare-dispute', ErrorCode.PARAMETER_ERROR, error);
            return handleInternalError(error, '/api/prepare-dispute', { operation: 'build dispute transaction' });
        }

        // Prepare additional data for the response
        const additionalData = {
            targetIpId: requestData.targetIpId,
            targetTag: requestData.targetTag,
            bondAmount: requestData.bond,
            livenessPeriod: requestData.liveness,
            evidenceHash,
            evidenceURI,
            estimatedGas: transactionData.gasEstimate,
            disputeParameters: {
                targetIpId: requestData.targetIpId,
                targetTag: requestData.targetTag,
                evidenceHash: `0x${evidenceHash}`,
                bond: requestData.bond,
                liveness: requestData.liveness
            }
        };

        console.log(`Dispute transaction prepared for IP: ${requestData.targetIpId}`);
        console.log(`Target tag: ${requestData.targetTag}, Bond: ${requestData.bond} wei`);
        console.log(`Evidence uploaded to: ${evidenceURI}`);

        // Construct successful response
        // Note: Dispute raising doesn't involve standard metadata, so we create a custom metadata object
        const disputeMetadata = {
            ipfsHash: evidenceHash,
            ipHash: evidenceHash, // Use evidence hash as IP hash
            nftIpfsHash: evidenceHash, // Use evidence hash as NFT hash
            nftHash: evidenceHash // Use evidence hash as NFT hash
        };

        return createSuccessResponse(
            transactionData,
            disputeMetadata,
            undefined, // No uploaded files (evidence is uploaded as JSON)
            additionalData
        );

    } catch (error) {
        return handleInternalError(error, '/api/prepare-dispute');
    }
}

// Apply security and rate limiting middleware
export const POST = withSecurityAndRateLimit(handlePOST);

/**
 * GET /api/prepare-dispute
 * 
 * Returns API documentation and usage information
 */
async function handleGET() {
    return NextResponse.json({
        endpoint: '/api/prepare-dispute',
        method: 'POST',
        description: 'Prepares a transaction for dispute raising on Story Protocol',
        parameters: {
            userAddress: 'string (required) - Ethereum address of the user raising the dispute',
            targetIpId: 'string (required) - IP ID being disputed',
            evidence: 'string (required) - Evidence supporting the dispute (min 10 characters, max 10000)',
            targetTag: 'string (required) - Type of dispute (PLAGIARISM, NON_COMMERCIAL_USE, ATTRIBUTION, COMMERCIAL_USE, OTHER)',
            bond: 'string (required) - Bond amount in wei (must be positive)',
            liveness: 'number (required) - Liveness period in seconds (1 hour to 30 days)'
        },
        response: {
            success: 'boolean - Whether the operation succeeded',
            transaction: 'object - Transaction data for signing (to, data, value, gasEstimate)',
            metadata: 'object - Evidence IPFS hash information',
            additionalData: 'object - Dispute-specific information',
            error: 'object - Error information if success is false'
        },
        example: {
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            targetIpId: '0x1234567890123456789012345678901234567890',
            evidence: 'This IP asset appears to be a copy of my original work published at...',
            targetTag: 'PLAGIARISM',
            bond: '1000000000000000000',
            liveness: 86400
        },
        validTargetTags: [
            'PLAGIARISM - Content copied without permission',
            'NON_COMMERCIAL_USE - Commercial use of non-commercial licensed content',
            'ATTRIBUTION - Missing or incorrect attribution',
            'COMMERCIAL_USE - Unauthorized commercial use',
            'OTHER - Other types of IP infringement'
        ],
        notes: [
            'Bond amount is required and will be locked during dispute resolution',
            'Evidence is uploaded to IPFS for permanent storage',
            'Liveness period determines how long the dispute remains active',
            'Dispute resolution follows Story Protocol governance processes',
            'False disputes may result in bond forfeiture'
        ]
    });
}

// Apply security middleware to GET endpoint
export const GET = withSecurityAndRateLimit(handleGET);
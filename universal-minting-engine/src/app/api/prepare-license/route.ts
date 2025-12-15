import { NextRequest, NextResponse } from 'next/server';
import { getStoryClient } from '@/lib/story-client';
import { validateRequest, prepareLicenseRequestSchema } from '@/lib/validation';
import { buildMintLicenseTransaction, prepareMintLicenseParams } from '@/lib/transaction-builders';
import {
    handleValidationError,
    handleStoryClientError,
    handleTransactionError,
    handleInternalError,
    createSuccessResponse,
    logError,
    ErrorCode
} from '@/lib/error-handler';
import { withSecurityAndRateLimit, sanitizeRequestBody } from '@/lib/security';
import { PrepareLicenseRequest, PrepareTransactionResponse } from '@/types';

/**
 * POST /api/prepare-license
 * 
 * Prepares a transaction for license token minting on Story Protocol.
 * This endpoint handles license terms validation, quantity handling, and fee calculation
 * without requiring user private keys.
 * 
 * Requirements covered:
 * - 7.2: License token minting with terms and quantities
 * - 7.3: Licensing configurations and limits
 * - 7.5: Fee calculation for license token purchases
 * - 1.1: Secure API without private key access
 * - 1.3: Return unsigned transaction data
 * - 3.1: Return JSON response with transaction fields
 * - 4.1: Validate input data and return specific validation errors
 */
async function handlePOST(request: NextRequest) {
    try {
        // Parse and sanitize request body
        const body = await sanitizeRequestBody(request);
        const validation = validateRequest(prepareLicenseRequestSchema, body);

        if (!validation.success) {
            return handleValidationError(validation.error, '/api/prepare-license');
        }

        const requestData = validation.data as PrepareLicenseRequest;

        // Initialize Story Protocol client
        let storyClient;
        try {
            storyClient = getStoryClient();
        } catch (error) {
            return handleStoryClientError(error, '/api/prepare-license', 'initialize');
        }

        // Validate license terms ID exists and is valid
        try {
            // Note: In a real implementation, we would validate the license terms ID
            // against the Story Protocol network to ensure it exists
            if (requestData.licenseTermsId <= 0) {
                throw new Error('Invalid license terms ID');
            }
        } catch (error) {
            logError('/api/prepare-license', ErrorCode.VALIDATION_ERROR, error);
            return NextResponse.json({
                success: false,
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: 'Invalid license terms ID provided',
                    details: { licenseTermsId: requestData.licenseTermsId },
                    retryable: false
                }
            }, { status: 400 });
        }

        // Validate licensor IP ID format and existence
        try {
            if (!requestData.licensorIpId || requestData.licensorIpId.trim() === '') {
                throw new Error('Licensor IP ID is required');
            }
            // Note: In a real implementation, we would validate the IP ID exists on the network
        } catch (error) {
            logError('/api/prepare-license', ErrorCode.VALIDATION_ERROR, error);
            return NextResponse.json({
                success: false,
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: 'Invalid licensor IP ID provided',
                    details: { licensorIpId: requestData.licensorIpId },
                    retryable: false
                }
            }, { status: 400 });
        }

        // Validate license quantity limits
        try {
            if (requestData.amount !== undefined) {
                if (requestData.amount <= 0) {
                    throw new Error('License amount must be positive');
                }
                if (requestData.amount > 10000) {
                    throw new Error('License amount exceeds maximum limit of 10,000');
                }
            }
        } catch (error) {
            logError('/api/prepare-license', ErrorCode.VALIDATION_ERROR, error);
            return NextResponse.json({
                success: false,
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: 'Invalid license amount: must be between 1 and 10,000',
                    details: { amount: requestData.amount },
                    retryable: false
                }
            }, { status: 400 });
        }

        // Prepare Story SDK parameters for license minting
        let storyParams;
        try {
            storyParams = prepareMintLicenseParams(requestData);
        } catch (error) {
            logError('/api/prepare-license', ErrorCode.PARAMETER_ERROR, error);
            return handleInternalError(error, '/api/prepare-license', { operation: 'prepare license parameters' });
        }

        // Build transaction for license token minting
        let transactionData;
        try {
            transactionData = await buildMintLicenseTransaction(requestData);
        } catch (error) {
            return handleTransactionError(error, '/api/prepare-license', 'build license transaction');
        }

        // Calculate estimated fees for license minting
        // Note: In a real implementation, this would query the actual license terms
        // to get the minting fee and calculate the total cost
        const estimatedFeePerLicense = '1000000000000000000'; // 1 $IP token in wei (placeholder)
        const totalEstimatedFee = (BigInt(estimatedFeePerLicense) * BigInt(requestData.amount || 1)).toString();

        // Add fee information to transaction
        transactionData.value = totalEstimatedFee;

        // Prepare additional data for the response
        const additionalData = {
            licenseTermsId: requestData.licenseTermsId,
            licensorIpId: requestData.licensorIpId,
            amount: requestData.amount,
            estimatedFeePerLicense,
            totalEstimatedFee,
            feeToken: 'WIP', // Placeholder - would be determined by license terms
        };

        console.log(`License minting transaction prepared for ${requestData.amount} licenses`);
        console.log(`Estimated total fee: ${totalEstimatedFee} wei`);

        // Construct successful response
        return createSuccessResponse(
            transactionData,
            {
                ipfsHash: '',
                ipHash: '',
                nftIpfsHash: '',
                nftHash: ''
            }, // No metadata for license minting
            [], // No uploaded files
            additionalData
        );

    } catch (error) {
        return handleInternalError(error, '/api/prepare-license');
    }
}

// Apply security and rate limiting middleware
export const POST = withSecurityAndRateLimit(handlePOST);

/**
 * GET /api/prepare-license
 * 
 * Returns API documentation and usage information
 */
async function handleGET() {
    return NextResponse.json({
        endpoint: '/api/prepare-license',
        method: 'POST',
        description: 'Prepares a transaction for license token minting on Story Protocol',
        parameters: {
            userAddress: 'string (required) - Ethereum address of the user',
            licenseTermsId: 'number (required) - ID of the license terms to mint',
            licensorIpId: 'string (required) - IP ID of the licensor',
            amount: 'number (required) - Number of license tokens to mint (1-10,000)'
        },
        response: {
            success: 'boolean - Whether the operation succeeded',
            transaction: 'object - Transaction data for signing (to, data, value, gasEstimate)',
            additionalData: 'object - License-specific information (fees, terms, etc.)',
            error: 'object - Error information if success is false'
        },
        example: {
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            licenseTermsId: 1,
            licensorIpId: '0x1234567890123456789012345678901234567890',
            amount: 5
        },
        notes: [
            'License minting requires payment of fees as specified in the license terms',
            'The transaction value will include the total fee for all requested licenses',
            'Maximum of 10,000 license tokens can be minted in a single transaction',
            'License terms ID must exist on the Story Protocol network'
        ]
    });
}

// Apply security middleware to GET endpoint
export const GET = withSecurityAndRateLimit(handleGET);

// Handle CORS preflight requests
export const OPTIONS = withSecurityAndRateLimit(async () => {
    return new NextResponse(null, { status: 200 });
});
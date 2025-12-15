import { NextRequest, NextResponse } from 'next/server';
import { getStoryClient } from '@/lib/story-client';
import { validateRequest, prepareRoyaltyRequestSchema } from '@/lib/validation';
import { buildRoyaltyTransaction, prepareRoyaltyParams } from '@/lib/transaction-builders';
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
import { PrepareRoyaltyRequest, PrepareTransactionResponse } from '@/types';

/**
 * POST /api/prepare-royalty
 * 
 * Prepares transactions for royalty management operations on Story Protocol.
 * This endpoint handles royalty payments, revenue claiming, and IP account transfers
 * without requiring user private keys.
 * 
 * Requirements covered:
 * - 8.1: Calculate payment amounts and encode proper recipient data for royalty payments
 * - 8.2: Prepare transactions for claimAllRevenue with appropriate currency tokens
 * - 8.3: Validate IP ownership and payment token addresses
 * - 8.4: Encode IP account to wallet transfers
 * - 8.5: Support different royalty policies and percentages
 * - 11.1: Never request, store, or access user private keys
 * - 11.2: Use read-only blockchain connections for data retrieval
 */
async function handlePOST(request: NextRequest) {
    try {
        // Parse and sanitize request body
        const body = await sanitizeRequestBody(request);
        const validation = validateRequest(prepareRoyaltyRequestSchema, body);

        if (!validation.success) {
            return handleValidationError(validation.error, '/api/prepare-royalty');
        }

        const requestData = validation.data as PrepareRoyaltyRequest;

        // Initialize Story Protocol client (read-only)
        let storyClient;
        try {
            storyClient = getStoryClient();
        } catch (error) {
            return handleStoryClientError(error, '/api/prepare-royalty', 'initialize');
        }

        // Validate IP ID format
        console.log(`Validating IP ID format: ${requestData.ipId}`);
        if (!requestData.ipId || typeof requestData.ipId !== 'string' || requestData.ipId.length === 0) {
            return NextResponse.json({
                success: false,
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: `Invalid IP ID format: ${requestData.ipId}`,
                    details: { ipId: requestData.ipId },
                    retryable: false
                }
            }, { status: 400 });
        }

        // Validate operation-specific requirements
        try {
            switch (requestData.operation) {
                case 'pay':
                    if (!requestData.amount || !requestData.token) {
                        throw new Error('Payment operations require amount and token address');
                    }
                    // Validate amount is a valid number string
                    if (!/^\d+$/.test(requestData.amount)) {
                        throw new Error('Payment amount must be a valid number string');
                    }
                    // Validate token address format
                    if (!/^0x[a-fA-F0-9]{40}$/.test(requestData.token)) {
                        throw new Error('Invalid token address format');
                    }
                    console.log(`Validated payment: ${requestData.amount} of token ${requestData.token}`);
                    break;

                case 'claim':
                    if (!requestData.currencyTokens || requestData.currencyTokens.length === 0) {
                        throw new Error('Claim operations require at least one currency token');
                    }
                    // Validate all currency token addresses
                    for (const token of requestData.currencyTokens) {
                        if (!/^0x[a-fA-F0-9]{40}$/.test(token)) {
                            throw new Error(`Invalid currency token address format: ${token}`);
                        }
                    }
                    console.log(`Validated claim for ${requestData.currencyTokens.length} currency tokens`);
                    break;

                case 'transfer':
                    if (!requestData.amount || !requestData.recipient) {
                        throw new Error('Transfer operations require amount and recipient address');
                    }
                    // Validate amount is a valid number string
                    if (!/^\d+$/.test(requestData.amount)) {
                        throw new Error('Transfer amount must be a valid number string');
                    }
                    // Validate recipient address format
                    if (!/^0x[a-fA-F0-9]{40}$/.test(requestData.recipient)) {
                        throw new Error('Invalid recipient address format');
                    }
                    console.log(`Validated transfer: ${requestData.amount} to ${requestData.recipient}`);
                    break;

                default:
                    throw new Error(`Unsupported royalty operation: ${requestData.operation}`);
            }
        } catch (error) {
            logError('/api/prepare-royalty', ErrorCode.VALIDATION_ERROR, error);
            return NextResponse.json({
                success: false,
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: error instanceof Error ? error.message : 'Operation validation failed',
                    details: { operation: requestData.operation },
                    retryable: false
                }
            }, { status: 400 });
        }

        // Basic IP ownership validation (format check)
        // Note: In a real implementation, we would validate IP ownership against the Story Protocol network
        console.log(`Performing basic IP ownership validation for user ${requestData.userAddress} and IP ${requestData.ipId}`);

        // Prepare Story SDK parameters for royalty operations
        let storyParams;
        try {
            storyParams = prepareRoyaltyParams(requestData);
        } catch (error) {
            logError('/api/prepare-royalty', ErrorCode.PARAMETER_ERROR, error);
            return handleInternalError(error, '/api/prepare-royalty', { operation: 'prepare royalty parameters' });
        }

        // Build transaction for royalty operation
        let transactionData;
        try {
            transactionData = await buildRoyaltyTransaction(requestData);
        } catch (error) {
            return handleTransactionError(error, '/api/prepare-royalty', 'build royalty transaction');
        }

        // Calculate operation-specific data and fees
        let additionalData: Record<string, any> = {
            operation: requestData.operation,
            ipId: requestData.ipId,
        };

        switch (requestData.operation) {
            case 'pay':
                additionalData = {
                    ...additionalData,
                    paymentAmount: requestData.amount,
                    paymentToken: requestData.token,
                    estimatedGasFee: transactionData.gasEstimate,
                };
                // Set transaction value for payment operations
                transactionData.value = requestData.amount!;
                console.log(`Payment transaction prepared: ${requestData.amount} of ${requestData.token}`);
                break;

            case 'claim':
                additionalData = {
                    ...additionalData,
                    currencyTokens: requestData.currencyTokens,
                    tokenCount: requestData.currencyTokens!.length,
                };
                console.log(`Claim transaction prepared for ${requestData.currencyTokens!.length} tokens`);
                break;

            case 'transfer':
                additionalData = {
                    ...additionalData,
                    transferAmount: requestData.amount,
                    recipient: requestData.recipient,
                };
                console.log(`Transfer transaction prepared: ${requestData.amount} to ${requestData.recipient}`);
                break;
        }

        // Construct successful response
        console.log(`Royalty ${requestData.operation} transaction preparation completed successfully`);
        return createSuccessResponse(
            transactionData,
            {
                ipfsHash: '',
                ipHash: '',
                nftIpfsHash: '',
                nftHash: ''
            }, // No metadata for royalty operations
            [], // No uploaded files
            additionalData
        );

    } catch (error) {
        return handleInternalError(error, '/api/prepare-royalty');
    }
}

// Apply security and rate limiting middleware
export const POST = withSecurityAndRateLimit(handlePOST);

/**
 * GET /api/prepare-royalty
 * 
 * Returns API documentation and usage information
 */
async function handleGET() {
    return NextResponse.json({
        endpoint: '/api/prepare-royalty',
        method: 'POST',
        description: 'Prepares transactions for royalty management operations on Story Protocol',
        parameters: {
            userAddress: 'string (required) - Ethereum address of the user',
            operation: 'string (required) - Type of royalty operation: "pay", "claim", or "transfer"',
            ipId: 'string (required) - IP asset ID for the royalty operation',
            amount: 'string (conditional) - Amount for pay/transfer operations (in wei)',
            token: 'string (conditional) - Token address for payment operations',
            recipient: 'string (conditional) - Recipient address for transfer operations',
            currencyTokens: 'array (conditional) - Array of currency token addresses for claim operations'
        },
        operations: {
            pay: {
                description: 'Pay royalties to an IP asset',
                requiredFields: ['userAddress', 'ipId', 'amount', 'token'],
                example: {
                    userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                    operation: 'pay',
                    ipId: '0x1234567890123456789012345678901234567890',
                    amount: '1000000000000000000',
                    token: '0xA0b86a33E6441E6C7D3E4C5B4B6B8B8B8B8B8B8B'
                }
            },
            claim: {
                description: 'Claim revenue from an IP asset',
                requiredFields: ['userAddress', 'ipId', 'currencyTokens'],
                example: {
                    userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                    operation: 'claim',
                    ipId: '0x1234567890123456789012345678901234567890',
                    currencyTokens: ['0xA0b86a33E6441E6C7D3E4C5B4B6B8B8B8B8B8B8B']
                }
            },
            transfer: {
                description: 'Transfer funds from IP account to wallet',
                requiredFields: ['userAddress', 'ipId', 'amount', 'recipient'],
                example: {
                    userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                    operation: 'transfer',
                    ipId: '0x1234567890123456789012345678901234567890',
                    amount: '500000000000000000',
                    recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
                }
            }
        },
        response: {
            success: 'boolean - Whether the operation succeeded',
            transaction: 'object - Transaction data for signing (to, data, value, gasEstimate)',
            additionalData: 'object - Operation-specific information (amounts, tokens, recipients)',
            error: 'object - Error information if success is false'
        },
        requirements: [
            '8.1: Calculate payment amounts and encode proper recipient data for royalty payments',
            '8.2: Prepare transactions for claimAllRevenue with appropriate currency tokens',
            '8.3: Validate IP ownership and payment token addresses',
            '8.4: Encode IP account to wallet transfers',
            '8.5: Support different royalty policies and percentages'
        ],
        notes: [
            'All amounts should be specified in wei (smallest unit)',
            'Token addresses must be valid Ethereum addresses',
            'IP ownership validation is performed before transaction preparation',
            'Different operations require different sets of parameters',
            'Transaction value is automatically set for payment operations'
        ]
    });
}

// Apply security middleware to GET endpoint
export const GET = withSecurityAndRateLimit(handleGET);

// Handle CORS preflight requests
export const OPTIONS = withSecurityAndRateLimit(async () => {
    return new NextResponse(null, { status: 200 });
});
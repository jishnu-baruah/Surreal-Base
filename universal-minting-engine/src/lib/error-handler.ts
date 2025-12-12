import { NextResponse } from 'next/server';
import { PrepareTransactionResponse } from '@/types';

/**
 * Error handling utilities for API endpoints
 * Provides structured error responses with proper categorization and retry guidance
 */

export enum ErrorCode {
    // Validation Errors (4xx)
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_ADDRESS = 'INVALID_ADDRESS',
    INVALID_METADATA = 'INVALID_METADATA',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

    // External Service Errors (5xx - retryable)
    STORY_CLIENT_ERROR = 'STORY_CLIENT_ERROR',
    IPFS_UPLOAD_ERROR = 'IPFS_UPLOAD_ERROR',
    FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',

    // System Errors (5xx)
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    PARAMETER_ERROR = 'PARAMETER_ERROR',
    CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
    TRANSACTION_ERROR = 'TRANSACTION_ERROR',
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',

    // Rate Limiting (4xx)
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export interface ErrorDetails {
    code: ErrorCode;
    message: string;
    details?: any;
    retryable: boolean;
    statusCode: number;
}

/**
 * Error category definitions with retry guidance
 */
const ERROR_DEFINITIONS: Record<ErrorCode, Omit<ErrorDetails, 'details'>> = {
    // Validation Errors - Not retryable
    [ErrorCode.VALIDATION_ERROR]: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Request validation failed',
        retryable: false,
        statusCode: 400
    },
    [ErrorCode.INVALID_ADDRESS]: {
        code: ErrorCode.INVALID_ADDRESS,
        message: 'Invalid Ethereum address format',
        retryable: false,
        statusCode: 400
    },
    [ErrorCode.INVALID_METADATA]: {
        code: ErrorCode.INVALID_METADATA,
        message: 'Invalid metadata format or content',
        retryable: false,
        statusCode: 400
    },
    [ErrorCode.MISSING_REQUIRED_FIELD]: {
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Required field is missing',
        retryable: false,
        statusCode: 400
    },

    // External Service Errors - Retryable
    [ErrorCode.STORY_CLIENT_ERROR]: {
        code: ErrorCode.STORY_CLIENT_ERROR,
        message: 'Failed to connect to Story Protocol network',
        retryable: true,
        statusCode: 503
    },
    [ErrorCode.IPFS_UPLOAD_ERROR]: {
        code: ErrorCode.IPFS_UPLOAD_ERROR,
        message: 'Failed to upload to IPFS',
        retryable: true,
        statusCode: 503
    },
    [ErrorCode.FILE_UPLOAD_ERROR]: {
        code: ErrorCode.FILE_UPLOAD_ERROR,
        message: 'Failed to upload files',
        retryable: true,
        statusCode: 503
    },
    [ErrorCode.NETWORK_ERROR]: {
        code: ErrorCode.NETWORK_ERROR,
        message: 'Network connection failed',
        retryable: true,
        statusCode: 503
    },

    // System Errors - May be retryable
    [ErrorCode.INTERNAL_ERROR]: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        retryable: true,
        statusCode: 500
    },
    [ErrorCode.PARAMETER_ERROR]: {
        code: ErrorCode.PARAMETER_ERROR,
        message: 'Failed to prepare transaction parameters',
        retryable: false,
        statusCode: 400
    },
    [ErrorCode.CONFIGURATION_ERROR]: {
        code: ErrorCode.CONFIGURATION_ERROR,
        message: 'System configuration error',
        retryable: false,
        statusCode: 500
    },
    [ErrorCode.TRANSACTION_ERROR]: {
        code: ErrorCode.TRANSACTION_ERROR,
        message: 'Failed to build transaction data',
        retryable: true,
        statusCode: 500
    },
    [ErrorCode.INSUFFICIENT_FUNDS]: {
        code: ErrorCode.INSUFFICIENT_FUNDS,
        message: 'Insufficient funds to complete transaction',
        retryable: false,
        statusCode: 400
    },

    // Rate Limiting
    [ErrorCode.RATE_LIMIT_EXCEEDED]: {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        retryable: true,
        statusCode: 429
    }
};

/**
 * Create a structured error response
 */
export function createErrorResponse(
    errorCode: ErrorCode,
    customMessage?: string,
    details?: any
): { response: PrepareTransactionResponse; statusCode: number } {
    const errorDef = ERROR_DEFINITIONS[errorCode];

    const errorResponse: PrepareTransactionResponse = {
        success: false,
        error: {
            code: errorDef.code,
            message: customMessage || errorDef.message,
            details: sanitizeErrorDetails(details),
            retryable: errorDef.retryable
        }
    };

    return {
        response: errorResponse,
        statusCode: errorDef.statusCode
    };
}

/**
 * Create a NextResponse with proper error formatting
 */
export function createErrorNextResponse(
    errorCode: ErrorCode,
    customMessage?: string,
    details?: any
): NextResponse<PrepareTransactionResponse> {
    const { response, statusCode } = createErrorResponse(errorCode, customMessage, details);
    return NextResponse.json(response, { status: statusCode });
}

/**
 * Sanitize error details to prevent sensitive information leakage
 */
function sanitizeErrorDetails(details: any): any {
    if (!details) return undefined;

    // If it's a development environment, return full details
    if (process.env.NODE_ENV === 'development') {
        return details;
    }

    // In production, sanitize sensitive information
    if (typeof details === 'string') {
        // Remove potential sensitive patterns
        return details
            .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
            .replace(/0x[a-fA-F0-9]{64}/g, '0x[REDACTED_PRIVATE_KEY]')
            .replace(/sk_[A-Za-z0-9]+/g, 'sk_[REDACTED]');
    }

    if (typeof details === 'object' && details !== null) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(details)) {
            // Skip sensitive keys
            if (['password', 'secret', 'key', 'token', 'jwt', 'privateKey'].some(
                sensitive => key.toLowerCase().includes(sensitive)
            )) {
                sanitized[key] = '[REDACTED]';
            } else {
                sanitized[key] = sanitizeErrorDetails(value);
            }
        }
        return sanitized;
    }

    return details;
}

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Log error with structured context for debugging
 */
export function logError(
    endpoint: string,
    errorCode: ErrorCode,
    error: any,
    context?: Record<string, any>
): string {
    const requestId = generateRequestId();
    const errorDef = ERROR_DEFINITIONS[errorCode];

    const logData = {
        requestId,
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        endpoint,
        errorCode,
        errorCategory: getErrorCategory(errorCode),
        retryable: errorDef.retryable,
        statusCode: errorDef.statusCode,
        error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        } : error,
        context: sanitizeErrorDetails(context),
        environment: process.env.NODE_ENV || 'unknown'
    };

    console.error('API Error:', JSON.stringify(logData, null, 2));
    return requestId;
}

/**
 * Log successful operations for monitoring
 */
export function logSuccess(
    endpoint: string,
    operation: string,
    context?: Record<string, any>
): void {
    const logData = {
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
        level: 'INFO',
        endpoint,
        operation,
        context: sanitizeErrorDetails(context),
        environment: process.env.NODE_ENV || 'unknown'
    };

    console.log('API Success:', JSON.stringify(logData, null, 2));
}

/**
 * Get error category for classification
 */
function getErrorCategory(errorCode: ErrorCode): string {
    switch (errorCode) {
        case ErrorCode.VALIDATION_ERROR:
        case ErrorCode.INVALID_ADDRESS:
        case ErrorCode.INVALID_METADATA:
        case ErrorCode.MISSING_REQUIRED_FIELD:
        case ErrorCode.PARAMETER_ERROR:
            return 'validation';

        case ErrorCode.STORY_CLIENT_ERROR:
        case ErrorCode.IPFS_UPLOAD_ERROR:
        case ErrorCode.FILE_UPLOAD_ERROR:
        case ErrorCode.NETWORK_ERROR:
            return 'external_service';

        case ErrorCode.INTERNAL_ERROR:
        case ErrorCode.CONFIGURATION_ERROR:
        case ErrorCode.TRANSACTION_ERROR:
            return 'system';

        case ErrorCode.RATE_LIMIT_EXCEEDED:
            return 'rate_limiting';

        default:
            return 'unknown';
    }
}

/**
 * Handle validation errors from Zod or other validation libraries
 */
export function handleValidationError(
    validationError: string,
    endpoint: string
): NextResponse<PrepareTransactionResponse> {
    const requestId = logError(endpoint, ErrorCode.VALIDATION_ERROR, validationError);

    return createErrorNextResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        { validationError, requestId }
    );
}

/**
 * Handle IPFS upload errors
 */
export function handleIPFSError(
    error: any,
    endpoint: string,
    operation: string = 'upload'
): NextResponse<PrepareTransactionResponse> {
    const requestId = logError(endpoint, ErrorCode.IPFS_UPLOAD_ERROR, error, { operation });

    return createErrorNextResponse(
        ErrorCode.IPFS_UPLOAD_ERROR,
        `Failed to ${operation} to IPFS`,
        {
            error: error instanceof Error ? error.message : 'Unknown IPFS error',
            requestId,
            operation
        }
    );
}

/**
 * Handle Story Protocol client errors
 */
export function handleStoryClientError(
    error: any,
    endpoint: string,
    operation: string = 'connect'
): NextResponse<PrepareTransactionResponse> {
    const requestId = logError(endpoint, ErrorCode.STORY_CLIENT_ERROR, error, { operation });

    return createErrorNextResponse(
        ErrorCode.STORY_CLIENT_ERROR,
        `Failed to ${operation} to Story Protocol network`,
        {
            error: error instanceof Error ? error.message : 'Unknown Story Protocol error',
            requestId,
            operation
        }
    );
}

/**
 * Handle file upload errors
 */
export function handleFileUploadError(
    error: any,
    endpoint: string,
    filename?: string
): NextResponse<PrepareTransactionResponse> {
    const requestId = logError(endpoint, ErrorCode.FILE_UPLOAD_ERROR, error, { filename });

    return createErrorNextResponse(
        ErrorCode.FILE_UPLOAD_ERROR,
        filename ? `Failed to upload file: ${filename}` : 'Failed to upload files',
        {
            error: error instanceof Error ? error.message : 'Unknown file upload error',
            requestId,
            filename
        }
    );
}

/**
 * Handle transaction building errors
 */
export function handleTransactionError(
    error: any,
    endpoint: string,
    operation: string = 'build transaction'
): NextResponse<PrepareTransactionResponse> {
    const requestId = logError(endpoint, ErrorCode.TRANSACTION_ERROR, error, { operation });

    return createErrorNextResponse(
        ErrorCode.TRANSACTION_ERROR,
        `Failed to ${operation}`,
        {
            error: error instanceof Error ? error.message : 'Unknown transaction error',
            requestId,
            operation
        }
    );
}

/**
 * Handle unexpected internal errors
 */
export function handleInternalError(
    error: any,
    endpoint: string,
    context?: Record<string, any>
): NextResponse<PrepareTransactionResponse> {
    const requestId = logError(endpoint, ErrorCode.INTERNAL_ERROR, error, context);

    return createErrorNextResponse(
        ErrorCode.INTERNAL_ERROR,
        'An unexpected error occurred while processing your request',
        {
            error: process.env.NODE_ENV === 'development'
                ? (error instanceof Error ? error.message : 'Unknown error')
                : 'Internal server error',
            requestId,
            ...context
        }
    );
}

/**
 * Handle insufficient funds errors
 */
export function handleInsufficientFundsError(
    error: any,
    endpoint: string,
    userAddress: string,
    networkName: string = 'Aeneid testnet'
): NextResponse<PrepareTransactionResponse> {
    const requestId = logError(endpoint, ErrorCode.INSUFFICIENT_FUNDS, error, { userAddress, networkName });

    return createErrorNextResponse(
        ErrorCode.INSUFFICIENT_FUNDS,
        `Insufficient funds in wallet ${userAddress}`,
        {
            error: `The wallet does not have enough ETH to cover gas fees on ${networkName}`,
            userAddress,
            networkName,
            faucetUrls: [
                'https://faucet.story.foundation',
                'https://testnet.storyscan.xyz/faucet'
            ],
            solutions: [
                `Visit the Story Protocol faucet at https://faucet.story.foundation`,
                `Connect your wallet and request testnet ETH`,
                `Wait for the faucet transaction to confirm`,
                `Check your wallet balance on ${networkName}`,
                `Ensure you're connected to the correct network (Chain ID: 1513)`
            ],
            explorerUrl: `https://aeneid.storyscan.io/address/${userAddress}`,
            requestId
        }
    );
}

/**
 * Detect if an error is related to insufficient funds
 */
export function isInsufficientFundsError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || error.toString() || '';
    const lowerMessage = errorMessage.toLowerCase();

    // Be more specific about insufficient funds detection
    const isInsufficientFunds = lowerMessage.includes('insufficient funds for transfer') ||
        lowerMessage.includes('insufficient balance') ||
        lowerMessage.includes('exceeds the balance of the account') ||
        lowerMessage.includes('not enough funds') ||
        lowerMessage.includes('insufficient ether');

    // Log for debugging
    if (isInsufficientFunds) {
        console.log('Detected insufficient funds error:', errorMessage);
    }

    return isInsufficientFunds;
}

/**
 * Create a successful response with proper formatting
 */
export function createSuccessResponse(
    transaction: {
        to: string;
        data: string;
        value: string;
        gasEstimate?: string;
    },
    metadata: {
        ipfsHash: string;
        ipHash: string;
        nftIpfsHash: string;
        nftHash: string;
    },
    uploadedFiles?: Array<{
        filename: string;
        ipfsHash: string;
        purpose: string;
        url: string;
    }>,
    additionalData?: Record<string, any>
): NextResponse<PrepareTransactionResponse> {
    const response: PrepareTransactionResponse = {
        success: true,
        transaction,
        metadata,
        uploadedFiles: uploadedFiles && uploadedFiles.length > 0 ? uploadedFiles : undefined,
        ...(additionalData && { additionalData })
    };

    return NextResponse.json(response);
}

/**
 * Retry guidance for different error types
 */
export function getRetryGuidance(errorCode: ErrorCode): string {
    switch (errorCode) {
        case ErrorCode.VALIDATION_ERROR:
        case ErrorCode.INVALID_ADDRESS:
        case ErrorCode.INVALID_METADATA:
        case ErrorCode.MISSING_REQUIRED_FIELD:
        case ErrorCode.PARAMETER_ERROR:
            return 'Fix the request data and try again. This error is not retryable.';

        case ErrorCode.STORY_CLIENT_ERROR:
        case ErrorCode.NETWORK_ERROR:
            return 'Retry after a few seconds. If the problem persists, check Story Protocol network status.';

        case ErrorCode.IPFS_UPLOAD_ERROR:
        case ErrorCode.FILE_UPLOAD_ERROR:
            return 'Retry the upload. If the problem persists, check file size and format requirements.';

        case ErrorCode.RATE_LIMIT_EXCEEDED:
            return 'Wait before retrying. Implement exponential backoff for best results.';

        case ErrorCode.INTERNAL_ERROR:
            return 'Retry after a brief delay. If the problem persists, contact support.';

        case ErrorCode.CONFIGURATION_ERROR:
            return 'This is a system configuration issue. Contact support if the problem persists.';

        case ErrorCode.TRANSACTION_ERROR:
            return 'Retry the transaction preparation. If the problem persists, check the request parameters.';

        default:
            return 'Check the error details and retry if appropriate.';
    }
}
import {
    createErrorResponse,
    createErrorNextResponse,
    createSuccessResponse,
    handleValidationError,
    handleIPFSError,
    handleStoryClientError,
    handleFileUploadError,
    handleTransactionError,
    handleInternalError,
    getRetryGuidance,
    logError,
    logSuccess,
    ErrorCode
} from '../../src/lib/error-handler';

describe('Error Handler', () => {
    describe('createErrorResponse', () => {
        it('should create a validation error response', () => {
            const { response, statusCode } = createErrorResponse(
                ErrorCode.VALIDATION_ERROR,
                'Custom validation message',
                'Field is required'
            );

            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('VALIDATION_ERROR');
            expect(response.error?.message).toBe('Custom validation message');
            expect(response.error?.details).toBe('Field is required');
            expect(response.error?.retryable).toBe(false);
            expect(statusCode).toBe(400);
        });

        it('should create a retryable error response', () => {
            const { response, statusCode } = createErrorResponse(
                ErrorCode.IPFS_UPLOAD_ERROR,
                undefined,
                'Network timeout'
            );

            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('IPFS_UPLOAD_ERROR');
            expect(response.error?.message).toBe('Failed to upload to IPFS');
            expect(response.error?.retryable).toBe(true);
            expect(statusCode).toBe(503);
        });
    });

    describe('createSuccessResponse', () => {
        it('should create a successful response', () => {
            const transaction = {
                to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                data: '0x123456',
                value: '0',
                gasEstimate: '500000'
            };

            const metadata = {
                ipfsHash: 'QmTest123',
                ipHash: 'hash123',
                nftIpfsHash: 'QmNFT456',
                nftHash: 'nfthash456'
            };

            const uploadedFiles = [{
                filename: 'test.jpg',
                ipfsHash: 'QmFile789',
                purpose: 'media',
                url: 'https://gateway.pinata.cloud/ipfs/QmFile789'
            }];

            const response = createSuccessResponse(transaction, metadata, uploadedFiles);
            const responseData = response.json();

            // Note: We can't directly test the JSON content since NextResponse.json() 
            // returns a Response object, but we can verify the structure
            expect(response).toBeDefined();
            expect(response.status).toBe(200);
        });
    });

    describe('error handler functions', () => {
        it('should handle validation errors', () => {
            const response = handleValidationError('Invalid field', '/api/test');
            expect(response.status).toBe(400);
        });

        it('should handle IPFS errors', () => {
            const error = new Error('Upload failed');
            const response = handleIPFSError(error, '/api/test', 'upload');
            expect(response.status).toBe(503);
        });

        it('should handle Story client errors', () => {
            const error = new Error('Connection failed');
            const response = handleStoryClientError(error, '/api/test', 'connect');
            expect(response.status).toBe(503);
        });

        it('should handle file upload errors', () => {
            const error = new Error('File too large');
            const response = handleFileUploadError(error, '/api/test', 'test.jpg');
            expect(response.status).toBe(503);
        });

        it('should handle transaction errors', () => {
            const error = new Error('Transaction build failed');
            const response = handleTransactionError(error, '/api/test', 'build transaction');
            expect(response.status).toBe(500);
        });

        it('should handle internal errors', () => {
            const error = new Error('Unexpected error');
            const response = handleInternalError(error, '/api/test');
            expect(response.status).toBe(500);
        });
    });

    describe('getRetryGuidance', () => {
        it('should provide guidance for validation errors', () => {
            const guidance = getRetryGuidance(ErrorCode.VALIDATION_ERROR);
            expect(guidance).toContain('not retryable');
        });

        it('should provide guidance for network errors', () => {
            const guidance = getRetryGuidance(ErrorCode.NETWORK_ERROR);
            expect(guidance).toContain('Retry after a few seconds');
        });

        it('should provide guidance for rate limiting', () => {
            const guidance = getRetryGuidance(ErrorCode.RATE_LIMIT_EXCEEDED);
            expect(guidance).toContain('Wait before retrying');
        });

        it('should provide guidance for IPFS errors', () => {
            const guidance = getRetryGuidance(ErrorCode.IPFS_UPLOAD_ERROR);
            expect(guidance).toContain('Retry the upload');
        });

        it('should provide guidance for transaction errors', () => {
            const guidance = getRetryGuidance(ErrorCode.TRANSACTION_ERROR);
            expect(guidance).toContain('Retry the transaction preparation');
        });
    });

    describe('error sanitization', () => {
        it('should sanitize sensitive information in production', () => {
            // Mock NODE_ENV for this test
            const originalEnv = process.env.NODE_ENV;
            Object.defineProperty(process.env, 'NODE_ENV', {
                value: 'production',
                writable: true
            });

            const { response } = createErrorResponse(
                ErrorCode.INTERNAL_ERROR,
                'Error with sensitive data',
                {
                    message: 'Bearer sk_test_123456789',
                    privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                    password: 'secret123'
                }
            );

            expect(response.error?.details.message).toContain('[REDACTED]');
            expect(response.error?.details.privateKey).toBe('[REDACTED]');
            expect(response.error?.details.password).toBe('[REDACTED]');

            // Restore original NODE_ENV
            Object.defineProperty(process.env, 'NODE_ENV', {
                value: originalEnv,
                writable: true
            });
        });

        it('should preserve details in development', () => {
            // Mock NODE_ENV for this test
            const originalEnv = process.env.NODE_ENV;
            Object.defineProperty(process.env, 'NODE_ENV', {
                value: 'development',
                writable: true
            });

            const sensitiveData = {
                message: 'This is a debug message',
                debug: 'This is debug info'
            };

            const { response } = createErrorResponse(
                ErrorCode.INTERNAL_ERROR,
                'Development error',
                sensitiveData
            );

            expect(response.error?.details).toEqual(sensitiveData);

            // Restore original NODE_ENV
            Object.defineProperty(process.env, 'NODE_ENV', {
                value: originalEnv,
                writable: true
            });
        });
    });

    describe('error codes', () => {
        it('should have correct status codes for different error types', () => {
            const validationError = createErrorResponse(ErrorCode.VALIDATION_ERROR);
            expect(validationError.statusCode).toBe(400);

            const ipfsError = createErrorResponse(ErrorCode.IPFS_UPLOAD_ERROR);
            expect(ipfsError.statusCode).toBe(503);

            const internalError = createErrorResponse(ErrorCode.INTERNAL_ERROR);
            expect(internalError.statusCode).toBe(500);

            const rateLimitError = createErrorResponse(ErrorCode.RATE_LIMIT_EXCEEDED);
            expect(rateLimitError.statusCode).toBe(429);

            const transactionError = createErrorResponse(ErrorCode.TRANSACTION_ERROR);
            expect(transactionError.statusCode).toBe(500);
        });

        it('should have correct retryable flags', () => {
            const validationError = createErrorResponse(ErrorCode.VALIDATION_ERROR);
            expect(validationError.response.error?.retryable).toBe(false);

            const networkError = createErrorResponse(ErrorCode.NETWORK_ERROR);
            expect(networkError.response.error?.retryable).toBe(true);

            const parameterError = createErrorResponse(ErrorCode.PARAMETER_ERROR);
            expect(parameterError.response.error?.retryable).toBe(false);

            const transactionError = createErrorResponse(ErrorCode.TRANSACTION_ERROR);
            expect(transactionError.response.error?.retryable).toBe(true);
        });
    });

    describe('logging functionality', () => {
        // Mock console methods to avoid cluttering test output
        const originalConsoleError = console.error;
        const originalConsoleLog = console.log;

        beforeEach(() => {
            console.error = jest.fn();
            console.log = jest.fn();
        });

        afterEach(() => {
            console.error = originalConsoleError;
            console.log = originalConsoleLog;
        });

        it('should log errors with structured data', () => {
            const requestId = logError('/api/test', ErrorCode.VALIDATION_ERROR, 'Test error', { userId: '123' });

            expect(typeof requestId).toBe('string');
            expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
            expect(console.error).toHaveBeenCalledWith(
                'API Error:',
                expect.stringMatching(/"level"\s*:\s*"ERROR"/)
            );
        });

        it('should log success operations', () => {
            logSuccess('/api/test', 'test operation', { result: 'success' });

            expect(console.log).toHaveBeenCalledWith(
                'API Success:',
                expect.stringMatching(/"level"\s*:\s*"INFO"/)
            );
        });

        it('should categorize errors correctly', () => {
            logError('/api/test', ErrorCode.VALIDATION_ERROR, 'Test error');
            expect(console.error).toHaveBeenCalledWith(
                'API Error:',
                expect.stringMatching(/"errorCategory"\s*:\s*"validation"/)
            );

            logError('/api/test', ErrorCode.IPFS_UPLOAD_ERROR, 'Test error');
            expect(console.error).toHaveBeenCalledWith(
                'API Error:',
                expect.stringMatching(/"errorCategory"\s*:\s*"external_service"/)
            );

            logError('/api/test', ErrorCode.INTERNAL_ERROR, 'Test error');
            expect(console.error).toHaveBeenCalledWith(
                'API Error:',
                expect.stringMatching(/"errorCategory"\s*:\s*"system"/)
            );
        });
    });
});
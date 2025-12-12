import {
    validateRequest,
    validateWalletAddress,
    validateIPFSHash,
    prepareTransactionRequestSchema,
    prepareDerivativeRequestSchema,
    prepareLicenseRequestSchema,
    prepareRoyaltyRequestSchema,
    prepareCollectionRequestSchema,
    prepareDisputeRequestSchema,
    prepareCliMintRequestSchema
} from '../../src/lib/validation';

describe('Validation Schemas', () => {
    describe('validateWalletAddress', () => {
        it('should validate correct Ethereum addresses', () => {
            expect(validateWalletAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')).toBe(true);
            expect(validateWalletAddress('0x0000000000000000000000000000000000000000')).toBe(true);
        });

        it('should reject invalid Ethereum addresses', () => {
            expect(validateWalletAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b')).toBe(false); // too short
            expect(validateWalletAddress('742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')).toBe(false); // no 0x prefix
            expect(validateWalletAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6G')).toBe(false); // invalid character
        });
    });

    describe('validateIPFSHash', () => {
        it('should validate correct IPFS hashes', () => {
            expect(validateIPFSHash('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true);
        });

        it('should reject invalid IPFS hashes', () => {
            expect(validateIPFSHash('invalid-hash')).toBe(false);
            expect(validateIPFSHash('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbd')).toBe(false); // too short
        });
    });

    describe('prepareTransactionRequestSchema', () => {
        const validRequest = {
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            ipMetadata: {
                title: 'Test IP',
                description: 'Test description',
                creators: [{
                    name: 'Test Creator',
                    address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                    contributionPercent: 100
                }]
            },
            nftMetadata: {
                name: 'Test NFT',
                description: 'Test NFT description'
            }
        };

        it('should validate a correct request', () => {
            const result = validateRequest(prepareTransactionRequestSchema, validRequest);
            expect(result.success).toBe(true);
        });

        it('should reject request with invalid user address', () => {
            const invalidRequest = { ...validRequest, userAddress: 'invalid-address' };
            const result = validateRequest(prepareTransactionRequestSchema, invalidRequest);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid Ethereum address format');
        });

        it('should reject request with creators contribution not summing to 100', () => {
            const invalidRequest = {
                ...validRequest,
                ipMetadata: {
                    ...validRequest.ipMetadata,
                    creators: [{
                        name: 'Test Creator',
                        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                        contributionPercent: 50
                    }]
                }
            };
            const result = validateRequest(prepareTransactionRequestSchema, invalidRequest);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Creator contribution percentages must sum to 100');
        });
    });

    describe('prepareDerivativeRequestSchema', () => {
        const validRequest = {
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            parentIpIds: ['parent1', 'parent2'],
            licenseTermsIds: [1, 2],
            ipMetadata: {
                title: 'Derivative IP',
                description: 'Derivative description',
                creators: [{
                    name: 'Test Creator',
                    address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                    contributionPercent: 100
                }]
            }
        };

        it('should validate a correct derivative request', () => {
            const result = validateRequest(prepareDerivativeRequestSchema, validRequest);
            expect(result.success).toBe(true);
        });

        it('should reject when parent IPs and license terms count mismatch', () => {
            const invalidRequest = {
                ...validRequest,
                parentIpIds: ['parent1'],
                licenseTermsIds: [1, 2]
            };
            const result = validateRequest(prepareDerivativeRequestSchema, invalidRequest);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Number of parent IP IDs must match number of license terms IDs');
        });
    });

    describe('prepareLicenseRequestSchema', () => {
        const validRequest = {
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            licenseTermsId: 1,
            licensorIpId: 'licensor-ip-id',
            amount: 5
        };

        it('should validate a correct license request', () => {
            const result = validateRequest(prepareLicenseRequestSchema, validRequest);
            expect(result.success).toBe(true);
        });

        it('should reject negative amounts', () => {
            const invalidRequest = { ...validRequest, amount: -1 };
            const result = validateRequest(prepareLicenseRequestSchema, invalidRequest);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Amount must be a positive integer');
        });
    });

    describe('prepareRoyaltyRequestSchema', () => {
        it('should validate pay operation with required fields', () => {
            const validRequest = {
                userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                operation: 'pay' as const,
                ipId: 'test-ip-id',
                amount: '1000',
                token: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
            };
            const result = validateRequest(prepareRoyaltyRequestSchema, validRequest);
            expect(result.success).toBe(true);
        });

        it('should validate claim operation with currency tokens', () => {
            const validRequest = {
                userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                operation: 'claim' as const,
                ipId: 'test-ip-id',
                currencyTokens: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6']
            };
            const result = validateRequest(prepareRoyaltyRequestSchema, validRequest);
            expect(result.success).toBe(true);
        });

        it('should reject pay operation without required fields', () => {
            const invalidRequest = {
                userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                operation: 'pay' as const,
                ipId: 'test-ip-id'
                // missing amount and token
            };
            const result = validateRequest(prepareRoyaltyRequestSchema, invalidRequest);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required fields for the specified operation');
        });
    });

    describe('prepareCollectionRequestSchema', () => {
        const validRequest = {
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            name: 'Test Collection',
            symbol: 'TEST',
            isPublicMinting: true,
            mintOpen: true
        };

        it('should validate a correct collection request', () => {
            const result = validateRequest(prepareCollectionRequestSchema, validRequest);
            expect(result.success).toBe(true);
        });

        it('should reject invalid symbol format', () => {
            const invalidRequest = { ...validRequest, symbol: 'test-symbol' };
            const result = validateRequest(prepareCollectionRequestSchema, invalidRequest);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Collection symbol must contain only uppercase letters and numbers');
        });
    });

    describe('prepareDisputeRequestSchema', () => {
        const validRequest = {
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            targetIpId: 'target-ip-id',
            evidence: 'This is evidence of infringement',
            targetTag: 'PLAGIARISM',
            bond: '1000000000000000000',
            liveness: 86400
        };

        it('should validate a correct dispute request', () => {
            const result = validateRequest(prepareDisputeRequestSchema, validRequest);
            expect(result.success).toBe(true);
        });

        it('should reject invalid bond format', () => {
            const invalidRequest = { ...validRequest, bond: 'invalid-bond' };
            const result = validateRequest(prepareDisputeRequestSchema, invalidRequest);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Bond must be a valid number string');
        });
    });

    describe('prepareCliMintRequestSchema', () => {
        const validRequest = {
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            filePath: '/path/to/file.txt',
            fileData: 'SGVsbG8gV29ybGQ=', // "Hello World" in base64
            filename: 'file.txt',
            contentType: 'text/plain'
        };

        it('should validate a correct CLI mint request', () => {
            const result = validateRequest(prepareCliMintRequestSchema, validRequest);
            expect(result.success).toBe(true);
        });

        it('should reject invalid base64 data', () => {
            const invalidRequest = { ...validRequest, fileData: 'invalid-base64!' };
            const result = validateRequest(prepareCliMintRequestSchema, invalidRequest);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid base64 format');
        });
    });
});
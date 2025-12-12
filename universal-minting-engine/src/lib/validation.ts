import { z } from 'zod';

// Utility validators
const ethereumAddressSchema = z.string().regex(
    /^0x[a-fA-F0-9]{40}$/,
    'Invalid Ethereum address format'
);

const ipfsHashSchema = z.string().regex(
    /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/,
    'Invalid IPFS hash format'
);

const base64Schema = z.string().regex(
    /^[A-Za-z0-9+/]*={0,2}$/,
    'Invalid base64 format'
);

// Core metadata schemas
const creatorSchema = z.object({
    name: z.string().min(1, 'Creator name is required'),
    address: ethereumAddressSchema,
    contributionPercent: z.number().min(0).max(100, 'Contribution percent must be between 0 and 100')
});

const attributeSchema = z.object({
    key: z.string().min(1, 'Attribute key is required'),
    value: z.string().min(1, 'Attribute value is required')
});

const ipMetadataSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
    description: z.string().min(1, 'Description is required').max(2000, 'Description must be less than 2000 characters'),
    createdAt: z.string().optional().refine(
        (val) => {
            if (!val) return true;
            // Accept both ISO datetime and Unix timestamp strings
            return !isNaN(Date.parse(val)) || /^\d+$/.test(val);
        },
        'createdAt must be a valid ISO datetime string or Unix timestamp'
    ),
    creators: z.array(creatorSchema).min(1, 'At least one creator is required'),
    image: z.string().url().optional(),
    imageHash: z.string().optional(),
    mediaUrl: z.string().url().optional(),
    mediaHash: z.string().optional(),
    mediaType: z.string().optional()
}).refine(
    (data) => {
        // Validate that contribution percentages sum to 100
        const totalContribution = data.creators.reduce((sum, creator) => sum + creator.contributionPercent, 0);
        return Math.abs(totalContribution - 100) < 0.01; // Allow for floating point precision
    },
    {
        message: 'Creator contribution percentages must sum to 100',
        path: ['creators']
    }
);

const nftMetadataSchema = z.object({
    name: z.string().min(1, 'NFT name is required').max(100, 'NFT name must be less than 100 characters'),
    description: z.string().min(1, 'NFT description is required').max(1000, 'NFT description must be less than 1000 characters'),
    image: z.string().url().optional(),
    animation_url: z.string().url().optional(),
    attributes: z.array(attributeSchema).optional()
});

const licenseTermsConfigSchema = z.object({
    transferable: z.boolean(),
    royaltyPolicy: ethereumAddressSchema,
    defaultMintingFee: z.string().regex(/^\d+$/, 'Default minting fee must be a valid number string'),
    expiration: z.string().regex(/^\d+$/, 'Expiration must be a valid timestamp string'),
    commercialUse: z.boolean(),
    commercialAttribution: z.boolean(),
    commercializerChecker: ethereumAddressSchema,
    commercializerCheckerData: z.string(),
    commercialRevShare: z.number().min(0).max(100, 'Commercial revenue share must be between 0 and 100'),
    derivativesAllowed: z.boolean(),
    derivativesAttribution: z.boolean(),
    derivativesApproval: z.boolean(),
    derivativesReciprocal: z.boolean(),
    derivativeRevShare: z.number().min(0).max(100, 'Derivative revenue share must be between 0 and 100'),
    currency: ethereumAddressSchema,
    uri: z.string().url('License terms URI must be a valid URL')
});

const fileUploadSchema = z.object({
    data: base64Schema,
    filename: z.string().min(1, 'Filename is required').max(255, 'Filename must be less than 255 characters'),
    contentType: z.string().min(1, 'Content type is required'),
    purpose: z.enum(['media', 'metadata', 'evidence', 'attachment'], {
        errorMap: () => ({ message: 'Purpose must be one of: media, metadata, evidence, attachment' })
    })
});

// API request schemas
export const prepareTransactionRequestSchema = z.object({
    userAddress: ethereumAddressSchema,
    ipMetadata: ipMetadataSchema,
    nftMetadata: nftMetadataSchema,
    licenseTerms: licenseTermsConfigSchema.optional(),
    files: z.array(fileUploadSchema).optional()
});

export const prepareDerivativeRequestSchema = z.object({
    userAddress: ethereumAddressSchema,
    parentIpIds: z.array(z.string().min(1, 'Parent IP ID cannot be empty')).min(1, 'At least one parent IP ID is required'),
    licenseTermsIds: z.array(z.number().int().positive('License terms ID must be a positive integer')).min(1, 'At least one license terms ID is required'),
    ipMetadata: ipMetadataSchema,
    nftMetadata: nftMetadataSchema.optional(),
    spgNftContract: ethereumAddressSchema.optional()
}).refine(
    (data) => data.parentIpIds.length === data.licenseTermsIds.length,
    {
        message: 'Number of parent IP IDs must match number of license terms IDs',
        path: ['licenseTermsIds']
    }
);

export const prepareLicenseRequestSchema = z.object({
    userAddress: ethereumAddressSchema,
    licenseTermsId: z.number().int().positive('License terms ID must be a positive integer'),
    licensorIpId: z.string().min(1, 'Licensor IP ID is required'),
    amount: z.number().int().positive('Amount must be a positive integer')
});

export const prepareRoyaltyRequestSchema = z.object({
    userAddress: ethereumAddressSchema,
    operation: z.enum(['pay', 'claim', 'transfer'], {
        errorMap: () => ({ message: 'Operation must be one of: pay, claim, transfer' })
    }),
    ipId: z.string().min(1, 'IP ID is required'),
    amount: z.string().regex(/^\d+$/, 'Amount must be a valid number string').optional(),
    token: ethereumAddressSchema.optional(),
    recipient: ethereumAddressSchema.optional(),
    currencyTokens: z.array(ethereumAddressSchema).optional()
}).refine(
    (data) => {
        // Validate required fields based on operation type
        if (data.operation === 'pay' && (!data.amount || !data.token)) {
            return false;
        }
        if (data.operation === 'transfer' && (!data.amount || !data.recipient)) {
            return false;
        }
        if (data.operation === 'claim' && !data.currencyTokens) {
            return false;
        }
        return true;
    },
    {
        message: 'Missing required fields for the specified operation',
        path: ['operation']
    }
);

export const prepareCollectionRequestSchema = z.object({
    userAddress: ethereumAddressSchema,
    name: z.string().min(1, 'Collection name is required').max(100, 'Collection name must be less than 100 characters'),
    symbol: z.string().min(1, 'Collection symbol is required').max(10, 'Collection symbol must be less than 10 characters').regex(/^[A-Z0-9]+$/, 'Collection symbol must contain only uppercase letters and numbers'),
    isPublicMinting: z.boolean(),
    mintOpen: z.boolean(),
    mintFeeRecipient: ethereumAddressSchema.optional(),
    contractURI: z.string().url().optional()
});

export const prepareDisputeRequestSchema = z.object({
    userAddress: ethereumAddressSchema,
    targetIpId: z.string().min(1, 'Target IP ID is required'),
    evidence: z.string().min(1, 'Evidence is required').max(10000, 'Evidence must be less than 10000 characters'),
    targetTag: z.string().min(1, 'Target tag is required'),
    bond: z.string().regex(/^\d+$/, 'Bond must be a valid number string'),
    liveness: z.number().int().positive('Liveness must be a positive integer')
});

export const prepareCliMintRequestSchema = z.object({
    userAddress: ethereumAddressSchema,
    filePath: z.string().min(1, 'File path is required'),
    fileData: base64Schema,
    filename: z.string().min(1, 'Filename is required').max(255, 'Filename must be less than 255 characters'),
    contentType: z.string().min(1, 'Content type is required'),
    title: z.string().max(200, 'Title must be less than 200 characters').optional(),
    description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
    generateMetadata: z.boolean().optional(),
    contentHash: z.string().optional(),
    licenseTerms: licenseTermsConfigSchema.optional()
});

// Validation helper functions
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
    try {
        const validatedData = schema.parse(data);
        return { success: true, data: validatedData };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
            return { success: false, error: errorMessages };
        }
        return { success: false, error: 'Unknown validation error' };
    }
}

export function validateWalletAddress(address: string): boolean {
    return ethereumAddressSchema.safeParse(address).success;
}

export function validateIPFSHash(hash: string): boolean {
    return ipfsHashSchema.safeParse(hash).success;
}

// Export individual schemas for use in API routes
export {
    ethereumAddressSchema,
    ipfsHashSchema,
    base64Schema,
    creatorSchema,
    attributeSchema,
    ipMetadataSchema,
    nftMetadataSchema,
    licenseTermsConfigSchema,
    fileUploadSchema
};
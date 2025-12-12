import { createHash } from 'crypto';
import { IPMetadata, NFTMetadata, Creator, Attribute } from '@/types';

/**
 * Metadata construction utilities for IP assets and NFTs
 * Provides builders for creating properly formatted metadata objects
 * and utilities for generating content hashes and automatic metadata
 */

export interface MetadataBuilderOptions {
    includeTimestamp?: boolean;
    defaultCreator?: {
        name: string;
        address: string;
    };
}

export interface AutoMetadataOptions {
    filename: string;
    contentType: string;
    fileSize?: number;
    contentHash?: string;
    userAddress: string;
    userName?: string;
}

/**
 * Builder class for constructing IP metadata objects
 */
export class IPMetadataBuilder {
    private metadata: Partial<IPMetadata> = {};

    constructor(private options: MetadataBuilderOptions = {}) { }

    title(title: string): this {
        this.metadata.title = title.trim();
        return this;
    }

    description(description: string): this {
        this.metadata.description = description.trim();
        return this;
    }

    creator(name: string, address: string, contributionPercent: number = 100): this {
        if (!this.metadata.creators) {
            this.metadata.creators = [];
        }
        this.metadata.creators.push({
            name: name.trim(),
            address: address.toLowerCase(),
            contributionPercent
        });
        return this;
    }

    creators(creators: Creator[]): this {
        this.metadata.creators = creators.map(creator => ({
            ...creator,
            name: creator.name.trim(),
            address: creator.address.toLowerCase()
        }));
        return this;
    }

    image(imageUrl: string, imageHash?: string): this {
        this.metadata.image = imageUrl;
        if (imageHash) {
            this.metadata.imageHash = imageHash;
        }
        return this;
    }

    media(mediaUrl: string, mediaType: string, mediaHash?: string): this {
        this.metadata.mediaUrl = mediaUrl;
        this.metadata.mediaType = mediaType;
        if (mediaHash) {
            this.metadata.mediaHash = mediaHash;
        }
        return this;
    }

    build(): IPMetadata {
        // Add timestamp if requested
        if (this.options.includeTimestamp && !this.metadata.createdAt) {
            this.metadata.createdAt = new Date().toISOString();
        }

        // Add default creator if none provided
        if (!this.metadata.creators?.length && this.options.defaultCreator) {
            this.metadata.creators = [{
                name: this.options.defaultCreator.name,
                address: this.options.defaultCreator.address.toLowerCase(),
                contributionPercent: 100
            }];
        }

        // Validate required fields
        if (!this.metadata.title) {
            throw new Error('Title is required for IP metadata');
        }
        if (!this.metadata.description) {
            throw new Error('Description is required for IP metadata');
        }
        if (!this.metadata.creators?.length) {
            throw new Error('At least one creator is required for IP metadata');
        }

        // Validate contribution percentages sum to 100
        const totalContribution = this.metadata.creators.reduce(
            (sum, creator) => sum + creator.contributionPercent,
            0
        );
        if (Math.abs(totalContribution - 100) > 0.01) {
            throw new Error('Creator contribution percentages must sum to 100');
        }

        return this.metadata as IPMetadata;
    }
}

/**
 * Builder class for constructing NFT metadata objects
 */
export class NFTMetadataBuilder {
    private metadata: Partial<NFTMetadata> = {};

    name(name: string): this {
        this.metadata.name = name.trim();
        return this;
    }

    description(description: string): this {
        this.metadata.description = description.trim();
        return this;
    }

    image(imageUrl: string): this {
        this.metadata.image = imageUrl;
        return this;
    }

    animationUrl(animationUrl: string): this {
        this.metadata.animation_url = animationUrl;
        return this;
    }

    attribute(key: string, value: string): this {
        if (!this.metadata.attributes) {
            this.metadata.attributes = [];
        }
        this.metadata.attributes.push({
            trait_type: key.trim(),
            value: value.trim()
        });
        return this;
    }

    attributes(attributes: Attribute[]): this {
        this.metadata.attributes = attributes.map(attr => ({
            trait_type: attr.key.trim(),
            value: typeof attr.value === 'string' ? attr.value.trim() : attr.value
        }));
        return this;
    }

    build(): NFTMetadata {
        // Validate required fields
        if (!this.metadata.name) {
            throw new Error('Name is required for NFT metadata');
        }
        if (!this.metadata.description) {
            throw new Error('Description is required for NFT metadata');
        }

        return this.metadata as NFTMetadata;
    }
}

/**
 * Generate automatic metadata for CLI use cases
 */
export function generateAutoMetadata(options: AutoMetadataOptions): {
    ipMetadata: IPMetadata;
    nftMetadata: NFTMetadata;
} {
    const { filename, contentType, fileSize, contentHash, userAddress, userName } = options;

    // Extract file extension and base name
    const lastDotIndex = filename.lastIndexOf('.');
    const baseName = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex + 1) : '';

    // Generate title from filename
    const title = baseName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();

    // Generate description based on file type
    let description = `Digital asset: ${filename}`;
    if (contentType.startsWith('image/')) {
        description = `Image file: ${filename}`;
    } else if (contentType.startsWith('video/')) {
        description = `Video file: ${filename}`;
    } else if (contentType.startsWith('audio/')) {
        description = `Audio file: ${filename}`;
    } else if (contentType.startsWith('text/') || contentType.includes('json')) {
        description = `Document: ${filename}`;
    } else if (contentType.includes('pdf')) {
        description = `PDF document: ${filename}`;
    }

    if (fileSize) {
        description += ` (${formatFileSize(fileSize)})`;
    }

    // Build IP metadata
    const ipMetadataBuilder = new IPMetadataBuilder({ includeTimestamp: true })
        .title(title)
        .description(description)
        .creator(userName || 'Anonymous', userAddress, 100);

    // Build NFT metadata with attributes
    const nftMetadataBuilder = new NFTMetadataBuilder()
        .name(title)
        .description(description)
        .attribute('File Name', filename)
        .attribute('Content Type', contentType);

    if (extension) {
        nftMetadataBuilder.attribute('File Extension', extension.toUpperCase());
    }

    if (fileSize) {
        nftMetadataBuilder.attribute('File Size', formatFileSize(fileSize));
    }

    if (contentHash) {
        nftMetadataBuilder.attribute('Content Hash', contentHash);
    }

    nftMetadataBuilder.attribute('Minted At', new Date().toISOString());

    return {
        ipMetadata: ipMetadataBuilder.build(),
        nftMetadata: nftMetadataBuilder.build()
    };
}

/**
 * Generate SHA-256 hash of metadata for integrity verification
 */
export function generateMetadataHash(metadata: IPMetadata | NFTMetadata): string {
    // Create a normalized string representation for consistent hashing
    const normalizedMetadata = JSON.stringify(metadata, Object.keys(metadata).sort());
    return createHash('sha256').update(normalizedMetadata, 'utf8').digest('hex');
}

/**
 * Generate content hash from file data
 */
export function generateContentHash(fileData: Buffer | string): string {
    const data = typeof fileData === 'string' ? Buffer.from(fileData, 'base64') : fileData;
    return createHash('sha256').update(data).digest('hex');
}

/**
 * Validate metadata objects against Story Protocol requirements
 */
export function validateIPMetadata(metadata: IPMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata.title || metadata.title.trim().length === 0) {
        errors.push('Title is required and cannot be empty');
    }

    if (!metadata.description || metadata.description.trim().length === 0) {
        errors.push('Description is required and cannot be empty');
    }

    if (!metadata.creators || metadata.creators.length === 0) {
        errors.push('At least one creator is required');
    } else {
        const totalContribution = metadata.creators.reduce(
            (sum, creator) => sum + creator.contributionPercent,
            0
        );
        if (Math.abs(totalContribution - 100) > 0.01) {
            errors.push('Creator contribution percentages must sum to 100');
        }

        metadata.creators.forEach((creator, index) => {
            if (!creator.name || creator.name.trim().length === 0) {
                errors.push(`Creator ${index + 1}: Name is required`);
            }
            if (!creator.address || !/^0x[a-fA-F0-9]{40}$/.test(creator.address)) {
                errors.push(`Creator ${index + 1}: Invalid Ethereum address format`);
            }
            if (creator.contributionPercent < 0 || creator.contributionPercent > 100) {
                errors.push(`Creator ${index + 1}: Contribution percent must be between 0 and 100`);
            }
        });
    }

    return { valid: errors.length === 0, errors };
}

export function validateNFTMetadata(metadata: NFTMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata.name || metadata.name.trim().length === 0) {
        errors.push('Name is required and cannot be empty');
    }

    if (!metadata.description || metadata.description.trim().length === 0) {
        errors.push('Description is required and cannot be empty');
    }

    if (metadata.attributes) {
        metadata.attributes.forEach((attr, index) => {
            if (!attr.trait_type || attr.trait_type.trim().length === 0) {
                errors.push(`Attribute ${index + 1}: Trait type is required`);
            }
            if (!attr.value || (typeof attr.value === 'string' && attr.value.trim().length === 0)) {
                errors.push(`Attribute ${index + 1}: Value is required`);
            }
        });
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Utility function to format file sizes in human-readable format
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create metadata builders with default options
 */
export function createIPMetadataBuilder(options?: MetadataBuilderOptions): IPMetadataBuilder {
    return new IPMetadataBuilder(options);
}

export function createNFTMetadataBuilder(): NFTMetadataBuilder {
    return new NFTMetadataBuilder();
}

/**
 * Convenience function to create both IP and NFT metadata from basic inputs
 */
export function createBasicMetadata(
    title: string,
    description: string,
    creatorName: string,
    creatorAddress: string
): { ipMetadata: IPMetadata; nftMetadata: NFTMetadata } {
    const ipMetadata = createIPMetadataBuilder({ includeTimestamp: true })
        .title(title)
        .description(description)
        .creator(creatorName, creatorAddress, 100)
        .build();

    const nftMetadata = createNFTMetadataBuilder()
        .name(title)
        .description(description)
        .build();

    return { ipMetadata, nftMetadata };
}
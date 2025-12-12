import { NextRequest, NextResponse } from 'next/server';
import { getStoryClient } from '@/lib/story-client';
import { validateWalletAddress } from '@/lib/transaction-builders';
import { createErrorNextResponse, ErrorCode, logError } from '@/lib/error-handler';
import { Address } from 'viem';

interface GetAssetsRequest {
    address: string;
    includeMetadata?: boolean;
    limit?: number;
    offset?: number;
}

interface IPAsset {
    ipId: string;
    owner: string;
    name?: string;
    description?: string;
    image?: string;
    metadataURI?: string;
    nftContract?: string;
    tokenId?: string;
    blockNumber?: number;
    blockTimestamp?: number;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');
        const includeMetadata = searchParams.get('includeMetadata') === 'true';
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Validate required parameters
        if (!address) {
            return createErrorNextResponse(
                ErrorCode.VALIDATION_ERROR,
                'Address parameter is required'
            );
        }

        // Validate address format
        if (!validateWalletAddress(address)) {
            return createErrorNextResponse(
                ErrorCode.INVALID_ADDRESS,
                'Invalid Ethereum address format',
                { provided: address }
            );
        }

        // Validate pagination parameters
        if (limit < 1 || limit > 100) {
            return createErrorNextResponse(
                ErrorCode.VALIDATION_ERROR,
                'Limit must be between 1 and 100'
            );
        }

        if (offset < 0) {
            return createErrorNextResponse(
                ErrorCode.VALIDATION_ERROR,
                'Offset must be non-negative'
            );
        }

        const storyClient = getStoryClient();

        try {
            // Note: Story Protocol SDK doesn't have getIpAssetsByOwner method
            // This would need to be implemented using the Graph API or other indexing service
            // For now, return empty array with proper structure
            const ipAssets: any[] = [];

            const assets: IPAsset[] = [];

            if (ipAssets && ipAssets.length > 0) {
                for (const asset of ipAssets) {
                    const ipAsset: IPAsset = {
                        ipId: asset.ipId,
                        owner: asset.owner,
                        nftContract: asset.nftContract,
                        tokenId: asset.tokenId?.toString(),
                        blockNumber: asset.blockNumber,
                        blockTimestamp: asset.blockTimestamp
                    };

                    // Fetch metadata if requested
                    if (includeMetadata && asset.metadataURI) {
                        try {
                            const metadataResponse = await fetch(asset.metadataURI);
                            if (metadataResponse.ok) {
                                const metadata = await metadataResponse.json();
                                ipAsset.name = metadata.title || metadata.name;
                                ipAsset.description = metadata.description;
                                ipAsset.image = metadata.image;
                                ipAsset.metadataURI = asset.metadataURI;
                            }
                        } catch (metadataError) {
                            console.warn(`Failed to fetch metadata for ${asset.ipId}:`, metadataError);
                            ipAsset.metadataURI = asset.metadataURI;
                        }
                    }

                    assets.push(ipAsset);
                }
            }

            const response = {
                success: true,
                data: {
                    address,
                    assets,
                    pagination: {
                        limit,
                        offset,
                        total: assets.length,
                        hasMore: assets.length === limit
                    },
                    metadata: {
                        includeMetadata,
                        timestamp: new Date().toISOString()
                    }
                }
            };

            return NextResponse.json(response);

        } catch (storyError) {
            console.error('Story Protocol query failed:', storyError);
            return createErrorNextResponse(
                ErrorCode.STORY_CLIENT_ERROR,
                'Failed to query IP Assets from Story Protocol',
                { error: storyError instanceof Error ? storyError.message : 'Unknown error' }
            );
        }

    } catch (error) {
        console.error('Get assets failed:', error);
        const requestId = logError('/api/get-assets', ErrorCode.INTERNAL_ERROR, error);
        return createErrorNextResponse(
            ErrorCode.INTERNAL_ERROR,
            'Failed to retrieve assets',
            { requestId }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: GetAssetsRequest = await request.json();

        // Validate required fields
        if (!body.address) {
            return createErrorNextResponse(
                ErrorCode.VALIDATION_ERROR,
                'Address is required'
            );
        }

        // Validate address format
        if (!validateWalletAddress(body.address)) {
            return createErrorNextResponse(
                ErrorCode.INVALID_ADDRESS,
                'Invalid Ethereum address format',
                { provided: body.address }
            );
        }

        const limit = Math.min(body.limit || 50, 100);
        const offset = Math.max(body.offset || 0, 0);
        const includeMetadata = body.includeMetadata || false;

        const storyClient = getStoryClient();

        try {
            // Note: Story Protocol SDK doesn't have getIpAssetsByOwner method
            // This would need to be implemented using the Graph API or other indexing service
            // For now, return empty array with proper structure
            const ipAssets: any[] = [];

            const assets: IPAsset[] = [];

            if (ipAssets && ipAssets.length > 0) {
                for (const asset of ipAssets) {
                    const ipAsset: IPAsset = {
                        ipId: asset.ipId,
                        owner: asset.owner,
                        nftContract: asset.nftContract,
                        tokenId: asset.tokenId?.toString(),
                        blockNumber: asset.blockNumber,
                        blockTimestamp: asset.blockTimestamp
                    };

                    // Fetch metadata if requested
                    if (includeMetadata && asset.metadataURI) {
                        try {
                            const metadataResponse = await fetch(asset.metadataURI);
                            if (metadataResponse.ok) {
                                const metadata = await metadataResponse.json();
                                ipAsset.name = metadata.title || metadata.name;
                                ipAsset.description = metadata.description;
                                ipAsset.image = metadata.image;
                                ipAsset.metadataURI = asset.metadataURI;
                            }
                        } catch (metadataError) {
                            console.warn(`Failed to fetch metadata for ${asset.ipId}:`, metadataError);
                            ipAsset.metadataURI = asset.metadataURI;
                        }
                    }

                    assets.push(ipAsset);
                }
            }

            // Also get license tokens owned by the address
            let licenseTokens: any[] = [];
            try {
                // Note: Story Protocol SDK method may not exist or may have different signature
                // For now, return empty array
                licenseTokens = [];
            } catch (licenseError) {
                console.warn('Failed to fetch license tokens:', licenseError);
            }

            const response = {
                success: true,
                data: {
                    address: body.address,
                    ipAssets: assets,
                    licenseTokens,
                    pagination: {
                        limit,
                        offset,
                        total: assets.length,
                        hasMore: assets.length === limit
                    },
                    metadata: {
                        includeMetadata,
                        timestamp: new Date().toISOString()
                    }
                }
            };

            return NextResponse.json(response);

        } catch (storyError) {
            console.error('Story Protocol query failed:', storyError);
            return createErrorNextResponse(
                ErrorCode.STORY_CLIENT_ERROR,
                'Failed to query assets from Story Protocol',
                { error: storyError instanceof Error ? storyError.message : 'Unknown error' }
            );
        }

    } catch (error) {
        console.error('Get assets failed:', error);
        const requestId = logError('/api/get-assets', ErrorCode.INTERNAL_ERROR, error);
        return createErrorNextResponse(
            ErrorCode.INTERNAL_ERROR,
            'Failed to retrieve assets',
            { requestId }
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
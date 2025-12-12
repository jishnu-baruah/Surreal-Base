import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/config';
import { validateWalletAddress } from '@/lib/transaction-builders';
import { createErrorNextResponse, ErrorCode } from '@/lib/error-handler';
import { Address, erc721Abi } from 'viem';

interface NFTInfo {
    contractAddress: string;
    tokenId: string;
    tokenURI?: string;
    metadata?: {
        name?: string;
        description?: string;
        image?: string;
        attributes?: any[];
    };
    isStoryProtocol?: boolean;
}

// Known Story Protocol contract addresses (you can expand this list)
const STORY_PROTOCOL_CONTRACTS = [
    '0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424', // SPG contract
    // Add more known Story Protocol contracts here
];

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');
        const contracts = searchParams.get('contracts')?.split(',') || [];
        const includeMetadata = searchParams.get('includeMetadata') === 'true';

        if (!address) {
            return createErrorNextResponse(
                ErrorCode.VALIDATION_ERROR,
                'Address parameter is required'
            );
        }

        if (!validateWalletAddress(address)) {
            return createErrorNextResponse(
                ErrorCode.INVALID_ADDRESS,
                'Invalid Ethereum address format'
            );
        }

        const publicClient = createPublicClient();
        const nfts: NFTInfo[] = [];

        // If specific contracts are provided, check those
        if (contracts.length > 0) {
            for (const contractAddress of contracts) {
                if (!validateWalletAddress(contractAddress)) {
                    continue; // Skip invalid contract addresses
                }

                try {
                    // Get balance for this contract
                    const balance = await publicClient.readContract({
                        address: contractAddress as Address,
                        abi: erc721Abi,
                        functionName: 'balanceOf',
                        args: [address as Address]
                    });

                    if (balance > 0n) {
                        // For simplicity, we'll try to get token IDs by checking sequential IDs
                        // In a production system, you'd want to use events or a more sophisticated method
                        for (let i = 0; i < Math.min(Number(balance), 10); i++) {
                            try {
                                const tokenId = BigInt(i);
                                const owner = await publicClient.readContract({
                                    address: contractAddress as Address,
                                    abi: erc721Abi,
                                    functionName: 'ownerOf',
                                    args: [tokenId]
                                });

                                if (owner.toLowerCase() === address.toLowerCase()) {
                                    const nftInfo: NFTInfo = {
                                        contractAddress,
                                        tokenId: tokenId.toString(),
                                        isStoryProtocol: STORY_PROTOCOL_CONTRACTS.includes(contractAddress)
                                    };

                                    // Get token URI if requested
                                    if (includeMetadata) {
                                        try {
                                            const tokenURI = await publicClient.readContract({
                                                address: contractAddress as Address,
                                                abi: erc721Abi,
                                                functionName: 'tokenURI',
                                                args: [tokenId]
                                            });

                                            nftInfo.tokenURI = tokenURI;

                                            // Fetch metadata from URI
                                            if (tokenURI) {
                                                try {
                                                    const metadataResponse = await fetch(tokenURI);
                                                    if (metadataResponse.ok) {
                                                        nftInfo.metadata = await metadataResponse.json();
                                                    }
                                                } catch (metadataError) {
                                                    console.warn(`Failed to fetch metadata for ${contractAddress}:${tokenId}`);
                                                }
                                            }
                                        } catch (uriError) {
                                            console.warn(`Failed to get tokenURI for ${contractAddress}:${tokenId}`);
                                        }
                                    }

                                    nfts.push(nftInfo);
                                }
                            } catch (ownerError) {
                                // Token doesn't exist or other error, continue
                                continue;
                            }
                        }
                    }
                } catch (contractError) {
                    console.warn(`Failed to query contract ${contractAddress}:`, contractError);
                    continue;
                }
            }
        } else {
            // If no specific contracts provided, check known Story Protocol contracts
            for (const contractAddress of STORY_PROTOCOL_CONTRACTS) {
                try {
                    const balance = await publicClient.readContract({
                        address: contractAddress as Address,
                        abi: erc721Abi,
                        functionName: 'balanceOf',
                        args: [address as Address]
                    });

                    if (balance > 0n) {
                        nfts.push({
                            contractAddress,
                            tokenId: 'multiple', // Placeholder since we found a balance
                            isStoryProtocol: true
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to check balance for ${contractAddress}:`, error);
                }
            }
        }

        const response = {
            success: true,
            data: {
                address,
                nfts,
                contractsChecked: contracts.length > 0 ? contracts : STORY_PROTOCOL_CONTRACTS,
                metadata: {
                    includeMetadata,
                    timestamp: new Date().toISOString(),
                    note: contracts.length === 0 ? 'Only checked known Story Protocol contracts. Provide specific contract addresses for comprehensive results.' : undefined
                }
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Get NFTs failed:', error);
        return createErrorNextResponse(
            ErrorCode.INTERNAL_ERROR,
            'Failed to retrieve NFTs'
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { address, contracts = [], includeMetadata = false } = body;

        if (!address) {
            return createErrorNextResponse(
                ErrorCode.VALIDATION_ERROR,
                'Address is required'
            );
        }

        if (!validateWalletAddress(address)) {
            return createErrorNextResponse(
                ErrorCode.INVALID_ADDRESS,
                'Invalid Ethereum address format'
            );
        }

        // Redirect to GET method with query parameters
        const searchParams = new URLSearchParams({
            address,
            includeMetadata: includeMetadata.toString()
        });

        if (contracts.length > 0) {
            searchParams.set('contracts', contracts.join(','));
        }

        const getUrl = new URL(`/api/get-nfts?${searchParams}`, request.url);
        const getRequest = new NextRequest(getUrl, { method: 'GET' });

        return GET(getRequest);

    } catch (error) {
        console.error('Get NFTs POST failed:', error);
        return createErrorNextResponse(
            ErrorCode.INTERNAL_ERROR,
            'Failed to retrieve NFTs'
        );
    }
}
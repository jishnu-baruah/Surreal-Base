import { NextRequest, NextResponse } from 'next/server';
import { uploadJSONToIPFS } from '@/lib/ipfs';
import { validateWalletAddress } from '@/lib/transaction-builders';
import { createErrorNextResponse, ErrorCode, logSuccess } from '@/lib/error-handler';
import { getNetworkInfo } from '@/lib/story-client';

interface LicenseRemixerRequest {
    // Basic Info
    title?: string;
    description?: string;
    creatorAddress: string;
    creatorName?: string;
    creatorEmail?: string;

    // License Type (preset or custom)
    licenseType?: 'commercial-remix' | 'non-commercial' | 'commercial-no-derivatives' | 'custom';

    // Core Parameters
    commercialUse: boolean;
    derivativesAllowed: boolean;
    attributionRequired: boolean;
    reciprocal: boolean;

    // Revenue Sharing
    revenueSharePercentage: number; // 0-100
    mintingFee?: string; // in ETH
    currency?: 'ETH' | 'IP' | 'USDC';

    // Restrictions
    prohibitedUses?: string[];
    territory?: string;
    duration?: string;

    // Advanced Options
    transferable?: boolean;
    expiration?: number; // timestamp or 0 for no expiration
    commercialRevCeiling?: number;
    derivativeRevCeiling?: number;

    // Legal Framework
    governingLaw?: string;
    disputeResolution?: string;

    // Output Options
    uploadToIPFS?: boolean;
    includeExamples?: boolean;
    format?: 'json' | 'markdown' | 'both';
}

interface LicenseTemplate {
    name: string;
    description: string;
    useCase: string;
    parameters: Partial<LicenseRemixerRequest>;
}

// Predefined license templates
const LICENSE_TEMPLATES: Record<string, LicenseTemplate> = {
    'commercial-remix': {
        name: 'Commercial Remix License',
        description: 'Allows commercial use and derivatives with revenue sharing',
        useCase: 'Music, art, content that you want to monetize while allowing remixes',
        parameters: {
            commercialUse: true,
            derivativesAllowed: true,
            attributionRequired: true,
            reciprocal: true,
            revenueSharePercentage: 10,
            transferable: true,
            prohibitedUses: [
                'Hate speech or discriminatory content',
                'Illegal activities',
                'Misrepresentation as original creator'
            ]
        }
    },
    'non-commercial': {
        name: 'Non-Commercial Social Remixing',
        description: 'Free use for non-commercial purposes with attribution',
        useCase: 'Educational content, open source projects, community art',
        parameters: {
            commercialUse: false,
            derivativesAllowed: true,
            attributionRequired: true,
            reciprocal: true,
            revenueSharePercentage: 0,
            transferable: true,
            prohibitedUses: [
                'Commercial use without permission',
                'Removal of attribution',
                'Hate speech or discriminatory content'
            ]
        }
    },
    'commercial-no-derivatives': {
        name: 'Commercial License (No Derivatives)',
        description: 'Commercial use allowed but no modifications',
        useCase: 'Photography, finished artwork, branded content',
        parameters: {
            commercialUse: true,
            derivativesAllowed: false,
            attributionRequired: true,
            reciprocal: false,
            revenueSharePercentage: 15,
            transferable: true,
            prohibitedUses: [
                'Modification or derivative works',
                'Resale as original work',
                'Use without attribution'
            ]
        }
    },
    'exclusive-commercial': {
        name: 'Exclusive Commercial License',
        description: 'High-value exclusive licensing with significant revenue share',
        useCase: 'Premium content, exclusive partnerships, high-value IP',
        parameters: {
            commercialUse: true,
            derivativesAllowed: true,
            attributionRequired: true,
            reciprocal: false,
            revenueSharePercentage: 25,
            transferable: false,
            prohibitedUses: [
                'Sublicensing without permission',
                'Competing uses',
                'Brand dilution'
            ]
        }
    }
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        // Return available templates
        if (action === 'templates') {
            return NextResponse.json({
                success: true,
                data: {
                    templates: LICENSE_TEMPLATES,
                    supportedCurrencies: ['ETH', 'IP', 'USDC'],
                    revenueShareRange: { min: 0, max: 50 },
                    commonPercentages: [0, 5, 10, 15, 20, 25],
                    examples: {
                        music: 'commercial-remix',
                        art: 'commercial-no-derivatives',
                        education: 'non-commercial',
                        premium: 'exclusive-commercial'
                    }
                }
            });
        }

        // Return specific template
        const templateName = searchParams.get('template');
        if (templateName && LICENSE_TEMPLATES[templateName]) {
            return NextResponse.json({
                success: true,
                data: {
                    template: LICENSE_TEMPLATES[templateName],
                    customizationTips: [
                        'Adjust revenue share percentage based on your IP value',
                        'Add specific prohibited uses for your industry',
                        'Consider territory restrictions for global licensing',
                        'Set appropriate minting fees to prevent spam'
                    ]
                }
            });
        }

        // Return usage instructions
        return NextResponse.json({
            success: true,
            data: {
                usage: 'License Remixer API - Create custom license terms',
                endpoints: {
                    'GET ?action=templates': 'List all available license templates',
                    'GET ?template=name': 'Get specific template details',
                    'POST': 'Create custom license terms document'
                },
                examples: {
                    getTemplates: '/api/license-remixer?action=templates',
                    getTemplate: '/api/license-remixer?template=commercial-remix',
                    createLicense: 'POST with license parameters'
                }
            }
        });

    } catch (error) {
        console.error('License remixer GET failed:', error);
        return createErrorNextResponse(
            ErrorCode.INTERNAL_ERROR,
            'Failed to process license remixer request'
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: LicenseRemixerRequest = await request.json();

        // Validate required fields
        if (!body.creatorAddress) {
            return createErrorNextResponse(
                ErrorCode.VALIDATION_ERROR,
                'Creator address is required'
            );
        }

        if (!validateWalletAddress(body.creatorAddress)) {
            return createErrorNextResponse(
                ErrorCode.INVALID_ADDRESS,
                'Invalid creator address format'
            );
        }

        if (typeof body.commercialUse !== 'boolean' || typeof body.derivativesAllowed !== 'boolean') {
            return createErrorNextResponse(
                ErrorCode.VALIDATION_ERROR,
                'commercialUse and derivativesAllowed must be boolean values'
            );
        }

        if (body.revenueSharePercentage < 0 || body.revenueSharePercentage > 50) {
            return createErrorNextResponse(
                ErrorCode.VALIDATION_ERROR,
                'Revenue share percentage must be between 0 and 50'
            );
        }

        // Apply template if specified
        let licenseParams = { ...body };
        if (body.licenseType && LICENSE_TEMPLATES[body.licenseType]) {
            const template = LICENSE_TEMPLATES[body.licenseType];
            licenseParams = {
                ...template.parameters,
                ...body // User overrides take precedence
            };
        }

        // Set defaults
        const networkInfo = getNetworkInfo();
        const timestamp = new Date().toISOString();

        const licenseDocument = {
            // Header
            title: licenseParams.title || `${licenseParams.licenseType || 'Custom'} License Terms`,
            version: '1.0',
            effectiveDate: timestamp,
            licenseType: licenseParams.licenseType || 'custom',

            // Creator Information
            creator: {
                name: licenseParams.creatorName || 'IP Creator',
                address: licenseParams.creatorAddress,
                email: licenseParams.creatorEmail,
                contact: 'Via Story Protocol network'
            },

            // License Summary
            summary: {
                description: generateLicenseDescription(licenseParams),
                keyTerms: generateKeyTerms(licenseParams),
                quickReference: {
                    commercialUse: licenseParams.commercialUse ? 'Allowed' : 'Not allowed',
                    derivatives: licenseParams.derivativesAllowed ? 'Allowed' : 'Not allowed',
                    revenueShare: `${licenseParams.revenueSharePercentage}%`,
                    attribution: licenseParams.attributionRequired ? 'Required' : 'Not required',
                    reciprocal: licenseParams.reciprocal ? 'Required for derivatives' : 'Not required'
                }
            },

            // Detailed Terms
            terms: {
                permissions: {
                    commercialUse: {
                        allowed: licenseParams.commercialUse,
                        revenueShare: licenseParams.revenueSharePercentage,
                        currency: licenseParams.currency || 'ETH',
                        description: licenseParams.commercialUse
                            ? `Commercial use is permitted with ${licenseParams.revenueSharePercentage}% revenue sharing.`
                            : 'Commercial use is not permitted under this license.'
                    },
                    derivativeWorks: {
                        allowed: licenseParams.derivativesAllowed,
                        reciprocal: licenseParams.reciprocal,
                        attribution: licenseParams.attributionRequired,
                        description: generateDerivativeDescription(licenseParams)
                    },
                    distribution: {
                        allowed: true,
                        transferable: licenseParams.transferable !== false,
                        description: 'Distribution and sharing of the IP Asset is permitted under the terms of this license.'
                    }
                },

                conditions: {
                    attribution: {
                        required: licenseParams.attributionRequired !== false,
                        format: 'Based on [TITLE] by [CREATOR] - Licensed under Story Protocol',
                        placement: 'Must be clearly visible and accessible',
                        examples: licenseParams.includeExamples ? [
                            'In video credits: "Music by [Creator] - Story Protocol License"',
                            'In app footer: "Artwork licensed from [Creator] via Story Protocol"',
                            'In derivative work: "Remix of [Original] by [Creator]"'
                        ] : undefined
                    },
                    revenueSharing: licenseParams.commercialUse ? {
                        percentage: licenseParams.revenueSharePercentage,
                        currency: licenseParams.currency || 'ETH',
                        calculation: 'Based on gross revenue before expenses',
                        payment: 'Automated through Story Protocol smart contracts',
                        frequency: 'Real-time or periodic settlements',
                        minimumThreshold: licenseParams.mintingFee || '0.01 ETH'
                    } : undefined,
                    registration: {
                        required: true,
                        platform: 'Story Protocol network',
                        description: 'All commercial uses must be registered on-chain'
                    }
                },

                restrictions: {
                    prohibited: licenseParams.prohibitedUses || [
                        'Hate speech or discriminatory content',
                        'Illegal activities',
                        'Misrepresentation as original creator'
                    ],
                    territory: licenseParams.territory || 'Worldwide',
                    duration: licenseParams.duration || 'Perpetual',
                    termination: 'Automatic upon breach of license terms'
                }
            },

            // Technical Implementation
            technical: {
                storyProtocol: {
                    network: networkInfo.network || 'Aeneid Testnet',
                    chainId: networkInfo.chain?.id || 1513,
                    explorer: networkInfo.protocolExplorer,
                    smartContractEnforced: true
                },
                parameters: {
                    transferable: licenseParams.transferable !== false,
                    commercialUse: licenseParams.commercialUse,
                    commercialRevShare: licenseParams.revenueSharePercentage * 100, // Convert to basis points
                    derivativesAllowed: licenseParams.derivativesAllowed,
                    derivativesReciprocal: licenseParams.reciprocal,
                    currency: getCurrencyAddress(licenseParams.currency),
                    mintingFee: licenseParams.mintingFee || '0',
                    expiration: licenseParams.expiration || 0
                }
            },

            // Legal Framework
            legal: {
                governingLaw: licenseParams.governingLaw || 'Delaware, United States',
                disputeResolution: licenseParams.disputeResolution || 'Story Protocol arbitration system',
                liability: 'IP provided "as is" without warranties',
                compliance: 'Users responsible for local law compliance'
            },

            // Metadata
            metadata: {
                createdAt: timestamp,
                createdBy: licenseParams.creatorAddress,
                generator: 'Story Protocol License Remixer API',
                version: '1.0',
                format: 'Story Protocol License Terms'
            }
        };

        let result: any = {
            success: true,
            data: {
                licenseDocument,
                storyProtocolParameters: {
                    transferable: licenseParams.transferable !== false,
                    royaltyPolicy: '0x0000000000000000000000000000000000000000',
                    defaultMintingFee: licenseParams.mintingFee ?
                        (Number(licenseParams.mintingFee) * 1000000000000000000).toString() : '0',
                    expiration: (licenseParams.expiration || 0).toString(),
                    commercialUse: licenseParams.commercialUse,
                    commercialAttribution: licenseParams.attributionRequired !== false,
                    commercializerChecker: '0x0000000000000000000000000000000000000000',
                    commercializerCheckerData: '0x',
                    commercialRevShare: licenseParams.revenueSharePercentage,
                    commercialRevCeiling: '0',
                    derivativesAllowed: licenseParams.derivativesAllowed,
                    derivativesAttribution: licenseParams.attributionRequired !== false,
                    derivativesApproval: false,
                    derivativesReciprocal: licenseParams.reciprocal !== false,
                    derivativeRevShare: licenseParams.revenueSharePercentage,
                    derivativeRevCeiling: '0',
                    currency: getCurrencyAddress(licenseParams.currency),
                    uri: 'https://github.com/piplabs/pil-document/blob/main/off-chain-terms/commercial-remix.json'
                },
                usage: {
                    description: 'Use the storyProtocolParameters in your IP registration',
                    example: 'See the API documentation for registerIpAsset usage'
                }
            }
        };

        // Upload to IPFS by default (required for Story Protocol)
        if (body.uploadToIPFS !== false) {
            try {
                const ipfsHash = await uploadJSONToIPFS(licenseDocument);
                const licenseTermsURI = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

                result.data.ipfs = {
                    hash: ipfsHash,
                    uri: licenseTermsURI,
                    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
                };

                // Add URI to Story Protocol parameters
                result.data.storyProtocolParameters.uri = licenseTermsURI;

                logSuccess('/api/license-remixer', 'License terms uploaded to IPFS', {
                    ipfsHash,
                    creatorAddress: body.creatorAddress,
                    licenseType: body.licenseType
                });

            } catch (ipfsError) {
                console.error('IPFS upload failed:', ipfsError);
                result.data.ipfsError = 'Failed to upload to IPFS, but license document was created successfully';
            }
        }

        // Generate markdown format if requested
        if (body.format === 'markdown' || body.format === 'both') {
            result.data.markdown = generateMarkdownLicense(licenseDocument);
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('License remixer POST failed:', error);
        return createErrorNextResponse(
            ErrorCode.INTERNAL_ERROR,
            'Failed to create license terms'
        );
    }
}

// Helper functions
function generateLicenseDescription(params: LicenseRemixerRequest): string {
    const commercial = params.commercialUse ? 'commercial' : 'non-commercial';
    const derivatives = params.derivativesAllowed ? 'with derivative works allowed' : 'without derivative works';
    const revenue = params.commercialUse ? ` and ${params.revenueSharePercentage}% revenue sharing` : '';

    return `This license permits ${commercial} use ${derivatives}${revenue}.`;
}

function generateKeyTerms(params: LicenseRemixerRequest): string[] {
    const terms = [];

    terms.push(`Commercial use: ${params.commercialUse ? 'Allowed' : 'Not allowed'}`);
    terms.push(`Derivative works: ${params.derivativesAllowed ? 'Allowed' : 'Not allowed'}`);

    if (params.commercialUse) {
        terms.push(`Revenue sharing: ${params.revenueSharePercentage}%`);
    }

    terms.push(`Attribution: ${params.attributionRequired !== false ? 'Required' : 'Not required'}`);

    if (params.derivativesAllowed && params.reciprocal) {
        terms.push('Reciprocal licensing: Required for derivatives');
    }

    return terms;
}

function generateDerivativeDescription(params: LicenseRemixerRequest): string {
    if (!params.derivativesAllowed) {
        return 'Creation of derivative works is not permitted under this license.';
    }

    let desc = 'Derivative works are permitted';

    if (params.attributionRequired !== false) {
        desc += ' with proper attribution';
    }

    if (params.reciprocal) {
        desc += ' and must use the same license terms';
    }

    return desc + '.';
}

function getCurrencyAddress(currency?: string): string {
    // Import WIP token address from Story SDK
    const WIP_TOKEN_ADDRESS = '0xB132A6B7AE652c974EE1557A3521D53d18F6739f'; // Story Protocol WIP token

    switch (currency) {
        case 'IP':
            return WIP_TOKEN_ADDRESS;
        case 'USDC':
            return '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8'; // USDC address
        case 'ETH':
            return '0x0000000000000000000000000000000000000000'; // ETH (zero address)
        default:
            // For commercial licenses with revenue sharing, use WIP token by default
            return WIP_TOKEN_ADDRESS;
    }
}

function generateMarkdownLicense(licenseDoc: any): string {
    return `# ${licenseDoc.title}

**Version**: ${licenseDoc.version}  
**Effective Date**: ${licenseDoc.effectiveDate}  
**Creator**: ${licenseDoc.creator.name} (${licenseDoc.creator.address})

## Summary

${licenseDoc.summary.description}

### Key Terms
${licenseDoc.summary.keyTerms.map((term: string) => `- ${term}`).join('\n')}

## Permissions

### Commercial Use
${licenseDoc.terms.permissions.commercialUse.description}

### Derivative Works
${licenseDoc.terms.permissions.derivativeWorks.description}

## Conditions

### Attribution
${licenseDoc.terms.conditions.attribution.required ?
            `Attribution is required using the format: "${licenseDoc.terms.conditions.attribution.format}"` :
            'No attribution required'}

${licenseDoc.terms.conditions.revenueSharing ?
            `### Revenue Sharing\n- Percentage: ${licenseDoc.terms.conditions.revenueSharing.percentage}%\n- Currency: ${licenseDoc.terms.conditions.revenueSharing.currency}\n- Payment: ${licenseDoc.terms.conditions.revenueSharing.payment}` :
            ''}

## Restrictions

### Prohibited Uses
${licenseDoc.terms.restrictions.prohibited.map((use: string) => `- ${use}`).join('\n')}

### Territory and Duration
- **Territory**: ${licenseDoc.terms.restrictions.territory}
- **Duration**: ${licenseDoc.terms.restrictions.duration}

## Technical Implementation

This license is enforced through smart contracts on the ${licenseDoc.technical.storyProtocol.network} network.

**Network Details**:
- Chain ID: ${licenseDoc.technical.storyProtocol.chainId}
- Explorer: ${licenseDoc.technical.storyProtocol.explorer}

## Legal Framework

- **Governing Law**: ${licenseDoc.legal.governingLaw}
- **Dispute Resolution**: ${licenseDoc.legal.disputeResolution}

---

*Generated by Story Protocol License Remixer API*  
*Document Version: ${licenseDoc.metadata.version}*  
*Created: ${licenseDoc.metadata.createdAt}*`;
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
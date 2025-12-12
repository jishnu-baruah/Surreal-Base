import {
    IPMetadataBuilder,
    NFTMetadataBuilder,
    generateAutoMetadata,
    generateMetadataHash,
    generateContentHash,
    validateIPMetadata,
    validateNFTMetadata,
    createIPMetadataBuilder,
    createNFTMetadataBuilder,
    createBasicMetadata
} from '../../src/lib/metadata-builders';

describe('Metadata Builders', () => {
    describe('IPMetadataBuilder', () => {
        it('should build valid IP metadata', () => {
            const metadata = new IPMetadataBuilder()
                .title('Test IP Asset')
                .description('A test intellectual property asset')
                .creator('John Doe', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', 100)
                .build();

            expect(metadata.title).toBe('Test IP Asset');
            expect(metadata.description).toBe('A test intellectual property asset');
            expect(metadata.creators).toHaveLength(1);
            expect(metadata.creators[0].name).toBe('John Doe');
            expect(metadata.creators[0].address).toBe('0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6');
            expect(metadata.creators[0].contributionPercent).toBe(100);
        });

        it('should handle multiple creators with correct percentages', () => {
            const metadata = new IPMetadataBuilder()
                .title('Collaborative Work')
                .description('A collaborative IP asset')
                .creator('Alice', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', 60)
                .creator('Bob', '0x0000000000000000000000000000000000000001', 40)
                .build();

            expect(metadata.creators).toHaveLength(2);
            expect(metadata.creators[0].contributionPercent).toBe(60);
            expect(metadata.creators[1].contributionPercent).toBe(40);
        });

        it('should throw error when contribution percentages do not sum to 100', () => {
            expect(() => {
                new IPMetadataBuilder()
                    .title('Invalid Work')
                    .description('Invalid contribution percentages')
                    .creator('Alice', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', 60)
                    .creator('Bob', '0x0000000000000000000000000000000000000001', 30)
                    .build();
            }).toThrow('Creator contribution percentages must sum to 100');
        });

        it('should throw error when required fields are missing', () => {
            expect(() => {
                new IPMetadataBuilder().build();
            }).toThrow('Title is required for IP metadata');

            expect(() => {
                new IPMetadataBuilder()
                    .title('Test')
                    .build();
            }).toThrow('Description is required for IP metadata');

            expect(() => {
                new IPMetadataBuilder()
                    .title('Test')
                    .description('Test description')
                    .build();
            }).toThrow('At least one creator is required for IP metadata');
        });

        it('should add timestamp when option is enabled', () => {
            const metadata = new IPMetadataBuilder({ includeTimestamp: true })
                .title('Test IP Asset')
                .description('A test intellectual property asset')
                .creator('John Doe', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', 100)
                .build();

            expect(metadata.createdAt).toBeDefined();
            expect(new Date(metadata.createdAt!)).toBeInstanceOf(Date);
        });

        it('should add default creator when provided', () => {
            const metadata = new IPMetadataBuilder({
                defaultCreator: {
                    name: 'Default Creator',
                    address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
                }
            })
                .title('Test IP Asset')
                .description('A test intellectual property asset')
                .build();

            expect(metadata.creators).toHaveLength(1);
            expect(metadata.creators[0].name).toBe('Default Creator');
            expect(metadata.creators[0].contributionPercent).toBe(100);
        });
    });

    describe('NFTMetadataBuilder', () => {
        it('should build valid NFT metadata', () => {
            const metadata = new NFTMetadataBuilder()
                .name('Test NFT')
                .description('A test NFT')
                .image('https://example.com/image.png')
                .attribute('Color', 'Blue')
                .attribute('Rarity', 'Common')
                .build();

            expect(metadata.name).toBe('Test NFT');
            expect(metadata.description).toBe('A test NFT');
            expect(metadata.image).toBe('https://example.com/image.png');
            expect(metadata.attributes).toHaveLength(2);
            expect(metadata.attributes![0]).toEqual({ key: 'Color', value: 'Blue' });
            expect(metadata.attributes![1]).toEqual({ key: 'Rarity', value: 'Common' });
        });

        it('should throw error when required fields are missing', () => {
            expect(() => {
                new NFTMetadataBuilder().build();
            }).toThrow('Name is required for NFT metadata');

            expect(() => {
                new NFTMetadataBuilder()
                    .name('Test NFT')
                    .build();
            }).toThrow('Description is required for NFT metadata');
        });

        it('should handle animation URL', () => {
            const metadata = new NFTMetadataBuilder()
                .name('Animated NFT')
                .description('An animated NFT')
                .animationUrl('https://example.com/animation.mp4')
                .build();

            expect(metadata.animation_url).toBe('https://example.com/animation.mp4');
        });
    });

    describe('generateAutoMetadata', () => {
        it('should generate metadata for image files', () => {
            const result = generateAutoMetadata({
                filename: 'my-artwork.jpg',
                contentType: 'image/jpeg',
                fileSize: 1024000,
                userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                userName: 'Artist'
            });

            expect(result.ipMetadata.title).toBe('My Artwork');
            expect(result.ipMetadata.description).toContain('Image file: my-artwork.jpg');
            expect(result.ipMetadata.creators[0].name).toBe('Artist');
            expect(result.nftMetadata.name).toBe('My Artwork');
            expect(result.nftMetadata.attributes).toEqual(
                expect.arrayContaining([
                    { key: 'File Name', value: 'my-artwork.jpg' },
                    { key: 'Content Type', value: 'image/jpeg' },
                    { key: 'File Extension', value: 'JPG' },
                    { key: 'File Size', value: '1000 KB' }
                ])
            );
        });

        it('should generate metadata for video files', () => {
            const result = generateAutoMetadata({
                filename: 'demo_video.mp4',
                contentType: 'video/mp4',
                userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
            });

            expect(result.ipMetadata.title).toBe('Demo Video');
            expect(result.ipMetadata.description).toContain('Video file: demo_video.mp4');
            expect(result.ipMetadata.creators[0].name).toBe('Anonymous');
        });

        it('should generate metadata for documents', () => {
            const result = generateAutoMetadata({
                filename: 'research-paper.pdf',
                contentType: 'application/pdf',
                userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                userName: 'Researcher'
            });

            expect(result.ipMetadata.title).toBe('Research Paper');
            expect(result.ipMetadata.description).toContain('PDF document: research-paper.pdf');
        });

        it('should include content hash when provided', () => {
            const contentHash = 'abc123def456';
            const result = generateAutoMetadata({
                filename: 'test.txt',
                contentType: 'text/plain',
                contentHash,
                userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
            });

            expect(result.nftMetadata.attributes).toEqual(
                expect.arrayContaining([
                    { key: 'Content Hash', value: contentHash }
                ])
            );
        });
    });

    describe('generateMetadataHash', () => {
        it('should generate consistent hashes for identical metadata', () => {
            const metadata1 = {
                title: 'Test',
                description: 'Test description',
                creators: [{
                    name: 'Creator',
                    address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                    contributionPercent: 100
                }]
            };

            const metadata2 = {
                title: 'Test',
                description: 'Test description',
                creators: [{
                    name: 'Creator',
                    address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                    contributionPercent: 100
                }]
            };

            const hash1 = generateMetadataHash(metadata1);
            const hash2 = generateMetadataHash(metadata2);

            expect(hash1).toBe(hash2);
            expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
        });

        it('should generate different hashes for different metadata', () => {
            const metadata1 = {
                title: 'Test 1',
                description: 'Test description',
                creators: [{
                    name: 'Creator',
                    address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                    contributionPercent: 100
                }]
            };

            const metadata2 = {
                title: 'Test 2',
                description: 'Test description',
                creators: [{
                    name: 'Creator',
                    address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                    contributionPercent: 100
                }]
            };

            const hash1 = generateMetadataHash(metadata1);
            const hash2 = generateMetadataHash(metadata2);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('generateContentHash', () => {
        it('should generate hash from buffer', () => {
            const buffer = Buffer.from('Hello World', 'utf8');
            const hash = generateContentHash(buffer);

            expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
            expect(hash).toBe('a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'); // Known hash for "Hello World"
        });

        it('should generate hash from base64 string', () => {
            const base64 = Buffer.from('Hello World', 'utf8').toString('base64');
            const hash = generateContentHash(base64);

            expect(hash).toMatch(/^[a-f0-9]{64}$/);
            expect(hash).toBe('a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'); // Same hash as buffer
        });
    });

    describe('validateIPMetadata', () => {
        it('should validate correct IP metadata', () => {
            const metadata = {
                title: 'Valid IP',
                description: 'Valid description',
                creators: [{
                    name: 'Creator',
                    address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                    contributionPercent: 100
                }]
            };

            const result = validateIPMetadata(metadata);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect validation errors', () => {
            const metadata = {
                title: '',
                description: 'Valid description',
                creators: [{
                    name: '',
                    address: 'invalid-address',
                    contributionPercent: 150
                }]
            };

            const result = validateIPMetadata(metadata);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Title is required and cannot be empty');
            expect(result.errors).toContain('Creator 1: Name is required');
            expect(result.errors).toContain('Creator 1: Invalid Ethereum address format');
            expect(result.errors).toContain('Creator 1: Contribution percent must be between 0 and 100');
        });
    });

    describe('validateNFTMetadata', () => {
        it('should validate correct NFT metadata', () => {
            const metadata = {
                name: 'Valid NFT',
                description: 'Valid description',
                attributes: [
                    { key: 'Color', value: 'Blue' }
                ]
            };

            const result = validateNFTMetadata(metadata);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect validation errors', () => {
            const metadata = {
                name: '',
                description: '',
                attributes: [
                    { key: '', value: 'Blue' },
                    { key: 'Color', value: '' }
                ]
            };

            const result = validateNFTMetadata(metadata);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Name is required and cannot be empty');
            expect(result.errors).toContain('Description is required and cannot be empty');
            expect(result.errors).toContain('Attribute 1: Key is required');
            expect(result.errors).toContain('Attribute 2: Value is required');
        });
    });

    describe('createBasicMetadata', () => {
        it('should create both IP and NFT metadata from basic inputs', () => {
            const result = createBasicMetadata(
                'My Asset',
                'Asset description',
                'Creator Name',
                '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
            );

            expect(result.ipMetadata.title).toBe('My Asset');
            expect(result.ipMetadata.description).toBe('Asset description');
            expect(result.ipMetadata.creators[0].name).toBe('Creator Name');
            expect(result.ipMetadata.createdAt).toBeDefined();

            expect(result.nftMetadata.name).toBe('My Asset');
            expect(result.nftMetadata.description).toBe('Asset description');
        });
    });

    describe('Factory functions', () => {
        it('should create builders with factory functions', () => {
            const ipBuilder = createIPMetadataBuilder({ includeTimestamp: true });
            const nftBuilder = createNFTMetadataBuilder();

            expect(ipBuilder).toBeInstanceOf(IPMetadataBuilder);
            expect(nftBuilder).toBeInstanceOf(NFTMetadataBuilder);
        });
    });
});
import {
    detectMimeTypeFromExtension,
    detectMimeTypeFromBuffer,
    getFileCategory,
    validateFile,
    validateFiles,
    createContentHash,
    createMetadataHash,
    FileUpload,
    SUPPORTED_MIME_TYPES,
    FILE_SIZE_LIMITS
} from '../../src/lib/ipfs';

describe('IPFS Service', () => {
    describe('detectMimeTypeFromExtension', () => {
        it('should detect MIME type from common file extensions', () => {
            expect(detectMimeTypeFromExtension('image.jpg')).toBe('image/jpeg');
            expect(detectMimeTypeFromExtension('video.mp4')).toBe('video/mp4');
            expect(detectMimeTypeFromExtension('document.pdf')).toBe('application/pdf');
            expect(detectMimeTypeFromExtension('data.json')).toBe('application/json');
        });

        it('should return null for unknown extensions', () => {
            expect(detectMimeTypeFromExtension('file.unknown')).toBeNull();
            expect(detectMimeTypeFromExtension('noextension')).toBeNull();
        });
    });

    describe('detectMimeTypeFromBuffer', () => {
        it('should detect JPEG from magic numbers', () => {
            const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
            expect(detectMimeTypeFromBuffer(jpegBuffer)).toBe('image/jpeg');
        });

        it('should detect PNG from magic numbers', () => {
            const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
            expect(detectMimeTypeFromBuffer(pngBuffer)).toBe('image/png');
        });

        it('should return null for unknown file types', () => {
            const unknownBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
            expect(detectMimeTypeFromBuffer(unknownBuffer)).toBeNull();
        });
    });

    describe('getFileCategory', () => {
        it('should categorize MIME types correctly', () => {
            expect(getFileCategory('image/jpeg')).toBe('image');
            expect(getFileCategory('video/mp4')).toBe('video');
            expect(getFileCategory('audio/mpeg')).toBe('audio');
            expect(getFileCategory('application/json')).toBe('document');
            expect(getFileCategory('unknown/type')).toBe('unknown');
        });
    });

    describe('validateFile', () => {
        it('should validate a valid image file', () => {
            const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, ...Array(1000).fill(0)]);
            const result = validateFile(jpegBuffer, 'test.jpg', 'image/jpeg');

            expect(result.isValid).toBe(true);
            expect(result.detectedMimeType).toBe('image/jpeg');
            expect(result.fileSize).toBe(jpegBuffer.length);
        });

        it('should reject files that are too large', () => {
            const largeBuffer = Buffer.alloc(FILE_SIZE_LIMITS.image + 1);
            const result = validateFile(largeBuffer, 'large.jpg', 'image/jpeg');

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('exceeds limit');
        });

        it('should reject unsupported file types', () => {
            const buffer = Buffer.from('test content');
            const result = validateFile(buffer, 'test.exe', 'application/x-executable');

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Unsupported file type');
        });

        it('should detect MIME type mismatch', () => {
            const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
            const result = validateFile(pngBuffer, 'test.png', 'image/jpeg');

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('MIME type mismatch');
        });
    });

    describe('validateFiles', () => {
        it('should validate multiple files correctly', () => {
            const files: FileUpload[] = [
                {
                    data: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, ...Array(100).fill(0)]).toString('base64'),
                    filename: 'valid.jpg',
                    contentType: 'image/jpeg',
                    purpose: 'media'
                },
                {
                    data: Buffer.from('invalid content').toString('base64'),
                    filename: 'invalid.exe',
                    contentType: 'application/x-executable',
                    purpose: 'attachment'
                }
            ];

            const result = validateFiles(files);

            expect(result.valid).toHaveLength(1);
            expect(result.invalid).toHaveLength(1);
            expect(result.valid[0].filename).toBe('valid.jpg');
            expect(result.invalid[0].file.filename).toBe('invalid.exe');
        });
    });

    describe('createContentHash', () => {
        it('should create consistent hashes for same content', () => {
            const content = 'test content';
            const hash1 = createContentHash(content);
            const hash2 = createContentHash(content);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // SHA256 hex length
        });

        it('should create different hashes for different content', () => {
            const hash1 = createContentHash('content1');
            const hash2 = createContentHash('content2');

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('createMetadataHash', () => {
        it('should create consistent hashes for same metadata', () => {
            const metadata = { title: 'Test', description: 'Test description' };
            const hash1 = createMetadataHash(metadata);
            const hash2 = createMetadataHash(metadata);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // SHA256 hex length
        });

        it('should create different hashes for different metadata', () => {
            const metadata1 = { title: 'Test1' };
            const metadata2 = { title: 'Test2' };
            const hash1 = createMetadataHash(metadata1);
            const hash2 = createMetadataHash(metadata2);

            expect(hash1).not.toBe(hash2);
        });
    });
});
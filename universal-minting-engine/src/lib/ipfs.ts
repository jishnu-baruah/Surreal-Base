import axios from 'axios';
import FormData from 'form-data';
import { createHash } from 'crypto';
import { getPinataConfig } from '@/lib/config';

export interface FileUpload {
    data: string;              // Base64 encoded file data
    filename: string;          // Original filename
    contentType: string;       // MIME type
    purpose: 'media' | 'metadata' | 'evidence' | 'attachment';
}

export interface UploadedFile {
    filename: string;
    ipfsHash: string;
    purpose: string;
    url: string;
}

export interface FileValidationResult {
    isValid: boolean;
    error?: string;
    detectedMimeType?: string;
    fileSize?: number;
}

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024,      // 10MB
    video: 100 * 1024 * 1024,     // 100MB
    audio: 25 * 1024 * 1024,      // 25MB
    document: 5 * 1024 * 1024,    // 5MB
    default: 10 * 1024 * 1024     // 10MB
};

// Supported MIME types
export const SUPPORTED_MIME_TYPES = {
    image: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml'
    ],
    video: [
        'video/mp4',
        'video/avi',
        'video/quicktime',
        'video/webm',
        'video/x-msvideo',
        'video/x-matroska'
    ],
    audio: [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/aac'
    ],
    document: [
        'application/json',
        'text/plain',
        'application/pdf',
        'text/markdown',
        'text/csv'
    ]
};

/**
 * Upload JSON metadata to IPFS using Pinata
 */
export async function uploadJSONToIPFS(jsonMetadata: any, name: string = 'metadata.json'): Promise<string> {
    const { jwt } = getPinataConfig();

    if (!jwt) {
        throw new Error('PINATA_JWT environment variable is required');
    }

    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${jwt}`,
            'Content-Type': 'application/json',
        },
        data: {
            pinataOptions: { cidVersion: 0 },
            pinataMetadata: { name },
            pinataContent: jsonMetadata,
        },
    };

    try {
        const response = await axios(url, options);
        return response.data.IpfsHash;
    } catch (error) {
        console.error('Error uploading JSON to IPFS:', error);
        throw error;
    }
}

/**
 * Upload text content to IPFS using Pinata
 */
export async function uploadTextToIPFS(text: string, filename: string = 'file.txt'): Promise<string> {
    const { jwt } = getPinataConfig();

    if (!jwt) {
        throw new Error('PINATA_JWT environment variable is required');
    }

    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    const data = new FormData();
    const buffer = Buffer.from(text, 'utf-8');
    data.append('file', buffer, { filename, contentType: 'text/plain' });

    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${jwt}`,
            ...data.getHeaders(),
        },
        data: data,
    };

    try {
        const response = await axios(url, options);
        return response.data.IpfsHash;
    } catch (error) {
        console.error('Error uploading text to IPFS:', error);
        throw error;
    }
}

/**
 * Upload file buffer to IPFS using Pinata
 */
export async function uploadFileToIPFS(
    fileBuffer: Buffer,
    filename: string,
    contentType: string
): Promise<string> {
    const { jwt } = getPinataConfig();

    if (!jwt) {
        throw new Error('PINATA_JWT environment variable is required');
    }

    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    const data = new FormData();
    data.append('file', fileBuffer, { filename, contentType });

    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${jwt}`,
            ...data.getHeaders(),
        },
        data: data,
    };

    try {
        const response = await axios(url, options);
        return response.data.IpfsHash;
    } catch (error) {
        console.error('Error uploading file to IPFS:', error);
        throw error;
    }
}

/**
 * Upload video file to IPFS using Pinata
 */
export async function uploadVideoToIPFS(
    videoBuffer: Buffer,
    filename: string
): Promise<string> {
    const { jwt } = getPinataConfig();

    if (!jwt) {
        throw new Error('PINATA_JWT environment variable is required');
    }

    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    const data = new FormData();

    // Determine content type based on file extension
    const ext = filename.toLowerCase().split('.').pop();
    let contentType = 'video/mp4'; // default

    switch (ext) {
        case 'mp4':
            contentType = 'video/mp4';
            break;
        case 'avi':
            contentType = 'video/x-msvideo';
            break;
        case 'mov':
            contentType = 'video/quicktime';
            break;
        case 'webm':
            contentType = 'video/webm';
            break;
        case 'mkv':
            contentType = 'video/x-matroska';
            break;
    }

    data.append('file', videoBuffer, { filename, contentType });

    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${jwt}`,
            ...data.getHeaders(),
        },
        data: data,
    };

    try {
        const response = await axios(url, options);
        return response.data.IpfsHash;
    } catch (error) {
        console.error('Error uploading video to IPFS:', error);
        throw error;
    }
}

/**
 * Upload multiple files in parallel to IPFS
 */
export async function uploadMultipleFilesToIPFS(files: FileUpload[]): Promise<UploadedFile[]> {
    if (!files || files.length === 0) {
        return [];
    }

    console.log(`Starting upload of ${files.length} files to IPFS`);

    // Validate all files first
    const { valid, invalid } = validateFiles(files);

    if (invalid.length > 0) {
        const errorMessages = invalid.map(({ file, error }) => `${file.filename}: ${error}`);
        console.error('File validation failed:', errorMessages);
        throw new Error(`File validation failed:\n${errorMessages.join('\n')}`);
    }

    console.log(`${valid.length} files passed validation`);

    const uploadPromises = valid.map(async (file, index): Promise<UploadedFile> => {
        try {
            console.log(`[${index + 1}/${valid.length}] Processing file: ${file.filename}`);
            
            // Convert base64 to buffer (data is already cleaned by validateFiles)
            const fileBuffer = Buffer.from(file.data, 'base64');
            console.log(`[${index + 1}/${valid.length}] Converted to buffer: ${fileBuffer.length} bytes`);

            // Use the detected content type from validation
            const contentType = file.contentType;
            console.log(`[${index + 1}/${valid.length}] Using content type: ${contentType}`);

            // Upload based on content type
            let ipfsHash: string;
            if (contentType.startsWith('video/')) {
                console.log(`[${index + 1}/${valid.length}] Uploading as video...`);
                ipfsHash = await uploadVideoToIPFS(fileBuffer, file.filename);
            } else {
                console.log(`[${index + 1}/${valid.length}] Uploading as regular file...`);
                ipfsHash = await uploadFileToIPFS(fileBuffer, file.filename, contentType);
            }

            console.log(`[${index + 1}/${valid.length}] Successfully uploaded: ${ipfsHash}`);

            return {
                filename: file.filename,
                ipfsHash,
                purpose: file.purpose,
                url: getIPFSUrl(ipfsHash)
            };
        } catch (error) {
            console.error(`[${index + 1}/${valid.length}] Error uploading file ${file.filename}:`, error);
            throw new Error(`Failed to upload ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    try {
        console.log('Starting parallel upload to IPFS...');
        const results = await Promise.all(uploadPromises);
        console.log(`Successfully uploaded all ${results.length} files to IPFS`);
        return results;
    } catch (error) {
        console.error('Error in parallel file upload:', error);
        throw error;
    }
}

/**
 * Create content hash for file fingerprinting
 */
export function createContentHash(content: string | Buffer): string {
    return createHash('sha256').update(content).digest('hex');
}

/**
 * Create metadata hash
 */
export function createMetadataHash(metadata: any): string {
    return createHash('sha256').update(JSON.stringify(metadata)).digest('hex');
}

/**
 * Validate IPFS upload by checking if hash is accessible
 */
export async function validateIPFSUpload(hash: string): Promise<boolean> {
    try {
        const url = getIPFSUrl(hash);
        const response = await axios.head(url, { timeout: 10000 });
        return response.status === 200;
    } catch (error) {
        console.error(`Error validating IPFS hash ${hash}:`, error);
        return false;
    }
}

/**
 * Detect MIME type from file extension
 */
export function detectMimeTypeFromExtension(filename: string): string | null {
    const ext = filename.toLowerCase().split('.').pop();
    if (!ext) return null;

    const mimeTypeMap: Record<string, string> = {
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',

        // Videos
        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'webm': 'video/webm',
        'mkv': 'video/x-matroska',

        // Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'aac': 'audio/aac',

        // Documents
        'json': 'application/json',
        'txt': 'text/plain',
        'pdf': 'application/pdf',
        'md': 'text/markdown',
        'csv': 'text/csv'
    };

    return mimeTypeMap[ext] || null;
}

/**
 * Detect MIME type from file buffer (magic numbers)
 */
export function detectMimeTypeFromBuffer(buffer: Buffer): string | null {
    if (buffer.length < 4) return null;

    // Check magic numbers for common file types
    const header = buffer.subarray(0, 12);

    // JPEG
    if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
        return 'image/jpeg';
    }

    // PNG
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        return 'image/png';
    }

    // GIF
    if (header.subarray(0, 3).toString() === 'GIF') {
        return 'image/gif';
    }

    // WebP
    if (header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP') {
        return 'image/webp';
    }

    // MP4
    if (header.subarray(4, 8).toString() === 'ftyp') {
        return 'video/mp4';
    }

    // PDF
    if (header.subarray(0, 4).toString() === '%PDF') {
        return 'application/pdf';
    }

    return null;
}

/**
 * Get file category from MIME type
 */
export function getFileCategory(mimeType: string): keyof typeof SUPPORTED_MIME_TYPES | 'unknown' {
    for (const [category, types] of Object.entries(SUPPORTED_MIME_TYPES)) {
        if (types.includes(mimeType)) {
            return category as keyof typeof SUPPORTED_MIME_TYPES;
        }
    }
    return 'unknown';
}

/**
 * Validate file size and type
 */
export function validateFile(
    fileBuffer: Buffer,
    filename: string,
    providedMimeType?: string
): FileValidationResult {
    const fileSize = fileBuffer.length;

    // Detect MIME type from multiple sources
    const detectedFromBuffer = detectMimeTypeFromBuffer(fileBuffer);
    const detectedFromExtension = detectMimeTypeFromExtension(filename);
    const detectedMimeType = detectedFromBuffer || detectedFromExtension || providedMimeType;

    if (!detectedMimeType) {
        return {
            isValid: false,
            error: 'Unable to determine file type',
            fileSize
        };
    }

    // Check if MIME type is supported
    const category = getFileCategory(detectedMimeType);
    if (category === 'unknown') {
        return {
            isValid: false,
            error: `Unsupported file type: ${detectedMimeType}`,
            detectedMimeType,
            fileSize
        };
    }

    // Check file size limits
    const sizeLimit = FILE_SIZE_LIMITS[category] || FILE_SIZE_LIMITS.default;
    if (fileSize > sizeLimit) {
        const sizeLimitMB = Math.round(sizeLimit / (1024 * 1024));
        const fileSizeMB = Math.round(fileSize / (1024 * 1024));
        return {
            isValid: false,
            error: `File size ${fileSizeMB}MB exceeds limit of ${sizeLimitMB}MB for ${category} files`,
            detectedMimeType,
            fileSize
        };
    }

    // Validate MIME type consistency
    if (providedMimeType && detectedFromBuffer && providedMimeType !== detectedFromBuffer) {
        return {
            isValid: false,
            error: `MIME type mismatch: provided ${providedMimeType}, detected ${detectedFromBuffer}`,
            detectedMimeType: detectedFromBuffer,
            fileSize
        };
    }

    return {
        isValid: true,
        detectedMimeType,
        fileSize
    };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: FileUpload[]): { valid: FileUpload[]; invalid: Array<{ file: FileUpload; error: string }> } {
    const valid: FileUpload[] = [];
    const invalid: Array<{ file: FileUpload; error: string }> = [];

    console.log(`Validating ${files.length} files...`);

    for (const [index, file] of files.entries()) {
        try {
            console.log(`[${index + 1}/${files.length}] Validating: ${file.filename}`);
            
            // Handle data URLs by extracting just the base64 part
            let base64Data = file.data;
            if (base64Data.includes(',')) {
                console.log(`[${index + 1}/${files.length}] Detected data URL format, extracting base64...`);
                base64Data = base64Data.split(',')[1];
            }

            // Validate base64 format
            if (!base64Data || base64Data.length === 0) {
                invalid.push({
                    file,
                    error: 'Empty or invalid base64 data'
                });
                continue;
            }

            // Test base64 decoding
            let fileBuffer: Buffer;
            try {
                fileBuffer = Buffer.from(base64Data, 'base64');
            } catch (decodeError) {
                invalid.push({
                    file,
                    error: 'Invalid base64 encoding'
                });
                continue;
            }

            if (fileBuffer.length === 0) {
                invalid.push({
                    file,
                    error: 'Decoded file is empty'
                });
                continue;
            }

            console.log(`[${index + 1}/${files.length}] Decoded to ${fileBuffer.length} bytes`);

            const validation = validateFile(fileBuffer, file.filename, file.contentType);

            if (validation.isValid) {
                // Update the file with cleaned base64 data and detected MIME type
                const updatedFile = {
                    ...file,
                    data: base64Data, // Use cleaned base64 data
                    contentType: validation.detectedMimeType || file.contentType
                };
                valid.push(updatedFile);
                console.log(`[${index + 1}/${files.length}] ✅ Valid: ${file.filename}`);
            } else {
                invalid.push({
                    file,
                    error: validation.error || 'Validation failed'
                });
                console.log(`[${index + 1}/${files.length}] ❌ Invalid: ${validation.error}`);
            }
        } catch (error) {
            invalid.push({
                file,
                error: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
            console.log(`[${index + 1}/${files.length}] ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    console.log(`Validation complete: ${valid.length} valid, ${invalid.length} invalid`);
    return { valid, invalid };
}

/**
 * Get IPFS URL from hash
 */
export function getIPFSUrl(hash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
}
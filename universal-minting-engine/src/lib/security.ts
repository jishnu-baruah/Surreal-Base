import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Content Security Policy for API responses
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",

    // Permissions policy
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',

    // HSTS (only for HTTPS)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

    // Cross-Origin policies
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
} as const;

/**
 * Patterns for detecting potential injection attacks
 */
const INJECTION_PATTERNS = [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /('|\"|;|--|\*|\/\*|\*\/)/,

    // XSS patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe\b[^>]*>/i,
    /<object\b[^>]*>/i,
    /<embed\b[^>]*>/i,

    // Command injection patterns
    /(\||&|;|\$\(|\`)/,
    /(rm\s|del\s|format\s|shutdown\s)/i,

    // Path traversal patterns
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,

    // LDAP injection patterns
    /(\(|\)|&|\||\*)/,

    // NoSQL injection patterns
    /(\$where|\$ne|\$gt|\$lt|\$regex)/i
];

/**
 * Sanitize string input by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }

    return input
        // Remove null bytes
        .replace(/\0/g, '')
        // Remove control characters except newlines and tabs
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Normalize whitespace
        .trim();
}

/**
 * Check if input contains potential injection patterns
 */
export function containsInjectionPattern(input: string): boolean {
    if (typeof input !== 'string') {
        return false;
    }

    return INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Validate and sanitize object recursively
 */
export function sanitizeObject(obj: any, maxDepth: number = 10): any {
    if (maxDepth <= 0) {
        return null; // Prevent deep recursion attacks
    }

    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        const sanitized = sanitizeString(obj);

        // Check for injection patterns in critical fields
        if (containsInjectionPattern(sanitized)) {
            throw new Error('Input contains potentially dangerous patterns');
        }

        return sanitized;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, maxDepth - 1));
    }

    if (typeof obj === 'object') {
        const sanitized: any = {};

        for (const [key, value] of Object.entries(obj)) {
            // Sanitize the key as well
            const sanitizedKey = sanitizeString(key);

            if (containsInjectionPattern(sanitizedKey)) {
                throw new Error(`Object key contains potentially dangerous patterns: ${key}`);
            }

            sanitized[sanitizedKey] = sanitizeObject(value, maxDepth - 1);
        }

        return sanitized;
    }

    return null; // Unknown type
}

/**
 * Validate request size to prevent DoS attacks
 */
export function validateRequestSize(request: NextRequest): boolean {
    const contentLength = request.headers.get('content-length');

    if (contentLength) {
        const size = parseInt(contentLength, 10);
        const maxSize = 50 * 1024 * 1024; // 50MB limit

        if (size > maxSize) {
            return false;
        }
    }

    return true;
}

/**
 * Validate Content-Type header
 */
export function validateContentType(request: NextRequest): boolean {
    const contentType = request.headers.get('content-type');

    if (!contentType) {
        return false;
    }

    // Allow JSON and multipart form data
    const allowedTypes = [
        'application/json',
        'multipart/form-data',
        'application/x-www-form-urlencoded'
    ];

    return allowedTypes.some(type => contentType.includes(type));
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    return response;
}

/**
 * Request validation middleware
 */
export function validateRequest(request: NextRequest): NextResponse | null {
    // Skip validation for GET requests
    if (request.method === 'GET') {
        return null;
    }

    // Validate request size
    if (!validateRequestSize(request)) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'REQUEST_TOO_LARGE',
                    message: 'Request payload too large',
                    details: {
                        maxSize: '50MB'
                    }
                }
            },
            { status: 413 }
        );
    }

    // Validate Content-Type for POST requests
    if (request.method === 'POST' && !validateContentType(request)) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INVALID_CONTENT_TYPE',
                    message: 'Invalid or missing Content-Type header',
                    details: {
                        allowed: ['application/json', 'multipart/form-data']
                    }
                }
            },
            { status: 400 }
        );
    }

    return null; // Request is valid
}

/**
 * Sanitize request body
 */
export async function sanitizeRequestBody(request: NextRequest): Promise<any> {
    try {
        const body = await request.json();
        return sanitizeObject(body);
    } catch (error) {
        if (error instanceof Error && error.message.includes('dangerous patterns')) {
            throw new Error('Request contains potentially dangerous content');
        }
        throw error;
    }
}

/**
 * Wrapper function to apply security middleware to an API handler
 */
export function withSecurity<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
        // Validate request
        const validationError = validateRequest(request);
        if (validationError) {
            return addSecurityHeaders(validationError);
        }

        try {
            // Execute the handler
            const response = await handler(request, ...args);

            // Add security headers to response
            return addSecurityHeaders(response);
        } catch (error) {
            // Handle security-related errors
            if (error instanceof Error && error.message.includes('dangerous')) {
                const errorResponse = NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'SECURITY_VIOLATION',
                            message: 'Request blocked due to security policy',
                            details: {
                                reason: 'Potentially dangerous content detected'
                            }
                        }
                    },
                    { status: 400 }
                );

                return addSecurityHeaders(errorResponse);
            }

            throw error;
        }
    };
}

/**
 * Combined middleware that applies both rate limiting and security
 */
export function withSecurityAndRateLimit<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
        // Import rate limiting here to avoid circular dependencies
        const { rateLimit, getRateLimitConfig, addRateLimitHeaders } = await import('./rate-limiter');

        // Apply rate limiting first
        const rateLimitConfig = getRateLimitConfig(request.nextUrl.pathname);
        const rateLimitResponse = rateLimit(request, rateLimitConfig);
        if (rateLimitResponse) {
            return addSecurityHeaders(rateLimitResponse);
        }

        // Apply security validation
        const validationError = validateRequest(request);
        if (validationError) {
            return addSecurityHeaders(validationError);
        }

        try {
            // Execute the handler
            const response = await handler(request, ...args);

            // Add both security and rate limit headers
            const secureResponse = addSecurityHeaders(response);
            return addRateLimitHeaders(secureResponse, request, rateLimitConfig);
        } catch (error) {
            // Handle security-related errors
            if (error instanceof Error && error.message.includes('dangerous')) {
                const errorResponse = NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'SECURITY_VIOLATION',
                            message: 'Request blocked due to security policy',
                            details: {
                                reason: 'Potentially dangerous content detected'
                            }
                        }
                    },
                    { status: 400 }
                );

                return addSecurityHeaders(errorResponse);
            }

            throw error;
        }
    };
}
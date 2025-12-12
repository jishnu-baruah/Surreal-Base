import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limiting configuration for different endpoint types
 */
export interface RateLimitConfig {
    windowMs: number;     // Time window in milliseconds
    maxRequests: number;  // Maximum requests per window
    message?: string;     // Custom error message
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS = {
    // Standard API endpoints - more restrictive
    standard: {
        windowMs: 60 * 1000,    // 1 minute
        maxRequests: 10,        // 10 requests per minute
        message: 'Too many requests. Please try again in a minute.'
    },

    // CLI endpoints - more permissive for automation
    cli: {
        windowMs: 60 * 1000,    // 1 minute
        maxRequests: 30,        // 30 requests per minute
        message: 'CLI rate limit exceeded. Please reduce request frequency.'
    },

    // Health check endpoints - very permissive
    health: {
        windowMs: 60 * 1000,    // 1 minute
        maxRequests: 100,       // 100 requests per minute
        message: 'Health check rate limit exceeded.'
    }
} as const;

/**
 * In-memory store for rate limiting data
 * In production, this should be replaced with Redis or similar
 */
interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Get client identifier from request
 * Uses IP address as the primary identifier
 */
function getClientId(request: NextRequest): string {
    // Try to get real IP from headers (for proxied requests)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');

    // Use the first available IP
    const ip = forwardedFor?.split(',')[0]?.trim() ||
        realIp ||
        cfConnectingIp ||
        (request as any).ip ||
        'unknown';

    return ip;
}

/**
 * Rate limiting middleware
 * Returns null if request is allowed, or NextResponse with error if rate limited
 */
export function rateLimit(
    request: NextRequest,
    config: RateLimitConfig
): NextResponse | null {
    // Clean up expired entries periodically
    if (Math.random() < 0.1) { // 10% chance to cleanup on each request
        cleanupExpiredEntries();
    }

    const clientId = getClientId(request);
    const now = Date.now();
    const key = `${clientId}:${request.nextUrl.pathname}`;

    const entry = rateLimitStore.get(key);

    if (!entry) {
        // First request from this client for this endpoint
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + config.windowMs
        });
        return null; // Allow request
    }

    if (now > entry.resetTime) {
        // Window has expired, reset counter
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + config.windowMs
        });
        return null; // Allow request
    }

    if (entry.count >= config.maxRequests) {
        // Rate limit exceeded
        const resetTimeSeconds = Math.ceil((entry.resetTime - now) / 1000);

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: config.message || 'Rate limit exceeded',
                    details: {
                        limit: config.maxRequests,
                        windowMs: config.windowMs,
                        resetIn: resetTimeSeconds,
                        retryAfter: resetTimeSeconds
                    }
                }
            },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': config.maxRequests.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
                    'Retry-After': resetTimeSeconds.toString()
                }
            }
        );
    }

    // Increment counter and allow request
    entry.count++;
    rateLimitStore.set(key, entry);

    return null; // Allow request
}

/**
 * Get rate limit configuration based on endpoint path
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
    if (pathname.includes('/api/cli/')) {
        return RATE_LIMIT_CONFIGS.cli;
    }

    if (pathname.includes('/api/health')) {
        return RATE_LIMIT_CONFIGS.health;
    }

    return RATE_LIMIT_CONFIGS.standard;
}

/**
 * Add rate limit headers to successful responses
 */
export function addRateLimitHeaders(
    response: NextResponse,
    request: NextRequest,
    config: RateLimitConfig
): NextResponse {
    const clientId = getClientId(request);
    const key = `${clientId}:${request.nextUrl.pathname}`;
    const entry = rateLimitStore.get(key);

    if (entry) {
        const remaining = Math.max(0, config.maxRequests - entry.count);
        const resetTime = Math.ceil(entry.resetTime / 1000);

        response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', resetTime.toString());
    }

    return response;
}

/**
 * Wrapper function to apply rate limiting to an API handler
 */
export function withRateLimit<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
    config?: RateLimitConfig
) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
        // Get rate limit config
        const rateLimitConfig = config || getRateLimitConfig(request.nextUrl.pathname);

        // Check rate limit
        const rateLimitResponse = rateLimit(request, rateLimitConfig);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        // Execute the handler
        const response = await handler(request, ...args);

        // Add rate limit headers to successful responses
        return addRateLimitHeaders(response, request, rateLimitConfig);
    };
}
import { NextRequest } from 'next/server';
import { rateLimit, getRateLimitConfig, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

let testCounter = 0;

// Mock NextRequest with unique IP for each test
function createMockRequest(pathname: string, testId?: string): NextRequest {
    const url = `http://localhost:3000${pathname}`;
    const request = new NextRequest(url);

    // Use unique IP for each test to avoid rate limit conflicts
    const uniqueIp = testId ? `192.168.${testId}.1` : `192.168.1.${++testCounter}`;

    // Mock the IP address
    Object.defineProperty(request, 'ip', {
        value: uniqueIp,
        writable: true
    });

    return request;
}

describe('Rate Limiter', () => {
    describe('getRateLimitConfig', () => {
        it('should return CLI config for CLI endpoints', () => {
            const config = getRateLimitConfig('/api/cli/mint-file');
            expect(config).toEqual(RATE_LIMIT_CONFIGS.cli);
        });

        it('should return health config for health endpoints', () => {
            const config = getRateLimitConfig('/api/health');
            expect(config).toEqual(RATE_LIMIT_CONFIGS.health);
        });

        it('should return standard config for other endpoints', () => {
            const config = getRateLimitConfig('/api/prepare-mint');
            expect(config).toEqual(RATE_LIMIT_CONFIGS.standard);
        });
    });

    describe('rateLimit', () => {
        it('should allow first request', () => {
            const request = createMockRequest('/api/prepare-mint', '100');
            const config = RATE_LIMIT_CONFIGS.standard;

            const result = rateLimit(request, config);
            expect(result).toBeNull();
        });

        it('should allow requests within limit', () => {
            const testId = '101';
            const config = { windowMs: 60000, maxRequests: 5 };

            // Make 5 requests (within limit) with same IP
            for (let i = 0; i < 5; i++) {
                const request = createMockRequest('/api/prepare-mint', testId);
                const result = rateLimit(request, config);
                expect(result).toBeNull();
            }
        });

        it('should block requests exceeding limit', () => {
            const testId = '102';
            const config = { windowMs: 60000, maxRequests: 2 };

            // First two requests should pass
            const request1 = createMockRequest('/api/prepare-mint', testId);
            const request2 = createMockRequest('/api/prepare-mint', testId);
            expect(rateLimit(request1, config)).toBeNull();
            expect(rateLimit(request2, config)).toBeNull();

            // Third request should be blocked
            const request3 = createMockRequest('/api/prepare-mint', testId);
            const result = rateLimit(request3, config);
            expect(result).not.toBeNull();
            expect(result?.status).toBe(429);
        });

        it('should differentiate between different IPs', () => {
            const config = { windowMs: 60000, maxRequests: 1 };

            const request1 = createMockRequest('/api/prepare-mint', '103');
            const request2 = createMockRequest('/api/prepare-mint', '104');

            // Both IPs should be allowed their first request
            expect(rateLimit(request1, config)).toBeNull();
            expect(rateLimit(request2, config)).toBeNull();

            // Both IPs should be blocked on second request
            const request1b = createMockRequest('/api/prepare-mint', '103');
            const request2b = createMockRequest('/api/prepare-mint', '104');
            expect(rateLimit(request1b, config)).not.toBeNull();
            expect(rateLimit(request2b, config)).not.toBeNull();
        });

        it('should differentiate between different endpoints', () => {
            const testId = '105';
            const config = { windowMs: 60000, maxRequests: 1 };

            // Both endpoints should be allowed their first request
            const request1 = createMockRequest('/api/prepare-mint', testId);
            const request2 = createMockRequest('/api/prepare-royalty', testId);
            expect(rateLimit(request1, config)).toBeNull();
            expect(rateLimit(request2, config)).toBeNull();

            // Both endpoints should be blocked on second request
            const request1b = createMockRequest('/api/prepare-mint', testId);
            const request2b = createMockRequest('/api/prepare-royalty', testId);
            expect(rateLimit(request1b, config)).not.toBeNull();
            expect(rateLimit(request2b, config)).not.toBeNull();
        });

        it('should include rate limit headers in error response', () => {
            const testId = '106';
            const config = { windowMs: 60000, maxRequests: 1, message: 'Rate limited' };

            // First request passes
            const request1 = createMockRequest('/api/prepare-mint', testId);
            expect(rateLimit(request1, config)).toBeNull();

            // Second request is blocked with headers
            const request2 = createMockRequest('/api/prepare-mint', testId);
            const result = rateLimit(request2, config);
            expect(result).not.toBeNull();

            const headers = result?.headers;
            expect(headers?.get('X-RateLimit-Limit')).toBe('1');
            expect(headers?.get('X-RateLimit-Remaining')).toBe('0');
            expect(headers?.get('X-RateLimit-Reset')).toBeTruthy();
            expect(headers?.get('Retry-After')).toBeTruthy();
        });

        it('should include custom error message', async () => {
            const testId = '107';
            const config = { windowMs: 60000, maxRequests: 1, message: 'Custom rate limit message' };

            // First request passes
            const request1 = createMockRequest('/api/prepare-mint', testId);
            expect(rateLimit(request1, config)).toBeNull();

            // Second request is blocked with custom message
            const request2 = createMockRequest('/api/prepare-mint', testId);
            const result = rateLimit(request2, config);
            expect(result).not.toBeNull();

            const responseData = await result?.json();
            expect(responseData).toMatchObject({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Custom rate limit message'
                }
            });
        });
    });

    describe('Rate limit configurations', () => {
        it('should have appropriate limits for different endpoint types', () => {
            // Standard endpoints should be more restrictive
            expect(RATE_LIMIT_CONFIGS.standard.maxRequests).toBeLessThan(RATE_LIMIT_CONFIGS.cli.maxRequests);

            // Health endpoints should be most permissive
            expect(RATE_LIMIT_CONFIGS.health.maxRequests).toBeGreaterThan(RATE_LIMIT_CONFIGS.standard.maxRequests);
            expect(RATE_LIMIT_CONFIGS.health.maxRequests).toBeGreaterThan(RATE_LIMIT_CONFIGS.cli.maxRequests);

            // All should have reasonable time windows
            expect(RATE_LIMIT_CONFIGS.standard.windowMs).toBeGreaterThan(0);
            expect(RATE_LIMIT_CONFIGS.cli.windowMs).toBeGreaterThan(0);
            expect(RATE_LIMIT_CONFIGS.health.windowMs).toBeGreaterThan(0);
        });
    });
});
import { NextRequest } from 'next/server';
import {
    sanitizeString,
    containsInjectionPattern,
    sanitizeObject,
    validateRequestSize,
    validateContentType,
    SECURITY_HEADERS
} from '@/lib/security';

// Mock NextRequest
function createMockRequest(
    method: string = 'POST',
    contentType: string = 'application/json',
    contentLength?: string
): NextRequest {
    const url = 'http://localhost:3000/api/test';
    const request = new NextRequest(url, { method });

    if (contentType) {
        request.headers.set('content-type', contentType);
    }

    if (contentLength) {
        request.headers.set('content-length', contentLength);
    }

    return request;
}

describe('Security Module', () => {
    describe('sanitizeString', () => {
        it('should remove null bytes', () => {
            const input = 'test\0string';
            const result = sanitizeString(input);
            expect(result).toBe('teststring');
        });

        it('should remove control characters', () => {
            const input = 'test\x01\x02string';
            const result = sanitizeString(input);
            expect(result).toBe('teststring');
        });

        it('should preserve newlines and tabs', () => {
            const input = 'test\n\tstring';
            const result = sanitizeString(input);
            expect(result).toBe('test\n\tstring');
        });

        it('should trim whitespace', () => {
            const input = '  test string  ';
            const result = sanitizeString(input);
            expect(result).toBe('test string');
        });

        it('should handle non-string input', () => {
            expect(sanitizeString(123 as any)).toBe('');
            expect(sanitizeString(null as any)).toBe('');
            expect(sanitizeString(undefined as any)).toBe('');
        });
    });

    describe('containsInjectionPattern', () => {
        it('should detect SQL injection patterns', () => {
            expect(containsInjectionPattern('SELECT * FROM users')).toBe(true);
            expect(containsInjectionPattern('DROP TABLE users')).toBe(true);
            expect(containsInjectionPattern("' OR 1=1 --")).toBe(true);
            expect(containsInjectionPattern('UNION SELECT password')).toBe(true);
        });

        it('should detect XSS patterns', () => {
            expect(containsInjectionPattern('<script>alert("xss")</script>')).toBe(true);
            expect(containsInjectionPattern('javascript:alert(1)')).toBe(true);
            expect(containsInjectionPattern('<img onerror="alert(1)" src="x">')).toBe(true);
            expect(containsInjectionPattern('<iframe src="evil.com"></iframe>')).toBe(true);
        });

        it('should detect command injection patterns', () => {
            expect(containsInjectionPattern('test | rm -rf /')).toBe(true);
            expect(containsInjectionPattern('test && shutdown -h now')).toBe(true);
            expect(containsInjectionPattern('test; del /f /q *')).toBe(true);
            expect(containsInjectionPattern('$(whoami)')).toBe(true);
        });

        it('should detect path traversal patterns', () => {
            expect(containsInjectionPattern('../../../etc/passwd')).toBe(true);
            expect(containsInjectionPattern('..\\..\\windows\\system32')).toBe(true);
            expect(containsInjectionPattern('%2e%2e%2f')).toBe(true);
        });

        it('should detect NoSQL injection patterns', () => {
            expect(containsInjectionPattern('{"$where": "this.password"}')).toBe(true);
            expect(containsInjectionPattern('{"$ne": null}')).toBe(true);
            expect(containsInjectionPattern('{"$regex": ".*"}')).toBe(true);
        });

        it('should not flag safe content', () => {
            expect(containsInjectionPattern('Hello world')).toBe(false);
            expect(containsInjectionPattern('user@example.com')).toBe(false);
            expect(containsInjectionPattern('My IP Asset Title')).toBe(false);
            expect(containsInjectionPattern('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')).toBe(false);
        });

        it('should handle non-string input', () => {
            expect(containsInjectionPattern(123 as any)).toBe(false);
            expect(containsInjectionPattern(null as any)).toBe(false);
            expect(containsInjectionPattern(undefined as any)).toBe(false);
        });
    });

    describe('sanitizeObject', () => {
        it('should sanitize string values', () => {
            const input = {
                title: '  My Title  ',
                description: 'test\0string'
            };

            const result = sanitizeObject(input);
            expect(result).toEqual({
                title: 'My Title',
                description: 'teststring'
            });
        });

        it('should preserve non-string values', () => {
            const input = {
                count: 42,
                active: true,
                data: null
            };

            const result = sanitizeObject(input);
            expect(result).toEqual(input);
        });

        it('should sanitize nested objects', () => {
            const input = {
                user: {
                    name: '  John  ',
                    email: 'john@example.com'
                },
                metadata: {
                    tags: ['tag1', '  tag2  ']
                }
            };

            const result = sanitizeObject(input);
            expect(result).toEqual({
                user: {
                    name: 'John',
                    email: 'john@example.com'
                },
                metadata: {
                    tags: ['tag1', 'tag2']
                }
            });
        });

        it('should sanitize array values', () => {
            const input = ['  item1  ', 'item2\0', 'item3'];
            const result = sanitizeObject(input);
            expect(result).toEqual(['item1', 'item2', 'item3']);
        });

        it('should throw error for dangerous patterns', () => {
            const input = {
                query: 'SELECT * FROM users'
            };

            expect(() => sanitizeObject(input)).toThrow('Input contains potentially dangerous patterns');
        });

        it('should throw error for dangerous keys', () => {
            const input = {
                'DROP TABLE': 'value'
            };

            expect(() => sanitizeObject(input)).toThrow('Object key contains potentially dangerous patterns');
        });

        it('should prevent deep recursion', () => {
            const input = { level1: { level2: { level3: 'value' } } };
            const result = sanitizeObject(input, 2);
            expect(result.level1.level2).toBeNull();
        });

        it('should handle null and undefined', () => {
            expect(sanitizeObject(null)).toBeNull();
            expect(sanitizeObject(undefined)).toBeUndefined();
        });
    });

    describe('validateRequestSize', () => {
        it('should allow requests within size limit', () => {
            const request = createMockRequest('POST', 'application/json', '1000');
            expect(validateRequestSize(request)).toBe(true);
        });

        it('should reject requests exceeding size limit', () => {
            const request = createMockRequest('POST', 'application/json', '100000000'); // 100MB
            expect(validateRequestSize(request)).toBe(false);
        });

        it('should allow requests without content-length header', () => {
            const request = createMockRequest('POST', 'application/json');
            expect(validateRequestSize(request)).toBe(true);
        });

        it('should handle invalid content-length', () => {
            const request = createMockRequest('POST', 'application/json', 'invalid');
            expect(validateRequestSize(request)).toBe(true);
        });
    });

    describe('validateContentType', () => {
        it('should allow valid content types', () => {
            expect(validateContentType(createMockRequest('POST', 'application/json'))).toBe(true);
            expect(validateContentType(createMockRequest('POST', 'multipart/form-data'))).toBe(true);
            expect(validateContentType(createMockRequest('POST', 'application/x-www-form-urlencoded'))).toBe(true);
        });

        it('should allow content types with additional parameters', () => {
            expect(validateContentType(createMockRequest('POST', 'application/json; charset=utf-8'))).toBe(true);
            expect(validateContentType(createMockRequest('POST', 'multipart/form-data; boundary=something'))).toBe(true);
        });

        it('should reject invalid content types', () => {
            expect(validateContentType(createMockRequest('POST', 'text/plain'))).toBe(false);
            expect(validateContentType(createMockRequest('POST', 'application/xml'))).toBe(false);
        });

        it('should reject requests without content type', () => {
            expect(validateContentType(createMockRequest('POST', ''))).toBe(false);
        });
    });

    describe('Security Headers', () => {
        it('should include all required security headers', () => {
            const requiredHeaders = [
                'X-Content-Type-Options',
                'X-XSS-Protection',
                'X-Frame-Options',
                'Referrer-Policy',
                'Content-Security-Policy',
                'Permissions-Policy',
                'Strict-Transport-Security',
                'Cross-Origin-Embedder-Policy',
                'Cross-Origin-Opener-Policy',
                'Cross-Origin-Resource-Policy'
            ];

            requiredHeaders.forEach(header => {
                expect(SECURITY_HEADERS).toHaveProperty(header);
                expect(SECURITY_HEADERS[header as keyof typeof SECURITY_HEADERS]).toBeTruthy();
            });
        });

        it('should have secure values for critical headers', () => {
            expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
            expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
            expect(SECURITY_HEADERS['X-XSS-Protection']).toBe('1; mode=block');
        });
    });
});
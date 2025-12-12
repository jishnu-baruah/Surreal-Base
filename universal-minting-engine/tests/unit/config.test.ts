import { getNetworkConfig, getPinataConfig, getApiConfig } from '@/lib/config';

describe('Configuration', () => {
    describe('getNetworkConfig', () => {
        it('should return default aeneid network configuration', () => {
            const config = getNetworkConfig();

            expect(config.network).toBe('aeneid');
            expect(config.rpcUrl).toBe('https://aeneid.storyrpc.io');
        });
    });

    describe('getPinataConfig', () => {
        it('should return pinata configuration from environment', () => {
            const config = getPinataConfig();

            expect(config).toHaveProperty('jwt');
        });
    });

    describe('getApiConfig', () => {
        it('should return API configuration with defaults', () => {
            const config = getApiConfig();

            expect(config.rateLimitRequests).toBe(100);
            expect(config.rateLimitWindowMs).toBe(900000);
        });
    });
});
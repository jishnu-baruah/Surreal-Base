import { NextRequest, NextResponse } from 'next/server';
import { getNetworkConfig, getPinataConfig } from '@/lib/config';
import { withSecurityAndRateLimit } from '@/lib/security';

async function handleGET(request: NextRequest) {
    try {
        const networkConfig = getNetworkConfig();
        const pinataConfig = getPinataConfig();

        return NextResponse.json({
            success: true,
            status: 'healthy',
            config: {
                network: networkConfig.network,
                rpcUrl: networkConfig.rpcUrl,
                pinataConfigured: !!pinataConfig.jwt,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: {
                code: 'HEALTH_CHECK_FAILED',
                message: 'Health check failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
        }, { status: 500 });
    }
}

// Apply security and rate limiting middleware
export const GET = withSecurityAndRateLimit(handleGET);
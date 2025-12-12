import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_STORY_NETWORK: process.env.NEXT_PUBLIC_STORY_NETWORK,
    NEXT_PUBLIC_RPC_URL_AENEID: process.env.NEXT_PUBLIC_RPC_URL_AENEID,
    NEXT_PUBLIC_RPC_URL_MAINNET: process.env.NEXT_PUBLIC_RPC_URL_MAINNET,
  },
  // Webpack configuration for compatibility
  webpack: (config, { isServer }) => {
    // Enhanced alias resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/app': path.resolve(__dirname, 'src/app'),
    };

    // Ensure proper file extensions are resolved
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', ...config.resolve.extensions];

    // Handle ESM modules properly
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
  // Turbopack configuration for Next.js 16
  turbopack: {
    resolveAlias: {
      '@': './src',
      '@/lib': './src/lib',
      '@/types': './src/types',
      '@/components': './src/components',
      '@/app': './src/app',
    },
  },
  // External packages configuration
  serverExternalPackages: ['@story-protocol/core-sdk'],
};

export default nextConfig;
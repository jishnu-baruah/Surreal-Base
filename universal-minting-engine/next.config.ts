import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_STORY_NETWORK: process.env.NEXT_PUBLIC_STORY_NETWORK,
    NEXT_PUBLIC_RPC_URL_AENEID: process.env.NEXT_PUBLIC_RPC_URL_AENEID,
    NEXT_PUBLIC_RPC_URL_MAINNET: process.env.NEXT_PUBLIC_RPC_URL_MAINNET,
  },
  // Use Turbopack configuration for Next.js 16
  turbopack: {
    resolveAlias: {
      '@': './src',
      '@/lib': './src/lib',
      '@/types': './src/types',
      '@/components': './src/components',
      '@/app': './src/app',
    },
  },
  // Move serverComponentsExternalPackages to the correct location
  serverExternalPackages: ['@story-protocol/core-sdk'],
};

export default nextConfig;
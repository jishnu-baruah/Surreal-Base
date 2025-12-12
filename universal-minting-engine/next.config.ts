import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_STORY_NETWORK: process.env.NEXT_PUBLIC_STORY_NETWORK,
    NEXT_PUBLIC_RPC_URL_AENEID: process.env.NEXT_PUBLIC_RPC_URL_AENEID,
    NEXT_PUBLIC_RPC_URL_MAINNET: process.env.NEXT_PUBLIC_RPC_URL_MAINNET,
  },
  turbopack: {},
};

export default nextConfig;
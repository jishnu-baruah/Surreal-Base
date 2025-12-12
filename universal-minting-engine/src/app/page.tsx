import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="container py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6">
            Universal Minting Engine
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            A secure, scalable API system for IP asset registration on Story Protocol.
            Prepare blockchain transactions without server-side custody of private keys.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">🚀 Demo App</h2>
              <p className="text-gray-300 mb-4">
                Interactive demo with Coinbase OnchainKit integration, file upload,
                and comprehensive IP registration testing.
              </p>
              <Link
                href="/demo"
                className="btn btn-primary inline-block"
              >
                Launch Demo →
              </Link>
            </div>

            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">📚 API Docs</h2>
              <p className="text-gray-300 mb-4">
                Complete API documentation with examples, endpoints,
                and integration patterns for developers.
              </p>
              <Link
                href="/api-docs"
                className="btn btn-secondary inline-block"
              >
                View Docs →
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="text-3xl font-semibold mb-6">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="text-lg font-semibold mb-2">Secure</h3>
                <p className="text-gray-300">No private key custody - server only prepares unsigned transactions</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="text-lg font-semibold mb-2">Fast</h3>
                <p className="text-gray-300">Optimized endpoints with automatic IPFS integration</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🛠️</div>
                <h3 className="text-lg font-semibold mb-2">Complete</h3>
                <p className="text-gray-300">Support for IP registration, derivatives, licensing, royalties & disputes</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
            <div className="card-inner text-left max-w-2xl mx-auto font-mono text-sm">
              <div className="mb-2 text-gray-400"># Test the API health</div>
              <div className="mb-4 text-cyan-300">curl https://your-domain.com/api/health</div>
              <div className="mb-2 text-gray-400"># Prepare an IP registration</div>
              <div className="text-cyan-300">curl -X POST https://your-domain.com/api/prepare-mint \\</div>
              <div className="ml-4 text-yellow-300">-H &quot;Content-Type: application/json&quot; \\</div>
              <div className="ml-4 text-yellow-300">-d &apos;{`{`}&quot;userAddress&quot;: &quot;0x...&quot;, &quot;ipMetadata&quot;: {`{...}`}{`}`}&apos;</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

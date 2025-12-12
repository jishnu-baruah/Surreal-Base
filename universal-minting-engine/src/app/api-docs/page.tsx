import Link from "next/link";
import { readFile } from "fs/promises";
import { join } from "path";

export default async function ApiDocsPage() {
    let apiDocs = '';

    try {
        const docsPath = join(process.cwd(), 'API_DOCUMENTATION.md');
        apiDocs = await readFile(docsPath, 'utf-8');
    } catch (error) {
        console.error('Failed to load API documentation:', error);
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                API Documentation
                            </h1>
                            <p className="text-gray-600">
                                Complete reference for the Universal Minting Engine API
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            ← Back to Home
                        </Link>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Navigation</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <a href="#health-check" className="text-blue-600 hover:text-blue-800 text-sm">
                            Health Check
                        </a>
                        <a href="#basic-ip-asset-registration" className="text-blue-600 hover:text-blue-800 text-sm">
                            IP Registration
                        </a>
                        <a href="#derivative-ip-asset-creation" className="text-blue-600 hover:text-blue-800 text-sm">
                            Derivatives
                        </a>
                        <a href="#license-token-minting" className="text-blue-600 hover:text-blue-800 text-sm">
                            License Tokens
                        </a>
                        <a href="#royalty-management" className="text-blue-600 hover:text-blue-800 text-sm">
                            Royalties
                        </a>
                        <a href="#nft-collection-creation" className="text-blue-600 hover:text-blue-800 text-sm">
                            Collections
                        </a>
                        <a href="#dispute-raising" className="text-blue-600 hover:text-blue-800 text-sm">
                            Disputes
                        </a>
                        <a href="#cli-optimized-file-minting" className="text-blue-600 hover:text-blue-800 text-sm">
                            CLI Minting
                        </a>
                    </div>
                </div>

                {/* Demo Link */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-md p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold mb-2">Try the Interactive Demo</h2>
                            <p className="opacity-90">
                                Test all API endpoints with a user-friendly interface, file upload, and wallet integration.
                            </p>
                        </div>
                        <Link
                            href="/demo"
                            className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                        >
                            Launch Demo →
                        </Link>
                    </div>
                </div>

                {/* Documentation Content */}
                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-6">
                        {apiDocs ? (
                            <div
                                className="prose prose-lg max-w-none"
                                dangerouslySetInnerHTML={{
                                    __html: apiDocs
                                        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto"><code class="language-$1">$2</code></pre>')
                                        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm">$1</code>')
                                        .replace(/^# (.+)$/gm, '<h1 id="$1" class="text-3xl font-bold text-gray-900 mb-4 mt-8">$1</h1>')
                                        .replace(/^## (.+)$/gm, '<h2 id="$1" class="text-2xl font-semibold text-gray-800 mb-3 mt-6">$1</h2>')
                                        .replace(/^### (.+)$/gm, '<h3 id="$1" class="text-xl font-medium text-gray-700 mb-2 mt-4">$1</h3>')
                                        .replace(/^\| (.+) \|$/gm, '<tr><td class="border px-4 py-2">$1</td></tr>')
                                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\*(.+?)\*/g, '<em>$1</em>')
                                        .replace(/\n/g, '<br>')
                                }}
                            />
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-gray-400 text-6xl mb-4">📄</div>
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                    Documentation Loading...
                                </h3>
                                <p className="text-gray-500">
                                    If this persists, please check that API_DOCUMENTATION.md exists in the project root.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-12 text-gray-500">
                    <p>
                        For support and questions, please refer to the troubleshooting section in the documentation above.
                    </p>
                </div>
            </div>
        </div>
    );
}
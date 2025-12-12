'use client';

import { useState } from 'react';

interface CollapsibleSectionProps {
    title: string;
    isOptional?: boolean;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

export function CollapsibleSection({
    title,
    isOptional = false,
    defaultOpen = true,
    children
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="card">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 hover:bg-white/5 transition-colors flex items-center justify-between text-left"
            >
                <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    {isOptional && (
                        <span className="text-sm text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                            Optional
                        </span>
                    )}
                </div>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''
                        }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {isOpen && (
                <div className="p-4 border-t border-white/10">
                    {children}
                </div>
            )}
        </div>
    );
}
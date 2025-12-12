'use client';

import { useState } from 'react';
import { CollapsibleSection } from './CollapsibleSection';

interface IPRegistrationFormProps {
    onSubmit: (data: any) => void;
    isLoading: boolean;
    useDirectKeys: boolean;
}

export function IPRegistrationForm({ onSubmit, isLoading, useDirectKeys }: IPRegistrationFormProps) {
    const [formData, setFormData] = useState({
        userAddress: '',
        title: '',
        description: '',
        creatorName: '',
        nftName: '',
        nftDescription: '',
        imageUrl: '',
        imageHash: '',
        mediaUrl: '',
        mediaHash: '',
        mediaType: '',
        attributes: [] as Array<{ key: string; value: string }>,
        enableLicenseTerms: false,
        licenseTerms: {
            transferable: true,
            commercialUse: true,
            commercialAttribution: false,
            commercialRevShare: 10, // 10% in percentage (0-100)
            derivativesAllowed: true,
            derivativesAttribution: true,
            derivativesApproval: false,
            derivativesReciprocal: true,
            derivativeRevShare: 10, // 10% in percentage (0-100)
            currency: '0x0000000000000000000000000000000000000000',
            uri: '',
            royaltyPolicy: '0x0000000000000000000000000000000000000000',
            defaultMintingFee: '0',
            expiration: '0',
            commercializerChecker: '0x0000000000000000000000000000000000000000',
            commercializerCheckerData: '0x'
        }
    });

    const [newAttribute, setNewAttribute] = useState({ key: '', value: '' });

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleLicenseChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            licenseTerms: {
                ...prev.licenseTerms,
                [field]: value
            }
        }));
    };

    const addAttribute = () => {
        if (newAttribute.key && newAttribute.value) {
            setFormData(prev => ({
                ...prev,
                attributes: [...prev.attributes, { ...newAttribute }]
            }));
            setNewAttribute({ key: '', value: '' });
        }
    };

    const removeAttribute = (index: number) => {
        setFormData(prev => ({
            ...prev,
            attributes: prev.attributes.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const inputClassName = "input";
    const labelClassName = "label";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <CollapsibleSection title="Basic Information" defaultOpen={true}>
                {useDirectKeys && (
                    <div className="mb-4">
                        <label className={labelClassName}>
                            User Address *
                        </label>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={formData.userAddress}
                            onChange={(e) => handleInputChange('userAddress', e.target.value)}
                            className={inputClassName}
                            required={useDirectKeys}
                        />
                    </div>
                )}

                <div className="mb-4">
                    <label className={labelClassName}>
                        IP Title *
                    </label>
                    <input
                        type="text"
                        placeholder="My Intellectual Property"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className={inputClassName}
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className={labelClassName}>
                        Description *
                    </label>
                    <textarea
                        placeholder="Describe your intellectual property..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                        className={`${inputClassName} resize-vertical`}
                        required
                    />
                </div>

                <div>
                    <label className={labelClassName}>
                        Creator Name <span className="text-gray-500 text-xs">(optional)</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Creator Name"
                        value={formData.creatorName}
                        onChange={(e) => handleInputChange('creatorName', e.target.value)}
                        className={inputClassName}
                    />
                </div>
            </CollapsibleSection>

            {/* NFT Metadata */}
            <CollapsibleSection title="NFT Metadata" isOptional={true} defaultOpen={false}>
                <div className="mb-4">
                    <label className={labelClassName}>
                        NFT Name <span className="text-gray-500 text-xs">(leave empty to use IP title)</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Leave empty to use IP title"
                        value={formData.nftName}
                        onChange={(e) => handleInputChange('nftName', e.target.value)}
                        className={inputClassName}
                    />
                </div>

                <div>
                    <label className={labelClassName}>
                        NFT Description <span className="text-gray-500 text-xs">(leave empty to use IP description)</span>
                    </label>
                    <textarea
                        placeholder="Leave empty to use IP description"
                        value={formData.nftDescription}
                        onChange={(e) => handleInputChange('nftDescription', e.target.value)}
                        rows={2}
                        className={`${inputClassName} resize-vertical`}
                    />
                </div>
            </CollapsibleSection>

            {/* Media URLs */}
            <CollapsibleSection title="Media URLs" isOptional={true} defaultOpen={false}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className={labelClassName}>
                            Image URL
                        </label>
                        <input
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            value={formData.imageUrl}
                            onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Image Hash
                        </label>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={formData.imageHash}
                            onChange={(e) => handleInputChange('imageHash', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Media URL
                        </label>
                        <input
                            type="url"
                            placeholder="https://example.com/media.mp4"
                            value={formData.mediaUrl}
                            onChange={(e) => handleInputChange('mediaUrl', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Media Hash
                        </label>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={formData.mediaHash}
                            onChange={(e) => handleInputChange('mediaHash', e.target.value)}
                            className={inputClassName}
                        />
                    </div>
                </div>

                <div>
                    <label className={labelClassName}>
                        Media Type
                    </label>
                    <select
                        value={formData.mediaType}
                        onChange={(e) => handleInputChange('mediaType', e.target.value)}
                        className={inputClassName}
                    >
                        <option value="">Select media type</option>
                        <option value="image/jpeg">JPEG Image</option>
                        <option value="image/png">PNG Image</option>
                        <option value="image/gif">GIF Image</option>
                        <option value="video/mp4">MP4 Video</option>
                        <option value="video/webm">WebM Video</option>
                        <option value="audio/mpeg">MP3 Audio</option>
                        <option value="audio/wav">WAV Audio</option>
                        <option value="application/pdf">PDF Document</option>
                    </select>
                </div>
            </CollapsibleSection>

            {/* NFT Attributes */}
            <CollapsibleSection title="NFT Attributes" isOptional={true} defaultOpen={false}>
                <div className="flex space-x-2 mb-4">
                    <input
                        type="text"
                        placeholder="Attribute name"
                        value={newAttribute.key}
                        onChange={(e) => setNewAttribute(prev => ({ ...prev, key: e.target.value }))}
                        className={`${inputClassName} flex-1`}
                    />
                    <input
                        type="text"
                        placeholder="Attribute value"
                        value={newAttribute.value}
                        onChange={(e) => setNewAttribute(prev => ({ ...prev, value: e.target.value }))}
                        className={`${inputClassName} flex-1`}
                    />
                    <button
                        type="button"
                        onClick={addAttribute}
                        className="btn btn-primary"
                    >
                        Add
                    </button>
                </div>

                {formData.attributes.length > 0 && (
                    <div className="space-y-2">
                        {formData.attributes.map((attr, index) => (
                            <div key={index} className="card-inner flex items-center justify-between">
                                <span className="text-sm">
                                    <strong>{attr.key}:</strong> {attr.value}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeAttribute(index)}
                                    className="text-red-400 hover:text-red-300 p-1 transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </CollapsibleSection>

            {/* License Terms */}
            <CollapsibleSection title="License Terms" isOptional={true} defaultOpen={false}>
                <div className="mb-6">
                    <label className="card-inner flex items-center space-x-3 cursor-pointer hover:bg-white/5">
                        <input
                            type="checkbox"
                            checked={formData.enableLicenseTerms}
                            onChange={(e) => handleInputChange('enableLicenseTerms', e.target.checked)}
                            className="rounded border-gray-600 bg-transparent text-blue-400 focus:ring-blue-400"
                        />
                        <div>
                            <span className="text-sm font-medium">Configure Custom License Terms</span>
                            <p className="text-xs text-gray-400 mt-1">
                                Enable this to set custom licensing rules. If disabled, default Story Protocol license will be used.
                            </p>
                        </div>
                    </label>
                </div>

                {formData.enableLicenseTerms && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <label className="card-inner flex items-center space-x-3 cursor-pointer hover:bg-white/5">
                                <input
                                    type="checkbox"
                                    checked={formData.licenseTerms.transferable}
                                    onChange={(e) => handleLicenseChange('transferable', e.target.checked)}
                                    className="rounded border-gray-600 bg-transparent text-blue-400 focus:ring-blue-400"
                                />
                                <span className="text-sm">Transferable</span>
                            </label>

                            <label className="card-inner flex items-center space-x-3 cursor-pointer hover:bg-white/5">
                                <input
                                    type="checkbox"
                                    checked={formData.licenseTerms.commercialUse}
                                    onChange={(e) => handleLicenseChange('commercialUse', e.target.checked)}
                                    className="rounded border-gray-600 bg-transparent text-blue-400 focus:ring-blue-400"
                                />
                                <span className="text-sm">Commercial Use</span>
                            </label>

                            <label className="card-inner flex items-center space-x-3 cursor-pointer hover:bg-white/5">
                                <input
                                    type="checkbox"
                                    checked={formData.licenseTerms.commercialAttribution}
                                    onChange={(e) => handleLicenseChange('commercialAttribution', e.target.checked)}
                                    className="rounded border-gray-600 bg-transparent text-blue-400 focus:ring-blue-400"
                                />
                                <span className="text-sm">Commercial Attribution</span>
                            </label>

                            <label className="card-inner flex items-center space-x-3 cursor-pointer hover:bg-white/5">
                                <input
                                    type="checkbox"
                                    checked={formData.licenseTerms.derivativesAllowed}
                                    onChange={(e) => handleLicenseChange('derivativesAllowed', e.target.checked)}
                                    className="rounded border-gray-600 bg-transparent text-blue-400 focus:ring-blue-400"
                                />
                                <span className="text-sm">Derivatives Allowed</span>
                            </label>

                            <label className="card-inner flex items-center space-x-3 cursor-pointer hover:bg-white/5">
                                <input
                                    type="checkbox"
                                    checked={formData.licenseTerms.derivativesAttribution}
                                    onChange={(e) => handleLicenseChange('derivativesAttribution', e.target.checked)}
                                    className="rounded border-gray-600 bg-transparent text-blue-400 focus:ring-blue-400"
                                />
                                <span className="text-sm">Derivatives Attribution</span>
                            </label>

                            <label className="card-inner flex items-center space-x-3 cursor-pointer hover:bg-white/5">
                                <input
                                    type="checkbox"
                                    checked={formData.licenseTerms.derivativesReciprocal}
                                    onChange={(e) => handleLicenseChange('derivativesReciprocal', e.target.checked)}
                                    className="rounded border-gray-600 bg-transparent text-blue-400 focus:ring-blue-400"
                                />
                                <span className="text-sm">Derivatives Reciprocal</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className={labelClassName}>
                                    Commercial Revenue Share (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.licenseTerms.commercialRevShare}
                                    onChange={(e) => handleLicenseChange('commercialRevShare', parseInt(e.target.value) || 0)}
                                    className={inputClassName}
                                />
                                <p className="text-xs text-gray-400 mt-1">Percentage (0-100)</p>
                            </div>

                            <div>
                                <label className={labelClassName}>
                                    Derivative Revenue Share (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.licenseTerms.derivativeRevShare}
                                    onChange={(e) => handleLicenseChange('derivativeRevShare', parseInt(e.target.value) || 0)}
                                    className={inputClassName}
                                />
                                <p className="text-xs text-gray-400 mt-1">Percentage (0-100)</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClassName}>
                                    License Terms URI
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://example.com/license-terms"
                                    value={formData.licenseTerms.uri}
                                    onChange={(e) => handleLicenseChange('uri', e.target.value)}
                                    className={inputClassName}
                                />
                                <p className="text-xs text-gray-400 mt-1">URL to license terms document</p>
                            </div>

                            <div>
                                <label className={labelClassName}>
                                    Default Minting Fee (wei)
                                </label>
                                <input
                                    type="text"
                                    placeholder="0"
                                    value={formData.licenseTerms.defaultMintingFee}
                                    onChange={(e) => handleLicenseChange('defaultMintingFee', e.target.value)}
                                    className={inputClassName}
                                />
                                <p className="text-xs text-gray-400 mt-1">Fee in wei (0 for free)</p>
                            </div>
                        </div>
                    </div>
                )}
            </CollapsibleSection>

            {/* Submit Button */}
            <div className="pt-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary w-full py-4 text-lg"
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Preparing Transaction...</span>
                        </div>
                    ) : (
                        'Register IP Asset'
                    )}
                </button>
            </div>
        </form>
    );
}
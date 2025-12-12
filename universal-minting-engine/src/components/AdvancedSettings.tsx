'use client';

import { useState } from 'react';
import { CollapsibleSection } from './CollapsibleSection';

interface AdvancedSettingsProps {
    onOperation: (operation: string, data: any) => void;
    isLoading: boolean;
    useDirectKeys: boolean;
}

export function AdvancedSettings({ onOperation, isLoading, useDirectKeys }: AdvancedSettingsProps) {
    const [formData, setFormData] = useState({
        // Common fields
        userAddress: '',

        // Derivative fields
        parentIpIds: [''],
        licenseTermsIds: [''],
        derivativeTitle: '',
        derivativeDescription: '',
        spgNftContract: '',

        // License fields
        licensorIpId: '',
        licenseTermsId: '',
        licenseAmount: 1,

        // Royalty fields
        royaltyOperation: 'pay',
        royaltyIpId: '',
        royaltyAmount: '',
        royaltyToken: '',
        royaltyRecipient: '',
        currencyTokens: [''],

        // Collection fields
        collectionName: '',
        collectionSymbol: '',
        isPublicMinting: true,
        mintOpen: true,
        mintFeeRecipient: '',
        contractURI: '',

        // Dispute fields
        targetIpId: '',
        evidence: '',
        targetTag: 'PLAGIARISM',
        bond: '1000000000000000000',
        liveness: 86400
    });

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleArrayChange = (field: string, index: number, value: string) => {
        setFormData(prev => {
            const currentValue = prev[field as keyof typeof prev];
            if (Array.isArray(currentValue)) {
                return {
                    ...prev,
                    [field]: currentValue.map((item: string, i: number) =>
                        i === index ? value : item
                    )
                };
            }
            return prev;
        });
    };

    const addArrayItem = (field: string) => {
        setFormData(prev => {
            const currentValue = prev[field as keyof typeof prev];
            if (Array.isArray(currentValue)) {
                return {
                    ...prev,
                    [field]: [...currentValue, '']
                };
            }
            return prev;
        });
    };

    const removeArrayItem = (field: string, index: number) => {
        setFormData(prev => {
            const currentValue = prev[field as keyof typeof prev];
            if (Array.isArray(currentValue)) {
                return {
                    ...prev,
                    [field]: currentValue.filter((_: any, i: number) => i !== index)
                };
            }
            return prev;
        });
    };

    const handleSubmit = (operation: string) => {
        let data = { ...formData };

        if (useDirectKeys && !data.userAddress) {
            alert('Please provide user address when using direct keys');
            return;
        }

        // Map collection fields to API expected format
        if (operation === 'collection') {
            // Validate required fields
            if (!data.collectionName.trim()) {
                alert('Collection name is required');
                return;
            }
            if (!data.collectionSymbol.trim()) {
                alert('Collection symbol is required');
                return;
            }

            // Validate Ethereum address format for mintFeeRecipient if provided
            const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
            if (data.mintFeeRecipient && !ethAddressRegex.test(data.mintFeeRecipient)) {
                alert('Mint fee recipient must be a valid Ethereum address');
                return;
            }

            // Validate URL format for contractURI if provided
            if (data.contractURI) {
                try {
                    new URL(data.contractURI);
                } catch {
                    alert('Contract URI must be a valid URL');
                    return;
                }
            }

            data = {
                userAddress: data.userAddress,
                name: data.collectionName.trim(),
                symbol: data.collectionSymbol.trim().toUpperCase(),
                isPublicMinting: data.isPublicMinting,
                mintOpen: data.mintOpen,
                // Only include optional fields if they have values
                ...(data.mintFeeRecipient && { mintFeeRecipient: data.mintFeeRecipient }),
                ...(data.contractURI && { contractURI: data.contractURI })
            };
        }

        onOperation(operation, data);
    };

    const inputClassName = "input";
    const labelClassName = "label";
    const buttonClassName = "btn w-full py-3";

    return (
        <div className="space-y-6">
            {/* Common User Address Field */}
            {useDirectKeys && (
                <div className="card border-yellow-500/30">
                    <label className={labelClassName}>
                        User Address *
                    </label>
                    <input
                        type="text"
                        placeholder="0x..."
                        value={formData.userAddress}
                        onChange={(e) => handleInputChange('userAddress', e.target.value)}
                        className={inputClassName}
                    />
                </div>
            )}

            {/* Derivative IP */}
            <CollapsibleSection title="Create Derivative IP" isOptional={true} defaultOpen={false}>
                <div className="space-y-4">
                    <div>
                        <label className={labelClassName}>
                            Parent IP IDs *
                        </label>
                        {formData.parentIpIds.map((ipId, index) => (
                            <div key={index} className="flex space-x-2 mb-2">
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={ipId}
                                    onChange={(e) => handleArrayChange('parentIpIds', index, e.target.value)}
                                    className={`${inputClassName} flex-1`}
                                />
                                {formData.parentIpIds.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeArrayItem('parentIpIds', index)}
                                        className="btn btn-danger px-3 py-3"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => addArrayItem('parentIpIds')}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                            + Add Parent IP
                        </button>
                    </div>

                    <div>
                        <label className={labelClassName}>
                            License Terms IDs *
                        </label>
                        {formData.licenseTermsIds.map((termId, index) => (
                            <div key={index} className="flex space-x-2 mb-2">
                                <input
                                    type="number"
                                    placeholder="1"
                                    value={termId}
                                    onChange={(e) => handleArrayChange('licenseTermsIds', index, e.target.value)}
                                    className={`${inputClassName} flex-1`}
                                />
                                {formData.licenseTermsIds.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeArrayItem('licenseTermsIds', index)}
                                        className="btn btn-danger px-3 py-3"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => addArrayItem('licenseTermsIds')}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                            + Add License Terms
                        </button>
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Derivative Title *
                        </label>
                        <input
                            type="text"
                            placeholder="My Derivative Work"
                            value={formData.derivativeTitle}
                            onChange={(e) => handleInputChange('derivativeTitle', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Derivative Description *
                        </label>
                        <textarea
                            placeholder="Description of derivative work"
                            value={formData.derivativeDescription}
                            onChange={(e) => handleInputChange('derivativeDescription', e.target.value)}
                            rows={3}
                            className={`${inputClassName} resize-vertical`}
                        />
                    </div>

                    <div>
                        <label className={labelClassName}>
                            SPG NFT Contract <span className="text-gray-400 text-xs">(optional)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={formData.spgNftContract}
                            onChange={(e) => handleInputChange('spgNftContract', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <button
                        onClick={() => handleSubmit('derivative')}
                        disabled={isLoading}
                        className={`${buttonClassName} btn-secondary`}
                    >
                        {isLoading ? 'Processing...' : 'Create Derivative IP'}
                    </button>
                </div>
            </CollapsibleSection>

            {/* License Token */}
            <CollapsibleSection title="Mint License Token" isOptional={true} defaultOpen={false}>
                <div className="space-y-4">
                    <div>
                        <label className={labelClassName}>
                            Licensor IP ID *
                        </label>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={formData.licensorIpId}
                            onChange={(e) => handleInputChange('licensorIpId', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label className={labelClassName}>
                            License Terms ID *
                        </label>
                        <input
                            type="number"
                            placeholder="1"
                            value={formData.licenseTermsId}
                            onChange={(e) => handleInputChange('licenseTermsId', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Amount *
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={formData.licenseAmount}
                            onChange={(e) => handleInputChange('licenseAmount', parseInt(e.target.value) || 1)}
                            className={inputClassName}
                        />
                    </div>

                    <button
                        onClick={() => handleSubmit('license')}
                        disabled={isLoading}
                        className={`${buttonClassName} btn-primary`}
                    >
                        {isLoading ? 'Processing...' : 'Mint License Token'}
                    </button>
                </div>
            </CollapsibleSection>

            {/* Royalty Management */}
            <CollapsibleSection title="Royalty Management" isOptional={true} defaultOpen={false}>
                <div className="space-y-4">
                    <div>
                        <label className={labelClassName}>
                            Operation *
                        </label>
                        <select
                            value={formData.royaltyOperation}
                            onChange={(e) => handleInputChange('royaltyOperation', e.target.value)}
                            className={inputClassName}
                        >
                            <option value="pay">Pay Royalty</option>
                            <option value="claim">Claim Revenue</option>
                            <option value="transfer">Transfer Revenue</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClassName}>
                            IP ID *
                        </label>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={formData.royaltyIpId}
                            onChange={(e) => handleInputChange('royaltyIpId', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    {(formData.royaltyOperation === 'pay' || formData.royaltyOperation === 'transfer') && (
                        <>
                            <div>
                                <label className={labelClassName}>
                                    Amount (wei) *
                                </label>
                                <input
                                    type="text"
                                    placeholder="1000000000000000000"
                                    value={formData.royaltyAmount}
                                    onChange={(e) => handleInputChange('royaltyAmount', e.target.value)}
                                    className={inputClassName}
                                />
                            </div>

                            <div>
                                <label className={labelClassName}>
                                    Recipient Address *
                                </label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={formData.royaltyRecipient}
                                    onChange={(e) => handleInputChange('royaltyRecipient', e.target.value)}
                                    className={inputClassName}
                                />
                            </div>
                        </>
                    )}

                    {formData.royaltyOperation === 'pay' && (
                        <div>
                            <label className={labelClassName}>
                                Token Address *
                            </label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={formData.royaltyToken}
                                onChange={(e) => handleInputChange('royaltyToken', e.target.value)}
                                className={inputClassName}
                            />
                        </div>
                    )}

                    {formData.royaltyOperation === 'claim' && (
                        <div>
                            <label className={labelClassName}>
                                Currency Tokens *
                            </label>
                            {formData.currencyTokens.map((token, index) => (
                                <div key={index} className="flex space-x-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="0x..."
                                        value={token}
                                        onChange={(e) => handleArrayChange('currencyTokens', index, e.target.value)}
                                        className={`${inputClassName} flex-1`}
                                    />
                                    {formData.currencyTokens.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeArrayItem('currencyTokens', index)}
                                            className="btn btn-danger px-3 py-3"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => addArrayItem('currencyTokens')}
                                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                            >
                                + Add Currency Token
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => handleSubmit('royalty')}
                        disabled={isLoading}
                        className={`${buttonClassName} btn-primary`}
                    >
                        {isLoading ? 'Processing...' : `${formData.royaltyOperation.charAt(0).toUpperCase() + formData.royaltyOperation.slice(1)} Royalty`}
                    </button>
                </div>
            </CollapsibleSection>

            {/* Collection Creation */}
            <CollapsibleSection title="Create NFT Collection" isOptional={true} defaultOpen={false}>
                <div className="space-y-4">
                    <div>
                        <label className={labelClassName}>
                            Collection Name *
                        </label>
                        <input
                            type="text"
                            placeholder="My IP Collection"
                            value={formData.collectionName}
                            onChange={(e) => handleInputChange('collectionName', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Collection Symbol * <span className="text-gray-400 text-xs">(uppercase letters/numbers only)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="MIC"
                            value={formData.collectionSymbol}
                            onChange={(e) => handleInputChange('collectionSymbol', e.target.value.toUpperCase())}
                            className={inputClassName}
                            maxLength={10}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <label className="card-inner flex items-center space-x-3 cursor-pointer hover:bg-white/5">
                            <input
                                type="checkbox"
                                checked={formData.isPublicMinting}
                                onChange={(e) => handleInputChange('isPublicMinting', e.target.checked)}
                                className="rounded border-gray-600 bg-transparent text-blue-400 focus:ring-blue-400"
                            />
                            <span className="text-sm">Public Minting</span>
                        </label>

                        <label className="card-inner flex items-center space-x-3 cursor-pointer hover:bg-white/5">
                            <input
                                type="checkbox"
                                checked={formData.mintOpen}
                                onChange={(e) => handleInputChange('mintOpen', e.target.checked)}
                                className="rounded border-gray-600 bg-transparent text-blue-400 focus:ring-blue-400"
                            />
                            <span className="text-sm">Mint Open</span>
                        </label>
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Mint Fee Recipient <span className="text-gray-400 text-xs">(optional - valid Ethereum address)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
                            value={formData.mintFeeRecipient}
                            onChange={(e) => handleInputChange('mintFeeRecipient', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Contract URI <span className="text-gray-400 text-xs">(optional)</span>
                        </label>
                        <input
                            type="url"
                            placeholder="https://example.com/collection-metadata.json"
                            value={formData.contractURI}
                            onChange={(e) => handleInputChange('contractURI', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <button
                        onClick={() => handleSubmit('collection')}
                        disabled={isLoading}
                        className={`${buttonClassName} btn-secondary`}
                    >
                        {isLoading ? 'Processing...' : 'Create Collection'}
                    </button>
                </div>
            </CollapsibleSection>

            {/* Dispute Raising */}
            <CollapsibleSection title="Raise Dispute" isOptional={true} defaultOpen={false}>
                <div className="space-y-4">
                    <div>
                        <label className={labelClassName}>
                            Target IP ID *
                        </label>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={formData.targetIpId}
                            onChange={(e) => handleInputChange('targetIpId', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Evidence *
                        </label>
                        <textarea
                            placeholder="Provide evidence for the dispute..."
                            value={formData.evidence}
                            onChange={(e) => handleInputChange('evidence', e.target.value)}
                            rows={4}
                            className={`${inputClassName} resize-vertical`}
                        />
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Dispute Tag *
                        </label>
                        <select
                            value={formData.targetTag}
                            onChange={(e) => handleInputChange('targetTag', e.target.value)}
                            className={inputClassName}
                        >
                            <option value="PLAGIARISM">Plagiarism</option>
                            <option value="COPYRIGHT_INFRINGEMENT">Copyright Infringement</option>
                            <option value="TRADEMARK_VIOLATION">Trademark Violation</option>
                            <option value="INAPPROPRIATE_CONTENT">Inappropriate Content</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Bond Amount (wei) *
                        </label>
                        <input
                            type="text"
                            placeholder="1000000000000000000"
                            value={formData.bond}
                            onChange={(e) => handleInputChange('bond', e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label className={labelClassName}>
                            Liveness Period (seconds) *
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={formData.liveness}
                            onChange={(e) => handleInputChange('liveness', parseInt(e.target.value) || 0)}
                            className={inputClassName}
                        />
                    </div>

                    <button
                        onClick={() => handleSubmit('dispute')}
                        disabled={isLoading}
                        className={`${buttonClassName} btn-danger`}
                    >
                        {isLoading ? 'Processing...' : 'Raise Dispute'}
                    </button>
                </div>
            </CollapsibleSection>
        </div>
    );
}
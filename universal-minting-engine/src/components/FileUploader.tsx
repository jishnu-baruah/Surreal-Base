'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
    onFilesUploaded: (files: File[]) => void;
    maxFiles?: number;
    maxSize?: number; // in bytes
    acceptedTypes?: string[];
}

export function FileUploader({
    onFilesUploaded,
    maxFiles = 5,
    maxSize = 50 * 1024 * 1024, // 50MB
    acceptedTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/plain', 'text/markdown']
}: FileUploaderProps) {
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const isPinataConfigured = process.env.NEXT_PUBLIC_PINATA_CONFIGURED === 'true';

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = [...uploadedFiles, ...acceptedFiles].slice(0, maxFiles);
        setUploadedFiles(newFiles);
        onFilesUploaded(newFiles);
    }, [uploadedFiles, maxFiles, onFilesUploaded]);

    const removeFile = (index: number) => {
        const newFiles = uploadedFiles.filter((_, i) => i !== index);
        setUploadedFiles(newFiles);
        onFilesUploaded(newFiles);
    };

    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        onDrop,
        maxFiles: maxFiles - uploadedFiles.length,
        maxSize,
        accept: acceptedTypes.reduce((acc, type) => {
            acc[type] = [];
            return acc;
        }, {} as Record<string, string[]>)
    });

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-4">
            {/* IPFS Configuration Notice */}
            {!isPinataConfigured && (
                <div className="card border-yellow-500/30">
                    <div className="flex items-start space-x-3">
                        <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                            <h4 className="text-sm font-medium text-yellow-400">IPFS Not Configured</h4>
                            <p className="text-sm text-gray-300 mt-1">
                                File uploads require Pinata IPFS configuration. You can still test IP registration without files.
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                                To enable file uploads: Get a JWT from <a href="https://app.pinata.cloud/keys" target="_blank" rel="noopener noreferrer" className="link">Pinata</a> and set PINATA_JWT in .env.local
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {/* Drop Zone */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive
                    ? 'border-blue-400 bg-white/10'
                    : 'border-white/20 hover:border-white/30'
                    }`}
            >
                <input {...getInputProps()} />
                <div className="space-y-2">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-500"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                    >
                        <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <div className="text-sm text-gray-300">
                        {isDragActive ? (
                            <p>Drop the files here...</p>
                        ) : (
                            <div>
                                <p>Drag & drop files here, or click to select</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Max {maxFiles} files, {formatFileSize(maxSize)} each
                                </p>
                                <p className="text-xs text-gray-400">
                                    Supports: Images, Videos, Audio, PDF, Text
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* File Rejections */}
            {fileRejections.length > 0 && (
                <div className="card border-red-500/30">
                    <h4 className="text-sm font-medium text-red-400 mb-2">
                        Some files were rejected:
                    </h4>
                    <ul className="text-sm text-red-300 space-y-1">
                        {fileRejections.map(({ file, errors }, index) => (
                            <li key={index}>
                                <strong>{file.name}</strong>:
                                {errors.map((error) => (
                                    <span key={error.code} className="ml-1">
                                        {error.message}
                                    </span>
                                ))}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Uploaded Files:</h4>
                    <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                            <div
                                key={index}
                                className="card-inner flex items-center justify-between"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                        {file.type.startsWith('image/') ? (
                                            <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                            </svg>
                                        ) : file.type.startsWith('video/') ? (
                                            <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                            </svg>
                                        ) : file.type.startsWith('audio/') ? (
                                            <svg className="h-5 w-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                            </svg>
                                        ) : (
                                            <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{file.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

export default function UploadZone({ onUpload }) {
    const onDrop = useCallback(acceptedFiles => {
        if (acceptedFiles?.length > 0) {
            onUpload(acceptedFiles[0]);
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
        maxFiles: 1
    });

    return (
        <div 
            {...getRootProps()} 
            className={`glass-panel p-10 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed transition-all duration-300 ${isDragActive ? 'border-accent bg-accent/5' : 'border-slate-700 hover:border-accent hover:bg-white/5'}`}
        >
            <input {...getInputProps()} />
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Initialize Analysis</h3>
            <p className="text-slate-400 text-sm mb-4">Drag & drop media or click to browse</p>
            <span className="text-xs bg-black/30 px-3 py-1 rounded-full text-slate-500">
                JPEG, PNG, WEBP up to 10MB
            </span>
        </div>
    );
}

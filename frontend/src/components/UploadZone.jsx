import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Link as LinkIcon, ArrowRight } from 'lucide-react';

export default function UploadZone({ onUpload }) {
    const [url, setUrl] = useState('');

    const onDrop = useCallback(acceptedFiles => {
        if (acceptedFiles?.length > 0) {
            onUpload({ type: 'files', data: acceptedFiles });
        }
    }, [onUpload]);

    const handleUrlSubmit = (e) => {
        e.preventDefault();
        if (url.trim()) {
            onUpload({ type: 'url', data: url.trim() });
            setUrl('');
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] }
    });

    return (
        <div className="flex flex-col gap-4">
            <div 
                {...getRootProps()} 
                className={`relative group rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden
                    ${isDragActive 
                        ? 'border-2 border-cyan-400 bg-cyan-900/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]' 
                        : 'border-2 border-dashed border-white/10 bg-black/40 hover:border-indigo-500/50 hover:bg-indigo-900/10 hover:shadow-[0_0_20px_rgba(79,70,229,0.15)]'}`}
            >
                {/* Hover Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

                <input {...getInputProps()} />
                
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 relative
                    ${isDragActive ? 'bg-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-110' : 'bg-white/5 group-hover:bg-indigo-500/20 group-hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]'}`}
                >
                    <div className="absolute inset-0 rounded-2xl bg-white/10 blur-sm pointer-events-none" />
                    <UploadCloud className={`w-10 h-10 relative z-10 transition-colors duration-500 ${isDragActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                </div>
                
                <h3 className={`text-2xl font-bold font-future mb-3 transition-colors ${isDragActive ? 'text-cyan-400' : 'text-white'}`}>
                    {isDragActive ? 'DROP TO INGEST' : 'INITIALIZE BATCH INGESTION'}
                </h3>
                
                <p className="text-slate-400 text-sm mb-6 text-center max-w-sm">
                    Drag & drop media payload (supports multiple files) or click to browse.
                </p>
                
                <div className="flex gap-3">
                    {['JPEG', 'PNG', 'WEBP'].map(ext => (
                        <span key={ext} className="text-[10px] font-mono font-bold tracking-widest bg-black/50 border border-white/10 px-3 py-1.5 rounded-full text-slate-500 group-hover:border-white/20 transition-colors">
                            {ext}
                        </span>
                    ))}
                </div>
            </div>

            <div className="relative group rounded-2xl p-6 border border-white/10 bg-black/40 hover:border-indigo-500/30 transition-all">
                <form onSubmit={handleUrlSubmit} className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <LinkIcon className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                        </div>
                        <input
                            type="url"
                            placeholder="Paste Image URL here..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-cyan-400/50 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2"
                        disabled={!url.trim()}
                    >
                        INGEST URL <ArrowRight className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}

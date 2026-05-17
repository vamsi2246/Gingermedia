import React, { useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';

export default function ImagePreviewModal({ isOpen, src, onClose }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !src) return null;

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div className="absolute top-6 right-6">
                <button 
                    onClick={onClose}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all text-white hover:text-cyan-400 border border-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>
            
            <div 
                className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center animate-in zoom-in-95 duration-500 ease-out"
                onClick={(e) => e.stopPropagation()}
            >
                <img 
                    src={src} 
                    alt="Full Preview" 
                    className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 cursor-zoom-out"
                    onClick={onClose}
                />
            </div>
        </div>
    );
}

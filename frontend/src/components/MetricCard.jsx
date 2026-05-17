import React from 'react';

export default function MetricCard({ title, icon: Icon, status, value, subtext, progress, colSpan = false }) {
    const statusColors = {
        ok: 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]',
        warn: 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]',
        err: 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]'
    };

    return (
        <div className={`bg-black/30 border border-card-border rounded-xl p-5 flex flex-col gap-3 transition-transform hover:-translate-y-1 ${colSpan ? 'col-span-2' : ''}`}>
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                    <Icon className="w-4 h-4 text-slate-500" />
                    {title}
                </span>
                {status && <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status]}`} />}
                {subtext && <span className="text-xs text-accent font-mono font-bold">{subtext}</span>}
            </div>
            
            <div className={`font-mono font-bold ${typeof value === 'string' && value.length > 20 ? 'text-sm font-sans leading-relaxed bg-white/5 p-3 rounded-lg max-h-24 overflow-y-auto' : 'text-2xl'}`}>
                {value}
            </div>

            {progress !== undefined && (
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                    <div 
                        className="h-full bg-accent rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                </div>
            )}
        </div>
    );
}

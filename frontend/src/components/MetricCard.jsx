import React from 'react';

export default function MetricCard({ title, icon: Icon, status, value, subtext, progress, colSpan = false, isCode = false }) {
    const statusStyles = {
        ok: {
            bg: 'bg-success/10',
            border: 'border-success/30',
            text: 'text-success',
            shadow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
            indicator: 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)]'
        },
        warn: {
            bg: 'bg-warning/10',
            border: 'border-warning/30',
            text: 'text-warning',
            shadow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
            indicator: 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.8)]'
        },
        err: {
            bg: 'bg-danger/10',
            border: 'border-danger/30',
            text: 'text-danger',
            shadow: 'group-hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
            indicator: 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.8)]'
        }
    };

    const currentStyle = status ? statusStyles[status] : {
        bg: 'bg-white/5',
        border: 'border-white/10',
        text: 'text-slate-200',
        shadow: 'group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]',
        indicator: 'bg-slate-400'
    };

    return (
        <div className={`relative group bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/10 ${currentStyle.shadow} ${colSpan ? 'col-span-2' : ''} overflow-hidden`}>
            
            {/* Background Glow */}
            {status && (
                <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[50px] opacity-20 ${currentStyle.bg} pointer-events-none`} />
            )}

            <div className="flex items-center justify-between relative z-10">
                <span className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <Icon className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    {title}
                </span>
                {status && <div className={`w-2 h-2 rounded-full ${currentStyle.indicator}`} />}
            </div>
            
            <div className={`relative z-10 font-bold ${isCode ? 'font-mono text-sm tracking-wide text-cyan-400 bg-cyan-900/10 border border-cyan-500/20 p-3 rounded-lg' : 'text-3xl font-future text-white'} ${typeof value === 'string' && value.length > 20 && !isCode ? 'text-sm font-sans leading-relaxed bg-white/5 p-3 rounded-lg max-h-24 overflow-y-auto custom-scrollbar' : ''}`}>
                {value}
            </div>

            <div className="mt-auto relative z-10 flex items-center justify-between">
                {subtext && <span className="text-[10px] font-mono text-slate-500 font-bold tracking-widest uppercase">{subtext}</span>}
                
                {progress !== undefined && (
                    <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden ml-auto">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${status ? currentStyle.indicator.split(' ')[0] : 'bg-cyan-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

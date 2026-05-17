import React from 'react';
import { Upload, ListOrdered, Cpu, Scan, Sparkles, CheckCircle2 } from 'lucide-react';

export default function PipelineVisualizer({ currentStage }) {
    const stages = [
        { id: 'uploaded', label: 'Uploaded', icon: Upload },
        { id: 'queued', label: 'Queued', icon: ListOrdered },
        { id: 'worker', label: 'Worker', icon: Cpu },
        { id: 'ocr', label: 'OCR', icon: Scan },
        { id: 'analysis', label: 'Analysis', icon: Sparkles },
        { id: 'completed', label: 'Completed', icon: CheckCircle2 }
    ];

    const getStageState = (index) => {
        const currentIndex = stages.findIndex(s => s.id === currentStage);
        if (currentIndex === -1) return 'pending';
        if (index < currentIndex) return 'completed';
        if (index === currentIndex) return 'active';
        return 'pending';
    };

    return (
        <div className="flex items-center justify-between py-8 px-4 w-full">
            {stages.map((stage, idx) => {
                const state = getStageState(idx);
                const isLast = idx === stages.length - 1;
                const Icon = stage.icon;

                return (
                    <React.Fragment key={stage.id}>
                        <div className="flex flex-col items-center gap-3 relative z-10 w-16">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-bg-dark
                                ${state === 'completed' ? 'border-accent bg-accent text-white' : 
                                  state === 'active' ? 'border-accent text-accent shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 
                                  'border-slate-700 text-slate-500'}`}
                            >
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${state === 'pending' ? 'text-slate-600' : 'text-slate-200'}`}>
                                {stage.label}
                            </span>
                        </div>
                        {!isLast && (
                            <div className="flex-1 h-[2px] bg-slate-800 -mx-4 relative top-[-14px] z-0">
                                <div className={`h-full bg-accent transition-all duration-700 ${state === 'completed' ? 'w-full' : 'w-0'}`} />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

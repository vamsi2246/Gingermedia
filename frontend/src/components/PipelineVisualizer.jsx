import React from 'react';
import { Upload, ListOrdered, Cpu, Scan, Sparkles, Layers, CheckCircle2 } from 'lucide-react';

export default function PipelineVisualizer({ currentStage }) {
    const stages = [
        { id: 'uploaded', label: 'Uploaded', icon: Upload },
        { id: 'queued', label: 'Pending Jobs', icon: ListOrdered },
        { id: 'worker', label: 'Processing Engine', icon: Cpu },
        { id: 'ocr', label: 'Text Detection', icon: Scan },
        { id: 'analysis', label: 'Analysis', icon: Sparkles },
        { id: 'duplicate', label: 'Similarity Scan', icon: Layers },
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
        <div className="flex items-center justify-between w-full relative">
            {/* Background Line */}
            <div className="absolute top-6 left-8 right-8 h-[2px] bg-white/10 z-0" />
            
            {stages.map((stage, idx) => {
                const state = getStageState(idx);
                const isLast = idx === stages.length - 1;
                const Icon = stage.icon;

                // Determine active connector color
                let connectorColor = 'bg-cyan-500';
                if (state === 'completed') connectorColor = 'bg-indigo-500';

                return (
                    <React.Fragment key={stage.id}>
                        <div className="flex flex-col items-center gap-4 relative z-10 w-24">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-700 relative bg-bg-deep
                                ${state === 'completed' ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.5)]' : 
                                  state === 'active' ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.8)] scale-110' : 
                                  'border-white/10 text-slate-600'}`}
                            >
                                <Icon className={`w-5 h-5 ${state === 'active' ? 'animate-pulse' : ''}`} />
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-widest text-center
                                ${state === 'pending' ? 'text-slate-600' : 
                                  state === 'active' ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]' : 'text-slate-300'}`}
                            >
                                {stage.label}
                            </span>
                        </div>
                        
                        {!isLast && (
                            <div className="flex-1 h-[2px] relative z-0 -mx-8 top-[-15px]">
                                <div className={`absolute inset-0 transition-all duration-[800ms] ease-out shadow-[0_0_10px_currentColor]
                                    ${state === 'completed' ? `w-full ${connectorColor}` : 
                                      state === 'active' ? `w-1/2 ${connectorColor} bg-gradient-to-r from-indigo-500 to-cyan-400` : 'w-0 bg-transparent'}`} 
                                />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

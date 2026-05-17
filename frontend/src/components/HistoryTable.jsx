import { Terminal, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function HistoryTable({ history, onItemClick, selectedId, onDelete }) {
    if (!history || history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 h-full text-center">
                <Terminal className="w-12 h-12 text-slate-700 mb-4" />
                <h4 className="text-slate-400 font-bold font-future mb-1">Awaiting Telemetry</h4>
                <p className="text-slate-600 text-xs font-mono uppercase tracking-widest">System idle. Ready for ingestion.</p>
            </div>
        );
    }

    const getStatusStyle = (status) => {
        switch(status) {
            case 'COMPLETED': return 'text-success bg-success/10 border-success/20';
            case 'FAILED': return 'text-danger bg-danger/10 border-danger/20';
            default: return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20 shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse';
        }
    };

    const getVerdictDot = (verdict) => {
        if (!verdict) return 'bg-slate-600';
        if (['CLEAR_TEXT_DOCUMENT', 'READABLE_DOCUMENT', 'VEHICLE_IDENTIFIABLE', 'VISUALLY_CLEAR_IMAGE', 'SEMANTICALLY_VALID_IMAGE'].includes(verdict)) return 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)]';
        if (['LOW_QUALITY_BUT_READABLE', 'TEXT_PARTIALLY_RECOVERABLE', 'NUMBER_PLATE_PARTIALLY_VISIBLE', 'LOW_VISIBILITY_CAPTURE', 'LOW_DETAIL_IMAGE', 'INFORMATION_RECOVERABLE', 'OVEREXPOSED_DOCUMENT'].includes(verdict)) return 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.8)]';
        if (['UNUSABLE', 'DUPLICATE_VEHICLE_FRAME'].includes(verdict)) return 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.8)]';
        return 'bg-slate-500';
    };

    return (
        <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="premium-table min-w-[600px]">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((item) => {
                        const isSelected = selectedId === item.id;
                        return (
                        <tr 
                            key={item.id} 
                            onClick={() => { if(item.status === 'COMPLETED' && onItemClick) onItemClick(item.id); }}
                            className={`${item.status === 'COMPLETED' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} 
                                ${isSelected ? 'bg-indigo-500/10 border-indigo-500/30' : ''} group`}
                        >
                            <td className={isSelected ? 'bg-indigo-500/10' : ''}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg border overflow-hidden shrink-0 transition-colors 
                                        ${isSelected ? 'border-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.5)]' : 'border-white/10 bg-black'}`}>
                                        <img src={`http://localhost:3000${item.filePath}`} alt="thumb" className="w-full h-full object-cover opacity-80" />
                                    </div>
                                    <span className={`font-mono text-[11px] font-bold truncate transition-colors max-w-[150px] ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`} title={item.originalName}>
                                        {item.originalName}
                                    </span>
                                </div>
                            </td>
                            <td className={isSelected ? 'bg-indigo-500/10' : ''}>
                                <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                    {format(new Date(item.createdAt), 'HH:mm:ss.SSS')}
                                </span>
                            </td>
                            <td className={isSelected ? 'bg-indigo-500/10' : ''}>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border whitespace-nowrap ${getStatusStyle(item.status)}`}>
                                    {item.status}
                                </span>
                            </td>
                            <td className={isSelected ? 'bg-indigo-500/10' : ''}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.status === 'FAILED' ? 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.8)]' : getVerdictDot(item.analysisResult?.overallVerdict)}`} />
                                        <span className={`font-mono text-[10px] font-bold truncate max-w-[150px] ${item.status === 'FAILED' ? 'text-danger' : isSelected ? 'text-indigo-200' : 'text-slate-400'}`} title={item.failureReason?.message || item.analysisResult?.overallVerdict || 'PENDING'}>
                                            {item.status === 'FAILED' 
                                                ? (item.failureReason?.message?.split(':')[0] || 'PROCESSING_ERROR') 
                                                : (item.analysisResult?.overallVerdict || 'PENDING')}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if(onDelete) onDelete(item.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-danger/20 rounded-md transition-all text-slate-500 hover:text-danger shrink-0"
                                        title="Delete Record"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>
    );
}

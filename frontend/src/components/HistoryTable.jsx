import React from 'react';
import { Inbox } from 'lucide-react';
import { format } from 'date-fns';

export default function HistoryTable({ history }) {
    if (!history || history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-black/10 border border-dashed border-card-border rounded-xl text-center">
                <Inbox className="w-12 h-12 text-slate-600 mb-4 opacity-50" />
                <h4 className="text-slate-300 font-medium mb-1">No Processing History</h4>
                <p className="text-slate-500 text-sm">Upload an image to start the pipeline.</p>
            </div>
        );
    }

    const getStatusStyle = (status) => {
        switch(status) {
            case 'COMPLETED': return 'bg-success/10 text-success border-success/20';
            case 'FAILED': return 'bg-danger/10 text-danger border-danger/20';
            default: return 'bg-accent/10 text-accent border-accent/20';
        }
    };

    const getVerdictStyle = (verdict) => {
        switch(verdict) {
            case 'ACCEPTABLE': return 'text-success';
            case 'SUSPICIOUS': return 'text-warning';
            case 'POOR_QUALITY': return 'text-danger';
            default: return 'text-slate-400';
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="premium-table">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Status</th>
                        <th>Verdict</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((item) => (
                        <tr key={item.id}>
                            <td>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded border border-card-border overflow-hidden bg-black">
                                        <img src={`http://localhost:3000${item.filePath}`} alt="thumb" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-mono text-xs max-w-[120px] truncate" title={item.originalName}>
                                        {item.originalName}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getStatusStyle(item.status)}`}>
                                    {item.status}
                                </span>
                            </td>
                            <td>
                                <span className={`font-mono font-bold text-xs ${getVerdictStyle(item.analysisResult?.overallVerdict)}`}>
                                    {item.analysisResult?.overallVerdict || '-'}
                                </span>
                            </td>
                            <td className="font-mono text-xs text-slate-400">
                                {format(new Date(item.createdAt), 'HH:mm')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

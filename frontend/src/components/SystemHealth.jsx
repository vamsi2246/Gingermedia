import React, { useEffect, useState } from 'react';
import { Server } from 'lucide-react';
import apiClient from '../lib/api';

export default function SystemHealth() {
    const [health, setHealth] = useState({
        systems: { worker: 'offline', db: 'offline', redis: 'offline' },
        metrics: { queueSize: 0, activeJobs: 0 }
    });

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await apiClient.get('/api/health');
                setHealth(res.data);
            } catch (e) {
                setHealth({
                    systems: { worker: 'offline', db: 'offline', redis: 'offline' },
                    metrics: { queueSize: 0, activeJobs: 0 }
                });
            }
        };
        fetchHealth();
        const interval = setInterval(fetchHealth, 5000);
        return () => clearInterval(interval);
    }, []);

    const StatusIndicator = ({ label, status }) => (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/5">
            <div className="relative flex h-2 w-2">
                {status === 'online' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'online' ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}></span>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">{label}</span>
        </div>
    );

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-2">
                <Server className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Nodes</span>
            </div>
            <StatusIndicator label="API" status="online" />
            <StatusIndicator label="DB" status={health.systems.db} />
            <StatusIndicator label="REDIS" status={health.systems.redis} />
            <StatusIndicator label="WORKER" status={health.systems.worker} />
            
            <div className="w-px h-6 bg-white/10 mx-2" />
            
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]">
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">Queue</span>
                <span className="text-sm font-bold text-white font-mono">{health.metrics.queueSize}</span>
            </div>
        </div>
    );
}

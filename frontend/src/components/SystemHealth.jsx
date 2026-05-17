import React, { useEffect, useState, useCallback } from 'react';
import { Server } from 'lucide-react';
import apiClient from '../lib/api';

const DEFAULT_HEALTH = {
    api: 'online',   // API is always online if the page loaded
    db: 'offline',
    redis: 'offline',
    worker: 'offline',
    queue: 'degraded',
    metrics: { queueSize: 0, activeJobs: 0 }
};

export default function SystemHealth() {
    const [health, setHealth] = useState(DEFAULT_HEALTH);
    const [retryCount, setRetryCount] = useState(0);

    const fetchHealth = useCallback(async () => {
        try {
            const res = await apiClient.get('/api/health');
            const data = res.data;

            // Validate the response has the expected shape before updating state
            if (data && typeof data.db === 'string') {
                setHealth({
                    api: 'online',
                    db: data.db || 'offline',
                    redis: data.redis || 'offline',
                    worker: data.worker || 'offline',
                    queue: data.queue || 'degraded',
                    metrics: data.metrics || { queueSize: 0, activeJobs: 0 }
                });
                setRetryCount(0); // reset backoff on success
            }
        } catch (e) {
            console.warn('[SystemHealth] Health poll failed:', e.message);
            setHealth(prev => ({ ...prev, api: 'online' })); // API is still "online" — page loaded
            setRetryCount(prev => prev + 1);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        // Poll every 5s. On repeated failures, we just keep polling — no exponential backoff
        // since the health endpoint is lightweight
        const interval = setInterval(fetchHealth, 5000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const StatusIndicator = ({ label, status }) => {
        const isOnline = status === 'online';
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/5">
                <div className="relative flex h-2 w-2">
                    {isOnline && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                    )}
                    <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                            isOnline
                                ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                                : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                        }`}
                    />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    {label}
                </span>
            </div>
        );
    };

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-2">
                <Server className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Nodes</span>
            </div>

            <StatusIndicator label="API"    status={health.api} />
            <StatusIndicator label="DB"     status={health.db} />
            <StatusIndicator label="REDIS"  status={health.redis} />
            <StatusIndicator label="WORKER" status={health.worker} />

            <div className="w-px h-6 bg-white/10 mx-2" />

            <div className="flex items-center gap-3 px-4 py-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]">
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">Queue</span>
                <span className="text-sm font-bold text-white font-mono">
                    {health.metrics?.queueSize ?? 0}
                </span>
            </div>

            {retryCount > 2 && (
                <div className="text-[9px] font-mono text-warning/60 uppercase tracking-widest">
                    retrying...
                </div>
            )}
        </div>
    );
}

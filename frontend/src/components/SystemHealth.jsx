import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function SystemHealth() {
    const [health, setHealth] = useState({
        systems: { worker: 'offline', db: 'offline', redis: 'offline' },
        metrics: { queueSize: 0, activeJobs: 0 }
    });

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await axios.get('http://localhost:3000/api/health');
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
        <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
                {status === 'online' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'online' ? 'bg-success' : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></span>
            </div>
            <span className="text-xs font-medium text-slate-400">{label}</span>
        </div>
    );

    return (
        <div className="flex items-center gap-6">
            <StatusIndicator label="Worker" status={health.systems.worker} />
            <div className="w-px h-5 bg-card-border" />
            <StatusIndicator label="Database" status={health.systems.db} />
            <div className="w-px h-5 bg-card-border" />
            <StatusIndicator label="Redis" status={health.systems.redis} />
            <div className="w-px h-5 bg-card-border" />
            <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-400">Queue Size</span>
                <span className="text-sm font-bold text-accent font-mono">{health.metrics.queueSize}</span>
            </div>
        </div>
    );
}

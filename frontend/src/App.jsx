import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cpu, Activity, CheckCircle, XCircle, Database, Layers } from 'lucide-react';
import UploadZone from './components/UploadZone';
import PipelineVisualizer from './components/PipelineVisualizer';
import MetricCard from './components/MetricCard';
import SystemHealth from './components/SystemHealth';
import HistoryTable from './components/HistoryTable';

function App() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [stage, setStage] = useState('pending'); // pending, uploaded, queued, worker, ocr, analysis, completed
    const [results, setResults] = useState(null);
    const [analytics, setAnalytics] = useState({ total: 0, completed: 0, failed: 0, avgConfidence: 0 });
    const [history, setHistory] = useState([]);

    const fetchDashboardData = async () => {
        try {
            const [analyticsRes, historyRes] = await Promise.all([
                axios.get('http://localhost:3000/api/analytics'),
                axios.get('http://localhost:3000/api/recent')
            ]);
            setAnalytics(analyticsRes.data.data);
            setHistory(historyRes.data.data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleUpload = async (selectedFile) => {
        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
        setStage('uploaded');
        setResults(null);

        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            const res = await axios.post('http://localhost:3000/api/upload', formData);
            const { id } = res.data.data;
            setStage('queued');
            pollStatus(id);
        } catch (error) {
            console.error('Upload Failed', error);
            setStage('pending');
            alert('Upload failed');
        }
    };

    const pollStatus = (id) => {
        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`http://localhost:3000/api/status/${id}`);
                const { status } = res.data.data;

                if (status === 'PROCESSING') {
                    setStage('ocr');
                    setTimeout(() => setStage('analysis'), 1500); // Simulate stages inside processing
                } else if (status === 'COMPLETED') {
                    clearInterval(interval);
                    setStage('completed');
                    const resultRes = await axios.get(`http://localhost:3000/api/result/${id}`);
                    setResults(resultRes.data.data);
                    fetchDashboardData();
                } else if (status === 'FAILED') {
                    clearInterval(interval);
                    setStage('pending');
                    alert('Processing Failed');
                }
            } catch (e) {
                // Ignore temporary 404s or errors
            }
        }, 1500);
    };

    return (
        <>
            <div className="glow-bg" />
            <div className="grid-bg" />
            
            <nav className="glass-panel rounded-none border-t-0 border-x-0 h-16 sticky top-0 z-50 flex items-center justify-between px-8">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-accent flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                        <Cpu className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight">Media<span className="text-accent">Intelligence</span></h1>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold leading-none">AI Engineering Platform</p>
                    </div>
                </div>
                <SystemHealth />
            </nav>

            <main className="max-w-[1600px] mx-auto p-8 flex flex-col gap-8">
                
                {/* Analytics Grid */}
                <div className="grid grid-cols-5 gap-6">
                    <div className="glass-panel p-5 transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-2 mb-3">
                            <Layers className="w-4 h-4 text-slate-400" />
                            <span className="text-xs text-slate-400 font-semibold uppercase">Total Uploads</span>
                        </div>
                        <span className="text-3xl font-bold font-mono">{analytics.total}</span>
                    </div>
                    <div className="glass-panel p-5 transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span className="text-xs text-slate-400 font-semibold uppercase">Completed Jobs</span>
                        </div>
                        <span className="text-3xl font-bold font-mono text-success">{analytics.completed}</span>
                    </div>
                    <div className="glass-panel p-5 transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-2 mb-3">
                            <XCircle className="w-4 h-4 text-danger" />
                            <span className="text-xs text-slate-400 font-semibold uppercase">Failed Jobs</span>
                        </div>
                        <span className="text-3xl font-bold font-mono text-danger">{analytics.failed}</span>
                    </div>
                    <div className="glass-panel p-5 transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4 text-accent" />
                            <span className="text-xs text-slate-400 font-semibold uppercase">Success Rate</span>
                        </div>
                        <span className="text-3xl font-bold font-mono text-accent">
                            {analytics.total > 0 ? Math.round((analytics.completed / analytics.total) * 100) : 0}%
                        </span>
                    </div>
                    <div className="glass-panel p-5 transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-2 mb-3">
                            <Database className="w-4 h-4 text-warning" />
                            <span className="text-xs text-slate-400 font-semibold uppercase">Avg Confidence</span>
                        </div>
                        <span className="text-3xl font-bold font-mono text-warning">
                            {Math.round(analytics.avgConfidence * 100)}%
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
                    {/* Left Column */}
                    <div className="flex flex-col gap-8">
                        
                        {/* Live Pipeline Control */}
                        <div className="glass-panel p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-accent" />
                                    Live Processing Pipeline
                                </h2>
                                <span className="px-3 py-1 rounded-full border border-slate-600 text-xs font-semibold text-slate-300">
                                    {stage === 'pending' ? 'Ready' : 'Processing...'}
                                </span>
                            </div>

                            {stage === 'pending' ? (
                                <UploadZone onUpload={handleUpload} />
                            ) : (
                                <div className="bg-black/30 border border-card-border rounded-xl p-8 mb-6">
                                    <PipelineVisualizer currentStage={stage} />
                                </div>
                            )}
                        </div>

                        {/* Analysis Results */}
                        {results && (
                            <div className="glass-panel p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-card-border">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Database className="w-5 h-5 text-accent" />
                                        Analysis Intelligence
                                    </h2>
                                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
                                        <span className="text-xs text-slate-400 uppercase font-semibold">Verdict:</span>
                                        <span className={`text-sm font-bold font-mono ${
                                            results.overallVerdict === 'ACCEPTABLE' ? 'text-success' : 
                                            results.overallVerdict === 'SUSPICIOUS' ? 'text-warning' : 'text-danger'
                                        }`}>
                                            {results.overallVerdict}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-[280px_1fr] gap-6">
                                    <div className="flex flex-col gap-4">
                                        <div className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-card-border bg-black relative">
                                            <img src={preview} className="w-full h-full object-cover opacity-80" alt="Preview" />
                                            <div className="absolute top-4 right-4 bg-success/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-lg text-white">
                                                <CheckCircle className="w-3.5 h-3.5" /> Analyzed
                                            </div>
                                        </div>
                                        <button onClick={() => { setStage('pending'); setResults(null); }} className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-semibold transition-colors">
                                            New Analysis
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 content-start">
                                        <MetricCard title="Blur Score" icon={Activity} status={results.blurScore > 100 ? 'ok' : 'err'} value={results.blurScore.toFixed(2)} progress={results.blurScore / 5} />
                                        <MetricCard title="Brightness" icon={Activity} status={results.brightnessCategory === 'Normal' ? 'ok' : 'warn'} value={Math.round(results.brightnessValue)} subtext={results.brightnessCategory} progress={results.brightnessValue / 2.5} />
                                        <MetricCard title="Extracted OCR" icon={Scan} colSpan={true} value={results.ocrText || 'No text detected'} subtext={`CONF: ${(results.ocrConfidence * 100).toFixed(0)}%`} />
                                        <MetricCard title="Duplicates" icon={Layers} status={results.isDuplicate ? 'warn' : 'ok'} value={results.isDuplicate ? 'Match Found' : 'Unique'} />
                                        <MetricCard title="Pattern" icon={CheckCircle} status={results.patternValid ? 'ok' : 'err'} value={results.patternValid ? 'Verified' : 'Invalid'} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: History */}
                    <div className="flex flex-col gap-8">
                        <div className="glass-panel p-6 h-full">
                            <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                                <Activity className="w-5 h-5 text-accent" />
                                Activity Log
                            </h2>
                            <HistoryTable history={history} />
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

export default App;

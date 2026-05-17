import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="glass-panel p-8 w-full flex flex-col items-center justify-center min-h-[300px] text-center">
                    <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-6 border border-danger/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                        <AlertTriangle className="w-8 h-8 text-danger" />
                    </div>
                    <h2 className="text-xl font-bold font-future text-white mb-2">UI Rendering Fault</h2>
                    <p className="text-slate-400 text-sm max-w-md mb-6">
                        An unexpected error occurred while rendering this component. The rest of the dashboard remains operational.
                    </p>
                    <button 
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-semibold transition-colors"
                    >
                        Attempt Recovery
                    </button>
                    <div className="mt-6 p-4 bg-black/50 border border-danger/20 rounded-lg max-w-lg overflow-auto text-left">
                        <pre className="text-[10px] font-mono text-danger/80">
                            {this.state.error?.toString()}
                        </pre>
                    </div>
                </div>
            );
        }

        return this.props.children; 
    }
}

export default ErrorBoundary;

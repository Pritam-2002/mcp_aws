import { useState, useEffect } from 'react';
import { Play, Settings, Server, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface Tool {
    id: string;
    name: string;
    description: string;
    inputs: InputField[];
}

interface InputField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'select';
    placeholder?: string;
    options?: { label: string; value: string }[];
    defaultValue?: string | number;
}

const TOOLS: Tool[] = [
    {
        id: 'list_instances',
        name: 'List Instances',
        description: 'List all EC2 instances in the current region.',
        inputs: []
    },
    {
        id: 'fleet_health',
        name: 'Fleet Health Check',
        description: 'Analyze the health of all instances based on CPU utilization.',
        inputs: [
            { id: 'durationMinutes', label: 'Duration (Minutes)', type: 'number', defaultValue: 60, placeholder: '60' }
        ]
    },
    {
        id: 'get_metrics',
        name: 'Get Instance Metrics',
        description: 'Retrieve detailed CloudWatch metrics for a specific instance.',
        inputs: [
            { id: 'instanceId', label: 'Instance ID', type: 'select', placeholder: 'Select instance...' },
            { id: 'durationMinutes', label: 'Duration (Minutes)', type: 'number', defaultValue: 60, placeholder: '60' }
        ]
    }
];

function App() {
    const [selectedToolId, setSelectedToolId] = useState<string>(TOOLS[0].id);
    const [inputs, setInputs] = useState<Record<string, any>>({});
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [instances, setInstances] = useState<{ label: string; value: string }[]>([]);

    const selectedTool = TOOLS.find(t => t.id === selectedToolId);

    // Fetch instances for dropdown when tool changes to 'get_metrics'
    useEffect(() => {
        if (selectedToolId === 'get_metrics' && instances.length === 0) {
            fetchInstances();
        }
    }, [selectedToolId]);

    const fetchInstances = async () => {
        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '';
            const res = await fetch(`${apiBase}/api/instances`);
            if (!res.ok) throw new Error('Failed to fetch instances');
            const data = await res.json();
            const options = data.map((inst: any) => ({
                label: `${inst.instanceId} (${inst.state})`,
                value: inst.instanceId
            }));
            setInstances(options);
        } catch (err: any) {
            console.error(err);
            // Fallback or error handling for dropdown
        }
    };

    const handleInputChange = (id: string, value: any) => {
        setInputs(prev => ({ ...prev, [id]: value }));
    };

    const handleRunTool = async () => {
        if (!selectedTool) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            let endpoint = '';
            let method = 'GET';
            let body = null;

            switch (selectedTool.id) {
                case 'list_instances':
                    endpoint = '/api/instances';
                    method = 'GET';
                    break;
                case 'fleet_health':
                    endpoint = '/api/fleet-health';
                    method = 'POST';
                    body = JSON.stringify({
                        durationMinutes: Number(inputs.durationMinutes || 60)
                    });
                    break;
                case 'get_metrics':
                    endpoint = '/api/metrics';
                    method = 'POST';
                    body = JSON.stringify({
                        instanceId: inputs.instanceId,
                        durationMinutes: Number(inputs.durationMinutes || 60)
                    });
                    break;
                default:
                    throw new Error('Unknown tool');
            }

            const apiBase = import.meta.env.VITE_API_BASE_URL || '';
            const res = await fetch(`${apiBase}${endpoint}`, {
                method,
                headers: body ? { 'Content-Type': 'application/json' } : {},
                body
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || res.statusText);
            }

            const data = await res.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'An error occurred while running the tool.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-8 text-slate-100 flex flex-col gap-8">
            <header className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                        AI SRE Dashboard
                    </h1>
                    <p className="text-slate-400 text-sm">Orchestra-Managed Cloud Operations</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Configuration */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="glass-panel p-6 space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Settings className="w-5 h-5 text-blue-400" />
                            Configuration
                        </h2>

                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-sm font-medium text-slate-300 mb-1 block">Select Tool</span>
                                <select
                                    className="input-field cursor-pointer"
                                    value={selectedToolId}
                                    onChange={(e) => {
                                        setSelectedToolId(e.target.value);
                                        setInputs({});
                                        setResult(null);
                                        setError(null);
                                    }}
                                >
                                    {TOOLS.map(tool => (
                                        <option key={tool.id} value={tool.id}>{tool.name}</option>
                                    ))}
                                </select>
                            </label>

                            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 text-sm text-slate-400 min-h-[60px]">
                                {selectedTool?.description}
                            </div>

                            {selectedTool?.inputs.map(input => (
                                <label key={input.id} className="block">
                                    <span className="text-sm font-medium text-slate-300 mb-1 block">{input.label}</span>
                                    {input.type === 'select' && input.id === 'instanceId' ? (
                                        <select
                                            className="input-field cursor-pointer"
                                            value={inputs[input.id] || ''}
                                            onChange={(e) => handleInputChange(input.id, e.target.value)}
                                        >
                                            <option value="" disabled>Select an instance...</option>
                                            {instances.map(inst => (
                                                <option key={inst.value} value={inst.value}>{inst.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={input.type}
                                            className="input-field"
                                            placeholder={input.placeholder}
                                            defaultValue={input.defaultValue}
                                            onChange={(e) => handleInputChange(input.id, e.target.value)}
                                        />
                                    )}
                                </label>
                            ))}

                            <button
                                onClick={handleRunTool}
                                disabled={loading || (selectedToolId === 'get_metrics' && !inputs.instanceId)}
                                className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Running...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Play className="w-4 h-4 fill-current" />
                                        Run Tool
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Output */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="glass-panel flex-1 p-0 overflow-hidden flex flex-col min-h-[500px]">
                        <div className="bg-slate-800/50 border-b border-slate-700/50 p-4 flex justify-between items-center">
                            <h2 className="text-lg font-medium flex items-center gap-2">
                                <Server className="w-5 h-5 text-emerald-400" />
                                Output Console
                            </h2>
                            {result && !error && (
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Success
                                </span>
                            )}
                            {error && (
                                <span className="px-3 py-1 bg-red-500/10 text-red-400 text-xs rounded-full border border-red-500/20 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Error
                                </span>
                            )}
                        </div>

                        <div className="flex-1 p-6 relative overflow-auto bg-[#0d1117]">
                            {loading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4">
                                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                    <p className="animate-pulse font-mono text-sm">Executing {selectedTool?.name}...</p>
                                </div>
                            ) : error ? (
                                <div className="text-red-400 font-mono text-sm whitespace-pre-wrap">{error}</div>
                            ) : result ? (
                                <pre className="text-sm font-mono text-blue-300 leading-relaxed bg-transparent p-0 m-0">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                                        <Play className="w-8 h-8 text-slate-700" />
                                    </div>
                                    <p className="text-sm">Ready to execute. Select a tool and click Run.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;

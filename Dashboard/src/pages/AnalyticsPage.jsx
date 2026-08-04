import { useState, useEffect } from 'react';
import CommandCentreCards from '../components/CommandCentreCards';
import { Activity } from 'lucide-react';
import TemporalSection from '../components/TemporalSection';
import SpatialSection from '../components/SpatialSection';
import ProfilingSection from '../components/ProfilingSection';
import NetworkSection from '../components/NetworkSection';
import ErrorBoundary from '../components/ErrorBoundary';


const AnalyticsPage = () => {
  const [liveMode, setLiveMode] = useState(false);

  return (
    <div className="h-screen bg-slate-950 text-slate-200 relative overflow-y-auto">
      {/* Background grid*/}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      {/* Scanline overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJzY2FuIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIyMHB4IiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxcHgiIGZpbGw9InJnYmEoMTYsIDE4NSwgMTI5LCAwLjA0KSIgLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjc2NhbikiIC8+PC9zdmc+')] pointer-events-none opacity-50" />

      {/* Main content*/}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Activity className="text-blue-500" size={32} />
              Crime Intelligence Centre
            </h1>
            <p className="text-slate-400 text-sm mt-1">Real‑time analytics and predictive insights</p>
          </div>

          <div className="flex items-center gap-4">
            <select className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500">
              <option>All Districts</option>
            </select>

            <button
              onClick={() => setLiveMode(!liveMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                liveMode
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {liveMode ? '● Live' : '○ Live'}
            </button>
          </div>
        </div>

        {/* Sections */}
        <ErrorBoundary><CommandCentreCards liveMode={liveMode} /></ErrorBoundary>
        <ErrorBoundary><TemporalSection /></ErrorBoundary>
        <ErrorBoundary><SpatialSection /></ErrorBoundary>
        <ErrorBoundary><ProfilingSection /></ErrorBoundary>
        <ErrorBoundary><NetworkSection /></ErrorBoundary>
      </div>
    </div>
  );
};

export default AnalyticsPage;
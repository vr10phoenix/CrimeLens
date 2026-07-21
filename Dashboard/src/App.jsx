import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, User, Shield, Map as MapIcon, Activity, Database, AlertTriangle, 
  Menu, Search, MoreVertical, BrainCircuit, Network, BarChart3, 
  Crosshair, Zap, Fingerprint, Lock, ChevronRight, Eye, Radio,ZoomIn , ZoomOut , Maximize,
  DatabaseIcon , ShieldAlert
} from 'lucide-react';
import axios from 'axios';

// MOCK DATA: KARNATAKA POLICE INTEL
const MOCK_DATA = {
  analytics: {
    stats: [
      { label: "Active FIRs (30d)", value: "2,451", trend: "+12%", danger: true },
      { label: "Arrests Executed", value: "843", trend: "+5%", danger: false },
      { label: "Conviction Rate", value: "68.4%", trend: "-2.1%", danger: true },
      { label: "Active Units", value: "142", trend: "Optimal", danger: false }
    ],
    trends: [45, 52, 38, 65, 48, 71, 59, 80, 65, 92, 78, 85]
  },
  ml: {
    hotspots: [
      { id: 1, name: "Shivajinagar Sector 4", risk: 92, type: "Organized Crime" },
      { id: 2, name: "Koramangala 8th Block", risk: 78, type: "Narcotics" },
      { id: 3, name: "Mangaluru Port Zone", risk: 85, type: "Smuggling" },
      { id: 4, name: "Hubballi Central", risk: 64, type: "Extortion" },
      { id: 4, name: "Commerecial Street : JP Morgan", risk: 81, type: "Mass Bank Robbery" },
    ]
  },
  network: {
    nodes: [
      { id: 1, name: "Target Alpha", role: "Syndicate Boss", x: 50, y: 20, status: "active" },
      { id: 2, name: "Operative B", role: "Enforcer", x: 25, y: 50, status: "arrested" },
      { id: 3, name: "Operative C", role: "Financier", x: 75, y: 50, status: "monitoring" },
      { id: 4, name: "Runner D1", role: "Street Level", x: 15, y: 80, status: "active" },
      { id: 5, name: "Runner D2", role: "Street Level", x: 35, y: 80, status: "active" },
      { id: 6, name: "Shell Corp X", role: "Laundering", x: 85, y: 80, status: "active" },
    ],
    edges: [
      { source: 1, target: 2 }, { source: 1, target: 3 },
      { source: 2, target: 4 }, { source: 2, target: 5 },
      { source: 3, target: 6 }
    ]
  }
};


// KSP Conversional UI component
const Card = ({ children, className = "", title, icon: Icon, action }) => (
  <div className={`relative bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden ${className}`}>
    {/* Tactical corner accents */}
    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-blue-500/50" />
    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-blue-500/50" />
    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-blue-500/50" />
    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-blue-500/50" />
    
    {(title || Icon) && (
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60 bg-slate-800/30">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-blue-400" />}
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">{title}</h3>
        </div>
        {action}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

const CustomLineChart = ({ data }) => {
  const max = Math.max(...data);
  return (
    <div className="w-full h-48 flex items-end justify-between gap-1 relative">
      <div className="absolute inset-0 border-b border-l border-slate-700/50" />
      {data.map((val, i) => (
        <div key={i} className="relative group w-full flex justify-center h-full items-end z-10">
          <div 
            className="w-full bg-gradient-to-t from-blue-600/80 to-cyan-400/80 rounded-t-sm transition-all duration-500 hover:opacity-100 opacity-60"
            style={{ height: `${(val / max) * 100}%` }}
          />
          <div className="absolute -top-8 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-slate-600 z-20">
            {val}
          </div>
        </div>
      ))}
    </div>
  );
};


// CHATBOT INTERFACE
const ChatModule = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    "Pull arrest records for Syndicate Alpha",
    "Analyze cybercrime trends for Q3 in BLR",
    "Cross-reference Mangaluru port manifests",
    "List pending warrants in Hubballi"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e, promptText = null) => {
    if (e) e.preventDefault();
    const query = promptText || input.trim();
    if (!query || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:8000/api/chat', { query });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'System Error: Main intelligence server offline. Trying backup nodes...' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto animate-in fade-in duration-700">
            <div className="relative mb-8 group">
              <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full animate-pulse" />
              <Shield size={72} className="text-blue-400 relative z-10" strokeWidth={1} />
              <Crosshair size={120} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500/20 animate-[spin_10s_linear_infinite]" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">CrimeLens AI</h2>
            <p className="text-slate-400 text-sm mb-8 max-w-lg">
              Secure neural-link established. Querying criminal databases, real-time FIR logs, and predictive risk matrices.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {quickPrompts.map((prompt, i) => (
                <button 
                  key={i} onClick={(e) => sendMessage(e, prompt)}
                  className="p-4 text-sm text-left border border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/50 hover:border-blue-500/50 rounded-xl transition-all text-slate-300 flex items-center justify-between group backdrop-blur-sm"
                >
                  {prompt}
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:text-blue-400 transition-all group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-slate-600 text-cyan-400'
                }`}>
                  {msg.role === 'user' ? <User size={18} /> : <Zap size={18} />}
                </div>
                <div className={`max-w-[80%] p-4 text-sm leading-relaxed backdrop-blur-md ${
                  msg.role === 'user' 
                    ? 'bg-blue-600/90 text-white rounded-2xl rounded-tr-sm border border-blue-500' 
                    : 'bg-slate-800/60 border border-slate-600/50 text-slate-200 rounded-2xl rounded-tl-sm shadow-[0_0_15px_rgba(0,0,0,0.2)]'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-800 border border-slate-600 text-cyan-400 flex items-center justify-center">
                  <Activity size={18} className="animate-pulse" />
                </div>
                <div className="bg-slate-800/60 border border-slate-600/50 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 z-20">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative flex items-center">
          <div className="absolute left-4 text-blue-500 animate-pulse"><Radio size={20} /></div>
          <input
            type="text" placeholder="Transmit secure query..."
            value={input} onChange={(e) => setInput(e.target.value)} disabled={loading}
            className="w-full bg-slate-950/50 border border-slate-700 text-white pl-12 pr-14 py-4 rounded-xl focus:outline-none focus:border-blue-500 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all font-mono text-sm placeholder:text-slate-600"
            autoFocus
          />
          <button 
            type="submit" disabled={loading || !input.trim()} 
            className="absolute right-2 p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-all"
          >
            <Send size={18} className={input.trim() && !loading ? "translate-x-0.5 -translate-y-0.5" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
};


// CRIME ANALYTICS
const AnalyticsModule = () => {
  const [stats, setStats] = useState(null);
  const [districtData, setDistrictData] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [crimeTypes, setCrimeTypes] = useState([]);
  const [gangActivity, setGangActivity] = useState([]);
  const [financialCrimes, setFinancialCrimes] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, districtRes, trendRes, crimeRes, gangRes, finRes] = await Promise.all([
          axios.get('http://localhost:8001/api/analytics/stats'),
          axios.get('http://localhost:8001/api/analytics/district_crimes'),
          axios.get('http://localhost:8001/api/analytics/monthly_trend'),
          axios.get('http://localhost:8001/api/analytics/crime_types'),
          axios.get('http://localhost:8001/api/analytics/gang_activity'),
          axios.get('http://localhost:8001/api/analytics/financial_crimes'),
        ]);
        setStats(statsRes.data);
        setDistrictData(districtRes.data);
        setMonthlyTrend(trendRes.data);
        setCrimeTypes(crimeRes.data);
        setGangActivity(gangRes.data);
        setFinancialCrimes(finRes.data);
      } catch (error) {
        console.error("Analytics fetch error:", error);
      }
    };
    fetchData();
  }, []);

  if (!stats) return <div className="p-8 text-slate-400">Loading analytics...</div>;

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-blue-500" /> State-Wide Crime Analytics
          </h2>
          <p className="text-slate-400 text-sm">Real-time telemetry and historical data aggregation.</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300">All Time</span>
          <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/50 rounded text-xs text-blue-400 animate-pulse flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> Live
          </span>
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/40">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Total FIRs</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-white font-mono">{stats.total_firs}</h3>
            <span className="text-xs font-bold px-2 py-1 rounded bg-slate-950 border border-blue-900/50 text-blue-400">Total</span>
          </div>
        </Card>
        <Card className="bg-slate-900/40">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Accused Persons</p>
          <h3 className="text-3xl font-bold text-white font-mono">{stats.total_accused}</h3>
        </Card>
        <Card className="bg-slate-900/40">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Active Gangs</p>
          <h3 className="text-3xl font-bold text-white font-mono">{stats.total_gangs}</h3>
        </Card>
        <Card className="bg-slate-900/40">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Financial Accounts</p>
          <h3 className="text-3xl font-bold text-white font-mono">{stats.total_accounts}</h3>
        </Card>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Monthly Crime Trend (2 Years)" icon={Activity} className="lg:col-span-2">
          <div className="w-full h-48 flex items-end justify-between gap-1 relative">
            <div className="absolute inset-0 border-b border-l border-slate-700/50" />
            {monthlyTrend.slice(-12).map((item, i) => {
              const maxVal = Math.max(...monthlyTrend.map(d => d.cases));
              return (
                <div key={i} className="relative group w-full flex justify-center h-full items-end z-10">
                  <div
                    className="w-full bg-gradient-to-t from-blue-600/80 to-cyan-400/80 rounded-t-sm transition-all duration-500 opacity-60 hover:opacity-100"
                    style={{ height: `${(item.cases / maxVal) * 100}%` }}
                  />
                  <div className="absolute -top-8 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-slate-600 z-20">
                    {item.month}: {item.cases}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Top Crime Types" icon={AlertTriangle}>
          <div className="space-y-3 mt-2">
            {crimeTypes.slice(0, 5).map((crime, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{crime.crimeheadname}</span>
                <span className="text-xs font-mono text-slate-400">{crime.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* District & Gang Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="District-wise Cases" icon={MapIcon}>
          <div className="space-y-2">
            {districtData.slice(0, 6).map((d, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-300">{d.districtname}</span>
                <span className="text-slate-400 font-mono">{d.case_count}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Gang Activity" icon={Fingerprint}>
          <div className="space-y-2">
            {gangActivity.map((gang, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-300">{gang.gangname}</span>
                <span className="text-slate-400 font-mono">{gang.member_count} members, {gang.involved_cases} cases</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// MODULE 3: ML PREDICTIONS
// const MLPredictiveModule = () => {
//   // random heat grid to simulate Model processing
//   let heatGrid = Array.from({ length: 64 }).map(() => Math.floor(Math.random() * 100));

//   function fluctuateGrid(){
//     heatGrid = heatGrid.map(val => {
//        const delta = Math.floor(Math.random() * 11) - 5;
//        let newVal = val + delta;

//        if(newVal < 0) newVal = 0;
//        if(newVal > 0) newVal = 100;
//        return newVal;
//     });
//     console.log(heatGrid);
//   }

//   setInterval(fluctuateGrid , 5000 + Math.floor(Math.random() * 1000))

//   return (
//     <div className="p-8 space-y-6 overflow-y-auto h-full animate-in slide-in-from-bottom-4 duration-500">
//       <div className="flex items-center justify-between mb-8">
//         <div>
//           <h2 className="text-2xl font-bold text-white flex items-center gap-2">
//             <BrainCircuit className="text-purple-500" /> Predictive AI Models
//           </h2>
//           <p className="text-slate-400 text-sm">Forecasting criminal activity using deep learning algorithms.</p>
//         </div>
//         <div className="px-4 py-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-purple-400 text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
//           <Activity size={16} className="animate-spin-slow" /> Engine Status: ACTIVE
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Heatmap Grid */}
//         <Card title="Spatial Risk Matrix (beta)" icon={Crosshair} className="lg:col-span-1 border-purple-900/50">
//           <div className="grid grid-cols-8 gap-1 p-2 bg-slate-950 rounded-lg border border-slate-800 relative overflow-hidden">
//             <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(168,85,247,0.05)_50%)] bg-[length:100%_4px] pointer-events-none z-10" />
//             {heatGrid.map((val, i) => (
//               <div 
//                 key={i} 
//                 className="aspect-square rounded-sm transition-all duration-1000"
//                 style={{ 
//                   backgroundColor: val > 80 ? '#f43f5e' : val > 50 ? '#f59e0b' : val > 20 ? '#3b82f6' : '#1e293b',
//                   opacity: val / 100 + 0.2
//                 }}
//               />
//             ))}
//           </div>
//           <div className="flex justify-between mt-4 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
//             <span>Low Risk</span>
//             <span className="text-rose-500">Critical</span>
//           </div>
//         </Card>

//         {/* AI Forecast List */}
//         <Card title="Immediate Threat Forecast (48 Hrs)" icon={AlertTriangle} className="lg:col-span-2 border-purple-900/50">
//           <div className="space-y-3">
//             {MOCK_DATA.ml.hotspots.map((spot, i) => (
//               <div key={i} className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800 rounded-lg hover:border-purple-500/30 transition-colors">
//                 <div className="flex items-center gap-3">
//                   <div className={`p-2 rounded-lg ${spot.risk > 80 ? 'bg-rose-900/50 text-rose-400' : 'bg-amber-900/50 text-amber-400'}`}>
//                     <Fingerprint size={16} />
//                   </div>
//                   <div>
//                     <h4 className="text-sm font-bold text-slate-200">{spot.name}</h4>
//                     <p className="text-xs text-slate-500 font-mono">Profile: {spot.type}</p>
//                   </div>
//                 </div>
//                 <div className="text-right">
//                   <div className="text-lg font-black font-mono text-white">{spot.risk}%</div>
//                   <div className="text-[10px] text-slate-500 uppercase">Probability</div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </Card>
//       </div>
//     </div>
//   );
// };


const MLPredictiveModule = () => {
  const [districtData, setDistrictData] = useState([]);
  const [riskyPersons, setRiskyPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [districtRes, riskRes] = await Promise.all([
          axios.get('http://localhost:8001/api/analytics/district_crimes'),
          axios.get('http://localhost:8001/api/ml/risk-scores?limit=5'),
        ]);
        setDistrictData(districtRes.data);
        setRiskyPersons(riskRes.data);
        setLoading(false);
      } catch (err) {
        console.error("ML data fetch error:", err);
        setError("Failed to load predictive data. Is the ML backend running?");
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Convert district crime counts into a simple 8x8 heatmap (64 cells)
  // We'll assign each district a number of cells proportional to its case count
  const maxCases = Math.max(...districtData.map(d => d.case_count), 1);
  const heatGrid = districtData.length > 0
    ? Array.from({ length: 64 }).map((_, i) => {
        // Spread districts across the grid, repeating if fewer districts
        const idx = i % districtData.length;
        const val = (districtData[idx].case_count / maxCases) * 100;
        return Math.min(100, Math.round(val));
      })
    : Array.from({ length: 64 }).map(() => 0);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full text-slate-400">
        Loading predictive models...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center h-full text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className="text-purple-500" /> Predictive AI Models
          </h2>
          <p className="text-slate-400 text-sm">Forecasting criminal activity using deep learning algorithms.</p>
        </div>
        <div className="px-4 py-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-purple-400 text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
          <Activity size={16} className="animate-spin-slow" /> Engine Status: ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spatial Risk Matrix (Heatmap) */}
        <Card title="Spatial Risk Matrix" icon={Crosshair} className="lg:col-span-1 border-purple-900/50">
          <div className="grid grid-cols-8 gap-1 p-2 bg-slate-950 rounded-lg border border-slate-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(168,85,247,0.05)_50%)] bg-[length:100%_4px] pointer-events-none z-10" />
            {heatGrid.map((val, i) => (
              <div
                key={i}
                className="aspect-square rounded-sm transition-all duration-700"
                style={{
                  backgroundColor: val > 80 ? '#f43f5e' : val > 50 ? '#f59e0b' : val > 20 ? '#3b82f6' : '#1e293b',
                  opacity: val / 100 + 0.2,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            <span>Low Risk</span>
            <span className="text-rose-500">Critical</span>
          </div>
        </Card>

        {/* AI Threat Forecast (Top Risky Individuals) */}
        <Card title="Immediate Threat Forecast (Top 5)" icon={AlertTriangle} className="lg:col-span-2 border-purple-900/50">
          <div className="space-y-3">
            {riskyPersons.map((person, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800 rounded-lg hover:border-purple-500/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${person.risk_score > 80 ? 'bg-rose-900/50 text-rose-400' : 'bg-amber-900/50 text-amber-400'}`}>
                    <Fingerprint size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{person.accusedname}</h4>
                    <p className="text-xs text-slate-500 font-mono">ID: {person.accusedmasterid}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black font-mono text-white">{person.risk_score.toFixed(1)}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Risk Score</div>
                </div>
              </div>
            ))}
            {riskyPersons.length === 0 && (
              <p className="text-slate-500 text-sm">No high‑risk individuals detected.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const NetworkModule = () => {
  const [networkData, setNetworkData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  // --- VIRTUAL CANVAS STATE ---
  const [scale, setScale] = useState(0.8); // Start slightly zoomed out
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Track dragging accurately
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // A massive virtual canvas gives nodes room to spread out without getting cut off
  const CANVAS_SIZE = 4000; 
  const CENTER = CANVAS_SIZE / 2;

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/neo4j-network?limit=80')
      .then(res => {
        let rawNodes = res.data.nodes || [];
        const rawEdges = res.data.edges || [];

        // 1. Sort nodes so Bosses/Leaders are plotted first (in the exact center)
        rawNodes.sort((a, b) => {
          const aPriority = (a.nodeType === 'Boss' || a.nodeType === 'Leader') ? 1 : 0;
          const bPriority = (b.nodeType === 'Boss' || b.nodeType === 'Leader') ? 1 : 0;
          return bPriority - aPriority;
        });

        const totalNodes = rawNodes.length;
        const goldenAngle = 137.5 * (Math.PI / 180); 
        const maxRadius = 1200; // Wide spread to prevent overlapping

        const nodes = rawNodes.map((node, index) => {
          const id = node.personId || node.gangId || node.accountId || node.caseId;
          const name = node.name || node.accountNumber || node.crimeNo || 'Unknown';
          const role = node.nodeType || 'Unknown';
          const status = (role === 'Gang' ? 'high' : (node.status === 'Untraced' ? 'arrested' : 'active'));
          
          // 2. Center the first node (Boss), spiral the rest outwards
          const radius = index === 0 ? 0 : 80 + Math.sqrt(index / Math.max(1, totalNodes - 1)) * maxRadius;
          const angle = index * goldenAngle;

          return {
            id, name, role, status,
            // Calculate absolute pixel coordinates on the 4000x4000 canvas
            x: CENTER + radius * Math.cos(angle),
            y: CENTER + radius * Math.sin(angle)
          };
        });

        setNetworkData({ nodes, edges: rawEdges });
        setLoading(false);
      })
      .catch(err => {
        console.error("Network fetch error:", err);
        setLoading(false);
      });
  }, []);

  // --- PAN & ZOOM LOGIC ---
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    if (e.deltaY < 0) setScale(s => Math.min(s + zoomFactor, 3));
    else setScale(s => Math.max(s - zoomFactor, 0.2));
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);
  const resetView = () => { setScale(0.8); setPan({ x: 0, y: 0 }); };

  // Utility to shorten long FIR names so they don't cover the screen
  const formatNodeName = (name, role) => {
    if (role === 'Case' && name.length > 20) {
      const parts = name.split('/');
      return parts.length > 2 ? `${parts[2]}...${parts[parts.length-1]}` : name.substring(0, 15) + '...';
    }
    return name;
  };

  if (loading) return <div className="p-8 text-slate-400 flex justify-center">Initializing Network Graph...</div>;

  return (
    <div className="p-8 space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Network className="text-emerald-500" /> Syndicate Mapping
          </h2>
          <p className="text-slate-400 text-sm">Visualizing hierarchy, shell corps, and known associates.</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* NETWORK GRAPH AREA */}
        <Card className="lg:col-span-3 h-full relative overflow-hidden bg-slate-950 border-emerald-900/30">
          
          {/* Zoom/Pan Controls */}
          <div className="absolute bottom-6 left-6 z-50 flex gap-2 bg-slate-900/90 p-2 rounded-lg border border-slate-700 shadow-xl backdrop-blur-md">
            <button onClick={() => setScale(s => Math.min(s + 0.2, 3))} className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white">
              <ZoomIn size={20} />
            </button>
            <button onClick={resetView} className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white">
              <Maximize size={20} />
            </button>
            <button onClick={() => setScale(s => Math.max(s - 0.2, 0.2))} className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white">
              <ZoomOut size={20} />
            </button>
          </div>

          {/* Graph Viewport */}
          <div 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing select-none"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* VIRTUAL CANVAS WRAPPER */}
            <div 
              className="absolute left-1/2 top-1/2"
              style={{
                width: CANVAS_SIZE,
                height: CANVAS_SIZE,
                // Center the canvas, then apply pan and scale
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              {/* 1. Edges Layer (SVG) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {networkData.edges.map((edge, i) => {
                  const source = networkData.nodes.find(n => n.id === edge.source);
                  const target = networkData.nodes.find(n => n.id === edge.target);
                  if (!source || !target) return null;
                  return (
                    <line 
                      key={i}
                      x1={source.x} y1={source.y}
                      x2={target.x} y2={target.y}
                      stroke="#10b981"
                      strokeWidth={2 / scale} // Prevents thick lines when zooming in
                      strokeOpacity="0.4"
                      strokeDasharray="6 6"
                      className="animate-[dash_30s_linear_infinite]"
                    />
                  );
                })}
              </svg>

              {/* 2. Nodes Layer (HTML) */}
              {networkData.nodes.map((node) => {
                const isBoss = node.role === 'Boss' || node.role === 'Leader';
                const isCase = node.role === 'Case';
                
                return (
                  <div 
                    key={node.id} 
                    className="absolute flex flex-col items-center group cursor-pointer"
                    // Position based on virtual canvas coordinates
                    style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedNode(node); }}
                  >
                    {/* Node Avatar */}
                    <div className={`rounded-full border-2 flex items-center justify-center z-10 transition-transform group-hover:scale-125 shadow-[0_0_20px_rgba(0,0,0,0.8)] ${
                      isBoss ? 'w-16 h-16 bg-slate-900 border-rose-500 text-rose-500' :
                      isCase ? 'w-10 h-10 bg-slate-900 border-indigo-500 text-indigo-500' :
                      node.status === 'arrested' ? 'w-12 h-12 bg-slate-900 border-emerald-500 text-emerald-500' :
                      'w-12 h-12 bg-slate-900 border-amber-500 text-amber-500'
                    }`}>
                      {isBoss ? <ShieldAlert size={28} /> : isCase ? <Network size={20} /> : <User size={20} />}
                    </div>
                    
                    {/* Node Label (Scales down slightly when zooming in heavily) */}
                    <div 
                      className="mt-2 text-center bg-slate-950/90 px-3 py-1.5 rounded-md border border-slate-700/50 backdrop-blur-md opacity-80 group-hover:opacity-100 group-hover:z-50 transition-opacity whitespace-nowrap"
                      style={{ transform: `scale(${Math.max(0.6, 1 / scale)})`, transformOrigin: 'top center' }}
                    >
                      <p className="text-xs font-bold text-white">{formatNodeName(node.name, node.role)}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{node.role}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* SIDEBAR: TARGET DETAILS */}
        <Card title="Intel Profile" icon={Eye} className="h-full border-emerald-900/30 overflow-hidden flex flex-col">
          <div className="p-4 flex-1 overflow-y-auto">
            {selectedNode ? (
              <div className="flex flex-col items-center animate-in slide-in-from-right-4">
                <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] ${
                  selectedNode.status === 'active' || selectedNode.role === 'Boss' ? 'bg-slate-900 border-rose-500 text-rose-500 shadow-rose-900/20' :
                  selectedNode.role === 'Case' ? 'bg-slate-900 border-indigo-500 text-indigo-500 shadow-indigo-900/20' :
                  'bg-slate-900 border-amber-500 text-amber-500'
                }`}>
                  {selectedNode.role === "Boss" ? <ShieldAlert size={40} /> : selectedNode.role === "Case" ? <Network size={40} /> : <User size={40} />}
                </div>
                
                <h3 className="text-xl font-black text-white text-center break-words w-full">{selectedNode.name}</h3>
                <p className="text-emerald-500 text-xs font-mono font-bold mt-2 bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-500/20">
                  ID: {selectedNode.id.substring(0, 12)}...
                </p>
                
                <div className="space-y-3 mt-8 w-full">
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Classification</p>
                    <p className="text-sm text-slate-200 mt-1">{selectedNode.role || "Unknown Associate"}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Current Status</p>
                    <p className="text-sm text-slate-200 mt-1 uppercase">
                      {selectedNode.status === 'high' ? 'High Priority' : selectedNode.status}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 mt-10">
                <Network size={48} className="mb-4 opacity-20" />
                <p className="text-sm text-center">Select a node on the map to<br/>view detailed intelligence.</p>
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
};

// MAIN APPLICATION ROOT (Routing & Layout)
export default function App() {
  const [activeModule, setActiveModule] = useState('chat');

  const navigation = [
    { id: 'chat', icon: DatabaseIcon, label: "Conversional AI Assistant", color: "text-red-500", bg: "bg-blue-600" },
    { id: 'analytics', icon: BarChart3, label: "Crime Analytics", color: "text-blue-500", bg: "bg-blue-600" },
    { id: 'ml', icon: BrainCircuit, label: "Predictive AI", color: "text-purple-500", bg: "bg-purple-600" },
    { id: 'network', icon: Network, label: "Network Map", color: "text-emerald-500", bg: "bg-emerald-600" },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden selection:bg-blue-500/30">
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-950 border-r border-slate-800/80 z-50 relative">
        {/* Decorative scanner line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 animate-[scan_3s_ease-in-out_infinite]" />
        
        <div className="p-6 flex items-center gap-4 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-md opacity-30 rounded-lg animate-pulse" />
            <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg relative z-10">
              <Shield className="text-blue-400" size={24} />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-widest font-mono">CrimeLens</h1>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1.5 uppercase tracking-widest font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Secure Link Active
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto bg-slate-900/20">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 ml-2">Core Modules</p>
          {navigation.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button 
                key={item.id} onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? `${item.bg} text-white shadow-lg shadow-black/50 border border-white/10 translate-x-1` 
                    : `text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-transparent`
                }`}
              >
                <item.icon size={18} className={isActive ? "text-white" : item.color} />
                <span className="font-semibold text-sm tracking-wide">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
              </button>
            );
          })}
        </nav>

        <div className="p-5 border-t border-slate-800/80 bg-slate-900/50">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 relative overflow-hidden group cursor-help">
            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
            <div className="flex justify-between items-end mb-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">Server Load</p>
              <p className="text-xs text-blue-400 font-mono font-bold">45%</p>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1 border border-slate-800">
              <div className="bg-blue-500 h-1 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" style={{ width: '45%' }} />
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        {/* Dynamic header changing based on module */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-slate-400 hover:text-white"><Menu size={24} /></button>
            <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-400 hidden md:flex items-center gap-2">
              <Database size={12} /> {activeModule.toUpperCase()}_ENGINE_V2.4
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block mr-2">
              <p className="text-xs font-bold text-slate-200">OP. VARDHAN</p>
              <p className="text-[10px] text-slate-500 uppercase">Clearance: Level 5</p>
            </div>
            <div className="w-8 h-8 rounded border border-slate-700 bg-slate-800 flex items-center justify-center">
              <User size={16} className="text-slate-400" />
            </div>
          </div>
        </header>

        {/* ROUTER OUTLET */}
        <div className="flex-1 overflow-hidden relative">
          {activeModule === 'chat' && <ChatModule />}
          {activeModule === 'analytics' && <AnalyticsModule />}
          {activeModule === 'ml' && <MLPredictiveModule />}
          {activeModule === 'network' && <NetworkModule />}
        </div>
      </main>
    </div>
  );
}
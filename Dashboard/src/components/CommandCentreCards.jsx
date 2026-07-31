import { useState, useEffect, useRef } from 'react';
import { Shield, Users, Target, Clock } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import axios from 'axios';

// Animated counter hook
const useCounter = (end, duration = 1000) => {
  const [count, setCount] = useState(0);
  const startTime = useRef(null);
  const frameId = useRef(null);

  const animate = (timestamp) => {
    if (!startTime.current) startTime.current = timestamp;
    const progress = Math.min((timestamp - startTime.current) / duration, 1);
    setCount(Math.floor(progress * end));
    if (progress < 1) {
      frameId.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    frameId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId.current);
  }, [end]);

  return count;
};

// Sparkline component (last 7 values)
const Sparkline = ({ data, color }) => (
  <ResponsiveContainer width="100%" height={40}>
    <LineChart data={data}>
      <Line
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={2}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  </ResponsiveContainer>
);

// Card wrapper
const StatCard = ({ icon: Icon, label, value, sparkData, color, live }) => {
  const animatedValue = useCounter(value);
  return (
    <div className="relative bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 overflow-hidden group hover:border-slate-600 transition-all duration-300">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-blue-500/50" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-blue-500/50" />

      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color.bg}`}>
          <Icon size={20} className={color.icon} />
        </div>
        {live && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
      </div>

      <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-3xl font-bold text-white font-mono">{animatedValue.toLocaleString()}</h3>
        <div className="w-24">{sparkData && <Sparkline data={sparkData} color={color.line} />}</div>
      </div>
    </div>
  );
};

// Main component
const CommandCentreCards = ({ liveMode }) => {
  const [stats, setStats] = useState(null);
  const [sparklines, setSparklines] = useState({ firs: [], gangs: [], closure: [], arrest: [] });

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:8001/api/analytics/stats/enhanced');
      setStats(res.data);

      // Simulate sparkline data (replace with real time‑series if available)
      const genSpark = (base, variance) =>
        Array.from({ length: 7 }, () => base + Math.floor(Math.random() * variance * 2 - variance));
      setSparklines({
        firs: genSpark(res.data.total_firs / 30, 5).map(v => ({ value: v })),
        gangs: genSpark(res.data.total_gangs, 1).map(v => ({ value: v })),
        closure: genSpark(res.data.closure_rate_pct, 3).map(v => ({ value: v })),
        arrest: genSpark(res.data.avg_days_to_first_arrest || 10, 2).map(v => ({ value: v })),
      });
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Refresh every 30s if live mode is on
  useEffect(() => {
    if (!liveMode) return;
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [liveMode]);

  if (!stats) return null;

  const cardConfig = [
    {
      icon: Shield,
      label: 'Total FIRs',
      value: stats.total_firs,
      sparkData: sparklines.firs,
      color: { bg: 'bg-blue-900/50', icon: 'text-blue-400', line: '#3b82f6' },
    },
    {
      icon: Users,
      label: 'Active Gangs',
      value: stats.total_gangs,
      sparkData: sparklines.gangs,
      color: { bg: 'bg-emerald-900/50', icon: 'text-emerald-400', line: '#10b981' },
    },
    {
      icon: Target,
      label: 'Closure Rate',
      value: stats.closure_rate_pct,
      sparkData: sparklines.closure,
      color: { bg: 'bg-purple-900/50', icon: 'text-purple-400', line: '#a855f7' },
      isPercentage: true,
    },
    {
      icon: Clock,
      label: 'Avg Arrest Time (days)',
      value: stats.avg_days_to_first_arrest || 0,
      sparkData: sparklines.arrest,
      color: { bg: 'bg-amber-900/50', icon: 'text-amber-400', line: '#f59e0b' },
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cardConfig.map((card, idx) => (
        <StatCard key={idx} {...card} live={liveMode} />
      ))}
    </div>
  );
};

export default CommandCentreCards;
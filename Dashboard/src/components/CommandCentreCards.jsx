import React, { useState, useEffect, useRef } from 'react';
import { Shield, Users, Target, Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// custom hook with easing function
const useCounter = (end, duration = 1500) => {
  const [count, setCount] = useState(0);
  const startTime = useRef(null);

  useEffect(() => {
    let frameId;
    const easeOutExpo = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const easedProgress = easeOutExpo(progress);
      
      setCount(Math.floor(easedProgress * end));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [end, duration]);

  return count;
};

//AreaChart with gradients and tooltips
const MiniAreaChart = ({ data, color, id }) => (
  <ResponsiveContainer width="100%" height={60}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id={`color-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.4} />
          <stop offset="95%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Tooltip
        content={({ active, payload }) => {
          if (active && payload && payload.length) {
            return (
              <div className="bg-slate-900/90 border border-slate-700 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-mono">
                {payload[0].value}
              </div>
            );
          }
          return null;
        }}
        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
      />
      <Area
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={2.5}
        fillOpacity={1}
        fill={`url(#color-${id})`}
        isAnimationActive={true}
        animationDuration={1500}
      />
    </AreaChart>
  </ResponsiveContainer>
);

// Card Component
const StatCard = ({ id, icon: Icon, label, value, trend, sparkData, color, live, isPercentage }) => {
  const animatedValue = useCounter(value);
  const isPositive = trend >= 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_-10px] hover:border-slate-600/50"
      style={{ shadowColor: color.glow }}
    >
      {/* Dynamic Hover Gradient Background */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ease-out pointer-events-none"
        style={{ background: `radial-gradient(circle at center, ${color.line} 0%, transparent 70%)` }}
      />

      <div className="relative z-10 flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn("relative p-3 rounded-xl border flex items-center justify-center", color.bg, color.border)}>
            {/* Inner glow for icon */}
            <div className="absolute inset-0 blur-md opacity-50" style={{ backgroundColor: color.line }} />
            <Icon size={22} className={cn("relative z-10", color.icon)} />
          </div>
          <p className="text-slate-400 text-sm font-medium tracking-wide">{label}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
              isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            )}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend)}%
            </div>
          )}
          {live && (
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-4xl font-bold text-white tracking-tight flex items-baseline gap-1">
            {animatedValue.toLocaleString()}
            {isPercentage && <span className="text-2xl text-slate-500">%</span>}
          </h3>
        </div>
        <div className="w-32 -mb-2 -mr-2">
          {sparkData && <MiniAreaChart id={id} data={sparkData} color={color.line} />}
        </div>
      </div>
    </motion.div>
  );
};

// Sleek Skeleton Loader
const SkeletonCard = () => (
  <div className="bg-[#0f172a]/50 border border-slate-800/50 rounded-2xl p-6 h-[160px] animate-pulse">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-slate-800/80" />
        <div className="w-24 h-4 rounded-md bg-slate-800/80" />
      </div>
      <div className="w-16 h-6 rounded-full bg-slate-800/80" />
    </div>
    <div className="flex justify-between items-end">
      <div className="w-32 h-10 rounded-lg bg-slate-800/80" />
      <div className="w-24 h-12 rounded-lg bg-slate-800/50" />
    </div>
  </div>
);

// Main Dashboard Component
const CommandCentreCards = ({ liveMode = true }) => {
  const [stats, setStats] = useState(null);
  const [sparklines, setSparklines] = useState({ firs: [], gangs: [], closure: [], arrest: [] });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:8001/api/analytics/stats/enhanced').catch(() => ({
        data: { total_firs: 12450, total_gangs: 84, closure_rate_pct: 68, avg_days_to_first_arrest: 14 }
      }));
      
      const data = res.data;
      setStats(data);

      //sparkline data generation
      const genSpark = (base, variance, trend = 'up') => {
        let current = base;
        return Array.from({ length: 12 }, (_, i) => {
          const change = (Math.random() * variance * 2) - variance;
          const trendFactor = trend === 'up' ? (i * variance * 0.2) : -(i * variance * 0.2);
          current = Math.max(0, current + change + trendFactor);
          return { value: Math.floor(current) };
        });
      };

      setSparklines({
        firs: genSpark(data.total_firs / 30, 20, 'down'),
        gangs: genSpark(data.total_gangs, 5, 'down'),
        closure: genSpark(data.closure_rate_pct, 4, 'up'),
        arrest: genSpark(data.avg_days_to_first_arrest || 10, 2, 'down'),
      });
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (!liveMode) return;
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [liveMode]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-[#020617] min-h-screen">
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const cardConfig = [
    {
      id: 'firs',
      icon: Shield,
      label: 'Active FIRs',
      value: stats.total_firs,
      trend: -2.4, // Negative trend for crimes is good
      sparkData: sparklines.firs,
      color: { 
        bg: 'bg-blue-500/10', 
        border: 'border-blue-500/20',
        icon: 'text-blue-400', 
        line: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.5)'
      }
    },
    {
      id: 'gangs',
      icon: Users,
      label: 'Tracked Syndicates',
      value: stats.total_gangs,
      trend: -5.1,
      sparkData: sparklines.gangs,
      color: { 
        bg: 'bg-indigo-500/10', 
        border: 'border-indigo-500/20',
        icon: 'text-indigo-400', 
        line: '#6366f1',
        glow: 'rgba(99, 102, 241, 0.5)'
      }
    },
    {
      id: 'closure',
      icon: Target,
      label: 'Resolution Rate',
      value: stats.closure_rate_pct,
      trend: 8.2,
      sparkData: sparklines.closure,
      isPercentage: true,
      color: { 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20',
        icon: 'text-emerald-400', 
        line: '#10b981',
        glow: 'rgba(16, 185, 129, 0.5)'
      }
    },
    {
      id: 'arrest',
      icon: Activity,
      label: 'Avg Response Time',
      value: stats.avg_days_to_first_arrest || 0,
      trend: -12.5,
      sparkData: sparklines.arrest,
      color: { 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20',
        icon: 'text-amber-400', 
        line: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.5)'
      }
    }
  ];

  return (
    <div className="p-6 bg-[#020617] w-full rounded-2xl">
    <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Command Centre</h2>
          <p className="text-slate-400 text-sm mt-1">Real-time tactical overview and analytics</p>
        </div>
        {liveMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 text-xs font-medium tracking-wide uppercase">Live Sync</span>
          </div>
        )}
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {cardConfig.map((card) => (
          <motion.div key={card.id} variants={itemVariants}>
            <StatCard {...card} live={liveMode} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default CommandCentreCards;
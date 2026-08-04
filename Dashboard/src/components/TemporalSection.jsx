import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, TrendingUp, Tag, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, Legend
} from 'recharts';
import axios from 'axios';

// Theme and Util
const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);
const DONUT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

//Card Wrapper
const ChartCard = ({ title, icon: Icon, children, className, glowColor = "bg-blue-500/5" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -4, boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)" }}
    className={`bg-[#0b1221]/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group shadow-lg flex flex-col ${className}`}
  >
    <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-opacity duration-500 opacity-50 group-hover:opacity-100 ${glowColor}`} />
    
    <div className="flex items-center gap-3 mb-6 border-b border-slate-800/60 pb-4 relative z-10 shrink-0">
      <div className="p-2.5 bg-slate-800/50 rounded-xl shadow-inner border border-slate-700/50">
        <Icon size={18} className="text-blue-400" />
      </div>
      <h3 className="text-sm font-bold text-slate-100 uppercase tracking-[0.2em]">{title}</h3>
    </div>
    <div className="relative z-10 flex-grow w-full h-full">
      {children}
    </div>
  </motion.div>
);

// tooltip for recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f172a]/95 backdrop-blur-xl border border-slate-700/80 p-4 rounded-xl shadow-2xl z-50 min-w-[150px]">
        <p className="text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-widest">{label}</p>
        <div className="space-y-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ background: entry.color || entry.fill || entry.payload.fill }} />
                <span className="text-slate-200 font-medium capitalize">{entry.name}</span>
              </div>
              <span className="text-white font-bold font-mono">{formatNumber(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

//COMPONENTS:

// Hourly Heatmap
const HourlyHeatmap = () => {
  const [data, setData] = useState([]);
  const [hoveredHour, setHoveredHour] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/hourly_heatmap')
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => {
    const entry = data.find(d => d.hour === i);
    return { hour: i, cases: entry ? entry.cases : 0 };
  });

  const casesArray = hours.map(h => h.cases);
  const minCases = Math.min(...casesArray);
  const maxCases = Math.max(...casesArray);

  // color based on relative variance
  const getHeatStyle = (val) => {
    if (val === 0 && maxCases === 0) return { bg: '#0f172a', border: '#1e293b', text: '#475569', shadow: 'none' };
    
    // Normalize value between 0.0 - 1.0 
    const ratio = (val - minCases) / (maxCases - minCases || 1);

    if (ratio <= 0.20) return { bg: '#0f172a', border: '#1e293b', text: '#64748b', shadow: 'none' };                 // Very Low: Slate
    if (ratio <= 0.40) return { bg: '#1e3a8a', border: '#1e40af', text: '#93c5fd', shadow: 'none' };                 // Low: Dark Blue
    if (ratio <= 0.60) return { bg: '#3b82f6', border: '#60a5fa', text: '#ffffff', shadow: 'none' };                 // Medium: Bright Blue
    if (ratio <= 0.85) return { bg: '#a855f7', border: '#c084fc', text: '#ffffff', shadow: '0 0 10px rgba(168,85,247,0.3)' }; // High: Purple
    return { bg: '#f43f5e', border: '#fb7185', text: '#ffffff', shadow: '0 0 15px rgba(244,63,94,0.5)' };            // Peak: Rose
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.02 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25 } }
  };

  return (
    <ChartCard title="Chronological Heatmap" icon={Clock} glowColor="bg-blue-500/10">
      
      {/* 12x2 Grid Layout */}
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="grid grid-cols-12 gap-2 h-auto my-auto relative z-10"
      >
        {hours.map((h, idx) => {
          const style = getHeatStyle(h.cases);
          const isHovered = hoveredHour === h.hour;
          
          return (
            <motion.div
              variants={itemVariants}
              key={idx}
              onMouseEnter={() => setHoveredHour(h.hour)}
              onMouseLeave={() => setHoveredHour(null)}
              className="relative aspect-square rounded-md flex items-center justify-center text-[11px] font-mono font-bold transition-all duration-200 cursor-crosshair"
              style={{
                backgroundColor: style.bg,
                border: `1px solid ${isHovered ? '#fff' : style.border}`,
                color: style.text,
                boxShadow: isHovered ? `0 0 12px ${style.border}` : style.shadow,
                transform: isHovered ? 'scale(1.15) translateY(-2px)' : 'scale(1)',
                zIndex: isHovered ? 20 : 10
              }}
            >
              {h.hour}
              
              {/*Tooltip */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0f172a]/95 backdrop-blur-md text-slate-200 p-3 rounded-xl border border-slate-700 shadow-2xl whitespace-nowrap min-w-[130px] pointer-events-none"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1 font-sans border-b border-slate-700 pb-1">
                      {h.hour < 12 ? 'AM Window' : 'PM Window'} ({h.hour}:00)
                    </p>
                    <div className="flex items-end justify-between mt-1">
                      <span className="font-mono text-xl font-black text-white leading-none">
                        {formatNumber(h.cases)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">FIRs</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Axis Labels & Heat Legend */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800/80">
        <div className="flex gap-4 text-[10px] font-bold text-slate-500 uppercase font-mono tracking-widest">
          <span>AM (0-11)</span>
          <span>PM (12-23)</span>
        </div>
        
        {/* Dynamic Legend */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mr-1">Variance: Low</span>
          <div className="w-3 h-3 rounded-sm bg-[#0f172a] border border-[#1e293b]" />
          <div className="w-3 h-3 rounded-sm bg-[#1e3a8a] border border-[#1e40af]" />
          <div className="w-3 h-3 rounded-sm bg-[#3b82f6] border border-[#60a5fa]" />
          <div className="w-3 h-3 rounded-sm bg-[#a855f7] border border-[#c084fc]" />
          <div className="w-3 h-3 rounded-sm bg-[#f43f5e] border border-[#fb7185]" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Peak</span>
        </div>
      </div>
      
    </ChartCard>
  );
};

// Day of week 
const DayOfWeekBar = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/day_of_week')
      .then(res => {
        const mapped = res.data.map(d => ({
          day: d.day_name.trim().substring(0, 3),
          cases: d.cases,
          isToday: new Date().getDay() === d.dow_num
        }));
        setData(mapped);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <ChartCard title="Weekly Frequency" icon={Calendar} glowColor="bg-purple-500/10">
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" opacity={0.6} />
            <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <RechartsTooltip cursor={{ fill: '#1e293b', opacity: 0.4 }} content={<CustomTooltip />} />
            
            <Bar dataKey="cases" radius={[6, 6, 0, 0]} animationDuration={1500}>
              {data.map((entry, index) => {
                const maxVal = Math.max(...data.map(d => d.cases), 1);
                const ratio = entry.cases / maxVal;
                // Dynamically color the bars: Low = Blue, High = Pink
                const color = ratio > 0.8 ? '#f43f5e' : ratio > 0.5 ? '#a855f7' : '#3b82f6';
                return (
                  <Cell 
                    key={index} 
                    fill={color} 
                    fillOpacity={entry.isToday ? 1 : 0.8}
                    stroke={entry.isToday ? '#fff' : 'none'}
                    strokeWidth={entry.isToday ? 2 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

//Monthly Trend Area Chart
const MonthlyTrendArea = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/monthly_trend_extended')
      .then(res => setData(res.data.map(d => ({ month: d.month, cases: d.cases }))))
      .catch(err => console.error(err));
  }, []);

  return (
    <ChartCard title="Macro Trend Analysis (5 Years)" icon={TrendingUp} className="lg:col-span-2" glowColor="bg-blue-500/10">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" opacity={0.6} />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#64748b', fontSize: 11 }} 
              axisLine={false} 
              tickLine={false} 
              minTickGap={30}
            />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <RechartsTooltip content={<CustomTooltip />} />
            
            <Area
              type="monotone"
              dataKey="cases"
              stroke="#06b6d4"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCases)"
              animationDuration={2000}
              activeDot={{ r: 6, fill: '#fff', stroke: '#06b6d4', strokeWidth: 3, shadow: '0 0 10px #06b6d4' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

//Crime Types Donut 
const CrimeTypesDonut = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/crime_types')
      .then(res => {
        const top5 = res.data.slice(0, 5);
        const otherCount = res.data.slice(5).reduce((sum, d) => sum + d.count, 0);
        const mapped = top5.map(d => ({ name: d.crimeheadname, value: d.count }));
        if (otherCount > 0) mapped.push({ name: 'Other', value: otherCount });
        setData(mapped);
      })
      .catch(err => console.error(err));
  }, []);

  const DonutCustomLegend = ({ payload }) => (
    <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#0f172a]/80 border border-slate-700/50 p-4 rounded-xl backdrop-blur-xl shadow-2xl min-w-[180px]">
      <h4 className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-[0.2em]">Categorization</h4>
      <div className="space-y-3">
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center justify-between gap-4 group cursor-default">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-slate-800 transition-transform group-hover:scale-125" style={{ backgroundColor: entry.payload.fill }} />
              <span className="text-xs text-slate-300 font-semibold truncate max-w-[80px]" title={entry.payload.name}>{entry.payload.name}</span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-white transition-colors">{formatNumber(entry.payload.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <ChartCard title="Modus Operandi Breakdown" icon={Tag} glowColor="bg-rose-500/10">
      <div className="h-[280px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="35%" 
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
              animationBegin={200}
              animationDuration={1500}
              stroke="none"
              cornerRadius={6}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend content={<DonutCustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Icon Overlay */}
        <div className="absolute left-[35%] top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
           <Activity size={32} className="text-slate-100" />
        </div>
      </div>
    </ChartCard>
  );
};

// Main Export
const TemporalSection = () => {
  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto p-4 lg:p-8">
      {/* Top row: Heatmap + Day-of-Week */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <HourlyHeatmap />
        <DayOfWeekBar />
      </div>
      
      {/* Bottom row: Macro Area chart + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MonthlyTrendArea />
        <CrimeTypesDonut />
      </div>
    </div>
  );
};

export default TemporalSection;
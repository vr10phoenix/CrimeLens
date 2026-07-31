import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, PieChart, Pie, Cell as PieCell, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { Clock, Calendar, TrendingUp, Tag } from 'lucide-react';
import axios from 'axios';

// ----- Color Palettes -----
const HEAT_COLORS = ['#1e293b', '#3b82f6', '#f59e0b', '#f43f5e'];  // low to high
const DONUT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#ec4899'];

// ----- Helper: Framer Motion card wrapper -----
const ChartCard = ({ title, icon: Icon, children, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 ${className}`}
  >
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} className="text-blue-400" />
      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </motion.div>
);

// ----- 1. Hourly Heatmap -----
const HourlyHeatmap = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/hourly_heatmap')
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const entry = data.find(d => d.hour === hour);
    return { hour, cases: entry ? entry.cases : 0 };
  });

  // Sort cases to compute percentile ranks
  const sortedCases = hours.map(h => h.cases).sort((a, b) => a - b);
  const getPercentile = (val) => {
    // Fraction of sorted values strictly less than val
    const less = sortedCases.filter(v => v < val).length;
    return less / (sortedCases.length - 1);
  };

  // Blue (low) → Purple → Rose (high)
  const getHeatColor = (val) => {
    if (val === 0) return '#1e293b';
    const t = getPercentile(val); // 0 = min, 1 = max
    const r = Math.round(59 + (244 - 59) * t);
    const g = Math.round(130 + (67 - 130) * t);
    const b = Math.round(246 + (94 - 246) * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <ChartCard title="Hourly Crime Heatmap" icon={Clock}>
      <div className="grid grid-cols-6 gap-1">
        {hours.map((h, idx) => {
          const color = getHeatColor(h.cases);
          return (
            <div
              key={idx}
              className="aspect-square rounded flex items-center justify-center text-[10px] font-mono text-white/80 relative group"
              style={{
                backgroundColor: color,
                boxShadow: h.cases > sortedCases[Math.floor(sortedCases.length * 0.75)] ? `0 0 8px ${color}` : 'none',
              }}
            >
              {h.hour}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-xs px-2 py-1 rounded border border-slate-600 whitespace-nowrap z-20">
                {h.hour}:00 – {h.cases} cases
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-3 text-[10px] text-slate-500 uppercase font-mono">
        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
    </ChartCard>
  );
};
// ----- 2. Day of Week Bar Chart -----
const DayOfWeekBar = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/day_of_week')
      .then(res => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
    <ChartCard title="Day of Week" icon={Calendar}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Bar dataKey="cases" radius={[4,4,0,0]}>
              {data.map((entry, index) => {
                const maxVal = Math.max(...data.map(d => d.cases), 1);
                const minVal = Math.min(...data.map(d => d.cases), 0);
                const ratio = (entry.cases - minVal) / (maxVal - minVal || 1);
                const r = ratio < 0.5 ? Math.round(59 + (245 - 59) * (ratio * 2)) : Math.round(245 + (244 - 245) * ((ratio - 0.5) * 2));
                const g = ratio < 0.5 ? Math.round(130 + (158 - 130) * (ratio * 2)) : Math.round(158 + (67 - 158) * ((ratio - 0.5) * 2));
                const b = ratio < 0.5 ? Math.round(246 + (11 - 246) * (ratio * 2)) : Math.round(11 + (94 - 11) * ((ratio - 0.5) * 2));
            return <Cell key={index} fill={`rgb(${r},${g},${b})`} />;
           })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

// ----- 3. Monthly Trend Area Chart -----
const MonthlyTrendArea = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/monthly_trend_extended')
      .then(res => setData(res.data.map(d => ({ month: d.month, cases: d.cases }))))
      .catch(err => console.error(err));
  }, []);

  return (
    <ChartCard title="Monthly Trend (5 Years)" icon={TrendingUp} className="lg:col-span-2">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Area
            type="monotone"
            dataKey="cases"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorCases)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

// ----- 4. Crime Types Donut Chart -----
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

  return (
    <ChartCard title="Crime Types" icon={Tag}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            animationBegin={200}
            animationDuration={1000}
          >
            {data.map((entry, index) => (
              <PieCell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

// ----- Main Temporal Section -----
const TemporalSection = () => {
  return (
    <div className="space-y-6">
      {/* Top row: Heatmap + Day-of-Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HourlyHeatmap />
        <DayOfWeekBar />
      </div>
      {/* Bottom row: Area chart + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MonthlyTrendArea />
        <CrimeTypesDonut />
      </div>
    </div>
  );
};

export default TemporalSection;
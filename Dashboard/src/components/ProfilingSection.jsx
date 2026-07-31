import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserX, Swords, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadialBarChart, RadialBar, Legend } from 'recharts';
import axios from 'axios';

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

// Repeat Offenders 
const RepeatOffendersLeaderboard = () => {
  const [offenders, setOffenders] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/repeat_offenders?top_n=8')
      .then(res => setOffenders(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <ChartCard title="Repeat Offenders" icon={UserX}>
      <div className="space-y-2">
        {offenders.map((o, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800 rounded-lg hover:border-blue-500/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center text-sm font-bold">
                {idx + 1}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">{o.accusedname}</p>
                <p className="text-xs text-slate-500">{o.gender}, Age {o.ageyear}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-bold text-white">{o.case_count}</p>
              <p className="text-xs text-slate-500">FIRs</p>
            </div>
          </div>
        ))}
        {offenders.length === 0 && <p className="text-slate-500 text-sm text-center">No data available.</p>}
      </div>
    </ChartCard>
  );
};

// DemographicsPyramid
const DemographicsPyramid = ({ title, icon, endpoint }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get(endpoint)
      .then(res => {
        const grouped = {};
        res.data.forEach(d => {
          if (!grouped[d.age_group]) grouped[d.age_group] = { age_group: d.age_group, Male: 0, Female: 0, Other: 0 };
          grouped[d.age_group][d.gender] = d.count;
        });
        setData(Object.values(grouped));
      })
      .catch(err => console.error(err));
  }, [endpoint]);

  return (
    <ChartCard title={title} icon={icon}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <YAxis dataKey="age_group" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }} />
          <Bar dataKey="Male" fill="#3b82f6" stackId="a" />
          <Bar dataKey="Female" fill="#ec4899" stackId="a" />
          <Bar dataKey="Other" fill="#a855f7" stackId="a" />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

// Weapon usage
const WeaponRadialChart = () => {
  const [weapons, setWeapons] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/weapon_usage')
      .then(res => {
        // Filter out zero counts and sort descending
        const filtered = res.data.filter(w => w.count > 0).sort((a, b) => b.count - a.count);
        setWeapons(filtered.slice(0, 10));
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <ChartCard title="Weapon Usage" icon={Swords}>
      <ResponsiveContainer width="100%" height={300}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="20%"
          outerRadius="90%"
          data={weapons}
          startAngle={180}
          endAngle={0}
          barSize={12}
        >
          <RadialBar
            dataKey="count"
            label={{ fill: '#94a3b8', fontSize: 9, position: 'insideStart' }}
            background={{ fill: '#1e293b' }}
          >
            {weapons.map((entry, index) => (
              <Cell key={index} fill={['#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899'][index % 6]} />
            ))}
          </RadialBar>
          <Legend
            iconSize={10}
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }}
          />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }} />
        </RadialBarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

// main section
const ProfilingSection = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RepeatOffendersLeaderboard />
        <DemographicsPyramid
          title="Offender Demographics"
          icon={Users}
          endpoint="http://localhost:8001/api/analytics/offender_demographics"
        />
        <DemographicsPyramid
          title="Victim Demographics"
          icon={BarChart3}
          endpoint="http://localhost:8001/api/analytics/victim_demographics"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <WeaponRadialChart />
      </div>
    </div>
  );
};

export default ProfilingSection;
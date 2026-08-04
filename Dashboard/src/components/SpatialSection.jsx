import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Target, BarChart3, GitBranch, Activity } from 'lucide-react';
import { scaleQuantize } from 'd3-scale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import * as d3 from 'd3';
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import axios from 'axios';

// theme and utils
const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);
const CHOROPLETH_COLORS = ['#0f172a', '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#06b6d4'];
const MATRIX_COLORS = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899'];
const CHORD_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

const KARNATAKA_TOPOJSON = "https://raw.githubusercontent.com/datameet/maps/master/State/Karnataka.geojson";

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

// Custom Tooltip
const CustomRechartsTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f172a]/95 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl z-50">
        <p className="text-slate-300 text-xs font-bold mb-3 uppercase tracking-wider">{label}</p>
        <div className="space-y-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ background: entry.color || entry.fill }} />
                <span className="text-slate-400 font-medium capitalize">{entry.name}</span>
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

// COMPONENTS :  

// District Map
const DistrictMap = ({ districtData }) => {
  const [geoJson, setGeoJson] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mapError, setMapError] = useState(false); // New error state

  useEffect(() => {
    const CORRECTED_URL = "https://raw.githubusercontent.com/datameet/maps/master/States/Karnataka.geojson";

    fetch(CORRECTED_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.type === "Topology") {
          setGeoJson(feature(data, data.objects[Object.keys(data.objects)[0]]));
        } else if (data && (data.type === "FeatureCollection" || data.features)) {
          setGeoJson(data);
        } else {
          throw new Error("Invalid map data format");
        }
      })
      .catch(err => {
        console.error('GeoJSON fetch error:', err);
        setMapError(true);
      });
  }, []);

  const districtCounts = useMemo(() => {
    const counts = {};
    if (districtData) {
      districtData.forEach(d => { counts[d.districtname] = d.case_count; });
    }
    return counts;
  }, [districtData]);

  const maxCount = Math.max(...Object.values(districtCounts), 1);
  const colorScale = scaleQuantize().domain([0, maxCount]).range(CHOROPLETH_COLORS);

  const projection = geoMercator().center([76.5, 15]).scale(3200);
  const pathGenerator = geoPath().projection(projection);

  //Handle Error State
  if (mapError) return (
    <ChartCard title="Geospatial Crime Hotspots" icon={Map} className="lg:col-span-1 min-h-[400px]">
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
        <Map size={32} className="opacity-40" />
        <p className="text-sm font-medium tracking-wide">Satellite Uplink Failed.</p>
        <p className="text-xs text-slate-600">Map topology currently unavailable.</p>
      </div>
    </ChartCard>
  );

  // Handle Loading State
  if (!geoJson) return (
    <ChartCard title="Geospatial Crime Hotspots" icon={Map} className="lg:col-span-1 min-h-[400px]">
      <div className="flex flex-col items-center justify-center h-full text-cyan-500 gap-4">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        <div className="text-sm font-bold tracking-[0.2em] animate-pulse">
          INITIALIZING SATELLITE UPLINK...
        </div>
      </div>
    </ChartCard>
  );

  //Render Map
  return (
    <ChartCard title="Geospatial Crime Hotspots" icon={Map} glowColor="bg-cyan-500/10" className="lg:col-span-1 relative">
      <div 
        className="w-full h-[400px] relative"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => setHovered(null)}
      >
        <svg width="100%" height="100%" viewBox="0 0 450 500" preserveAspectRatio="xMidYMid meet">
          <g>
            {geoJson.features.map((feature, idx) => {
              const name = feature.properties.district || feature.properties.KGISDist_1 || feature.properties.NAME_2 || feature.properties.name || 'Unknown';
              const count = districtCounts[name] || 0;
              const isHovered = hovered?.name === name;
              
              return (
                <motion.path
                  key={idx}
                  d={pathGenerator(feature)}
                  fill={isHovered ? '#06b6d4' : colorScale(count)}
                  stroke={isHovered ? '#fff' : '#1e293b'}
                  strokeWidth={isHovered ? 1.5 : 0.5}
                  onMouseEnter={() => setHovered({ name, count })}
                  className="cursor-crosshair transition-colors duration-200"
                  whileHover={{ scale: 1.01, zIndex: 10 }}
                  style={{ transformOrigin: "center" }}
                />
              );
            })}
          </g>
        </svg>

        {/* Floating Custom Tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute pointer-events-none bg-[#0f172a]/95 backdrop-blur-xl border border-cyan-500/50 p-4 rounded-xl shadow-2xl z-50 min-w-[140px]"
              style={{ left: mousePos.x + 15, top: mousePos.y + 15 }}
            >
              <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-1">Sector Analyzed</p>
              <p className="text-white font-bold capitalize text-lg mb-2">{hovered.name}</p>
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-rose-500" />
                <span className="font-mono text-slate-300"><span className="text-white font-bold">{formatNumber(hovered.count)}</span> FIRs</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map Legend */}
      <div className="flex items-center justify-center gap-1 mt-6 border-t border-slate-800 pt-4">
        <span className="text-xs text-slate-500 mr-2 font-medium">Low</span>
        {CHOROPLETH_COLORS.map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-10 h-2 rounded-sm" style={{ backgroundColor: c }} />
          </div>
        ))}
        <span className="text-xs text-slate-500 ml-2 font-medium">High</span>
      </div>
    </ChartCard>
  );
};

// District-Crime Matrix
const DistrictCrimeMatrix = () => {
  const [data, setData] = useState([]);
  const [crimeKeys, setCrimeKeys] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/district_crime_matrix')
      .then(res => {
        // Flatten nested array for Recharts Stacked Bar Support
        const keys = new Set();
        const formatted = res.data.map(d => {
          const row = { districtname: d.districtname };
          if(d.top_crimes) {
            d.top_crimes.forEach(c => {
               row[c.crime] = c.count;
               keys.add(c.crime);
            });
          }
          return row;
        });
        setCrimeKeys(Array.from(keys));
        setData(formatted.slice(0, 10)); // Top 10 for neatness
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <ChartCard title="Matrix: Top Crimes by District" icon={BarChart3} className="lg:col-span-1">
      <div className="h-[450px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 10, right: 30, left: 10, bottom: 5 }} barSize={16}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" opacity={0.5} />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="districtname" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} width={80} />
            <RechartsTooltip content={<CustomRechartsTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '10px' }} />
            
            {crimeKeys.map((crime, idx) => (
              <Bar 
                key={idx} 
                dataKey={crime} 
                stackId="a" 
                fill={MATRIX_COLORS[idx % MATRIX_COLORS.length]} 
                animationDuration={1500} 
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

// chord diagram
const MigrationChord = () => {
  const [chordData, setChordData] = useState(null);
  const [hoveredGroup, setHoveredGroup] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/cross_district_crime?limit=30')
      .then(res => {
        const raw = res.data;
        if (!raw || raw.length === 0) return;
        
        const districts = [...new Set(raw.flatMap(d => [d.home_district, d.crime_district]))];
        const indexMap = {};
        districts.forEach((d, i) => { indexMap[d] = i; });
        
        const matrix = Array.from({ length: districts.length }, () => new Array(districts.length).fill(0));
        raw.forEach(d => {
          matrix[indexMap[d.home_district]][indexMap[d.crime_district]] += d.cases_in_other_districts;
        });
        
        setChordData({ districts, matrix });
      })
      .catch(err => console.error(err));
  }, []);

  if (!chordData) return (
    <ChartCard title="Cross‑District Crime Migration (Network)" icon={GitBranch} className="lg:col-span-2 min-h-[500px]">
      <div className="flex items-center justify-center h-[400px] text-slate-500">Establishing Network Links...</div>
    </ChartCard>
  );

  // D3 Math Setup
  const width = 600;
  const height = 600;
  const innerRadius = Math.min(width, height) * 0.5 - 90;
  const outerRadius = innerRadius + 15;

  const chordGenerator = d3.chord().padAngle(0.04).sortSubgroups(d3.descending);
  const arcGenerator = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
  const ribbonGenerator = d3.ribbon().radius(innerRadius);
  
  const chords = chordGenerator(chordData.matrix);

  return (
    <ChartCard title="Cross‑District Crime Migration (Network)" icon={GitBranch} className="lg:col-span-2" glowColor="bg-purple-500/10">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 h-auto lg:h-[500px]">
        
        {/* Left Side: Animated Chord Network */}
        <div className="w-full lg:w-[60%] flex items-center justify-center relative h-[450px]">
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
            <g transform={`translate(${width / 2},${height / 2})`}>
              
              {/* Draw Ribbons (Flows) */}
              <g fillOpacity={0.6}>
                {chords.map((chord, i) => {
                  const isHovered = hoveredGroup === null || chord.source.index === hoveredGroup || chord.target.index === hoveredGroup;
                  return (
                    <motion.path
                      key={`ribbon-${i}`}
                      d={ribbonGenerator(chord)}
                      fill={CHORD_COLORS[chord.source.index % CHORD_COLORS.length]}
                      stroke={d3.rgb(CHORD_COLORS[chord.source.index % CHORD_COLORS.length]).darker()}
                      strokeWidth={1}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isHovered ? 0.7 : 0.05 }}
                      transition={{ duration: 0.3 }}
                      className="transition-all duration-300"
                    />
                  );
                })}
              </g>

              {/* Draw Arcs (Districts) */}
              <g>
                {chords.groups.map((group, i) => (
                  <motion.g 
                    key={`group-${i}`}
                    onMouseEnter={() => setHoveredGroup(group.index)}
                    onMouseLeave={() => setHoveredGroup(null)}
                    className="cursor-pointer"
                  >
                    <path
                      d={arcGenerator(group)}
                      fill={CHORD_COLORS[group.index % CHORD_COLORS.length]}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                    {/* Native SVG Text Labels placed around the circle */}
                    <text
                      transform={`rotate(${(group.startAngle + group.endAngle) / 2 * 180 / Math.PI - 90}) translate(${outerRadius + 10}) ${(group.startAngle + group.endAngle) / 2 > Math.PI ? "rotate(180)" : ""}`}
                      textAnchor={(group.startAngle + group.endAngle) / 2 > Math.PI ? "end" : "start"}
                      dominantBaseline="middle"
                      fill={(hoveredGroup === group.index) ? "#fff" : "#94a3b8"}
                      fontSize={hoveredGroup === group.index ? "14px" : "11px"}
                      fontWeight={hoveredGroup === group.index ? "bold" : "normal"}
                      className="transition-all duration-200"
                    >
                      {chordData.districts[group.index]}
                    </text>
                  </motion.g>
                ))}
              </g>

            </g>
          </svg>
        </div>

        {/* RHS: Network Summary Panel */}
        <div className="w-full lg:w-[40%] flex items-center justify-center p-4">
           <div className="w-full bg-[#0f172a]/60 border border-slate-700/50 p-6 rounded-2xl backdrop-blur-xl shadow-2xl">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-800 pb-3">
               Migration Telemetry
             </h4>
             {hoveredGroup !== null ? (
               <div className="space-y-4 animate-in fade-in duration-300">
                 <p className="text-sm text-slate-400">Target Origin:</p>
                 <p className="text-2xl font-black text-white capitalize border-l-4 border-purple-500 pl-3">
                   {chordData.districts[hoveredGroup]}
                 </p>
                 <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
                   <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total Associated Connections</p>
                   <p className="text-3xl font-mono text-purple-400 font-bold">
                     {formatNumber(Math.round(chords.groups[hoveredGroup].value))}
                   </p>
                 </div>
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center h-48 text-center opacity-60">
                 <GitBranch size={32} className="text-slate-500 mb-4" />
                 <p className="text-sm text-slate-400 font-medium tracking-wide">Hover over the perimeter nodes to trace crime migration pathways.</p>
               </div>
             )}
           </div>
        </div>

      </div>
    </ChartCard>
  );
};

// Main Export
const SpatialSection = () => {
  const [districtData, setDistrictData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/district_crimes')
      .then(res => setDistrictData(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto p-4 lg:p-8">
      {/* Top Row: Map & Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistrictMap districtData={districtData} />
        <DistrictCrimeMatrix />
      </div>
      
      {/* Bottom Row: Full Width Network Diagram */}
      <div className="grid grid-cols-1 gap-6">
        <MigrationChord />
      </div>
    </div>
  );
};

export default SpatialSection;
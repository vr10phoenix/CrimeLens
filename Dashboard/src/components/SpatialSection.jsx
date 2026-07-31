import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Map, Target, BarChart3, GitBranch } from 'lucide-react';
// import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { scaleQuantize } from 'd3-scale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as d3 from 'd3';
import axios from 'axios';
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const CHOROPLETH_COLORS = ['#1e293b', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'];
const MATRIX_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#a855f7'];

//  Karnataka districts TopoJSON URL (public) 
const KARNATAKA_TOPOJSON = "https://raw.githubusercontent.com/datameet/maps/master/State/Karnataka.geojson";

// ----- Chart Card wrapper (reusable) -----
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

const DistrictMap = ({ districtData }) => {
  const [geoJson, setGeoJson] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(KARNATAKA_TOPOJSON)
      .then(res => res.json())
      .then(data => {
        // The dataset might be a TopoJSON. Convert if needed.
        if (data.type === "Topology") {
          const topoData = data;
          const featureCollection = feature(topoData, topoData.objects[Object.keys(topoData.objects)[0]]);
          setGeoJson(featureCollection);
        } else {
          setGeoJson(data); // already GeoJSON
        }
      })
      .catch(err => console.error("GeoJSON fetch error:", err));
  }, []);

  if (!geoJson || !districtData.length) return <div className="text-slate-400 text-sm">Loading map...</div>;

  const districtCounts = {};
  districtData.forEach(d => { districtCounts[d.districtname] = d.case_count; });

  const maxCount = Math.max(...Object.values(districtCounts), 1);
  const colorScale = scaleQuantize()
    .domain([0, maxCount])
    .range(CHOROPLETH_COLORS);

  const projection = geoMercator().center([77, 14]).scale(2000);
  const pathGenerator = geoPath().projection(projection);

  return (
    <ChartCard title="Crime Cases by District" icon={Map} className="lg:col-span-2 h-full">
      <svg viewBox="0 0 400 400" style={{ width: "100%", height: "auto" }}>
        <g>
          {geoJson.features.map((feature, idx) => {
            const name = feature.properties.district || feature.properties.NAME_2 || feature.properties.name;
            const count = districtCounts[name] || 0;
            return (
              <path
                key={idx}
                d={pathGenerator(feature)}
                fill={colorScale(count)}
                stroke="#1e293b"
                strokeWidth={0.5}
                onClick={() => setSelected({ name, count })}
                style={{ cursor: "pointer" }}
              />
            );
          })}
        </g>
      </svg>
      {selected && (
        <div className="mt-2 bg-slate-800/90 border border-slate-600 rounded-lg p-3 text-sm">
          <p className="font-bold">{selected.name}</p>
          <p className="text-slate-300">{selected.count} cases</p>
        </div>
      )}
      <div className="flex justify-center gap-2 mt-2">
        {CHOROPLETH_COLORS.map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: c }} />
            <span className="text-[10px] text-slate-400">
              {Math.round((i / (CHOROPLETH_COLORS.length - 1)) * maxCount)}
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
};

// District‑Crime Matrix (stacked bar) 
const DistrictCrimeMatrix = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/district_crime_matrix')
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <ChartCard title="Top Crimes per District" icon={BarChart3}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart layout="vertical" data={data} margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <YAxis type="category" dataKey="districtname" tick={{ fill: '#94a3b8', fontSize: 10 }} width={80} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }} />
          {data.length > 0 &&
            data[0].top_crimes.map((crime, idx) => (
              <Bar key={idx} dataKey="top_crimes" stackId="a" fill={MATRIX_COLORS[idx % MATRIX_COLORS.length]} name={crime.crime} />
            ))
          }
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

//Crime Severity Bubble Map
const SeverityBubbleMap = ({ districtData, severityData }) => {
  // severityData: [{ districtname, heinous_pct }]
  return (
    <ChartCard title="Severity Index (Heinous %)" icon={Target}>
      <div className="relative">
        {/* Reuse the same map but with bubbles */}
        <ComposableMap projection="geoMercator" projectionConfig={{ center: [77, 14], scale: 2000 }}>
          <Geographies geography={KARNATAKA_TOPOJSON}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography key={geo.rsmKey} geography={geo} fill="#1e293b" stroke="#334155" strokeWidth={0.5} />
              ))
            }
          </Geographies>
          {severityData.map(d => {
            const district = districtData.find(dd => dd.districtname === d.districtname);
            if (!district) return null;
            return null;
          })}
        </ComposableMap>
        <p className="text-slate-500 text-xs mt-4">For exact bubble map, we need district centroid coordinates. This is a placeholder for the hackathon – the severity data is shown in the matrix.</p>
      </div>
    </ChartCard>
  );
};

// Cross‑District Migration Chord Diagram 
const MigrationChord = () => {
  const svgRef = useRef();
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/cross_district_crime?limit=30')
      .then(res => {
        const districts = [...new Set(res.data.flatMap(d => [d.home_district, d.crime_district]))];
        const index = {};
        districts.forEach((d, i) => { index[d] = i; });
        const matrix = Array.from({ length: districts.length }, () => new Array(districts.length).fill(0));
        res.data.forEach(d => {
          matrix[index[d.home_district]][index[d.crime_district]] += d.cases_in_other_districts;
        });
        setData({ districts, matrix });
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!data.districts) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 400, height = 400;
    const chord = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending);
    const arc = d3.arc()
      .innerRadius(120)
      .outerRadius(130);
    const ribbon = d3.ribbon()
      .radius(120);

    const chords = chord(data.matrix);
    const colors = d3.scaleOrdinal(d3.schemeCategory10);

    const g = svg.append('g')
      .attr('transform', `translate(${width/2},${height/2})`);

    // Draw arcs (districts)
    g.append('g')
      .selectAll('path')
      .data(chords.groups)
      .join('path')
      .attr('d', arc)
      .attr('fill', d => colors(d.index))
      .attr('stroke', '#1e293b')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.7);
        tooltip.style('display', 'block').html(data.districts[d.index]);
      })
      .on('mouseout', function () { d3.select(this).attr('opacity', 1); tooltip.style('display', 'none'); });

    // Draw ribbons (flows)
    g.append('g')
      .selectAll('path')
      .data(chords)
      .join('path')
      .attr('d', ribbon)
      .attr('fill', d => colors(d.source.index))
      .attr('stroke', '#1e293b')
      .attr('opacity', 0.7);

    // Tooltip div
    const tooltip = d3.select('body').append('div')
      .style('position', 'absolute')
      .style('background', '#1e293b')
      .style('padding', '4px 8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('color', '#e2e8f0')
      .style('pointer-events', 'none')
      .style('display', 'none');
  }, [data]);

  return (
    <ChartCard title="Cross‑District Crime Migration" icon={GitBranch} className="lg:col-span-2">
      <svg ref={svgRef} width="100%" height="400" />
    </ChartCard>
  );
};

// Main Spatial Section 
const SpatialSection = () => {
  const [districtData, setDistrictData] = useState([]);
  const [severityData, setSeverityData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/district_crimes')
      .then(res => setDistrictData(res.data))
      .catch(err => console.error(err));
    axios.get('http://localhost:8001/api/analytics/crime_severity_index')
      .then(res => setSeverityData(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistrictMap districtData={districtData} />
        <DistrictCrimeMatrix />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <MigrationChord />
      </div>
    </div>
  );
};

export default SpatialSection;
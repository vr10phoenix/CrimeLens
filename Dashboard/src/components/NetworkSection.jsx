import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Network, DollarSign, GitBranch, CircleDollarSign } from 'lucide-react';
import * as d3 from 'd3';
import axios from 'axios';

// chart card
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

const FinancialCards = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/financial_crimes')
      .then(res => setData(res.data[0]))
      .catch(err => console.error(err));
  }, []);

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ChartCard title="Total Transactions" icon={CircleDollarSign}>
        <p className="text-3xl font-bold text-white font-mono">{data.total_transactions}</p>
      </ChartCard>
      <ChartCard title="Total Volume (₹)" icon={DollarSign}>
        <p className="text-3xl font-bold text-white font-mono">{Number(data.total_amount).toLocaleString()}</p>
      </ChartCard>
      <ChartCard title="Average Amount (₹)" icon={DollarSign}>
        <p className="text-3xl font-bold text-white font-mono">{Number(data.avg_amount).toLocaleString()}</p>
      </ChartCard>
    </div>
  );
};

// Gang activity
const GangBubbleChart = () => {
  const [data, setData] = useState([]);
  const svgRef = useRef();

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/gang_activity')
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 400, height = 300;
    const pack = d3.pack().size([width - 20, height - 20]).padding(8);
    const root = d3.hierarchy({ children: data }).sum(d => d.member_count || 1);
    const nodes = pack(root).leaves();

    const g = svg.append('g').attr('transform', 'translate(10,10)');
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    g.selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .attr('fill', (d, i) => colorScale(i))
      .attr('opacity', 0.8)
      .attr('stroke', '#1e293b')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', '#f59e0b');
        tooltip.style('display', 'block').html(`${d.data.gangname}: ${d.data.member_count} members`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.8).attr('stroke', '#1e293b');
        tooltip.style('display', 'none');
      });

    g.selectAll('text')
      .data(nodes)
      .enter().append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', 'white')
      .attr('font-size', d => Math.min(12, d.r / 2))
      .text(d => d.data.gangname.substring(0, 10));

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
    <ChartCard title="Gang Activity (Bubble Size = Members)" icon={Network}>
      <svg ref={svgRef} width="100%" height="300" />
    </ChartCard>
  );
};

// force directed Network graph
const ForceGraph = () => {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const svgRef = useRef();

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/neo4j-network?limit=40')
      .then(res => {
        const nodes = res.data.nodes.map(n => ({
          id: n.personId || n.gangId || n.accountId || n.caseId,
          name: n.name || n.accountNumber || n.crimeNo || '?',
          type: n.nodeType || 'Person'
        }));
        const edges = res.data.edges.map(e => ({
          source: e.source,
          target: e.target,
          type: e.type
        }));
        setGraph({ nodes, edges });
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!graph.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 500, height = 400;
    const simulation = d3.forceSimulation(graph.nodes)
      .force('link', d3.forceLink(graph.edges).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .selectAll('line')
      .data(graph.edges)
      .enter().append('line')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

    const node = svg.append('g')
      .selectAll('circle')
      .data(graph.nodes)
      .enter().append('circle')
      .attr('r', 6)
      .attr('fill', d => d.type === 'Person' ? '#3b82f6' : d.type === 'Gang' ? '#10b981' : '#f59e0b')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    node.append('title').text(d => d.name);

    simulation.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('cx', d => d.x).attr('cy', d => d.y);
    });

    return () => simulation.stop();
  }, [graph]);

  return (
    <ChartCard title="Criminal Network (Interactive)" icon={GitBranch} className="lg:col-span-2">
      <svg ref={svgRef} width="100%" height="400" />
    </ChartCard>
  );
};

// MOney Laundary rings
const MoneyLaunderingTable = () => {
  const [rings, setRings] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/analytics/money_laundering_rings')
      .then(res => setRings(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <ChartCard title="Money Laundering Rings" icon={CircleDollarSign}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-700">
              <th className="py-2">Account Number</th>
              <th className="py-2">Bank</th>
              <th className="py-2">Balance (₹)</th>
              <th className="py-2">Cycle Length</th>
            </tr>
          </thead>
          <tbody>
            {rings.length > 0 ? rings.map((ring, idx) => (
              <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="py-2 text-slate-200">{ring.account_number}</td>
                <td className="py-2 text-slate-300">{ring.bank}</td>
                <td className="py-2 text-slate-300">{Number(ring.balance).toLocaleString()}</td>
                <td className="py-2 text-slate-300">{ring.cycle_length}</td>
              </tr>
            )) : <tr><td colSpan={4} className="py-4 text-center text-slate-500">No suspicious cycles detected.</td></tr>}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
};

// main session
const NetworkSection = () => {
  return (
    <div className="space-y-6">
      <FinancialCards />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GangBubbleChart />
        <MoneyLaunderingTable />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <ForceGraph />
      </div>
    </div>
  );
};

export default NetworkSection;
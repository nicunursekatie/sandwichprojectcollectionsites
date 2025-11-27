import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, ReferenceLine } from 'recharts';

// Sandwich Project Brand Colors
const BRAND = {
  primary: '#236383',
  secondary: '#007e8c',
  accent: '#47b3cb',
  highlight: '#fbad3f',
  alert: '#a31c41',
};

// All 2025 weekly data
const allData = [
  { week: "Jan 1", weekStart: "2025-01-01", collections: 3, individual: 748, group: 100, total: 848, month: "Jan", weekNum: 1 },
  { week: "Jan 8", weekStart: "2025-01-08", collections: 7, individual: 6874, group: 900, total: 7774, month: "Jan", weekNum: 2 },
  { week: "Jan 15", weekStart: "2025-01-15", collections: 10, individual: 7361, group: 21566, total: 28927, month: "Jan", weekNum: 3 },
  { week: "Jan 22", weekStart: "2025-01-22", collections: 7, individual: 8147, group: 130, total: 8277, month: "Jan", weekNum: 4 },
  { week: "Jan 29", weekStart: "2025-01-29", collections: 7, individual: 5926, group: 7270, total: 13196, month: "Feb", weekNum: 5 },
  { week: "Feb 5", weekStart: "2025-02-05", collections: 9, individual: 6143, group: 5330, total: 11473, month: "Feb", weekNum: 6 },
  { week: "Feb 12", weekStart: "2025-02-12", collections: 9, individual: 5548, group: 8948, total: 14496, month: "Feb", weekNum: 7 },
  { week: "Feb 19", weekStart: "2025-02-19", collections: 10, individual: 7330, group: 5430, total: 12760, month: "Feb", weekNum: 8 },
  { week: "Feb 26", weekStart: "2025-02-26", collections: 9, individual: 4838, group: 1510, total: 6348, month: "Mar", weekNum: 9 },
  { week: "Mar 5", weekStart: "2025-03-05", collections: 9, individual: 4177, group: 9590, total: 13767, month: "Mar", weekNum: 10 },
  { week: "Mar 12", weekStart: "2025-03-12", collections: 8, individual: 5344, group: 4780, total: 10124, month: "Mar", weekNum: 11 },
  { week: "Mar 19", weekStart: "2025-03-19", collections: 10, individual: 5406, group: 5366, total: 10772, month: "Mar", weekNum: 12 },
  { week: "Mar 26", weekStart: "2025-03-26", collections: 9, individual: 5349, group: 3408, total: 8757, month: "Apr", weekNum: 13 },
  { week: "Apr 2", weekStart: "2025-04-02", collections: 9, individual: 6589, group: 5648, total: 12237, month: "Apr", weekNum: 14 },
  { week: "Apr 9", weekStart: "2025-04-09", collections: 9, individual: 4011, group: 283, total: 4294, month: "Apr", weekNum: 15 },
  { week: "Apr 16", weekStart: "2025-04-16", collections: 8, individual: 7240, group: 1450, total: 8690, month: "Apr", weekNum: 16 },
  { week: "Apr 23", weekStart: "2025-04-23", collections: 8, individual: 7860, group: 3040, total: 10900, month: "Apr", weekNum: 17 },
  { week: "Apr 30", weekStart: "2025-04-30", collections: 8, individual: 5955, group: 2050, total: 8005, month: "May", weekNum: 18 },
  { week: "May 7", weekStart: "2025-05-07", collections: 8, individual: 7819, group: 800, total: 8619, month: "May", weekNum: 19 },
  { week: "May 14", weekStart: "2025-05-14", collections: 8, individual: 7462, group: 1800, total: 9262, month: "May", weekNum: 20 },
  { week: "May 21", weekStart: "2025-05-21", collections: 8, individual: 5631, group: 4610, total: 10241, month: "May", weekNum: 21 },
  { week: "May 28", weekStart: "2025-05-28", collections: 9, individual: 6196, group: 100, total: 6296, month: "Jun", weekNum: 22 },
  { week: "Jun 4", weekStart: "2025-06-04", collections: 8, individual: 8308, group: 550, total: 8858, month: "Jun", weekNum: 23 },
  { week: "Jun 11", weekStart: "2025-06-11", collections: 9, individual: 7751, group: 4647, total: 12398, month: "Jun", weekNum: 24 },
  { week: "Jun 18", weekStart: "2025-06-18", collections: 8, individual: 9548, group: 3225, total: 12773, month: "Jun", weekNum: 25 },
  { week: "Jun 25", weekStart: "2025-06-25", collections: 10, individual: 9431, group: 5120, total: 14551, month: "Jul", weekNum: 26 },
  { week: "Jul 2", weekStart: "2025-07-02", collections: 1, individual: 485, group: 0, total: 485, month: "Jul", weekNum: 27 },
  { week: "Jul 9", weekStart: "2025-07-09", collections: 23, individual: 5790, group: 9035, total: 14825, month: "Jul", weekNum: 28 },
  { week: "Jul 16", weekStart: "2025-07-16", collections: 11, individual: 9107, group: 2613, total: 11720, month: "Jul", weekNum: 29 },
  { week: "Jul 23", weekStart: "2025-07-23", collections: 11, individual: 9263, group: 2405, total: 11668, month: "Jul", weekNum: 30 },
  { week: "Jul 30", weekStart: "2025-07-30", collections: 15, individual: 8229, group: 3760, total: 11989, month: "Aug", weekNum: 31 },
  { week: "Aug 6", weekStart: "2025-08-06", collections: 9, individual: 4200, group: 1275, total: 5475, month: "Aug", weekNum: 32 },
  { week: "Aug 13", weekStart: "2025-08-13", collections: 12, individual: 5753, group: 1435, total: 7188, month: "Aug", weekNum: 33 },
  { week: "Aug 20", weekStart: "2025-08-20", collections: 11, individual: 4666, group: 1822, total: 6488, month: "Aug", weekNum: 34 },
  { week: "Aug 27", weekStart: "2025-08-27", collections: 9, individual: 5194, group: 3144, total: 8338, month: "Sep", weekNum: 35 },
  { week: "Sep 3", weekStart: "2025-09-03", collections: 14, individual: 4152, group: 2702, total: 6854, month: "Sep", weekNum: 36 },
  { week: "Sep 10", weekStart: "2025-09-10", collections: 17, individual: 4045, group: 4061, total: 8106, month: "Sep", weekNum: 37 },
  { week: "Sep 17", weekStart: "2025-09-17", collections: 16, individual: 4701, group: 4469, total: 9170, month: "Sep", weekNum: 38 },
  { week: "Sep 24", weekStart: "2025-09-24", collections: 16, individual: 4670, group: 5079, total: 9749, month: "Oct", weekNum: 39 },
  { week: "Oct 1", weekStart: "2025-10-01", collections: 15, individual: 4049, group: 5422, total: 9471, month: "Oct", weekNum: 40 },
  { week: "Oct 8", weekStart: "2025-10-08", collections: 16, individual: 4803, group: 4125, total: 8928, month: "Oct", weekNum: 41 },
  { week: "Oct 15", weekStart: "2025-10-15", collections: 14, individual: 4705, group: 2904, total: 7609, month: "Oct", weekNum: 42 },
  { week: "Oct 22", weekStart: "2025-10-22", collections: 13, individual: 4445, group: 3524, total: 7969, month: "Oct", weekNum: 43 },
  { week: "Oct 29", weekStart: "2025-10-29", collections: 12, individual: 5173, group: 2928, total: 8101, month: "Nov", weekNum: 44 },
  { week: "Nov 5", weekStart: "2025-11-05", collections: 11, individual: 6702, group: 6555, total: 13257, month: "Nov", weekNum: 45 },
  { week: "Nov 12", weekStart: "2025-11-12", collections: 15, individual: 4334, group: 13331, total: 17665, month: "Nov", weekNum: 46 },
  { week: "Nov 19", weekStart: "2025-11-19", collections: 13, individual: 4505, group: 9482, total: 13987, month: "Nov", weekNum: 47 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SandwichDashboard() {
  const [activeView, setActiveView] = useState('overview');
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-11-25');
  const [activePreset, setActivePreset] = useState('ytd');

  // Date presets
  const presets = [
    { id: 'last4', label: 'Last 4 Weeks', start: '2025-10-29', end: '2025-11-25' },
    { id: 'last8', label: 'Last 8 Weeks', start: '2025-10-01', end: '2025-11-25' },
    { id: 'q4', label: 'Q4 2025', start: '2025-10-01', end: '2025-11-25' },
    { id: 'q3', label: 'Q3 2025', start: '2025-07-01', end: '2025-09-30' },
    { id: 'h2', label: 'H2 2025', start: '2025-07-01', end: '2025-11-25' },
    { id: 'h1', label: 'H1 2025', start: '2025-01-01', end: '2025-06-30' },
    { id: 'ytd', label: 'Year to Date', start: '2025-01-01', end: '2025-11-25' },
    { id: 'snap', label: 'SNAP Crisis (Oct-Nov)', start: '2025-10-01', end: '2025-11-25' },
  ];

  const applyPreset = (preset) => {
    setStartDate(preset.start);
    setEndDate(preset.end);
    setActivePreset(preset.id);
  };

  // Filter data based on date range
  const data = useMemo(() => {
    return allData.filter(d => {
      const weekDate = new Date(d.weekStart);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return weekDate >= start && weekDate <= end;
    });
  }, [startDate, endDate]);

  // Calculate all derived data from filtered data
  const { 
    monthlyData, 
    cumulativeData, 
    efficiencyData, 
    rollingData, 
    varianceData,
    avgIndividual,
    avgGroup,
    avgTotal
  } = useMemo(() => {
    if (data.length === 0) {
      return { 
        monthlyData: [], 
        cumulativeData: [], 
        efficiencyData: [], 
        rollingData: [],
        varianceData: [],
        avgIndividual: 0,
        avgGroup: 0,
        avgTotal: 0
      };
    }

    // Monthly aggregates
    const monthly = data.reduce((acc, week) => {
      const existing = acc.find(m => m.month === week.month);
      if (existing) {
        existing.individual += week.individual;
        existing.group += week.group;
        existing.total += week.total;
        existing.collections += week.collections;
        existing.weeks += 1;
      } else {
        acc.push({ 
          month: week.month, 
          individual: week.individual, 
          group: week.group, 
          total: week.total, 
          collections: week.collections, 
          weeks: 1 
        });
      }
      return acc;
    }, []);

    // Cumulative
    let cumulative = 0;
    const cumData = data.map(week => {
      cumulative += week.total;
      return { ...week, cumulative };
    });

    // Efficiency
    const effData = data.map(week => ({
      ...week,
      efficiency: week.collections > 0 ? Math.round(week.total / week.collections) : 0,
    }));

    // Rolling averages (4-week)
    const rollData = data.map((week, i) => {
      const windowSize = 4;
      const start = Math.max(0, i - windowSize + 1);
      const window = data.slice(start, i + 1);
      const avgTotal = Math.round(window.reduce((sum, w) => sum + w.total, 0) / window.length);
      const avgIndividual = Math.round(window.reduce((sum, w) => sum + w.individual, 0) / window.length);
      const avgGroup = Math.round(window.reduce((sum, w) => sum + w.group, 0) / window.length);
      return { ...week, avgTotal, avgIndividual, avgGroup };
    });

    // Averages for variance
    const avgInd = data.reduce((sum, w) => sum + w.individual, 0) / data.length;
    const avgGrp = data.reduce((sum, w) => sum + w.group, 0) / data.length;
    const avgTot = data.reduce((sum, w) => sum + w.total, 0) / data.length;

    // Variance data
    const varData = data.map(week => ({
      ...week,
      totalVariance: week.total - avgTot,
      individualVariance: week.individual - avgInd,
      groupVariance: week.group - avgGrp,
    }));

    return {
      monthlyData: monthly,
      cumulativeData: cumData,
      efficiencyData: effData,
      rollingData: rollData,
      varianceData: varData,
      avgIndividual: avgInd,
      avgGroup: avgGrp,
      avgTotal: avgTot
    };
  }, [data]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (data.length === 0) {
      return { totalSandwiches: 0, totalIndividual: 0, totalGroup: 0, avgWeekly: 0, peakWeek: null, totalCollections: 0 };
    }
    const totalSandwiches = data.reduce((sum, w) => sum + w.total, 0);
    const totalIndividual = data.reduce((sum, w) => sum + w.individual, 0);
    const totalGroup = data.reduce((sum, w) => sum + w.group, 0);
    const avgWeekly = Math.round(totalSandwiches / data.length);
    const peakWeek = data.reduce((max, w) => w.total > max.total ? w : max, data[0]);
    const totalCollections = data.reduce((sum, w) => sum + w.collections, 0);
    
    return { totalSandwiches, totalIndividual, totalGroup, avgWeekly, peakWeek, totalCollections };
  }, [data]);

  // Variance calculations
  const individualStdDev = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.round(Math.sqrt(data.reduce((sum, w) => sum + Math.pow(w.individual - avgIndividual, 2), 0) / data.length));
  }, [data, avgIndividual]);

  const groupStdDev = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.round(Math.sqrt(data.reduce((sum, w) => sum + Math.pow(w.group - avgGroup, 2), 0) / data.length));
  }, [data, avgGroup]);

  const pieData = [
    { name: 'Individual', value: stats.totalIndividual },
    { name: 'Group', value: stats.totalGroup }
  ];

  const topWeeks = useMemo(() => {
    return [...efficiencyData].sort((a, b) => b.efficiency - a.efficiency).slice(0, 10);
  }, [efficiencyData]);

  const seasonalityData = useMemo(() => {
    return monthlyData.map(m => ({
      ...m,
      avgWeekly: Math.round(m.total / m.weeks),
      avgIndividual: Math.round(m.individual / m.weeks),
      avgGroup: Math.round(m.group / m.weeks),
    }));
  }, [monthlyData]);

  // Group collection stats
  const groupStats = useMemo(() => {
    if (data.length === 0) return null;
    
    const groupValues = data.map(d => d.group);
    const sorted = [...groupValues].sort((a, b) => a - b);
    const nonZero = sorted.filter(v => v > 0);
    
    // Distribution buckets
    const buckets = {
      zero: groupValues.filter(v => v === 0).length,
      small: groupValues.filter(v => v > 0 && v <= 1000).length,
      medium: groupValues.filter(v => v > 1000 && v <= 3000).length,
      large: groupValues.filter(v => v > 3000 && v <= 6000).length,
      huge: groupValues.filter(v => v > 6000).length,
    };
    
    // Find highest and lowest weeks
    const highestWeek = data.reduce((max, w) => w.group > max.group ? w : max, data[0]);
    const lowestNonZero = nonZero.length > 0 ? 
      data.filter(w => w.group > 0).reduce((min, w) => w.group < min.group ? w : min, data.filter(w => w.group > 0)[0]) : null;
    
    // Median
    const median = sorted.length > 0 ? 
      (sorted.length % 2 === 0 ? 
        (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2 : 
        sorted[Math.floor(sorted.length/2)]) : 0;
    
    return {
      highest: highestWeek,
      lowest: lowestNonZero,
      median: Math.round(median),
      zeroWeeks: buckets.zero,
      buckets,
      total: stats.totalGroup,
      avg: Math.round(avgGroup),
    };
  }, [data, stats.totalGroup, avgGroup]);

  const views = [
    { id: 'overview', label: 'Overview', minWeeks: 1, group: 'any' },
    { id: 'weekly', label: 'Weekly Breakdown', minWeeks: 1, group: 'any' },
    { id: 'monthly', label: 'Monthly', minWeeks: 1, group: 'any' },
    { id: 'events', label: 'Event Analysis', minWeeks: 1, group: 'any' },
    { id: 'cumulative', label: 'Cumulative', minWeeks: 1, group: 'any' },
    { id: 'volatility', label: 'Volatility', minWeeks: 8, group: 'history' },
    { id: 'rolling', label: 'Trends', minWeeks: 8, group: 'history' },
    { id: 'seasonality', label: 'Seasonality', minWeeks: 12, group: 'history' },
  ];

  const isViewDisabled = (view) => data.length < view.minWeeks;

  // Auto-switch to overview if current view becomes invalid due to date range
  useEffect(() => {
    const currentView = views.find(v => v.id === activeView);
    if (currentView && data.length < currentView.minWeeks) {
      setActiveView('overview');
    }
  }, [data.length, activeView]);

  const formatDateRange = () => {
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: BRAND.primary }}>The Sandwich Project</h1>
          <p className="text-gray-600 mt-1 hidden print:block">Collections Report: {formatDateRange()} ({data.length} weeks) — {views.find(v => v.id === activeView)?.label}</p>
          <p className="text-gray-600 mt-1 print:hidden">2025 Collections Dashboard</p>
        </div>

        {/* Control Panel - Date Range + Views (hidden on print) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden print:hidden">
          {/* Top Row: Tabs grouped by type */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-6">
              {/* Any Range tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mr-1">Views</span>
                {views.filter(v => v.group === 'any').map(view => (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id)}
                    style={activeView === view.id ? { backgroundColor: BRAND.primary } : {}}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeView === view.id
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
              
              {/* Divider */}
              <div className="h-8 w-px bg-gray-200"></div>
              
              {/* History-dependent tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mr-1" title="These views need more data to be meaningful">
                  Needs 8+ Weeks
                </span>
                {views.filter(v => v.group === 'history').map(view => {
                  const disabled = isViewDisabled(view);
                  return (
                    <button
                      key={view.id}
                      onClick={() => !disabled && setActiveView(view.id)}
                      disabled={disabled}
                      style={activeView === view.id && !disabled ? { backgroundColor: BRAND.primary } : {}}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        disabled
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                          : activeView === view.id
                            ? 'text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={disabled ? `Needs ${view.minWeeks}+ weeks of data` : ''}
                    >
                      {view.label}
                      {disabled && <span className="ml-1 text-xs">🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Bottom Row: Date Controls */}
          <div className="p-4 bg-gray-50">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setActivePreset(null); }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setActivePreset(null); }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                />
              </div>
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    style={activePreset === preset.id ? { backgroundColor: BRAND.secondary, color: 'white' } : {}}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      activePreset === preset.id
                        ? 'shadow-sm'
                        : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <span className="text-sm text-gray-400 ml-auto">{data.length} weeks selected</span>
              <button
                onClick={() => window.print()}
                className="ml-4 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all flex items-center gap-1.5 print:hidden"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body { 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden { display: none !important; }
            .hidden.print\\:block { display: block !important; }
            .bg-gray-50 { background: white !important; }
            .shadow-sm, .shadow-md { box-shadow: none !important; }
            .min-h-screen { min-height: auto !important; }
            .rounded-xl { border: 1px solid #e5e7eb !important; }
            .recharts-wrapper { page-break-inside: avoid; }
            table { page-break-inside: avoid; }
            @page { 
              size: landscape;
              margin: 0.5in;
            }
          }
        `}</style>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4" style={{ borderLeftColor: BRAND.primary }}>
            <p className="text-sm text-gray-500 mb-1">Total Sandwiches</p>
            <p className="text-2xl font-bold" style={{ color: BRAND.primary }}>{stats.totalSandwiches.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4" style={{ borderLeftColor: BRAND.secondary }}>
            <p className="text-sm text-gray-500 mb-1">Avg Weekly</p>
            <p className="text-2xl font-bold" style={{ color: BRAND.secondary }}>{stats.avgWeekly.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4" style={{ borderLeftColor: BRAND.highlight }}>
            <p className="text-sm text-gray-500 mb-1">Peak Week</p>
            <p className="text-2xl font-bold" style={{ color: BRAND.highlight }}>{stats.peakWeek?.total.toLocaleString() || '-'}</p>
            <p className="text-xs text-gray-400">{stats.peakWeek?.week || ''}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4" style={{ borderLeftColor: BRAND.accent }}>
            <p className="text-sm text-gray-500 mb-1">Collection Events</p>
            <p className="text-2xl font-bold" style={{ color: BRAND.accent }}>{stats.totalCollections}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          {data.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No data available for selected date range</p>
              <p className="text-sm mt-2">Try adjusting the start or end date</p>
            </div>
          ) : (
            <>
              {activeView === 'overview' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: BRAND.primary }}>Weekly Total Sandwiches</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      {data.length <= 12 ? (
                        <BarChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="total" fill={BRAND.secondary} name="Total" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : (
                        <AreaChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="total" stroke={BRAND.primary} fill={BRAND.accent} fillOpacity={0.4} name="Total" />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4" style={{ color: BRAND.primary }}>Source Distribution</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell fill={BRAND.primary} />
                            <Cell fill={BRAND.highlight} />
                          </Pie>
                          <Tooltip formatter={(value) => value.toLocaleString()} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4" style={{ color: BRAND.primary }}>Monthly Summary</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="total" fill={BRAND.secondary} name="Total" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'weekly' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: BRAND.primary }}>Weekly: Individual vs Group</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    {data.length <= 12 ? (
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="individual" stackId="1" fill={BRAND.primary} name="Individual" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="group" stackId="1" fill={BRAND.highlight} name="Group" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : (
                      <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area type="monotone" dataKey="individual" stackId="1" stroke={BRAND.primary} fill={BRAND.primary} fillOpacity={0.7} name="Individual" />
                        <Area type="monotone" dataKey="group" stackId="1" stroke={BRAND.highlight} fill={BRAND.highlight} fillOpacity={0.7} name="Group" />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                  <div className="mt-4 grid md:grid-cols-2 gap-4">
                    <div className="rounded-lg p-4" style={{ backgroundColor: '#23638315' }}>
                      <p className="font-semibold" style={{ color: BRAND.primary }}>Individual: {stats.totalIndividual.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Avg {Math.round(avgIndividual).toLocaleString()}/week • {((stats.totalIndividual / stats.totalSandwiches) * 100).toFixed(0)}% of total</p>
                    </div>
                    <div className="rounded-lg p-4" style={{ backgroundColor: '#fbad3f20' }}>
                      <p className="font-semibold" style={{ color: '#b8860b' }}>Group: {stats.totalGroup.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Avg {Math.round(avgGroup).toLocaleString()}/week • {((stats.totalGroup / stats.totalSandwiches) * 100).toFixed(0)}% of total</p>
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'monthly' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: BRAND.primary }}>Monthly Breakdown</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="individual" fill={BRAND.primary} name="Individual" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="group" fill={BRAND.highlight} name="Group" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2" style={{ borderColor: BRAND.accent }}>
                          <th className="text-left py-2 text-gray-600">Month</th>
                          <th className="text-right py-2 text-gray-600">Individual</th>
                          <th className="text-right py-2 text-gray-600">Group</th>
                          <th className="text-right py-2 text-gray-600">Total</th>
                          <th className="text-right py-2 text-gray-600">Events</th>
                          <th className="text-right py-2 text-gray-600">Per Event</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.map(m => (
                          <tr key={m.month} className="border-b border-gray-100">
                            <td className="py-2 font-medium">{m.month}</td>
                            <td className="text-right" style={{ color: BRAND.primary }}>{m.individual.toLocaleString()}</td>
                            <td className="text-right" style={{ color: BRAND.highlight }}>{m.group.toLocaleString()}</td>
                            <td className="text-right font-semibold">{m.total.toLocaleString()}</td>
                            <td className="text-right text-gray-500">{m.collections}</td>
                            <td className="text-right" style={{ color: BRAND.secondary }}>{Math.round(m.total / m.collections).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeView === 'events' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: BRAND.primary }}>Sandwiches Per Collection Event</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={efficiencyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="collections" fill={BRAND.accent} name="# Events" radius={[4, 4, 0, 0]} />
                        <Line 
                          yAxisId="right" 
                          type="monotone" 
                          dataKey="efficiency" 
                          stroke={BRAND.highlight} 
                          strokeWidth={2} 
                          name="Sandwiches/Event" 
                          dot={data.length <= 12 ? { fill: BRAND.highlight, r: 5 } : false} 
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: BRAND.primary }}>Top Weeks by Efficiency</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2" style={{ borderColor: BRAND.accent }}>
                            <th className="text-left py-2 text-gray-600">Week</th>
                            <th className="text-right py-2 text-gray-600">Events</th>
                            <th className="text-right py-2 text-gray-600">Total</th>
                            <th className="text-right py-2 text-gray-600">Per Event</th>
                            <th className="text-right py-2 text-gray-600">Group %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topWeeks.map((w) => (
                            <tr key={w.week} className="border-b border-gray-100">
                              <td className="py-2 font-medium">{w.week}</td>
                              <td className="text-right text-gray-500">{w.collections}</td>
                              <td className="text-right">{w.total.toLocaleString()}</td>
                              <td className="text-right font-semibold" style={{ color: BRAND.highlight }}>{w.efficiency.toLocaleString()}</td>
                              <td className="text-right" style={{ color: w.group / w.total > 0.5 ? BRAND.highlight : BRAND.primary }}>
                                {((w.group / w.total) * 100).toFixed(0)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Group Collection Analysis */}
                  {groupStats && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4" style={{ color: BRAND.highlight }}>Group Collection Deep Dive</h3>
                      
                      <div className="grid md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Highest Week</p>
                          <p className="text-2xl font-bold" style={{ color: BRAND.highlight }}>{groupStats.highest.group.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">{groupStats.highest.week}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Lowest (non-zero)</p>
                          <p className="text-2xl font-bold" style={{ color: BRAND.primary }}>
                            {groupStats.lowest ? groupStats.lowest.group.toLocaleString() : '—'}
                          </p>
                          <p className="text-sm text-gray-600">{groupStats.lowest?.week || 'No data'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Median Week</p>
                          <p className="text-2xl font-bold" style={{ color: BRAND.secondary }}>{groupStats.median.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">50th percentile</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-3 text-gray-700">Weekly Group Distribution</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Zero weeks</span>
                              <div className="flex items-center gap-2">
                                <div className="h-3 rounded" style={{ width: `${(groupStats.buckets.zero / data.length) * 100}px`, backgroundColor: '#e5e7eb' }}></div>
                                <span className="text-sm font-medium w-8">{groupStats.buckets.zero}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">1 – 1,000</span>
                              <div className="flex items-center gap-2">
                                <div className="h-3 rounded" style={{ width: `${(groupStats.buckets.small / data.length) * 100}px`, backgroundColor: BRAND.accent }}></div>
                                <span className="text-sm font-medium w-8">{groupStats.buckets.small}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">1,001 – 3,000</span>
                              <div className="flex items-center gap-2">
                                <div className="h-3 rounded" style={{ width: `${(groupStats.buckets.medium / data.length) * 100}px`, backgroundColor: BRAND.secondary }}></div>
                                <span className="text-sm font-medium w-8">{groupStats.buckets.medium}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">3,001 – 6,000</span>
                              <div className="flex items-center gap-2">
                                <div className="h-3 rounded" style={{ width: `${(groupStats.buckets.large / data.length) * 100}px`, backgroundColor: BRAND.primary }}></div>
                                <span className="text-sm font-medium w-8">{groupStats.buckets.large}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">6,000+</span>
                              <div className="flex items-center gap-2">
                                <div className="h-3 rounded" style={{ width: `${(groupStats.buckets.huge / data.length) * 100}px`, backgroundColor: BRAND.highlight }}></div>
                                <span className="text-sm font-medium w-8">{groupStats.buckets.huge}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-3 text-gray-700">Top 5 Group Weeks</h4>
                          <div className="space-y-2">
                            {[...data].sort((a, b) => b.group - a.group).slice(0, 5).map((w, i) => (
                              <div key={w.week} className="flex items-center justify-between py-1 border-b border-gray-100">
                                <span className="text-sm">
                                  <span className="font-medium" style={{ color: BRAND.highlight }}>{i + 1}.</span> {w.week}
                                </span>
                                <span className="font-semibold" style={{ color: BRAND.highlight }}>{w.group.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeView === 'volatility' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: BRAND.primary }}>Week-to-Week Variance from Average</h3>
                    <p className="text-sm text-gray-500 mb-4">Bars above 0 = above average that week, below 0 = below average</p>
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={varianceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#666" strokeWidth={2} />
                        <Bar dataKey="individualVariance" fill={BRAND.primary} name="Individual ± avg" radius={[4, 4, 4, 4]} />
                        <Bar dataKey="groupVariance" fill={BRAND.highlight} name="Group ± avg" radius={[4, 4, 4, 4]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-lg p-4 border-2" style={{ borderColor: BRAND.primary }}>
                      <h4 className="font-semibold mb-2" style={{ color: BRAND.primary }}>Individual Collections</h4>
                      <p className="text-2xl font-bold">{Math.round(avgIndividual).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">weekly average</p>
                      <p className="mt-2 text-sm">
                        <span className="font-medium">Std Dev:</span> ±{individualStdDev.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        ({avgIndividual > 0 ? ((individualStdDev / avgIndividual) * 100).toFixed(0) : 0}% coefficient of variation)
                      </p>
                    </div>
                    <div className="rounded-lg p-4 border-2" style={{ borderColor: BRAND.highlight }}>
                      <h4 className="font-semibold mb-2" style={{ color: '#b8860b' }}>Group Collections</h4>
                      <p className="text-2xl font-bold">{Math.round(avgGroup).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">weekly average</p>
                      <p className="mt-2 text-sm">
                        <span className="font-medium">Std Dev:</span> ±{groupStdDev.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        ({avgGroup > 0 ? ((groupStdDev / avgGroup) * 100).toFixed(0) : 0}% coefficient of variation)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'rolling' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: BRAND.primary }}>4-Week Rolling Average vs Actual</h3>
                    <p className="text-sm text-gray-500 mb-4">Smooths out week-to-week noise to show underlying trends</p>
                    <ResponsiveContainer width="100%" height={350}>
                      {data.length <= 12 ? (
                        <ComposedChart data={rollingData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="total" fill={BRAND.accent} name="Actual Weekly" radius={[4, 4, 0, 0]} />
                          <Line type="monotone" dataKey="avgTotal" stroke={BRAND.primary} strokeWidth={3} name="4-Week Avg" dot={{ fill: BRAND.primary, r: 4 }} />
                        </ComposedChart>
                      ) : (
                        <ComposedChart data={rollingData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="total" fill={BRAND.accent} fillOpacity={0.3} name="Actual Weekly" />
                          <Line type="monotone" dataKey="avgTotal" stroke={BRAND.primary} strokeWidth={3} name="4-Week Avg" dot={false} />
                        </ComposedChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: BRAND.primary }}>Rolling Average by Source</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={rollingData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="avgIndividual" stroke={BRAND.primary} strokeWidth={2} name="Individual (4-wk avg)" dot={data.length <= 12 ? { fill: BRAND.primary, r: 4 } : false} />
                        <Line type="monotone" dataKey="avgGroup" stroke={BRAND.highlight} strokeWidth={2} name="Group (4-wk avg)" dot={data.length <= 12 ? { fill: BRAND.highlight, r: 4 } : false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {activeView === 'seasonality' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: BRAND.primary }}>Average Weekly Output by Month</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={seasonalityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="avgIndividual" fill={BRAND.primary} name="Avg Individual/Week" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="avgGroup" fill={BRAND.highlight} name="Avg Group/Week" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2" style={{ borderColor: BRAND.accent }}>
                          <th className="text-left py-2 text-gray-600">Month</th>
                          <th className="text-right py-2 text-gray-600">Weeks</th>
                          <th className="text-right py-2 text-gray-600">Avg Weekly Total</th>
                          <th className="text-right py-2 text-gray-600">Avg Individual</th>
                          <th className="text-right py-2 text-gray-600">Avg Group</th>
                          <th className="text-right py-2 text-gray-600">Group %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seasonalityData.map(m => (
                          <tr key={m.month} className="border-b border-gray-100">
                            <td className="py-2 font-medium">{m.month}</td>
                            <td className="text-right text-gray-500">{m.weeks}</td>
                            <td className="text-right font-semibold">{m.avgWeekly.toLocaleString()}</td>
                            <td className="text-right" style={{ color: BRAND.primary }}>{m.avgIndividual.toLocaleString()}</td>
                            <td className="text-right" style={{ color: BRAND.highlight }}>{m.avgGroup.toLocaleString()}</td>
                            <td className="text-right text-gray-500">{((m.avgGroup / m.avgWeekly) * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeView === 'cumulative' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: BRAND.primary }}>Cumulative Progress</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={cumulativeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`} />
                      <Tooltip 
                        formatter={(value) => [value.toLocaleString(), 'Cumulative Total']}
                      />
                      <Area 
                        type={data.length <= 12 ? "stepAfter" : "monotone"} 
                        dataKey="cumulative" 
                        stroke={BRAND.secondary} 
                        fill={BRAND.accent} 
                        fillOpacity={0.3} 
                        name="Cumulative"
                        dot={data.length <= 12 ? { fill: BRAND.secondary, r: 5 } : false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-4 rounded-lg p-4" style={{"backgroundColor": "#47b3cb20"}}>
                    <p className="text-gray-700">
                      <strong>Period total:</strong> {stats.totalSandwiches.toLocaleString()} sandwiches collected across {data.length} weeks.
                    </p>
                    <p className="text-gray-600 text-sm mt-1">
                      Average pace: ~{stats.avgWeekly.toLocaleString()}/week
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Fighting food insecurity, one sandwich at a time</p>
        </div>
      </div>
    </div>
  );
}

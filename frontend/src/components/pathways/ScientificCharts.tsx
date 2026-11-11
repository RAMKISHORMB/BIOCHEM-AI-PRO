import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import {
  Activity,
  Sliders,
  Info,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  FlaskConical,
  HelpCircle,
  RefreshCw,
  User,
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
  Scale,
  Zap,
  Thermometer,
  Droplet
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea
} from 'recharts';

interface PatientOption {
  id: string;
  mrn: string;
  full_name: string;
  biological_sex: string;
  age_years?: number;
}

interface TrendPoint {
  timestamp: string;
  date_display: string;
  accession_number: string;
  value: number | null;
  unit: string;
  flag: string;
}

interface TrendData {
  analyte_code: string;
  analyte_name: string;
  unit: string;
  points: TrendPoint[];
  reference_range?: {
    lower_limit?: number;
    upper_limit?: number;
    critical_low?: number;
    critical_high?: number;
    unit: string;
  };
}

export const ScientificCharts: React.FC = () => {
  // Active chart tab (1 to 6)
  const [activeChart, setActiveChart] = useState<
    'michaelis-menten' | 'lineweaver-burk' | 'inhibition' | 'ph' | 'temperature' | 'patient-trends'
  >('michaelis-menten');

  // =========================================================================
  // CHART 1: MICHAELIS-MENTEN STATE
  // =========================================================================
  const [vmax, setVmax] = useState<number>(100); // μmol/min/mg
  const [km, setKm] = useState<number>(20); // μM
  const [maxSubstrate, setMaxSubstrate] = useState<number>(120); // μM

  const michaelisMentenData = useMemo(() => {
    const data = [];
    const step = maxSubstrate / 40;
    for (let s = 0; s <= maxSubstrate; s += step) {
      const v = (vmax * s) / (km + s);
      data.push({
        substrate: Math.round(s * 10) / 10,
        velocity: Math.round(v * 100) / 100,
        halfVmax: Math.round((vmax / 2) * 100) / 100,
        vmaxLimit: vmax
      });
    }
    return data;
  }, [vmax, km, maxSubstrate]);

  // =========================================================================
  // CHART 2: LINEWEAVER-BURK STATE
  // =========================================================================
  const [lbVmax, setLbVmax] = useState<number>(100);
  const [lbKm, setLbKm] = useState<number>(20);
  const [lbInhibitorConc, setLbInhibitorConc] = useState<number>(15); // μM
  const [lbKi, setLbKi] = useState<number>(10); // μM
  const [lbMode, setLbMode] = useState<'all' | 'competitive' | 'noncompetitive' | 'uncompetitive'>('all');

  const lineweaverBurkData = useMemo(() => {
    const data = [];
    const alpha = 1 + lbInhibitorConc / lbKi; // For competitive & noncompetitive
    const alphaPrime = 1 + lbInhibitorConc / lbKi; // For uncompetitive & noncompetitive

    // Plot 1/[S] from 0.01 to 0.15 μM^-1
    const invSValues = [0.01, 0.02, 0.03, 0.04, 0.05, 0.07, 0.09, 0.11, 0.13, 0.15];

    for (const invS of invSValues) {
      // Uninhibited: 1/v = (Km/Vmax)*(1/S) + 1/Vmax
      const invV_uninhibited = (lbKm / lbVmax) * invS + 1 / lbVmax;

      // Competitive: Vmax unchanged, Km_app = alpha * Km
      const invV_competitive = ((alpha * lbKm) / lbVmax) * invS + 1 / lbVmax;

      // Noncompetitive: Vmax_app = Vmax / alpha, Km unchanged
      const invV_noncompetitive = ((alpha * lbKm) / lbVmax) * invS + alpha / lbVmax;

      // Uncompetitive: Vmax_app = Vmax / alpha', Km_app = Km / alpha'
      const invV_uncompetitive = (lbKm / lbVmax) * invS + alphaPrime / lbVmax;

      data.push({
        invS: Math.round(invS * 1000) / 1000,
        uninhibited: Math.round(invV_uninhibited * 10000) / 10000,
        competitive: Math.round(invV_competitive * 10000) / 10000,
        noncompetitive: Math.round(invV_noncompetitive * 10000) / 10000,
        uncompetitive: Math.round(invV_uncompetitive * 10000) / 10000
      });
    }
    return data;
  }, [lbVmax, lbKm, lbInhibitorConc, lbKi]);

  // =========================================================================
  // CHART 3: INHIBITION VELOCITY CURVES STATE
  // =========================================================================
  const [inhibVmax, setInhibVmax] = useState<number>(100);
  const [inhibKm, setInhibKm] = useState<number>(25);
  const [iConc, setIConc] = useState<number>(20);
  const [ki, setKi] = useState<number>(10);
  const [showComp, setShowComp] = useState<boolean>(true);
  const [showNoncomp, setShowNoncomp] = useState<boolean>(true);
  const [showUncomp, setShowUncomp] = useState<boolean>(true);

  const inhibitionCurvesData = useMemo(() => {
    const data = [];
    const alpha = 1 + iConc / ki;
    const alphaPrime = 1 + iConc / ki;

    for (let s = 0; s <= 120; s += 3) {
      const v_uninhibited = (inhibVmax * s) / (inhibKm + s);
      const v_comp = (inhibVmax * s) / (alpha * inhibKm + s);
      const v_noncomp = ((inhibVmax / alpha) * s) / (inhibKm + s);
      const v_uncomp = ((inhibVmax / alphaPrime) * s) / (inhibKm / alphaPrime + s);

      data.push({
        substrate: s,
        uninhibited: Math.round(v_uninhibited * 100) / 100,
        competitive: Math.round(v_comp * 100) / 100,
        noncompetitive: Math.round(v_noncomp * 100) / 100,
        uncompetitive: Math.round(v_uncomp * 100) / 100
      });
    }
    return data;
  }, [inhibVmax, inhibKm, iConc, ki]);

  // =========================================================================
  // CHART 4: ENZYME ACTIVITY VS pH STATE
  // =========================================================================
  const [pka1, setPka1] = useState<number>(5.5);
  const [pka2, setPka2] = useState<number>(8.5);
  const [selectedEnzymePreset, setSelectedEnzymePreset] = useState<string>('custom');

  const applyPhPreset = (preset: string) => {
    setSelectedEnzymePreset(preset);
    if (preset === 'pepsin') {
      setPka1(1.2);
      setPka2(2.8);
    } else if (preset === 'salivary_amylase') {
      setPka1(5.8);
      setPka2(7.8);
    } else if (preset === 'trypsin') {
      setPka1(6.8);
      setPka2(8.8);
    } else if (preset === 'alkaline_phosphatase') {
      setPka1(8.5);
      setPka2(10.5);
    }
  };

  const phData = useMemo(() => {
    const data = [];
    for (let ph = 1.0; ph <= 13.0; ph += 0.25) {
      // Dixon-Webb Bell-Shaped Ionization Model
      const denominator = 1 + Math.pow(10, pka1 - ph) + Math.pow(10, ph - pka2);
      const relativeActivity = Math.max(0, Math.min(100, 100 / denominator));
      data.push({
        ph: Math.round(ph * 100) / 100,
        activity: Math.round(relativeActivity * 10) / 10
      });
    }
    return data;
  }, [pka1, pka2]);

  const optimalPh = useMemo(() => Math.round(((pka1 + pka2) / 2) * 100) / 100, [pka1, pka2]);

  // =========================================================================
  // CHART 5: ENZYME ACTIVITY VS TEMPERATURE STATE
  // =========================================================================
  const [tOpt, setTOpt] = useState<number>(37); // °C
  const [tMelt, setTMelt] = useState<number>(44); // °C
  const [selectedTempPreset, setSelectedTempPreset] = useState<string>('human');

  const applyTempPreset = (preset: string) => {
    setSelectedTempPreset(preset);
    if (preset === 'human') {
      setTOpt(37);
      setTMelt(43);
    } else if (preset === 'taq') {
      setTOpt(75);
      setTMelt(92);
    } else if (preset === 'psychrophilic') {
      setTOpt(18);
      setTMelt(27);
    }
  };

  const temperatureData = useMemo(() => {
    const data = [];
    for (let temp = 0; temp <= 100; temp += 1) {
      // Arrhenius Activation (Q10 = 2) combined with Sigmoidal Thermal Denaturation
      const q10Factor = Math.pow(2.0, (temp - tOpt) / 10);
      const denaturation = 1 / (1 + Math.exp((temp - tMelt) / 2.2));
      let activity = 100 * q10Factor * denaturation;
      if (temp > tMelt + 10) activity = 0;
      data.push({
        temperature: temp,
        activity: Math.round(Math.max(0, Math.min(100, activity)) * 10) / 10
      });
    }
    return data;
  }, [tOpt, tMelt]);

  // =========================================================================
  // CHART 6: ACTUAL PATIENT BIOMARKER TRENDS STATE
  // =========================================================================
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAnalyte, setSelectedAnalyte] = useState<string>('GLU');
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loadingTrends, setLoadingTrends] = useState<boolean>(false);
  const [trendError, setTrendError] = useState<string | null>(null);

  // Load real patients from EHR registry
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await api.get<{ items: PatientOption[] }>('/patients');
        const list = res.items || [];
        setPatients(list);
        if (list.length > 0 && !selectedPatientId) {
          setSelectedPatientId(list[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load patient directory', err);
      }
    };
    loadPatients();
  }, []);

  // Fetch actual patient longitudinal measurements
  useEffect(() => {
    if (!selectedPatientId || !selectedAnalyte) return;

    const fetchTrends = async () => {
      try {
        setLoadingTrends(true);
        setTrendError(null);
        const res = await api.get<TrendData>(
          `/history/patients/${selectedPatientId}/trends?analyte_code=${encodeURIComponent(selectedAnalyte)}`
        );
        setTrendData(res);
      } catch (err: any) {
        setTrendError(err?.message || 'No longitudinal data available.');
        setTrendData(null);
      } finally {
        setLoadingTrends(false);
      }
    };
    fetchTrends();
  }, [selectedPatientId, selectedAnalyte]);

  const patientChartPoints = useMemo(() => {
    if (!trendData || !trendData.points) return [];
    return trendData.points.map((pt) => ({
      date: pt.date_display || pt.timestamp.split('T')[0],
      value: pt.value,
      accession: pt.accession_number,
      flag: pt.flag,
      lowerLimit: trendData.reference_range?.lower_limit,
      upperLimit: trendData.reference_range?.upper_limit
    }));
  }, [trendData]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-white p-6 rounded-xl border border-[#E5EAF1] shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-lg font-bold text-[#17365D]">Scientific Kinetics & Biomarker Analytics</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                Interactive Lab Engine
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Rigorous mathematical simulations of enzyme kinetics, inhibition models, environmental ionization curves,
              and genuine patient EHR biomarker trajectories.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#64748B] flex items-center gap-1 bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E5EAF1]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
              Recharts Engine • Zero Fabrication
            </span>
          </div>
        </div>

        {/* 6 Sub-Tab Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-[#E5EAF1]">
          <button
            onClick={() => setActiveChart('michaelis-menten')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeChart === 'michaelis-menten'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172B4D] border border-[#E5EAF1]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>1. Michaelis–Menten</span>
          </button>

          <button
            onClick={() => setActiveChart('lineweaver-burk')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeChart === 'lineweaver-burk'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172B4D] border border-[#E5EAF1]'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>2. Lineweaver–Burk</span>
          </button>

          <button
            onClick={() => setActiveChart('inhibition')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeChart === 'inhibition'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172B4D] border border-[#E5EAF1]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. Inhibition Classes</span>
          </button>

          <button
            onClick={() => setActiveChart('ph')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeChart === 'ph'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172B4D] border border-[#E5EAF1]'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>4. Activity vs. pH</span>
          </button>

          <button
            onClick={() => setActiveChart('temperature')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeChart === 'temperature'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172B4D] border border-[#E5EAF1]'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>5. Activity vs. Temperature</span>
          </button>

          <button
            onClick={() => setActiveChart('patient-trends')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeChart === 'patient-trends'
                ? 'bg-[#15803D] text-white shadow-sm'
                : 'bg-[#F0FDF4] text-[#166534] hover:bg-[#DCFCE7] border border-[#BBF7D0]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>6. Patient Biomarker Trends</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: MICHAELIS-MENTEN KINETICS */}
      {/* =================================================================== */}
      {activeChart === 'michaelis-menten' && (
        <div className="bg-white p-6 rounded-xl border border-[#E5EAF1] shadow-card space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5EAF1] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#17365D]">Michaelis–Menten Saturation Kinetics</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                  v = (Vmax • [S]) / (Km + [S])
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Evaluates steady-state reaction velocity as a function of substrate concentration.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
              SIMULATED KINETICS MODEL
            </span>
          </div>

          {/* Interactive Parameters Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E5EAF1]">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Vmax (Max Velocity):</span>
                <span className="font-mono font-bold text-[#2563EB]">{vmax} μmol/min/mg</span>
              </div>
              <input
                type="range"
                min="20"
                max="250"
                step="5"
                value={vmax}
                onChange={(e) => setVmax(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
              <span className="text-[10px] text-[#64748B] block mt-0.5">Asymptotic enzyme saturation limit</span>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Km (Michaelis Constant):</span>
                <span className="font-mono font-bold text-[#2563EB]">{km} μM</span>
              </div>
              <input
                type="range"
                min="2"
                max="80"
                step="1"
                value={km}
                onChange={(e) => setKm(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
              <span className="text-[10px] text-[#64748B] block mt-0.5">Substrate conc at 1/2 Vmax</span>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Max [S] Range:</span>
                <span className="font-mono font-bold text-[#2563EB]">{maxSubstrate} μM</span>
              </div>
              <input
                type="range"
                min="60"
                max="200"
                step="10"
                value={maxSubstrate}
                onChange={(e) => setMaxSubstrate(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
              <span className="text-[10px] text-[#64748B] block mt-0.5">Experimental observation window</span>
            </div>
          </div>

          {/* Recharts Plot */}
          <div className="h-72 w-full bg-[#FFFFFF] p-3 rounded-xl border border-[#E5EAF1]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={michaelisMentenData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="substrate"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Substrate Concentration [S] (μM)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#172B4D' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Velocity v (μmol/min/mg)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#172B4D' }}
                  domain={[0, Math.ceil(vmax * 1.15)]}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5EAF1', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any, name: string) => [
                    `${val} μmol/min/mg`,
                    name === 'velocity' ? 'Reaction Velocity (v)' : name
                  ]}
                  labelFormatter={(lbl) => `[S] = ${lbl} μM`}
                />
                <ReferenceLine y={vmax} stroke="#DC2626" strokeDasharray="4 4" label={{ value: `Vmax = ${vmax}`, fill: '#DC2626', fontSize: 10, position: 'right' }} />
                <ReferenceLine y={vmax / 2} stroke="#D97706" strokeDasharray="3 3" label={{ value: `1/2 Vmax = ${vmax / 2}`, fill: '#D97706', fontSize: 10, position: 'right' }} />
                <ReferenceLine x={km} stroke="#2563EB" strokeDasharray="3 3" label={{ value: `Km = ${km} μM`, fill: '#2563EB', fontSize: 10, position: 'top' }} />
                <Line type="monotone" dataKey="velocity" stroke="#2563EB" strokeWidth={2.5} dot={false} name="Velocity v" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Kinetic Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg">
              <span className="text-[#64748B] text-[11px] block">Vmax Limit</span>
              <span className="text-sm font-bold font-mono text-[#172B4D]">{vmax} μmol/min/mg</span>
            </div>
            <div className="p-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg">
              <span className="text-[#64748B] text-[11px] block">Affinity Constant Km</span>
              <span className="text-sm font-bold font-mono text-[#2563EB]">{km} μM</span>
            </div>
            <div className="p-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg">
              <span className="text-[#64748B] text-[11px] block">Catalytic Efficiency (Vmax / Km)</span>
              <span className="text-sm font-bold font-mono text-[#15803D]">{(vmax / km).toFixed(2)} min⁻¹</span>
            </div>
            <div className="p-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg">
              <span className="text-[#64748B] text-[11px] block">Velocity at Km</span>
              <span className="text-sm font-bold font-mono text-[#D97706]">{(vmax / 2).toFixed(1)} μmol/min/mg</span>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: LINEWEAVER-BURK PLOT */}
      {/* =================================================================== */}
      {activeChart === 'lineweaver-burk' && (
        <div className="bg-white p-6 rounded-xl border border-[#E5EAF1] shadow-card space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5EAF1] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#17365D]">Lineweaver–Burk Double-Reciprocal Transformation</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                  1/v = (Km/Vmax) • (1/[S]) + 1/Vmax
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Linearized reciprocal plot to discern inhibition modes via slope (Km/Vmax) and y-intercept (1/Vmax).
              </p>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
              SIMULATED TRANSFORMATION
            </span>
          </div>

          {/* Sliders & Inhibitor Mode */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E5EAF1]">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Base Vmax:</span>
                <span className="font-mono font-bold text-[#2563EB]">{lbVmax}</span>
              </div>
              <input
                type="range"
                min="40"
                max="200"
                step="5"
                value={lbVmax}
                onChange={(e) => setLbVmax(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Base Km:</span>
                <span className="font-mono font-bold text-[#2563EB]">{lbKm} μM</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={lbKm}
                onChange={(e) => setLbKm(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Inhibitor [I]:</span>
                <span className="font-mono font-bold text-[#7C3AED]">{lbInhibitorConc} μM</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={lbInhibitorConc}
                onChange={(e) => setLbInhibitorConc(Number(e.target.value))}
                className="w-full accent-[#7C3AED] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Inhibition Ki:</span>
                <span className="font-mono font-bold text-[#7C3AED]">{lbKi} μM</span>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                step="1"
                value={lbKi}
                onChange={(e) => setLbKi(Number(e.target.value))}
                className="w-full accent-[#7C3AED] cursor-pointer"
              />
            </div>
          </div>

          {/* Mode Selector Pill */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B]">Overlay Comparison:</span>
            <div className="flex items-center gap-1.5 text-xs">
              {(['all', 'competitive', 'noncompetitive', 'uncompetitive'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setLbMode(m)}
                  className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                    lbMode === m
                      ? 'bg-[#172B4D] text-white'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#172B4D]'
                  }`}
                >
                  {m === 'all' ? 'All Mechanisms' : m}
                </button>
              ))}
            </div>
          </div>

          {/* Lineweaver-Burk Chart */}
          <div className="h-72 w-full bg-white p-3 rounded-xl border border-[#E5EAF1]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineweaverBurkData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="invS"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: '1 / [S] (μM⁻¹)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#172B4D' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: '1 / v (min•mg•μmol⁻¹)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#172B4D' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5EAF1', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="uninhibited" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} name="Uninhibited (No Drug)" />
                {(lbMode === 'all' || lbMode === 'competitive') && (
                  <Line type="monotone" dataKey="competitive" stroke="#D97706" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} name="+ Competitive Inhibitor" />
                )}
                {(lbMode === 'all' || lbMode === 'noncompetitive') && (
                  <Line type="monotone" dataKey="noncompetitive" stroke="#7C3AED" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} name="+ Noncompetitive Inhibitor" />
                )}
                {(lbMode === 'all' || lbMode === 'uncompetitive') && (
                  <Line type="monotone" dataKey="uncompetitive" stroke="#059669" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} name="+ Uncompetitive Inhibitor" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Intercept Analysis Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg space-y-1">
              <span className="font-bold text-[#1D4ED8] block">Competitive Hallmark</span>
              <p className="text-[#1E40AF]">
                Same Y-intercept (1/Vmax); slope increases by factor α = (1 + [I]/Ki). High [S] outcompetes drug.
              </p>
            </div>
            <div className="p-3 bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg space-y-1">
              <span className="font-bold text-[#6D28D9] block">Noncompetitive Hallmark</span>
              <p className="text-[#5B21B6]">
                Same X-intercept (-1/Km); Y-intercept increases (Vmax decreases). Substrate cannot overcome allosteric inhibition.
              </p>
            </div>
            <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg space-y-1">
              <span className="font-bold text-[#047857] block">Uncompetitive Hallmark</span>
              <p className="text-[#065F46]">
                Parallel lines (same slope); both Vmax and Km decrease by factor α'. Binds exclusively to ES complex.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: INHIBITION VELOCITY CURVES */}
      {/* =================================================================== */}
      {activeChart === 'inhibition' && (
        <div className="bg-white p-6 rounded-xl border border-[#E5EAF1] shadow-card space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5EAF1] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#17365D]">Enzyme Inhibition Velocity Profiles</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                  Direct Velocity v vs. [S]
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Comparative direct kinetics showing apparent Vmax and apparent Km alterations across pharmacologic classes.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
              SIMULATED PHARMACOLOGY
            </span>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E5EAF1]">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Vmax:</span>
                <span className="font-mono font-bold text-[#2563EB]">{inhibVmax}</span>
              </div>
              <input
                type="range"
                min="40"
                max="180"
                step="5"
                value={inhibVmax}
                onChange={(e) => setInhibVmax(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Km:</span>
                <span className="font-mono font-bold text-[#2563EB]">{inhibKm} μM</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={inhibKm}
                onChange={(e) => setInhibKm(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Drug Conc [I]:</span>
                <span className="font-mono font-bold text-[#DC2626]">{iConc} μM</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="2"
                value={iConc}
                onChange={(e) => setIConc(Number(e.target.value))}
                className="w-full accent-[#DC2626] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Affinity Ki:</span>
                <span className="font-mono font-bold text-[#DC2626]">{ki} μM</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={ki}
                onChange={(e) => setKi(Number(e.target.value))}
                className="w-full accent-[#DC2626] cursor-pointer"
              />
            </div>
          </div>

          {/* Visibility Checkboxes */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-[#64748B]">Active Curves:</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-[#D97706]">
              <input
                type="checkbox"
                checked={showComp}
                onChange={(e) => setShowComp(e.target.checked)}
                className="rounded accent-[#D97706]"
              />
              Competitive (Statins, Methotrexate)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-[#7C3AED]">
              <input
                type="checkbox"
                checked={showNoncomp}
                onChange={(e) => setShowNoncomp(e.target.checked)}
                className="rounded accent-[#7C3AED]"
              />
              Noncompetitive (Lead, Cyanide)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-[#059669]">
              <input
                type="checkbox"
                checked={showUncomp}
                onChange={(e) => setShowUncomp(e.target.checked)}
                className="rounded accent-[#059669]"
              />
              Uncompetitive (Lithium)
            </label>
          </div>

          {/* Chart */}
          <div className="h-72 w-full bg-white p-3 rounded-xl border border-[#E5EAF1]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={inhibitionCurvesData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="substrate"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Substrate Concentration [S] (μM)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#172B4D' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Reaction Velocity v', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#172B4D' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5EAF1', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="uninhibited" stroke="#2563EB" strokeWidth={2.5} dot={false} name="Uninhibited Baseline" />
                {showComp && (
                  <Line type="monotone" dataKey="competitive" stroke="#D97706" strokeWidth={2} dot={false} name="Competitive (Km App Increases)" />
                )}
                {showNoncomp && (
                  <Line type="monotone" dataKey="noncompetitive" stroke="#7C3AED" strokeWidth={2} dot={false} name="Noncompetitive (Vmax Decreases)" />
                )}
                {showUncomp && (
                  <Line type="monotone" dataKey="uncompetitive" stroke="#059669" strokeWidth={2} dot={false} name="Uncompetitive (Both Decrease)" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: ENZYME ACTIVITY VS pH */}
      {/* =================================================================== */}
      {activeChart === 'ph' && (
        <div className="bg-white p-6 rounded-xl border border-[#E5EAF1] shadow-card space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5EAF1] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#17365D]">Enzyme Catalytic Activity vs. Environmental pH</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                  Dixon-Webb Ionization Model
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Demonstrates how protonation/deprotonation of active-site catalytic residues determines the bell-shaped pH optimum.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
              SIMULATED IONIZATION PROFILE
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B]">Physiological Enzyme Presets:</span>
            {[
              { id: 'pepsin', label: 'Pepsin (Gastric, pH 2.0)' },
              { id: 'salivary_amylase', label: 'Salivary Amylase (pH 6.8)' },
              { id: 'trypsin', label: 'Trypsin (Intestinal, pH 7.8)' },
              { id: 'alkaline_phosphatase', label: 'ALP (Alkaline, pH 9.5)' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyPhPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedEnzymePreset === p.id
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172B4D] border border-[#E5EAF1]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* pKa Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E5EAF1]">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">pKa1 (Acidic Residue):</span>
                <span className="font-mono font-bold text-[#2563EB]">{pka1}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.1"
                value={pka1}
                onChange={(e) => {
                  setSelectedEnzymePreset('custom');
                  setPka1(Number(e.target.value));
                }}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">pKa2 (Basic Residue):</span>
                <span className="font-mono font-bold text-[#2563EB]">{pka2}</span>
              </div>
              <input
                type="range"
                min="4.0"
                max="12.0"
                step="0.1"
                value={pka2}
                onChange={(e) => {
                  setSelectedEnzymePreset('custom');
                  setPka2(Number(e.target.value));
                }}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-[#E5EAF1] rounded-lg">
              <div>
                <span className="text-[11px] text-[#64748B] block">Calculated Optimum</span>
                <span className="text-base font-bold font-mono text-[#15803D]">pH opt = {optimalPh}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] bg-[#ECFDF5] text-[#047857] font-semibold border border-[#A7F3D0]">
                Max Catalysis
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="h-72 w-full bg-white p-3 rounded-xl border border-[#E5EAF1]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={phData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                <defs>
                  <linearGradient id="phGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="ph"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'pH Units', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#172B4D' }}
                  domain={[1, 13]}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Relative Activity (%)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#172B4D' }}
                  domain={[0, 105]}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5EAF1', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val) => [`${val}%`, 'Relative Activity']}
                  labelFormatter={(lbl) => `pH: ${lbl}`}
                />
                <ReferenceArea x1={7.35} x2={7.45} fill="#15803D" fillOpacity={0.15} label={{ value: 'Normal Human Blood pH (7.35-7.45)', position: 'insideTop', fontSize: 10, fill: '#15803D' }} />
                <ReferenceLine x={optimalPh} stroke="#2563EB" strokeDasharray="4 4" label={{ value: `pH opt = ${optimalPh}`, position: 'top', fill: '#2563EB', fontSize: 10 }} />
                <Area type="monotone" dataKey="activity" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#phGradient)" name="Relative Activity" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: ENZYME ACTIVITY VS TEMPERATURE */}
      {/* =================================================================== */}
      {activeChart === 'temperature' && (
        <div className="bg-white p-6 rounded-xl border border-[#E5EAF1] shadow-card space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5EAF1] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#17365D]">Enzyme Catalytic Activity vs. Temperature</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                  Arrhenius Activation + Thermal Denaturation
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Illustrates kinetic acceleration ($Q_{10} \approx 2$) versus irreversible tertiary protein denaturation.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
              SIMULATED THERMAL KINETICS
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B]">Thermal Classes:</span>
            {[
              { id: 'human', label: 'Human Mesophilic (37°C)' },
              { id: 'taq', label: 'Taq Polymerase Thermophilic (75°C)' },
              { id: 'psychrophilic', label: 'Psychrophilic (Cold-Adapted, 18°C)' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => applyTempPreset(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTempPreset === t.id
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172B4D] border border-[#E5EAF1]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E5EAF1]">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Optimum Temp (T opt):</span>
                <span className="font-mono font-bold text-[#2563EB]">{tOpt}°C</span>
              </div>
              <input
                type="range"
                min="15"
                max="85"
                step="1"
                value={tOpt}
                onChange={(e) => {
                  setSelectedTempPreset('custom');
                  setTOpt(Number(e.target.value));
                }}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-[#172B4D]">Denaturation (T melt):</span>
                <span className="font-mono font-bold text-[#DC2626]">{tMelt}°C</span>
              </div>
              <input
                type="range"
                min="20"
                max="95"
                step="1"
                value={tMelt}
                onChange={(e) => {
                  setSelectedTempPreset('custom');
                  setTMelt(Number(e.target.value));
                }}
                className="w-full accent-[#DC2626] cursor-pointer"
              />
            </div>

            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs space-y-1">
              <span className="font-bold text-[#DC2626] block">Clinical Alert: Fever & Denaturation</span>
              <p className="text-[#991B1B] text-[11px] leading-tight">
                Temperatures &gt;41.5°C cause rapid conformational disruption of critical cerebral and cardiac enzymes.
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="h-72 w-full bg-white p-3 rounded-xl border border-[#E5EAF1]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={temperatureData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="temperature"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#172B4D' }}
                  domain={[0, 100]}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Relative Catalytic Rate (%)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#172B4D' }}
                  domain={[0, 105]}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5EAF1', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val) => [`${val}%`, 'Catalytic Rate']}
                  labelFormatter={(lbl) => `${lbl}°C`}
                />
                <ReferenceArea x1={36.5} x2={37.5} fill="#15803D" fillOpacity={0.15} label={{ value: 'Normal Body Temp (36.5-37.5°C)', position: 'insideTop', fontSize: 10, fill: '#15803D' }} />
                <ReferenceLine x={tOpt} stroke="#2563EB" strokeDasharray="4 4" label={{ value: `T opt = ${tOpt}°C`, position: 'top', fill: '#2563EB', fontSize: 10 }} />
                <ReferenceLine x={tMelt} stroke="#DC2626" strokeDasharray="3 3" label={{ value: `T melt = ${tMelt}°C`, position: 'top', fill: '#DC2626', fontSize: 10 }} />
                <Area type="monotone" dataKey="activity" stroke="#D97706" strokeWidth={2.5} fillOpacity={1} fill="url(#tempGradient)" name="Enzyme Activity" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: ACTUAL PATIENT BIOMARKER TRENDS */}
      {/* =================================================================== */}
      {activeChart === 'patient-trends' && (
        <div className="bg-white p-6 rounded-xl border border-[#E5EAF1] shadow-card space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5EAF1] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#17365D]">Longitudinal Patient Biomarker Trajectories</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                  EHR Audited Longitudinal Telemetry
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Displays genuine patient laboratory results over time plotted against physiological reference intervals.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
              ACTUAL CLINICAL MEASUREMENTS
            </span>
          </div>

          {/* Patient and Analyte Selection Toolbar */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E5EAF1]">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#2563EB]" />
              <label className="text-xs font-semibold text-[#172B4D]">Select Patient:</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="text-xs border border-[#E5EAF1] rounded-lg px-3 py-1.5 bg-white text-[#172B4D] font-semibold focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.mrn}) • {p.biological_sex}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-[#2563EB]" />
              <label className="text-xs font-semibold text-[#172B4D]">Biomarker / Analyte:</label>
              <select
                value={selectedAnalyte}
                onChange={(e) => setSelectedAnalyte(e.target.value)}
                className="text-xs font-mono font-semibold border border-[#E5EAF1] rounded-lg px-3 py-1.5 bg-white text-[#172B4D] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              >
                <option value="GLU">Glucose (GLU)</option>
                <option value="CREAT">Creatinine (CREAT)</option>
                <option value="K">Potassium (K)</option>
                <option value="NA">Sodium (NA)</option>
                <option value="ALT">Alanine Aminotransferase (ALT)</option>
                <option value="AST">Aspartate Aminotransferase (AST)</option>
                <option value="BUN">Blood Urea Nitrogen (BUN)</option>
                <option value="HBA1C">Glycated Hemoglobin (HbA1c)</option>
              </select>
            </div>

            {trendData?.reference_range && (
              <div className="text-xs text-[#64748B] flex items-center gap-2 ml-auto">
                <span className="font-semibold text-[#172B4D]">Normal Reference Interval:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-[#E5EAF1]">
                  {trendData.reference_range.lower_limit} – {trendData.reference_range.upper_limit} {trendData.unit}
                </span>
              </div>
            )}
          </div>

          {/* Real Patient Data Plot or Honest Empty State */}
          {loadingTrends ? (
            <div className="p-16 text-center text-xs text-[#2563EB] bg-[#F8FAFC] rounded-xl border border-[#E5EAF1]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <span>Querying patient laboratory database...</span>
            </div>
          ) : patientChartPoints.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E5EAF1] space-y-2">
              <Info className="w-8 h-8 text-[#94A3B8] mx-auto" />
              <div className="font-bold text-[#172B4D] text-sm">
                No Historical Measurements for {selectedAnalyte}
              </div>
              <p className="max-w-md mx-auto text-[#64748B] text-[11px] leading-relaxed">
                No longitudinal laboratory encounters exist for this patient and analyte combination in the database.
                In accordance with medical ethics and clinical safety, this system never fabricates or hallucinates patient results.
                To record genuine clinical findings, use the Manual Lab Entry or Patient Registry workflow.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-72 w-full bg-white p-3 rounded-xl border border-[#E5EAF1]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={patientChartPoints} margin={{ top: 15, right: 30, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      label={{ value: 'Collection Date', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#172B4D' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      label={{ value: `${selectedAnalyte} (${trendData?.unit || ''})`, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#172B4D' }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5EAF1', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any) => [`${val} ${trendData?.unit || ''}`, `${selectedAnalyte} Measured`]}
                      labelFormatter={(lbl) => `Date: ${lbl}`}
                    />
                    {trendData?.reference_range?.lower_limit !== undefined &&
                      trendData?.reference_range?.upper_limit !== undefined && (
                        <ReferenceArea
                          y1={trendData.reference_range.lower_limit}
                          y2={trendData.reference_range.upper_limit}
                          fill="#15803D"
                          fillOpacity={0.12}
                          label={{
                            value: `Ref Interval (${trendData.reference_range.lower_limit} - ${trendData.reference_range.upper_limit})`,
                            position: 'insideTopRight',
                            fontSize: 10,
                            fill: '#15803D'
                          }}
                        />
                      )}
                    {trendData?.reference_range?.critical_high && (
                      <ReferenceLine
                        y={trendData.reference_range.critical_high}
                        stroke="#DC2626"
                        strokeDasharray="4 4"
                        label={{ value: `Critical Panic High (${trendData.reference_range.critical_high})`, position: 'right', fill: '#DC2626', fontSize: 10 }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                      name="Observed Laboratory Level"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Observed Points Summary Table */}
              <div className="overflow-x-auto border border-[#E5EAF1] rounded-lg">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-[#F8FAFC] text-[#172B4D] font-sans font-semibold border-b border-[#E5EAF1]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Accession #</th>
                      <th className="py-2.5 px-3">Measured Level</th>
                      <th className="py-2.5 px-3">Reference Interval</th>
                      <th className="py-2.5 px-3">Clinical Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF1]">
                    {patientChartPoints.map((pt, i) => (
                      <tr key={i} className="hover:bg-[#F8FAFC]">
                        <td className="py-2 px-3 font-sans text-[#172B4D] font-medium">{pt.date}</td>
                        <td className="py-2 px-3 text-[#64748B]">{pt.accession}</td>
                        <td className="py-2 px-3 font-bold text-[#2563EB]">
                          {pt.value} {trendData?.unit}
                        </td>
                        <td className="py-2 px-3 text-[#64748B]">
                          {pt.lowerLimit !== undefined ? `${pt.lowerLimit} – ${pt.upperLimit}` : '—'}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pt.flag === 'HIGH' || pt.flag === 'CRITICAL_HIGH'
                                ? 'bg-[#FEF2F2] text-[#DC2626]'
                                : pt.flag === 'LOW' || pt.flag === 'CRITICAL_LOW'
                                ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                                : 'bg-[#F0FDF4] text-[#15803D]'
                            }`}
                          >
                            {pt.flag || 'NORMAL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScientificCharts;

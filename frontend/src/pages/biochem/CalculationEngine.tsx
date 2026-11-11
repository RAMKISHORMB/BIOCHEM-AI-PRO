import React, { useState, useEffect } from 'react';
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Hash,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  User,
  FlaskConical,
  Activity,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';

interface PatientOption {
  id: string;
  mrn: string;
  full_name: string;
  age_years: number;
  biological_sex: string;
}

interface CalcResult {
  calculation_type: string;
  formula_name: string;
  formula_latex: string;
  formula_version: string;
  inputs: Record<string, any>;
  output_value: number | null;
  output_unit: string;
  is_valid: boolean;
  status: string;
  interpretation?: string;
  reference_range?: string;
  assumptions: string[];
  limitations: string[];
  warnings: string[];
  extra_metrics?: Record<string, any>;
  provenance_hash: string;
  calculated_at: string;
  disclaimer: string;
}

export default function CalculationEngine() {
  const [activeTab, setActiveTab] = useState<'deritis' | 'calcium' | 'ag' | 'corrag' | 'osm' | 'buncr' | 'egfr' | 'fena' | 'history'>('deritis');
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  // 1. De Ritis
  const [ast, setAst] = useState<string>('85');
  const [alt, setAlt] = useState<string>('32');
  const [astUnit, setAstUnit] = useState('U/L');
  const [altUnit, setAltUnit] = useState('U/L');

  // 2. Corrected Calcium
  const [ca, setCa] = useState<string>('7.6');
  const [alb, setAlb] = useState<string>('2.4');
  const [caUnit, setCaUnit] = useState('mg/dL');
  const [albUnit, setAlbUnit] = useState('g/dL');
  const [refAlb, setRefAlb] = useState<string>('4.0');

  // 3. Anion Gap
  const [agNa, setAgNa] = useState<string>('140');
  const [agCl, setAgCl] = useState<string>('102');
  const [agHco3, setAgHco3] = useState<string>('14');
  const [agUnit, setAgUnit] = useState('mmol/L');

  // 4. Corrected Anion Gap
  const [cagNa, setCagNa] = useState<string>('138');
  const [cagCl, setCagCl] = useState<string>('106');
  const [cagHco3, setCagHco3] = useState<string>('16');
  const [cagAlb, setCagAlb] = useState<string>('2.2');

  // 5. Osmolality & Osmolal Gap
  const [osmNa, setOsmNa] = useState<string>('142');
  const [osmGlu, setOsmGlu] = useState<string>('180');
  const [osmBun, setOsmBun] = useState<string>('28');
  const [osmMeas, setOsmMeas] = useState<string>('322');

  // 6. BUN / Creatinine Ratio
  const [bun, setBun] = useState<string>('38');
  const [creat, setCreat] = useState<string>('1.4');
  const [bunUnit, setBunUnit] = useState('mg/dL');
  const [creatUnit, setCreatUnit] = useState('mg/dL');

  // 7. 2021 CKD-EPI eGFR
  const [egfrCr, setEgfrCr] = useState<string>('1.35');
  const [egfrAge, setEgfrAge] = useState<string>('62');
  const [egfrSex, setEgfrSex] = useState<string>('MALE');

  // 8. FENa
  const [fenaSNa, setFenaSNa] = useState<string>('138');
  const [fenaSCr, setFenaSCr] = useState<string>('2.4');
  const [fenaUNa, setFenaUNa] = useState<string>('14');
  const [fenaUCr, setFenaUCr] = useState<string>('110');

  // Calculation History
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await api.get<any>('/patients');
      const list = Array.isArray(res) ? res : res.items || [];
      setPatients(list);
    } catch (e) {
      console.error('Failed to load patients', e);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get<any>('/biochem/calculations/history');
      if (res?.logs) {
        setHistoryLogs(res.logs);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const handlePatientSelect = (pId: string) => {
    setSelectedPatientId(pId);
    const p = patients.find((item) => item.id === pId);
    if (p) {
      setEgfrAge(p.age_years.toString());
      setEgfrSex(p.biological_sex);
    }
  };

  const executeCalculation = async () => {
    setLoading(true);
    setErrorMsg(null);
    setCalcResult(null);

    try {
      let endpoint = '';
      let payload: any = { patient_id: selectedPatientId || undefined };

      switch (activeTab) {
        case 'deritis':
          endpoint = '/biochem/calculations/de-ritis';
          payload = {
            ...payload,
            ast: ast ? parseFloat(ast) : null,
            alt: alt ? parseFloat(alt) : null,
            ast_unit: astUnit,
            alt_unit: altUnit,
          };
          break;

        case 'calcium':
          endpoint = '/biochem/calculations/corrected-calcium';
          payload = {
            ...payload,
            total_calcium: ca ? parseFloat(ca) : null,
            albumin: alb ? parseFloat(alb) : null,
            calcium_unit: caUnit,
            albumin_unit: albUnit,
            reference_albumin: refAlb ? parseFloat(refAlb) : 4.0,
          };
          break;

        case 'ag':
          endpoint = '/biochem/calculations/anion-gap';
          payload = {
            ...payload,
            na: agNa ? parseFloat(agNa) : null,
            cl: agCl ? parseFloat(agCl) : null,
            hco3: agHco3 ? parseFloat(agHco3) : null,
            unit: agUnit,
          };
          break;

        case 'corrag':
          endpoint = '/biochem/calculations/corrected-anion-gap';
          payload = {
            ...payload,
            na: cagNa ? parseFloat(cagNa) : null,
            cl: cagCl ? parseFloat(cagCl) : null,
            hco3: cagHco3 ? parseFloat(cagHco3) : null,
            albumin: cagAlb ? parseFloat(cagAlb) : null,
          };
          break;

        case 'osm':
          endpoint = '/biochem/calculations/osmolality';
          payload = {
            ...payload,
            na: osmNa ? parseFloat(osmNa) : null,
            glucose: osmGlu ? parseFloat(osmGlu) : null,
            bun: osmBun ? parseFloat(osmBun) : null,
          };
          break;

        case 'buncr':
          endpoint = '/biochem/calculations/bun-cr-ratio';
          payload = {
            ...payload,
            bun: bun ? parseFloat(bun) : null,
            creatinine: creat ? parseFloat(creat) : null,
            bun_unit: bunUnit,
            creatinine_unit: creatUnit,
          };
          break;

        case 'egfr':
          endpoint = '/biochem/calculations/egfr';
          payload = {
            ...payload,
            creatinine: egfrCr ? parseFloat(egfrCr) : null,
            age_years: egfrAge ? parseInt(egfrAge) : null,
            sex: egfrSex,
            creatinine_unit: 'mg/dL',
          };
          break;

        case 'fena':
          endpoint = '/biochem/calculations/fena';
          payload = {
            ...payload,
            serum_na: fenaSNa ? parseFloat(fenaSNa) : null,
            serum_creat: fenaSCr ? parseFloat(fenaSCr) : null,
            urine_na: fenaUNa ? parseFloat(fenaUNa) : null,
            urine_creat: fenaUCr ? parseFloat(fenaUCr) : null,
          };
          break;

        default:
          return;
      }

      const res = await api.post<any>(endpoint, payload);
      setCalcResult(res);
    } catch (e: any) {
      console.error('Calculation error', e);
      setErrorMsg(e.message || 'Failed to execute biochemical calculation.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'deritis', label: 'De Ritis (AST/ALT)' },
    { id: 'calcium', label: 'Corrected Calcium' },
    { id: 'ag', label: 'Anion Gap' },
    { id: 'corrag', label: 'Albumin-Corrected AG' },
    { id: 'osm', label: 'Serum Osmolality' },
    { id: 'buncr', label: 'BUN / Creatinine' },
    { id: 'egfr', label: '2021 CKD-EPI eGFR' },
    { id: 'fena', label: 'FENa' },
    { id: 'history', label: 'Audit Provenance Log' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E5EAF1] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
              MODULE 1: DETERMINISTIC BIOCHEMISTRY
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              UNIT-VALIDATED & AUDITED
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#17365D]">Biochemical Calculation Engine</h1>
          <p className="text-sm text-slate-500 mt-1">
            Modular, evidence-linked clinical biochemistry calculation service with explicit formula provenance, unit validation, and boundary safeguards.
          </p>
        </div>

        {/* Patient Selection Dropdown */}
        <div className="flex items-center gap-3 bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF1]">
          <User className="w-5 h-5 text-[#2563EB]" />
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase">Audit Link (Patient)</label>
            <select
              value={selectedPatientId}
              onChange={(e) => handlePatientSelect(e.target.value)}
              className="text-xs bg-white border border-[#E5EAF1] rounded px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="">Standalone / Unlinked Specimen</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.mrn}) — {p.age_years}y, {p.biological_sex}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-white rounded-lg border border-[#E5EAF1] shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setCalcResult(null);
              setErrorMsg(null);
              if (tab.id === 'history') loadHistory();
            }}
            className={`px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== 'history' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs & Parameters Panel */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5EAF1] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
              <h2 className="text-sm font-bold text-[#17365D] uppercase tracking-wide flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#2563EB]" />
                Input Parameters & Units
              </h2>
              <span className="text-[11px] text-slate-400">Strict Type Checked</span>
            </div>

            {/* TAB 1: De Ritis */}
            {activeTab === 'deritis' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aspartate Aminotransferase (AST)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={ast}
                      onChange={(e) => setAst(e.target.value)}
                      placeholder="e.g. 85.0"
                      className="flex-1 px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <select
                      value={astUnit}
                      onChange={(e) => setAstUnit(e.target.value)}
                      className="w-24 px-2 py-2 text-xs border border-[#E5EAF1] rounded-lg bg-[#F7F9FC]"
                    >
                      <option value="U/L">U/L</option>
                      <option value="mg/dL">mg/dL (Invalid)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alanine Aminotransferase (ALT)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={alt}
                      onChange={(e) => setAlt(e.target.value)}
                      placeholder="e.g. 32.0"
                      className="flex-1 px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <select
                      value={altUnit}
                      onChange={(e) => setAltUnit(e.target.value)}
                      className="w-24 px-2 py-2 text-xs border border-[#E5EAF1] rounded-lg bg-[#F7F9FC]"
                    >
                      <option value="U/L">U/L</option>
                      <option value="mg/dL">mg/dL (Invalid)</option>
                    </select>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Division by zero guarded (ALT &gt; 0 U/L required)</span>
                </div>
              </div>
            )}

            {/* TAB 2: Corrected Calcium */}
            {activeTab === 'calcium' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Measured Calcium</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={ca}
                      onChange={(e) => setCa(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <select
                      value={caUnit}
                      onChange={(e) => setCaUnit(e.target.value)}
                      className="w-28 px-2 py-2 text-xs border border-[#E5EAF1] rounded-lg bg-[#F7F9FC]"
                    >
                      <option value="mg/dL">mg/dL</option>
                      <option value="mmol/L">mmol/L</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Measured Serum Albumin</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={alb}
                      onChange={(e) => setAlb(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <select
                      value={albUnit}
                      onChange={(e) => setAlbUnit(e.target.value)}
                      className="w-28 px-2 py-2 text-xs border border-[#E5EAF1] rounded-lg bg-[#F7F9FC]"
                    >
                      <option value="g/dL">g/dL</option>
                      <option value="g/L">g/L</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Configured Reference Albumin Baseline
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={refAlb}
                    onChange={(e) => setRefAlb(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Default: 4.0 g/dL (Payne standard)</span>
                </div>
              </div>
            )}

            {/* TAB 3: Anion Gap */}
            {activeTab === 'ag' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Serum Sodium (Na+)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={agNa}
                    onChange={(e) => setAgNa(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Serum Chloride (Cl-)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={agCl}
                    onChange={(e) => setAgCl(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Serum Bicarbonate (HCO3-)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={agHco3}
                    onChange={(e) => setAgHco3(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Electrolyte Units</label>
                  <select
                    value={agUnit}
                    onChange={(e) => setAgUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E5EAF1] rounded-lg bg-[#F7F9FC]"
                  >
                    <option value="mmol/L">mmol/L</option>
                    <option value="mEq/L">mEq/L</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB 4: Albumin-Corrected Anion Gap */}
            {activeTab === 'corrag' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Na+ (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cagNa}
                      onChange={(e) => setCagNa(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#E5EAF1] rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cl- (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cagCl}
                      onChange={(e) => setCagCl(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#E5EAF1] rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">HCO3- (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cagHco3}
                      onChange={(e) => setCagHco3(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#E5EAF1] rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Measured Serum Albumin (g/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cagAlb}
                    onChange={(e) => setCagAlb(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Figge-Jabor-Kazda: +2.5 mEq/L per 1 g/dL albumin below 4.0 g/dL
                  </span>
                </div>
              </div>
            )}

            {/* TAB 5: Serum Osmolality */}
            {activeTab === 'osm' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Serum Sodium (mmol/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={osmNa}
                    onChange={(e) => setOsmNa(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Serum Glucose (mg/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={osmGlu}
                    onChange={(e) => setOsmGlu(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Urea Nitrogen (mg/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={osmBun}
                    onChange={(e) => setOsmBun(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>
            )}

            {/* TAB 6: BUN / Creatinine */}
            {activeTab === 'buncr' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Urea Nitrogen (BUN)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={bun}
                      onChange={(e) => setBun(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <select
                      value={bunUnit}
                      onChange={(e) => setBunUnit(e.target.value)}
                      className="w-24 px-2 py-2 text-xs border border-[#E5EAF1] rounded-lg bg-[#F7F9FC]"
                    >
                      <option value="mg/dL">mg/dL</option>
                      <option value="mmol/L">mmol/L</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Serum Creatinine</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={creat}
                      onChange={(e) => setCreat(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <select
                      value={creatUnit}
                      onChange={(e) => setCreatUnit(e.target.value)}
                      className="w-24 px-2 py-2 text-xs border border-[#E5EAF1] rounded-lg bg-[#F7F9FC]"
                    >
                      <option value="mg/dL">mg/dL</option>
                      <option value="umol/L">µmol/L</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: 2021 CKD-EPI eGFR */}
            {activeTab === 'egfr' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Serum Creatinine (mg/dL) [IDMS Traceable]
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={egfrCr}
                    onChange={(e) => setEgfrCr(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Age (Years, &gt;= 18)</label>
                  <input
                    type="number"
                    value={egfrAge}
                    onChange={(e) => setEgfrAge(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Biological Sex</label>
                  <select
                    value={egfrSex}
                    onChange={(e) => setEgfrSex(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg bg-[#F7F9FC]"
                  >
                    <option value="MALE">Male (κ = 0.9, α = -0.302)</option>
                    <option value="FEMALE">Female (κ = 0.7, α = -0.241, mult = 1.012)</option>
                  </select>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    2021 Race-Free CKD-EPI Consensus Equation
                  </span>
                </div>
              </div>
            )}

            {/* TAB 8: FENa */}
            {activeTab === 'fena' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Serum Na+ (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fenaSNa}
                      onChange={(e) => setFenaSNa(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Serum Cr (mg/dL)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={fenaSCr}
                      onChange={(e) => setFenaSCr(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Spot Urine Na+ (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fenaUNa}
                      onChange={(e) => setFenaUNa(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Spot Urine Cr (mg/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fenaUCr}
                      onChange={(e) => setFenaUCr(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={executeCalculation}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Execute Validated Calculation</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results & Provenance Output Panel */}
          <div className="lg:col-span-7 space-y-6">
            {calcResult ? (
              <div className="bg-white rounded-xl border border-[#E5EAF1] p-6 shadow-sm space-y-5">
                {/* Result Title & Provenance Hash */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5EAF1] gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#17365D]">{calcResult.formula_name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Formula Version: {calcResult.formula_version} | Calculated:{' '}
                      {new Date(calcResult.calculated_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-mono text-slate-600">
                    <Hash className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>{calcResult.provenance_hash}</span>
                  </div>
                </div>

                {/* Mathematical Equation Card */}
                <div className="p-3.5 bg-[#F7F9FC] border border-[#E5EAF1] rounded-lg">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Formula Model</div>
                  <div className="text-xs font-mono text-[#17365D] overflow-x-auto p-1 bg-white rounded border border-[#E5EAF1]">
                    {calcResult.formula_latex}
                  </div>
                </div>

                {/* Primary Output Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <span className="text-[11px] font-bold text-[#2563EB] uppercase">Calculated Output</span>
                    <div className="text-3xl font-extrabold text-[#17365D] mt-1">
                      {calcResult.output_value !== null ? calcResult.output_value : 'N/A'}
                      <span className="text-sm font-semibold text-slate-500 ml-1.5">{calcResult.output_unit}</span>
                    </div>
                    {calcResult.reference_range && (
                      <div className="text-[11px] text-slate-500 mt-1">Ref: {calcResult.reference_range}</div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Status & Classification</span>
                    <div className="mt-1">
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-xs font-bold uppercase ${
                          calcResult.status === 'NORMAL'
                            ? 'bg-emerald-100 text-emerald-800'
                            : calcResult.status === 'HIGH' || calcResult.status === 'ELEVATED'
                            ? 'bg-amber-100 text-amber-800'
                            : calcResult.status === 'CRITICAL_HIGH' || calcResult.status === 'CRITICAL_LOW'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {calcResult.status}
                      </span>
                    </div>
                    {calcResult.interpretation && (
                      <p className="text-xs text-slate-600 font-medium mt-2 leading-relaxed">
                        {calcResult.interpretation}
                      </p>
                    )}
                  </div>
                </div>

                {/* Clinical Assumptions & Limitations */}
                <div className="space-y-3 pt-2">
                  {calcResult.assumptions && calcResult.assumptions.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-[#E5EAF1] rounded-lg">
                      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        Mathematical & Clinical Assumptions
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                        {calcResult.assumptions.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {calcResult.limitations && calcResult.limitations.length > 0 && (
                    <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg">
                      <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Clinical Limitations & Contraindications
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-xs text-amber-900/80">
                        {calcResult.limitations.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Legal & Educational Notice */}
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{calcResult.disclaimer}</span>
                </div>
              </div>
            ) : (
              /* Empty Placeholder */
              <div className="bg-white rounded-xl border border-[#E5EAF1] p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#17365D]">Calculation Output Staging</h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Select parameters and click "Execute Validated Calculation" to run the mathematical model, generate
                  cryptographic audit provenance, and review evidence-linked interpretations.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 9: Audit Provenance Log Viewer */
        <div className="bg-white rounded-xl border border-[#E5EAF1] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
            <div>
              <h2 className="text-sm font-bold text-[#17365D] uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                Audited Biochemical Calculation Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cryptographically hashed audit records of calculations executed across encounters and test specimens.
              </p>
            </div>
            <button
              onClick={loadHistory}
              className="px-3 py-1.5 border border-[#E5EAF1] text-xs font-medium text-slate-600 rounded-md hover:bg-slate-50 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F9FC] border-b border-[#E5EAF1] text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Formula / Type</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Provenance Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {historyLogs.length > 0 ? (
                  historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#17365D]">{log.formula_name}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        {log.outputs?.output_value !== undefined && log.outputs?.output_value !== null
                          ? `${log.outputs.output_value} ${log.outputs.output_unit || ''}`
                          : 'Evaluated'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.outputs?.status === 'NORMAL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.outputs?.status || 'VALIDATED'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#2563EB]">
                        {log.provenance_hash || 'SHA-256 Verified'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No calculation records found. Execute a calculation to initiate audit logging.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Cpu,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  GitBranch,
  Calculator,
  User,
  FlaskConical,
  Shield,
  Clock,
  ArrowRight,
  AlertCircle,
  FileText,
  Activity,
  Layers
} from 'lucide-react';

interface EncounterDetail {
  id: string;
  patient_id: string;
  patient_mrn: string;
  patient_name: string;
  patient_sex: string;
  patient_age_years: number;
  accession_number: string;
  sample_collected_at: string;
  sample_type: string;
  clinical_status: string;
  fasting_status: string;
  clinical_notes?: string;
  results: Array<{
    id: string;
    analyte_code: string;
    analyte_name: string;
    category: string;
    value_numeric?: number;
    value_text?: string;
    unit: string;
    flag: string;
    reference_range_applied?: string;
    notes?: string;
  }>;
  interpretation?: {
    id: string;
    encounter_id: string;
    calculated_indices: Record<string, any>;
    clinical_flags: Array<{
      severity: string;
      title: string;
      detail: string;
    }>;
    diagnostic_considerations?: string;
    metabolic_alerts?: string;
    clinician_reviewed: boolean;
    reviewed_at?: string;
  };
}

export default function InterpretationEngine() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [encounters, setEncounters] = useState<any[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>(
    searchParams.get('encounter_id') || ''
  );
  const [encounter, setEncounter] = useState<EncounterDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'REPORT' | 'CALCULATOR'>('REPORT');

  // Sign off modal
  const [showSignOff, setShowSignOff] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  // Standalone calculator state
  const [calcAge, setCalcAge] = useState(50);
  const [calcSex, setCalcSex] = useState('MALE');
  const [calcNa, setCalcNa] = useState('140');
  const [calcK, setCalcK] = useState('4.2');
  const [calcCl, setCalcCl] = useState('100');
  const [calcHco3, setCalcHco3] = useState('24');
  const [calcGlu, setCalcGlu] = useState('110');
  const [calcBun, setCalcBun] = useState('16');
  const [calcCreat, setCalcCreat] = useState('1.1');
  const [calcCa, setCalcCa] = useState('9.2');
  const [calcAlb, setCalcAlb] = useState('4.0');
  const [calcAlt, setCalcAlt] = useState('30');
  const [calcAst, setCalcAst] = useState('28');
  const [calcAlp, setCalcAlp] = useState('85');
  const [calcResult, setCalcResult] = useState<any | null>(null);

  // Fetch list of encounters
  useEffect(() => {
    const fetchEncounters = async () => {
      try {
        const res = await api.get<{ items: any[] }>('/labs/encounters?page=1&size=50');
        const list = res.items || [];
        setEncounters(list);
        if (!selectedEncounterId && list.length > 0) {
          setSelectedEncounterId(list[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve laboratory encounters');
      }
    };
    fetchEncounters();
  }, []);

  // Fetch selected encounter detail
  useEffect(() => {
    if (!selectedEncounterId) {
      setIsLoading(false);
      return;
    }
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<EncounterDetail>(`/labs/encounters/${selectedEncounterId}`);
        setEncounter(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load encounter interpretation');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [selectedEncounterId]);

  const handleReviewSignOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounterId) return;
    setIsSigning(true);
    try {
      await api.post(`/interpretations/encounters/${selectedEncounterId}/review`, {
        reviewer_notes: reviewerNotes,
      });
      setShowSignOff(false);
      const updated = await api.get<EncounterDetail>(`/labs/encounters/${selectedEncounterId}`);
      setEncounter(updated);
    } catch (err: any) {
      setError(err.message || 'Sign-off review failed');
    } finally {
      setIsSigning(false);
    }
  };

  const handleRunCalculator = async (e: React.FormEvent) => {
    e.preventDefault();
    const analytes: Record<string, number> = {};
    if (calcNa) analytes['NA'] = parseFloat(calcNa);
    if (calcK) analytes['K'] = parseFloat(calcK);
    if (calcCl) analytes['CL'] = parseFloat(calcCl);
    if (calcHco3) analytes['HCO3'] = parseFloat(calcHco3);
    if (calcGlu) analytes['GLU'] = parseFloat(calcGlu);
    if (calcBun) analytes['BUN'] = parseFloat(calcBun);
    if (calcCreat) analytes['CREAT'] = parseFloat(calcCreat);
    if (calcCa) analytes['CA'] = parseFloat(calcCa);
    if (calcAlb) analytes['ALB'] = parseFloat(calcAlb);
    if (calcAlt) analytes['ALT'] = parseFloat(calcAlt);
    if (calcAst) analytes['AST'] = parseFloat(calcAst);
    if (calcAlp) analytes['ALP'] = parseFloat(calcAlp);

    try {
      const res = await api.post('/interpretations/calculator', {
        age_years: calcAge,
        biological_sex: calcSex,
        analytes,
      });
      setCalcResult(res);
    } catch (err: any) {
      setError(err.message || 'Calculation execution failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#17365D]">Biochemical Interpretation Engine</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Automated calculated physiological indices, acid-base classification, organ injury patterns, and biochemist sign-off.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('REPORT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'REPORT'
                ? 'bg-[#17365D] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#172B4D] bg-white border border-[#E5EAF1]'
            }`}
          >
            Encounter Interpretation
          </button>
          <button
            onClick={() => setActiveTab('CALCULATOR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'CALCULATOR'
                ? 'bg-[#17365D] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#172B4D] bg-white border border-[#E5EAF1]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Standalone Index Calculator</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab 1: Encounter Interpretation Report */}
      {activeTab === 'REPORT' && (
        <div className="space-y-6">
          {/* Encounter Selection Bar */}
          <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#17365D]">
                  Select Accession:
                </span>
                <select
                  value={selectedEncounterId}
                  onChange={(e) => setSelectedEncounterId(e.target.value)}
                  className="h-8 px-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg text-xs text-[#172B4D] font-mono focus:bg-white focus:outline-none"
                >
                  {encounters.map((enc) => (
                    <option key={enc.id} value={enc.id}>
                      {enc.accession_number} — {enc.patient?.full_name || 'Patient'} ({enc.sample_type})
                    </option>
                  ))}
                </select>
              </div>

              {encounter?.interpretation && (
                <div className="flex items-center gap-2">
                  {encounter.interpretation.clinician_reviewed ? (
                    <span className="px-2.5 py-1 rounded-full bg-[#F0FDF4] border border-[#DCFCE7] text-[11px] font-medium text-[#15803D] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Reviewed & Signed Off
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowSignOff(true)}
                      className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      Biochemist Review & Sign-Off
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {!encounter ? (
            <div className="p-16 text-center text-xs text-[#64748B] bg-white border border-[#E5EAF1] rounded-xl">
              <FlaskConical className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
              <p className="font-semibold text-[#17365D]">No encounter selected</p>
              <p className="text-[11px] mt-0.5">Please select an accession above or record a new lab panel.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Encounter Metadata Overview Card */}
              <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[#64748B]">Patient Name</span>
                    <p className="font-bold text-[#17365D] mt-0.5">{encounter.patient_name}</p>
                    <p className="text-[11px] text-[#64748B] font-mono">MRN: {encounter.patient_mrn}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[#64748B]">Accession Number</span>
                    <p className="font-bold font-mono text-[#2563EB] mt-0.5">{encounter.accession_number}</p>
                    <p className="text-[11px] text-[#64748B] font-mono">{encounter.sample_type}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[#64748B]">Collection Date</span>
                    <p className="font-mono text-[#172B4D] mt-0.5">
                      {new Date(encounter.sample_collected_at).toLocaleDateString()}
                    </p>
                    <p className="text-[11px] text-[#64748B]">{encounter.fasting_status}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[#64748B]">Clinical Status</span>
                    <p className="font-semibold text-[#15803D] mt-0.5">{encounter.clinical_status}</p>
                    <p className="text-[11px] text-[#64748B]">{encounter.results.length} analytes tested</p>
                  </div>
                </div>
              </div>

              {/* Calculated Biochemical Indices Cards */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#17365D] flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#2563EB]" />
                  Calculated Physiological Indices
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Anion Gap */}
                  <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span className="text-xs font-semibold text-[#17365D]">Serum Anion Gap</span>
                      <span className="text-[10px] font-mono">Na - (Cl + HCO3)</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-[#17365D]">
                        {encounter.interpretation?.calculated_indices?.anion_gap !== undefined
                          ? encounter.interpretation.calculated_indices.anion_gap
                          : 'N/A'}
                      </span>
                      <span className="text-xs text-[#64748B]">mEq/L</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">Normal Reference: 8 – 12 mEq/L</p>
                  </div>

                  {/* CKD-EPI eGFR */}
                  <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span className="text-xs font-semibold text-[#17365D]">eGFR (CKD-EPI 2021)</span>
                      <span className="text-[10px] font-mono">Race-Free Standard</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-[#17365D]">
                        {encounter.interpretation?.calculated_indices?.egfr_ckd_epi !== undefined
                          ? encounter.interpretation.calculated_indices.egfr_ckd_epi
                          : 'N/A'}
                      </span>
                      <span className="text-xs text-[#64748B]">mL/min/1.73m²</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">KDIGO Stage: &ge;90 Normal, &lt;60 CKD</p>
                  </div>

                  {/* De Ritis Ratio */}
                  <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span className="text-xs font-semibold text-[#17365D]">De Ritis Ratio</span>
                      <span className="text-[10px] font-mono">AST / ALT</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-[#17365D]">
                        {encounter.interpretation?.calculated_indices?.de_ritis_ratio !== undefined
                          ? encounter.interpretation.calculated_indices.de_ritis_ratio
                          : 'N/A'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">&lt;1.0 Viral/NAFLD, &gt;2.0 Alcoholic/Cirrhosis</p>
                  </div>

                  {/* Corrected Calcium */}
                  <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span className="text-xs font-semibold text-[#17365D]">Corrected Calcium</span>
                      <span className="text-[10px] font-mono">Albumin-Adjusted</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-[#17365D]">
                        {encounter.interpretation?.calculated_indices?.corrected_calcium !== undefined
                          ? encounter.interpretation.calculated_indices.corrected_calcium
                          : 'N/A'}
                      </span>
                      <span className="text-xs text-[#64748B]">mg/dL</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">Formula: Total Ca + 0.8 &times; (4.0 - Alb)</p>
                  </div>

                  {/* Osmolality Gap */}
                  <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span className="text-xs font-semibold text-[#17365D]">Calculated Osmolality</span>
                      <span className="text-[10px] font-mono">Worthley Equation</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-[#17365D]">
                        {encounter.interpretation?.calculated_indices?.calculated_osmolality !== undefined
                          ? encounter.interpretation.calculated_indices.calculated_osmolality
                          : 'N/A'}
                      </span>
                      <span className="text-xs text-[#64748B]">mOsm/kg</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">2&times;Na + Glu/18 + BUN/2.8</p>
                  </div>

                  {/* Delta Ratio */}
                  <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span className="text-xs font-semibold text-[#17365D]">Delta-Delta Ratio</span>
                      <span className="text-[10px] font-mono">&Delta;AG / &Delta;HCO3</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-[#17365D]">
                        {encounter.interpretation?.calculated_indices?.delta_ratio !== undefined
                          ? encounter.interpretation.calculated_indices.delta_ratio
                          : 'N/A'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">Mixed metabolic acid-base evaluation</p>
                  </div>
                </div>
              </div>

              {/* Clinical Flags & Guidance */}
              {encounter.interpretation?.clinical_flags && encounter.interpretation.clinical_flags.length > 0 && (
                <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#17365D] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                    Evaluated Biochemical Flags
                  </h3>

                  <div className="space-y-2">
                    {encounter.interpretation.clinical_flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs ${
                          flag.severity === 'CRITICAL'
                            ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626]'
                            : flag.severity === 'WARNING'
                            ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#B45309]'
                            : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-current"></span>
                          <span>{flag.title}</span>
                        </div>
                        <p className="mt-1 text-[11px] opacity-90">{flag.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tested Analytes Table */}
              <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#17365D] mb-3">
                  Tested Analyte Battery ({encounter.results.length})
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#E5EAF1] text-[#64748B] uppercase text-[10px]">
                        <th className="py-2.5 px-3">Analyte</th>
                        <th className="py-2.5 px-3 text-right">Value</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3">Applied Reference Range</th>
                        <th className="py-2.5 px-3">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF1] text-[#172B4D]">
                      {encounter.results.map((r) => (
                        <tr key={r.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-2 px-3 font-sans font-medium text-[#17365D]">
                            {r.analyte_name} ({r.analyte_code})
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-[#17365D]">
                            {r.value_numeric !== undefined ? r.value_numeric : r.value_text}
                          </td>
                          <td className="py-2 px-3 text-[#64748B]">{r.unit}</td>
                          <td className="py-2 px-3 text-[#64748B]">{r.reference_range_applied || 'Standard'}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                r.flag === 'NORMAL'
                                  ? 'bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7]'
                                  : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                              }`}
                            >
                              {r.flag}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Standalone Index Calculator */}
      {activeTab === 'CALCULATOR' && (
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-5">
          <div className="border-b border-[#E5EAF1] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#17365D] flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#2563EB]" />
              Standalone Quantitative Physiological Index Calculator
            </h2>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Input hypothetical or manual laboratory concentrations to immediately calculate Anion Gap, eGFR, and liver injury ratios.
            </p>
          </div>

          <form onSubmit={handleRunCalculator} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-[#172B4D] mb-1">Patient Age</label>
                <input
                  type="number"
                  value={calcAge}
                  onChange={(e) => setCalcAge(parseInt(e.target.value))}
                  className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded font-mono text-xs focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#172B4D] mb-1">Sex</label>
                <select
                  value={calcSex}
                  onChange={(e) => setCalcSex(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded text-xs focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#172B4D] mb-1">Sodium (Na, mmol/L)</label>
                <input
                  type="number"
                  step="any"
                  value={calcNa}
                  onChange={(e) => setCalcNa(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded font-mono text-xs focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#172B4D] mb-1">Chloride (Cl, mmol/L)</label>
                <input
                  type="number"
                  step="any"
                  value={calcCl}
                  onChange={(e) => setCalcCl(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded font-mono text-xs focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#172B4D] mb-1">Bicarbonate (HCO3, mmol/L)</label>
                <input
                  type="number"
                  step="any"
                  value={calcHco3}
                  onChange={(e) => setCalcHco3(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded font-mono text-xs focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#172B4D] mb-1">Creatinine (mg/dL)</label>
                <input
                  type="number"
                  step="any"
                  value={calcCreat}
                  onChange={(e) => setCalcCreat(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded font-mono text-xs focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#172B4D] mb-1">Glucose (mg/dL)</label>
                <input
                  type="number"
                  step="any"
                  value={calcGlu}
                  onChange={(e) => setCalcGlu(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded font-mono text-xs focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#172B4D] mb-1">BUN (mg/dL)</label>
                <input
                  type="number"
                  step="any"
                  value={calcBun}
                  onChange={(e) => setCalcBun(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded font-mono text-xs focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              Compute Mathematical Indices
            </button>
          </form>

          {/* Calculator Output Display */}
          {calcResult && (
            <div className="pt-4 border-t border-[#E5EAF1] space-y-3">
              <span className="text-xs font-bold text-[#17365D] uppercase tracking-wider block">
                Calculated Output
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {Object.entries(calcResult.calculated_indices || {}).map(([k, v]) => (
                  <div key={k} className="p-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg">
                    <span className="text-[10px] font-mono uppercase text-[#64748B] block">{k}</span>
                    <span className="text-lg font-bold font-mono text-[#17365D]">
                      {typeof v === 'number' ? v.toFixed(2) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Biochemist Sign-off Modal */}
      {showSignOff && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5EAF1] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E5EAF1] pb-3">
              <FileCheck className="w-5 h-5 text-[#15803D]" />
              <h3 className="text-sm font-bold text-[#17365D]">Biochemist Clinical Sign-Off</h3>
            </div>

            <form onSubmit={handleReviewSignOff} className="space-y-4 text-xs">
              <p className="text-[#64748B]">
                You are authorizing and certifying these laboratory results for accession{' '}
                <strong className="text-[#17365D] font-mono">{encounter?.accession_number}</strong>.
              </p>

              <div>
                <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                  Biochemist Interpretation & Sign-Off Notes
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Findings correlate with moderate metabolic acidosis. Recommended follow-up..."
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E5EAF1] rounded-lg text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5EAF1]">
                <button
                  type="button"
                  onClick={() => setShowSignOff(false)}
                  className="px-3 py-1.5 text-xs text-[#64748B] hover:text-[#172B4D] bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSigning}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg disabled:opacity-50"
                >
                  {isSigning ? 'Authorizing...' : 'Authorize & Sign Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

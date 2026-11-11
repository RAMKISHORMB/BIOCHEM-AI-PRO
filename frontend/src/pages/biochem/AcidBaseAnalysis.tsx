import React, { useState } from 'react';
import {
  Gauge,
  Activity,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Info,
  Sparkles,
  RotateCcw,
  BookOpen,
  Layers,
  Thermometer
} from 'lucide-react';
import { api } from '../../services/api';

export default function AcidBaseAnalysis() {
  const [ph, setPh] = useState<string>('7.18');
  const [paco2, setPaco2] = useState<string>('18.0');
  const [hco3, setHco3] = useState<string>('7.0');
  const [na, setNa] = useState<string>('135.0');
  const [cl, setCl] = useState<string>('98.0');
  const [albumin, setAlbumin] = useState<string>('4.0');
  const [bicarbonateSource, setBicarbonateSource] = useState<string>('CALCULATED_ABG');

  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presets = [
    {
      name: 'Severe DKA (Pure HAGMA)',
      ph: '7.18',
      paco2: '18.0',
      hco3: '7.0',
      na: '135.0',
      cl: '98.0',
      alb: '4.0',
      desc: 'Adequate Winter respiratory compensation; Delta ratio ~ 1.0 (pure ketoacid accumulation).',
    },
    {
      name: 'DKA + Acute Hypoventilation (Mixed Acidosis)',
      ph: '7.08',
      paco2: '34.0',
      hco3: '8.0',
      na: '136.0',
      cl: '96.0',
      alb: '3.8',
      desc: 'PaCO2 exceeds Winter expected upper bound, revealing respiratory failure complicating metabolic acidosis.',
    },
    {
      name: 'Severe COPD (Compensated Respiratory Acidosis)',
      ph: '7.34',
      paco2: '65.0',
      hco3: '34.0',
      na: '140.0',
      cl: '95.0',
      alb: '4.0',
      desc: 'Near-normal pH with chronic renal tubular bicarbonate retention.',
    },
    {
      name: 'Severe Emesis (Metabolic Alkalosis)',
      ph: '7.52',
      paco2: '48.0',
      hco3: '38.0',
      na: '138.0',
      cl: '88.0',
      alb: '4.2',
      desc: 'Hypochloremic alkalosis with hypoventilatory respiratory compensation.',
    },
    {
      name: 'Salicylate Poisoning (HAGMA + Resp Alkalosis)',
      ph: '7.44',
      paco2: '20.0',
      hco3: '13.0',
      na: '140.0',
      cl: '102.0',
      alb: '4.0',
      desc: 'Direct medullary respiratory stimulation causing primary respiratory alkalosis alongside metabolic organic acidosis.',
    },
  ];

  const applyPreset = (preset: (typeof presets)[0]) => {
    setPh(preset.ph);
    setPaco2(preset.paco2);
    setHco3(preset.hco3);
    setNa(preset.na);
    setCl(preset.cl);
    setAlbumin(preset.alb);
    setAnalysisResult(null);
  };

  const handleEvaluate = async () => {
    setLoading(true);
    setErrorMsg(null);
    setAnalysisResult(null);

    try {
      const payload = {
        ph: ph ? parseFloat(ph) : null,
        paco2: paco2 ? parseFloat(paco2) : null,
        hco3: hco3 ? parseFloat(hco3) : null,
        na: na ? parseFloat(na) : null,
        cl: cl ? parseFloat(cl) : null,
        albumin: albumin ? parseFloat(albumin) : null,
        bicarbonate_source: bicarbonateSource,
      };

      const res = await api.post<any>('/biochem/calculations/acid-base', payload);
      setAnalysisResult(res);
    } catch (e: any) {
      console.error('Acid-base calculation failed', e);
      setErrorMsg(e.message || 'Failed to complete acid-base assessment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#E5EAF1] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
                MODULE 2: CLINICAL ACID-BASE
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                HENDERSON-HASSELBALCH & WINTER'S
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#17365D]">Structured Acid–Base Assessment Suite</h1>
            <p className="text-sm text-slate-500 mt-1">
              Systematic evaluation of arterial blood gas, expected respiratory/metabolic compensation, unmeasured anion
              pools, and delta ratios.
            </p>
          </div>
        </div>

        {/* Clinical Presets */}
        <div className="mt-4 pt-4 border-t border-[#E5EAF1]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Load Clinical Reference Scenarios:
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((pr, idx) => (
              <button
                key={idx}
                onClick={() => applyPreset(pr)}
                className="px-3 py-1.5 rounded-lg border border-[#E5EAF1] hover:border-[#2563EB]/40 bg-[#F7F9FC] hover:bg-blue-50/50 text-xs text-slate-700 font-medium transition-all text-left"
              >
                {pr.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Panel */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5EAF1] p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[#17365D] uppercase tracking-wide flex items-center gap-2 pb-3 border-b border-[#E5EAF1]">
            <Gauge className="w-4 h-4 text-[#2563EB]" />
            Blood Gas & Electrolyte Inputs
          </h2>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">Arterial pH</label>
                <span className="text-[11px] text-slate-400 font-mono">Ref: 7.35 - 7.45</span>
              </div>
              <input
                type="number"
                step="0.01"
                value={ph}
                onChange={(e) => setPh(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">PaCO2 (Arterial Carbon Dioxide)</label>
                <span className="text-[11px] text-slate-400 font-mono">Ref: 35.0 - 45.0 mmHg</span>
              </div>
              <input
                type="number"
                step="0.1"
                value={paco2}
                onChange={(e) => setPaco2(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">Bicarbonate (HCO3-)</label>
                <span className="text-[11px] text-slate-400 font-mono">Ref: 22.0 - 26.0 mmol/L</span>
              </div>
              <input
                type="number"
                step="0.1"
                value={hco3}
                onChange={(e) => setHco3(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            {/* Bicarbonate Source Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bicarbonate Provenance</label>
              <select
                value={bicarbonateSource}
                onChange={(e) => setBicarbonateSource(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E5EAF1] rounded-lg bg-[#F7F9FC]"
              >
                <option value="CALCULATED_ABG">Calculated ABG (Henderson-Hasselbalch)</option>
                <option value="MEASURED_CHEMISTRY">Measured Venous Total CO2 (Chemistry Panel)</option>
              </select>
            </div>

            <div className="pt-2 border-t border-[#E5EAF1]">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Electrolytes & Albumin (For Anion Gap)</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Na+ (mmol/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={na}
                    onChange={(e) => setNa(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-[#E5EAF1] rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Cl- (mmol/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cl}
                    onChange={(e) => setCl(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-[#E5EAF1] rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Albumin (g/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={albumin}
                    onChange={(e) => setAlbumin(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-[#E5EAF1] rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            onClick={handleEvaluate}
            disabled={loading}
            className="w-full mt-4 py-2.5 px-4 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Evaluate Acid-Base Homeostasis</span>
              </>
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7 space-y-6">
          {analysisResult && analysisResult.is_valid ? (
            <div className="bg-white rounded-xl border border-[#E5EAF1] p-6 shadow-sm space-y-5">
              {/* Primary Disorder Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Primary Disturbance
                  </span>
                  <h3 className="text-lg font-extrabold text-[#17365D]">
                    {analysisResult.primary_processes?.join(', ')}
                  </h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    analysisResult.ph_status === 'ACIDEMIA'
                      ? 'bg-red-100 text-red-800'
                      : analysisResult.ph_status === 'ALKALEMIA'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {analysisResult.ph_status} (pH {analysisResult.inputs?.ph})
                </span>
              </div>

              {/* Winter's Formula & Compensation Section */}
              {analysisResult.compensation?.winter_formula && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2563EB] uppercase">Winter's Formula Analysis</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Formula: Expected PaCO2 = 1.5 * [HCO3] + 8 ± 2
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <div className="text-[11px] text-slate-500">Expected PaCO2 Range</div>
                      <div className="text-xl font-bold text-[#17365D]">
                        {analysisResult.compensation.winter_formula.range}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Actual Measured PaCO2</div>
                      <div className="text-xl font-bold text-blue-700">
                        {analysisResult.compensation.winter_formula.actual_paco2} mmHg
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-blue-100/80 text-xs font-semibold text-slate-700">
                    Verdict:{' '}
                    <span className="text-[#2563EB]">
                      {analysisResult.compensation.metabolic_acidosis_compensation}
                    </span>
                  </div>
                </div>
              )}

              {/* Anion Gap & Delta Ratio Cards */}
              {analysisResult.anion_gap_analysis && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Anion Gap Classification</span>
                    <div className="text-2xl font-extrabold text-[#17365D] mt-1">
                      {analysisResult.anion_gap_analysis.corrected_anion_gap !== null
                        ? `${analysisResult.anion_gap_analysis.corrected_anion_gap} mmol/L`
                        : `${analysisResult.anion_gap_analysis.raw_anion_gap} mmol/L`}
                    </div>
                    <div className="mt-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          analysisResult.anion_gap_analysis.is_hagma
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {analysisResult.anion_gap_analysis.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono">
                      {analysisResult.anion_gap_analysis.summary}
                    </p>
                  </div>

                  {analysisResult.delta_ratio_analysis ? (
                    <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                      <span className="text-[11px] font-bold text-purple-700 uppercase">Delta Ratio (ΔAG / ΔHCO3)</span>
                      <div className="text-2xl font-extrabold text-purple-900 mt-1">
                        {analysisResult.delta_ratio_analysis.delta_ratio}
                      </div>
                      <p className="text-xs text-purple-900/90 font-medium mt-1 leading-snug">
                        {analysisResult.delta_ratio_analysis.interpretation}
                      </p>
                      <div className="text-[10px] text-purple-600 mt-2 font-mono">
                        ΔAG: {analysisResult.delta_ratio_analysis.delta_anion_gap} | ΔHCO3:{' '}
                        {analysisResult.delta_ratio_analysis.delta_bicarbonate}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-center text-xs text-slate-400">
                      Delta ratio active when High Anion Gap is confirmed.
                    </div>
                  )}
                </div>
              )}

              {/* Bicarbonate Provenance Callout */}
              <div className="p-3 bg-blue-50/40 border border-blue-200/50 rounded-lg text-xs text-blue-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span>
                  <strong>Bicarbonate Source:</strong> {analysisResult.bicarbonate_provenance}
                </span>
              </div>

              {/* Clinical Warnings */}
              {analysisResult.clinical_warnings && analysisResult.clinical_warnings.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Clinical Safety Warnings & Mixed Disorder Flags
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-amber-800">
                    {analysisResult.clinical_warnings.map((w: string, idx: number) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Regulatory Notice */}
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{analysisResult.disclaimer}</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5EAF1] p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#17365D]">Acid-Base Evaluation Ready</h3>
              <p className="text-xs text-slate-500 max-w-md">
                Enter arterial blood gas values or select a preset to compute acidemia/alkalemia status, Winter's
                compensation formula, and unmeasured anion gaps.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

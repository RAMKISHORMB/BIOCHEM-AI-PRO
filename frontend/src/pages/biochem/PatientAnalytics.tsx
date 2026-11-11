import React, { useState, useEffect } from 'react';
import {
  LineChart as LineChartIcon,
  Users,
  Activity,
  Layers,
  History,
  TrendingUp,
  Download,
  AlertTriangle,
  Clock,
  Printer,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { api } from '../../services/api';

export default function PatientAnalytics() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedAnalyte, setSelectedAnalyte] = useState<string>('CREAT');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await api.get<any>('/patients');
      const list = Array.isArray(res) ? res : res.items || [];
      if (list.length > 0) {
        setPatients(list);
        setSelectedPatientId(list[0].id);
        loadPatientData(list[0].id);
      }
    } catch (e) {
      console.error('Failed to load patients', e);
    }
  };

  const loadPatientData = async (patientId: string) => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [analyticsRes, timelineRes] = await Promise.all([
        api.get<any>(`/biochem/analytics/patient/${patientId}`),
        api.get<any>(`/history/patients/${patientId}/timeline`),
      ]);
      setAnalyticsData(analyticsRes);
      setTimelineData(timelineRes?.timeline || []);
    } catch (e) {
      console.error('Failed to load patient analytics', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (pId: string) => {
    setSelectedPatientId(pId);
    loadPatientData(pId);
  };

  // Prepare chart series from analyte_history
  const currentAnalyteSeries =
    analyticsData?.analyte_history?.[selectedAnalyte]?.map((pt: any) => ({
      timestamp: new Date(pt.collected_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      fullDate: new Date(pt.collected_at).toLocaleString(),
      value: pt.value,
      accession: pt.accession_number,
      unit: pt.unit,
      flag: pt.flag,
    })) || [];

  // Multi-analyte comparison data (pairing AST and ALT across encounters)
  const hepaticComparison = (analyticsData?.analyte_history?.AST || []).map((astPt: any, idx: number) => {
    const altPt = analyticsData?.analyte_history?.ALT?.[idx];
    return {
      date: new Date(astPt.collected_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      AST: astPt.value,
      ALT: altPt?.value || null,
      accession: astPt.accession_number,
    };
  });

  const availableAnalytes = Object.keys(analyticsData?.analyte_history || {});

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E5EAF1] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
              MODULE 5: PATIENT ANALYTICS
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              LONGITUDINAL TELEMETRY & DELTA CHECKS
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#17365D]">Patient Biochemical Analytics Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Historical time-series, multi-analyte physiological correlations, CLSI delta checks, and auditable
            calculation provenance.
          </p>
        </div>

        {/* Actions & Patient Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#F7F9FC] p-2.5 rounded-lg border border-[#E5EAF1] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2563EB]" />
            <select
              value={selectedPatientId}
              onChange={(e) => handlePatientSelect(e.target.value)}
              className="text-xs bg-white border border-[#E5EAF1] rounded px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.mrn}) — {p.age_years}y, {p.biological_sex}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white border border-[#E5EAF1] hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {analyticsData && (
        <>
          {/* Patient Header Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-sm">
              <span className="text-slate-400 text-xs block font-medium">Patient Name</span>
              <span className="text-base font-bold text-[#17365D] mt-0.5 block">{analyticsData.patient.full_name}</span>
              <span className="text-[11px] font-mono text-slate-500">MRN: {analyticsData.patient.mrn}</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-sm">
              <span className="text-slate-400 text-xs block font-medium">Demographics</span>
              <span className="text-base font-bold text-[#17365D] mt-0.5 block">
                {analyticsData.patient.age_years} Years
              </span>
              <span className="text-[11px] font-medium text-slate-500 uppercase">
                Sex: {analyticsData.patient.sex}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-sm">
              <span className="text-slate-400 text-xs block font-medium">Recorded Accessions</span>
              <span className="text-base font-bold text-[#2563EB] mt-0.5 block">
                {analyticsData.total_encounters} Encounters
              </span>
              <span className="text-[11px] text-slate-500">Accession-grouped isolates</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-sm">
              <span className="text-slate-400 text-xs block font-medium">Tracked Analytes</span>
              <span className="text-base font-bold text-emerald-600 mt-0.5 block">
                {availableAnalytes.length} Biomarkers
              </span>
              <span className="text-[11px] text-slate-500">Longitudinal library</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart 1: Longitudinal Analyte Trend */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-[#E5EAF1] p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5EAF1] gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#17365D] uppercase tracking-wide flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                    Longitudinal Analyte Trajectory
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">Actual EHR chronological measurements</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Analyte:</span>
                  <select
                    value={selectedAnalyte}
                    onChange={(e) => setSelectedAnalyte(e.target.value)}
                    className="text-xs bg-[#F7F9FC] border border-[#E5EAF1] rounded px-2.5 py-1 text-[#17365D] font-bold focus:outline-none"
                  >
                    {availableAnalytes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentAnalyteSeries.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentAnalyteSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="timestamp" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E5EAF1',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name={selectedAnalyte}
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        dot={{ r: 5, fill: '#2563EB' }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <span>No recorded measurements for {selectedAnalyte} for this patient.</span>
                  <span className="text-[11px] text-slate-400 mt-1">Never fabricating measurements.</span>
                </div>
              )}
            </div>

            {/* Chart 2: Hepatic Transaminase Comparison (AST vs ALT) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5EAF1] p-6 shadow-sm space-y-4">
              <div className="pb-3 border-b border-[#E5EAF1]">
                <h2 className="text-sm font-bold text-[#17365D] uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Transaminase Co-Dynamics (AST vs ALT)
                </h2>
                <span className="text-xs text-slate-400 font-mono">Hepatocellular necrosis differential pattern</span>
              </div>

              {hepaticComparison.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hepaticComparison} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E5EAF1',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Line
                        type="monotone"
                        dataKey="AST"
                        stroke="#DC2626"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#DC2626' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="ALT"
                        stroke="#16A34A"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#16A34A' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                  Hepatic transaminase pairs not available for this patient.
                </div>
              )}
            </div>
          </div>

          {/* Previous vs Current Result Comparisons (Delta Checks Table) */}
          <div className="bg-white rounded-xl border border-[#E5EAF1] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-[#17365D] uppercase tracking-wide">
                  Encounter-to-Encounter Delta Checks (CLSI / Tietz Standards)
                </h2>
                <p className="text-xs text-slate-500">
                  Detects acute physiological surges and drops between consecutive clinical visits to catch rapid acute
                  insults.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F7F9FC] border-b border-[#E5EAF1] text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Visit Date</th>
                    <th className="py-2.5 px-4">Accession</th>
                    <th className="py-2.5 px-4">Analyte</th>
                    <th className="py-2.5 px-4">Value</th>
                    <th className="py-2.5 px-4">Δ Absolute</th>
                    <th className="py-2.5 px-4">Δ Percent</th>
                    <th className="py-2.5 px-4">Alert Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF1]">
                  {timelineData.flatMap((encounter: any) =>
                    encounter.results
                      .filter((r: any) => r.delta_percent !== null)
                      .map((r: any, idx: number) => (
                        <tr key={`${encounter.encounter_id}-${idx}`} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-mono text-slate-500">
                            {new Date(encounter.collected_at).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-medium text-[#17365D]">
                            {encounter.accession_number}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">{r.analyte_name}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                            {r.value} {r.unit}
                          </td>
                          <td className="py-2.5 px-4 font-mono">
                            <span className={r.delta_abs > 0 ? 'text-red-600' : 'text-blue-600'}>
                              {r.delta_abs > 0 ? `+${r.delta_abs}` : r.delta_abs}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold">
                            <span
                              className={
                                Math.abs(r.delta_percent) > 30.0
                                  ? 'text-red-700 bg-red-50 px-1.5 py-0.5 rounded'
                                  : 'text-slate-600'
                              }
                            >
                              {r.delta_percent > 0 ? `+${r.delta_percent}%` : `${r.delta_percent}%`}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            {r.delta_message ? (
                              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] block">
                                {r.delta_message}
                              </span>
                            ) : (
                              <span className="text-emerald-700 text-[11px] font-medium">Stable</span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                  {timelineData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No historical encounters available to compute delta check comparisons.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Patient Calculation Audit History */}
          <div className="bg-white rounded-xl border border-[#E5EAF1] p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-[#17365D] uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              Patient Specific Calculation Provenance Records
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F7F9FC] border-b border-[#E5EAF1] text-slate-600 font-semibold">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Index / Formula</th>
                    <th className="py-2 px-3">Result</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Provenance Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF1]">
                  {analyticsData.calculation_history && analyticsData.calculation_history.length > 0 ? (
                    analyticsData.calculation_history.map((calc: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {calc.created_at ? new Date(calc.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-2 px-3 font-semibold text-[#17365D]">{calc.formula_name}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                          {calc.output_value !== null ? `${calc.output_value} ${calc.output_unit || ''}` : 'Evaluated'}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                            {calc.status || 'LOGGED'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{calc.provenance_hash}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No calculation history recorded specifically for this patient.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

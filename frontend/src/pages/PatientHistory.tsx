import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  History,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  Info,
  User,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid
} from 'recharts';

interface Patient {
  id: string;
  mrn: string;
  full_name: string;
  biological_sex: string;
  age_years: number;
}

interface AnalyteResult {
  analyte_code: string;
  analyte_name: string;
  value: number | null;
  unit: string;
  flag: string;
  reference_range?: string;
  delta_percent?: number;
  delta_abs?: number;
  delta_flag: string;
  delta_message?: string;
}

interface DeltaAlert {
  analyte_code: string;
  current_value: number;
  previous_value: number;
  unit: string;
  percent_change: number;
  absolute_change: number;
  delta_flag: string;
  warning: string;
}

interface EncounterTimeline {
  encounter_id: string;
  accession_number: string;
  sample_collected_at: string;
  sample_type: string;
  fasting_status: string;
  interval_hours_since_previous?: number;
  analytes: AnalyteResult[];
  delta_alerts: DeltaAlert[];
}

interface TrendPoint {
  timestamp: string;
  date_display: string;
  accession_number: string;
  value: number | null;
  unit: string;
  flag: string;
}

interface TrendResponse {
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

export const PatientHistory: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [timelineLoading, setTimelineLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [timeline, setTimeline] = useState<EncounterTimeline[]>([]);
  const [selectedAnalyte, setSelectedAnalyte] = useState<string>('CREAT');
  const [trendData, setTrendData] = useState<TrendResponse | null>(null);

  // Fetch registered patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const res = await api.get<{ items: Patient[]; total: number }>('/patients?page=1&size=50');
        setPatients(res.items);
        if (res.items.length > 0) {
          setSelectedPatientId(res.items[0].id);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch patients');
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  // Fetch timeline when patient changes
  useEffect(() => {
    if (!selectedPatientId) return;

    const fetchTimeline = async () => {
      try {
        setTimelineLoading(true);
        setError(null);
        const res = await api.get<{ patient: any; timeline: EncounterTimeline[] }>(
          `/history/patients/${selectedPatientId}/timeline`
        );
        setTimeline(res.timeline);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch patient history');
      } finally {
        setTimelineLoading(false);
      }
    };

    fetchTimeline();
  }, [selectedPatientId]);

  // Fetch trend line when patient or analyte changes
  useEffect(() => {
    if (!selectedPatientId || !selectedAnalyte) return;

    const fetchTrend = async () => {
      try {
        const res = await api.get<TrendResponse>(
          `/history/patients/${selectedPatientId}/trends?analyte_code=${selectedAnalyte}`
        );
        setTrendData(res);
      } catch (err: any) {
        console.error('Error fetching trend:', err);
      }
    };

    fetchTrend();
  }, [selectedPatientId, selectedAnalyte]);

  const filteredPatients = patients.filter(
    (p) =>
      p.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const availableAnalytes = ['CREAT', 'K', 'NA', 'GLU', 'BUN', 'ALT', 'AST', 'ALB', 'CA'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#17365D]">
            Patient Longitudinal History & Delta Checks
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Chronological multi-visit analyte trajectories, CLSI/Tietz laboratory delta check alerts, and physiological bounds.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Patient Selector + Timeline & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Patient Selection Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
            <span className="text-xs font-bold text-[#17365D] uppercase tracking-wider block mb-3">
              Select Patient Cohort
            </span>

            {/* Search input */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search MRN or Patient Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#172B4D] placeholder-[#64748B] focus:bg-white focus:outline-none"
              />
            </div>

            {loading ? (
              <div className="p-6 text-center text-xs text-[#64748B]">Loading patients...</div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748B]">No patients matching filter.</div>
            ) : (
              <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredPatients.map((p) => {
                  const isSelected = p.id === selectedPatientId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`cursor-pointer p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-[#EAF2FF] border-[#BFDBFE]'
                          : 'bg-[#F8FAFC] border-[#E5EAF1] hover:bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#17365D]">
                          {p.full_name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#2563EB] border border-[#E5EAF1] font-bold">
                          {p.mrn}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748B]">
                        <span>{p.biological_sex}</span>
                        <span>•</span>
                        <span>{p.age_years} yrs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Longitudinal Trajectory & Delta Checks */}
        <div className="lg:col-span-8 space-y-6">
          {timelineLoading ? (
            <div className="p-16 text-center text-xs text-[#64748B] bg-white border border-[#E5EAF1] rounded-xl shadow-card">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
              <p className="font-semibold text-[#17365D]">Computing longitudinal delta checks and time-series...</p>
            </div>
          ) : !selectedPatient ? (
            <div className="p-16 text-center text-xs text-[#64748B] bg-white border border-[#E5EAF1] rounded-xl shadow-card">
              <Layers className="w-8 h-8 mx-auto mb-2 text-[#94A3B8]" />
              <p className="text-sm font-semibold text-[#17365D]">Select a patient to inspect chronological trajectory</p>
            </div>
          ) : timeline.length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#E5EAF1] rounded-xl shadow-card">
              <Activity className="w-8 h-8 mx-auto mb-2 text-[#94A3B8]" />
              <h3 className="text-sm font-semibold text-[#17365D]">No Laboratory Encounters Recorded</h3>
              <p className="text-xs text-[#64748B] mt-1">
                Enter laboratory panels in "Manual Lab Entry" to establish longitudinal trends for this patient.
              </p>
            </div>
          ) : (
            <>
              {/* Analyte Trend Chart Card */}
              <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                    <div>
                      <h3 className="text-xs font-bold text-[#17365D] uppercase tracking-wider">
                        Analyte Progression Trend: {trendData?.analyte_name || selectedAnalyte} ({trendData?.unit})
                      </h3>
                      <p className="text-[11px] text-[#64748B]">
                        Physiological bounds and historical results across {trendData?.points.length || 0} encounter(s)
                      </p>
                    </div>
                  </div>

                  {/* Analyte selector buttons */}
                  <div className="flex flex-wrap gap-1">
                    {availableAnalytes.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setSelectedAnalyte(code)}
                        className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                          selectedAnalyte === code
                            ? 'bg-[#17365D] text-white font-bold border-[#17365D]'
                            : 'bg-[#F8FAFC] text-[#64748B] border-[#E5EAF1] hover:text-[#172B4D]'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                {trendData && trendData.points.length > 0 ? (
                  <div className="h-64 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData.points} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF1" />
                        <XAxis
                          dataKey="date_display"
                          stroke="#94A3B8"
                          tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'monospace' }}
                        />
                        <YAxis stroke="#94A3B8" tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'monospace' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E5EAF1',
                            borderRadius: '8px',
                            color: '#172B4D',
                            fontSize: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          }}
                        />
                        {trendData.reference_range?.upper_limit && (
                          <ReferenceLine
                            y={trendData.reference_range.upper_limit}
                            stroke="#DC2626"
                            strokeDasharray="3 3"
                            label={{
                              value: `Upper Ref: ${trendData.reference_range.upper_limit}`,
                              fill: '#DC2626',
                              fontSize: 10,
                            }}
                          />
                        )}
                        {trendData.reference_range?.lower_limit && (
                          <ReferenceLine
                            y={trendData.reference_range.lower_limit}
                            stroke="#2563EB"
                            strokeDasharray="3 3"
                            label={{
                              value: `Lower Ref: ${trendData.reference_range.lower_limit}`,
                              fill: '#2563EB',
                              fontSize: 10,
                            }}
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          dot={{ fill: '#2563EB', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-[#64748B]">
                    No measurements recorded for {selectedAnalyte} across this patient's visits.
                  </div>
                )}
              </div>

              {/* Chronological Encounters & Delta Alerts */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#17365D] uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2563EB]" />
                  Chronological Visits & Delta Checks ({timeline.length} Encounters)
                </h3>

                {timeline.map((enc) => (
                  <div key={enc.encounter_id} className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5EAF1] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#17365D]">{enc.accession_number}</span>
                          <span className="px-2 py-0.5 text-[10px] rounded bg-[#F8FAFC] text-[#64748B] font-mono border border-[#E5EAF1]">
                            {enc.sample_type}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] rounded bg-[#F8FAFC] text-[#64748B] font-mono border border-[#E5EAF1]">
                            {enc.fasting_status}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#64748B] mt-0.5 block">
                          Collected: {new Date(enc.sample_collected_at).toLocaleString()}
                        </span>
                      </div>

                      {enc.interval_hours_since_previous !== null && enc.interval_hours_since_previous !== undefined && (
                        <span className="text-[11px] font-mono text-[#2563EB] bg-[#EAF2FF] border border-[#BFDBFE] px-2 py-0.5 rounded">
                          Interval: {enc.interval_hours_since_previous} hrs ({Math.round(enc.interval_hours_since_previous / 24)} days)
                        </span>
                      )}
                    </div>

                    {/* Delta Alerts Banner */}
                    {enc.delta_alerts && enc.delta_alerts.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {enc.delta_alerts.map((alert, aIdx) => (
                          <div
                            key={aIdx}
                            className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                              alert.delta_flag === 'DELTA_SURGE'
                                ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626]'
                                : 'bg-[#FEF3C7] border-[#FDE68A] text-[#B45309]'
                            }`}
                          >
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-current" />
                            <div>
                              <span className="font-bold">
                                DELTA CHECK ALERT [{alert.analyte_code}]: {alert.percent_change > 0 ? '+' : ''}
                                {alert.percent_change}% shift ({alert.previous_value} &rarr; {alert.current_value} {alert.unit})
                              </span>
                              <p className="mt-0.5 text-[11px] opacity-90">{alert.warning}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Analytes Table */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-[#E5EAF1] text-[#64748B] uppercase text-[10px]">
                            <th className="py-2 px-2">Analyte</th>
                            <th className="py-2 px-2 text-right">Value</th>
                            <th className="py-2 px-2">Unit</th>
                            <th className="py-2 px-2">Ref Range</th>
                            <th className="py-2 px-2">Flag</th>
                            <th className="py-2 px-2 text-right">Delta %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5EAF1] text-[#172B4D]">
                          {enc.analytes.map((a) => (
                            <tr key={a.analyte_code} className="hover:bg-[#F8FAFC]">
                              <td className="py-1.5 px-2 font-semibold text-[#17365D]">
                                {a.analyte_name} ({a.analyte_code})
                              </td>
                              <td className="py-1.5 px-2 text-right font-bold text-[#17365D]">{a.value}</td>
                              <td className="py-1.5 px-2 text-[#64748B]">{a.unit}</td>
                              <td className="py-1.5 px-2 text-[#64748B]">{a.reference_range || '-'}</td>
                              <td className="py-1.5 px-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    a.flag === 'NORMAL'
                                      ? 'text-[#15803D] bg-[#F0FDF4] border border-[#DCFCE7]'
                                      : 'text-[#DC2626] bg-[#FEF2F2] border border-[#FCA5A5]'
                                  }`}
                                >
                                  {a.flag}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-right">
                                {a.delta_percent !== null && a.delta_percent !== undefined ? (
                                  <span
                                    className={`font-bold ${
                                      a.delta_flag !== 'NORMAL' ? 'text-[#DC2626]' : 'text-[#64748B]'
                                    }`}
                                  >
                                    {a.delta_percent > 0 ? `+${a.delta_percent}%` : `${a.delta_percent}%`}
                                  </span>
                                ) : (
                                  <span className="text-[#94A3B8]">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientHistory;

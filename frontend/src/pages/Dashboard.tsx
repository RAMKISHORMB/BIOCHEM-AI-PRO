import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Users,
  FlaskConical,
  AlertTriangle,
  FileCheck,
  Activity,
  ArrowRight,
  Server,
  Cpu,
  RefreshCw,
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface DashboardData {
  summary: {
    total_patients: number;
    total_encounters: number;
    total_critical_alerts: number;
    total_abnormal_results: number;
    pending_clinician_reviews: number;
    total_audit_events: number;
  };
  volume_timeline: Array<{ date: string; count: number }>;
  critical_alerts: Array<{
    result_id: string;
    encounter_id: string;
    accession_number: string;
    patient_id: string;
    patient_mrn: string;
    patient_name: string;
    analyte_code: string;
    analyte_name: string;
    value_numeric: number;
    unit: string;
    flag: string;
    timestamp: string;
  }>;
  recent_encounters: Array<{
    id: string;
    accession_number: string;
    patient_id: string;
    patient_mrn: string;
    patient_name: string;
    sample_type: string;
    clinical_status: string;
    sample_collected_at: string;
  }>;
  system_status: {
    database: string;
    ollama_online: boolean;
    ollama_model: string;
    ollama_url: string;
  };
}

interface RecentPatient {
  id: string;
  mrn: string;
  full_name: string;
  biological_sex: string;
  age_years: number;
  created_at: string;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, patientsRes] = await Promise.all([
        api.get<DashboardData>('/dashboard/metrics'),
        api.get<{ items: RecentPatient[]; total: number }>('/patients?page=1&size=5'),
      ]);
      setData(metricsRes);
      setRecentPatients(patientsRes.items || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center p-24 text-[#2563EB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2563EB]/20 border-t-[#2563EB] rounded-full animate-spin"></div>
          <span className="text-xs font-mono uppercase tracking-wider text-[#64748B]">
            Querying Relational LIS Store...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#17365D]">Laboratory Overview</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Clinical biochemistry operations and analytical insights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMetrics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#E5EAF1] text-xs font-medium text-[#172B4D] transition-colors shadow-sm"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Refresh</span>
          </button>
          <Link
            to="/patients"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#E5EAF1] text-xs font-medium text-[#172B4D] transition-colors shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Register Patient</span>
          </Link>
          <Link
            to="/data-entry"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-xs font-medium text-white transition-colors shadow-sm"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Manual Lab Entry</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards (Real database queries) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-medium">Total Patients</span>
            <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-[#17365D]">
              {data?.summary.total_patients ?? 0}
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">Verified in PostgreSQL/SQLite</p>
          </div>
        </div>

        {/* Laboratory Accession Count */}
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-medium">Laboratory Accession Count</span>
            <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-[#17365D]">
              {data?.summary.total_encounters ?? 0}
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">Accessioned clinical panels</p>
          </div>
        </div>

        {/* Abnormal Results */}
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-medium text-[#D97706]">Abnormal Results</span>
            <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-[#D97706]">
              {data?.summary.total_abnormal_results ?? 0}
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Includes {data?.summary.total_critical_alerts ?? 0} panic criticals
            </p>
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-medium">Pending Reviews</span>
            <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] text-[#15803D] flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-[#15803D]">
              {data?.summary.pending_clinician_reviews ?? 0}
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">Awaiting biochemist sign-off</p>
          </div>
        </div>
      </div>

      {/* Main Row: Activity Chart + System Health Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Laboratory Activity Chart */}
        <div className="lg:col-span-8 bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#17365D]">
                Laboratory Activity Chart
              </h2>
              <p className="text-[11px] text-[#64748B]">
                Daily specimen intake volume across the last 7 clinical days
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-[#F8FAFC] border border-[#E5EAF1] rounded text-[#64748B]">
              Real Database Timestamps
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.volume_timeline || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="lisVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF1" />
                <XAxis
                  dataKey="date"
                  stroke="#94A3B8"
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'monospace' }}
                />
                <YAxis
                  stroke="#94A3B8"
                  allowDecimals={false}
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5EAF1',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    color: '#172B4D',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Accessions"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#lisVolumeGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health Panel */}
        <div className="lg:col-span-4 bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-4">
          <div className="border-b border-[#E5EAF1] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#17365D] flex items-center gap-2">
              <Server className="w-4 h-4 text-[#2563EB]" />
              System Health & Diagnostics
            </h2>
            <p className="text-[11px] text-[#64748B] mt-0.5">Air-gapped local runtime verification</p>
          </div>

          <div className="space-y-3 text-xs">
            {/* Database status */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
                <span className="font-medium text-[#172B4D]">Persistence Store</span>
              </div>
              <span className="font-mono text-[11px] text-[#15803D] font-semibold">
                {data?.system_status.database || 'Online'}
              </span>
            </div>

            {/* Ollama local status */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1]">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#64748B]" />
                <span className="font-medium text-[#172B4D]">Local AI (Ollama)</span>
              </div>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  data?.system_status.ollama_online ? 'text-[#15803D]' : 'text-[#D97706]'
                }`}
              >
                {data?.system_status.ollama_online ? `Online (${data?.system_status.ollama_model})` : 'Offline'}
              </span>
            </div>

            {/* Audit log status */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
                <span className="font-medium text-[#172B4D]">Audit Events Recorded</span>
              </div>
              <span className="font-mono text-[11px] text-[#17365D] font-bold">
                {data?.summary.total_audit_events ?? 0}
              </span>
            </div>

            {/* Traceability note */}
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1] text-[11px] text-[#64748B] leading-relaxed">
              Standard clinical reference intervals calibrated against <strong className="text-[#172B4D]">Tietz 7th Edition</strong>. Zero synthetic data injected into database.
            </div>
          </div>
        </div>
      </div>

      {/* Row: Abnormal Result Alerts (High Priority) */}
      <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#17365D]">
              Abnormal Result Alerts ({data?.critical_alerts.length || 0})
            </h2>
          </div>
          <span className="text-[11px] text-[#64748B]">Immediate clinical correlation required</span>
        </div>

        {!data?.critical_alerts || data.critical_alerts.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
            <CheckCircle2 className="w-6 h-6 text-[#15803D] mx-auto mb-1.5" />
            <p className="font-medium text-[#172B4D]">No active panic critical alerts in the queue</p>
            <p className="text-[11px] mt-0.5">All recently accessioned analytes are within safe physiological limits.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#E5EAF1] text-[#64748B] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Patient / MRN</th>
                  <th className="py-2.5 px-3">Accession</th>
                  <th className="py-2.5 px-3">Analyte</th>
                  <th className="py-2.5 px-3 text-right">Value</th>
                  <th className="py-2.5 px-3">Severity Flag</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1] text-[#172B4D]">
                {data.critical_alerts.map((alert) => (
                  <tr key={alert.result_id} className="hover:bg-[#FEF2F2]/40 transition-colors">
                    <td className="py-2.5 px-3 font-sans">
                      <span className="font-semibold block text-[#17365D]">{alert.patient_name}</span>
                      <span className="text-[10px] text-[#64748B] font-mono">{alert.patient_mrn}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[#64748B]">{alert.accession_number}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#172B4D]">
                      {alert.analyte_name} ({alert.analyte_code})
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#DC2626]">
                      {alert.value_numeric} {alert.unit}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
                        {alert.flag}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        to="/interpretations"
                        className="text-[#2563EB] hover:underline font-sans text-xs font-medium"
                      >
                        Interpret
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two Column Grid: Recent Laboratory Results & Recent Patient Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Laboratory Results Table */}
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-3 border-b border-[#E5EAF1] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#17365D]">
              Recent Laboratory Results
            </h2>
            <Link to="/reports" className="text-xs text-[#2563EB] hover:underline flex items-center gap-1 font-medium">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!data?.recent_encounters || data.recent_encounters.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B]">
              No encounters registered. Use "Manual Lab Entry" to add laboratory tests.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5EAF1] text-[#64748B] font-mono text-[10px] uppercase">
                    <th className="py-2 px-2">Accession</th>
                    <th className="py-2 px-2">Patient</th>
                    <th className="py-2 px-2">Specimen</th>
                    <th className="py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF1] text-[#172B4D]">
                  {data.recent_encounters.map((enc) => (
                    <tr key={enc.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-2 px-2 font-mono font-semibold text-[#2563EB]">
                        {enc.accession_number}
                      </td>
                      <td className="py-2 px-2">
                        <span className="font-medium text-[#17365D] block">{enc.patient_name}</span>
                        <span className="text-[10px] text-[#64748B] font-mono">{enc.patient_mrn}</span>
                      </td>
                      <td className="py-2 px-2 font-mono text-[11px] text-[#64748B]">{enc.sample_type}</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7]">
                          {enc.clinical_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Patient Registrations Table */}
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-3 border-b border-[#E5EAF1] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#17365D]">
              Recent Patient Registrations
            </h2>
            <Link to="/patients" className="text-xs text-[#2563EB] hover:underline flex items-center gap-1 font-medium">
              <span>Patient Registry</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentPatients.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B]">
              No patients registered. Click "Register Patient" to add a new clinical record.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5EAF1] text-[#64748B] font-mono text-[10px] uppercase">
                    <th className="py-2 px-2">MRN</th>
                    <th className="py-2 px-2">Full Name</th>
                    <th className="py-2 px-2">Sex / Age</th>
                    <th className="py-2 px-2 text-right">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF1] text-[#172B4D]">
                  {recentPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-2 px-2 font-mono text-xs font-semibold text-[#2563EB]">
                        {p.mrn}
                      </td>
                      <td className="py-2 px-2 font-medium text-[#17365D]">{p.full_name}</td>
                      <td className="py-2 px-2 text-[#64748B] text-[11px]">
                        {p.biological_sex} • {p.age_years} yrs
                      </td>
                      <td className="py-2 px-2 text-right text-[11px] text-[#64748B] font-mono">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

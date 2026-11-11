import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  BookOpen,
  User,
  FlaskConical,
  Sparkles,
  ShieldAlert,
  Hash,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';

interface ProfileAnalyteItem {
  analyte_code: string;
  analyte_name: string;
  value: number | null;
  unit: string;
  flag: string;
  reference_range: string | null;
  biochemical_significance: string;
  relevant_mechanisms: string;
  limitations: string;
  references: string;
}

interface DerivedIndex {
  calculation_type: string;
  formula_name: string;
  formula_latex: string;
  output_value: number | null;
  output_unit: string;
  status: string;
  interpretation?: string;
  reference_range?: string;
  assumptions: string[];
  limitations: string[];
  provenance_hash: string;
}

interface ProfileData {
  profile_type: string;
  title: string;
  description: string;
  patient_id: string | null;
  patient_name: string | null;
  patient_mrn: string | null;
  encounter_id: string | null;
  accession_number: string | null;
  sample_collected_at: string | null;
  specimen_type: string | null;
  analytes: ProfileAnalyteItem[];
  derived_indices: DerivedIndex[];
  clinical_alerts: any[];
  disclaimer: string;
}

interface Props {
  endpoint: string;
  badgeLabel: string;
}

export const BiochemicalProfileView: React.FC<Props> = ({ endpoint, badgeLabel }) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [expandedAnalyte, setExpandedAnalyte] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
    loadProfile('');
  }, [endpoint]);

  const fetchPatients = async () => {
    try {
      const res = await api.get<any>('/patients');
      const list = Array.isArray(res) ? res : res.items || [];
      setPatients(list);
    } catch (e) {
      console.error('Failed to load patients', e);
    }
  };

  const loadProfile = async (pId: string) => {
    setLoading(true);
    try {
      const url = pId ? `${endpoint}?patient_id=${pId}` : endpoint;
      const res = await api.get<ProfileData>(url);
      setProfileData(res);
    } catch (e) {
      console.error('Failed to load profile data', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientChange = (pId: string) => {
    setSelectedPatientId(pId);
    loadProfile(pId);
  };

  const toggleExpand = (code: string) => {
    setExpandedAnalyte(expandedAnalyte === code ? null : code);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E5EAF1] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
              {badgeLabel}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              EVIDENCE-LINKED INTERPRETATION
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#17365D]">{profileData?.title || 'Biochemical Profile'}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">{profileData?.description}</p>
        </div>

        {/* Patient Selector */}
        <div className="flex items-center gap-3 bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF1]">
          <User className="w-5 h-5 text-[#2563EB]" />
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase">Patient Record</label>
            <select
              value={selectedPatientId}
              onChange={(e) => handlePatientChange(e.target.value)}
              className="text-xs bg-white border border-[#E5EAF1] rounded px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="">Demonstration Specimen / Reference Library</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.mrn}) — {p.age_years}y, {p.biological_sex}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Accession Metadata Strip */}
      {profileData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-sm text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Accession Number</span>
            <span className="font-mono font-bold text-[#17365D]">{profileData.accession_number || 'ACC-DEMO-01'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Specimen Matrix</span>
            <span className="font-semibold text-slate-700">{profileData.specimen_type || 'Serum'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Collection Timestamp</span>
            <span className="font-mono text-slate-700">
              {profileData.sample_collected_at
                ? new Date(profileData.sample_collected_at).toLocaleString()
                : 'Simulated Observation'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Patient Identifier</span>
            <span className="font-semibold text-blue-700">
              {profileData.patient_name} ({profileData.patient_mrn})
            </span>
          </div>
        </div>
      )}

      {/* Urgent Clinical Alerts */}
      {profileData?.clinical_alerts && profileData.clinical_alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-red-900 uppercase">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Clinical Panic & Critical Threshold Alerts</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {profileData.clinical_alerts.map((alert, idx) => (
              <div key={idx} className="bg-white/80 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Derived Clinical Calculations Section */}
      {profileData?.derived_indices && profileData.derived_indices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#17365D] uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#2563EB]" />
            <span>Derived Biochemical Indices (Validated Formulas)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profileData.derived_indices.map((idxItem, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-[#E5EAF1] p-4 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="text-xs font-bold text-[#17365D]">{idxItem.formula_name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      idxItem.status === 'NORMAL'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {idxItem.status}
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-[#17365D]">
                  {idxItem.output_value !== null ? idxItem.output_value : 'Indeterminate'}
                  <span className="text-xs font-semibold text-slate-500 ml-1">{idxItem.output_unit}</span>
                </div>
                {idxItem.reference_range && (
                  <div className="text-[11px] text-slate-400">Ref: {idxItem.reference_range}</div>
                )}
                {idxItem.interpretation && (
                  <p className="text-xs text-slate-600 font-medium leading-snug">{idxItem.interpretation}</p>
                )}
                <div className="pt-2 border-t border-[#E5EAF1] flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Provenance: {idxItem.provenance_hash}</span>
                  <span className="text-[#2563EB]">Audited</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Measured Analytes Table with Expandable Interpretations */}
      <div className="bg-white rounded-xl border border-[#E5EAF1] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E5EAF1] flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-[#17365D] uppercase tracking-wide">
              Measured Laboratory Analytes & In-Depth Interpretations
            </h2>
            <p className="text-xs text-slate-500">
              Click any row to inspect physiological significance, cellular mechanisms, limitations, and literature
              citations.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">{profileData?.analytes?.length || 0} Analytes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E5EAF1] text-slate-600 font-semibold">
                <th className="py-3 px-4">Analyte Code</th>
                <th className="py-3 px-4">Test Name</th>
                <th className="py-3 px-4">Measured Value</th>
                <th className="py-3 px-4">Reference Interval</th>
                <th className="py-3 px-4">Status Flag</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1]">
              {profileData?.analytes && profileData.analytes.length > 0 ? (
                profileData.analytes.map((item) => {
                  const isExpanded = expandedAnalyte === item.analyte_code;
                  return (
                    <React.Fragment key={item.analyte_code}>
                      <tr
                        onClick={() => toggleExpand(item.analyte_code)}
                        className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                          isExpanded ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[#17365D]">{item.analyte_code}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{item.analyte_name}</td>
                        <td className="py-3 px-4 font-mono text-sm font-extrabold text-[#17365D]">
                          {item.value !== null ? item.value : '—'}
                          <span className="text-xs font-normal text-slate-500 ml-1">{item.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {item.reference_range || 'Normal'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.flag === 'NORMAL'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.flag === 'HIGH' || item.flag === 'LOW'
                                ? 'bg-amber-100 text-amber-800'
                                : item.flag === 'CRITICAL_HIGH' || item.flag === 'CRITICAL_LOW'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.flag}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-[#2563EB] hover:text-blue-800 font-semibold text-[11px] flex items-center gap-0.5 ml-auto">
                            <span>{isExpanded ? 'Hide' : 'Explain'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Evidence Accordion */}
                      {isExpanded && (
                        <tr className="bg-[#F7F9FC]">
                          <td colSpan={6} className="p-5 border-b border-[#E5EAF1]">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                              <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF1] space-y-1">
                                <span className="text-[11px] font-bold text-[#2563EB] uppercase flex items-center gap-1">
                                  <Activity className="w-3.5 h-3.5" />
                                  Biochemical Significance
                                </span>
                                <p className="text-slate-600 leading-relaxed">{item.biochemical_significance}</p>
                              </div>

                              <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF1] space-y-1">
                                <span className="text-[11px] font-bold text-amber-700 uppercase flex items-center gap-1">
                                  <Layers className="w-3.5 h-3.5" />
                                  Pathophysiological Mechanisms
                                </span>
                                <p className="text-slate-600 leading-relaxed">{item.relevant_mechanisms}</p>
                              </div>

                              <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF1] space-y-1">
                                <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Clinical Limitations
                                </span>
                                <p className="text-slate-600 leading-relaxed">{item.limitations}</p>
                              </div>

                              <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF1] space-y-1">
                                <span className="text-[11px] font-bold text-purple-700 uppercase flex items-center gap-1">
                                  <BookOpen className="w-3.5 h-3.5" />
                                  Evidence & References
                                </span>
                                <p className="text-slate-600 font-mono text-[11px] leading-relaxed">
                                  {item.references}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No results recorded for this profile in the selected encounter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Educational & Clinical Safety Disclaimer */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <strong>Clinical Decision Support Notice:</strong> {profileData?.disclaimer}
        </div>
      </div>
    </div>
  );
};

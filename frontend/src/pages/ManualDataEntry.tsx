import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  FlaskConical,
  User,
  Calendar,
  Clock,
  Sparkles,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface Patient {
  id: string;
  mrn: string;
  full_name: string;
  biological_sex: string;
  age_years: number;
}

interface TestAnalyte {
  id: string;
  code: string;
  name: string;
  category: string;
  default_unit: string;
  reference_ranges: Array<{
    biological_sex: string;
    min_age_years: number;
    max_age_years: number;
    lower_limit: number;
    upper_limit: number;
    critical_low?: number;
    critical_high?: number;
    unit: string;
    source_authority: string;
  }>;
}

interface EntryRow {
  analyte: TestAnalyte;
  value: string;
  unit: string;
  notes: string;
}

export default function ManualDataEntry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(searchParams.get('patient_id') || '');
  const [allAnalytes, setAllAnalytes] = useState<TestAnalyte[]>([]);

  // Encounter metadata
  const [accessionNumber, setAccessionNumber] = useState('');
  const [sampleType, setSampleType] = useState('SERUM');
  const [fastingStatus, setFastingStatus] = useState('FASTING');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Selected entry rows
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load patient list and analytes on mount
  useEffect(() => {
    const initData = async () => {
      try {
        const [patData, analyteData, accData] = await Promise.all([
          api.get<{ items: Patient[] }>('/patients'),
          api.get<TestAnalyte[]>('/reference-ranges/tests'),
          api.get<{ accession_number: string }>('/labs/generate-accession')
        ]);
        setPatients(patData.items);
        setAllAnalytes(analyteData);
        setAccessionNumber(accData.accession_number);

        // Pre-select patient if mrn in query
        const queryMrn = searchParams.get('mrn');
        if (queryMrn) {
          const match = patData.items.find((p) => p.mrn === queryMrn);
          if (match) setSelectedPatientId(match.id);
        } else if (!selectedPatientId && patData.items.length > 0) {
          setSelectedPatientId(patData.items[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Initialization failed');
      }
    };
    initData();
  }, [searchParams]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // Panel presets
  const applyPreset = (presetCodes: string[]) => {
    const newRows: EntryRow[] = [];
    presetCodes.forEach((code) => {
      const found = allAnalytes.find((a) => a.code === code);
      if (found) {
        newRows.push({
          analyte: found,
          value: '',
          unit: found.default_unit,
          notes: '',
        });
      }
    });
    setRows(newRows);
  };

  const loadBMP = () => applyPreset(['GLU', 'BUN', 'CREAT', 'NA', 'K', 'CL', 'HCO3', 'CA']);
  const loadCMP = () => applyPreset(['GLU', 'BUN', 'CREAT', 'NA', 'K', 'CL', 'HCO3', 'CA', 'ALT', 'AST', 'ALP', 'TBIL', 'TP', 'ALB']);
  const loadLFT = () => applyPreset(['ALT', 'AST', 'ALP', 'TBIL', 'DBIL', 'TP', 'ALB']);
  const loadLipid = () => applyPreset(['CHOL', 'TRIG', 'HDL', 'LDL']);

  // Add individual analyte
  const addAnalyte = (analyteId: string) => {
    const found = allAnalytes.find((a) => a.id === analyteId);
    if (!found || rows.some((r) => r.analyte.id === analyteId)) return;
    setRows([...rows, { analyte: found, value: '', unit: found.default_unit, notes: '' }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof EntryRow, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  // Live client-side flag evaluation against patient demographics
  const getAnalyteFlag = (row: EntryRow) => {
    if (!row.value || isNaN(parseFloat(row.value)) || !selectedPatient) {
      return { flag: 'NONE', badge: 'bg-[#F1F5F9] text-[#64748B] border-[#E5EAF1]' };
    }
    const val = parseFloat(row.value);
    const sex = selectedPatient.biological_sex;
    const age = selectedPatient.age_years;

    const range =
      row.analyte.reference_ranges.find(
        (r) => r.biological_sex === sex && r.min_age_years <= age && r.max_age_years >= age
      ) ||
      row.analyte.reference_ranges.find(
        (r) => r.biological_sex === 'ALL' && r.min_age_years <= age && r.max_age_years >= age
      ) ||
      row.analyte.reference_ranges[0];

    if (!range) return { flag: 'NONE', badge: 'bg-[#F1F5F9] text-[#64748B] border-[#E5EAF1]' };

    if (range.critical_low !== null && range.critical_low !== undefined && val <= range.critical_low) {
      return { flag: 'CRITICAL LOW', badge: 'bg-[#FEF2F2] text-[#DC2626] font-bold border-[#FCA5A5]' };
    }
    if (range.critical_high !== null && range.critical_high !== undefined && val >= range.critical_high) {
      return { flag: 'CRITICAL HIGH', badge: 'bg-[#FEF2F2] text-[#DC2626] font-bold border-[#FCA5A5]' };
    }
    if (val < range.lower_limit) {
      return { flag: 'LOW', badge: 'bg-[#EFF6FF] text-[#2563EB] font-semibold border-[#BFDBFE]' };
    }
    if (val > range.upper_limit) {
      return { flag: 'HIGH', badge: 'bg-[#FEF3C7] text-[#D97706] font-semibold border-[#FDE68A]' };
    }
    return { flag: 'NORMAL', badge: 'bg-[#F0FDF4] text-[#15803D] font-medium border-[#DCFCE7]' };
  };

  const getAppliedRangeString = (row: EntryRow) => {
    if (!selectedPatient) return 'Select patient to apply reference interval';
    const sex = selectedPatient.biological_sex;
    const age = selectedPatient.age_years;
    const range =
      row.analyte.reference_ranges.find(
        (r) => r.biological_sex === sex && r.min_age_years <= age && r.max_age_years >= age
      ) ||
      row.analyte.reference_ranges.find(
        (r) => r.biological_sex === 'ALL' && r.min_age_years <= age && r.max_age_years >= age
      ) ||
      row.analyte.reference_ranges[0];

    if (!range) return 'Standard Catalog';
    return `${range.lower_limit} - ${range.upper_limit} ${range.unit}`;
  };

  const handleSubmitEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Please select an enrolled patient record.');
      return;
    }
    if (rows.length === 0) {
      setError('Please add at least one analyte measurement to submit this encounter.');
      return;
    }

    // Validate all numeric rows
    for (const r of rows) {
      if (!r.value || isNaN(parseFloat(r.value))) {
        setError(`Please provide a valid quantitative numeric value for analyte: ${r.analyte.name}`);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        patient_id: selectedPatientId,
        accession_number: accessionNumber,
        sample_type: sampleType,
        fasting_status: fastingStatus,
        clinical_notes: clinicalNotes || undefined,
        results: rows.map((r) => ({
          analyte_id: r.analyte.id,
          value_numeric: parseFloat(r.value),
          unit: r.unit,
          notes: r.notes || undefined,
        })),
      };

      const res = await api.post<any>('/labs/encounters', payload);
      // Navigate to interpretation engine for immediate clinical verification
      navigate(`/interpretations?encounter_id=${res.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save manual laboratory results to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#17365D]">Manual Laboratory Data Entry</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Accessioning, clinical specimen intake, standard panel presets, and live reference range evaluation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-[#F0FDF4] border border-[#DCFCE7] text-[11px] font-medium text-[#15803D] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Direct DB Persistence
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Container */}
      <form onSubmit={handleSubmitEncounter} className="space-y-6">
        {/* Patient & Accession Identification Card */}
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#17365D] flex items-center gap-2">
            <User className="w-4 h-4 text-[#2563EB]" />
            Patient Demographics & Specimen Accession Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Patient Selector */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                Select Patient Cohort <span className="text-[#DC2626]">*</span>
              </label>
              <select
                required
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-[#E5EAF1] rounded-lg text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
              >
                {patients.length === 0 ? (
                  <option value="">No patients registered in database</option>
                ) : (
                  patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.mrn} — {p.full_name} ({p.biological_sex}, {p.age_years} yrs)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Accession Number */}
            <div>
              <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                Accession Number <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                required
                value={accessionNumber}
                onChange={(e) => setAccessionNumber(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-[#E5EAF1] rounded-lg text-xs font-mono font-bold text-[#17365D] focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            {/* Sample Type */}
            <div>
              <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                Specimen Specie / Matrix
              </label>
              <select
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-[#E5EAF1] rounded-lg text-xs text-[#172B4D] font-mono focus:border-[#2563EB] focus:outline-none"
              >
                <option value="SERUM">SERUM (Gold Top/SST)</option>
                <option value="PLASMA">PLASMA (Heparin/Green Top)</option>
                <option value="WHOLE_BLOOD">WHOLE BLOOD (EDTA/Lavender)</option>
                <option value="URINE">URINE (Clean Catch)</option>
                <option value="CSF">CSF (Cerebrospinal Fluid)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
            {/* Fasting Status */}
            <div>
              <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                Fasting Status
              </label>
              <select
                value={fastingStatus}
                onChange={(e) => setFastingStatus(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-[#E5EAF1] rounded-lg text-xs text-[#172B4D] font-mono focus:border-[#2563EB] focus:outline-none"
              >
                <option value="FASTING">Fasting (10-12 hrs)</option>
                <option value="RANDOM">Random / Non-fasting</option>
                <option value="POSTPRANDIAL">2-Hour Postprandial</option>
              </select>
            </div>

            {/* Clinical Notes */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                Clinical Context & Indication
              </label>
              <input
                type="text"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="e.g. Suspected acute kidney injury, metabolic acidosis, dehydration..."
                className="w-full h-9 px-3 bg-white border border-[#E5EAF1] rounded-lg text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Panel Presets & Add Analyte Toolbar */}
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-[#17365D] uppercase tracking-wider block">
                Standard Laboratory Panel Presets
              </span>
              <span className="text-[11px] text-[#64748B]">
                Populate standard analyte batteries with a single click:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadBMP}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#EAF2FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#dbeafe] transition-colors"
              >
                Basic Metabolic (BMP)
              </button>
              <button
                type="button"
                onClick={loadCMP}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#EAF2FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#dbeafe] transition-colors"
              >
                Comprehensive (CMP)
              </button>
              <button
                type="button"
                onClick={loadLFT}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#EAF2FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#dbeafe] transition-colors"
              >
                Hepatic (LFT)
              </button>
              <button
                type="button"
                onClick={loadLipid}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#EAF2FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#dbeafe] transition-colors"
              >
                Lipid Panel
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5EAF1] flex items-center gap-3">
            <span className="text-[11px] text-[#64748B] font-medium">Or add individual test:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addAnalyte(e.target.value);
                  e.target.value = '';
                }
              }}
              className="h-8 px-2.5 bg-white border border-[#E5EAF1] rounded-lg text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="">+ Select test to add...</option>
              {allAnalytes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code}) — {a.category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Analyte Quantitative Input Table */}
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#17365D]">
                Quantitative Analyte Measurements ({rows.length})
              </h2>
              <p className="text-[11px] text-[#64748B]">
                Real-time out-of-range flag evaluation against patient-specific Tietz reference ranges.
              </p>
            </div>

            {rows.length > 0 && (
              <button
                type="button"
                onClick={() => setRows([])}
                className="text-[11px] text-[#DC2626] hover:underline font-medium"
              >
                Clear All Rows
              </button>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
              <FlaskConical className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
              <p className="font-semibold text-[#17365D]">No analytes added to this accession</p>
              <p className="text-[11px] mt-0.5">Click a panel preset above (BMP, CMP, LFT) or add an individual test.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5EAF1] text-[#64748B] font-mono text-[10px] uppercase">
                    <th className="py-2.5 px-3">Analyte / Code</th>
                    <th className="py-2.5 px-3 w-36">Measured Value</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Traceable Reference Interval</th>
                    <th className="py-2.5 px-3">Live Flag</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF1] text-[#172B4D]">
                  {rows.map((row, idx) => {
                    const flagInfo = getAnalyteFlag(row);
                    const refString = getAppliedRangeString(row);
                    return (
                      <tr key={row.analyte.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-[#17365D] block">{row.analyte.name}</span>
                          <span className="text-[10px] text-[#64748B] font-mono">{row.analyte.code} • {row.analyte.category}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="0.0"
                            value={row.value}
                            onChange={(e) => updateRow(idx, 'value', e.target.value)}
                            className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded text-xs font-mono font-bold text-[#17365D] focus:border-[#2563EB] focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#64748B]">{row.unit}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#64748B]">{refString}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${flagInfo.badge}`}>
                            {flagInfo.flag}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Optional note..."
                            value={row.notes}
                            onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                            className="w-full h-8 px-2 bg-white border border-[#E5EAF1] rounded text-[11px] text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="p-1 rounded text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Submit Toolbar */}
          <div className="pt-4 border-t border-[#E5EAF1] flex items-center justify-between">
            <span className="text-[11px] text-[#64748B]">
              Submitting registers the accession and directs immediately to the biochemical interpretation engine.
            </span>

            <button
              type="submit"
              disabled={isSubmitting || rows.length === 0}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#122b4a] rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Persisting Records...' : 'Save Encounter & Run Interpretation'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

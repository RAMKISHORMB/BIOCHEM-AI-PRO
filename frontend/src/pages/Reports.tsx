import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  ShieldCheck,
  RefreshCw,
  Printer
} from 'lucide-react';

interface EncounterItem {
  id: string;
  accession_number: string;
  sample_collected_at: string;
  sample_type: string;
  clinical_status: string;
  fasting_status: string;
  patient_id: string;
  patient_mrn: string;
  patient_name: string;
  results_count: number;
}

export const Reports: React.FC = () => {
  const [encounters, setEncounters] = useState<EncounterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEncounter, setSelectedEncounter] = useState<EncounterItem | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [downloadingCsv, setDownloadingCsv] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEncounters = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<any>('/labs/encounters?page=1&size=50');
      const mapped: EncounterItem[] = (res.items || []).map((e: any) => ({
        id: e.id,
        accession_number: e.accession_number,
        sample_collected_at: e.sample_collected_at,
        sample_type: e.sample_type,
        clinical_status: e.clinical_status,
        fasting_status: e.fasting_status,
        patient_id: e.patient_id,
        patient_mrn: e.patient?.mrn || 'N/A',
        patient_name: e.patient?.full_name || 'N/A',
        results_count: e.results ? e.results.length : 0,
      }));
      setEncounters(mapped);
      if (mapped.length > 0 && !selectedEncounter) {
        setSelectedEncounter(mapped[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch laboratory encounters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEncounters();
  }, []);

  const handleDownloadPdf = async (encounter: EncounterItem) => {
    try {
      setDownloadingPdf(encounter.id);
      const blob = await api.get<Blob>(`/reports/encounters/${encounter.id}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BiochemReport_${encounter.accession_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err?.message || 'Failed to download PDF report.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDownloadCsv = async (encounter: EncounterItem) => {
    try {
      setDownloadingCsv(encounter.id);
      const blob = await api.get<Blob>(`/reports/encounters/${encounter.id}/csv`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BiochemResults_${encounter.accession_number}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err?.message || 'Failed to download CSV export.');
    } finally {
      setDownloadingCsv(null);
    }
  };

  const handleDownloadPatientHistoryCsv = async (patientId: string, mrn: string) => {
    try {
      const blob = await api.get<Blob>(`/reports/patients/${patientId}/csv`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PatientHistory_${mrn}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err?.message || 'Failed to export patient history CSV.');
    }
  };

  const filtered = encounters.filter(
    (e) =>
      e.accession_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.patient_mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#17365D]">Clinical Reports & Exports</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            CLIA/CAP-aligned PDF clinical biochemistry reports with traceable reference intervals, calculated indices, and CSV exports.
          </p>
        </div>

        <button
          onClick={fetchEncounters}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#E5EAF1] text-xs font-medium text-[#172B4D] transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#64748B] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: List of Encounters on Left, Preview Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Encounters Table Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
              <span className="text-xs font-bold text-[#17365D] uppercase tracking-wider">
                Laboratory Accessions ({filtered.length})
              </span>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Search Accession, MRN, Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#172B4D] placeholder-[#64748B] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2563EB]" />
                <span>Loading accessions...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                No laboratory accessions found. Enter lab data in "Manual Lab Entry" to generate reports.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5EAF1] text-[#64748B] font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-3">Accession</th>
                      <th className="py-2.5 px-3">Patient / MRN</th>
                      <th className="py-2.5 px-3">Collection Date</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF1] text-[#172B4D]">
                    {filtered.map((enc) => {
                      const isSelected = selectedEncounter?.id === enc.id;
                      return (
                        <tr
                          key={enc.id}
                          onClick={() => setSelectedEncounter(enc)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#EAF2FF]/70' : 'hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-[#17365D] block">{enc.accession_number}</span>
                            <span className="text-[10px] text-[#2563EB] font-mono">{enc.sample_type}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-[#17365D] block">{enc.patient_name}</span>
                            <span className="text-[10px] font-mono text-[#64748B]">{enc.patient_mrn}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-[#64748B]">
                            {new Date(enc.sample_collected_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleDownloadPdf(enc)}
                                disabled={downloadingPdf === enc.id}
                                title="Download Official PDF Report"
                                className="p-1.5 rounded-lg bg-white text-[#2563EB] border border-[#E5EAF1] hover:bg-[#EAF2FF] transition-colors"
                              >
                                <FileText className={`w-3.5 h-3.5 ${downloadingPdf === enc.id ? 'animate-pulse' : ''}`} />
                              </button>
                              <button
                                onClick={() => handleDownloadCsv(enc)}
                                disabled={downloadingCsv === enc.id}
                                title="Export CSV"
                                className="p-1.5 rounded-lg bg-white text-[#64748B] border border-[#E5EAF1] hover:bg-[#F8FAFC] transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Selected Report Preview & Actions */}
        <div className="lg:col-span-5 space-y-4">
          {!selectedEncounter ? (
            <div className="p-12 text-center text-xs text-[#64748B] bg-white border border-[#E5EAF1] rounded-xl shadow-card">
              <FileText className="w-8 h-8 mx-auto mb-2 text-[#94A3B8]" />
              <p>Select an accession on the left to preview report options.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-4">
              <div className="border-b border-[#E5EAF1] pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#2563EB] uppercase font-bold">
                    Clinical Document Dossier
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7] flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3 h-3 text-[#15803D]" />
                    CLIA Standard
                  </span>
                </div>
                <h2 className="text-base font-bold text-[#17365D] mt-1">
                  Accession #{selectedEncounter.accession_number}
                </h2>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#E5EAF1]">
                  <span className="text-[#64748B]">Patient:</span>
                  <span className="text-[#17365D] font-bold font-sans">{selectedEncounter.patient_name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E5EAF1]">
                  <span className="text-[#64748B]">MRN:</span>
                  <span className="text-[#2563EB] font-bold">{selectedEncounter.patient_mrn}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E5EAF1]">
                  <span className="text-[#64748B]">Specimen Matrix:</span>
                  <span className="text-[#17365D]">{selectedEncounter.sample_type}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E5EAF1]">
                  <span className="text-[#64748B]">Fasting State:</span>
                  <span className="text-[#17365D]">{selectedEncounter.fasting_status}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E5EAF1]">
                  <span className="text-[#64748B]">Collection Date:</span>
                  <span className="text-[#17365D]">
                    {new Date(selectedEncounter.sample_collected_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#64748B]">Status:</span>
                  <span className="text-[#15803D] font-bold">{selectedEncounter.clinical_status}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E5EAF1] space-y-2">
                <button
                  onClick={() => handleDownloadPdf(selectedEncounter)}
                  disabled={downloadingPdf === selectedEncounter.id}
                  className="w-full h-10 flex items-center justify-center gap-2 px-4 rounded-lg text-xs font-semibold text-white bg-[#17365D] hover:bg-[#122b4a] transition-colors shadow-sm disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>
                    {downloadingPdf === selectedEncounter.id
                      ? 'Compiling Clinical PDF...'
                      : 'Download Official PDF Report'}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDownloadCsv(selectedEncounter)}
                    disabled={downloadingCsv === selectedEncounter.id}
                    className="h-9 flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-medium text-[#172B4D] bg-white hover:bg-[#F8FAFC] border border-[#E5EAF1] transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() =>
                      handleDownloadPatientHistoryCsv(selectedEncounter.patient_id, selectedEncounter.patient_mrn)
                    }
                    className="h-9 flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-medium text-[#2563EB] bg-[#EAF2FF] hover:bg-[#dbeafe] border border-[#BFDBFE] transition-colors shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>All Visits (CSV)</span>
                  </button>
                </div>
              </div>

              {/* Regulatory Notice */}
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1] text-[11px] text-[#64748B]">
                <p>
                  Official clinical report PDFs include traceable Tietz reference ranges, out-of-range flag badges, calculated physiological indices, and required clinical biochemist signature blocks.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;

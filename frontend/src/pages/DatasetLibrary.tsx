import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Database,
  Upload,
  RefreshCw,
  Search,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Filter,
  Sparkles,
  ExternalLink,
  Table,
  Sliders,
  Play
} from 'lucide-react';

export interface MLDataset {
  id: string;
  name: string;
  description: string;
  target_column: string;
  feature_columns: string[];
  row_count: number;
  dataset_type: 'DEMONSTRATION' | 'RESEARCH' | 'CLINICAL';
  version: string;
  file_format: string;
  created_at: string;
}

export const DatasetLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<MLDataset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState<string>('');
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [uploadTarget, setUploadTarget] = useState<string>('');
  const [uploadType, setUploadType] = useState<string>('RESEARCH');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<MLDataset[]>('/ml/datasets');
      setDatasets(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch registered datasets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleSeedBenchmarks = async () => {
    try {
      setSeeding(true);
      setError(null);
      await api.post('/ml/datasets/seed-benchmark');
      setSuccess('Standard benchmark biomedical cohorts seeded into registry successfully.');
      await fetchDatasets();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to seed benchmark datasets.');
    } finally {
      setSeeding(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setUploadFile(f);
      if (!uploadName) {
        const cleanName = f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setUploadName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a CSV or Excel (.xlsx) file to upload.');
      return;
    }
    if (!uploadName.trim()) {
      setUploadError('Please provide a dataset name.');
      return;
    }
    if (!uploadTarget.trim()) {
      setUploadError('Please specify the exact target variable name.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', uploadName.trim());
      formData.append('description', uploadDescription.trim());
      formData.append('target_column', uploadTarget.trim());
      formData.append('dataset_type', uploadType);

      await api.upload('/ml/datasets/upload', formData);
      setSuccess(`Dataset '${uploadName}' uploaded and validated successfully.`);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadName('');
      setUploadDescription('');
      setUploadTarget('');
      await fetchDatasets();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setUploadError(err?.message || 'Upload validation failed. Verify target column and file format.');
    } finally {
      setUploading(false);
    }
  };

  const filteredDatasets = datasets.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.target_column.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || d.dataset_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'CLINICAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
            Real Clinical Cohort
          </span>
        );
      case 'RESEARCH':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
            Research Benchmark
          </span>
        );
      case 'DEMONSTRATION':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
            Demonstration Cohort
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#E5EAF1] shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#172B4D] tracking-tight">Dataset Library</h1>
              <p className="text-xs text-[#64748B]">
                Curated biomedical cohorts, raw CSV/Excel spreadsheet uploads, and data quality provenance records.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSeedBenchmarks}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-[#E5EAF1] text-[#172B4D] hover:bg-[#F7F9FC] transition-colors disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-[#2563EB] ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Seeding...' : 'Seed Benchmarks'}</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Dataset (CSV / XLSX)</span>
          </button>
        </div>
      </div>

      {/* Clinical Disclaimer Alert */}
      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[#92400E] leading-relaxed">
          <span className="font-bold text-[#B45309]">Biomedical Governance Notice:</span> All raw datasets uploaded to
          BIOCHEM AI PRO remain strictly immutable. Preprocessing pipelines and scaling factors are fitted solely on
          isolated training partitions with guaranteed zero data leakage. Synthetic and research cohorts are explicitly
          labeled and must not be used as clinical patient evidence without IRB authorization.
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl text-xs text-[#15803D] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search datasets, targets, biomarkers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-[#F7F9FC]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#64748B]" />
          <span className="text-xs font-medium text-[#64748B]">Provenance:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-[#E5EAF1] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-[#F7F9FC]"
          >
            <option value="ALL">All Cohort Types</option>
            <option value="DEMONSTRATION">Demonstration</option>
            <option value="RESEARCH">Research</option>
            <option value="CLINICAL">Clinical</option>
          </select>
        </div>
      </div>

      {/* Dataset Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-16 text-[#2563EB]">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      ) : filteredDatasets.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-[#E5EAF1] shadow-card space-y-3">
          <Database className="w-10 h-10 text-[#94A3B8] mx-auto" />
          <h3 className="text-sm font-semibold text-[#172B4D]">No Datasets Found</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            No matching datasets in registry. Upload your laboratory CSV/Excel file or seed the standard benchmark
            cohorts.
          </p>
          <button
            onClick={handleSeedBenchmarks}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Seed Standard Benchmark Cohorts
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDatasets.map((ds) => (
            <div
              key={ds.id}
              className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card hover:border-[#2563EB]/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F7F9FC] border border-[#E5EAF1] flex items-center justify-center text-[#2563EB]">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>{getTypeBadge(ds.dataset_type)}</div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#172B4D] leading-snug">{ds.name}</h3>
                  <p className="text-xs text-[#64748B] mt-1 line-clamp-2 leading-relaxed">
                    {ds.description || 'Clinical biochemistry laboratory cohort for predictive modeling.'}
                  </p>
                </div>

                <div className="bg-[#F7F9FC] border border-[#E5EAF1] rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Target Variable:</span>
                    <span className="font-semibold text-[#172B4D] font-mono">{ds.target_column}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Cohort Samples:</span>
                    <span className="font-semibold text-[#172B4D]">{ds.row_count.toLocaleString()} rows</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Features:</span>
                    <span className="font-semibold text-[#172B4D]">{ds.feature_columns.length} analytes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Format:</span>
                    <span className="font-semibold uppercase text-[#172B4D]">{ds.file_format || 'CSV'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {ds.feature_columns.slice(0, 5).map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]"
                    >
                      {f}
                    </span>
                  ))}
                  {ds.feature_columns.length > 5 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#F1F5F9] text-[#64748B]">
                      +{ds.feature_columns.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-[#E5EAF1] flex items-center gap-2">
                <button
                  onClick={() => navigate(`/ml/explorer?id=${ds.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg bg-white border border-[#E5EAF1] text-[#172B4D] hover:bg-[#F7F9FC] transition-colors"
                  title="Explore distributions, quality reports, and correlations"
                >
                  <Table className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Explorer</span>
                </button>

                <button
                  onClick={() => navigate(`/ml/preprocessing?id=${ds.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg bg-white border border-[#E5EAF1] text-[#172B4D] hover:bg-[#F7F9FC] transition-colors"
                  title="Configure missing value imputations and feature scaling"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Preprocess</span>
                </button>

                <button
                  onClick={() => navigate(`/ml/training?id=${ds.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors"
                  title="Train predictive machine learning model"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Train</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5EAF1] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-base font-bold text-[#172B4D]">Upload Biomedical Dataset</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-[#64748B] hover:text-[#172B4D] text-lg font-bold"
              >
                ×
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                  Spreadsheet File (.CSV or .XLSX) *
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv"
                  onChange={handleFileChange}
                  required
                  className="w-full text-xs text-[#64748B] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EFF6FF] file:text-[#1D4ED8] hover:file:bg-[#DBEAFE] border border-[#E5EAF1] rounded-lg p-1.5 bg-[#F7F9FC]"
                />
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Supports comma/semicolon/tab delimited CSVs and Microsoft Excel workbooks.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Dataset Name *</label>
                <input
                  type="text"
                  placeholder="e.g. ICU Sepsis Biomarker Panel 2026"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-[#F7F9FC]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Target Variable Column *</label>
                <input
                  type="text"
                  placeholder="e.g. sepsis_positive or decompensation_score"
                  value={uploadTarget}
                  onChange={(e) => setUploadTarget(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-[#F7F9FC] font-mono"
                />
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Must match the exact column header of the variable you intend to classify or regress.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Dataset Provenance Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-[#F7F9FC]"
                >
                  <option value="RESEARCH">Research Dataset (De-identified cohort)</option>
                  <option value="CLINICAL">Clinical Laboratory Dataset (Direct LIS feed)</option>
                  <option value="DEMONSTRATION">Demonstration / Educational Dataset</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">Clinical Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional details regarding inclusion criteria, specimen collection, or analyte panel..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-[#F7F9FC]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5EAF1]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-[#E5EAF1] text-[#64748B] hover:bg-[#F7F9FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Parsing & Profiling...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Confirm & Register</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatasetLibrary;

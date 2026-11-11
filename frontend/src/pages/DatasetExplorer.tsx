import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Table,
  BarChart2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Play,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Database,
  Hash,
  Activity,
  FileSpreadsheet,
  Info,
  Scale,
  Sparkles,
  Target
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';

interface ColumnMeta {
  name: string;
  type: string;
  missing: number;
  missing_pct: number;
  unique_count: number;
  sample_values: any[];
}

interface HistogramBin {
  bin_label: string;
  bin_start: number;
  bin_end: number;
  count: number;
  percentage: number;
}

interface RegressionMetrics {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  unique_count: number;
  skewness: number;
  q25: number;
  q50: number;
  q75: number;
  iqr: number;
  outlier_count: number;
  outlier_percentage: number;
  outlier_method: string;
  lower_fence: number;
  upper_fence: number;
  histogram: HistogramBin[];
}

interface ClassSummary {
  class_label: string;
  count: number;
  percentage: number;
}

interface ClassificationMetrics {
  num_classes: number;
  classes: ClassSummary[];
  majority_class: ClassSummary;
  minority_class: ClassSummary;
  majority_minority_ratio: number;
  has_imbalance: boolean;
  imbalance_level: string;
  imbalance_warning: string | null;
  bar_chart_data: { name: string; count: number; percentage: number }[];
}

interface ValidationStrategyInfo {
  name: string;
  is_stratified: boolean;
  cv_method: string;
  test_split_ratio: number;
  rationale: string;
}

interface TargetAnalysis {
  target_column: string;
  total_count: number;
  missing_count: number;
  missing_percentage: number;
  valid_count: number;
  unique_count: number;
  detected_type: 'regression' | 'binary_classification' | 'multiclass_classification' | 'unsuitable';
  effective_type: 'regression' | 'binary_classification' | 'multiclass_classification' | 'unsuitable';
  is_override: boolean;
  override_type?: string | null;
  override_reason?: string | null;
  type_reasoning: string;
  is_suitable: boolean;
  suitability_warnings: string[];
  validation_strategy: ValidationStrategyInfo;
  regression_metrics?: RegressionMetrics | null;
  classification_metrics?: ClassificationMetrics | null;
}

interface DatasetDetail {
  id: string;
  name: string;
  description: string;
  target_column: string;
  feature_columns: string[];
  row_count: number;
  dataset_type: string;
  version: string;
  file_format: string;
  completeness_score: number;
  duplicate_rows: number;
  numerical_columns: string[];
  categorical_columns: string[];
  columns_meta: ColumnMeta[];
  stats_numerical: Record<string, any>;
  stats_categorical: Record<string, any>;
  sample_rows: Record<string, any>[];
  target_analysis?: TargetAnalysis | null;
  created_at: string;
}

interface DatasetListOption {
  id: string;
  name: string;
  dataset_type: string;
}

export const DatasetExplorer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [datasetList, setDatasetList] = useState<DatasetListOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>(searchParams.get('id') || '');
  const [detail, setDetail] = useState<DatasetDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Explorer Tab: preview, stats, correlations, target
  const [activeTab, setActiveTab] = useState<'preview' | 'stats' | 'correlations' | 'target'>('preview');

  // Preview pagination
  const [pageOffset, setPageOffset] = useState<number>(0);
  const pageSize = 15;
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [totalPreviewRows, setTotalPreviewRows] = useState<number>(0);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  // Correlations
  const [correlations, setCorrelations] = useState<Record<string, Record<string, number>>>({});

  // Target Analysis & Auditable Override
  const [selectedTargetCol, setSelectedTargetCol] = useState<string>('');
  const [targetOverride, setTargetOverride] = useState<string>('');
  const [targetAnalysis, setTargetAnalysis] = useState<TargetAnalysis | null>(null);
  const [loadingTargetAnalysis, setLoadingTargetAnalysis] = useState<boolean>(false);

  // 1. Fetch available datasets list
  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await api.get<DatasetListOption[]>('/ml/datasets');
        setDatasetList(res);
        if (res.length > 0 && !selectedId) {
          const firstId = res[0].id;
          setSelectedId(firstId);
          setSearchParams({ id: firstId });
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch dataset list.');
      }
    };
    fetchList();
  }, []);

  // 2. Fetch dataset detail when selectedId changes
  useEffect(() => {
    if (!selectedId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        setPageOffset(0);

        const [detailRes, corrRes] = await Promise.all([
          api.get<DatasetDetail>(`/ml/datasets/${selectedId}`),
          api.get<{ correlations: Record<string, Record<string, number>> }>(
            `/ml/datasets/${selectedId}/correlations`
          ).catch(() => ({ correlations: {} }))
        ]);

        setDetail(detailRes);
        setCorrelations(corrRes.correlations || {});
      } catch (err: any) {
        setError(err?.message || 'Failed to inspect dataset quality and schema.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [selectedId]);

  // 3. Fetch paginated preview rows
  useEffect(() => {
    if (!selectedId) return;
    const fetchPreview = async () => {
      try {
        setLoadingPreview(true);
        const res = await api.get<{
          total_rows: number;
          rows: Record<string, any>[];
        }>(`/ml/datasets/${selectedId}/preview?offset=${pageOffset}&limit=${pageSize}`);
        setPreviewRows(res.rows);
        setTotalPreviewRows(res.total_rows);
      } catch (err: any) {
        console.error('Failed to load preview page', err);
      } finally {
        setLoadingPreview(false);
      }
    };
    fetchPreview();
  }, [selectedId, pageOffset]);

  // 4. Fetch / Update Target Analysis whenever target column or override changes
  useEffect(() => {
    if (!selectedId) return;
    const fetchTarget = async () => {
      try {
        setLoadingTargetAnalysis(true);
        const colQuery = selectedTargetCol ? `&target_column=${encodeURIComponent(selectedTargetCol)}` : '';
        const overrideQuery = targetOverride ? `&override_type=${encodeURIComponent(targetOverride)}` : '';
        const res = await api.get<TargetAnalysis>(
          `/ml/datasets/${selectedId}/target-analysis?${colQuery}${overrideQuery}`
        );
        setTargetAnalysis(res);
      } catch (err: any) {
        console.error('Failed to load target distribution', err);
      } finally {
        setLoadingTargetAnalysis(false);
      }
    };
    fetchTarget();
  }, [selectedId, selectedTargetCol, targetOverride]);

  // Synchronize default target when detail loads
  useEffect(() => {
    if (detail) {
      if (!selectedTargetCol) {
        setSelectedTargetCol(detail.target_column);
      }
      if (detail.target_analysis && !targetAnalysis) {
        setTargetAnalysis(detail.target_analysis);
      }
    }
  }, [detail]);

  const handleDatasetChange = (newId: string) => {
    setSelectedId(newId);
    setSelectedTargetCol('');
    setTargetOverride('');
    setSearchParams({ id: newId });
  };

  // Prepare chart data for numerical statistics
  const numericalChartData = detail
    ? detail.numerical_columns.slice(0, 10).map((col) => ({
        name: col,
        mean: detail.stats_numerical[col]?.mean || 0,
        min: detail.stats_numerical[col]?.min || 0,
        max: detail.stats_numerical[col]?.max || 0,
        missing_pct: detail.stats_numerical[col]?.missing_pct || 0
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#E5EAF1] shadow-card">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/ml/datasets')}
            className="p-2 rounded-lg border border-[#E5EAF1] hover:bg-[#F7F9FC] text-[#64748B]"
            title="Return to Dataset Library"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#172B4D] tracking-tight">Dataset Explorer</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                Quality & Profile
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Inspect raw laboratory data, missingness distribution, duplicate detection, and Pearson biomarker correlations.
            </p>
          </div>
        </div>

        {/* Dataset Selector Dropdown */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-semibold text-[#64748B]">Active Cohort:</label>
          <select
            value={selectedId}
            onChange={(e) => handleDatasetChange(e.target.value)}
            className="text-xs border border-[#E5EAF1] rounded-lg px-3 py-2 bg-[#F7F9FC] text-[#172B4D] font-semibold focus:outline-none focus:ring-1 focus:ring-[#2563EB] min-w-[220px]"
          >
            {datasetList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.dataset_type})
              </option>
            ))}
          </select>

          <button
            onClick={() => navigate(`/ml/preprocessing?id=${selectedId}`)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-[#E5EAF1] text-[#172B4D] hover:bg-[#F7F9FC]"
          >
            <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Preprocess</span>
          </button>

          <button
            onClick={() => navigate(`/ml/training?id=${selectedId}`)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Train Model</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading || !detail ? (
        <div className="flex items-center justify-center p-20 text-[#2563EB]">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* Data Quality KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                Completeness Score
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-[#15803D]">{detail.completeness_score}%</span>
                <span className="text-[11px] text-[#64748B]">non-missing cells</span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#15803D] h-full rounded-full"
                  style={{ width: `${Math.min(100, detail.completeness_score)}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                Total Samples
              </span>
              <div className="text-xl font-bold text-[#172B4D] mt-1">
                {detail.row_count.toLocaleString()}
              </div>
              <span className="text-[11px] text-[#64748B]">clinical observations</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                Feature Space
              </span>
              <div className="text-xl font-bold text-[#172B4D] mt-1">
                {detail.feature_columns.length}
              </div>
              <span className="text-[11px] text-[#64748B]">
                {detail.numerical_columns.length} num • {detail.categorical_columns.length} cat
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                Duplicate Rows
              </span>
              <div className="text-xl font-bold text-[#172B4D] mt-1">
                {detail.duplicate_rows}
              </div>
              <span className="text-[11px] text-[#64748B]">
                {detail.duplicate_rows === 0 ? 'No duplicates detected' : 'Requires deduplication'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                Target Variable
              </span>
              <div className="text-base font-bold text-[#2563EB] font-mono mt-1 truncate">
                {detail.target_column}
              </div>
              <span className="text-[11px] text-[#64748B]">Registered prediction label</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white border-b border-[#E5EAF1] px-4 rounded-t-xl flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Raw Data Preview ({totalPreviewRows})</span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Descriptive Statistics</span>
            </button>

            <button
              onClick={() => setActiveTab('correlations')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'correlations'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Correlation Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('target')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'target'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Target & Label Distribution</span>
            </button>
          </div>

          {/* TAB 1: RAW DATA PREVIEW */}
          {activeTab === 'preview' && (
            <div className="bg-white rounded-b-xl border border-t-0 border-[#E5EAF1] shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>
                  Showing rows <strong>{pageOffset + 1}</strong> to{' '}
                  <strong>{Math.min(pageOffset + pageSize, totalPreviewRows)}</strong> of{' '}
                  <strong>{totalPreviewRows}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={pageOffset === 0 || loadingPreview}
                    onClick={() => setPageOffset(Math.max(0, pageOffset - pageSize))}
                    className="p-1.5 rounded border border-[#E5EAF1] hover:bg-[#F7F9FC] disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-mono text-xs">
                    Page {Math.floor(pageOffset / pageSize) + 1} of{' '}
                    {Math.ceil(totalPreviewRows / pageSize) || 1}
                  </span>
                  <button
                    disabled={pageOffset + pageSize >= totalPreviewRows || loadingPreview}
                    onClick={() => setPageOffset(pageOffset + pageSize)}
                    className="p-1.5 rounded border border-[#E5EAF1] hover:bg-[#F7F9FC] disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-[#E5EAF1] rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F7F9FC] border-b border-[#E5EAF1] font-semibold text-[#172B4D]">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-[#E5EAF1] w-12 text-center text-[#94A3B8]">#</th>
                      {detail.columns_meta.map((col) => (
                        <th key={col.name} className="py-2.5 px-3 border-r border-[#E5EAF1] whitespace-nowrap">
                          <div className="flex items-center justify-between gap-2">
                            <span className={col.name === detail.target_column ? 'text-[#2563EB] font-bold' : ''}>
                              {col.name}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                col.type === 'numerical'
                                  ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                                  : 'bg-[#FEF3C7] text-[#92400E]'
                              }`}
                            >
                              {col.type.slice(0, 3)}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF1] font-mono">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC]">
                        <td className="py-2 px-3 border-r border-[#E5EAF1] text-center text-[#94A3B8] text-[11px]">
                          {pageOffset + idx + 1}
                        </td>
                        {detail.columns_meta.map((col) => {
                          const val = row[col.name];
                          const isTarget = col.name === detail.target_column;
                          return (
                            <td
                              key={col.name}
                              className={`py-2 px-3 border-r border-[#E5EAF1] whitespace-nowrap ${
                                isTarget ? 'bg-[#EFF6FF]/40 font-semibold text-[#172B4D]' : 'text-[#334155]'
                              }`}
                            >
                              {val === null || val === undefined ? (
                                <span className="text-[#DC2626] italic">NaN</span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DESCRIPTIVE STATISTICS */}
          {activeTab === 'stats' && (
            <div className="bg-white rounded-b-xl border border-t-0 border-[#E5EAF1] shadow-card p-5 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-2">
                  Numerical Features Distribution (Mean Values)
                </h3>
                <div className="h-48 w-full bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF1]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={numericalChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E5EAF1',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="mean" fill="#2563EB" radius={[4, 4, 0, 0]} name="Mean Value" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Numerical Table */}
              <div>
                <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-2">
                  Numerical Analyte Metrics & Outlier Counts
                </h3>
                <div className="overflow-x-auto border border-[#E5EAF1] rounded-lg">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="bg-[#F7F9FC] text-[#172B4D] font-sans font-semibold border-b border-[#E5EAF1]">
                      <tr>
                        <th className="py-2.5 px-3">Analyte</th>
                        <th className="py-2.5 px-3">Count</th>
                        <th className="py-2.5 px-3">Mean</th>
                        <th className="py-2.5 px-3">Std</th>
                        <th className="py-2.5 px-3">Min</th>
                        <th className="py-2.5 px-3">25%</th>
                        <th className="py-2.5 px-3">50% (Median)</th>
                        <th className="py-2.5 px-3">75%</th>
                        <th className="py-2.5 px-3">Max</th>
                        <th className="py-2.5 px-3">Missing</th>
                        <th className="py-2.5 px-3">Outliers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF1]">
                      {detail.numerical_columns.map((col) => {
                        const s = detail.stats_numerical[col] || {};
                        return (
                          <tr key={col} className="hover:bg-[#F8FAFC]">
                            <td className="py-2 px-3 font-semibold font-sans text-[#172B4D]">{col}</td>
                            <td className="py-2 px-3">{s.count ?? '—'}</td>
                            <td className="py-2 px-3">{s.mean ?? '—'}</td>
                            <td className="py-2 px-3">{s.std ?? '—'}</td>
                            <td className="py-2 px-3">{s.min ?? '—'}</td>
                            <td className="py-2 px-3">{s['25%'] ?? '—'}</td>
                            <td className="py-2 px-3 font-semibold text-[#2563EB]">{s['50%'] ?? '—'}</td>
                            <td className="py-2 px-3">{s['75%'] ?? '—'}</td>
                            <td className="py-2 px-3">{s.max ?? '—'}</td>
                            <td className="py-2 px-3">
                              {s.missing > 0 ? (
                                <span className="text-[#DC2626] font-semibold">{s.missing} ({s.missing_pct}%)</span>
                              ) : (
                                <span className="text-[#15803D]">0</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-[#B45309]">{s.outliers_count ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Categorical Breakdown if present */}
              {detail.categorical_columns.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-2">
                    Categorical Features Overview
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {detail.categorical_columns.map((col) => {
                      const c = detail.stats_categorical[col] || {};
                      return (
                        <div key={col} className="border border-[#E5EAF1] rounded-lg p-3 bg-[#F7F9FC] text-xs">
                          <div className="flex justify-between items-center mb-2 font-semibold text-[#172B4D]">
                            <span>{col}</span>
                            <span className="text-[11px] text-[#64748B]">{c.unique_count} distinct categories</span>
                          </div>
                          <div className="text-[11px] text-[#64748B] mb-2">
                            Mode: <strong>{c.mode}</strong> | Missing: {c.missing}
                          </div>
                          <div className="space-y-1">
                            {c.top_categories?.map((tc: any) => (
                              <div key={tc.category} className="flex justify-between text-[11px]">
                                <span className="font-mono text-[#334155]">{tc.category}</span>
                                <span className="font-semibold">{tc.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CORRELATION MATRIX */}
          {activeTab === 'correlations' && (
            <div className="bg-white rounded-b-xl border border-t-0 border-[#E5EAF1] shadow-card p-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                  Pearson Biomarker Correlation Heatmap
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Values close to +1.0 indicate strong positive co-variation; values close to -1.0 indicate inverse physiological correlation.
                </p>
              </div>

              {Object.keys(correlations).length === 0 ? (
                <div className="p-8 text-center text-xs text-[#64748B]">
                  Insufficient numerical columns to compute Pearson correlation matrix.
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#E5EAF1] rounded-lg">
                  <table className="w-full text-center text-xs border-collapse font-mono">
                    <thead className="bg-[#F7F9FC] border-b border-[#E5EAF1]">
                      <tr>
                        <th className="py-2 px-3 border-r border-[#E5EAF1] text-left font-sans font-semibold text-[#172B4D]">
                          Analyte
                        </th>
                        {Object.keys(correlations).map((c) => (
                          <th key={c} className="py-2 px-2 border-r border-[#E5EAF1] text-center font-semibold text-[#172B4D]">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF1]">
                      {Object.keys(correlations).map((rowCol) => (
                        <tr key={rowCol}>
                          <td className="py-2 px-3 border-r border-[#E5EAF1] text-left font-sans font-semibold text-[#172B4D]">
                            {rowCol}
                          </td>
                          {Object.keys(correlations).map((colCol) => {
                            const val = correlations[rowCol]?.[colCol] ?? 0;
                            let bg = 'bg-white';
                            let textCol = 'text-[#64748B]';

                            if (rowCol === colCol) {
                              bg = 'bg-[#EFF6FF]';
                              textCol = 'text-[#2563EB] font-bold';
                            } else if (val >= 0.7) {
                              bg = 'bg-[#DBEAFE]';
                              textCol = 'text-[#1E40AF] font-bold';
                            } else if (val >= 0.4) {
                              bg = 'bg-[#EFF6FF]';
                              textCol = 'text-[#1D4ED8]';
                            } else if (val <= -0.4) {
                              bg = 'bg-[#FEE2E2]';
                              textCol = 'text-[#DC2626] font-bold';
                            }

                            return (
                              <td key={colCol} className={`py-2 px-2 border-r border-[#E5EAF1] ${bg} ${textCol}`}>
                                {val.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TARGET & CLASS BALANCE ANALYSIS */}
          {activeTab === 'target' && (
            <div className="bg-white rounded-b-xl border border-t-0 border-[#E5EAF1] shadow-card p-6 space-y-6">
              {/* Header Bar: Target Selection & Auditable Type Override */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-bold text-[#172B4D]">Target Variable:</span>
                  </div>
                  <select
                    value={selectedTargetCol || detail.target_column}
                    onChange={(e) => setSelectedTargetCol(e.target.value)}
                    className="text-xs font-mono font-semibold border border-[#E5EAF1] rounded-lg px-3 py-1.5 bg-white text-[#172B4D] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    {detail.columns_meta.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name} {col.name === detail.target_column ? '(Registered Target)' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Target-Type Indicator Badge */}
                  {targetAnalysis && (
                    <div className="flex items-center gap-2">
                      {targetAnalysis.effective_type === 'regression' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] flex items-center gap-1.5 shadow-sm">
                          <Activity className="w-3.5 h-3.5 text-[#2563EB]" />
                          Continuous Regression
                        </span>
                      )}
                      {targetAnalysis.effective_type === 'binary_classification' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] flex items-center gap-1.5 shadow-sm">
                          <Scale className="w-3.5 h-3.5 text-[#7E22CE]" />
                          Binary Classification
                        </span>
                      )}
                      {targetAnalysis.effective_type === 'multiclass_classification' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] flex items-center gap-1.5 shadow-sm">
                          <Layers className="w-3.5 h-3.5 text-[#047857]" />
                          Multiclass Classification ({targetAnalysis.classification_metrics?.num_classes} Classes)
                        </span>
                      )}
                      {targetAnalysis.effective_type === 'unsuitable' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] flex items-center gap-1.5 shadow-sm">
                          <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                          Unsuitable Target
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Auditable Clinician Override Selector */}
                <div className="flex items-center gap-2.5">
                  <label className="text-xs font-semibold text-[#64748B] flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Target Override:</span>
                  </label>
                  <select
                    value={targetOverride}
                    onChange={(e) => setTargetOverride(e.target.value)}
                    className="text-xs border border-[#E5EAF1] rounded-lg px-2.5 py-1.5 bg-white text-[#172B4D] font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="">Auto-Detect ({targetAnalysis?.detected_type || 'algorithmic'})</option>
                    <option value="regression">Force: Continuous Regression</option>
                    <option value="binary_classification">Force: Binary Classification</option>
                    <option value="multiclass_classification">Force: Multiclass Classification</option>
                  </select>

                  {targetAnalysis?.is_override && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                      Audited Override Active
                    </span>
                  )}
                </div>
              </div>

              {/* Rationale & Validation Strategy Guidance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Detection Rationale */}
                <div className="p-4 rounded-xl border border-[#E5EAF1] bg-white shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                      Target Classification Rationale
                    </span>
                    <span className="text-[11px] font-mono text-[#64748B]">
                      {targetAnalysis?.unique_count} distinct levels
                    </span>
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    {targetAnalysis?.type_reasoning}
                  </p>
                  {targetAnalysis?.is_override && targetAnalysis.override_reason && (
                    <div className="text-[11px] p-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-[#92400E] font-medium">
                      {targetAnalysis.override_reason}
                    </div>
                  )}
                </div>

                {/* Validation Strategy Indicator */}
                <div className="p-4 rounded-xl border border-[#E5EAF1] bg-white shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
                      Recommended Validation Strategy
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        targetAnalysis?.validation_strategy.is_stratified
                          ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                          : 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                      }`}
                    >
                      {targetAnalysis?.validation_strategy.is_stratified ? 'Stratified Folds' : 'Standard K-Fold'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#172B4D]">
                    {targetAnalysis?.validation_strategy.name}
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">
                    {targetAnalysis?.validation_strategy.rationale}
                  </p>
                </div>
              </div>

              {/* Suitability Warnings / Alerts */}
              {targetAnalysis?.suitability_warnings && targetAnalysis.suitability_warnings.length > 0 && (
                <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#92400E]">
                    <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                    <span>Statistical Suitability Notice & Precautionary Guidance</span>
                  </div>
                  <ul className="text-xs text-[#B45309] space-y-1 list-disc list-inside">
                    {targetAnalysis.suitability_warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Case 1: REGRESSION TARGET DISTRIBUTION */}
              {targetAnalysis?.effective_type === 'regression' && targetAnalysis.regression_metrics && (
                <div className="space-y-6">
                  {/* Actual Histogram Visualizer */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                          Actual Target Distribution Histogram ({targetAnalysis.target_column})
                        </h4>
                        <p className="text-xs text-[#64748B]">
                          Binned frequency distribution calculated directly from valid non-missing observations.
                        </p>
                      </div>
                      <span className="text-xs font-mono text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-lg border border-[#BFDBFE]">
                        10 Uniform Bins
                      </span>
                    </div>

                    <div className="h-60 w-full bg-[#F7F9FC] p-4 rounded-xl border border-[#E5EAF1]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={targetAnalysis.regression_metrics.histogram}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                          <XAxis
                            dataKey="bin_label"
                            tick={{ fontSize: 10, fill: '#64748B' }}
                            interval={0}
                            angle={-15}
                            textAnchor="end"
                            height={45}
                          />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#E5EAF1',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value: any) => [
                              `${value} samples (${targetAnalysis.regression_metrics?.histogram.find(h => h.count === value)?.percentage || 0}%)`,
                              'Cohort Frequency'
                            ]}
                          />
                          <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} name="Sample Frequency" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 9 Core Statistical Metrics Grid */}
                  <div>
                    <h4 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-3">
                      Target Analyte Statistical Parameters & Quantiles
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                      <div className="p-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg">
                        <span className="text-[#64748B] text-[11px] block">Range [Min, Max]</span>
                        <div className="text-sm font-bold font-mono text-[#172B4D] mt-0.5">
                          {targetAnalysis.regression_metrics.min} — {targetAnalysis.regression_metrics.max}
                        </div>
                      </div>

                      <div className="p-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg">
                        <span className="text-[#64748B] text-[11px] block">Mean & Median</span>
                        <div className="text-sm font-bold font-mono text-[#2563EB] mt-0.5">
                          μ: {targetAnalysis.regression_metrics.mean} | Q50: {targetAnalysis.regression_metrics.median}
                        </div>
                      </div>

                      <div className="p-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg">
                        <span className="text-[#64748B] text-[11px] block">Std Dev & IQR</span>
                        <div className="text-sm font-bold font-mono text-[#172B4D] mt-0.5">
                          σ: {targetAnalysis.regression_metrics.std} | IQR: {targetAnalysis.regression_metrics.iqr}
                        </div>
                      </div>

                      <div className="p-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg">
                        <span className="text-[#64748B] text-[11px] block">Skewness</span>
                        <div className="text-sm font-bold font-mono text-[#172B4D] mt-0.5">
                          {targetAnalysis.regression_metrics.skewness}{' '}
                          <span className="text-[10px] font-sans font-medium text-[#64748B]">
                            {Math.abs(targetAnalysis.regression_metrics.skewness) < 0.5
                              ? '(Symmetric)'
                              : targetAnalysis.regression_metrics.skewness > 0
                              ? '(Right-Skewed)'
                              : '(Left-Skewed)'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg">
                        <span className="text-[#64748B] text-[11px] block">Missing Targets</span>
                        <div className="text-sm font-bold font-mono text-[#172B4D] mt-0.5">
                          {targetAnalysis.missing_count} ({targetAnalysis.missing_percentage}%)
                        </div>
                      </div>
                    </div>

                    {/* Quantile Details & Tukey Outlier Strip */}
                    <div className="mt-3 p-4 bg-white border border-[#E5EAF1] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="text-[11px] text-[#64748B] font-sans block">25th Percentile (Q1)</span>
                          <span className="font-bold text-[#172B4D]">{targetAnalysis.regression_metrics.q25}</span>
                        </div>
                        <div className="h-6 w-px bg-[#E2E8F0]" />
                        <div>
                          <span className="text-[11px] text-[#64748B] font-sans block">Median (Q2)</span>
                          <span className="font-bold text-[#2563EB]">{targetAnalysis.regression_metrics.q50}</span>
                        </div>
                        <div className="h-6 w-px bg-[#E2E8F0]" />
                        <div>
                          <span className="text-[11px] text-[#64748B] font-sans block">75th Percentile (Q3)</span>
                          <span className="font-bold text-[#172B4D]">{targetAnalysis.regression_metrics.q75}</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 text-[#D97706] flex-shrink-0" />
                        <div className="text-[11px] text-[#92400E]">
                          <strong>Outlier Assessment (Tukey's Fences):</strong> {targetAnalysis.regression_metrics.outlier_count} values ({targetAnalysis.regression_metrics.outlier_percentage}% of cohort) outside fences [{targetAnalysis.regression_metrics.lower_fence}, {targetAnalysis.regression_metrics.upper_fence}].
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Case 2: CLASSIFICATION TARGET DISTRIBUTION */}
              {targetAnalysis &&
                ['binary_classification', 'multiclass_classification'].includes(targetAnalysis.effective_type) &&
                targetAnalysis.classification_metrics && (
                  <div className="space-y-6">
                    {/* Class Frequency Bar Chart */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                            Actual Class Frequency & Cohort Distribution ({targetAnalysis.target_column})
                          </h4>
                          <p className="text-xs text-[#64748B]">
                            Distribution of discrete classes across {targetAnalysis.valid_count} labeled observations.
                          </p>
                        </div>
                        <span className="text-xs font-mono text-[#7E22CE] bg-[#F3E8FF] px-2.5 py-1 rounded-lg border border-[#E9D5FF]">
                          {targetAnalysis.classification_metrics.num_classes} Discrete Classes
                        </span>
                      </div>

                      <div className="h-56 w-full bg-[#F7F9FC] p-4 rounded-xl border border-[#E5EAF1]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={targetAnalysis.classification_metrics.bar_chart_data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#FFFFFF',
                                borderColor: '#E5EAF1',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                              formatter={(value: any) => [
                                `${value} samples (${targetAnalysis.classification_metrics?.classes.find(c => c.count === value)?.percentage || 0}%)`,
                                'Frequency'
                              ]}
                            />
                            <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Class Frequency" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Class Metrics KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3.5 bg-[#F8FAFC] border border-[#E5EAF1] rounded-xl">
                        <span className="text-[#64748B] text-[11px] block">Majority Class</span>
                        <div className="text-sm font-bold text-[#172B4D] mt-0.5">
                          {targetAnalysis.classification_metrics.majority_class.class_label}
                        </div>
                        <span className="text-[11px] text-[#64748B]">
                          {targetAnalysis.classification_metrics.majority_class.count} samples ({targetAnalysis.classification_metrics.majority_class.percentage}%)
                        </span>
                      </div>

                      <div className="p-3.5 bg-[#F8FAFC] border border-[#E5EAF1] rounded-xl">
                        <span className="text-[#64748B] text-[11px] block">Minority Class</span>
                        <div className="text-sm font-bold text-[#172B4D] mt-0.5">
                          {targetAnalysis.classification_metrics.minority_class.class_label}
                        </div>
                        <span className="text-[11px] text-[#64748B]">
                          {targetAnalysis.classification_metrics.minority_class.count} samples ({targetAnalysis.classification_metrics.minority_class.percentage}%)
                        </span>
                      </div>

                      <div className="p-3.5 bg-[#F8FAFC] border border-[#E5EAF1] rounded-xl">
                        <span className="text-[#64748B] text-[11px] block">Majority / Minority Ratio</span>
                        <div className="text-sm font-bold font-mono text-[#172B4D] mt-0.5">
                          {targetAnalysis.classification_metrics.majority_minority_ratio}:1
                        </div>
                        <span
                          className={`text-[11px] font-semibold ${
                            targetAnalysis.classification_metrics.has_imbalance
                              ? 'text-[#DC2626]'
                              : 'text-[#15803D]'
                          }`}
                        >
                          {targetAnalysis.classification_metrics.has_imbalance
                            ? `Imbalanced (${targetAnalysis.classification_metrics.imbalance_level})`
                            : 'Balanced Proportions'}
                        </span>
                      </div>

                      <div className="p-3.5 bg-[#F8FAFC] border border-[#E5EAF1] rounded-xl">
                        <span className="text-[#64748B] text-[11px] block">Missing Target Labels</span>
                        <div className="text-sm font-bold font-mono text-[#172B4D] mt-0.5">
                          {targetAnalysis.missing_count}
                        </div>
                        <span className="text-[11px] text-[#64748B]">
                          {targetAnalysis.missing_percentage}% of total cohort
                        </span>
                      </div>
                    </div>

                    {/* Class Proportions Table */}
                    <div className="overflow-x-auto border border-[#E5EAF1] rounded-lg">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#F7F9FC] text-[#172B4D] font-semibold border-b border-[#E5EAF1]">
                          <tr>
                            <th className="py-2.5 px-3">Class Identifier</th>
                            <th className="py-2.5 px-3">Sample Count</th>
                            <th className="py-2.5 px-3">Percentage</th>
                            <th className="py-2.5 px-3">Visual Proportion</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5EAF1] font-mono">
                          {targetAnalysis.classification_metrics.classes.map((cls) => (
                            <tr key={cls.class_label} className="hover:bg-[#F8FAFC]">
                              <td className="py-2 px-3 font-semibold font-sans text-[#172B4D]">
                                {cls.class_label}
                              </td>
                              <td className="py-2 px-3">{cls.count}</td>
                              <td className="py-2 px-3 font-semibold text-[#7E22CE]">{cls.percentage}%</td>
                              <td className="py-2 px-3 w-48">
                                <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-[#7C3AED] h-full rounded-full"
                                    style={{ width: `${cls.percentage}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DatasetExplorer;

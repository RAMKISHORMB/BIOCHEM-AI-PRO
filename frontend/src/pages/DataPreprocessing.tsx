import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  ShieldCheck,
  Play,
  ArrowLeft,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Info
} from 'lucide-react';

interface DatasetDetail {
  id: string;
  name: string;
  target_column: string;
  feature_columns: string[];
  row_count: number;
  numerical_columns: string[];
  categorical_columns: string[];
  stats_numerical: Record<string, any>;
}

interface DatasetListOption {
  id: string;
  name: string;
  dataset_type: string;
}

export const DataPreprocessing: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [datasets, setDatasets] = useState<DatasetListOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>(searchParams.get('id') || '');
  const [detail, setDetail] = useState<DatasetDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Preprocessing configuration state
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [missingStrategy, setMissingStrategy] = useState<string>('median');
  const [encodingMethod, setEncodingMethod] = useState<string>('one_hot');
  const [scalingMethod, setScalingMethod] = useState<string>('standard');
  const [testSplit, setTestSplit] = useState<number>(0.2);
  const [cvFolds, setCvFolds] = useState<number>(5);
  const [stratified, setStratified] = useState<boolean>(true);
  const [randomSeed, setRandomSeed] = useState<number>(42);

  // 1. Fetch available datasets
  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await api.get<DatasetListOption[]>('/ml/datasets');
        setDatasets(res);
        if (res.length > 0 && !selectedId) {
          const firstId = res[0].id;
          setSelectedId(firstId);
          setSearchParams({ id: firstId });
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load dataset list.');
      }
    };
    fetchList();
  }, []);

  // 2. Fetch dataset detail
  useEffect(() => {
    if (!selectedId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<DatasetDetail>(`/ml/datasets/${selectedId}`);
        setDetail(res);
        setSelectedTarget(res.target_column);
        setSelectedFeatures(res.feature_columns);
      } catch (err: any) {
        setError(err?.message || 'Failed to load dataset metadata.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [selectedId]);

  const handleDatasetChange = (newId: string) => {
    setSelectedId(newId);
    setSearchParams({ id: newId });
  };

  const handleToggleFeature = (feat: string) => {
    if (selectedFeatures.includes(feat)) {
      if (selectedFeatures.length <= 1) {
        return; // maintain at least one feature
      }
      setSelectedFeatures(selectedFeatures.filter((f) => f !== feat));
    } else {
      setSelectedFeatures([...selectedFeatures, feat]);
    }
  };

  const handleSelectAllFeatures = () => {
    if (detail) {
      setSelectedFeatures([...detail.feature_columns]);
    }
  };

  const handleProceedToTraining = () => {
    const query = new URLSearchParams({
      id: selectedId,
      target: selectedTarget,
      features: selectedFeatures.join(','),
      missing: missingStrategy,
      encoding: encodingMethod,
      scaling: scalingMethod,
      split: testSplit.toString(),
      cv: cvFolds.toString(),
      seed: randomSeed.toString()
    });
    navigate(`/ml/training?${query.toString()}`);
  };

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
              <h1 className="text-xl font-bold text-[#172B4D] tracking-tight">Data Preprocessing</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                Zero-Leakage Pipeline
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Configure missing value handling, categorical encoding, scaling transformations, and reproducible train/test partitions.
            </p>
          </div>
        </div>

        {/* Dataset selector */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-semibold text-[#64748B]">Dataset:</label>
          <select
            value={selectedId}
            onChange={(e) => handleDatasetChange(e.target.value)}
            className="text-xs border border-[#E5EAF1] rounded-lg px-3 py-2 bg-[#F7F9FC] text-[#172B4D] font-semibold focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleProceedToTraining}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Proceed to Training</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Clinical Leakage Guardrail Card */}
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[#1E40AF] leading-relaxed">
          <span className="font-bold text-[#1D4ED8]">Strict Anti-Leakage Protocol:</span> In clinical predictive modeling,
          evaluating metrics on the same distribution used for fitting scalers or imputers introduces severe optimistic bias.
          BIOCHEM AI PRO ensures all imputation medians, categorical mappings, and scaling parameters ($\mu, \sigma$) are
          computed <strong>exclusively on the training fold (X_train)</strong>, leaving evaluation partitions completely isolated.
        </div>
      </div>

      {loading || !detail ? (
        <div className="flex items-center justify-center p-20 text-[#2563EB]">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Feature & Target Selection (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Target Variable Selector */}
            <div className="bg-white p-5 rounded-xl border border-[#E5EAF1] shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider block">
                  1. Target Variable Selection
                </span>
                <span className="text-xs text-[#64748B]">
                  {detail.row_count} total cohort observations
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">
                  Selected Prediction Target
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-[#E5EAF1] rounded-lg bg-[#F7F9FC] font-mono font-bold text-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                  <span className="text-xs text-[#64748B] px-2.5 py-1.5 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0]">
                    Verified
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  The model will be evaluated strictly on its ability to classify or regress this clinical variable.
                </p>
              </div>
            </div>

            {/* Feature Columns Selection */}
            <div className="bg-white p-5 rounded-xl border border-[#E5EAF1] shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider block">
                    2. Feature Space Selection ({selectedFeatures.length} of {detail.feature_columns.length} selected)
                  </span>
                  <p className="text-[11px] text-[#64748B]">
                    Choose input biomarkers included in model training matrix.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllFeatures}
                  className="text-xs text-[#2563EB] hover:underline font-semibold"
                >
                  Select All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {detail.feature_columns.map((feat) => {
                  const isSelected = selectedFeatures.includes(feat);
                  const isNumeric = detail.numerical_columns.includes(feat);
                  return (
                    <div
                      key={feat}
                      onClick={() => handleToggleFeature(feat)}
                      className={`p-2.5 rounded-lg border cursor-pointer select-none transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#1E40AF]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent onClick
                          className="rounded text-[#2563EB] focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-semibold">{feat}</span>
                      </div>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-white/80 border border-[#E2E8F0] font-sans">
                        {isNumeric ? 'num' : 'cat'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Preprocessing Pipeline Parameters (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-[#E5EAF1] shadow-card space-y-5">
              <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider block border-b border-[#E5EAF1] pb-2">
                3. Preprocessing Transformations
              </span>

              {/* Missing Value Imputation */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#172B4D]">
                  Missing-Value Imputation Strategy
                </label>
                <select
                  value={missingStrategy}
                  onChange={(e) => setMissingStrategy(e.target.value)}
                  className="w-full text-xs border border-[#E5EAF1] rounded-lg px-3 py-2 bg-[#F7F9FC] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="median">Median Imputation (Recommended for skewed lab analytes)</option>
                  <option value="mean">Mean Imputation (Standard Gaussian approximation)</option>
                  <option value="mode">Mode / Most Frequent (Best for categorical features)</option>
                  <option value="zero">Constant Zero Imputation</option>
                </select>
                <p className="text-[11px] text-[#94A3B8]">
                  Imputation statistics are derived solely from training partitions.
                </p>
              </div>

              {/* Categorical Encoding */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#172B4D]">
                  Categorical Encoding
                </label>
                <select
                  value={encodingMethod}
                  onChange={(e) => setEncodingMethod(e.target.value)}
                  className="w-full text-xs border border-[#E5EAF1] rounded-lg px-3 py-2 bg-[#F7F9FC] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="one_hot">One-Hot Encoding (Dummies with unseen category safety)</option>
                  <option value="ordinal">Ordinal Integer Encoding</option>
                </select>
              </div>

              {/* Feature Scaling */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#172B4D]">
                  Feature Scaling Method
                </label>
                <select
                  value={scalingMethod}
                  onChange={(e) => setScalingMethod(e.target.value)}
                  className="w-full text-xs border border-[#E5EAF1] rounded-lg px-3 py-2 bg-[#F7F9FC] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="standard">StandardScaler (Z-Score: zero mean, unit variance)</option>
                  <option value="minmax">MinMaxScaler (Normalized bound [0, 1])</option>
                  <option value="robust">RobustScaler (Median and IQR for extreme outliers)</option>
                  <option value="none">None (Raw biomarker magnitudes)</option>
                </select>
              </div>

              {/* Train / Test Split Slider */}
              <div className="space-y-2 pt-2 border-t border-[#E5EAF1]">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#172B4D]">Held-Out Test Partition:</span>
                  <span className="font-bold text-[#2563EB]">{Math.round(testSplit * 100)}% ({Math.round(detail.row_count * testSplit)} test samples)</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.5"
                  step="0.05"
                  value={testSplit}
                  onChange={(e) => setTestSplit(parseFloat(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#94A3B8]">
                  <span>10% test</span>
                  <span>Training: {Math.round((1 - testSplit) * 100)}% ({Math.round(detail.row_count * (1 - testSplit))} samples)</span>
                  <span>50% test</span>
                </div>
              </div>

              {/* Cross-Validation & Stratification */}
              <div className="space-y-3 pt-2 border-t border-[#E5EAF1]">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#172B4D]">K-Fold Cross-Validation:</span>
                  <select
                    value={cvFolds}
                    onChange={(e) => setCvFolds(parseInt(e.target.value))}
                    className="text-xs border border-[#E5EAF1] rounded-lg px-2.5 py-1 bg-[#F7F9FC] font-semibold"
                  >
                    <option value={3}>3 Folds</option>
                    <option value={5}>5 Folds (Recommended)</option>
                    <option value={10}>10 Folds</option>
                  </select>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#172B4D]">Stratified Partitioning:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stratified}
                      onChange={(e) => setStratified(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#2563EB]"></div>
                  </label>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#172B4D]">Random Seed:</span>
                  <input
                    type="number"
                    value={randomSeed}
                    onChange={(e) => setRandomSeed(parseInt(e.target.value) || 42)}
                    className="w-20 text-xs text-right border border-[#E5EAF1] rounded-lg px-2 py-1 bg-[#F7F9FC] font-mono"
                  />
                </div>
              </div>

              {/* Proceed Action Button */}
              <button
                onClick={handleProceedToTraining}
                className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Play className="w-4 h-4" />
                <span>Launch Training Pipeline With This Configuration</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataPreprocessing;

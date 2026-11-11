import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  SlidersHorizontal,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Play,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  CartesianGrid
} from 'recharts';

interface MLModel {
  id: string;
  name: string;
  algorithm: string;
  task_type: string;
  feature_names: string[];
  metrics: Record<string, any>;
  status: string;
}

interface FeatureAttribution {
  feature: string;
  sample_value: number;
  shap_value: number;
  global_importance: number;
  direction: 'Elevates Risk' | 'Lowers Risk' | 'Neutral';
}

interface PredictionResponse {
  model_id: string;
  model_name: string;
  task_type: string;
  predicted_class?: number;
  predicted_value?: number;
  predicted_label: string;
  probability?: number;
  shap_base_value?: number;
  feature_attributions: FeatureAttribution[];
  explanation_summary: string;
  outlier_assessment: {
    is_anomaly: boolean;
    anomaly_score: number;
    description: string;
    flagged_features: {
      feature: string;
      input_value: number;
      cohort_mean: number;
      z_score: number;
      status: string;
    }[];
  };
  statutory_disclaimer: string;
}

export const Explainability: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [models, setModels] = useState<MLModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>(searchParams.get('id') || '');
  const [selectedModel, setSelectedModel] = useState<MLModel | null>(null);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);

  // Dynamic feature inputs
  const [features, setFeatures] = useState<Record<string, number>>({});

  // Inference state
  const [predicting, setPredicting] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoadingModels(true);
        const res = await api.get<MLModel[]>('/ml/models');
        setModels(res);
        if (res.length > 0 && !selectedModelId) {
          const first = res[0];
          setSelectedModelId(first.id);
          setSelectedModel(first);
          setSearchParams({ id: first.id });
        }
      } catch (err: any) {
        setError('Failed to fetch models from the clinical registry.');
      } finally {
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  // 2. When selected model changes, set up default feature values
  useEffect(() => {
    if (!selectedModelId) return;
    const m = models.find((mod) => mod.id === selectedModelId);
    if (m) {
      setSelectedModel(m);
      const defaults: Record<string, number> = {};
      m.feature_names.forEach((f) => {
        // Set clinically realistic default baseline if standard biomarker
        if (f === 'GLU') defaults[f] = 135;
        else if (f === 'CREAT') defaults[f] = 1.6;
        else if (f === 'BUN') defaults[f] = 28;
        else if (f === 'NA') defaults[f] = 138;
        else if (f === 'K') defaults[f] = 4.8;
        else if (f === 'ALT') defaults[f] = 45;
        else if (f === 'AST') defaults[f] = 38;
        else if (f === 'ALB') defaults[f] = 3.6;
        else if (f.includes('radius')) defaults[f] = 15.2;
        else if (f.includes('texture')) defaults[f] = 20.1;
        else if (f.includes('area')) defaults[f] = 680;
        else if (f === 'age') defaults[f] = 52;
        else if (f === 'bmi') defaults[f] = 28.5;
        else defaults[f] = 100;
      });
      setFeatures(defaults);
      setPrediction(null);
    }
  }, [selectedModelId, models]);

  const handleModelChange = (id: string) => {
    setSelectedModelId(id);
    setSearchParams({ id });
  };

  const handleInputChange = (featureName: string, val: string) => {
    const parsed = parseFloat(val);
    setFeatures((prev) => ({
      ...prev,
      [featureName]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  const handleRunInference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelId) {
      setError('Please select a trained model from the registry.');
      return;
    }

    try {
      setPredicting(true);
      setError(null);

      const predRes = await api.post<PredictionResponse>('/ml/models/predict', {
        model_id: selectedModelId,
        features: features,
      });

      setPrediction(predRes);
    } catch (err: any) {
      setError(err?.message || 'Inference and SHAP explanation failed.');
    } finally {
      setPredicting(false);
    }
  };

  // Prepare SHAP chart data
  const shapChartData = prediction?.feature_attributions
    ? prediction.feature_attributions.map((item) => ({
        feature: item.feature,
        shap_value: item.shap_value,
        direction: item.direction,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#E5EAF1] shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#172B4D] tracking-tight">Explainability & SHAP Attributions</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                Decision Support
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Individual prediction Shapley attributions, directional risk contributions, and multivariate Mahalanobis anomaly detection.
            </p>
          </div>
        </div>

        {/* Model Selector Dropdown */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-semibold text-[#64748B]">Active Model:</label>
          <select
            value={selectedModelId}
            onChange={(e) => handleModelChange(e.target.value)}
            className="text-xs border border-[#E5EAF1] rounded-lg px-3 py-2 bg-[#F7F9FC] text-[#172B4D] font-semibold focus:outline-none focus:ring-1 focus:ring-[#2563EB] min-w-[200px]"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.algorithm})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mandatory Statutory Clinical Causation Notice */}
      <div className="bg-[#FFFBEB] border-2 border-[#FDE68A] rounded-xl p-4 flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[#92400E] leading-relaxed">
          <span className="font-bold text-[#B45309]">Statutory Regulatory Disclaimer (Association ≠ Causation):</span>{' '}
          Biomarker feature attributions and SHAP scores generated by this system represent purely statistical
          associations observed within the validated empirical cohort. They <strong>do not prove biological causation</strong>,
          mechanistic etiology, or autonomous clinical diagnoses. All predictive outputs must be interpreted by a qualified,
          licensed medical biochemist or physician in conjunction with the patient's full clinical history.
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Feature Inputs Form (5 cols) & Inference Explanations (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Analyte Input Form Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
              <h2 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-[#2563EB]" />
                Biomarker Input Vector
              </h2>
              <span className="text-[11px] text-[#64748B]">
                {selectedModel?.feature_names.length || 0} features
              </span>
            </div>

            {loadingModels ? (
              <div className="p-8 text-center text-xs text-[#64748B]">Loading model registry...</div>
            ) : models.length === 0 ? (
              <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-[#92400E] text-xs">
                <span className="font-bold block">No Trained Models Available:</span>
                Please train an estimator in the Model Training page before executing explainability inference.
              </div>
            ) : (
              <form onSubmit={handleRunInference} className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  {selectedModel?.feature_names.map((feat) => (
                    <div key={feat}>
                      <label className="block text-[11px] font-semibold text-[#64748B] mb-0.5 truncate">
                        {feat}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={features[feat] ?? ''}
                        onChange={(e) => handleInputChange(feat, e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#E5EAF1] rounded-lg bg-[#F7F9FC] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={predicting}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {predicting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Computing Model Inference & SHAP...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Execute Inference & Attribution</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Inference Results & SHAP Waterfall Column */}
        <div className="lg:col-span-7 space-y-5">
          {!prediction ? (
            <div className="bg-white border border-[#E5EAF1] rounded-xl p-12 text-center shadow-card space-y-3">
              <Activity className="w-10 h-10 text-[#94A3B8] mx-auto" />
              <h3 className="text-sm font-semibold text-[#172B4D]">Inference Simulator Ready</h3>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Adjust input biomarker values on the left and click "Execute Inference & Attribution" to calculate
                exact mathematical Shapley contributions and detect potential out-of-distribution laboratory configurations.
              </p>
            </div>
          ) : (
            <>
              {/* Prediction Banner */}
              <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    Model Inference Output
                  </span>
                  <span className="text-xs font-mono text-[#64748B]">{prediction.model_name}</span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-lg font-bold text-[#172B4D] block">
                      {prediction.predicted_label}
                    </span>
                    {prediction.probability !== null && prediction.probability !== undefined && (
                      <span className="text-xs font-semibold text-[#2563EB]">
                        Probability: {(prediction.probability * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>

                  {prediction.shap_base_value !== null && prediction.shap_base_value !== undefined && (
                    <div className="text-right text-xs">
                      <span className="text-[#64748B] block text-[11px]">Cohort Baseline E[f(x)]</span>
                      <span className="font-mono font-bold text-[#172B4D]">
                        {(prediction.shap_base_value * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-[#475569] bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF1] leading-relaxed">
                  {prediction.explanation_summary}
                </p>
              </div>

              {/* SHAP Feature Contribution Chart */}
              <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                      Shapley Value Attributions ($\phi_i$)
                    </h3>
                    <p className="text-[11px] text-[#64748B]">
                      Positive values elevate prediction probability relative to cohort; negative values depress it.
                    </p>
                  </div>
                </div>

                <div className="h-64 w-full bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF1]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={shapChartData} margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        tick={{ fontSize: 11, fill: '#172B4D', fontWeight: 600 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E5EAF1',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <ReferenceLine x={0} stroke="#94A3B8" />
                      <Bar dataKey="shap_value" radius={[4, 4, 4, 4]} name="SHAP Contribution">
                        {shapChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.shap_value >= 0 ? '#DC2626' : '#2563EB'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Attribution Items Table */}
              <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-3">
                <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider block">
                  Directional Risk Attributions
                </span>
                <div className="divide-y divide-[#E5EAF1] border border-[#E5EAF1] rounded-lg overflow-hidden text-xs">
                  {prediction.feature_attributions.map((attr) => (
                    <div key={attr.feature} className="p-2.5 flex items-center justify-between hover:bg-[#F8FAFC]">
                      <div className="flex items-center gap-2">
                        {attr.direction === 'Elevates Risk' ? (
                          <TrendingUp className="w-4 h-4 text-[#DC2626]" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-[#2563EB]" />
                        )}
                        <span className="font-mono font-semibold text-[#172B4D]">{attr.feature}</span>
                        <span className="text-[#64748B] text-[11px]">(Value: {attr.sample_value})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            attr.direction === 'Elevates Risk'
                              ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                              : 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                          }`}
                        >
                          {attr.direction}
                        </span>
                        <span className="font-mono font-bold text-[#172B4D] w-14 text-right">
                          {attr.shap_value > 0 ? `+${attr.shap_value}` : attr.shap_value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multivariate Anomaly / Outlier Alert Card */}
              <div
                className={`border rounded-xl p-4 shadow-card space-y-2 ${
                  prediction.outlier_assessment.is_anomaly
                    ? 'bg-[#FEF2F2] border-[#FCA5A5]'
                    : 'bg-[#F0FDF4] border-[#86EFAC]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {prediction.outlier_assessment.is_anomaly ? (
                      <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#15803D] flex-shrink-0" />
                    )}
                    <span
                      className={`font-bold ${
                        prediction.outlier_assessment.is_anomaly ? 'text-[#DC2626]' : 'text-[#15803D]'
                      }`}
                    >
                      {prediction.outlier_assessment.is_anomaly
                        ? 'Out-of-Distribution Warning'
                        : 'Training Manifold Alignment'}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-[#64748B]">
                    Mahalanobis D = {prediction.outlier_assessment.anomaly_score}
                  </span>
                </div>

                <p className="text-xs text-[#475569] leading-relaxed">
                  {prediction.outlier_assessment.description}
                </p>

                {prediction.outlier_assessment.flagged_features &&
                  prediction.outlier_assessment.flagged_features.length > 0 && (
                    <div className="pt-2 border-t border-[#E5EAF1] space-y-1">
                      <span className="text-[11px] font-semibold text-[#DC2626] block">
                        Flagged Biomarkers (&gt; 2.5 Standard Deviations):
                      </span>
                      {prediction.outlier_assessment.flagged_features.map((flag) => (
                        <div key={flag.feature} className="text-xs flex justify-between font-mono text-[#64748B]">
                          <span>
                            {flag.feature}: measured {flag.input_value} (mean: {flag.cohort_mean})
                          </span>
                          <span className="text-[#DC2626] font-semibold">Z = {flag.z_score}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Explainability;

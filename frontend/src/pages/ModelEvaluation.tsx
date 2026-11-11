import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  BarChart3,
  SlidersHorizontal,
  ArrowLeft,
  ShieldCheck,
  Percent,
  Target,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine
} from 'recharts';

interface ModelSummary {
  id: string;
  name: string;
  algorithm: string;
  task_type: string;
  version: string;
  status: string;
  metrics: Record<string, any>;
  cv_scores: Record<string, any>;
  feature_names: string[];
  trained_at: string;
}

export const ModelEvaluation: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [models, setModels] = useState<ModelSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>(searchParams.get('id') || '');
  const [model, setModel] = useState<ModelSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch models list
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<ModelSummary[]>('/ml/models');
        setModels(res);
        if (res.length > 0 && !selectedId) {
          const firstId = res[0].id;
          setSelectedId(firstId);
          setSearchParams({ id: firstId });
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch registered models.');
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  // 2. Fetch specific model details
  useEffect(() => {
    if (!selectedId) return;

    const fetchModel = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<ModelSummary>(`/ml/models/${selectedId}`);
        setModel(res);
      } catch (err: any) {
        setError(err?.message || 'Failed to load model evaluation metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchModel();
  }, [selectedId]);

  const handleModelChange = (newId: string) => {
    setSelectedId(newId);
    setSearchParams({ id: newId });
  };

  const metrics = model?.metrics || {};
  const isClassification = model?.task_type === 'classification' || metrics.accuracy !== undefined;
  const cvScores = model?.cv_scores || {};
  const cvFoldsData = cvScores.fold_scores
    ? cvScores.fold_scores.map((score: number, idx: number) => ({
        fold: `Fold ${idx + 1}`,
        score: score
      }))
    : [];

  const confusion = metrics.confusion_matrix || [[0, 0], [0, 0]];
  const tn = confusion[0]?.[0] ?? 0;
  const fp = confusion[0]?.[1] ?? 0;
  const fn = confusion[1]?.[0] ?? 0;
  const tp = confusion[1]?.[1] ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#E5EAF1] shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#15803D]/10 flex items-center justify-center text-[#15803D]">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#172B4D] tracking-tight">Model Evaluation Studio</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                Held-Out Validated
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Empirical held-out test partition performance, confusion matrices, ROC/PR curves, and cross-validation stability.
            </p>
          </div>
        </div>

        {/* Model Selector Dropdown & Actions */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-semibold text-[#64748B]">Select Model:</label>
          <select
            value={selectedId}
            onChange={(e) => handleModelChange(e.target.value)}
            className="text-xs border border-[#E5EAF1] rounded-lg px-3 py-2 bg-[#F7F9FC] text-[#172B4D] font-semibold focus:outline-none focus:ring-1 focus:ring-[#2563EB] min-w-[200px]"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.algorithm})
              </option>
            ))}
          </select>

          <button
            onClick={() => navigate(`/ml/explainability?id=${selectedId}`)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Explain Predictions</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading || !model ? (
        <div className="flex items-center justify-center p-20 text-[#2563EB]">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* Provenance & Validation Strategy Banner */}
          <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#64748B]">Algorithm:</span>
              <span className="font-bold text-[#172B4D]">{model.algorithm}</span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="font-semibold text-[#64748B]">Validation:</span>
              <span className="font-mono text-[#2563EB]">
                {model.metrics.test_sample_count
                  ? `${model.metrics.test_sample_count} held-out test samples`
                  : 'Empirical Holdout'}
              </span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="font-semibold text-[#64748B]">Task:</span>
              <span className="uppercase font-semibold text-[#15803D]">{model.task_type}</span>
            </div>

            <div className="flex items-center gap-2 text-[#64748B]">
              <Clock className="w-3.5 h-3.5" />
              <span>Trained: {new Date(model.trained_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* CLASSIFICATION METRICS VIEW */}
          {isClassification ? (
            <>
              {/* Classification KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    Accuracy
                  </span>
                  <div className="text-2xl font-bold text-[#15803D] mt-1">
                    {metrics.accuracy !== undefined ? `${(metrics.accuracy * 100).toFixed(1)}%` : '—'}
                  </div>
                  <span className="text-[11px] text-[#64748B]">Overall accuracy</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    Precision
                  </span>
                  <div className="text-2xl font-bold text-[#172B4D] mt-1">
                    {metrics.precision !== undefined ? `${(metrics.precision * 100).toFixed(1)}%` : '—'}
                  </div>
                  <span className="text-[11px] text-[#64748B]">Positive predictive</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    Recall (Sensitivity)
                  </span>
                  <div className="text-2xl font-bold text-[#2563EB] mt-1">
                    {metrics.recall !== undefined ? `${(metrics.recall * 100).toFixed(1)}%` : '—'}
                  </div>
                  <span className="text-[11px] text-[#64748B]">True positive rate</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    F1-Score
                  </span>
                  <div className="text-2xl font-bold text-[#172B4D] mt-1">
                    {metrics.f1_score !== undefined ? metrics.f1_score : '—'}
                  </div>
                  <span className="text-[11px] text-[#64748B]">Harmonic balance</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    ROC-AUC
                  </span>
                  <div className="text-2xl font-bold text-[#15803D] mt-1">
                    {metrics.roc_auc !== undefined ? metrics.roc_auc : '—'}
                  </div>
                  <span className="text-[11px] text-[#64748B]">Area under ROC</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    PR-AUC
                  </span>
                  <div className="text-2xl font-bold text-[#2563EB] mt-1">
                    {metrics.pr_auc !== undefined ? metrics.pr_auc : '—'}
                  </div>
                  <span className="text-[11px] text-[#64748B]">Precision-Recall AUC</span>
                </div>
              </div>

              {/* Confusion Matrix and Cross-Validation Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 2x2 Confusion Matrix */}
                <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-[#E5EAF1] shadow-card space-y-4">
                  <div>
                    <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider block">
                      Held-Out Confusion Matrix
                    </span>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Empirical classification counts on unobserved test partition.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono">
                    {/* True Negative */}
                    <div className="p-4 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-center">
                      <span className="text-[11px] font-sans font-semibold text-[#166534] block">
                        True Negatives (TN)
                      </span>
                      <span className="text-2xl font-bold text-[#15803D] block mt-1">{tn}</span>
                      <span className="text-[10px] font-sans text-[#64748B]">Correctly ruled out</span>
                    </div>

                    {/* False Positive */}
                    <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-center">
                      <span className="text-[11px] font-sans font-semibold text-[#991B1B] block">
                        False Positives (FP)
                      </span>
                      <span className="text-2xl font-bold text-[#DC2626] block mt-1">{fp}</span>
                      <span className="text-[10px] font-sans text-[#64748B]">Type I Error (False Alarm)</span>
                    </div>

                    {/* False Negative */}
                    <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-center">
                      <span className="text-[11px] font-sans font-semibold text-[#991B1B] block">
                        False Negatives (FN)
                      </span>
                      <span className="text-2xl font-bold text-[#DC2626] block mt-1">{fn}</span>
                      <span className="text-[10px] font-sans text-[#64748B]">Type II Error (Missed Risk)</span>
                    </div>

                    {/* True Positive */}
                    <div className="p-4 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-center">
                      <span className="text-[11px] font-sans font-semibold text-[#1E40AF] block">
                        True Positives (TP)
                      </span>
                      <span className="text-2xl font-bold text-[#2563EB] block mt-1">{tp}</span>
                      <span className="text-[10px] font-sans text-[#64748B]">Correctly identified risk</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5EAF1] flex justify-between text-xs text-[#64748B]">
                    <span>
                      Specificity: <strong>{((tn / (tn + fp || 1)) * 100).toFixed(1)}%</strong>
                    </span>
                    <span>
                      Sensitivity: <strong>{((tp / (tp + fn || 1)) * 100).toFixed(1)}%</strong>
                    </span>
                    <span>
                      NPV: <strong>{((tn / (tn + fn || 1)) * 100).toFixed(1)}%</strong>
                    </span>
                  </div>
                </div>

                {/* K-Fold Cross Validation Fold Performance */}
                <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-[#E5EAF1] shadow-card space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider block">
                        Cross-Validation Fold Stability
                      </span>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {cvScores.folds || 5}-Fold cross validation metric consistency across training partitions.
                      </p>
                    </div>
                    {cvScores.mean_score !== undefined && (
                      <div className="text-right">
                        <span className="text-xs text-[#64748B] block">CV Mean Score</span>
                        <span className="text-sm font-bold text-[#2563EB] font-mono">
                          {cvScores.mean_score} ± {cvScores.std_score}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="h-44 w-full bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF1]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cvFoldsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                        <XAxis dataKey="fold" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#64748B' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E5EAF1',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Bar dataKey="score" fill="#2563EB" radius={[4, 4, 0, 0]} name="Validation Score" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ROC & PR Curve Visualizations */}
              {metrics.roc_curve && metrics.roc_curve.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* ROC Curve Chart */}
                  <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-[#E5EAF1] shadow-card space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                        Receiver Operating Characteristic (ROC)
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                        AUC = {metrics.roc_auc}
                      </span>
                    </div>

                    <div className="h-56 w-full bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF1]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics.roc_curve}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis
                            dataKey="fpr"
                            type="number"
                            domain={[0, 1]}
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            label={{ value: 'False Positive Rate (1 - Specificity)', position: 'insideBottom', offset: -5, fontSize: 11 }}
                          />
                          <YAxis
                            dataKey="tpr"
                            type="number"
                            domain={[0, 1]}
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            label={{ value: 'True Positive Rate (Sensitivity)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#E5EAF1',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="tpr"
                            stroke="#2563EB"
                            strokeWidth={2.5}
                            dot={false}
                            name="Model ROC"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Precision-Recall Curve Chart */}
                  <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-[#E5EAF1] shadow-card space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                        Precision-Recall Curve (PR-AUC)
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                        PR-AUC = {metrics.pr_auc}
                      </span>
                    </div>

                    <div className="h-56 w-full bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF1]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics.pr_curve || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis
                            dataKey="recall"
                            type="number"
                            domain={[0, 1]}
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            label={{ value: 'Recall', position: 'insideBottom', offset: -5, fontSize: 11 }}
                          />
                          <YAxis
                            dataKey="precision"
                            type="number"
                            domain={[0, 1]}
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            label={{ value: 'Precision', angle: -90, position: 'insideLeft', fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#E5EAF1',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="precision"
                            stroke="#15803D"
                            strokeWidth={2.5}
                            dot={false}
                            name="Model PR"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* REGRESSION METRICS VIEW */
            <>
              {/* Regression KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    Mean Absolute Error (MAE)
                  </span>
                  <div className="text-2xl font-bold text-[#2563EB] mt-1">{metrics.mae ?? '—'}</div>
                  <span className="text-[11px] text-[#64748B]">Average absolute deviation</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    Mean Squared Error (MSE)
                  </span>
                  <div className="text-2xl font-bold text-[#172B4D] mt-1">{metrics.mse ?? '—'}</div>
                  <span className="text-[11px] text-[#64748B]">Squared residual penalty</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    Root Mean Squared Error (RMSE)
                  </span>
                  <div className="text-2xl font-bold text-[#172B4D] mt-1">{metrics.rmse ?? '—'}</div>
                  <span className="text-[11px] text-[#64748B]">Standard deviation of residuals</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    R-Squared ($R^2$) Score
                  </span>
                  <div className="text-2xl font-bold text-[#15803D] mt-1">{metrics.r2_score ?? '—'}</div>
                  <span className="text-[11px] text-[#64748B]">Proportion of variance explained</span>
                </div>
              </div>

              {/* Residuals Plot */}
              {metrics.residuals_plot && metrics.residuals_plot.length > 0 && (
                <div className="bg-white p-5 rounded-xl border border-[#E5EAF1] shadow-card space-y-3">
                  <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider block">
                    Held-Out Residual Scatter Plot (Actual vs. Predicted)
                  </span>
                  <div className="h-64 w-full bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF1]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.residuals_plot}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="index" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E5EAF1',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#172B4D"
                          strokeWidth={2}
                          name="Actual Value"
                        />
                        <Line
                          type="monotone"
                          dataKey="predicted"
                          stroke="#2563EB"
                          strokeWidth={2}
                          name="Predicted Value"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ModelEvaluation;

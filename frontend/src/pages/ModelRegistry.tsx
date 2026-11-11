import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  BrainCircuit,
  Award,
  SlidersHorizontal,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowRight,
  Database,
  ShieldCheck,
  Play,
  FileCode,
  Tag
} from 'lucide-react';

interface ModelRecord {
  id: string;
  dataset_id: string;
  dataset_name?: string;
  name: string;
  algorithm: string;
  task_type: string;
  target_variable?: string;
  version: string;
  validation_strategy: string;
  status: string; // TRAINED, NOT_TRAINED, TRAINING, FAILED
  metrics: Record<string, any>;
  cv_scores: Record<string, any>;
  training_logs: string[];
  hyperparameters: Record<string, any>;
  feature_names: string[];
  is_active: boolean;
  trained_at: string;
}

export const ModelRegistry: React.FC = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [taskFilter, setTaskFilter] = useState<string>('ALL');

  // Details Modal
  const [selectedModel, setSelectedModel] = useState<ModelRecord | null>(null);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ModelRecord[]>('/ml/models');
      setModels(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch registered models.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleDownloadArtifact = async (modelId: string, modelName: string) => {
    try {
      await api.download(`/ml/models/${modelId}/artifact`, `${modelName.replace(/\s+/g, '_')}.joblib`);
    } catch (err: any) {
      alert('Failed to download Joblib binary artifact: ' + (err?.message || 'File not found on host.'));
    }
  };

  const filteredModels = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.algorithm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.target_variable && m.target_variable.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.dataset_name && m.dataset_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTask = taskFilter === 'ALL' || m.task_type === taskFilter;
    return matchesSearch && matchesTask;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TRAINED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
            TRAINED (Verified)
          </span>
        );
      case 'TRAINING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
            TRAINING...
          </span>
        );
      case 'NOT_TRAINED':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
            NOT TRAINED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#E5EAF1] shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#172B4D] tracking-tight">Model Registry</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                Joblib Serialized
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Production machine learning catalog, provenance tracking, hyperparameter configuration, and binary artifacts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/ml/training')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Train New Model</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E5EAF1] shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search models, algorithms, targets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-[#F7F9FC]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#64748B]" />
          <span className="text-xs font-medium text-[#64748B]">Task:</span>
          <select
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            className="text-xs border border-[#E5EAF1] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-[#F7F9FC]"
          >
            <option value="ALL">All Modeling Tasks</option>
            <option value="classification">Classification</option>
            <option value="regression">Regression</option>
          </select>
        </div>
      </div>

      {/* Model Inventory Table */}
      {loading ? (
        <div className="flex items-center justify-center p-20 text-[#2563EB]">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-[#E5EAF1] shadow-card space-y-3">
          <BrainCircuit className="w-10 h-10 text-[#94A3B8] mx-auto" />
          <h3 className="text-sm font-semibold text-[#172B4D]">No Models in Registry</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            No models have been trained or registered yet. Launch a model training session using a benchmark or uploaded dataset.
          </p>
          <button
            onClick={() => navigate('/ml/training')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Training Studio</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5EAF1] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F7F9FC] border-b border-[#E5EAF1] text-[#172B4D] font-semibold">
                <tr>
                  <th className="py-3 px-4">Model Pipeline</th>
                  <th className="py-3 px-3">Algorithm</th>
                  <th className="py-3 px-3">Target Variable</th>
                  <th className="py-3 px-3">Validation Strategy</th>
                  <th className="py-3 px-3">Primary Metric</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Trained Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {filteredModels.map((m) => {
                  const isClf = m.task_type === 'classification';
                  const primaryMetric = isClf
                    ? m.metrics.accuracy !== undefined
                      ? `Acc: ${(m.metrics.accuracy * 100).toFixed(1)}%`
                      : '—'
                    : m.metrics.r2_score !== undefined
                    ? `R²: ${m.metrics.r2_score}`
                    : '—';

                  return (
                    <tr key={m.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-[#172B4D] block hover:text-[#2563EB] cursor-pointer" onClick={() => setSelectedModel(m)}>
                            {m.name}
                          </span>
                          <span className="text-[11px] font-mono text-[#64748B] block mt-0.5">
                            ID: {m.id} • v{m.version}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-[#172B4D]">{m.algorithm}</span>
                        <span className="block text-[10px] text-[#64748B] uppercase">{m.task_type}</span>
                      </td>

                      <td className="py-3 px-3 font-mono font-semibold text-[#2563EB]">
                        {m.target_variable || '—'}
                      </td>

                      <td className="py-3 px-3 text-[#475569]">
                        {m.validation_strategy}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-[#15803D] font-mono bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0]">
                          {primaryMetric}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {getStatusBadge(m.status)}
                      </td>

                      <td className="py-3 px-3 text-[#64748B] whitespace-nowrap">
                        {new Date(m.trained_at).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedModel(m)}
                            className="p-1.5 rounded-lg border border-[#E5EAF1] hover:bg-[#F1F5F9] text-[#64748B]"
                            title="Inspect Hyperparameters & Logs"
                          >
                            <FileCode className="w-3.5 h-3.5 text-[#2563EB]" />
                          </button>

                          <button
                            onClick={() => navigate(`/ml/evaluation?id=${m.id}`)}
                            className="p-1.5 rounded-lg border border-[#E5EAF1] hover:bg-[#F1F5F9] text-[#64748B]"
                            title="View Full Held-Out Evaluation"
                          >
                            <Award className="w-3.5 h-3.5 text-[#15803D]" />
                          </button>

                          <button
                            onClick={() => navigate(`/ml/explainability?id=${m.id}`)}
                            className="p-1.5 rounded-lg border border-[#E5EAF1] hover:bg-[#F1F5F9] text-[#64748B]"
                            title="Run Inference & SHAP Explanation"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-[#2563EB]" />
                          </button>

                          <button
                            onClick={() => handleDownloadArtifact(m.id, m.name)}
                            className="p-1.5 rounded-lg border border-[#E5EAF1] hover:bg-[#F1F5F9] text-[#64748B]"
                            title="Download Joblib Artifact"
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
        </div>
      )}

      {/* Detail Modal */}
      {selectedModel && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5EAF1] shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-base font-bold text-[#172B4D]">{selectedModel.name}</h3>
              </div>
              <button
                onClick={() => setSelectedModel(null)}
                className="text-[#64748B] hover:text-[#172B4D] text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF1]">
                <div>
                  <span className="text-[#64748B] block text-[11px]">Model ID</span>
                  <span className="font-mono font-semibold">{selectedModel.id}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Algorithm</span>
                  <span className="font-semibold">{selectedModel.algorithm}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Task Type</span>
                  <span className="uppercase font-semibold text-[#15803D]">{selectedModel.task_type}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Validation Strategy</span>
                  <span className="font-semibold">{selectedModel.validation_strategy}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-[#172B4D] uppercase tracking-wider block mb-1">
                  Hyperparameters
                </span>
                <pre className="bg-[#0F172A] text-[#38BDF8] p-3 rounded-lg overflow-x-auto font-mono text-[11px]">
                  {JSON.stringify(selectedModel.hyperparameters, null, 2)}
                </pre>
              </div>

              <div>
                <span className="font-bold text-[#172B4D] uppercase tracking-wider block mb-1">
                  Held-Out Evaluation Metrics
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  {Object.entries(selectedModel.metrics)
                    .filter(([k]) => !['confusion_matrix', 'roc_curve', 'pr_curve', 'residuals_plot', 'confusion_breakdown'].includes(k))
                    .map(([k, v]) => (
                      <div key={k} className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#64748B] block uppercase font-sans">{k}</span>
                        <span className="font-bold text-[#172B4D]">{String(v)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-[#172B4D] uppercase tracking-wider block mb-1">
                  Training Log Trail
                </span>
                <div className="bg-[#0F172A] text-[#F8FAFC] p-3 rounded-lg font-mono text-[11px] max-h-36 overflow-y-auto space-y-1">
                  {selectedModel.training_logs && selectedModel.training_logs.length > 0 ? (
                    selectedModel.training_logs.map((log, i) => (
                      <div key={i} className="text-[#E2E8F0]">
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-[#64748B]">No training log history recorded.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E5EAF1]">
              <button
                onClick={() => handleDownloadArtifact(selectedModel.id, selectedModel.name)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-[#E5EAF1] text-[#172B4D] hover:bg-[#F7F9FC]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .joblib Artifact</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/ml/evaluation?id=${selectedModel.id}`)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#15803D] text-white hover:bg-[#166534]"
                >
                  Full Evaluation
                </button>
                <button
                  onClick={() => navigate(`/ml/explainability?id=${selectedModel.id}`)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                >
                  Explain
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelRegistry;

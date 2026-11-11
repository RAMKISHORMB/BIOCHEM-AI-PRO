import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  BrainCircuit,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Layers,
  Award,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Check
} from 'lucide-react';

interface DatasetOption {
  id: string;
  name: string;
  target_column: string;
  feature_columns: string[];
  row_count: number;
  dataset_type: string;
}

interface TrainingJobResponse {
  job_id: string;
  model_id: string;
  model_name: string;
  status: string;
  progress: number;
  logs: string[];
  error?: string;
  metrics?: Record<string, any>;
}

export const ModelTraining: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(searchParams.get('id') || '');
  const [loadingDatasets, setLoadingDatasets] = useState<boolean>(true);

  // Training form configuration
  const [modelName, setModelName] = useState<string>('Biomedical Risk Prediction Pipeline v1');
  const [algorithm, setAlgorithm] = useState<string>('RandomForestClassifier');
  const [taskType, setTaskType] = useState<'classification' | 'regression'>('classification');
  const [testSplit, setTestSplit] = useState<number>(
    searchParams.get('split') ? parseFloat(searchParams.get('split')!) : 0.2
  );
  const [cvFolds, setCvFolds] = useState<number>(
    searchParams.get('cv') ? parseInt(searchParams.get('cv')!) : 5
  );

  // Hyperparameters
  const [nEstimators, setNEstimators] = useState<number>(40);
  const [maxDepth, setMaxDepth] = useState<number>(5);
  const [cParam, setCParam] = useState<number>(1.0);
  const [maxIter, setMaxIter] = useState<number>(500);

  // Training runtime state
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [createdModelId, setCreatedModelId] = useState<string | null>(null);
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [trainingStatus, setTrainingStatus] = useState<string>('NOT_TRAINED');
  const [error, setError] = useState<string | null>(null);
  const [completedMetrics, setCompletedMetrics] = useState<Record<string, any> | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Fetch datasets list
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        setLoadingDatasets(true);
        const res = await api.get<DatasetOption[]>('/ml/datasets');
        setDatasets(res);
        if (res.length > 0 && !selectedDatasetId) {
          const first = res[0];
          setSelectedDatasetId(first.id);
          // Auto-detect regression vs classification based on target name or benchmark
          if (first.name.includes('Progression')) {
            setTaskType('regression');
            setAlgorithm('RandomForestRegressor');
          } else {
            setTaskType('classification');
            setAlgorithm('RandomForestClassifier');
          }
        }
      } catch (err: any) {
        setError('Failed to load dataset library for model training.');
      } finally {
        setLoadingDatasets(false);
      }
    };
    fetchDatasets();
  }, []);

  // Update task type when dataset or algorithm changes
  const handleDatasetSelect = (dsId: string) => {
    setSelectedDatasetId(dsId);
    const ds = datasets.find((d) => d.id === dsId);
    if (ds && ds.name.includes('Progression')) {
      setTaskType('regression');
      setAlgorithm('RandomForestRegressor');
    } else {
      setTaskType('classification');
      setAlgorithm('RandomForestClassifier');
    }
  };

  const handleAlgorithmChange = (algo: string) => {
    setAlgorithm(algo);
    if (algo === 'RandomForestRegressor' || algo === 'LinearRegression') {
      setTaskType('regression');
    } else {
      setTaskType('classification');
    }
  };

  // Launch Training Job
  const handleStartTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      setError('Please select a dataset to train.');
      return;
    }

    try {
      setIsTraining(true);
      setError(null);
      setCompletedMetrics(null);
      setTrainingStatus('TRAINING');
      setTrainingProgress(10);
      setLogs([
        `[${new Date().toLocaleTimeString()}] Training session initiated for '${modelName}'.`,
        `[${new Date().toLocaleTimeString()}] Algorithm: ${algorithm} (${taskType}).`,
        `[${new Date().toLocaleTimeString()}] Submitting background execution job to biomedical engine...`
      ]);

      const payload = {
        dataset_id: selectedDatasetId,
        model_name: modelName,
        algorithm: algorithm,
        task_type: taskType,
        test_size: testSplit,
        cv_folds: cvFolds,
        hyperparameters: {
          n_estimators: nEstimators,
          max_depth: maxDepth,
          C: cParam,
          max_iter: maxIter
        },
        async_training: true
      };

      const res = await api.post<TrainingJobResponse>('/ml/models/train', payload);
      setJobId(res.job_id);
      setCreatedModelId(res.model_id);
      setLogs(res.logs);
      setTrainingProgress(res.progress);
    } catch (err: any) {
      setIsTraining(false);
      setTrainingStatus('FAILED');
      setError(err?.message || 'Model training failed to start.');
    }
  };

  // Poll background job status
  useEffect(() => {
    if (!jobId || !isTraining) return;

    const interval = setInterval(async () => {
      try {
        const job = await api.get<TrainingJobResponse>(`/ml/jobs/${jobId}`);
        setLogs(job.logs);
        setTrainingProgress(job.progress);
        setTrainingStatus(job.status);

        if (job.status === 'COMPLETED') {
          setIsTraining(false);
          setCompletedMetrics(job.metrics || null);
          clearInterval(interval);
        } else if (job.status === 'FAILED') {
          setIsTraining(false);
          setError(job.error || 'Training encountered an unrecoverable failure.');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Job polling error', err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [jobId, isTraining]);

  const selectedDs = datasets.find((d) => d.id === selectedDatasetId);

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
              <h1 className="text-xl font-bold text-[#172B4D] tracking-tight">Model Training Studio</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  trainingStatus === 'COMPLETED'
                    ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                    : trainingStatus === 'TRAINING'
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                    : 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                }`}
              >
                {trainingStatus === 'COMPLETED'
                  ? 'TRAINED (Verified)'
                  : trainingStatus === 'TRAINING'
                  ? 'TRAINING IN PROGRESS'
                  : 'NOT TRAINED'}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Train Scikit-learn clinical classification and regression estimators with real-time logs and Joblib persistence.
            </p>
          </div>
        </div>

        {completedMetrics && createdModelId && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/ml/evaluation?id=${createdModelId}`)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#15803D] text-white hover:bg-[#166534] shadow-sm transition-colors"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Inspect Held-Out Evaluation</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Training Form (5 cols) & Live Terminal Logs (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Hyperparameters & Algorithm Form */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleStartTraining} className="bg-white p-5 rounded-xl border border-[#E5EAF1] shadow-card space-y-4">
            <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider block border-b border-[#E5EAF1] pb-2">
              Pipeline Parameters
            </span>

            {/* Model Name */}
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">Model Name</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-[#F7F9FC]"
              />
            </div>

            {/* Dataset Picker */}
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">Training Dataset</label>
              <select
                value={selectedDatasetId}
                onChange={(e) => handleDatasetSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-[#F7F9FC]"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count} rows, target: {d.target_column})
                  </option>
                ))}
              </select>
            </div>

            {/* Algorithm Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Algorithm & Modeling Task
              </label>
              <select
                value={algorithm}
                onChange={(e) => handleAlgorithmChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E5EAF1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-[#F7F9FC] font-semibold text-[#172B4D]"
              >
                <optgroup label="Classification Algorithms">
                  <option value="RandomForestClassifier">Random Forest Classifier (Ensemble)</option>
                  <option value="LogisticRegression">Logistic Regression (L2 Regularized)</option>
                  <option value="DecisionTreeClassifier">Decision Tree Classifier (CART / Gini)</option>
                </optgroup>
                <optgroup label="Regression Algorithms">
                  <option value="RandomForestRegressor">Random Forest Regressor (Continuous Variance)</option>
                  <option value="LinearRegression">Linear Regression (Ordinary Least Squares)</option>
                </optgroup>
              </select>
              <p className="text-[11px] text-[#64748B] mt-1">
                Task type: <strong className="uppercase text-[#2563EB]">{taskType}</strong>
              </p>
            </div>

            {/* Hyperparameters Controls */}
            <div className="bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl p-3 space-y-3">
              <span className="text-[11px] font-bold text-[#172B4D] uppercase tracking-wider block">
                Hyperparameter Tuning
              </span>

              {(algorithm === 'RandomForestClassifier' || algorithm === 'RandomForestRegressor') && (
                <>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#64748B]">Estimators (n_estimators):</span>
                      <span className="font-mono font-bold text-[#172B4D]">{nEstimators} trees</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={nEstimators}
                      onChange={(e) => setNEstimators(parseInt(e.target.value))}
                      className="w-full accent-[#2563EB] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#64748B]">Max Tree Depth:</span>
                      <span className="font-mono font-bold text-[#172B4D]">{maxDepth} levels</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="15"
                      step="1"
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                      className="w-full accent-[#2563EB] cursor-pointer"
                    />
                  </div>
                </>
              )}

              {algorithm === 'DecisionTreeClassifier' && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#64748B]">Max Tree Depth:</span>
                    <span className="font-mono font-bold text-[#172B4D]">{maxDepth} levels</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    step="1"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                    className="w-full accent-[#2563EB] cursor-pointer"
                  />
                </div>
              )}

              {algorithm === 'LogisticRegression' && (
                <>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#64748B]">Inverse Regularization (C):</span>
                      <span className="font-mono font-bold text-[#172B4D]">{cParam}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="10"
                      step="0.5"
                      value={cParam}
                      onChange={(e) => setCParam(parseFloat(e.target.value))}
                      className="w-full accent-[#2563EB] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#64748B]">Max Iterations:</span>
                      <span className="font-mono font-bold text-[#172B4D]">{maxIter}</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="1000"
                      step="50"
                      value={maxIter}
                      onChange={(e) => setMaxIter(parseInt(e.target.value))}
                      className="w-full accent-[#2563EB] cursor-pointer"
                    />
                  </div>
                </>
              )}

              {algorithm === 'LinearRegression' && (
                <div className="text-xs text-[#64748B] italic">
                  Ordinary Least Squares with L2 Ridge regularizer (alpha = 0.001) for singular matrix stabilization.
                </div>
              )}
            </div>

            {/* Validation Strategy Settings */}
            <div className="space-y-2 pt-2 border-t border-[#E5EAF1] text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Held-Out Test Ratio:</span>
                <span className="font-semibold text-[#172B4D]">{Math.round(testSplit * 100)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Cross-Validation Folds:</span>
                <span className="font-semibold text-[#172B4D]">{cvFolds}-Fold CV</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Persistence Format:</span>
                <span className="font-semibold text-[#15803D]">Joblib Serialized Binary</span>
              </div>
            </div>

            {/* Launch Button */}
            <button
              type="submit"
              disabled={isTraining}
              className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isTraining ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Training Pipeline in Progress...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Execute Model Training</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Live Execution Logs & Progress (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Progress Banner */}
          <div className="bg-white p-5 rounded-xl border border-[#E5EAF1] shadow-card space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#172B4D]">
                Pipeline Execution Status:{' '}
                <strong
                  className={
                    trainingStatus === 'COMPLETED'
                      ? 'text-[#15803D]'
                      : trainingStatus === 'FAILED'
                      ? 'text-[#DC2626]'
                      : 'text-[#2563EB]'
                  }
                >
                  {trainingStatus}
                </strong>
              </span>
              <span className="font-mono font-bold text-[#2563EB]">{trainingProgress}%</span>
            </div>

            <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  trainingStatus === 'COMPLETED'
                    ? 'bg-[#15803D]'
                    : trainingStatus === 'FAILED'
                    ? 'bg-[#DC2626]'
                    : 'bg-[#2563EB]'
                }`}
                style={{ width: `${trainingProgress}%` }}
              />
            </div>
          </div>

          {/* Terminal Logs Window */}
          <div className="bg-[#0F172A] rounded-xl border border-[#334155] shadow-2xl overflow-hidden font-mono text-xs">
            {/* Terminal Header */}
            <div className="bg-[#1E293B] px-4 py-2.5 flex items-center justify-between border-b border-[#334155]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#38BDF8]" />
                <span className="text-[#E2E8F0] text-xs font-semibold">Training Output Logs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-4 h-96 overflow-y-auto space-y-1.5 text-[#F8FAFC]">
              {logs.length === 0 ? (
                <div className="text-[#64748B] italic p-4 text-center">
                  Terminal ready. Click 'Execute Model Training' to launch genuine Scikit-learn training pipeline.
                </div>
              ) : (
                logs.map((line, idx) => (
                  <div key={idx} className="leading-relaxed">
                    <span className="text-[#38BDF8]">&gt;</span>{' '}
                    <span
                      className={
                        line.includes('COMPLETED') || line.includes('complete')
                          ? 'text-[#4ADE80] font-semibold'
                          : line.includes('FAILED') || line.includes('aborted')
                          ? 'text-[#F87171] font-semibold'
                          : line.includes('Evaluating')
                          ? 'text-[#FCD34D]'
                          : 'text-[#E2E8F0]'
                      }
                    >
                      {line}
                    </span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Quick Metrics Summary Banner after Training */}
          {completedMetrics && createdModelId && (
            <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-xl p-5 shadow-card space-y-3">
              <div className="flex items-center gap-2 text-[#15803D]">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <h4 className="text-sm font-bold">Model Successfully Trained and Serialized in Registry</h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                {taskType === 'classification' ? (
                  <>
                    <div className="bg-white p-2.5 rounded-lg border border-[#BBF7D0]">
                      <span className="text-[#64748B] block text-[11px]">Accuracy</span>
                      <span className="text-base font-bold text-[#15803D]">
                        {(completedMetrics.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#BBF7D0]">
                      <span className="text-[#64748B] block text-[11px]">F1 Score</span>
                      <span className="text-base font-bold text-[#15803D]">
                        {completedMetrics.f1_score}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#BBF7D0]">
                      <span className="text-[#64748B] block text-[11px]">ROC-AUC</span>
                      <span className="text-base font-bold text-[#15803D]">
                        {completedMetrics.roc_auc}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#BBF7D0]">
                      <span className="text-[#64748B] block text-[11px]">Test Samples</span>
                      <span className="text-base font-bold text-[#172B4D]">
                        {completedMetrics.test_sample_count}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white p-2.5 rounded-lg border border-[#BBF7D0]">
                      <span className="text-[#64748B] block text-[11px]">MAE</span>
                      <span className="text-base font-bold text-[#15803D]">
                        {completedMetrics.mae}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#BBF7D0]">
                      <span className="text-[#64748B] block text-[11px]">RMSE</span>
                      <span className="text-base font-bold text-[#15803D]">
                        {completedMetrics.rmse}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#BBF7D0]">
                      <span className="text-[#64748B] block text-[11px]">R² Score</span>
                      <span className="text-base font-bold text-[#15803D]">
                        {completedMetrics.r2_score}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#BBF7D0]">
                      <span className="text-[#64748B] block text-[11px]">Test Samples</span>
                      <span className="text-base font-bold text-[#172B4D]">
                        {completedMetrics.test_sample_count}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => navigate(`/ml/evaluation?id=${createdModelId}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D] hover:underline"
                >
                  <span>Open Full Performance & ROC/PR Curves</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelTraining;

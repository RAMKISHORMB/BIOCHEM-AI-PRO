import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { UserManagement } from './pages/UserManagement';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const PatientRegistry = React.lazy(() => import('./pages/PatientRegistry'));
const ManualDataEntry = React.lazy(() => import('./pages/ManualDataEntry'));
const ReferenceRanges = React.lazy(() => import('./pages/ReferenceRanges'));
const InterpretationEngine = React.lazy(() => import('./pages/InterpretationEngine'));
const MetabolicPathways = React.lazy(() => import('./pages/MetabolicPathways'));
const GeneEnzymeExplorer = React.lazy(() => import('./pages/GeneEnzymeExplorer'));
const LocalAIAssistant = React.lazy(() => import('./pages/LocalAIAssistant'));
const KnowledgeBase = React.lazy(() => import('./pages/KnowledgeBase'));

// Biomedical Machine Learning Engine Pages
const DatasetLibrary = React.lazy(() => import('./pages/DatasetLibrary'));
const DatasetExplorer = React.lazy(() => import('./pages/DatasetExplorer'));
const DataPreprocessing = React.lazy(() => import('./pages/DataPreprocessing'));
const ModelTraining = React.lazy(() => import('./pages/ModelTraining'));
const ModelEvaluation = React.lazy(() => import('./pages/ModelEvaluation'));
const Explainability = React.lazy(() => import('./pages/Explainability'));
const ModelRegistry = React.lazy(() => import('./pages/ModelRegistry'));

// Biochemical Intelligence Pages (Update 5)
const CalculationEngine = React.lazy(() => import('./pages/biochem/CalculationEngine'));
const AcidBaseAnalysis = React.lazy(() => import('./pages/biochem/AcidBaseAnalysis'));
const ProfileLiver = React.lazy(() => import('./pages/biochem/ProfileLiver'));
const ProfileRenal = React.lazy(() => import('./pages/biochem/ProfileRenal'));
const ProfileElectrolyte = React.lazy(() => import('./pages/biochem/ProfileElectrolyte'));
const ProfileMetabolic = React.lazy(() => import('./pages/biochem/ProfileMetabolic'));
const PatientAnalytics = React.lazy(() => import('./pages/biochem/PatientAnalytics'));

const PatientHistory = React.lazy(() => import('./pages/PatientHistory'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center p-16 text-[#2563EB]">
    <div className="w-8 h-8 border-2 border-[#2563EB]/20 border-t-[#2563EB] rounded-full animate-spin"></div>
  </div>
);

export default function App() {
  return (
    <React.Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Authenticated routes inside AppLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<PatientRegistry />} />
            <Route path="/data-entry" element={<ManualDataEntry />} />
            <Route path="/reference-ranges" element={<ReferenceRanges />} />
            <Route path="/interpretations" element={<InterpretationEngine />} />
            <Route path="/pathways" element={<MetabolicPathways />} />
            <Route path="/genetics" element={<GeneEnzymeExplorer />} />
            <Route path="/ai-assistant" element={<LocalAIAssistant />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />

            {/* Biochemical Intelligence Routes (Update 5) */}
            <Route path="/biochem/calculations" element={<CalculationEngine />} />
            <Route path="/biochem/acid-base" element={<AcidBaseAnalysis />} />
            <Route path="/biochem/liver" element={<ProfileLiver />} />
            <Route path="/biochem/renal" element={<ProfileRenal />} />
            <Route path="/biochem/electrolyte" element={<ProfileElectrolyte />} />
            <Route path="/biochem/metabolic" element={<ProfileMetabolic />} />
            <Route path="/biochem/analytics" element={<PatientAnalytics />} />

            {/* Biomedical Machine Learning Engine Routes */}
            <Route path="/ml/datasets" element={<DatasetLibrary />} />
            <Route path="/ml/explorer" element={<DatasetExplorer />} />
            <Route path="/ml/preprocessing" element={<DataPreprocessing />} />
            <Route path="/ml/training" element={<ModelTraining />} />
            <Route path="/ml/evaluation" element={<ModelEvaluation />} />
            <Route path="/ml/explainability" element={<Explainability />} />
            <Route path="/ml/registry" element={<ModelRegistry />} />

            {/* Backwards-compatible routes */}
            <Route path="/ml-datasets" element={<DatasetLibrary />} />
            <Route path="/ml-models" element={<ModelRegistry />} />
            <Route path="/explainability" element={<Explainability />} />

            <Route path="/history" element={<PatientHistory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit-logs" element={<Settings initialTab="audit" />} />
            <Route path="/settings" element={<Settings initialTab="system" />} />

            {/* Admin only */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/users" element={<UserManagement />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
}

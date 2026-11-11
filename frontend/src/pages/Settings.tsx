import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Server,
  Cpu,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Sliders,
  Terminal,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  HardDrive
} from 'lucide-react';

interface SystemSettingsData {
  project_name: string;
  version: string;
  database_type: string;
  database_status: string;
  ollama_base_url: string;
  ollama_default_model: string;
  ollama_online: boolean;
  ollama_available_models: string[];
  model_registry_dir: string;
  report_output_dir: string;
  environment: string;
}

interface AuditLogItem {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_email: string;
  action: string;
  entity_name: string;
  entity_id: string | null;
  details: Record<string, any> | null;
  ip_address: string;
}

interface SettingsProps {
  initialTab?: 'system' | 'audit';
}

export const Settings: React.FC<SettingsProps> = ({ initialTab = 'system' }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'system' | 'audit'>(initialTab);

  // System settings state
  const [systemData, setSystemData] = useState<SystemSettingsData | null>(null);
  const [systemLoading, setSystemLoading] = useState<boolean>(true);
  const [ollamaUrl, setOllamaUrl] = useState<string>('');
  const [ollamaModel, setOllamaModel] = useState<string>('');
  const [updatingSettings, setUpdatingSettings] = useState<boolean>(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState<number>(0);
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('');

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fetchSystemSettings = async () => {
    try {
      setSystemLoading(true);
      const res = await api.get<SystemSettingsData>('/settings/system');
      setSystemData(res);
      setOllamaUrl(res.ollama_base_url);
      setOllamaModel(res.ollama_default_model);
    } catch (err: any) {
      console.error('Failed to load system settings:', err);
    } finally {
      setSystemLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      let query = `/audit/logs?page=${auditPage}&size=25`;
      if (auditActionFilter) query += `&action=${auditActionFilter}`;
      if (auditSearch) query += `&search=${encodeURIComponent(auditSearch)}`;

      const res = await api.get<{ items: AuditLogItem[]; total: number; page: number }>(query);
      setAuditLogs(res.items);
      setAuditTotal(res.total);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, auditPage, auditActionFilter]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingSettings(true);
      setMessage(null);
      await api.patch('/settings/system', {
        ollama_base_url: ollamaUrl,
        ollama_default_model: ollamaModel,
      });
      setMessage({ type: 'success', text: 'Local AI configuration saved and validated successfully.' });
      await fetchSystemSettings();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to update system settings.' });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleAuditSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuditPage(1);
    fetchAuditLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#17365D] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#2563EB]" />
            System Settings & Compliance
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Local service diagnostics, Ollama LLM integration gateway, and immutable security audit trails.
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center bg-[#F1F5F9] border border-[#E5EAF1] rounded-lg p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'system'
                ? 'bg-white text-[#17365D] shadow-sm font-bold'
                : 'text-[#64748B] hover:text-[#172B4D]'
            }`}
          >
            System & Local AI
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'audit'
                ? 'bg-white text-[#17365D] shadow-sm font-bold'
                : 'text-[#64748B] hover:text-[#172B4D]'
            }`}
          >
            Compliance Audit Trail
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 p-3.5 rounded-xl text-xs border ${
            message.type === 'success'
              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#15803D]" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#DC2626]" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Tab 1: System Settings */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {systemLoading || !systemData ? (
            <div className="p-16 text-center text-[#64748B] bg-white border border-[#E5EAF1] rounded-xl shadow-card">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-[#2563EB]" />
              <p className="text-xs font-medium">Probing local system environment and services...</p>
            </div>
          ) : (
            <>
              {/* Architecture & Service Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Database Card */}
                <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
                  <div className="flex items-center justify-between text-[#64748B] mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Persistence Engine</span>
                    <Database className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <h3 className="text-base font-bold text-[#17365D]">{systemData.database_type}</h3>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse"></span>
                    <span className="text-[#15803D] font-medium">State: {systemData.database_status} (Zero Loss)</span>
                  </div>
                </div>

                {/* Local Ollama Card */}
                <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
                  <div className="flex items-center justify-between text-[#64748B] mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Local AI Gateway (Ollama)</span>
                    <Cpu className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <h3 className="text-base font-bold text-[#17365D] font-mono truncate">{systemData.ollama_default_model}</h3>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    {systemData.ollama_online ? (
                      <span className="flex items-center gap-2 text-[#15803D] font-medium">
                        <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
                        <span>Daemon Online ({systemData.ollama_available_models.length} models)</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-[#D97706] font-medium">
                        <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
                        <span>Daemon Offline (Honest fallback mode)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Environment Card */}
                <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
                  <div className="flex items-center justify-between text-[#64748B] mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Platform Security</span>
                    <Server className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <h3 className="text-base font-bold text-[#17365D]">BIOCHEM AI PRO v{systemData.version}</h3>
                  <p className="text-[11px] text-[#64748B] mt-3 font-mono">
                    Air-gapped local execution • Zero cloud phoning
                  </p>
                </div>
              </div>

              {/* Local AI Configuration Form */}
              <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5EAF1]">
                  <Sliders className="w-4 h-4 text-[#2563EB]" />
                  <h2 className="text-sm font-bold text-[#17365D] uppercase tracking-wider">
                    Local Ollama Endpoint & Model Parameters
                  </h2>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-4 max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Ollama Host Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg px-3 py-2 text-xs text-[#172B4D] font-mono focus:bg-white focus:outline-none focus:border-[#2563EB]"
                      disabled={user?.role !== 'ADMIN'}
                    />
                    <span className="text-[11px] text-[#64748B] mt-1 block">
                      Local loopback port where Ollama listens for REST inference requests.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Default Language Model Identifier
                    </label>
                    <input
                      type="text"
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      placeholder="llama3, meditron, mistral..."
                      className="w-full bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg px-3 py-2 text-xs text-[#172B4D] font-mono focus:bg-white focus:outline-none focus:border-[#2563EB]"
                      disabled={user?.role !== 'ADMIN'}
                    />
                    <span className="text-[11px] text-[#64748B] mt-1 block">
                      Clinical model tag pulled locally via Ollama (<code className="bg-[#F1F5F9] px-1 py-0.5 rounded">ollama run &lt;tag&gt;</code>).
                    </span>
                  </div>

                  {user?.role === 'ADMIN' ? (
                    <button
                      type="submit"
                      disabled={updatingSettings}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm"
                    >
                      {updatingSettings ? 'Saving...' : 'Save Configuration'}
                    </button>
                  ) : (
                    <div className="text-[11px] text-[#64748B] italic">
                      Administrator privileges required to modify local infrastructure parameters.
                    </div>
                  )}
                </form>
              </div>

              {/* Directory storage paths */}
              <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="w-4 h-4 text-[#2563EB]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#17365D]">Local Persistent Storage Directories</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg">
                    <span className="text-[10px] text-[#64748B] uppercase font-mono block mb-1">Model Registry Directory</span>
                    <span className="font-mono text-[11px] text-[#172B4D] break-all">{systemData.model_registry_dir}</span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg">
                    <span className="text-[10px] text-[#64748B] uppercase font-mono block mb-1">Report Output Directory</span>
                    <span className="font-mono text-[11px] text-[#172B4D] break-all">{systemData.report_output_dir}</span>
                  </div>
                </div>
              </div>

              {/* Offline Setup Instructions */}
              {!systemData.ollama_online && (
                <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-5 text-xs text-[#92400E] space-y-2">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                    <Terminal className="w-4 h-4 text-[#D97706]" />
                    <span>How to activate local AI assistant:</span>
                  </div>
                  <p className="text-[#92400E]">
                    Ollama is not responding at <code className="bg-[#FEF3C7] px-1 py-0.5 rounded font-mono font-bold">{systemData.ollama_base_url}</code>. To enable clinical RAG and AI assistance locally:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 font-mono text-[11px] pl-1 text-[#78350F]">
                    <li>Install Ollama from <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-[#2563EB] underline font-bold">ollama.com</a>.</li>
                    <li>Start the daemon or run in terminal: <code className="bg-[#FEF3C7] px-1.5 py-0.5 rounded text-[#172B4D]">ollama run llama3</code></li>
                    <li>Click "System & Local AI" tab to refresh status. BIOCHEM AI PRO will automatically ground responses in the clinical knowledge base.</li>
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab 2: Compliance Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
            {/* Filter toolbar */}
            <form onSubmit={handleAuditSearchSubmit} className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  className="bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] focus:bg-white focus:outline-none focus:border-[#2563EB] font-mono"
                >
                  <option value="">All Actions</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="LOGOUT">LOGOUT</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="EXPORT_PDF_REPORT">EXPORT_PDF_REPORT</option>
                  <option value="EXPORT_CSV_REPORT">EXPORT_CSV_REPORT</option>
                  <option value="TRAIN_ML_MODEL">TRAIN_ML_MODEL</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search user, ID, or payload..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#172B4D] placeholder-[#64748B] focus:bg-white focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172B4D] font-medium rounded-lg border border-[#E5EAF1] transition-colors"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Audit Log Table */}
            {auditLoading ? (
              <div className="p-12 text-center text-xs text-[#64748B]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2563EB]" />
                Loading audit records...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#64748B]">
                No audit entries found matching the filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[#64748B] uppercase text-[10px] font-semibold">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">User / Operator</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Entity</th>
                      <th className="py-2.5 px-3">IP Address</th>
                      <th className="py-2.5 px-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF1] text-[#172B4D]">
                    {auditLogs.map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      return (
                        <React.Fragment key={log.id}>
                          <tr
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                          >
                            <td className="py-2.5 px-3 text-[#64748B] whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-[#17365D] truncate max-w-[160px]">
                              {log.user_email}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.action.includes('EXPORT')
                                    ? 'bg-[#FAF5FF] text-[#7E22CE] border border-[#E9D5FF]'
                                    : log.action.includes('TRAIN')
                                    ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                                    : log.action.includes('CREATE')
                                    ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                                    : log.action.includes('UPDATE')
                                    ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                                    : 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]'
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[#64748B]">
                              {log.entity_name} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                            </td>
                            <td className="py-2.5 px-3 text-[#64748B]">{log.ip_address}</td>
                            <td className="py-2.5 px-3 text-right text-[#2563EB] text-[11px] font-semibold">
                              <span className="flex items-center justify-end gap-1">
                                {isExpanded ? 'Collapse' : 'Inspect'}
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </span>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-[#F8FAFC]">
                              <td colSpan={6} className="p-3">
                                <div className="p-3 bg-white rounded-lg border border-[#E5EAF1] text-[11px]">
                                  <span className="text-[#64748B] font-bold block mb-1">
                                    Raw Audit Payload Record:
                                  </span>
                                  <pre className="text-[#172B4D] whitespace-pre-wrap font-mono text-[11px] bg-[#F8FAFC] p-2.5 rounded border border-[#E5EAF1]">
                                    {JSON.stringify(log.details || { note: 'No supplementary payload' }, null, 2)}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {auditTotal > 25 && (
              <div className="flex items-center justify-between pt-4 border-t border-[#E5EAF1] text-xs text-[#64748B]">
                <span>Total Events: {auditTotal}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    disabled={auditPage === 1}
                    className="px-2.5 py-1 bg-white hover:bg-[#F8FAFC] text-[#172B4D] rounded border border-[#E5EAF1] disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="font-mono">Page {auditPage}</span>
                  <button
                    onClick={() => setAuditPage((p) => p + 1)}
                    disabled={auditPage * 25 >= auditTotal}
                    className="px-2.5 py-1 bg-white hover:bg-[#F8FAFC] text-[#172B4D] rounded border border-[#E5EAF1] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

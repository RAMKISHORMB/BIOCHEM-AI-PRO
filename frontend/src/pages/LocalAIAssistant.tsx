import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  BotMessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  FlaskConical,
  RefreshCw,
  ExternalLink,
  Shield,
  Server,
  User,
  Info,
  Terminal
} from 'lucide-react';

interface Citation {
  title: string;
  source: string;
  category: string;
  content_snippet: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  model?: string;
  citations?: Citation[];
  groundedOnPatient?: boolean;
  timestamp: string;
}

interface AIStatus {
  online: boolean;
  url: string;
  default_model: string;
  installed_models: string[];
  message: string;
  setup_guide?: string[];
}

export default function LocalAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text:
        "Welcome to BIOCHEM AI Local Clinical Assistant. I am an air-gapped, offline-capable biomedical reasoning agent executing locally on your workstation through Ollama.\n\n" +
        "I provide clinical decision support grounded in peer-reviewed biochemistry reference standards and your enrolled patients' verified laboratory data. All analytical outputs require physician interpretation.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [statusInfo, setStatusInfo] = useState<AIStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('llama3');
  const [encounters, setEncounters] = useState<any[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>('');
  const [includeRag, setIncludeRag] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const checkStatus = async () => {
    try {
      const res = await api.get<AIStatus>('/ai/status');
      setStatusInfo(res);
      if (res.installed_models.length > 0) {
        setSelectedModel(res.installed_models[0]);
      } else {
        setSelectedModel(res.default_model);
      }
    } catch {
      setStatusInfo({
        online: false,
        url: 'http://localhost:11434',
        default_model: 'llama3',
        installed_models: [],
        message: 'Local Ollama service unreachable at http://localhost:11434',
        setup_guide: [
          'Install Ollama from https://ollama.com',
          'Execute: ollama run llama3 in your terminal',
          'Click "Refresh" above to verify connection'
        ],
      });
    }
  };

  useEffect(() => {
    checkStatus();

    const fetchEncounters = async () => {
      try {
        const res = await api.get<{ items: any[] }>('/labs/encounters?page=1&size=20');
        setEncounters(res.items || []);
      } catch {
        // ignore
      }
    };
    fetchEncounters();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsSending(true);
    setError(null);

    try {
      const res = await api.post<any>('/ai/chat', {
        question: currentInput,
        model: selectedModel,
        encounter_id: selectedEncounterId || undefined,
        include_rag: includeRag,
      });

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        model: res.model_used,
        citations: res.citations || [],
        groundedOnPatient: res.grounded_on_patient,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || 'Local AI query failed. Please verify that Ollama is running.');
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text:
          "Unable to query local Ollama engine: " +
          (err.message || "Connection refused.") +
          "\n\nIn accordance with medical safety rules, BIOCHEM AI will never fabricate placeholder responses when the local model is offline.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#17365D]">Local AI Assistant</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Air-gapped clinical intelligence powered by local Ollama models with grounded biochemical RAG.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {statusInfo && (
            <div
              className={`px-2.5 py-1 rounded-full border text-[11px] font-medium flex items-center gap-1.5 ${
                statusInfo.online
                  ? 'bg-[#F0FDF4] border-[#DCFCE7] text-[#15803D]'
                  : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  statusInfo.online ? 'bg-[#15803D]' : 'bg-[#D97706]'
                }`}
              ></span>
              <span>{statusInfo.online ? `Ollama Online (${selectedModel})` : 'Ollama Offline'}</span>
            </div>
          )}

          <button
            onClick={checkStatus}
            title="Refresh Ollama Connection"
            className="p-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#E5EAF1] text-[#64748B] transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Control Bar: Model, Patient Grounding, RAG Toggle */}
      <div className="bg-white border border-[#E5EAF1] rounded-xl p-3.5 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          {/* Model selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#64748B] whitespace-nowrap">Engine:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg text-xs font-mono font-medium text-[#172B4D] focus:bg-white focus:outline-none"
            >
              {statusInfo?.installed_models && statusInfo.installed_models.length > 0 ? (
                statusInfo.installed_models.map((m) => (
                  <option key={m} value={m}>
                    {m} (Installed)
                  </option>
                ))
              ) : (
                <option value="llama3">llama3 (Default)</option>
              )}
            </select>
          </div>

          {/* Patient Encounter Grounding */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#64748B] whitespace-nowrap">Grounding:</span>
            <select
              value={selectedEncounterId}
              onChange={(e) => setSelectedEncounterId(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg text-xs text-[#172B4D] focus:bg-white focus:outline-none"
            >
              <option value="">General Clinical Knowledge (No Patient Context)</option>
              {encounters.map((enc) => (
                <option key={enc.id} value={enc.id}>
                  {enc.accession_number} — {enc.patient?.full_name || 'Patient'}
                </option>
              ))}
            </select>
          </div>

          {/* RAG Toggle */}
          <div className="flex items-center justify-between md:justify-end gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#172B4D]">
              <input
                type="checkbox"
                checked={includeRag}
                onChange={(e) => setIncludeRag(e.target.checked)}
                className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-0"
              />
              <span className="font-medium">Knowledge Base RAG</span>
            </label>
          </div>
        </div>
      </div>

      {/* Offline Troubleshooting Guide */}
      {statusInfo && !statusInfo.online && (
        <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-xs text-[#92400E] space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-[#B45309]">
            <Terminal className="w-4 h-4" />
            <span>Local AI Model Daemon Offline</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            The platform is running air-gapped without cloud phoning. To query the assistant, start your local Ollama daemon:
          </p>
          <div className="bg-white/80 p-2 rounded border border-[#FDE68A] font-mono text-[11px] text-[#172B4D]">
            ollama run llama3
          </div>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="bg-white border border-[#E5EAF1] rounded-xl shadow-card flex flex-col h-[520px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-[#17365D] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BotMessageSquare className="w-4 h-4 text-[#2563EB]" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-xl p-3.5 text-xs ${
                    isUser
                      ? 'bg-[#EAF2FF] text-[#17365D] border border-[#BFDBFE]'
                      : 'bg-white text-[#172B4D] border border-[#E5EAF1] shadow-xs'
                  }`}
                >
                  {/* Message meta */}
                  <div className="flex items-center justify-between gap-4 mb-1.5 text-[10px] text-[#64748B]">
                    <span className="font-semibold">{isUser ? 'Clinical Operator' : 'BIOCHEM AI Assistant'}</span>
                    <span className="font-mono">{m.timestamp}</span>
                  </div>

                  {/* Message body */}
                  <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>

                  {/* Model & Grounding indicators */}
                  {!isUser && (m.model || m.groundedOnPatient) && (
                    <div className="mt-2.5 pt-2 border-t border-[#E5EAF1] flex items-center gap-2 text-[10px] text-[#64748B] font-mono">
                      {m.model && <span className="bg-[#F8FAFC] px-1.5 py-0.5 rounded border border-[#E5EAF1]">Model: {m.model}</span>}
                      {m.groundedOnPatient && (
                        <span className="bg-[#F0FDF4] text-[#15803D] px-1.5 py-0.5 rounded border border-[#DCFCE7]">
                          Patient Panel Grounded
                        </span>
                      )}
                    </div>
                  )}

                  {/* Evidence Citations */}
                  {!isUser && m.citations && m.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#E5EAF1] space-y-1.5">
                      <span className="text-[10px] font-bold text-[#17365D] uppercase tracking-wider block">
                        Evidence References & Citations:
                      </span>
                      {m.citations.map((c, cIdx) => (
                        <div key={cIdx} className="p-2 bg-[#F8FAFC] rounded border border-[#E5EAF1] text-[11px] text-[#172B4D]">
                          <div className="flex items-center justify-between text-[#2563EB] font-semibold text-[10px]">
                            <span>{c.title}</span>
                            <span className="font-mono">{c.source}</span>
                          </div>
                          <p className="text-[#64748B] mt-0.5 text-[10px] italic">{c.content_snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs border border-[#BFDBFE]">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E5EAF1] bg-[#F8FAFC] flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
            placeholder="Ask a clinical biochemistry question (e.g., differential for high anion gap with elevated delta ratio)..."
            className="flex-1 h-9 px-3 bg-white border border-[#E5EAF1] rounded-lg text-xs text-[#172B4D] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="h-9 px-4 rounded-lg bg-[#17365D] hover:bg-[#122b4a] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Safety Disclaimer Banner */}
      <div className="p-3 bg-white border border-[#E5EAF1] rounded-xl flex items-start gap-2.5 text-[11px] text-[#64748B] shadow-card">
        <Info className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
        <span>
          <strong>Clinical Decision Support Disclaimer:</strong> The Local AI Assistant synthesizes information from local biochemistry guidelines and patient test records. It does not replace clinician interpretation, physical diagnosis, or institutional laboratory judgment.
        </span>
      </div>
    </div>
  );
}

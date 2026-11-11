import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import {
  GitBranch,
  Activity,
  Layers,
  Info,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Dna,
  BarChart2,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import ScientificCharts from '../components/pathways/ScientificCharts';

interface PathwayNode {
  id: string;
  name: string;
  type: 'substrate' | 'enzyme' | 'intermediate' | 'product';
  ec_number?: string;
  regulation?: string;
  cofactors?: string;
  analyte_code?: string;
  formula?: string;
  patient_status?: 'NOMINAL' | 'ABNORMAL';
}

interface MetabolicPathway {
  id: string;
  name: string;
  category: string;
  subcellular_location: string;
  primary_organ: string;
  summary: string;
  linked_analytes: string[];
  is_impacted_by_patient_labs: boolean;
  nodes: PathwayNode[];
}

export default function MetabolicPathways() {
  const [searchParams, setSearchParams] = useSearchParams();
  const encounterId = searchParams.get('encounter_id');
  const initialTab = searchParams.get('tab') === 'charts' ? 'charts' : 'topology';

  const [activeSection, setActiveSection] = useState<'topology' | 'charts'>(initialTab);
  const [pathways, setPathways] = useState<MetabolicPathway[]>([]);
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>('glycolysis-gluconeogenesis');
  const [selectedNode, setSelectedNode] = useState<PathwayNode | null>(null);
  const [patientAbnormalAnalytes, setPatientAbnormalAnalytes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPathways = async () => {
      setIsLoading(true);
      try {
        const url = encounterId ? `/pathways?encounter_id=${encounterId}` : '/pathways';
        const data = await api.get<{
          pathways: MetabolicPathway[];
          patient_abnormal_analytes: string[];
        }>(url);
        setPathways(data.pathways);
        setPatientAbnormalAnalytes(data.patient_abnormal_analytes || []);
        if (data.pathways.length > 0) {
          const impacted = data.pathways.find((p) => p.is_impacted_by_patient_labs);
          setSelectedPathwayId(impacted ? impacted.id : data.pathways[0].id);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load metabolic pathways');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPathways();
  }, [encounterId]);

  const selectedPathway = pathways.find((p) => p.id === selectedPathwayId);

  const handleTabChange = (sec: 'topology' | 'charts') => {
    setActiveSection(sec);
    const newParams = new URLSearchParams(searchParams);
    if (sec === 'charts') {
      newParams.set('tab', 'charts');
    } else {
      newParams.delete('tab');
    }
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      {/* Header with View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#17365D]">Metabolic Pathway Explorer</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Biochemical reaction topologies, regulatory checkpoints, and dedicated interactive enzyme kinetics charts.
          </p>
        </div>

        {/* View Switcher: Reaction Topology vs Scientific Charts */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-xl border border-[#E5EAF1]">
          <button
            onClick={() => handleTabChange('topology')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSection === 'topology'
                ? 'bg-white text-[#17365D] shadow-sm'
                : 'text-[#64748B] hover:text-[#172B4D]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Reaction Topology</span>
          </button>

          <button
            onClick={() => handleTabChange('charts')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSection === 'charts'
                ? 'bg-white text-[#17365D] shadow-sm'
                : 'text-[#64748B] hover:text-[#172B4D]'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Scientific Charts</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8]">6</span>
          </button>
        </div>
      </div>

      {activeSection === 'charts' ? (
        <ScientificCharts />
      ) : (
        <>
          {/* Pathway Selection Toolbar */}
          <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              {pathways.map((p) => {
                const isSelected = p.id === selectedPathwayId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPathwayId(p.id);
                      setSelectedNode(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[#17365D] text-white shadow-sm'
                        : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172B4D] border border-[#E5EAF1]'
                    }`}
                  >
                    <span>{p.name}</span>
                    {p.is_impacted_by_patient_labs && (
                      <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoading || !selectedPathway ? (
            <div className="p-16 text-center text-xs text-[#64748B] bg-white border border-[#E5EAF1] rounded-xl shadow-card">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
              <span>Rendering metabolic topology...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main Pathway Overview & Reaction Sequence */}
              <div className="lg:col-span-8 space-y-6">
                {/* Pathway Summary Card */}
                <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5EAF1] pb-3">
                    <h2 className="text-base font-bold text-[#17365D]">{selectedPathway.name}</h2>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-[#F8FAFC] text-[#64748B] border border-[#E5EAF1]">
                        Location: {selectedPathway.subcellular_location}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#F8FAFC] text-[#64748B] border border-[#E5EAF1]">
                        Organ: {selectedPathway.primary_organ}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#172B4D] leading-relaxed">{selectedPathway.summary}</p>

                  <div className="pt-2 flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="text-[11px] font-semibold text-[#64748B]">Mapped Clinical Analytes:</span>
                    {selectedPathway.linked_analytes.map((a) => (
                      <span
                        key={a}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EAF2FF] text-[#2563EB] border border-[#BFDBFE]"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Reaction Sequence Nodes */}
                <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#17365D] mb-4">
                    Enzymatic Cascades & Intermediate Steps
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPathway.nodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id;
                      const isAbnormal = node.patient_status === 'ABNORMAL';

                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`cursor-pointer p-3.5 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-[#EAF2FF]/70 border-[#2563EB] shadow-sm'
                              : isAbnormal
                              ? 'bg-[#FEF2F2]/60 border-[#FCA5A5]'
                              : 'bg-[#F8FAFC] border-[#E5EAF1] hover:bg-white hover:border-[#CBD5E1]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold ${
                                  node.type === 'enzyme'
                                    ? 'bg-[#EAF2FF] text-[#2563EB]'
                                    : 'bg-white text-[#64748B] border border-[#E5EAF1]'
                                }`}
                              >
                                {node.type}
                              </span>
                              <h4 className="text-xs font-bold text-[#17365D] mt-1">{node.name}</h4>
                            </div>

                            {node.ec_number && (
                              <span className="text-[10px] font-mono text-[#64748B]">
                                EC {node.ec_number}
                              </span>
                            )}
                          </div>

                          {node.regulation && (
                            <p className="text-[11px] text-[#64748B] mt-2 line-clamp-1 italic">
                              Reg: {node.regulation}
                            </p>
                          )}

                          {isAbnormal && (
                            <div className="mt-2 pt-2 border-t border-[#FCA5A5] flex items-center gap-1 text-[10px] text-[#DC2626] font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Patient Derangement Detected</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Node Inspector */}
              <div className="lg:col-span-4 space-y-4">
                {!selectedNode ? (
                  <div className="p-12 text-center text-xs text-[#64748B] bg-white border border-[#E5EAF1] rounded-xl shadow-card">
                    <Info className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                    <p className="font-semibold text-[#17365D]">Select an enzymatic or metabolite step</p>
                    <p className="text-[11px] mt-0.5">Click any reaction node to view EC catalog info, regulation, and cofactors.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-4">
                    <div className="border-b border-[#E5EAF1] pb-3">
                      <span className="text-[10px] font-mono text-[#2563EB] uppercase font-bold">
                        Node Inspector ({selectedNode.type})
                      </span>
                      <h3 className="text-sm font-bold text-[#17365D] mt-0.5">{selectedNode.name}</h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      {selectedNode.ec_number && (
                        <div className="p-2.5 bg-[#F8FAFC] rounded border border-[#E5EAF1]">
                          <span className="text-[10px] font-mono uppercase text-[#64748B] block">EC Classification</span>
                          <span className="font-mono font-bold text-[#17365D]">EC {selectedNode.ec_number}</span>
                        </div>
                      )}

                      {selectedNode.cofactors && (
                        <div className="p-2.5 bg-[#F8FAFC] rounded border border-[#E5EAF1]">
                          <span className="text-[10px] font-mono uppercase text-[#64748B] block">Required Cofactors</span>
                          <span className="font-mono text-[#172B4D]">{selectedNode.cofactors}</span>
                        </div>
                      )}

                      {selectedNode.regulation && (
                        <div className="p-2.5 bg-[#F8FAFC] rounded border border-[#E5EAF1]">
                          <span className="text-[10px] font-mono uppercase text-[#64748B] block">Allosteric & Hormonal Regulation</span>
                          <span className="text-[#172B4D] leading-relaxed">{selectedNode.regulation}</span>
                        </div>
                      )}

                      {selectedNode.analyte_code && (
                        <div className="p-2.5 bg-[#EAF2FF] rounded border border-[#BFDBFE]">
                          <span className="text-[10px] font-mono uppercase text-[#2563EB] block font-bold">Clinical Analyte Link</span>
                          <span className="font-mono font-bold text-[#17365D]">{selectedNode.analyte_code}</span>
                        </div>
                      )}

                      {selectedNode.type === 'enzyme' && (
                        <button
                          onClick={() => handleTabChange('charts')}
                          className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm transition-colors"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Simulate Enzyme Kinetics ({selectedNode.name.split(' ')[0]})</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

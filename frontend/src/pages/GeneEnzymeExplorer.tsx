import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Dna,
  Search,
  BookOpen,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Layers,
  Activity
} from 'lucide-react';

interface InbornError {
  id: string;
  name: string;
  omim_id: string;
  gene_symbol: string;
  enzyme_deficient: string;
  ec_number: string;
  inheritance: string;
  pathway_affected: string;
  primary_biomarkers: string[];
  clinical_presentation: string;
  management_principles: string;
}

export default function GeneEnzymeExplorer() {
  const [diseases, setDiseases] = useState<InbornError[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDisease, setSelectedDisease] = useState<InbornError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiseases = async () => {
    setIsLoading(true);
    try {
      const url = search ? `/genetics/inborn-errors?q=${encodeURIComponent(search)}` : '/genetics/inborn-errors';
      const data = await api.get<InbornError[]>(url);
      setDiseases(data);
      if (data.length > 0 && !selectedDisease) {
        setSelectedDisease(data[0]);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve genetic catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDiseases();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#17365D]">Gene & Enzyme Relationship Explorer</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Catalog of inborn errors of metabolism, Mendelian genetics, OMIM accession numbers, and diagnostic biomarkers.
          </p>
        </div>

        <button
          onClick={fetchDiseases}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#E5EAF1] text-xs font-medium text-[#172B4D] transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#64748B] ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search disorder, gene (e.g. PAH, G6PD), OMIM code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#172B4D] placeholder-[#64748B] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Main Grid: Disease List & In-Depth Clinical Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List of Disorders */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#17365D] block px-1">
            Cataloged Inborn Errors ({diseases.length})
          </span>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-[#64748B] bg-white border border-[#E5EAF1] rounded-xl shadow-card">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
              <span>Querying inborn errors catalog...</span>
            </div>
          ) : diseases.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B] bg-white border border-[#E5EAF1] rounded-xl shadow-card">
              <p className="font-semibold text-[#17365D]">No disorders found</p>
              <p className="text-[11px] mt-0.5">Try searching by gene symbol (e.g. PAH, GALT, G6PD).</p>
            </div>
          ) : (
            <div className="space-y-2">
              {diseases.map((d) => {
                const isSelected = selectedDisease?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDisease(d)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#EAF2FF]/70 border-[#BFDBFE] shadow-sm'
                        : 'bg-white border-[#E5EAF1] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-[#17365D]">{d.name}</h3>
                      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white text-[#2563EB] border border-[#E5EAF1] font-bold">
                        OMIM {d.omim_id}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[#64748B]">
                      <span>Gene: <strong className="text-[#17365D] font-mono">{d.gene_symbol}</strong></span>
                      <span>•</span>
                      <span>{d.inheritance}</span>
                    </div>

                    <p className="text-[11px] text-[#64748B] mt-2 line-clamp-1">
                      Enzyme: {d.enzyme_deficient}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Dossier on Right */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedDisease ? (
            <div className="p-16 text-center text-xs text-[#64748B] bg-white border border-[#E5EAF1] rounded-xl shadow-card">
              <Dna className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
              <p className="font-semibold text-[#17365D]">Select an inborn error to view clinical dossier</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-4">
              <div className="border-b border-[#E5EAF1] pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#2563EB] font-bold">
                    Genetic & Enzymatic Dossier
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#F8FAFC] border border-[#E5EAF1] font-semibold text-[#17365D]">
                    OMIM #{selectedDisease.omim_id}
                  </span>
                </div>
                <h2 className="text-base font-bold text-[#17365D] mt-1">{selectedDisease.name}</h2>
              </div>

              {/* Grid Specifications */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                  <span className="text-[10px] font-mono uppercase text-[#64748B] block">Defective Gene</span>
                  <span className="text-sm font-bold font-mono text-[#2563EB]">{selectedDisease.gene_symbol}</span>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                  <span className="text-[10px] font-mono uppercase text-[#64748B] block">Inheritance Pattern</span>
                  <span className="text-xs font-semibold text-[#17365D]">{selectedDisease.inheritance}</span>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                  <span className="text-[10px] font-mono uppercase text-[#64748B] block">Deficient Enzyme</span>
                  <span className="text-xs font-semibold text-[#17365D]">{selectedDisease.enzyme_deficient}</span>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                  <span className="text-[10px] font-mono uppercase text-[#64748B] block">Enzyme Commission (EC)</span>
                  <span className="text-xs font-mono font-bold text-[#17365D]">EC {selectedDisease.ec_number}</span>
                </div>
              </div>

              {/* Primary Diagnostic Biomarkers */}
              <div>
                <span className="text-[11px] font-bold text-[#17365D] uppercase tracking-wider block mb-1.5">
                  Diagnostic Laboratory Biomarkers:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDisease.primary_biomarkers.map((b) => (
                    <span
                      key={b}
                      className="px-2 py-0.5 rounded text-xs font-mono bg-[#EAF2FF] text-[#2563EB] border border-[#BFDBFE] font-bold"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Clinical Presentation & Management */}
              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                  <span className="text-[11px] font-bold text-[#17365D] block mb-1">
                    Clinical Presentation & Pathophysiology:
                  </span>
                  <p className="text-[#172B4D] leading-relaxed">{selectedDisease.clinical_presentation}</p>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                  <span className="text-[11px] font-bold text-[#17365D] block mb-1">
                    Therapeutic & Dietary Management:
                  </span>
                  <p className="text-[#172B4D] leading-relaxed">{selectedDisease.management_principles}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

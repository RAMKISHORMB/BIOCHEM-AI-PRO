import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BookMarked,
  Search,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  Tag,
  RefreshCw,
  Layers,
  Filter
} from 'lucide-react';

interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  source: string;
  content: string;
  relevance_score?: number;
}

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'ALL',
    'ACID_BASE',
    'RENAL_BIOMARKERS',
    'HEPATIC_ENZYMOLOGY',
    'METABOLIC_PATHWAYS',
    'INBORN_ERRORS',
    'LIPID_METABOLISM'
  ];

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      let query = `/knowledge/search?`;
      if (search) query += `q=${encodeURIComponent(search)}&`;
      if (selectedCategory !== 'ALL') query += `category=${selectedCategory}&`;

      const res = await api.get<KnowledgeDocument[]>(query);
      setDocuments(res);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to search clinical knowledge base');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#17365D]">Clinical Knowledge Base (RAG)</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Traceable clinical biochemistry repository citing Tietz 7th Ed, IFCC, and KDIGO diagnostic guidelines.
          </p>
        </div>

        <button
          onClick={fetchDocuments}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#E5EAF1] text-xs font-medium text-[#172B4D] transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#64748B] ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#17365D] text-white shadow-sm'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172B4D] border border-[#E5EAF1]'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search guidelines, formulas, enzymes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#172B4D] placeholder-[#64748B] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-[#64748B] bg-white border border-[#E5EAF1] rounded-xl shadow-card">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
            <span>Searching peer-reviewed knowledge repository...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-16 text-center text-xs text-[#64748B] bg-white border border-[#E5EAF1] rounded-xl shadow-card">
            <BookOpen className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
            <p className="font-semibold text-[#17365D]">No literature documents found</p>
            <p className="text-[11px] mt-0.5">Try searching for broader terms like "acidosis", "creatinine", or "urea".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card hover:border-[#BFDBFE] transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#F8FAFC] text-[#2563EB] border border-[#E5EAF1] font-semibold">
                      {doc.category}
                    </span>
                    <h3 className="text-sm font-bold text-[#17365D] mt-1.5">{doc.title}</h3>
                  </div>
                  {doc.relevance_score !== undefined && (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7]">
                      Match: {Math.round(doc.relevance_score * 100)}%
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#172B4D] leading-relaxed line-clamp-4">
                  {doc.content}
                </p>

                <div className="pt-3 border-t border-[#E5EAF1] flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
                    {doc.source}
                  </span>
                  <span className="text-[10px] text-[#2563EB] font-medium">Standard Literature</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BookOpenCheck,
  Search,
  Plus,
  Filter,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  X,
  RefreshCw,
  BookMarked
} from 'lucide-react';

interface ReferenceRange {
  id: string;
  biological_sex: string;
  min_age_years: number;
  max_age_years: number;
  lower_limit: number;
  upper_limit: number;
  critical_low?: number;
  critical_high?: number;
  unit: string;
  source_authority: string;
  population_notes?: string;
}

interface TestAnalyte {
  id: string;
  code: string;
  name: string;
  category: string;
  default_unit: string;
  loinc_code?: string;
  description?: string;
  is_active: boolean;
  reference_ranges: ReferenceRange[];
}

export default function ReferenceRanges() {
  const { user } = useAuth();
  const [analytes, setAnalytes] = useState<TestAnalyte[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Analyte Modal
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('METABOLIC');
  const [unit, setUnit] = useState('mg/dL');
  const [loinc, setLoinc] = useState('');
  const [description, setDescription] = useState('');
  const [lowerLimit, setLowerLimit] = useState(0);
  const [upperLimit, setUpperLimit] = useState(100);
  const [critLow, setCritLow] = useState<string>('');
  const [critHigh, setCritHigh] = useState<string>('');
  const [sourceAuthority, setSourceAuthority] = useState('Tietz Textbook of Clinical Chemistry, 7th Ed');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['ALL', 'METABOLIC', 'RENAL', 'HEPATIC', 'ELECTROLYTES', 'LIPID', 'PANCREATIC'];

  const fetchAnalytes = async () => {
    setIsLoading(true);
    try {
      const url =
        selectedCategory === 'ALL'
          ? '/reference-ranges/tests'
          : `/reference-ranges/tests?category=${selectedCategory}`;
      const res = await api.get<TestAnalyte[]>(url);
      setAnalytes(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reference catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytes();
  }, [selectedCategory]);

  const filteredAnalytes = analytes.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      (a.loinc_code && a.loinc_code.toLowerCase().includes(q))
    );
  });

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/reference-ranges/tests', {
        code: code.toUpperCase().trim(),
        name,
        category,
        default_unit: unit,
        loinc_code: loinc || undefined,
        description: description || undefined,
        initial_reference_range: {
          biological_sex: 'ALL',
          min_age_years: 0,
          max_age_years: 120,
          lower_limit: Number(lowerLimit),
          upper_limit: Number(upperLimit),
          critical_low: critLow ? Number(critLow) : undefined,
          critical_high: critHigh ? Number(critHigh) : undefined,
          unit,
          source_authority: sourceAuthority,
        },
      });
      setShowModal(false);
      fetchAnalytes();
    } catch (err: any) {
      setError(err.message || 'Failed to create test analyte');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#17365D]">Reference Range Catalog</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Traceable clinical biochemistry reference intervals citing standard authoritative literature (Tietz 7th Ed & IFCC).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytes}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#E5EAF1] text-xs font-medium text-[#172B4D] transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#64748B] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {(user?.role === 'ADMIN' || user?.role === 'BIOCHEMIST') && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-xs font-medium text-white transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Configure New Test</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search test name, LOINC, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#172B4D] placeholder-[#64748B] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-card">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
            <span>Loading reference range intervals...</span>
          </div>
        ) : filteredAnalytes.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
            <BookOpenCheck className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
            <p className="font-semibold text-[#17365D]">No laboratory tests found</p>
            <p className="text-[11px] mt-0.5">Try adjusting your search query or category filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5EAF1] text-[#64748B] font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3">Analyte / Code</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">LOINC Code</th>
                  <th className="py-2.5 px-3">Reference Intervals</th>
                  <th className="py-2.5 px-3">Panic Thresholds</th>
                  <th className="py-2.5 px-3">Literature Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1] text-[#172B4D]">
                {filteredAnalytes.map((a) => (
                  <tr key={a.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-[#17365D] block">{a.name}</span>
                      <span className="font-mono text-[10px] text-[#2563EB] font-bold">{a.code}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F8FAFC] text-[#64748B] border border-[#E5EAF1]">
                        {a.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[#64748B]">
                      {a.loinc_code ? (
                        <span className="text-[#2563EB] hover:underline cursor-pointer">{a.loinc_code}</span>
                      ) : (
                        <span className="text-[#94A3B8]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        {a.reference_ranges.map((r, idx) => (
                          <div key={idx} className="font-mono text-[11px] text-[#172B4D]">
                            <span className="font-bold text-[#15803D]">
                              {r.lower_limit} - {r.upper_limit} {r.unit}
                            </span>
                            <span className="text-[#64748B] ml-2 text-[10px]">
                              ({r.biological_sex}, {r.min_age_years}-{r.max_age_years}y)
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {a.reference_ranges[0]?.critical_low !== undefined ||
                      a.reference_ranges[0]?.critical_high !== undefined ? (
                        <span className="text-[#DC2626] font-semibold">
                          &lt; {a.reference_ranges[0]?.critical_low ?? 'N/A'} / &gt;{' '}
                          {a.reference_ranges[0]?.critical_high ?? 'N/A'} {a.default_unit}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">None defined</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-[#64748B]">
                      <span className="flex items-center gap-1">
                        <BookMarked className="w-3.5 h-3.5 text-[#2563EB] flex-shrink-0" />
                        <span className="truncate max-w-[200px]" title={a.reference_ranges[0]?.source_authority}>
                          {a.reference_ranges[0]?.source_authority || 'Tietz Textbook 7th Ed'}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Configure New Test Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5EAF1] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
              <h3 className="text-sm font-bold text-[#17365D]">Configure New Clinical Test</h3>
              <button onClick={() => setShowModal(false)} className="text-[#64748B] hover:text-[#172B4D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                    Analyte Code <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MG"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded text-xs font-mono font-bold text-[#17365D] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                    Full Test Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Magnesium, Serum"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="METABOLIC">METABOLIC</option>
                    <option value="RENAL">RENAL</option>
                    <option value="HEPATIC">HEPATIC</option>
                    <option value="ELECTROLYTES">ELECTROLYTES</option>
                    <option value="LIPID">LIPID</option>
                    <option value="PANCREATIC">PANCREATIC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                    Default Unit
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="mg/dL, mmol/L..."
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded text-xs font-mono text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                    Lower Limit ({unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={lowerLimit}
                    onChange={(e) => setLowerLimit(parseFloat(e.target.value))}
                    className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded text-xs font-mono text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                    Upper Limit ({unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={upperLimit}
                    onChange={(e) => setUpperLimit(parseFloat(e.target.value))}
                    className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded text-xs font-mono text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                  Literature Source Authority <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sourceAuthority}
                  onChange={(e) => setSourceAuthority(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#E5EAF1] rounded text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5EAF1]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs text-[#64748B] hover:text-[#172B4D] bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1d4ed8] rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Configured Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

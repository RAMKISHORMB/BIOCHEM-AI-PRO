import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Users,
  UserPlus,
  Search,
  FlaskConical,
  AlertCircle,
  FileText,
  Calendar,
  X,
  RefreshCw,
  Sparkles,
  ChevronRight,
  History,
  Phone,
  Mail,
  Shield,
  CheckCircle2
} from 'lucide-react';

interface Patient {
  id: string;
  mrn: string;
  full_name: string;
  date_of_birth: string;
  biological_sex: 'MALE' | 'FEMALE' | 'INTERSEX';
  blood_group?: string;
  phone?: string;
  email?: string;
  medical_history?: string;
  known_allergies?: string;
  age_years: number;
  created_at: string;
  updated_at: string;
}

interface PatientListResponse {
  total: number;
  items: Patient[];
}

export default function PatientRegistry() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration modal state
  const [showModal, setShowModal] = useState(false);
  const [mrn, setMrn] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('1985-06-15');
  const [sex, setSex] = useState<'MALE' | 'FEMALE' | 'INTERSEX'>('FEMALE');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [allergies, setAllergies] = useState('');
  const [history, setHistory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const navigate = useNavigate();

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<PatientListResponse>(
        `/patients?search=${encodeURIComponent(search)}`
      );
      setPatients(res.items);
      setTotal(res.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve patient registry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleGenerateMrn = async () => {
    try {
      const res = await api.get<{ mrn: string }>('/patients/generate-mrn');
      setMrn(res.mrn);
    } catch {
      // fallback
    }
  };

  const handleOpenRegister = () => {
    handleGenerateMrn();
    setFullName('');
    setPhone('');
    setEmail('');
    setAllergies('');
    setHistory('');
    setShowModal(true);
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/patients', {
        mrn,
        full_name: fullName,
        date_of_birth: dob,
        biological_sex: sex,
        blood_group: bloodGroup,
        phone: phone || undefined,
        email: email || undefined,
        known_allergies: allergies || undefined,
        medical_history: history || undefined,
      });
      setShowModal(false);
      fetchPatients();
    } catch (err: any) {
      setError(err.message || 'Failed to register patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#17365D]">Patient Registry</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Centralized clinical demographic records, unique MRN tracking, and longitudinal records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPatients}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#E5EAF1] text-xs font-medium text-[#172B4D] transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#64748B] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenRegister}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-xs font-medium text-white transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register New Patient</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Patient List & Detail Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={selectedPatient ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {/* Table Container */}
          <div className="bg-white border border-[#E5EAF1] rounded-xl shadow-card p-4">
            {/* Search and count bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#17365D]">
                Registered Cohort ({total})
              </span>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Filter by MRN or Name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#172B4D] placeholder-[#64748B] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs text-[#64748B]">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB]" />
                <span>Loading patient demographic records...</span>
              </div>
            ) : patients.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                <Users className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                <p className="font-semibold text-[#17365D]">No patients found matching your search</p>
                <p className="text-[11px] mt-0.5">Register a patient to begin recording laboratory panels.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5EAF1] text-[#64748B] font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-3">MRN</th>
                      <th className="py-2.5 px-3">Full Patient Name</th>
                      <th className="py-2.5 px-3">Sex / Age</th>
                      <th className="py-2.5 px-3">Blood Group</th>
                      <th className="py-2.5 px-3">Registration Date</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF1] text-[#172B4D]">
                    {patients.map((p) => {
                      const isSelected = selectedPatient?.id === p.id;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPatient(isSelected ? null : p)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#EAF2FF]/60' : 'hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-[#2563EB]">
                            {p.mrn}
                          </td>
                          <td className="py-3 px-3 font-medium text-[#17365D]">
                            {p.full_name}
                          </td>
                          <td className="py-3 px-3 text-[#64748B]">
                            {p.biological_sex} • {p.age_years} yrs
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F1F5F9] text-[#17365D] border border-[#E5EAF1]">
                              {p.blood_group || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[11px] font-mono text-[#64748B]">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                to={`/data-entry?mrn=${p.mrn}`}
                                title="Order Lab Panel"
                                className="px-2 py-1 rounded bg-[#F8FAFC] hover:bg-[#EAF2FF] border border-[#E5EAF1] text-[#2563EB] text-[11px] font-medium"
                              >
                                + Lab Entry
                              </Link>
                              <Link
                                to={`/history`}
                                title="View Patient Longitudinal Trajectory"
                                className="px-2 py-1 rounded bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E5EAF1] text-[#64748B] hover:text-[#172B4D] text-[11px]"
                              >
                                History
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Selected Patient Detail Drawer/Card */}
        {selectedPatient && (
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
                <div>
                  <span className="text-[10px] font-mono text-[#2563EB] uppercase font-bold">
                    Patient Profile
                  </span>
                  <h2 className="text-base font-bold text-[#17365D]">
                    {selectedPatient.full_name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-1 rounded hover:bg-[#F8FAFC] text-[#64748B]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                  <span className="text-[10px] uppercase font-mono text-[#64748B]">MRN</span>
                  <p className="font-mono font-bold text-[#17365D] mt-0.5">{selectedPatient.mrn}</p>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                  <span className="text-[10px] uppercase font-mono text-[#64748B]">Biological Sex</span>
                  <p className="font-semibold text-[#17365D] mt-0.5">{selectedPatient.biological_sex}</p>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                  <span className="text-[10px] uppercase font-mono text-[#64748B]">Date of Birth</span>
                  <p className="font-mono text-[#17365D] mt-0.5">{selectedPatient.date_of_birth} ({selectedPatient.age_years} yrs)</p>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                  <span className="text-[10px] uppercase font-mono text-[#64748B]">Blood Group</span>
                  <p className="font-mono font-semibold text-[#17365D] mt-0.5">{selectedPatient.blood_group || 'Unspecified'}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] block">Known Drug Allergies:</span>
                  <p className="text-[#172B4D] bg-[#F8FAFC] p-2 rounded border border-[#E5EAF1] mt-1 text-[11px]">
                    {selectedPatient.known_allergies || 'No known allergies recorded.'}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] block">Medical History:</span>
                  <p className="text-[#172B4D] bg-[#F8FAFC] p-2 rounded border border-[#E5EAF1] mt-1 text-[11px] whitespace-pre-wrap">
                    {selectedPatient.medical_history || 'No prior medical conditions documented.'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5EAF1] flex items-center gap-2">
                <Link
                  to={`/data-entry?mrn=${selectedPatient.mrn}`}
                  className="flex-1 py-2 text-center text-xs font-semibold bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-lg transition-colors"
                >
                  Enter Lab Data
                </Link>
                <Link
                  to={`/history`}
                  className="flex-1 py-2 text-center text-xs font-semibold bg-white hover:bg-[#F8FAFC] border border-[#E5EAF1] text-[#17365D] rounded-lg transition-colors"
                >
                  View Trends & Deltas
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5EAF1] rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#17365D]">Register New Patient</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#64748B] hover:text-[#172B4D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                    Medical Record Number (MRN)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={mrn}
                      onChange={(e) => setMrn(e.target.value)}
                      placeholder="e.g. MRN-2026-0001"
                      className="w-full bg-white border border-[#E5EAF1] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] font-mono focus:border-[#2563EB] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateMrn}
                      title="Auto-generate standard sequential MRN"
                      className="px-2 py-1 bg-[#F8FAFC] hover:bg-[#EAF2FF] border border-[#E5EAF1] rounded text-[10px] text-[#2563EB] font-mono"
                    >
                      Gen
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full bg-white border border-[#E5EAF1] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-white border border-[#E5EAF1] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] font-mono focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                    Biological Sex
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as any)}
                    className="w-full bg-white border border-[#E5EAF1] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="FEMALE">FEMALE</option>
                    <option value="MALE">MALE</option>
                    <option value="INTERSEX">INTERSEX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-white border border-[#E5EAF1] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] font-mono focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full bg-white border border-[#E5EAF1] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                  Known Drug Allergies
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa drugs"
                  className="w-full bg-white border border-[#E5EAF1] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#172B4D] mb-1">
                  Clinical History & Notes
                </label>
                <textarea
                  rows={2}
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  placeholder="Prior renal insufficiency, T2DM, hypertension..."
                  className="w-full bg-white border border-[#E5EAF1] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5EAF1]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 text-xs font-medium text-[#64748B] hover:text-[#172B4D] bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1d4ed8] rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Save Patient Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

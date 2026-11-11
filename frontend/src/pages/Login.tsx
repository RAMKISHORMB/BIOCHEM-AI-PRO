import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, User, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('USER');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        await register(email, password, fullName, 'USER');
        await login(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center items-center px-4 py-12 relative">
      <div className="w-full max-w-md relative z-10">
        {/* Header / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#17365D] text-white shadow-sm mb-3">
            <Activity className="w-6 h-6 text-[#2563EB]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17365D]">
            BIOCHEM AI <span className="text-[#2563EB]">PRO</span>
          </h1>
          <p className="text-xs text-[#64748B] font-medium mt-1">
            Clinical Biochemistry Intelligence Platform
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF2FF] border border-[#BFDBFE] text-[11px] text-[#2563EB] font-medium">
            <Shield className="w-3 h-3" />
            <span>Authorized Clinical Access Only</span>
          </div>
        </div>

        {/* White Card */}
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-8 shadow-card">
          <div className="flex border-b border-[#E5EAF1] mb-6 pb-2">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError(null);
              }}
              className={`flex-1 text-center py-2 text-xs font-semibold border-b-2 transition-colors ${
                !isRegistering
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setError(null);
              }}
              className={`flex-1 text-center py-2 text-xs font-semibold border-b-2 transition-colors ${
                isRegistering
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              Register Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs text-[#DC2626] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-xs font-medium text-[#172B4D] mb-1">
                  Full Name & Title
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-[#64748B]" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Sarah Jenkins, MD"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5EAF1] rounded-lg text-xs text-[#172B4D] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#172B4D] mb-1">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#64748B]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.org"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5EAF1] rounded-lg text-xs text-[#172B4D] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#172B4D] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-[#64748B]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5EAF1] rounded-lg text-xs text-[#172B4D] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            {isRegistering && (
              <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[11px] text-[#166534] flex items-center gap-2">
                <Shield className="w-4 h-4 flex-shrink-0 text-[#16A34A]" />
                <span>Standard User Account. Clinical laboratory roles (Biochemist, Clinician, Technician) are assigned by system administrators.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#17365D] hover:bg-[#122b4a] text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm mt-2"
            >
              {isSubmitting ? 'Authenticating...' : isRegistering ? 'Register Operator Account' : 'Authenticate & Enter LIS'}
            </button>
          </form>
        </div>

        {/* Platform Architecture Footer */}
        <p className="text-center text-[11px] text-[#64748B] mt-6">
          Clinical Decision-Support Architecture • Role-Based Access Control • Local-First Execution
        </p>
      </div>
    </div>
  );
};

export default Login;

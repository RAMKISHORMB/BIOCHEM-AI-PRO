import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, UserRole } from '../types/auth';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserPlus, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New user form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('CLINICIAN');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<User[]>('/auth/users');
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        role,
      });
      setSuccess(`User ${email} created successfully`);
      setShowAddModal(false);
      setEmail('');
      setPassword('');
      setFullName('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      setError('Cannot modify active status of your own administrator session.');
      return;
    }
    setError(null);
    try {
      await api.patch(`/auth/users/${user.id}/status`, {
        is_active: !user.is_active,
      });
      setSuccess(`User ${user.email} status updated`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    setError(null);
    try {
      await api.patch(`/auth/users/${userId}/status`, {
        role: newRole,
      });
      setSuccess(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            User & Role Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure system authorization, staff access tiers, and clinical credential privileges.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New User</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-lg text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-lg text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* User Table */}
      <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-navy-800 border-b border-navy-700 text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role Tier</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading clinical user directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No users registered in system.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-navy-800/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">{u.full_name}</td>
                    <td className="py-3 px-4 font-mono text-cyan-300">{u.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        disabled={u.id === currentUser?.id}
                        onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                        className="bg-navy-950 border border-navy-700 text-slate-200 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-cyan-500"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="BIOCHEMIST">BIOCHEMIST</option>
                        <option value="TECHNICIAN">TECHNICIAN</option>
                        <option value="CLINICIAN">CLINICIAN</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-950 text-red-400 border border-red-800">
                          <XCircle className="w-3 h-3" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${
                            u.is_active
                              ? 'border-red-700/60 text-red-400 hover:bg-red-950'
                              : 'border-emerald-700/60 text-emerald-400 hover:bg-emerald-950'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Provision Clinical Staff Account</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name & Title</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Alex Mercer, MD"
                  className="w-full bg-navy-950 border border-navy-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.org"
                  className="w-full bg-navy-950 border border-navy-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-navy-950 border border-navy-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-navy-950 border border-navy-700 rounded px-3 py-2 text-xs text-white"
                >
                  <option value="CLINICIAN">Clinician / Attending Physician</option>
                  <option value="BIOCHEMIST">Clinical Biochemist / Pathologist</option>
                  <option value="TECHNICIAN">Medical Laboratory Technician (MLT)</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-1.5 rounded"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

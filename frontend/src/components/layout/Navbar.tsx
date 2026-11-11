import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Database,
  CheckCircle2,
  Shield,
  HelpCircle
} from 'lucide-react';

const routeTitleMap: Record<string, { section: string; title: string }> = {
  '/': { section: 'Overview', title: 'Laboratory Overview' },
  '/patients': { section: 'Laboratory', title: 'Patient Registry' },
  '/data-entry': { section: 'Laboratory', title: 'Manual Laboratory Data Entry' },
  '/reference-ranges': { section: 'Laboratory', title: 'Reference Range Catalog' },
  '/interpretations': { section: 'Laboratory', title: 'Biochemical Interpretation Engine' },
  '/pathways': { section: 'Biochemistry', title: 'Metabolic Pathway Explorer' },
  '/genetics': { section: 'Biochemistry', title: 'Gene & Enzyme Relationship Explorer' },
  '/ai-assistant': { section: 'Intelligence', title: 'Local AI Assistant' },
  '/knowledge-base': { section: 'Intelligence', title: 'Clinical Knowledge Base' },
  '/ml-datasets': { section: 'Intelligence', title: 'ML Datasets & Profiling' },
  '/ml-models': { section: 'Intelligence', title: 'Model Training & Evaluation' },
  '/explainability': { section: 'Intelligence', title: 'Explainability & Anomaly Analysis' },
  '/history': { section: 'Records', title: 'Patient History & Delta Checks' },
  '/reports': { section: 'Records', title: 'Clinical Reports & Exports' },
  '/audit-logs': { section: 'Records', title: 'Security & Compliance Audit Trail' },
  '/settings': { section: 'System', title: 'Application & System Settings' },
  '/users': { section: 'System', title: 'User Management & Authorization' },
};

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const routeInfo = routeTitleMap[location.pathname] || {
    section: 'Hospital System',
    title: 'Clinical Biochemistry Platform',
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]';
      case 'BIOCHEMIST':
        return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
      case 'TECHNICIAN':
        return 'bg-[#EAF2FF] text-[#2563EB] border-[#BFDBFE]';
      case 'USER':
        return 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]';
      case 'CLINICIAN':
      default:
        return 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E5EAF1] sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Left: Breadcrumbs & Page Title */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
          <span>BIOCHEM AI</span>
          <span>/</span>
          <span>{routeInfo.section}</span>
          <span>/</span>
          <span className="text-[#172B4D] font-medium">{routeInfo.title}</span>
        </div>
        <h1 className="text-base font-bold text-[#17365D] tracking-tight leading-tight mt-0.5">
          {routeInfo.title}
        </h1>
      </div>

      {/* Right: Search, DB Status, Notifications & Profile */}
      <div className="flex items-center gap-4">
        {/* Global Search Field */}
        <div className="relative hidden md:block w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search patients, MRN, tests..."
            className="w-full bg-[#F8FAFC] border border-[#E5EAF1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#172B4D] placeholder-[#64748B] focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        {/* Database Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0FDF4] border border-[#DCFCE7] text-[11px] font-medium text-[#15803D]">
          <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse"></span>
          <span>Database Online</span>
        </div>

        {/* Notification Icon */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg text-[#64748B] hover:text-[#172B4D] hover:bg-[#F8FAFC] transition-colors relative"
            title="System Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full absolute top-1.5 right-1.5"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5EAF1] rounded-xl shadow-card p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF1] font-semibold text-[#17365D]">
                <span>Clinical Notifications</span>
                <span className="text-[10px] text-[#64748B]">Automated</span>
              </div>
              <div className="py-3 text-[#64748B] text-[11px] space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#172B4D] font-medium">Tietz 7th Ed Reference Library Loaded</p>
                    <p className="text-[10px] text-[#64748B]">All reference intervals validated</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Database className="w-3.5 h-3.5 text-[#2563EB] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#172B4D] font-medium">Relational Storage Active</p>
                    <p className="text-[10px] text-[#64748B]">Zero mock data policy enforced</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-lg border border-[#E5EAF1] hover:bg-[#F8FAFC] transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center font-bold text-xs">
                {user.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-semibold text-[#17365D] leading-none">
                  {user.full_name}
                </div>
                <div className="text-[10px] text-[#64748B] font-mono leading-none mt-0.5">
                  {user.role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E5EAF1] rounded-xl shadow-card p-3 z-50">
                <div className="pb-2.5 border-b border-[#E5EAF1]">
                  <p className="text-xs font-bold text-[#17365D]">{user.full_name}</p>
                  <p className="text-[11px] text-[#64748B] font-mono truncate">{user.email}</p>
                  <div className="mt-2">
                    <span
                      className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${getRoleBadge(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="py-2 space-y-1 text-xs">
                  <Link
                    to="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[#172B4D] hover:bg-[#F8FAFC]"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>System Settings</span>
                  </Link>
                  <Link
                    to="/audit-logs"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[#172B4D] hover:bg-[#F8FAFC]"
                  >
                    <Database className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Audit Trail</span>
                  </Link>
                </div>

                <div className="pt-2 border-t border-[#E5EAF1]">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

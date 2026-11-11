import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  BookOpenCheck,
  Cpu,
  GitBranch,
  Dna,
  BotMessageSquare,
  BookMarked,
  Database,
  BrainCircuit,
  SlidersHorizontal,
  History,
  FileSpreadsheet,
  ShieldAlert,
  UserCheck,
  Settings as SettingsIcon,
  Activity,
  Table,
  Sliders,
  Play,
  Award,
  Calculator,
  Gauge,
  HeartPulse,
  Droplet,
  Zap,
  LineChart
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const sections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      ],
    },
    {
      title: 'LABORATORY',
      items: [
        { name: 'Patient Registry', path: '/patients', icon: Users },
        { name: 'Manual Data Entry', path: '/data-entry', icon: FlaskConical },
        { name: 'Reference Ranges', path: '/reference-ranges', icon: BookOpenCheck },
        { name: 'Interpretation Engine', path: '/interpretations', icon: Cpu },
      ],
    },
    {
      title: 'BIOCHEMISTRY',
      items: [
        { name: 'Metabolic Pathways', path: '/pathways', icon: GitBranch },
        { name: 'Gene & Enzyme Explorer', path: '/genetics', icon: Dna },
      ],
    },
    {
      title: 'BIOCHEMICAL INTELLIGENCE',
      items: [
        { name: 'Calculation Engine', path: '/biochem/calculations', icon: Calculator },
        { name: 'Acid–Base Analysis', path: '/biochem/acid-base', icon: Gauge },
        { name: 'Liver Profile', path: '/biochem/liver', icon: Activity },
        { name: 'Renal Profile', path: '/biochem/renal', icon: Droplet },
        { name: 'Electrolyte Profile', path: '/biochem/electrolyte', icon: Zap },
        { name: 'Metabolic Profile', path: '/biochem/metabolic', icon: HeartPulse },
        { name: 'Patient Analytics', path: '/biochem/analytics', icon: LineChart },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { name: 'Local AI Assistant', path: '/ai-assistant', icon: BotMessageSquare },
        { name: 'Knowledge Base', path: '/knowledge-base', icon: BookMarked },
      ],
    },
    {
      title: 'MACHINE LEARNING',
      items: [
        { name: 'Dataset Library', path: '/ml/datasets', icon: Database },
        { name: 'Dataset Explorer', path: '/ml/explorer', icon: Table },
        { name: 'Data Preprocessing', path: '/ml/preprocessing', icon: Sliders },
        { name: 'Model Training', path: '/ml/training', icon: Play },
        { name: 'Model Evaluation', path: '/ml/evaluation', icon: Award },
        { name: 'Explainability (SHAP)', path: '/ml/explainability', icon: SlidersHorizontal },
        { name: 'Model Registry', path: '/ml/registry', icon: BrainCircuit },
      ],
    },
    {
      title: 'RECORDS',
      items: [
        { name: 'Patient History', path: '/history', icon: History },
        { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
        { name: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'User Management', path: '/users', icon: UserCheck, roles: ['ADMIN'] },
        { name: 'Settings', path: '/settings', icon: SettingsIcon },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E5EAF1] flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#E5EAF1]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#17365D] text-white flex items-center justify-center shadow-sm">
            <Activity className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-[#17365D] text-sm leading-none">
                BIOCHEM AI
              </span>
              <span className="text-[10px] font-bold font-mono px-1 py-0.2 rounded bg-[#EAF2FF] text-[#2563EB]">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] font-medium leading-tight mt-0.5">
              Clinical Biochemistry Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {sections.map((section) => {
          const filteredItems = section.items.filter(
            (item) => !item.roles || (user && item.roles.includes(user.role))
          );

          if (filteredItems.length === 0) return null;

          return (
            <div key={section.title}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider uppercase text-[#64748B]">
                {section.title}
              </div>
              <nav className="space-y-0.5">
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-[#EAF2FF] text-[#2563EB] font-semibold'
                            : 'text-[#172B4D] hover:text-[#2563EB] hover:bg-[#F8FAFC]'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0 opacity-80" />
                      <span className="truncate">{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#E5EAF1] bg-[#F8FAFC] text-[11px] text-[#64748B]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
            LIS Core v1.0
          </span>
          <span className="text-[10px] font-mono text-[#64748B]">Local-First</span>
        </div>
      </div>
    </aside>
  );
};

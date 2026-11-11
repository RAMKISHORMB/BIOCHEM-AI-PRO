import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { AlertCircle } from 'lucide-react';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172B4D] flex flex-col font-sans">
      <Navbar />

      {/* Clinical Regulatory & Operational Disclaimer Banner */}
      <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-6 py-1.5 flex items-center justify-between text-xs text-[#92400E]">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-[#D97706] flex-shrink-0" />
          <span>
            <strong className="font-semibold text-[#B45309]">Clinical Notice:</strong> Live database connection active. All automated biochemical calculations and ML risk metrics are clinical decision support tools and require licensed clinician verification before patient care actions.
          </span>
        </div>
        <div className="hidden md:flex items-center gap-3 font-mono text-[11px] text-[#78350F]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]"></span> Security Audit Logging Active
          </span>
          <span>•</span>
          <span>Traceable Tietz 7th Ed</span>
        </div>
      </div>

      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 bg-[#F7F9FC]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

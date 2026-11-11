import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/auth';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy-950 text-cyan-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-400 tracking-wider">VERIFYING CLINICAL SESSION...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-20 bg-navy-900 border border-red-500/30 rounded-xl text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">Access Restricted (RBAC)</h2>
        <p className="text-slate-300 text-sm mb-4">
          Your current account role <span className="font-mono text-cyan-300">[{user.role}]</span> does not possess clearance to access this module.
        </p>
        <p className="text-xs text-slate-500">Contact a System Administrator if this authorization level is required for your duties.</p>
      </div>
    );
  }

  return <Outlet />;
};

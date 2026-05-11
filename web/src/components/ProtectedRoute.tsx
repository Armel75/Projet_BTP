import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requirePermission?: string;
  requireAnyPermission?: string[];
  requireAllPermissions?: string[];
};

export function ProtectedRoute({
  children,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
}: ProtectedRouteProps) {
  const { user, loading, can, canAny, canAll } = useAuth();

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center text-gb-muted text-sm">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasSingle = requirePermission ? can(requirePermission) : true;
  const hasAny = requireAnyPermission && requireAnyPermission.length > 0
    ? canAny(...requireAnyPermission)
    : true;
  const hasAll = requireAllPermissions && requireAllPermissions.length > 0
    ? canAll(...requireAllPermissions)
    : true;

  if (!hasSingle || !hasAny || !hasAll) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

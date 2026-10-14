import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function RoleGuard({ allow }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/admin/dashboard" replace />;
    if (user.role === "delivery_partner") return <Navigate to="/delivery/dashboard" replace />;
    return <Navigate to="/restaurant/dashboard" replace />;
  }
  return <Outlet />;
}
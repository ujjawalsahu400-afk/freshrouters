import React from "react";

const STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  preparing: "bg-blue-50 text-blue-700 border-blue-200",
  packed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  assigned: "bg-violet-50 text-violet-700 border-violet-200",
  out_for_delivery: "bg-cyan-50 text-cyan-700 border-cyan-200",
  arrived: "bg-teal-50 text-teal-700 border-teal-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  unpaid: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partially_paid: "bg-blue-50 text-blue-700 border-blue-200",
  refunded: "bg-rose-50 text-rose-700 border-rose-200",
  not_assigned: "bg-slate-100 text-slate-600 border-slate-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending_verification: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  suspended: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium capitalize whitespace-nowrap ${cls}`}>
      {(status || "—").replace(/_/g, " ")}
    </span>
  );
}
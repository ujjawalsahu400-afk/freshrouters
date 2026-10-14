import React, { useState } from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  ClipboardList,
  Menu,
  X,
  LogOut,
  Leaf,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
];

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col text-emerald-50">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-emerald-400/20 flex items-center justify-center">
          <Leaf className="w-5 h-5 text-emerald-300" />
        </div>
        <div className="leading-tight">
          <p className="font-semibold text-lg tracking-tight">FreshSupply</p>
          <p className="text-[10px] text-emerald-200/60 uppercase tracking-widest">Admin</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-emerald-400/15 text-white font-medium"
                  : "text-emerald-100/70 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <n.icon className="w-4 h-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10 text-[11px] text-emerald-100/40">
        More modules coming in next phases
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-emerald-900 to-green-950 flex-col z-30">
        <SidebarContent />
      </aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-gradient-to-b from-emerald-900 to-green-950">
            <button
              className="absolute top-4 right-4 text-white/80"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b h-16 flex items-center gap-3 px-4 sm:px-6">
          <button className="lg:hidden p-2 -ml-2" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search orders, restaurants..."
              className="pl-10 h-10"
              onFocus={() => navigate("/admin/orders")}
              readOnly
            />
          </div>
          <div className="flex items-center gap-2 pl-2 border-l">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-semibold">
              {(user?.full_name || user?.email || "A").charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-sm leading-tight">
              <p className="font-medium">Admin</p>
              <p className="text-xs text-muted-foreground truncate max-w-[140px]">{user?.email}</p>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 rounded-lg hover:bg-muted"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
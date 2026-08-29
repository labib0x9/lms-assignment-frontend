"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/api";

export default function DashboardNav({ user, roleLabel, roleBadgeStyle }) {
  const router = useRouter();

  const handleLogout = () => {
    logoutUser();
    router.push("/login");
  };

  return (
    <header className="w-full border-b border-slate-200/80 bg-[#faf9f6]/90 backdrop-blur-xs sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-[#0a192f] hover:opacity-85 transition-opacity"
          >
            Academy
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">
              {user?.username || user?.email}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                roleBadgeStyle || "bg-amber-100 text-amber-900 border border-amber-300/60"
              }`}
            >
              {roleLabel}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:text-red-700 bg-slate-100 hover:bg-red-50 rounded-xl transition-colors border border-slate-200/80"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

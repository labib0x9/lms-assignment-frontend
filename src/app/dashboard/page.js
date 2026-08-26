"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUser, logoutUser } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeUser = getCurrentUser();
    if (!activeUser) {
      // If not logged in, redirect to login
      router.push("/login");
    } else {
      setUser(activeUser);
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    logoutUser();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#0a192f] text-sm font-medium">
          <svg className="animate-spin h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          Loading your Academy dashboard...
        </div>
      </div>
    );
  }

  const roleName = user?.role?.name || (typeof user?.role === "string" ? user?.role : "Student");
  const roleType = (user?.role?.type || (typeof user?.role === "string" ? user?.role : "student")).toLowerCase();

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0a192f] flex flex-col selection:bg-amber-200 selection:text-amber-900">
      {/* Top Navigation */}
      <header className="w-full border-b border-slate-200/80 bg-[#faf9f6]/90 backdrop-blur-xs sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-[#0a192f] hover:opacity-85 transition-opacity"
            >
              Academy
            </Link>
            <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80">
              {roleName} Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-[#0a192f] leading-tight">{user?.username}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 sm:py-12 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a192f]">
              Welcome, {user?.username}! 👋
            </h1>
            <p className="text-sm text-slate-600">
              You are logged in as a registered <strong className="text-amber-900 font-semibold">{roleName}</strong> in Academy.
            </p>
          </div>
          {/* <div className="flex items-center gap-2 text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <span className="text-slate-500">Document ID:</span>
            <code className="font-mono text-slate-700">{user?.documentId || user?.id || "N/A"}</code>
          </div> */}
        </div>

        {/* Role-Specific Dashboard Views
        {roleType === "student" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#0a192f]">Student Workspace</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <p className="text-xs font-medium text-slate-500">Enrolled Courses</p>
                <p className="text-3xl font-bold text-[#0a192f]">4</p>
                <p className="text-xs text-emerald-600 font-medium">All courses active</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <p className="text-xs font-medium text-slate-500">Pending Assignments</p>
                <p className="text-3xl font-bold text-amber-700">2</p>
                <p className="text-xs text-amber-800 font-medium">1 assignment due this week</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <p className="text-xs font-medium text-slate-500">Average Grade</p>
                <p className="text-3xl font-bold text-slate-900">92%</p>
                <p className="text-xs text-slate-500">Based on 14 submissions</p>
              </div>
            </div>
          </div>
        )} */}

        {/* {roleType === "instructor" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#0a192f]">Instructor Management Console</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <p className="text-xs font-medium text-slate-500">Active Courses</p>
                <p className="text-3xl font-bold text-[#0a192f]">3</p>
                <p className="text-xs text-slate-500">148 Total Students Enrolled</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <p className="text-xs font-medium text-slate-500">Submissions to Grade</p>
                <p className="text-3xl font-bold text-amber-700">18</p>
                <p className="text-xs text-amber-800 font-medium">Ready for review</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <p className="text-xs font-medium text-slate-500">Class Average</p>
                <p className="text-3xl font-bold text-slate-900">88.4%</p>
                <p className="text-xs text-emerald-600 font-medium">+3.2% vs last cohort</p>
              </div>
            </div>
          </div>
        )} */}

        {/* {roleType === "content_manager" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#0a192f]">Content Management Studio</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <p className="text-xs font-medium text-slate-500">Published Modules</p>
                <p className="text-3xl font-bold text-[#0a192f]">24</p>
                <p className="text-xs text-slate-500">Across 6 learning tracks</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <p className="text-xs font-medium text-slate-500">Draft Lessons</p>
                <p className="text-3xl font-bold text-amber-700">5</p>
                <p className="text-xs text-amber-800 font-medium">In curriculum review</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <p className="text-xs font-medium text-slate-500">Media Assets</p>
                <p className="text-3xl font-bold text-slate-900">132</p>
                <p className="text-xs text-slate-500">Videos, slides & diagrams</p>
              </div>
            </div>
          </div>
        )} */}
{/* 
        {roleType === "admin" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#0a192f]">Platform Administration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <p className="text-xs font-medium text-slate-500">Total Users</p>
                <p className="text-3xl font-bold text-[#0a192f]">420</p>
                <p className="text-xs text-emerald-600 font-medium">Active platform accounts</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <p className="text-xs font-medium text-slate-500">API Health</p>
                <p className="text-3xl font-bold text-emerald-600">100%</p>
                <p className="text-xs text-slate-500">Strapi backend operational</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <p className="text-xs font-medium text-slate-500">System Roles</p>
                <p className="text-3xl font-bold text-slate-900">4</p>
                <p className="text-xs text-slate-500">Student, Instructor, Manager, Admin</p>
              </div>
            </div>
          </div>
        )} */}
      </main>
    </div>
  );
}

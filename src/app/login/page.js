"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api";

const ROLES = [
  { id: "student", label: "Student" },
  { id: "instructor", label: "Instructor" },
  { id: "content_manager", label: "Content Manager" },
  { id: "admin", label: "Admin" },
];

const DEMO_ACCOUNTS = [
  {
    label: "Student",
    identifier: "labibfaisal9834@gmail.com",
    password: "!@@###1Aa",
    role: "student",
    color: "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100",
  },
  {
    label: "Instructor 1",
    identifier: "admin@example.com",
    password: "password!1A",
    role: "instructor",
    color: "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100",
  },
  {
    label: "Instructor 2",
    identifier: "ins1@example.com",
    password: "password!1A",
    role: "instructor",
    color: "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleApplyDemo = (demo) => {
    setEmail(demo.identifier);
    setPassword(demo.password);
    setSelectedRole(demo.role);
    setErrorMessage("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    const result = await loginUser({
      identifier: email,
      email,
      password,
      role: selectedRole,
    });

    setIsLoading(false);

    if (result.success) {
      const user = result.data?.user;
      const roleName = user?.role?.name || ROLES.find((r) => r.id === selectedRole)?.label || "Student";
      setSuccessMessage(`Welcome back, ${user?.username || email}! Logged in as ${roleName}. Redirecting to dashboard...`);

      // Automatically redirect to the dashboard after 800ms
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    } else {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0a192f] flex flex-col selection:bg-amber-200 selection:text-amber-900">
      {/* Top Navigation */}
      <header className="w-full border-b border-slate-200/80 bg-[#faf9f6]/90 backdrop-blur-xs sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-[#0a192f] hover:opacity-85 transition-opacity"
          >
            Academy
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/signup"
              className="px-3.5 py-1.5 text-sm font-medium text-[#0a192f] border border-slate-300 rounded-lg hover:bg-slate-100/80 transition-colors"
            >
              Create Account
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-2 py-1.5"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Login Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0a192f] tracking-tight">
              Sign in to Academy
            </h1>
            <p className="text-sm text-slate-500">
              Select your role and enter your credentials to continue
            </p>
          </div>

          {/* Quick Demo Logins Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Quick Demo Accounts (Click to Fill)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((demo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyDemo(demo)}
                  className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors text-center ${demo.color}`}
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Roles Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Select Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((role) => {
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.id);
                      setErrorMessage("");
                    }}
                    className={`px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-amber-50 border-amber-400 text-amber-950 ring-1 ring-amber-400 shadow-xs"
                        : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span>{role.label}</span>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-amber-600"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alerts: Error & Success */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2.5">
              <svg
                className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-medium">Authentication Notice</p>
                <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-emerald-600 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Identifier / Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#0a192f]"
              >
                Email or Username
              </label>
              <input
                id="email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="labibfaisal9834@gmail.com"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#0a192f]"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-amber-900 hover:text-amber-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#0a192f] hover:bg-[#12284b] text-white font-medium text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    ></path>
                  </svg>
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <span>
                  Sign In as {ROLES.find((r) => r.id === selectedRole)?.label}
                </span>
              )}
            </button>
          </form>

          {/* Footer: Sign up prompt */}
          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/signup"
              className="font-semibold text-amber-900 hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

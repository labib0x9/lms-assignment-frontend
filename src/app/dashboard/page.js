"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/api";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import InstructorDashboard from "@/components/dashboard/InstructorDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
    } else {
      setUser(currentUser);
      setLoadingUser(false);
    }
  }, [router]);

  if (loadingUser || !user) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#0a192f] text-sm font-medium">
          <svg
            className="animate-spin h-5 w-5 text-amber-600"
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
          Loading your Academy dashboard...
        </div>
      </div>
    );
  }

  // Determine user role
  const roleType = (
    user?.role?.type ||
    (typeof user?.role === "string" ? user?.role : "student")
  ).toLowerCase();

  if (roleType === "student") {
    return <StudentDashboard user={user} />;
  }

  if (roleType === "instructor") {
    return <InstructorDashboard user={user} />;
  }

  // Admin & Content Manager
  return <AdminDashboard user={user} />;
}

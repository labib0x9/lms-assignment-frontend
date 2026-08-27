"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchCourses, getCurrentUser } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getCurrentUser());
    async function loadPublicCourses() {
      setLoadingCourses(true);
      const res = await fetchCourses();
      if (res.success) {
        setCourses(res.data || []);
      }
      setLoadingCourses(false);
    }
    loadPublicCourses();
  }, []);

  const handleEnrollClick = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0a192f] flex flex-col selection:bg-amber-200 selection:text-amber-900">
      {/* 1. Navbar */}
      <header className="w-full border-b border-slate-200/80 bg-[#faf9f6]/90 backdrop-blur-xs sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Project name as plain text / wordmark */}
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-[#0a192f] hover:opacity-85 transition-opacity"
          >
            Academy
          </Link>

          {/* Right: Blogs & Login / Dashboard outline buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/blogs"
              className="px-4 py-1.5 text-sm font-medium text-[#0a192f] border border-slate-300 rounded-lg hover:bg-slate-100/80 hover:border-slate-400 transition-colors"
            >
              Blogs
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-1.5 text-sm font-medium text-white bg-[#0a192f] hover:bg-[#132c52] rounded-lg transition-colors shadow-xs"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 text-sm font-medium text-[#0a192f] border border-slate-300 rounded-lg hover:bg-slate-100/80 hover:border-slate-400 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. Summary Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 sm:py-24 w-full space-y-16">
        <div className="max-w-3xl space-y-6">
          {/* Headline: mostly dark navy with a soft highlight pill in warm accent color */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0a192f] leading-[1.25] sm:leading-[1.2]">
            Academy is a focused learning platform for{" "}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xl sm:text-3xl lg:text-4xl font-semibold bg-amber-100 text-amber-900 border border-amber-300/70 align-baseline mx-0.5 sm:mx-1 shadow-xs">
              mastering Backend Engineering
            </span>
          </h1>
        </div>

        {/* Public Courses Catalog */}
        <div className="space-y-6 pt-4 border-t border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#0a192f] tracking-tight">
                Featured Courses
              </h2>
              <p className="text-sm text-slate-500">
                Explore our project-based curriculum taught by industry engineers
              </p>
            </div>
            {courses.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg">
                {courses.length} {courses.length === 1 ? "Course" : "Courses"} Available
              </span>
            )}
          </div>

          {loadingCourses ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-sm text-slate-500">
              Loading courses...
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700">
                No courses published yet.
              </p>
              <p className="text-xs text-slate-400">
                Check back soon or sign in as an instructor to create one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course) => {
                const docId = course.documentId || course.id;
                return (
                  <div
                    key={docId}
                    className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-bold text-[#0a192f] leading-snug line-clamp-2">
                          {course.title}
                        </h3>
                        <span className="px-2.5 py-1 text-xs font-bold text-amber-950 bg-amber-100/90 border border-amber-300/80 rounded-lg shrink-0">
                          ৳{course.price !== undefined ? course.price : 0}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                        {course.description || "No description provided."}
                      </p>
                    </div>

                    <button
                      onClick={handleEnrollClick}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-xs transition-colors text-center"
                    >
                      {user ? "View in Dashboard" : "Enroll (Sign in required)"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

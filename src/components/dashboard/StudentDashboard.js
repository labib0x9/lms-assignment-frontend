"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  fetchCourses,
  enrollInCourse,
  fetchMyEnrollments,
  fetchAllProgresses,
} from "@/lib/api";
import DashboardNav from "./DashboardNav";

export default function StudentDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [filterTab, setFilterTab] = useState("all"); // "all" | "enrolled"

  // Student enrollments and progress
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [progressMap, setProgressMap] = useState({});

  // Toast / Status messages
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Load progress records for enrolled courses
  const loadProgress = useCallback(async () => {
    const res = await fetchAllProgresses();
    if (res.success && Array.isArray(res.data)) {
      const map = {};
      res.data.forEach((p) => {
        const cId =
          p.course?.documentId || (typeof p.course === "string" ? p.course : null);
        if (cId) {
          const completedCount =
            p.completed_count !== undefined
              ? Number(p.completed_count)
              : Number(p.completed_lessons || 0);
          const totalLessons = Number(p.total_lessons || 0);
          const percentage =
            p.percentage !== undefined
              ? Number(p.percentage)
              : totalLessons > 0
              ? Math.round((completedCount * 100) / totalLessons)
              : 0;

          map[cId] = {
            completed_count: completedCount,
            completed_lessons: completedCount,
            total_lessons: totalLessons,
            percentage: percentage,
            completed_lesson_ids: Array.isArray(p.completed_lesson_ids)
              ? p.completed_lesson_ids
              : [],
            completed_at: p.completed_at || null,
          };
        }
      });
      setProgressMap(map);
    }
  }, []);

  // Load enrolled courses from API
  const loadEnrollments = useCallback(
    async (isManual = false) => {
      setLoadingEnrollments(true);
      const [enrollRes] = await Promise.all([
        fetchMyEnrollments(),
        loadProgress(),
      ]);
      setLoadingEnrollments(false);

      if (enrollRes.success && Array.isArray(enrollRes.data)) {
        const enrolledIds = enrollRes.data
          .map((enroll) => {
            const c = enroll.course;
            return c?.documentId || (typeof c === "string" ? c : null);
          })
          .filter(Boolean);
        setEnrolledCourseIds(enrolledIds);
        if (isManual) {
          setActionSuccess(
            `Refreshed! Found ${enrolledIds.length} enrolled courses.`
          );
          setTimeout(() => setActionSuccess(""), 4000);
        }
      }
    },
    [loadProgress]
  );

  // Load all available courses
  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    const res = await fetchCourses();
    setLoadingCourses(false);
    if (res.success && Array.isArray(res.data)) {
      setCourses(res.data);
    }
  }, []);

  useEffect(() => {
    loadCourses();
    loadEnrollments();
    loadProgress();
  }, [loadCourses, loadEnrollments, loadProgress]);

  // Calculate overall progress across all enrolled courses
  const overallStats = useMemo(() => {
    let totalCompleted = 0;
    let totalLessons = 0;
    enrolledCourseIds.forEach((docId) => {
      const prog = progressMap[docId];
      if (prog) {
        totalCompleted += Number(
          prog.completed_count !== undefined
            ? prog.completed_count
            : prog.completed_lessons || 0
        );
        totalLessons += Number(prog.total_lessons || 0);
      }
    });
    const overallPercentage =
      totalLessons > 0
        ? Math.round((totalCompleted / totalLessons) * 100)
        : 0;
    return { totalCompleted, totalLessons, overallPercentage };
  }, [enrolledCourseIds, progressMap]);

  // Student Enroll Action
  const handleEnroll = async (course) => {
    const docId = String(course.documentId);
    setActionError("");
    setActionSuccess("");

    const result = await enrollInCourse(docId);
    if (result.success) {
      setActionSuccess(`Successfully enrolled in "${course.title}"! 🎉`);
      await loadEnrollments();
      setTimeout(() => setActionSuccess(""), 4000);
    } else {
      setActionError(result.error);
      setTimeout(() => setActionError(""), 5000);
    }
  };

  // Filter courses based on active tab
  const displayedCourses = courses.filter((course) => {
    const docId = String(course.documentId || course.id);
    if (filterTab === "enrolled") {
      return enrolledCourseIds.includes(docId);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0a192f] flex flex-col selection:bg-amber-200 selection:text-amber-900">
      <DashboardNav
        user={user}
        roleLabel="Student"
        roleBadgeStyle="bg-emerald-100 text-emerald-900 border border-emerald-300/60"
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 sm:py-12 space-y-8">
        {/* Banner */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Student Learning Portal
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0a192f]">
              Welcome back, {user?.username || "Student"}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Explore your active courses, review curriculum materials, and track your step-by-step progress.
            </p>
          </div>

          <button
            onClick={() => loadEnrollments(true)}
            disabled={loadingEnrollments}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#0a192f] text-xs font-semibold rounded-xl border border-slate-200/80 transition-colors flex items-center gap-2 shrink-0"
          >
            <svg
              className={`w-3.5 h-3.5 ${loadingEnrollments ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{loadingEnrollments ? "Syncing..." : "Sync Enrollments"}</span>
          </button>
        </div>

        {/* Global Feedback Toasts */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-800 flex items-center gap-3 animate-in fade-in">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-3 animate-in fade-in">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{actionError}</span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Courses
            </p>
            <p className="text-3xl font-bold text-[#0a192f]">{courses.length}</p>
            <p className="text-xs text-slate-500">Available in catalog</p>
          </div>

          <div
            onClick={() => setFilterTab("enrolled")}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2 cursor-pointer hover:border-amber-400 transition-colors"
          >
            <div className="flex justify-between items-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Overall Progress
              </p>
              <span className="text-xs font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-lg">
                {overallStats.overallPercentage}%
              </span>
            </div>

            <p className="text-3xl font-bold text-[#0a192f]">
              {overallStats.totalCompleted} / {overallStats.totalLessons}
              <span className="text-xs text-slate-500 font-normal ml-1.5">
                Lessons Done
              </span>
            </p>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  overallStats.overallPercentage === 100
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
                style={{ width: `${overallStats.overallPercentage}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Backend Status
            </p>
            <p className="text-3xl font-bold text-emerald-600">Connected</p>
            <p className="text-xs text-slate-500">Strapi API v5 Live</p>
          </div>
        </div>

        {/* Courses Section */}
        <div className="space-y-5">
          {/* Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#0a192f]">
                {filterTab === "enrolled" ? "My Enrolled Courses" : "Explore All Courses"}
              </h2>
              <p className="text-xs text-slate-500">
                {filterTab === "enrolled"
                  ? "Courses you have actively enrolled in."
                  : "Browse full Academy curriculum and enroll."}
              </p>
            </div>

            <div className="flex items-center p-1 bg-slate-200/60 rounded-xl w-fit">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === "all"
                    ? "bg-white text-[#0a192f] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Courses ({courses.length})
              </button>
              <button
                onClick={() => setFilterTab("enrolled")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === "enrolled"
                    ? "bg-white text-[#0a192f] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Enrolled ({enrolledCourseIds.length})
              </button>
            </div>
          </div>

          {/* Loading Grid */}
          {loadingCourses && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white border border-slate-200/80 rounded-2xl p-6 h-64 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loadingCourses && displayedCourses.length === 0 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-3 shadow-xs">
              <div className="text-3xl">📚</div>
              <h3 className="text-base font-semibold text-[#0a192f]">
                {filterTab === "enrolled"
                  ? "You haven't enrolled in any courses yet."
                  : "No courses available in the catalog."}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {filterTab === "enrolled"
                  ? "Browse the catalog and click 'Enroll Now' on any course to begin learning."
                  : "Check back later for newly published programs."}
              </p>
              {filterTab === "enrolled" && (
                <button
                  onClick={() => setFilterTab("all")}
                  className="px-4 py-2 bg-[#0a192f] text-white text-xs font-medium rounded-xl hover:bg-[#132c52] transition-colors"
                >
                  Browse Catalog
                </button>
              )}
            </div>
          )}

          {/* Course Cards Grid */}
          {!loadingCourses && displayedCourses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedCourses.map((course) => {
                const docId = String(course.documentId || course.id);
                const isEnrolled = enrolledCourseIds.includes(docId);
                const lessonCount = Array.isArray(course.lessons)
                  ? course.lessons.length
                  : 0;

                const instructorsList =
                  course.Instructors ||
                  course.instructors ||
                  (course.instructor
                    ? Array.isArray(course.instructor)
                      ? course.instructor
                      : [course.instructor]
                    : []) ||
                  (course.user ? [course.user] : []);

                const instructorName =
                  Array.isArray(instructorsList) && instructorsList.length > 0
                    ? instructorsList[0]?.username || instructorsList[0]?.email
                    : null;

                const prog = progressMap[docId];
                const completed = Number(
                  prog?.completed_count !== undefined
                    ? prog.completed_count
                    : prog?.completed_lessons || 0
                );
                const total = Number(prog?.total_lessons || lessonCount || 0);
                const percentage =
                  total > 0 ? Math.round((completed * 100) / total) : 0;
                const isFinished =
                  (completed >= total && total > 0) || Boolean(prog?.completed_at);

                return (
                  <div
                    key={docId}
                    className={`bg-white border rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4 transition-all hover:shadow-sm ${
                      isEnrolled
                        ? "border-amber-300/80 ring-1 ring-amber-400/20"
                        : "border-slate-200/90 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-950 bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 rounded-md">
                          ৳{course.price !== undefined ? course.price : 0} BDT
                        </span>
                        {isEnrolled && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Enrolled
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-[#0a192f] line-clamp-1">
                        {course.title}
                      </h3>

                      <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                        {course.description || "No description provided."}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {instructorName && (
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            Instructor: {instructorName}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-amber-900 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md">
                          📖 {lessonCount} {lessonCount === 1 ? "Lesson" : "Lessons"}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      {isEnrolled && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-100/80">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-600 flex items-center gap-1">
                              <span>Progress</span>
                              {isFinished && <span>🏆</span>}
                            </span>
                            <span className="text-amber-950 font-bold">
                              {percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/70">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFinished ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          {isFinished && (
                            <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 py-0.5 px-2 rounded text-center">
                              🏆 Course Completed!
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <Link
                        href={`/courses/${docId}`}
                        className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
                      >
                        Curriculum
                      </Link>

                      {isEnrolled ? (
                        <Link
                          href={`/courses/${docId}`}
                          className="flex-1 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-colors text-center flex items-center justify-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Continue</span>
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleEnroll(course)}
                          className="flex-1 py-2 text-xs font-semibold text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-xs transition-colors"
                        >
                          Enroll Now (৳{course.price})
                        </button>
                      )}
                    </div>
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

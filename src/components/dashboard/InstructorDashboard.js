"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchCourses, createCourse } from "@/lib/api";
import DashboardNav from "./DashboardNav";

export default function InstructorDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [filterTab, setFilterTab] = useState("all"); // "all" | "authored"

  // Create Course Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    price: "",
  });

  // Toasts
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Load all courses
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
  }, [loadCourses]);

  // Check if current user is owner of the course
  const isOwnerOfCourse = (course) => {
    const currentDocId = user?.documentId;
    const currentId = user?.id;

    const instructorsList =
      course.Instructors ||
      course.instructors ||
      (course.instructor
        ? Array.isArray(course.instructor)
          ? course.instructor
          : [course.instructor]
        : []) ||
      (course.user ? [course.user] : []);

    if (Array.isArray(instructorsList) && instructorsList.length > 0) {
      return instructorsList.some((inst) => {
        if (!inst) return false;
        const instDocId =
          inst.documentId || (typeof inst === "string" ? inst : null);
        const instId = inst.id;
        return (
          (currentDocId && instDocId && instDocId === currentDocId) ||
          (currentId && instId && String(instId) === String(currentId))
        );
      });
    }

    return false;
  };

  const myCoursesCount = courses.filter(isOwnerOfCourse).length;

  // Filter courses based on active tab
  const displayedCourses = courses.filter((course) => {
    if (filterTab === "authored") {
      return isOwnerOfCourse(course);
    }
    return true;
  });

  // Handle Course Creation
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    const result = await createCourse({
      title: courseForm.title,
      description: courseForm.description,
      price: courseForm.price,
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsModalOpen(false);
      setCourseForm({ title: "", description: "", price: "" });
      setActionSuccess(`Course "${courseForm.title}" created successfully! 🎉`);
      await loadCourses();
      setTimeout(() => setActionSuccess(""), 4000);
    } else {
      setActionError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0a192f] flex flex-col selection:bg-amber-200 selection:text-amber-900">
      <DashboardNav
        user={user}
        roleLabel="Instructor"
        roleBadgeStyle="bg-amber-100 text-amber-900 border border-amber-300/60"
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 sm:py-12 space-y-8">
        {/* Banner */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Instructor Studio
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0a192f]">
              Welcome back, {user?.username || "Instructor"}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Manage your published courses, author lessons, build quizzes, and oversee your students.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-semibold rounded-2xl shadow-xs transition-colors flex items-center gap-2 shrink-0"
          >
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Create New Course</span>
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
              Total Catalog Courses
            </p>
            <p className="text-3xl font-bold text-[#0a192f]">{courses.length}</p>
            <p className="text-xs text-slate-500">Platform-wide programs</p>
          </div>

          <div
            onClick={() => setFilterTab("authored")}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 cursor-pointer hover:border-amber-400 transition-colors"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Your Authored Courses
            </p>
            <p className="text-3xl font-bold text-amber-900">{myCoursesCount}</p>
            <p className="text-xs text-slate-500">Click to filter your managed courses</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Authoring Permissions
            </p>
            <p className="text-3xl font-bold text-emerald-600">Active</p>
            <p className="text-xs text-slate-500">Course & Lesson Creation Enabled</p>
          </div>
        </div>

        {/* Courses Section */}
        <div className="space-y-5">
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#0a192f]">
                {filterTab === "authored" ? "My Authored Courses" : "All Platform Courses"}
              </h2>
              <p className="text-xs text-slate-500">
                {filterTab === "authored"
                  ? "Courses created and managed by your account."
                  : "All available courses published on the platform."}
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
                All ({courses.length})
              </button>
              <button
                onClick={() => setFilterTab("authored")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === "authored"
                    ? "bg-white text-[#0a192f] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Courses ({myCoursesCount})
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
              <div className="text-3xl">📝</div>
              <h3 className="text-base font-semibold text-[#0a192f]">
                {filterTab === "authored"
                  ? "You haven't authored any courses yet."
                  : "No courses published on the platform."}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {filterTab === "authored"
                  ? "Get started by creating your first course and authoring lesson materials."
                  : "Create the first course to launch your curriculum."}
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-[#0a192f] text-white text-xs font-medium rounded-xl hover:bg-[#132c52] transition-colors"
              >
                + Create Course
              </button>
            </div>
          )}

          {/* Courses Grid */}
          {!loadingCourses && displayedCourses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedCourses.map((course) => {
                const docId = String(course.documentId || course.id);
                const isOwner = isOwnerOfCourse(course);
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

                return (
                  <div
                    key={docId}
                    className={`bg-white border rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4 transition-all hover:shadow-sm ${
                      isOwner
                        ? "border-amber-300/90 ring-1 ring-amber-400/20"
                        : "border-slate-200/90 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-950 bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 rounded-md">
                          ৳{course.price !== undefined ? course.price : 0} BDT
                        </span>
                        {isOwner && (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            👑 Your Course
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
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between w-full">
                      {isOwner ? (
                        <Link
                          href={`/courses/${docId}`}
                          className="w-full py-2.5 text-xs font-semibold text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl transition-colors text-center"
                        >
                          Manage Course & Lessons →
                        </Link>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[11px] text-slate-400 font-medium">
                            Other Instructor
                          </span>
                          <Link
                            href={`/courses/${docId}`}
                            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            View Curriculum
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0a192f]">
                Create New Course
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, title: e.target.value })
                  }
                  placeholder="e.g. Master Next.js 16 and Strapi 5"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={courseForm.description}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Provide an overview of the curriculum and learning outcomes..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Course Price (BDT / ৳) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={courseForm.price}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, price: e.target.value })
                  }
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-xs disabled:opacity-70 flex items-center gap-2"
                >
                  {isSubmitting ? "Creating..." : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

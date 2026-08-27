"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  logoutUser,
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Courses state
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Student enrollment tracking
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);

  // Course Modal state (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null); // null = Create, object = Edit
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    price: "",
  });

  // Course Details View Modal state
  const [viewingCourse, setViewingCourse] = useState(null);

  // Load user session
  useEffect(() => {
    const activeUser = getCurrentUser();
    if (!activeUser) {
      router.push("/login");
    } else {
      setUser(activeUser);
      setLoadingUser(false);
    }
  }, [router]);

  // Load enrolled courses for student from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("academy_enrolled_courses");
        if (saved) setEnrolledCourseIds(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Fetch courses from Strapi backend
  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    setCoursesError("");
    const result = await fetchCourses();
    setLoadingCourses(false);

    if (result.success) {
      setCourses(result.data || []);
    } else {
      setCoursesError(result.error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadCourses();
    }
  }, [user, loadCourses]);

  const handleLogout = () => {
    logoutUser();
    router.push("/login");
  };

  // Determine user role
  const roleName =
    user?.role?.name ||
    (typeof user?.role === "string" ? user?.role : "Student");
  const roleType = (
    user?.role?.type ||
    (typeof user?.role === "string" ? user?.role : "student")
  ).toLowerCase();

  const isStudent = roleType === "student";
  const isInstructor = roleType === "instructor";
  const isAdmin = roleType === "admin";
  const isContentManager = roleType === "content_manager";
  const canCreateCourse = isInstructor || isAdmin || isContentManager;

  // Match current active user's documentId with the course's Instructors list
  const isOwnerOfCourse = (course) => {
    if (isAdmin || isContentManager) return true; // Admins can manage all
    if (!isInstructor) return false;

    const currentDocId = user?.documentId;
    const currentId = user?.id;

    // Check Instructors array (from Strapi relation: course.Instructors or course.instructors)
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

  // Open Create Modal
  const openCreateModal = () => {
    setEditingCourse(null);
    setCourseForm({ title: "", description: "", price: "" });
    setActionError("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title || "",
      description: course.description || "",
      price: course.price !== undefined ? course.price : "",
    });
    setActionError("");
    setIsModalOpen(true);
  };

  // Submit Create / Edit Course
  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");
    setIsSubmitting(true);

    const docId = editingCourse?.documentId || editingCourse?.id;

    let result;
    if (editingCourse) {
      result = await updateCourse(docId, {
        title: courseForm.title,
        description: courseForm.description,
        price: courseForm.price,
      });
    } else {
      result = await createCourse({
        title: courseForm.title,
        description: courseForm.description,
        price: courseForm.price,
      });
    }

    setIsSubmitting(false);

    if (result.success) {
      setIsModalOpen(false);
      setActionSuccess(
        editingCourse
          ? `Course "${courseForm.title}" updated successfully!`
          : `Course "${courseForm.title}" created successfully!`
      );
      await loadCourses();
      setTimeout(() => setActionSuccess(""), 4000);
    } else {
      setActionError(result.error);
    }
  };

  // Delete Course
  const handleDeleteCourse = async (course) => {
    const docId = course.documentId || course.id;
    if (!window.confirm(`Are you sure you want to delete "${course.title}"?`)) {
      return;
    }

    setActionError("");
    setActionSuccess("");

    const result = await deleteCourse(docId);
    if (result.success) {
      setActionSuccess(`Course "${course.title}" deleted.`);
      await loadCourses();
      setTimeout(() => setActionSuccess(""), 4000);
    } else {
      setActionError(result.error);
      setTimeout(() => setActionError(""), 5000);
    }
  };

  // Student Enroll
  const handleEnroll = (course) => {
    const docId = String(course.documentId || course.id);
    if (enrolledCourseIds.includes(docId)) return;

    const updated = [...enrolledCourseIds, docId];
    setEnrolledCourseIds(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("academy_enrolled_courses", JSON.stringify(updated));
    }
    setActionSuccess(`Successfully enrolled in "${course.title}"! 🎉`);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  if (loadingUser) {
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

  // Count courses authored by current user
  const myCoursesCount = courses.filter(isOwnerOfCourse).length;

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0a192f] flex flex-col selection:bg-amber-200 selection:text-amber-900">
      {/* Top Navigation */}
      <header className="w-full border-b border-slate-200/80 bg-[#faf9f6]/90 backdrop-blur-xs sticky top-0 z-40">
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
              <p className="text-sm font-semibold text-[#0a192f] leading-tight">
                {user?.username}
              </p>
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
        {/* Welcome Header */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a192f]">
              Welcome, {user?.username}! 👋
            </h1>
            <p className="text-sm text-slate-600">
              {isInstructor &&
                "Manage your authored courses, update lesson content, or create a new course."}
              {isStudent &&
                "Explore available engineering courses, track your enrollments, and start learning."}
              {(isAdmin || isContentManager) &&
                "Full administration access to manage, publish, and delete all courses."}
            </p>
          </div>

          {/* Action button for Instructor / Admin / Content Manager */}
          {canCreateCourse && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-[#0a192f] hover:bg-[#132c52] text-white text-sm font-medium rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Create New Course</span>
            </button>
          )}
        </div>

        {/* Global Toast / Alerts */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-3">
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
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-3">
            <svg
              className="w-5 h-5 text-red-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{actionError}</span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isInstructor ? "Your Authored Courses" : "Total Platform Courses"}
            </p>
            <p className="text-3xl font-bold text-[#0a192f]">
              {isInstructor ? myCoursesCount : courses.length}
            </p>
            <p className="text-xs text-slate-500">
              {isInstructor
                ? `${courses.length} total courses on Academy`
                : "Available in catalog"}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isStudent ? "Your Enrolled Courses" : "Permissions"}
            </p>
            <p className="text-3xl font-bold text-amber-900">
              {isStudent
                ? enrolledCourseIds.length
                : isInstructor
                ? "Author & Editor"
                : "Full Admin Access"}
            </p>
            <p className="text-xs text-slate-500">
              {isStudent
                ? "Active learning programs"
                : isInstructor
                ? "Edit/Delete enabled only for your courses"
                : "Platform-wide management enabled"}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Backend Status
            </p>
            <p className="text-3xl font-bold text-emerald-600">Connected</p>
            <p className="text-xs text-slate-500">Strapi API v5</p>
          </div>
        </div>

        {/* Courses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0a192f]">
                {isInstructor && "All Courses & Your Authored Materials"}
                {isStudent && "Available Courses"}
                {(isAdmin || isContentManager) && "All Platform Courses"}
              </h2>
              <p className="text-xs text-slate-500">
                {isInstructor &&
                  "You can edit and delete your own courses. Courses by other instructors are view-only."}
                {isStudent && "Browse courses and click enroll to join."}
                {(isAdmin || isContentManager) &&
                  "Manage, edit, or delete any course on the platform."}
              </p>
            </div>

            <button
              onClick={loadCourses}
              disabled={loadingCourses}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 ${
                  loadingCourses ? "animate-spin" : ""
                }`}
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
              Refresh
            </button>
          </div>

          {/* Loading State */}
          {loadingCourses && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <svg
                className="animate-spin h-6 w-6 text-amber-600 mx-auto"
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
              <p className="text-sm text-slate-500">
                Fetching courses from API...
              </p>
            </div>
          )}

          {/* Error State */}
          {!loadingCourses && coursesError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-red-800">
                Could not load courses
              </p>
              <p className="text-xs text-red-600">{coursesError}</p>
              <button
                onClick={loadCourses}
                className="text-xs font-semibold text-red-800 underline mt-2"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loadingCourses && !coursesError && courses.length === 0 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-4 shadow-xs">
              <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto text-xl font-bold">
                📚
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#0a192f]">
                  No courses published yet
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {canCreateCourse
                    ? "Click the button below to create and publish the first course."
                    : "There are currently no courses published."}
                </p>
              </div>
              {canCreateCourse && (
                <button
                  onClick={openCreateModal}
                  className="px-4 py-2 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-medium rounded-xl transition-colors"
                >
                  + Create First Course
                </button>
              )}
            </div>
          )}

          {/* Courses Grid */}
          {!loadingCourses && courses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course) => {
                const docId = String(course.documentId || course.id);
                const isEnrolled = enrolledCourseIds.includes(docId);
                const isMyCourse = isOwnerOfCourse(course);

                // Extract instructor names for display
                const instructorsList =
                  course.Instructors ||
                  course.instructors ||
                  (course.instructor
                    ? Array.isArray(course.instructor)
                      ? course.instructor
                      : [course.instructor]
                    : []);
                const instructorName =
                  Array.isArray(instructorsList) && instructorsList.length > 0
                    ? instructorsList
                        .map((i) => i?.username || i?.email)
                        .filter(Boolean)
                        .join(", ")
                    : null;

                return (
                  <div
                    key={docId}
                    className={`bg-white border rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-all space-y-4 ${
                      isMyCourse && isInstructor
                        ? "border-amber-300/80 ring-1 ring-amber-300/40 bg-amber-50/10"
                        : "border-slate-200/90 hover:border-slate-300"
                    }`}
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

                      {/* Instructor badge */}
                      {instructorName && (
                        <div className="pt-1">
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            Instructor: {instructorName}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {/* 1. MATCH: Show Edit & Delete if User is Owner (or Admin/Content Manager) */}
                      {isMyCourse && (
                        <div className="flex items-center gap-2 w-full justify-between">
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                            {isInstructor ? "Your Course" : "Admin Managed"}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingCourse(course)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => openEditModal(course)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course)}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 2. NO MATCH for Instructor: Show only View button */}
                      {!isMyCourse && isInstructor && (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[11px] text-slate-400 font-medium">
                            Created by another instructor
                          </span>
                          <button
                            onClick={() => setViewingCourse(course)}
                            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            View
                          </button>
                        </div>
                      )}

                      {/* 3. Student View: View & Enroll */}
                      {isStudent && (
                        <div className="w-full flex items-center gap-2">
                          <button
                            onClick={() => setViewingCourse(course)}
                            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                          >
                            View
                          </button>
                          {isEnrolled ? (
                            <button
                              disabled
                              className="flex-1 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl cursor-default flex items-center justify-center gap-1.5"
                            >
                              <svg
                                className="w-4 h-4 text-emerald-600"
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
                              Enrolled ✓
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEnroll(course)}
                              className="flex-1 py-2 text-xs font-semibold text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-xs transition-colors text-center"
                            >
                              Enroll Now (৳{course.price})
                            </button>
                          )}
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

      {/* View Course Details Modal */}
      {viewingCourse && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wider">
                  Course Overview
                </span>
                <h3 className="text-xl font-bold text-[#0a192f] mt-1.5">
                  {viewingCourse.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingCourse(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200/80">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Course Price:</span>
                  <span className="font-bold text-[#0a192f] text-sm">
                    ৳{viewingCourse.price !== undefined ? viewingCourse.price : 0}
                  </span>
                </div>
                {viewingCourse.Instructors && viewingCourse.Instructors.length > 0 && (
                  <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500">Instructors:</span>
                    <span className="font-semibold text-slate-800">
                      {viewingCourse.Instructors.map((i) => i.username || i.email).join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500">Published:</span>
                  <span className="text-slate-700">
                    {viewingCourse.createdAt
                      ? new Date(viewingCourse.createdAt).toLocaleDateString()
                      : "Recently"}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Description
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  {viewingCourse.description || "No description provided."}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingCourse(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0a192f]">
                {editingCourse ? "Edit Course" : "Create New Course"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCourseSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, title: e.target.value })
                  }
                  placeholder="Mastering Next.js and Strapi"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Description
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
                  placeholder="Hands on project tutorial covering authentication, databases, and APIs..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Price (BDT / ৳)
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
                  placeholder="4500"
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
                  {isSubmitting ? (
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
                      Saving...
                    </>
                  ) : (
                    <span>
                      {editingCourse ? "Update Course" : "Create Course"}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

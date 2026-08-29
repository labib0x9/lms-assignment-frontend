"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  logoutUser,
  fetchCourses,
  createCourse,
  enrollInCourse,
  fetchMyEnrollments,
  fetchAllProgresses,
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

  // Student enrollment and progress tracking
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  // Filter tab: "all" or "enrolled" (for student), "all" or "authored" (for instructor)
  const [filterTab, setFilterTab] = useState("all");

  // Course Modal state (Create)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    price: "",
  });

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

  // Load progress for student's enrolled courses
  const loadProgress = useCallback(async () => {
    if (isStudent) {
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
                ? Math.min(Math.round((completedCount / totalLessons) * 100), 100)
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
    }
  }, [isStudent]);

  // Load enrolled courses from API for student
  const loadEnrollments = useCallback(
    async (isManual = false) => {
      if (isStudent) {
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
      }
    },
    [isStudent, loadProgress]
  );

  useEffect(() => {
    if (user && isStudent) {
      loadEnrollments();
      loadProgress();
    }
  }, [user, isStudent, loadEnrollments, loadProgress]);

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

  // Match current active user's documentId with the course's Instructors list
  const isOwnerOfCourse = (course) => {
    if (isAdmin || isContentManager) return true; // Admins & Content Managers have access
    if (!isInstructor) return false;

    const currentDocId = user?.documentId;
    const currentId = user?.id;

    // Check Instructors array
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
    setCourseForm({ title: "", description: "", price: "" });
    setActionError("");
    setIsModalOpen(true);
  };

  // Submit Create Course
  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");
    setIsSubmitting(true);

    const result = await createCourse({
      title: courseForm.title,
      description: courseForm.description,
      price: courseForm.price,
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsModalOpen(false);
      setActionSuccess(`Course "${courseForm.title}" created successfully!`);
      await loadCourses();
      setTimeout(() => setActionSuccess(""), 4000);
    } else {
      setActionError(result.error);
    }
  };

  // Student Enroll
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

  // Count courses authored by current user
  const myCoursesCount = courses.filter(isOwnerOfCourse).length;

  // Calculate overall progress across all enrolled courses (all_course_completed_lesson * 100 / all_course_lesson)
  const overallStats = useMemo(() => {
    if (!isStudent)
      return { totalCompleted: 0, totalLessons: 0, overallPercentage: 0 };
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
        ? Math.round((totalCompleted / totalLessons) * 100) : 0;
    return { totalCompleted, totalLessons, overallPercentage };
  }, [isStudent, enrolledCourseIds, progressMap]);

  // Filter courses based on active tab
  const displayedCourses = courses.filter((course) => {
    const docId = String(course.documentId || course.id);
    if (isStudent && filterTab === "enrolled") {
      return enrolledCourseIds.includes(docId);
    }
    if (isInstructor && filterTab === "authored") {
      return isOwnerOfCourse(course);
    }
    return true;
  });

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
                "Manage your courses, view curriculum, and publish new programs."}
              {isStudent &&
                "Explore available engineering courses, manage your enrollments, and start learning."}
              {(isAdmin || isContentManager) &&
                "Platform administration portal for managing courses and curriculum."}
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

          {/* Student Shortcut to Enrolled Courses */}
          {isStudent && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFilterTab("enrolled");
                  loadEnrollments(true);
                }}
                disabled={loadingEnrollments}
                className="px-4 py-2.5 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <svg
                  className={`w-3.5 h-3.5 text-amber-400 ${
                    loadingEnrollments ? "animate-spin" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <span>My Enrolled Courses ({enrolledCourseIds.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Global Toast / Alerts */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-3 animate-in fade-in">
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

          {isStudent ? (
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
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Permissions
              </p>
              <p className="text-3xl font-bold text-amber-900">
                {isInstructor ? "Author & Instructor" : "Platform Administration"}
              </p>
              <p className="text-xs text-slate-500">
                {isInstructor
                  ? "Course management and lesson authoring"
                  : "Platform-wide management enabled"}
              </p>
            </div>
          )}

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
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#0a192f]">
                {isStudent &&
                  (filterTab === "enrolled"
                    ? "My Enrolled Courses"
                    : "All Available Courses")}
                {isInstructor &&
                  (filterTab === "authored"
                    ? "Your Authored Courses"
                    : "All Platform Courses")}
                {(isAdmin || isContentManager) && "All Platform Courses"}
              </h2>
              <p className="text-xs text-slate-500">
                {isStudent && filterTab === "enrolled"
                  ? "Access your active enrollments and study lesson materials."
                  : "Click any course to open its full details, curriculum, and lessons."}
              </p>
            </div>

            {/* Filter Tabs & Refresh Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Student Filter Tabs */}
              {isStudent && (
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                  <button
                    onClick={() => setFilterTab("all")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      filterTab === "all"
                        ? "bg-white text-[#0a192f] shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Courses ({courses.length})
                  </button>
                  <button
                    onClick={() => {
                      setFilterTab("enrolled");
                      loadEnrollments();
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      filterTab === "enrolled"
                        ? "bg-[#0a192f] text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    My Enrolled ({enrolledCourseIds.length})
                  </button>
                </div>
              )}

              {/* Instructor Filter Tabs */}
              {isInstructor && (
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                  <button
                    onClick={() => setFilterTab("all")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      filterTab === "all"
                        ? "bg-white text-[#0a192f] shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Courses ({courses.length})
                  </button>
                  <button
                    onClick={() => setFilterTab("authored")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      filterTab === "authored"
                        ? "bg-[#0a192f] text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Your Courses ({myCoursesCount})
                  </button>
                </div>
              )}

              {/* Dedicated Fetch Enrolled Courses button for students */}
              {isStudent && (
                <button
                  onClick={() => loadEnrollments(true)}
                  disabled={loadingEnrollments}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                  title="Fetch and sync enrolled courses from API"
                >
                  <svg
                    className={`w-3.5 h-3.5 text-amber-600 ${
                      loadingEnrollments ? "animate-spin" : ""
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
                  <span>Sync Enrollments</span>
                </button>
              )}

              {/* Refresh Catalog */}
              <button
                onClick={loadCourses}
                disabled={loadingCourses}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
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

          {/* Empty Enrolled State for Students */}
          {!loadingCourses &&
            !coursesError &&
            isStudent &&
            filterTab === "enrolled" &&
            displayedCourses.length === 0 && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-4 shadow-xs">
                <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto text-2xl">
                  🎓
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#0a192f]">
                    No enrolled courses yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    You have not enrolled in any courses yet. Browse all available courses and enroll to start your learning journey.
                  </p>
                </div>
                <button
                  onClick={() => setFilterTab("all")}
                  className="px-5 py-2.5 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  Explore All Courses →
                </button>
              </div>
            )}

          {/* Empty Catalog State */}
          {!loadingCourses &&
            !coursesError &&
            courses.length === 0 && (
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
          {!loadingCourses && displayedCourses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedCourses.map((course) => {
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

                const lessonCount = Array.isArray(course.lessons)
                  ? course.lessons.length
                  : 0;

                return (
                  <div
                    key={docId}
                    className={`bg-white border rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-all space-y-4 ${
                      isMyCourse && isInstructor
                        ? "border-amber-300/80 ring-1 ring-amber-300/40 bg-amber-50/10"
                        : isEnrolled && isStudent
                        ? "border-emerald-300/80 ring-1 ring-emerald-300/40 bg-emerald-50/10"
                        : "border-slate-200/90 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/courses/${docId}`}
                          className="text-lg font-bold text-[#0a192f] leading-snug line-clamp-2 hover:text-amber-900 transition-colors"
                        >
                          {course.title}
                        </Link>
                        <span className="px-2.5 py-1 text-xs font-bold text-amber-950 bg-amber-100/90 border border-amber-300/80 rounded-lg shrink-0">
                          ৳{course.price !== undefined ? course.price : 0}
                        </span>
                      </div>

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

                      {/* Progress Bar for Enrolled Students */}
                      {isEnrolled && isStudent && (() => {
                        const prog = progressMap[docId];
                        const completed = Number(
                          prog?.completed_count !== undefined
                            ? prog.completed_count
                            : prog?.completed_lessons || 0
                        );
                        const total = Number(prog?.total_lessons || lessonCount || 0);
                        const percentage =
                          prog?.percentage !== undefined && prog?.percentage !== null
                            ? Number(prog.percentage)
                            : total > 0
                            ? Math.min(Math.round((completed / total) * 100), 100)
                            : 0;
                        const isFinished =
                          (completed >= total && total > 0) || Boolean(prog?.completed_at);

                        return (
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
                              <span className="text-[11px] font-bold text-emerald-700 block">
                                🏆 Course Completed!
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {/* 1. If Course Owner (or Admin/Content Manager): Link to Course Page */}
                      {isMyCourse ? (
                        <div className="flex items-center gap-2 w-full justify-between">
                          {isInstructor && (
                            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                              Your Course
                            </span>
                          )}
                          <Link
                            href={`/courses/${docId}`}
                            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl transition-colors ml-auto"
                          >
                            Manage Course & Lessons →
                          </Link>
                        </div>
                      ) : !isStudent ? (
                        /* 2. Non-owner Instructor: View Course link */
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
                      ) : (
                        /* 3. Student: Curriculum Link & Enroll Button */
                        <div className="w-full flex items-center gap-2">
                          <Link
                            href={`/courses/${docId}`}
                            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
                          >
                            Curriculum
                          </Link>
                          {isEnrolled ? (
                            <Link
                              href={`/courses/${docId}`}
                              className="flex-1 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100/80 transition-colors flex items-center justify-center gap-1.5"
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
                              Enrolled ✓ Go to Course
                            </Link>
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

      {/* Create Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in duration-150">
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
                    <span>Create Course</span>
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

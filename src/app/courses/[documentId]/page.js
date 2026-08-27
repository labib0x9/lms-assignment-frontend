"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getCurrentUser,
  fetchCourseById,
  updateCourse,
  deleteCourse,
  createLesson,
  enrollInCourse,
  fetchMyEnrollments,
} from "@/lib/api";

export default function CourseDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params?.documentId;

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  // Student enrollment state
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState("");

  // Edit Course Modal state
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [isUpdatingCourse, setIsUpdatingCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    price: "",
  });

  // Add Lesson Modal state
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isSubmittingLesson, setIsSubmittingLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    contents: "",
  });
  const [lessonError, setLessonError] = useState("");

  // Load user info
  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  // Determine user roles
  const roleType = (
    user?.role?.type ||
    (typeof user?.role === "string" ? user?.role : "student")
  ).toLowerCase();

  const isStudent = roleType === "student";
  const isInstructor = roleType === "instructor";
  const isAdmin = roleType === "admin";
  const isContentManager = roleType === "content_manager";

  // Load student enrollments from API
  const loadEnrollments = useCallback(async () => {
    if (isStudent && user) {
      const res = await fetchMyEnrollments();
      if (res.success && Array.isArray(res.data)) {
        const enrolledIds = res.data
          .map((enroll) => {
            const c = enroll.course;
            return c?.documentId || (typeof c === "string" ? c : null);
          })
          .filter(Boolean);
        setEnrolledCourseIds(enrolledIds);
      }
    }
  }, [isStudent, user]);

  useEffect(() => {
    if (user && isStudent) {
      loadEnrollments();
    }
  }, [user, isStudent, loadEnrollments]);

  // Fetch course details
  const loadCourseData = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    setError("");

    const res = await fetchCourseById(documentId);
    setLoading(false);

    if (res.success && res.data) {
      setCourse(res.data);
    } else {
      setError(res.error || "Course not found");
    }
  }, [documentId]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  // Check if current user is owner/author of this course
  const isOwner = (() => {
    if (isAdmin || isContentManager) return true;
    if (!isInstructor || !course || !user) return false;

    const currentDocId = user.documentId;
    const currentId = user.id;

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
        const instDocId = inst.documentId || (typeof inst === "string" ? inst : null);
        const instId = inst.id;
        return (
          (currentDocId && instDocId && instDocId === currentDocId) ||
          (currentId && instId && String(instId) === String(currentId))
        );
      });
    }

    return false;
  })();

  // Handle Student Enrollment via API
  const handleEnroll = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    const docId = String(course?.documentId || course?.id || documentId);
    setToastError("");
    setToastMessage("");

    const res = await enrollInCourse(docId);
    if (res.success) {
      setToastMessage(`Successfully enrolled in "${course?.title || "this course"}"! 🎉`);
      await loadEnrollments();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setToastError(res.error || "Failed to enroll");
      setTimeout(() => setToastError(""), 5000);
    }
  };

  // Open Edit Course Modal
  const openEditCourseModal = () => {
    if (!course) return;
    setCourseForm({
      title: course.title || "",
      description: course.description || "",
      price: course.price !== undefined ? course.price : "",
    });
    setToastError("");
    setIsEditCourseModalOpen(true);
  };

  // Submit Course Update
  const handleCourseUpdate = async (e) => {
    e.preventDefault();
    setIsUpdatingCourse(true);
    setToastError("");

    const res = await updateCourse(documentId, {
      title: courseForm.title,
      description: courseForm.description,
      price: courseForm.price,
    });

    setIsUpdatingCourse(false);

    if (res.success) {
      setIsEditCourseModalOpen(false);
      setToastMessage("Course updated successfully!");
      await loadCourseData();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setToastError(res.error);
    }
  };

  // Delete Course
  const handleDeleteCourse = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${course?.title}"? This will permanently remove the course and its lessons.`
      )
    ) {
      return;
    }

    const res = await deleteCourse(documentId);
    if (res.success) {
      router.push("/dashboard");
    } else {
      setToastError(res.error || "Failed to delete course");
      setTimeout(() => setToastError(""), 5000);
    }
  };

  // Open Add Lesson Modal
  const openAddLessonModal = () => {
    setLessonForm({ title: "", contents: "" });
    setLessonError("");
    setIsLessonModalOpen(true);
  };

  // Submit New Lesson
  const handleLessonSubmit = async (e) => {
    e.preventDefault();
    setLessonError("");
    setIsSubmittingLesson(true);

    const res = await createLesson({
      title: lessonForm.title,
      contents: lessonForm.contents,
      course: documentId,
    });

    setIsSubmittingLesson(false);

    if (res.success) {
      setIsLessonModalOpen(false);
      setToastMessage(`Lesson "${lessonForm.title}" added to curriculum!`);
      await loadCourseData();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setLessonError(res.error);
    }
  };

  const isEnrolled = enrolledCourseIds.includes(String(course?.documentId || course?.id));

  // Extract Instructor names
  const instructorsList =
    course?.Instructors ||
    course?.instructors ||
    (course?.instructor
      ? Array.isArray(course.instructor)
        ? course.instructor
        : [course.instructor]
      : []) ||
    [];
  const instructorNames =
    instructorsList.length > 0
      ? instructorsList.map((i) => i.username || i.email).filter(Boolean).join(", ")
      : "Academy Faculty";

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0a192f] flex flex-col selection:bg-amber-200 selection:text-amber-900">
      {/* Top Header */}
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
            <Link
              href={user ? "/dashboard" : "/"}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              {user ? "Dashboard" : "Courses"}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 text-xs font-medium text-[#0a192f] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Back to Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0a192f] hover:bg-[#132c52] rounded-lg transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 sm:py-12 space-y-8">
        {/* Toast Alerts */}
        {toastMessage && (
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
            <span>{toastMessage}</span>
          </div>
        )}

        {toastError && (
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
            <span>{toastError}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3">
            <svg
              className="animate-spin h-7 w-7 text-amber-600 mx-auto"
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
            <p className="text-sm text-slate-500">Loading course details...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-10 text-center space-y-3">
            <p className="text-base font-bold text-red-800">Unable to load course</p>
            <p className="text-xs text-red-600 max-w-md mx-auto">{error}</p>
            <Link
              href="/dashboard"
              className="inline-block px-4 py-2 text-xs font-semibold text-white bg-[#0a192f] rounded-xl mt-2"
            >
              Return to Dashboard
            </Link>
          </div>
        )}

        {/* Course Details View */}
        {!loading && course && (
          <div className="space-y-8">
            {/* Hero Course Header Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-950 bg-amber-100 border border-amber-300/80 px-2.5 py-1 rounded-lg">
                      ৳{course.price !== undefined ? course.price : 0} BDT
                    </span>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      📖 {Array.isArray(course.lessons) ? course.lessons.length : 0} Lessons
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0a192f]">
                    {course.title}
                  </h1>

                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
                    {course.description || "No description provided for this course."}
                  </p>
                </div>

                {/* Primary CTA / Owner Actions */}
                <div className="flex flex-col gap-2.5 sm:items-end shrink-0">
                  {isOwner ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={openEditCourseModal}
                        className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                        Edit Course
                      </button>
                      <button
                        onClick={handleDeleteCourse}
                        className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                      >
                        Delete Course
                      </button>
                    </div>
                  ) : isStudent ? (
                    <div>
                      {isEnrolled ? (
                        <div className="px-5 py-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
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
                          <span>Enrolled Student</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleEnroll}
                          className="px-6 py-3 text-sm font-semibold text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-sm transition-colors"
                        >
                          Enroll Now (৳{course.price})
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                      View Mode
                    </span>
                  )}
                </div>
              </div>

              {/* Course Meta Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
                <div>
                  <span className="font-medium text-slate-700">Instructor:</span>{" "}
                  <span className="text-slate-900 font-semibold">{instructorNames}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Published:</span>{" "}
                  <span>
                    {course.createdAt
                      ? new Date(course.createdAt).toLocaleDateString()
                      : "Recently"}
                  </span>
                </div>
                <div className="font-mono text-slate-400">
                  ID: {String(course.documentId || course.id).slice(0, 10)}...
                </div>
              </div>
            </div>

            {/* Curriculum / Lessons Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#0a192f]">
                    Course Curriculum
                  </h2>
                  <p className="text-xs text-slate-500">
                    Step-by-step lessons
                  </p>
                </div>

                {/* Add Lesson Button */}
                {isOwner && (
                  <button
                    onClick={openAddLessonModal}
                    className="px-3.5 py-2 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-medium rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-amber-400"
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
                    <span>+ Add Lesson</span>
                  </button>
                )}
              </div>

              {/* Empty Curriculum State */}
              {(!course.lessons || course.lessons.length === 0) ? (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-3 shadow-xs">
                  <div className="text-3xl">📝</div>
                  <h3 className="text-base font-semibold text-[#0a192f]">
                    No lessons published yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {isOwner
                      ? "Get started by adding the first lesson to your curriculum."
                      : "The instructor hasn't published lessons for this course yet."}
                  </p>
                  {isOwner && (
                    <button
                      onClick={openAddLessonModal}
                      className="px-4 py-2 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-medium rounded-xl transition-colors"
                    >
                      + Create First Lesson
                    </button>
                  )}
                </div>
              ) : (
                /* Lessons List: Only show lesson titles */
                <div className="space-y-2.5">
                  {course.lessons.map((lesson, idx) => (
                    <Link
                      key={lesson.documentId || lesson.id || idx}
                      href={`/courses/${documentId}/lessons/${lesson.documentId || lesson.id}`}
                      className="bg-white border border-slate-200/90 hover:border-amber-300 hover:shadow-xs rounded-xl p-4 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-950 bg-amber-100 border border-amber-300/70 px-2 py-0.5 rounded-md shrink-0">
                          Lesson {lesson.order || idx + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-[#0a192f] group-hover:text-amber-900 transition-colors">
                          {lesson.title}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-[#0a192f] transition-colors flex items-center gap-1">
                        <span>Read Lesson</span>
                        <span>→</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Edit Course Modal */}
      {isEditCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0a192f]">Edit Course</h3>
              <button
                onClick={() => setIsEditCourseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCourseUpdate} className="space-y-4">
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
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditCourseModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingCourse}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-xs disabled:opacity-70"
                >
                  {isUpdatingCourse ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0a192f]">
                Add New Lesson
              </h3>
              <button
                onClick={() => setIsLessonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {lessonError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {lessonError}
              </div>
            )}

            <form onSubmit={handleLessonSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  value={lessonForm.title}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, title: e.target.value })
                  }
                  placeholder="e.g. Next.js Routing and Data Fetching"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Lesson Contents / Notes
                </label>
                <textarea
                  rows={3}
                  value={lessonForm.contents}
                  onChange={(e) =>
                    setLessonForm({
                      ...lessonForm,
                      contents: e.target.value,
                    })
                  }
                  placeholder="Key concepts, commands, and exercises covered..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLesson}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-xs disabled:opacity-70 flex items-center gap-2"
                >
                  {isSubmittingLesson ? "Saving..." : "Save Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

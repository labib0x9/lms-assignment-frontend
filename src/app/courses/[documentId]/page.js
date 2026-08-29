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
  fetchCourseProgress,
  fetchQuizzesByCourse,
  submitQuizAnswers,
  fetchMyQuizSubmission,
  createQuiz,
  createQuestion,
  deleteQuiz,
  deleteQuestion,
} from "@/lib/api";

export default function CourseDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params?.documentId;

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  // Active section tab: "curriculum" or "quizzes"
  const [activeTab, setActiveTab] = useState("curriculum");

  // Student enrollment and progress state
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [courseProgress, setCourseProgress] = useState(null);
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

  // ==========================================
  // 📝 Quizzes State
  // ==========================================
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [mySubmissions, setMySubmissions] = useState({}); // { [quizDocId]: submissionData }
  const [expandedQuizId, setExpandedQuizId] = useState(null);

  // Student Quiz Taking Runner Modal
  const [activeQuizModal, setActiveQuizModal] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [question_id]: "Selected Option" }
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Instructor Create Quiz Modal
  const [isCreateQuizModalOpen, setIsCreateQuizModalOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [isSubmittingQuizForm, setIsSubmittingQuizForm] = useState(false);

  // Instructor Add Question Modal
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [targetQuizDocId, setTargetQuizDocId] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    points: 1,
  });
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

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

  // Load course progress for enrolled student
  const loadCourseProgress = useCallback(async () => {
    if (isStudent && user && documentId) {
      const res = await fetchCourseProgress(documentId);
      if (res.success && res.data) {
        setCourseProgress(res.data);
      }
    }
  }, [isStudent, user, documentId]);

  // Load student enrollments from API
  const loadEnrollments = useCallback(async () => {
    if (isStudent && user) {
      const [enrollRes] = await Promise.all([
        fetchMyEnrollments(),
        loadCourseProgress(),
      ]);

      if (enrollRes.success && Array.isArray(enrollRes.data)) {
        const enrolledIds = enrollRes.data
          .map((enroll) => {
            const c = enroll.course;
            return c?.documentId || (typeof c === "string" ? c : null);
          })
          .filter(Boolean);
        setEnrolledCourseIds(enrolledIds);
      }
    }
  }, [isStudent, user, loadCourseProgress]);

  useEffect(() => {
    if (user && isStudent) {
      loadEnrollments();
      loadCourseProgress();
    }
  }, [user, isStudent, loadEnrollments, loadCourseProgress]);

  // Load Quizzes for this course
  const loadQuizzes = useCallback(async () => {
    if (!documentId) return;
    setLoadingQuizzes(true);
    const res = await fetchQuizzesByCourse(documentId);
    setLoadingQuizzes(false);

    if (res.success && Array.isArray(res.data)) {
      setQuizzes(res.data);

      // If student, load submission status for each quiz
      if (isStudent && user) {
        const submissionsMap = {};
        await Promise.all(
          res.data.map(async (q) => {
            const qDocId = q.documentId || q.id;
            if (qDocId) {
              const subRes = await fetchMyQuizSubmission(qDocId);
              if (subRes.success && subRes.data) {
                submissionsMap[qDocId] = subRes.data;
              }
            }
          })
        );
        setMySubmissions(submissionsMap);
      }
    }
  }, [documentId, isStudent, user]);

  useEffect(() => {
    if (documentId) {
      loadQuizzes();
    }
  }, [documentId, loadQuizzes]);

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
    setToastError("");
    setToastMessage("");

    const res = await enrollInCourse(documentId);
    if (res.success) {
      setToastMessage(`Successfully enrolled in "${course.title}"! 🎉`);
      await loadEnrollments();
      await loadQuizzes();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setToastError(res.error || "Failed to enroll.");
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
    setIsEditCourseModalOpen(true);
  };

  // Submit Course Update
  const handleCourseUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingCourse(true);
    setToastError("");
    setToastMessage("");

    const res = await updateCourse(documentId, {
      title: courseForm.title,
      description: courseForm.description,
      price: courseForm.price,
    });

    setIsUpdatingCourse(false);

    if (res.success) {
      setIsEditCourseModalOpen(false);
      setToastMessage("Course details updated successfully! ✓");
      await loadCourseData();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setToastError(res.error || "Failed to update course.");
      setTimeout(() => setToastError(""), 5000);
    }
  };

  // Delete Course
  const handleDeleteCourse = async () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete the course "${course?.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setToastError("");
    const res = await deleteCourse(documentId);
    if (res.success) {
      router.push("/dashboard");
    } else {
      setToastError(res.error || "Failed to delete course.");
      setTimeout(() => setToastError(""), 5000);
    }
  };

  // Open Add Lesson Modal
  const openAddLessonModal = () => {
    setLessonForm({ title: "", contents: "" });
    setLessonError("");
    setIsLessonModalOpen(true);
  };

  // Submit Add Lesson
  const handleLessonSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingLesson(true);
    setLessonError("");

    const nextOrder = Array.isArray(course?.lessons) ? course.lessons.length + 1 : 1;

    const res = await createLesson({
      title: lessonForm.title,
      contents: lessonForm.contents,
      course: documentId,
      order: nextOrder,
    });

    setIsSubmittingLesson(false);

    if (res.success) {
      setIsLessonModalOpen(false);
      setToastMessage(`Lesson "${lessonForm.title}" added to curriculum! ✓`);
      await loadCourseData();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setLessonError(res.error || "Failed to add lesson.");
    }
  };

  // ==========================================
  // 📝 Quizzes Handler Functions
  // ==========================================

  // Instructor: Create Quiz
  const handleCreateQuizSubmit = async (e) => {
    e.preventDefault();
    if (!quizTitle.trim()) return;
    setIsSubmittingQuizForm(true);
    setToastError("");

    const res = await createQuiz({
      title: quizTitle.trim(),
      course: documentId,
    });

    setIsSubmittingQuizForm(false);

    if (res.success) {
      setIsCreateQuizModalOpen(false);
      setQuizTitle("");
      setToastMessage("Quiz created successfully! ✓ Now you can add questions.");
      await loadQuizzes();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setToastError(res.error || "Failed to create quiz.");
    }
  };

  // Instructor: Delete Quiz
  const handleDeleteQuiz = async (quizDocId, title) => {
    if (!confirm(`Are you sure you want to delete the quiz "${title}"?`)) return;
    setToastError("");
    const res = await deleteQuiz(quizDocId);
    if (res.success) {
      setToastMessage("Quiz deleted successfully.");
      await loadQuizzes();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setToastError(res.error || "Failed to delete quiz.");
    }
  };

  // Instructor: Open Add Question Modal
  const openAddQuestionModal = (quizDocId) => {
    setTargetQuizDocId(quizDocId);
    setQuestionForm({
      question_text: "",
      options: ["", "", "", ""],
      correct_answer: "",
      points: 1,
    });
    setIsAddQuestionModalOpen(true);
  };

  // Instructor: Submit Add Question
  const handleAddQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!targetQuizDocId) return;

    const validOptions = questionForm.options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      alert("Please provide at least 2 options for the multiple choice question.");
      return;
    }

    if (!questionForm.correct_answer || !validOptions.includes(questionForm.correct_answer)) {
      alert("Please select a valid correct answer from your options.");
      return;
    }

    setIsSubmittingQuestion(true);
    setToastError("");

    const res = await createQuestion({
      quiz: targetQuizDocId,
      question_text: questionForm.question_text.trim(),
      options: validOptions,
      correct_answer: questionForm.correct_answer.trim(),
      points: Number(questionForm.points) || 1,
    });

    setIsSubmittingQuestion(false);

    if (res.success) {
      setIsAddQuestionModalOpen(false);
      setToastMessage("Question added to quiz! ✓");
      await loadQuizzes();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setToastError(res.error || "Failed to add question.");
    }
  };

  // Instructor: Delete Question
  const handleDeleteQuestion = async (questionDocId) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setToastError("");
    const res = await deleteQuestion(questionDocId);
    if (res.success) {
      setToastMessage("Question deleted.");
      await loadQuizzes();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setToastError(res.error || "Failed to delete question.");
    }
  };

  // Student: Start / Open Quiz Runner Modal
  const handleStartQuiz = (quiz) => {
    setActiveQuizModal(quiz);
    setSelectedAnswers({});
    setSubmissionResult(null);
  };

  // Student: Option Select
  const handleOptionSelect = (qId, option) => {
    setSelectedAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  // Student: Submit Answers for Auto-Grading
  const handleSubmitQuiz = async () => {
    if (!activeQuizModal) return;

    const questionsList = activeQuizModal.questions || [];
    const answers = Object.entries(selectedAnswers).map(([qId, ans]) => ({
      question_id: qId,
      selected_answer: ans,
    }));

    if (answers.length === 0 && questionsList.length > 0) {
      alert("Please answer the questions before submitting.");
      return;
    }

    setIsSubmittingQuiz(true);
    setToastError("");

    const quizDocId = activeQuizModal.documentId || activeQuizModal.id;
    const res = await submitQuizAnswers(quizDocId, answers);
    setIsSubmittingQuiz(false);

    if (res.success) {
      setSubmissionResult(res.data);
      // Update local submission map
      setMySubmissions((prev) => ({
        ...prev,
        [quizDocId]: res.data,
      }));
    } else {
      setToastError(res.error || "Failed to submit quiz.");
      setTimeout(() => setToastError(""), 5000);
    }
  };

  const isEnrolled = enrolledCourseIds.includes(String(documentId));

  // Extract instructors
  const instructorsList =
    course?.Instructors ||
    course?.instructors ||
    (course?.instructor
      ? Array.isArray(course.instructor)
        ? course.instructor
        : [course.instructor]
      : []) ||
    (course?.user ? [course.user] : []);

  const instructorNames =
    Array.isArray(instructorsList) && instructorsList.length > 0
      ? instructorsList
          .map((i) => i?.username || i?.email)
          .filter(Boolean)
          .join(", ")
      : "Academy Instructor";

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0a192f] flex flex-col selection:bg-amber-200 selection:text-amber-900">
      {/* Header */}
      <header className="w-full border-b border-slate-200/80 bg-[#faf9f6]/90 backdrop-blur-xs sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-slate-500 hover:text-[#0a192f] flex items-center gap-1 transition-colors"
            >
              <span>← Back to Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-[#0a192f]"
            >
              Academy
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 sm:py-12 space-y-8">
        {/* Toast / Global Alerts */}
        {toastMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-800 flex items-center gap-3 animate-in fade-in">
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
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-3">
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
                    <span className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200/70 px-2.5 py-1 rounded-lg">
                      📝 {quizzes.length} {quizzes.length === 1 ? "Quiz" : "Quizzes"}
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
                        <div className="px-5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-emerald-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
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

              {/* Course Progress Section for Enrolled Student */}
              {isStudent && isEnrolled && (() => {
                const completed = Number(
                  courseProgress?.completed_count !== undefined
                    ? courseProgress.completed_count
                    : courseProgress?.completed_lessons || 0
                );
                const total = Number(
                  courseProgress?.total_lessons ||
                    (Array.isArray(course?.lessons) ? course.lessons.length : 0)
                );
                const percentage =
                    total > 0
                    ? Math.round((completed * 100) / total) : 0;
                const isFinished =
                  (completed >= total && total > 0) || Boolean(courseProgress?.completed_at);

                return (
                  <div className="p-4 sm:p-5 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                      <span className="text-[#0a192f] flex items-center gap-1.5 font-bold">
                        <span>Your Learning Progress</span>
                        {isFinished && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            🏆 Course Completed
                          </span>
                        )}
                      </span>
                      <span className="text-amber-950 font-bold text-sm">
                        {percentage}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden border border-slate-300/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFinished ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

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

            {/* Navigation Tabs (Curriculum & Quizzes) */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab("curriculum")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === "curriculum"
                    ? "bg-[#0a192f] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
                }`}
              >
                <span>📖 Curriculum ({Array.isArray(course.lessons) ? course.lessons.length : 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("quizzes")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === "quizzes"
                    ? "bg-[#0a192f] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
                }`}
              >
                <span>📝 Quizzes & Assessments ({quizzes.length})</span>
              </button>
            </div>

            {/* ========================================== */}
            {/* TAB 1: CURRICULUM & LESSONS */}
            {/* ========================================== */}
            {activeTab === "curriculum" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#0a192f]">
                      Course Curriculum
                    </h2>
                    <p className="text-xs text-slate-500">
                      Step-by-step lesson materials and documentation.
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
                  /* Lessons List: With completion indicators for enrolled students */
                  <div className="space-y-2.5">
                    {course.lessons.map((lesson, idx) => {
                      const lessonKey = lesson.documentId || lesson.id;
                      const isDone =
                        isStudent &&
                        isEnrolled &&
                        (courseProgress?.completed_lesson_ids?.includes(String(lesson.documentId)) ||
                          courseProgress?.completed_lesson_ids?.includes(Number(lesson.id)) ||
                          courseProgress?.completed_lesson_ids?.includes(String(lessonKey)));

                      return (
                        <Link
                          key={lessonKey || idx}
                          href={`/courses/${documentId}/lessons/${lesson.documentId || lesson.id}`}
                          className={`bg-white border rounded-xl p-4 transition-all flex items-center justify-between group ${
                            isDone
                              ? "border-emerald-200 bg-emerald-50/20 hover:border-emerald-300"
                              : "border-slate-200/90 hover:border-amber-300 hover:shadow-xs"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base">{isDone ? "✅" : "📄"}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-950 bg-amber-100 border border-amber-300/70 px-2 py-0.5 rounded-md shrink-0">
                              Lesson {lesson.order || idx + 1}
                            </span>
                            <h3
                              className={`text-sm font-semibold transition-colors ${
                                isDone
                                  ? "text-slate-500 line-through group-hover:text-emerald-900"
                                  : "text-[#0a192f] group-hover:text-amber-900"
                              }`}
                            >
                              {lesson.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {isDone && (
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                                Done ✓
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-400 group-hover:text-[#0a192f] transition-colors flex items-center gap-1">
                              <span>Read</span>
                              <span>→</span>
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 2: QUIZZES & ASSESSMENTS */}
            {/* ========================================== */}
            {activeTab === "quizzes" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#0a192f]">
                      Course Quizzes & Assessments
                    </h2>
                    <p className="text-xs text-slate-500">
                      Test your knowledge and evaluate your comprehension.
                    </p>
                  </div>

                  {/* Create Quiz Button (Instructor / Admin) */}
                  {isOwner && (
                    <button
                      onClick={() => setIsCreateQuizModalOpen(true)}
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
                      <span>+ Create Quiz</span>
                    </button>
                  )}
                </div>

                {loadingQuizzes && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                    Loading quizzes...
                  </div>
                )}

                {/* Empty State */}
                {!loadingQuizzes && quizzes.length === 0 && (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-3 shadow-xs">
                    <div className="text-3xl">📝</div>
                    <h3 className="text-base font-semibold text-[#0a192f]">
                      No quizzes created yet
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {isOwner
                        ? "Create a multiple-choice quiz to test your students' understanding."
                        : "No quizzes have been published for this course yet."}
                    </p>
                    {isOwner && (
                      <button
                        onClick={() => setIsCreateQuizModalOpen(true)}
                        className="px-4 py-2 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-medium rounded-xl transition-colors"
                      >
                        + Create First Quiz
                      </button>
                    )}
                  </div>
                )}

                {/* Quizzes List */}
                {!loadingQuizzes && quizzes.length > 0 && (
                  <div className="space-y-4">
                    {quizzes.map((quiz) => {
                      const qDocId = quiz.documentId || quiz.id;
                      const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
                      const submission = mySubmissions[qDocId];
                      const isExpanded = expandedQuizId === qDocId;

                      return (
                        <div
                          key={qDocId}
                          className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded-md">
                                  Quiz
                                </span>
                                <Link
                                  href={`/courses/${documentId}/quizzes/${qDocId}`}
                                  className="text-base font-bold text-[#0a192f] hover:text-amber-900 transition-colors"
                                >
                                  {quiz.title}
                                </Link>
                              </div>
                              <p className="text-xs text-slate-500">
                                {questions.length} {questions.length === 1 ? "Question" : "Questions"}
                              </p>
                            </div>

                            {/* Actions based on Role */}
                            <div className="flex flex-wrap items-center gap-2.5">
                              {/* Student Quiz Actions */}
                              {isStudent && isEnrolled && (
                                <div className="flex items-center gap-3">
                                  {submission && (
                                    <div className="text-right">
                                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                                        Score: {submission.score} / {submission.total_score || submission.total_possible_score || questions.length} ({submission.percentage}%)
                                      </span>
                                    </div>
                                  )}

                                  <Link
                                    href={`/courses/${documentId}/quizzes/${qDocId}`}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                                  >
                                    {submission ? "Retake Quiz ↺" : "Start Quiz →"}
                                  </Link>
                                </div>
                              )}

                              {isStudent && !isEnrolled && (
                                <span className="text-xs text-slate-400 font-medium">
                                  Enroll in course to take quiz
                                </span>
                              )}

                              {/* Instructor / Admin Actions */}
                              {isOwner && (
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/courses/${documentId}/quizzes/${qDocId}`}
                                    className="px-3 py-1.5 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    Manage Quiz & Questions →
                                  </Link>
                                  <button
                                    onClick={() => handleDeleteQuiz(qDocId, quiz.title)}
                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Instructor Questions Accordion */}
                          {isOwner && isExpanded && (
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Questions in this Quiz
                              </h4>

                              {questions.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                  No questions added yet. Click &quot;+ Add Question&quot; above.
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {questions.map((q, qIdx) => {
                                    const questionDocId = q.documentId || q.id;
                                    const optionsList = Array.isArray(q.options)
                                      ? q.options
                                      : typeof q.options === "string"
                                      ? JSON.parse(q.options || "[]")
                                      : [];

                                    return (
                                      <div
                                        key={questionDocId || qIdx}
                                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <p className="font-semibold text-[#0a192f]">
                                            {qIdx + 1}. {q.question_text}
                                            <span className="text-[10px] text-slate-400 font-normal ml-2">
                                              ({q.points || 1} pt)
                                            </span>
                                          </p>
                                          <button
                                            onClick={() => handleDeleteQuestion(questionDocId)}
                                            className="text-[11px] text-red-600 hover:underline"
                                          >
                                            Delete
                                          </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                          {optionsList.map((opt, optIdx) => {
                                            const isCorrect =
                                              q.correct_answer &&
                                              String(q.correct_answer).trim() === String(opt).trim();
                                            return (
                                              <div
                                                key={optIdx}
                                                className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center justify-between ${
                                                  isCorrect
                                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                                                    : "bg-white border-slate-200 text-slate-600"
                                                }`}
                                              >
                                                <span>{opt}</span>
                                                {isCorrect && (
                                                  <span className="text-[10px] font-bold text-emerald-700">
                                                    ✓ Correct Answer
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================== */}
      {/* 🎓 STUDENT QUIZ RUNNER MODAL */}
      {/* ========================================== */}
      {activeQuizModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-950 bg-amber-100 px-2 py-0.5 rounded">
                  Assessment
                </span>
                <h3 className="text-xl font-bold text-[#0a192f] mt-1">
                  {activeQuizModal.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveQuizModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Submission Results Display */}
            {submissionResult ? (
              <div className="text-center py-6 space-y-4">
                <div className="text-5xl">
                  {submissionResult.percentage >= 70 ? "🎉" : "📚"}
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-bold text-[#0a192f]">
                    {submissionResult.percentage >= 70
                      ? "Quiz Completed Successfully!"
                      : "Quiz Completed"}
                  </h4>
                  <p className="text-sm text-slate-500">
                    Your answers have been auto-graded by the server.
                  </p>
                </div>

                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm mx-auto space-y-2">
                  <div className="text-3xl font-extrabold text-amber-950">
                    {submissionResult.percentage}%
                  </div>
                  <p className="text-xs font-semibold text-slate-600">
                    Score: {submissionResult.score} / {submissionResult.total_score || submissionResult.total_possible_score || activeQuizModal.questions?.length}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => {
                      setSubmissionResult(null);
                      setSelectedAnswers({});
                    }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Retake Quiz ↺
                  </button>
                  <button
                    onClick={() => setActiveQuizModal(null)}
                    className="px-6 py-2.5 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    Done & Return
                  </button>
                </div>
              </div>
            ) : (
              /* Questions Runner Form */
              <div className="space-y-6">
                {(!activeQuizModal.questions || activeQuizModal.questions.length === 0) ? (
                  <p className="text-sm text-slate-500 italic text-center py-8">
                    This quiz does not have any questions yet.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {activeQuizModal.questions.map((q, idx) => {
                      const qId = q.documentId || q.id;
                      const optionsList = Array.isArray(q.options)
                        ? q.options
                        : typeof q.options === "string"
                        ? JSON.parse(q.options || "[]")
                        : [];

                      return (
                        <div
                          key={qId || idx}
                          className="p-5 bg-slate-50/70 border border-slate-200/90 rounded-2xl space-y-3"
                        >
                          <p className="text-sm font-bold text-[#0a192f]">
                            {idx + 1}. {q.question_text}
                          </p>

                          <div className="space-y-2">
                            {optionsList.map((opt, optIdx) => {
                              const isSelected = selectedAnswers[qId] === opt;
                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => handleOptionSelect(qId, opt)}
                                  className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-center gap-3 ${
                                    isSelected
                                      ? "bg-amber-50 border-amber-500 text-amber-950 font-bold ring-1 ring-amber-500/50"
                                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                      isSelected
                                        ? "border-amber-600 bg-amber-600 text-white"
                                        : "border-slate-300"
                                    }`}
                                  >
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </div>
                                  <span>{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {Object.keys(selectedAnswers).length} of {activeQuizModal.questions.length} answered
                      </span>

                      <button
                        onClick={handleSubmitQuiz}
                        disabled={isSubmittingQuiz}
                        className="px-6 py-2.5 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-75 flex items-center gap-2"
                      >
                        {isSubmittingQuiz ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <span>Submit Answers →</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 👨‍🏫 INSTRUCTOR CREATE QUIZ MODAL */}
      {/* ========================================== */}
      {isCreateQuizModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0a192f]">
                Create Course Quiz
              </h3>
              <button
                onClick={() => setIsCreateQuizModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuizSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  required
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g. Next.js App Router Assessment"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateQuizModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuizForm}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-xs disabled:opacity-70 flex items-center gap-2"
                >
                  {isSubmittingQuizForm ? "Creating..." : "Create Quiz"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 👨‍🏫 INSTRUCTOR ADD QUESTION MODAL */}
      {/* ========================================== */}
      {isAddQuestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0a192f]">
                Add Multiple Choice Question
              </h3>
              <button
                onClick={() => setIsAddQuestionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddQuestionSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Question Text *
                </label>
                <textarea
                  required
                  rows={3}
                  value={questionForm.question_text}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, question_text: e.target.value })
                  }
                  placeholder="Which of the following is immutable in Python?"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Answer Options (Provide 2 to 4) *
                </label>
                {questionForm.options.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    required={idx < 2}
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...questionForm.options];
                      newOptions[idx] = e.target.value;
                      setQuestionForm({ ...questionForm, options: newOptions });
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Correct Answer *
                </label>
                <select
                  required
                  value={questionForm.correct_answer}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, correct_answer: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                >
                  <option value="">-- Select Correct Answer --</option>
                  {questionForm.options
                    .map((o) => o.trim())
                    .filter(Boolean)
                    .map((opt, idx) => (
                      <option key={idx} value={opt}>
                        {opt}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Points
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={questionForm.points}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, points: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddQuestionModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuestion}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-xs disabled:opacity-70 flex items-center gap-2"
                >
                  {isSubmittingQuestion ? "Saving..." : "Save Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {isEditCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0a192f]">Edit Course</h3>
              <button
                onClick={() => setIsEditCourseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCourseUpdateSubmit} className="space-y-4">
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
                  className="px-5 py-2 text-sm font-medium text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-xs disabled:opacity-70 flex items-center gap-2"
                >
                  {isUpdatingCourse ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
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
                  placeholder="e.g. Introduction to Routing and API Endpoints"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                    Lesson Contents (Markdown)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Supports #, **, code, lists</span>
                </div>
                <textarea
                  rows={8}
                  value={lessonForm.contents}
                  onChange={(e) =>
                    setLessonForm({
                      ...lessonForm,
                      contents: e.target.value,
                    })
                  }
                  placeholder="# Lesson Overview&#10;&#10;Write comprehensive markdown documentation, code snippets, and instructions..."
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
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
                  {isSubmittingLesson ? "Adding..." : "Add Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

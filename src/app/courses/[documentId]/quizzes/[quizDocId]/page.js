"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getCurrentUser,
  fetchCourseById,
  fetchQuizById,
  fetchQuizzesByCourse,
  submitQuizAnswers,
  fetchMyQuizSubmission,
  createQuestion,
  deleteQuestion,
  deleteQuiz,
  enrollInCourse,
  fetchMyEnrollments,
} from "@/lib/api";

export default function DedicatedQuizPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params?.documentId;
  const quizDocId = params?.quizDocId;

  const [quiz, setQuiz] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  // Student enrollment state
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState("");

  // Student Quiz Taking state
  // selectedAnswers stores 0-based integer indices: { [question_id]: number }
  const [selectedAnswers, setSelectedAnswers] = useState({}); 
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [latestSubmission, setLatestSubmission] = useState(null);

  // Instructor Add Question Modal state
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
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

  // Determine user role
  const roleType = (
    user?.role?.type ||
    (typeof user?.role === "string" ? user?.role : "student")
  ).toLowerCase();

  const isStudent = roleType === "student";
  const isInstructor = roleType === "instructor";
  const isAdmin = roleType === "admin";
  const isContentManager = roleType === "content_manager";

  // Load student enrollments
  const loadEnrollments = useCallback(async () => {
    if (user && isStudent) {
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
  }, [user, isStudent]);

  useEffect(() => {
    if (user && isStudent) {
      loadEnrollments();
    }
  }, [user, isStudent, loadEnrollments]);

  // Load quiz, course, and submission details
  const loadData = useCallback(async () => {
    if (!quizDocId || !documentId) return;
    setLoading(true);
    setError("");

    const [quizRes, courseRes] = await Promise.all([
      fetchQuizById(quizDocId),
      fetchCourseById(documentId),
    ]);

    setLoading(false);

    if (quizRes.success && quizRes.data) {
      setQuiz(quizRes.data);
    } else {
      // Fallback: try fetching by course and finding quiz
      const fallbackRes = await fetchQuizzesByCourse(documentId);
      if (fallbackRes.success && Array.isArray(fallbackRes.data)) {
        const matched = fallbackRes.data.find(
          (q) => String(q.documentId || q.id) === String(quizDocId)
        );
        if (matched) {
          setQuiz(matched);
        } else {
          setError(quizRes.error || "Quiz not found.");
        }
      } else {
        setError(quizRes.error || "Quiz not found.");
      }
    }

    if (courseRes.success && courseRes.data) {
      setCourse(courseRes.data);
    }

    // If student, check previous submission
    if (isStudent && user) {
      const subRes = await fetchMyQuizSubmission(quizDocId);
      if (subRes.success && subRes.data) {
        setLatestSubmission(subRes.data);
        setSubmissionResult(subRes.data);
      }
    }
  }, [quizDocId, documentId, isStudent, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if current user is owner/author of the parent course
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

  const isEnrolled = enrolledCourseIds.includes(String(documentId));

  // Student: Enroll action if unenrolled
  const handleEnroll = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setIsEnrolling(true);
    setToastError("");
    setToastMessage("");

    const res = await enrollInCourse(documentId);
    setIsEnrolling(false);

    if (res.success) {
      setToastMessage(`Successfully enrolled in "${course?.title || "course"}"! 🎉`);
      await loadEnrollments();
      await loadData();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setToastError(res.error || "Failed to enroll.");
      setTimeout(() => setToastError(""), 5000);
    }
  };

  // Student: Option Select (stores 0-based integer index)
  const handleOptionSelect = (qId, optIdx) => {
    setSelectedAnswers((prev) => ({ ...prev, [qId]: Number(optIdx) }));
  };

  // Student: Submit Answers for Server-Side Auto-Grading
  const handleSubmitQuiz = async () => {
    const questionsList = quiz?.questions || [];
    const answers = Object.entries(selectedAnswers).map(([qId, optIdx]) => ({
      question_id: qId,
      selected_answer: Number(optIdx), // 0-based index (0, 1, 2, 3...)
    }));

    if (answers.length === 0 && questionsList.length > 0) {
      alert("Please answer at least one question before submitting.");
      return;
    }

    setIsSubmittingQuiz(true);
    setToastError("");
    setToastMessage("");

    const res = await submitQuizAnswers(quizDocId, answers);
    setIsSubmittingQuiz(false);

    if (res.success && res.data) {
      setSubmissionResult(res.data);
      setLatestSubmission(res.data);
      setToastMessage("Quiz submitted successfully! Auto-grading complete. 🎉");
      setTimeout(() => setToastMessage(""), 4000);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setToastError(res.error || "Failed to submit quiz.");
      setTimeout(() => setToastError(""), 5000);
    }
  };

  // Instructor: Submit Add Question
  const handleAddQuestionSubmit = async (e) => {
    e.preventDefault();
    const validOptions = questionForm.options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      alert("Please provide at least 2 options for the multiple choice question.");
      return;
    }

    if (questionForm.correct_answer === "" || !validOptions.includes(questionForm.correct_answer)) {
      alert("Please select a valid correct answer from your options.");
      return;
    }

    // Determine 0-based correct answer index
    const correctIndex = validOptions.indexOf(questionForm.correct_answer);

    setIsSubmittingQuestion(true);
    setToastError("");

    const res = await createQuestion({
      quiz: quizDocId,
      question_text: questionForm.question_text.trim(),
      options: validOptions,
      correct_answer: correctIndex >= 0 ? correctIndex : questionForm.correct_answer.trim(),
      points: Number(questionForm.points) || 1,
    });

    setIsSubmittingQuestion(false);

    if (res.success) {
      setIsAddQuestionModalOpen(false);
      setToastMessage("Question added to quiz! ✓");
      await loadData();
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
      await loadData();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setToastError(res.error || "Failed to delete question.");
    }
  };

  // Instructor: Delete Quiz
  const handleDeleteQuiz = async () => {
    if (!confirm(`Are you sure you want to permanently delete the quiz "${quiz?.title}"?`)) {
      return;
    }
    setToastError("");
    const res = await deleteQuiz(quizDocId);
    if (res.success) {
      router.push(`/courses/${documentId}`);
    } else {
      setToastError(res.error || "Failed to delete quiz.");
      setTimeout(() => setToastError(""), 5000);
    }
  };

  const questionsList = Array.isArray(quiz?.questions) ? quiz.questions : [];
  const totalPoints = questionsList.reduce((acc, q) => acc + (Number(q.points) || 1), 0);

  const showEnrollmentPrompt = isStudent && !isEnrolled;

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0a192f] flex flex-col selection:bg-amber-200 selection:text-amber-900">
      {/* Navigation Header */}
      <header className="w-full border-b border-slate-200/80 bg-[#faf9f6]/90 backdrop-blur-xs sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              href={`/courses/${documentId}`}
              className="hover:text-[#0a192f] flex items-center gap-1.5 transition-colors"
            >
              <span>← Back to Course</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-[#0a192f] truncate max-w-[200px] sm:max-w-sm">
              {quiz?.title || "Quiz Assessment"}
            </span>
          </div>

          <Link href="/" className="text-lg font-bold tracking-tight text-[#0a192f]">
            Academy
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 sm:py-12 space-y-6">
        {/* Global Toast */}
        {toastMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-800 flex items-center gap-3 animate-in fade-in">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        )}

        {toastError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{toastError}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3">
            <svg className="animate-spin h-7 w-7 text-amber-600 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-slate-500">Loading quiz assessment...</p>
          </div>
        )}

        {/* Enrollment Required State */}
        {!loading && showEnrollmentPrompt && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xs">
            <div className="h-16 w-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center mx-auto text-3xl">
              🔒
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-[#0a192f]">
                Course Enrollment Required
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                This quiz is exclusively available to enrolled students of{" "}
                <strong className="text-[#0a192f] font-semibold">{course?.title || "this course"}</strong>.
                Enroll now to take the assessment and test your skills.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleEnroll}
                disabled={isEnrolling}
                className="w-full sm:w-auto px-7 py-3 text-sm font-semibold text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-xs transition-colors"
              >
                {isEnrolling ? "Enrolling..." : `Enroll Now (৳${course?.price || 0} BDT)`}
              </button>
              <Link
                href={`/courses/${documentId}`}
                className="w-full sm:w-auto px-5 py-3 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
              >
                Back to Course
              </Link>
            </div>
          </div>
        )}

        {/* Generic Error */}
        {!loading && !showEnrollmentPrompt && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-10 text-center space-y-3">
            <p className="text-base font-bold text-red-800">Unable to load quiz</p>
            <p className="text-xs text-red-600 max-w-md mx-auto">{error}</p>
            <Link
              href={`/courses/${documentId}`}
              className="inline-block px-4 py-2 text-xs font-semibold text-white bg-[#0a192f] rounded-xl mt-2"
            >
              Back to Course
            </Link>
          </div>
        )}

        {/* Quiz Content & Runner View */}
        {!loading && !showEnrollmentPrompt && quiz && (
          <div className="space-y-6">
            {/* Quiz Banner Header */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-950 bg-amber-100 border border-amber-300/80 px-2.5 py-1 rounded-lg">
                      Quiz Assessment
                    </span>
                    {course && (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {course.title}
                      </span>
                    )}
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      📝 {questionsList.length} {questionsList.length === 1 ? "Question" : "Questions"} ({totalPoints} {totalPoints === 1 ? "point" : "points"})
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a192f]">
                    {quiz.title}
                  </h1>
                </div>

                {/* Owner Actions */}
                {isOwner && (
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                    <button
                      onClick={() => {
                        setQuestionForm({
                          question_text: "",
                          options: ["", "", "", ""],
                          correct_answer: "",
                          points: 1,
                        });
                        setIsAddQuestionModalOpen(true);
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <span>+ Add Question</span>
                    </button>
                    <button
                      onClick={handleDeleteQuiz}
                      className="px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                    >
                      Delete Quiz
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================== */}
            {/* 📊 RESULTS & QUESTION-BY-QUESTION REVIEW */}
            {/* ========================================== */}
            {isStudent && submissionResult && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Results Score Summary Card */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center space-y-5 shadow-xs">
                  <div className="text-5xl">
                    {submissionResult.percentage >= 70 ? "🎉" : "📚"}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-2xl sm:text-3xl font-bold text-[#0a192f]">
                      {submissionResult.percentage >= 70
                        ? "Quiz Completed Successfully!"
                        : "Quiz Completed"}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Your answers have been auto-graded by the server. Review your performance below.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-1">
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900">
                        Score
                      </p>
                      <p className="text-2xl sm:text-3xl font-black text-amber-950 mt-0.5">
                        {submissionResult.score} / {submissionResult.total_score || totalPoints}
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-900">
                        Percentage
                      </p>
                      <p className="text-2xl sm:text-3xl font-black text-emerald-950 mt-0.5">
                        {submissionResult.percentage}%
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSubmissionResult(null);
                        setSelectedAnswers({});
                      }}
                      className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                    >
                      Retake Quiz ↺
                    </button>
                    <Link
                      href={`/courses/${documentId}`}
                      className="px-6 py-2.5 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-semibold rounded-xl transition-colors"
                    >
                      Back to Course
                    </Link>
                  </div>
                </div>

                {/* Detailed Question-by-Question Review */}
                {Array.isArray(submissionResult.answers) && submissionResult.answers.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#0a192f]">
                        Question-by-Question Review
                      </h3>
                      <span className="text-xs text-slate-500">
                        {submissionResult.answers.length} Questions Evaluated
                      </span>
                    </div>

                    <div className="space-y-4">
                      {submissionResult.answers.map((item, idx) => {
                        const optionsList = Array.isArray(item.options) ? item.options : [];
                        const isCorrect = Boolean(item.is_correct);

                        return (
                          <div
                            key={item.question_id || idx}
                            className={`bg-white border rounded-3xl p-6 shadow-xs space-y-4 transition-all ${
                              isCorrect ? "border-emerald-200" : "border-red-200"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <h4 className="text-sm sm:text-base font-bold text-[#0a192f]">
                                {idx + 1}. {item.question_text}
                              </h4>
                              <div className="flex items-center gap-2 shrink-0">
                                {isCorrect ? (
                                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                    <span>✓ Correct</span>
                                    <span>(+{item.points_awarded || 1} pt)</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-red-800 bg-red-100 border border-red-300 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                    <span>✗ Incorrect</span>
                                    <span>(0/{item.points_possible || 1} pt)</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Options Breakdown */}
                            <div className="space-y-2">
                              {optionsList.map((opt, optIdx) => {
                                const isStudentSelection = item.selected_answer === optIdx;
                                const isCorrectAnswer = item.correct_answer === optIdx;

                                let optStyle = "bg-slate-50 border-slate-200 text-slate-700";
                                if (isCorrectAnswer) {
                                  optStyle = "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-400";
                                } else if (isStudentSelection && !isCorrect) {
                                  optStyle = "bg-red-50 border-red-400 text-red-950 font-bold ring-1 ring-red-400";
                                }

                                return (
                                  <div
                                    key={optIdx}
                                    className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 ${optStyle}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold ${
                                          isCorrectAnswer
                                            ? "border-emerald-600 bg-emerald-600 text-white"
                                            : isStudentSelection && !isCorrect
                                            ? "border-red-600 bg-red-600 text-white"
                                            : "border-slate-300 bg-white text-slate-500"
                                        }`}
                                      >
                                        {isCorrectAnswer ? "✓" : isStudentSelection && !isCorrect ? "✗" : optIdx + 1}
                                      </div>
                                      <span>{opt}</span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {isStudentSelection && isCorrect && (
                                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                          Your Choice (Correct ✓)
                                        </span>
                                      )}
                                      {isStudentSelection && !isCorrect && (
                                        <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                          Your Choice (Incorrect ✗)
                                        </span>
                                      )}
                                      {!isStudentSelection && isCorrectAnswer && (
                                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                          Correct Answer ✓
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* 📝 STUDENT QUIZ RUNNER (TAKING ASSESSMENT) */}
            {/* ========================================== */}
            {isStudent && !submissionResult && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {questionsList.length === 0 ? (
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-3 shadow-xs">
                    <p className="text-sm text-slate-500 italic">
                      This quiz does not have any questions yet. Check back soon!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {questionsList.map((q, idx) => {
                      const qId = q.documentId || q.id;
                      const optionsList = Array.isArray(q.options)
                        ? q.options
                        : typeof q.options === "string"
                        ? JSON.parse(q.options || "[]")
                        : [];

                      return (
                        <div
                          key={qId || idx}
                          className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm sm:text-base font-bold text-[#0a192f]">
                              {idx + 1}. {q.question_text}
                            </h3>
                            <span className="text-[11px] font-medium text-slate-400 shrink-0">
                              {q.points || 1} pt
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {optionsList.map((opt, optIdx) => {
                              const isSelected = selectedAnswers[qId] === optIdx;
                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => handleOptionSelect(qId, optIdx)}
                                  className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-center gap-3.5 ${
                                    isSelected
                                      ? "bg-amber-50/80 border-amber-500 text-amber-950 font-semibold ring-1 ring-amber-500/40"
                                      : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "border-amber-600 bg-amber-600 text-white"
                                        : "border-slate-300 bg-white"
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

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {Object.keys(selectedAnswers).length} of {questionsList.length} answered
                      </span>

                      <button
                        onClick={handleSubmitQuiz}
                        disabled={isSubmittingQuiz}
                        className="px-6 py-2.5 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-75 flex items-center gap-2"
                      >
                        {isSubmittingQuiz ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span>Submitting Answers...</span>
                          </>
                        ) : (
                          <span>Submit Answers for Auto-Grading →</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* 👨‍🏫 INSTRUCTOR QUESTIONS MANAGEMENT VIEW */}
            {/* ========================================== */}
            {isOwner && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#0a192f]">
                    Questions in this Quiz ({questionsList.length})
                  </h3>
                  <button
                    onClick={() => {
                      setQuestionForm({
                        question_text: "",
                        options: ["", "", "", ""],
                        correct_answer: "",
                        points: 1,
                      });
                      setIsAddQuestionModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#0a192f] hover:bg-[#132c52] text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    + Add New Question
                  </button>
                </div>

                {questionsList.length === 0 ? (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center space-y-3 shadow-xs">
                    <p className="text-xs text-slate-500 italic">
                      No questions in this quiz yet. Click &quot;+ Add New Question&quot; above to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questionsList.map((q, qIdx) => {
                      const questionDocId = q.documentId || q.id;
                      const optionsList = Array.isArray(q.options)
                        ? q.options
                        : typeof q.options === "string"
                        ? JSON.parse(q.options || "[]")
                        : [];

                      return (
                        <div
                          key={questionDocId || qIdx}
                          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3 text-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-bold text-sm text-[#0a192f]">
                              {qIdx + 1}. {q.question_text}
                              <span className="text-xs text-slate-400 font-normal ml-2">
                                ({q.points || 1} pt)
                              </span>
                            </p>
                            <button
                              onClick={() => handleDeleteQuestion(questionDocId)}
                              className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              Delete Question
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {optionsList.map((opt, optIdx) => {
                              const isCorrect =
                                q.correct_answer === optIdx ||
                                (q.correct_answer !== undefined &&
                                  String(q.correct_answer).trim() === String(opt).trim());
                              return (
                                <div
                                  key={optIdx}
                                  className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between ${
                                    isCorrect
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                                      : "bg-slate-50 border-slate-200 text-slate-700"
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {isCorrect && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
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
        )}
      </main>

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
                        Option {idx + 1}: {opt}
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
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getCurrentUser,
  fetchCourseById,
  fetchLessonById,
  updateLesson,
  deleteLesson,
} from "@/lib/api";

/**
 * Simple, elegant Markdown Parser & Renderer for Lesson Contents
 */
function MarkdownRenderer({ content }) {
  if (!content) {
    return (
      <p className="text-slate-400 italic">No notes or contents written for this lesson yet.</p>
    );
  }

  // Split content by lines
  const lines = content.split("\n");
  const elements = [];
  let inCodeBlock = false;
  let codeBlockBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle (```)
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <div
            key={`code-${i}`}
            className="my-4 bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner"
          >
            <pre>{codeBlockBuffer.join("\n")}</pre>
          </div>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-lg font-bold text-[#0a192f] mt-6 mb-2">
          {parseInlineFormatting(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-xl font-bold text-[#0a192f] mt-7 mb-3 border-b border-slate-100 pb-1.5">
          {parseInlineFormatting(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-2xl font-extrabold text-[#0a192f] mt-8 mb-4 border-b border-slate-200 pb-2">
          {parseInlineFormatting(line.slice(2))}
        </h1>
      );
    }
    // Blockquote
    else if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={i}
          className="my-3 pl-4 border-l-4 border-amber-400 bg-amber-50/50 py-2 pr-3 text-sm text-slate-700 italic rounded-r-lg"
        >
          {parseInlineFormatting(line.slice(2))}
        </blockquote>
      );
    }
    // Unordered List (- or *)
    else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-5 list-disc text-sm text-slate-700 leading-relaxed my-1">
          {parseInlineFormatting(line.trim().slice(2))}
        </li>
      );
    }
    // Numbered List
    else if (/^\d+\.\s/.test(line.trim())) {
      const text = line.trim().replace(/^\d+\.\s/, "");
      elements.push(
        <li key={i} className="ml-5 list-decimal text-sm text-slate-700 leading-relaxed my-1">
          {parseInlineFormatting(text)}
        </li>
      );
    }
    // Empty line / spacer
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={i} className="text-sm text-slate-700 leading-relaxed my-2">
          {parseInlineFormatting(line)}
        </p>
      );
    }
  }

  return <div className="space-y-1">{elements}</div>;
}

// Parse inline markdown elements: **bold**, *italic*, `code`, [link](url)
function parseInlineFormatting(text) {
  if (!text) return "";
  const parts = [];
  let remaining = text;
  let key = 0;

  // Regex to match inline code, bold, italic
  const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let match;
  let lastIndex = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 bg-slate-100 text-amber-950 font-mono text-xs rounded border border-slate-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export default function LessonDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params?.documentId;
  const lessonDocId = params?.lessonDocId;

  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  // Student enrollment state
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState("");

  // Edit Lesson Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingLesson, setIsUpdatingLesson] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    contents: "",
  });

  // Load user info and enrolled list
  useEffect(() => {
    setUser(getCurrentUser());
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("academy_enrolled_courses");
        if (saved) setEnrolledCourseIds(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Fetch lesson and course data
  const loadData = useCallback(async () => {
    if (!lessonDocId || !documentId) return;
    setLoading(true);
    setError("");

    const [lessonRes, courseRes] = await Promise.all([
      fetchLessonById(lessonDocId),
      fetchCourseById(documentId),
    ]);

    setLoading(false);

    if (lessonRes.success && lessonRes.data) {
      setLesson(lessonRes.data);
    } else {
      setError(lessonRes.error || "Lesson not found");
    }

    if (courseRes.success && courseRes.data) {
      setCourse(courseRes.data);
    }
  }, [lessonDocId, documentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Determine user role
  const roleType = (
    user?.role?.type ||
    (typeof user?.role === "string" ? user?.role : "student")
  ).toLowerCase();

  const isStudent = roleType === "student";
  const isInstructor = roleType === "instructor";
  const isAdmin = roleType === "admin";
  const isContentManager = roleType === "content_manager";

  // Check if current user is owner of the parent course
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

  // Open Edit Modal
  const openEditModal = () => {
    if (!lesson) return;
    setEditForm({
      title: lesson.title || "",
      contents: lesson.contents || "",
    });
    setToastError("");
    setIsEditModalOpen(true);
  };

  // Submit Lesson Update
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingLesson(true);
    setToastError("");

    const res = await updateLesson(lessonDocId, {
      title: editForm.title,
      contents: editForm.contents,
    });

    setIsUpdatingLesson(false);

    if (res.success) {
      setIsEditModalOpen(false);
      setToastMessage("Lesson updated successfully!");
      await loadData();
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setToastError(res.error || "Failed to update lesson");
    }
  };

  // Delete Lesson
  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${lesson?.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    const res = await deleteLesson(lessonDocId);
    if (res.success) {
      router.push(`/courses/${documentId}`);
    } else {
      setToastError(res.error || "Failed to delete lesson");
      setTimeout(() => setToastError(""), 5000);
    }
  };

  // Find next and previous lesson in curriculum
  const lessons = Array.isArray(course?.lessons) ? course.lessons : [];
  const currentIdx = lessons.findIndex(
    (l) => String(l.documentId || l.id) === String(lessonDocId)
  );
  const prevLesson = currentIdx > 0 ? lessons[currentIdx - 1] : null;
  const nextLesson =
    currentIdx >= 0 && currentIdx < lessons.length - 1
      ? lessons[currentIdx + 1]
      : null;

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0a192f] flex flex-col selection:bg-amber-200 selection:text-amber-900">
      {/* Top Header */}
      <header className="w-full border-b border-slate-200/80 bg-[#faf9f6]/90 backdrop-blur-xs sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-[#0a192f] hover:opacity-85 transition-opacity"
            >
              Academy
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href={`/courses/${documentId}`}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors truncate max-w-[200px]"
            >
              {course?.title || "Course"}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 truncate max-w-[150px]">
              {lesson?.title || "Lesson"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/courses/${documentId}`}
              className="px-3.5 py-1.5 text-xs font-medium text-[#0a192f] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>← Course Curriculum</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 sm:py-12 space-y-8">
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
            <p className="text-sm text-slate-500">Loading lesson content...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-10 text-center space-y-3">
            <p className="text-base font-bold text-red-800">Unable to load lesson</p>
            <p className="text-xs text-red-600 max-w-md mx-auto">{error}</p>
            <Link
              href={`/courses/${documentId}`}
              className="inline-block px-4 py-2 text-xs font-semibold text-white bg-[#0a192f] rounded-xl mt-2"
            >
              Back to Course
            </Link>
          </div>
        )}

        {/* Lesson Body View */}
        {!loading && lesson && (
          <div className="space-y-6">
            {/* Lesson Header Banner */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-950 bg-amber-100 border border-amber-300/80 px-2.5 py-1 rounded-lg">
                      Lesson {lesson.order || (currentIdx >= 0 ? currentIdx + 1 : 1)}
                    </span>
                    {course && (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {course.title}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a192f]">
                    {lesson.title}
                  </h1>
                </div>

                {/* Owner Actions: Edit & Delete Lesson */}
                {isOwner && (
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                    <button
                      onClick={openEditModal}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      Edit Lesson
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                    >
                      Delete Lesson
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Markdown Content Reader Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6 min-h-[300px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Lesson Notes & Curriculum Material
                </span>
                <span className="text-xs text-slate-400 font-mono">Markdown Format</span>
              </div>

              {/* Parsed Markdown Output */}
              <div className="prose prose-slate max-w-none">
                <MarkdownRenderer content={lesson.contents} />
              </div>
            </div>

            {/* Bottom Pagination: Previous / Next Lesson */}
            <div className="flex items-center justify-between pt-2">
              {prevLesson ? (
                <Link
                  href={`/courses/${documentId}/lessons/${prevLesson.documentId || prevLesson.id}`}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors flex items-center gap-2"
                >
                  <span>← Previous:</span>
                  <span className="truncate max-w-[180px] font-normal">{prevLesson.title}</span>
                </Link>
              ) : (
                <div />
              )}

              {nextLesson ? (
                <Link
                  href={`/courses/${documentId}/lessons/${nextLesson.documentId || nextLesson.id}`}
                  className="px-4 py-2.5 text-xs font-semibold text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-xs transition-colors flex items-center gap-2"
                >
                  <span>Next Lesson:</span>
                  <span className="truncate max-w-[180px] font-normal text-amber-200">
                    {nextLesson.title}
                  </span>
                  <span>→</span>
                </Link>
              ) : (
                <Link
                  href={`/courses/${documentId}`}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  ✓ Curriculum Complete
                </Link>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Edit Lesson Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0a192f]">Edit Lesson</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
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
                  value={editForm.contents}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      contents: e.target.value,
                    })
                  }
                  placeholder="# Lesson Overview&#10;&#10;Write markdown notes, code blocks, and curriculum materials..."
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingLesson}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#0a192f] hover:bg-[#132c52] rounded-xl shadow-xs disabled:opacity-70 flex items-center gap-2"
                >
                  {isUpdatingLesson ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

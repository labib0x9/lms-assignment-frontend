/**
 * Academy LMS - Strapi Backend API Client
 *
 * Configure your backend URL in .env.local:
 * NEXT_PUBLIC_API_URL=http://localhost:1337 (or your deployed Strapi backend URL)
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Helper to get the auth token from localStorage
 */
export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("academy_token");
}

/**
 * Perform login request to Strapi backend
 * @param {Object} credentials - { identifier, password, role }
 */
export async function loginUser({identifier, password, role }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: identifier,
        password: password,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data.error?.message ||
        data.message ||
        (Array.isArray(data.data?.errors)
          ? data.data.errors[0]?.message
          : null) ||
        `Login failed (${response.status})`;
      throw new Error(errorMsg);
    }

    // Save auth token and user profile returned by Strapi backend
    const token = data.jwt;
    if (token && typeof window !== "undefined") {
      localStorage.setItem("academy_token", token);
      if (data.user) {
        localStorage.setItem("academy_user", JSON.stringify(data.user));
      }
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error.message ||
        "Failed to connect to backend server. Make sure your Strapi backend is running.",
    };
  }
}

/**
 * Perform sign up / registration request to Strapi backend
 * @param {Object} userData - { username, email, password, role }
 */
export async function registerUser({ username, email, password, role }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/local/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        email: email,
        password: password,
        role: role,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data.error?.message ||
        data.message ||
        (Array.isArray(data.data?.errors)
          ? data.data.errors[0]?.message
          : null) ||
        `Registration failed (${response.status})`;
      throw new Error(errorMsg);
    }

    // Save auth token and user profile if returned on register
    const token = data.jwt;
    if (token && typeof window !== "undefined") {
      localStorage.setItem("academy_token", token);
      if (data.user) {
        localStorage.setItem("academy_user", JSON.stringify(data.user));
      }
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error.message ||
        "Failed to connect to backend server. Make sure your Strapi backend is running.",
    };
  }
}

/**
 * Perform forgot password request to backend
 * @param {Object} payload - { email }
 */
export async function requestPasswordReset({ email }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data.error?.message ||
        data.message ||
        `Request failed (${response.status})`;
      throw new Error(errorMsg);
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to connect to backend server.",
    };
  }
}

/**
 * Fetch list of courses from Strapi backend
 * Accessible by all roles and unauthenticated public visitors
 */
export async function fetchCourses() {
  try {
    const token = getAuthToken();
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/courses`, {
      method: "GET",
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data.error?.message ||
        data.message ||
        `Failed to fetch courses (${response.status})`;
      throw new Error(errorMsg);
    }

    // Handle both Strapi v5 { data: [...] } and direct array
    const courses = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
    return { success: true, data: courses, meta: data.meta };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch courses from backend.",
      data: [],
    };
  }
}

/**
 * Create a new course (Admin, Content Manager, Instructor only)
 * @param {Object} courseData - { title, description, price }
 */
export async function createCourse({ title, description, price }) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("You must be logged in to create a course.");
    }

    const response = await fetch(`${API_BASE_URL}/api/courses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          title,
          description,
          price: Number(price),
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data.error?.message ||
        data.message ||
        `Course creation failed (${response.status})`;
      throw new Error(errorMsg);
    }

    return { success: true, data: data.data || data };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to create course.",
    };
  }
}

/**
 * Update an existing course (Admin, Content Manager, Instructor only)
 * @param {string|number} documentIdOrId
 * @param {Object} courseData - { title, description, price }
 */
export async function updateCourse(documentIdOrId, { title, description, price }) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("You must be logged in to update a course.");
    }

    const response = await fetch(`${API_BASE_URL}/api/courses/${documentIdOrId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          title,
          description,
          price: Number(price),
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data.error?.message ||
        data.message ||
        `Course update failed (${response.status})`;
      throw new Error(errorMsg);
    }

    return { success: true, data: data.data || data };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to update course.",
    };
  }
}

/**
 * Delete a course (Admin, Content Manager, Instructor only)
 * @param {string|number} documentIdOrId
 */
export async function deleteCourse(documentIdOrId) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("You must be logged in to delete a course.");
    }

    const response = await fetch(`${API_BASE_URL}/api/courses/${documentIdOrId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const errorMsg =
        data.error?.message ||
        data.message ||
        `Course deletion failed (${response.status})`;
      throw new Error(errorMsg);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to delete course.",
    };
  }
}

/**
 * Fetch a single course by documentId (includes populated lessons, instructors, etc.)
 * @param {string|number} documentIdOrId
 */
export async function fetchCourseById(documentIdOrId) {
  try {
    const token = getAuthToken();
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/courses/${documentIdOrId}?populate=*`, {
      method: "GET",
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data.error?.message ||
        data.message ||
        `Failed to fetch course (${response.status})`;
      throw new Error(errorMsg);
    }

    return { success: true, data: data.data || data };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch course details.",
    };
  }
}

/**
 * Create a new lesson attached to a course
 * @param {Object} lessonData - { title, contents, url, course: courseDocumentId }
 */
export async function createLesson(lessonData) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("You must be logged in to create a lesson.");
    }

    const response = await fetch(`${API_BASE_URL}/api/lessons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          title: lessonData.title,
          contents: lessonData.contents,
          // url: lessonData.url,
          course: lessonData.course, // Course documentId
        },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || "Failed to create lesson");
    }
    return { success: true, data: data.data || data };
  } catch (error) {
    return { success: false, error: error.message || "Failed to create lesson" };
  }
}

/**
 * Update an existing lesson
 * @param {string} lessonDocId - Lesson documentId
 * @param {Object} lessonData - { title, contents, url }
 */
export async function updateLesson(lessonDocId, lessonData) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("You must be logged in to update a lesson.");
    }

    const response = await fetch(`${API_BASE_URL}/api/lessons/${lessonDocId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data: lessonData }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || "Failed to update lesson");
    }
    return { success: true, data: data.data || data };
  } catch (error) {
    return { success: false, error: error.message || "Failed to update lesson" };
  }
}

/**
 * Delete a lesson
 * @param {string} lessonDocId - Lesson documentId
 */
export async function deleteLesson(lessonDocId) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("You must be logged in to delete a lesson.");
    }

    const response = await fetch(`${API_BASE_URL}/api/lessons/${lessonDocId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || data.message || "Failed to delete lesson");
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || "Failed to delete lesson" };
  }
}

/**
 * Fetch a single lesson by documentId (includes populated course relation)
 * @param {string|number} lessonDocId
 */
export async function fetchLessonById(lessonDocId) {
  try {
    const token = getAuthToken();
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/lessons/${lessonDocId}?populate=*`, {
      method: "GET",
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data.error?.message ||
        data.message ||
        `Failed to fetch lesson (${response.status})`;
      throw new Error(errorMsg);
    }

    return { success: true, data: data.data || data };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch lesson details.",
    };
  }
}

/**
 * Enroll the current logged-in student in a course
 * @param {string} courseDocId - Course documentId
 */
export async function enrollInCourse(courseDocId) {
  try {
    const token = getAuthToken();
    if (!token) throw new Error("You must be logged in to enroll.");

    const response = await fetch(`${API_BASE_URL}/api/enrolls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          course: courseDocId, // Pass course documentId
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data.error?.message ||
        data.message ||
        `Enrollment failed (${response.status})`;
      throw new Error(errorMsg);
    }

    return { success: true, data: data.data || data };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to enroll in course.",
    };
  }
}

/**
 * Fetch all enrollments for the current logged-in user
 * (Backend automatically scopes to current student's enrollments)
 */
export async function fetchMyEnrollments() {
  try {
    const token = getAuthToken();
    if (!token) return { success: true, data: [] };

    const response = await fetch(`${API_BASE_URL}/api/enrolls`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || "Failed to fetch enrollments.");
    }

    // Handle both Strapi v5 { data: [...] } and array formats
    const enrollments = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
    return { success: true, data: enrollments };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch enrollments.",
    };
  }
}

/**
 * Unenroll from a course
 * @param {string} enrollmentDocId - Enrollment documentId
 */
export async function unenrollCourse(enrollmentDocId) {
  try {
    const token = getAuthToken();
    if (!token) throw new Error("You must be logged in.");

    const response = await fetch(`${API_BASE_URL}/api/enrolls/${enrollmentDocId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || "Failed to unenroll.");
    }

    return { success: true, message: data.message || "Unenrolled successfully." };
  } catch (error) {
    return { success: false, error: error.message || "Failed to unenroll." };
  }
}

/**
 * 1. Toggle completion of a lesson (Marks complete or unmarks to incomplete)
 * @param {string} lessonDocId - Lesson documentId
 */
export async function toggleLessonProgress(lessonDocId) {
  try {
    const token = getAuthToken();
    if (!token) throw new Error("You must be logged in as a student.");

    const response = await fetch(`${API_BASE_URL}/api/progresses/toggle-lesson`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: { lesson: lessonDocId },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to update lesson progress.");
    }
    return { success: true, data: data.data || data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 2. Mark a lesson as complete or uncomplete for a course (Legacy / Alternative)
 * @param {string} courseDocId - Course documentId
 * @param {'complete'|'uncomplete'} action - Defaults to 'complete'
 */
export async function updateCourseProgress(courseDocId, action = "complete") {
  try {
    const token = getAuthToken();
    if (!token) throw new Error("You must be logged in as a student.");

    const response = await fetch(`${API_BASE_URL}/api/progresses/update-progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          course: courseDocId,
          action, // "complete" or "uncomplete"
        },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || "Failed to update progress.");
    }
    return { success: true, data: data.data || data };
  } catch (error) {
    return { success: false, error: error.message || "Failed to update progress." };
  }
}

/**
 * 3. Fetch progress for a single specific course (includes list of completed lesson IDs)
 * @param {string} courseDocId - Course documentId
 */
export async function fetchCourseProgress(courseDocId) {
  try {
    const token = getAuthToken();
    if (!token) return { success: false, error: "Not authenticated" };

    const response = await fetch(
      `${API_BASE_URL}/api/progresses/course/${courseDocId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || "Failed to fetch course progress.");
    }
    return { success: true, data: data.data || data };
  } catch (error) {
    return { success: false, error: error.message || "Failed to fetch course progress." };
  }
}

/**
 * 4. Fetch progress for all courses enrolled by current student
 */
export async function fetchAllProgresses() {
  try {
    const token = getAuthToken();
    if (!token) return { success: true, data: [] };

    const response = await fetch(`${API_BASE_URL}/api/progresses`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || "Failed to fetch all progresses.");
    }
    return { success: true, data: Array.isArray(data.data) ? data.data : [] };
  } catch (error) {
    return { success: false, error: error.message || "Failed to fetch all progresses." };
  }
}

// ==========================================
// 🎓 STUDENT QUIZ APIS
// ==========================================

/**
 * 1. Fetch quizzes for an enrolled course (correct answers are hidden for students)
 * @param {string} courseDocId - Course documentId
 */
export async function fetchQuizzesByCourse(courseDocId) {
  try {
    const token = getAuthToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/api/quizzes/course/${courseDocId}`, {
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || "Failed to fetch quizzes.");
    return { success: true, data: data.data || [] };
  } catch (error) {
    return { success: false, error: error.message || "Failed to fetch quizzes." };
  }
}

/**
 * 1b. Fetch a single quiz by documentId
 * @param {string} quizDocId - Quiz documentId
 */
export async function fetchQuizById(quizDocId) {
  try {
    const token = getAuthToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/api/quizzes/${quizDocId}`, {
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || "Failed to fetch quiz.");
    return { success: true, data: data.data || data };
  } catch (error) {
    return { success: false, error: error.message || "Failed to fetch quiz." };
  }
}

/**
 * 2. Submit answers for instant server-side auto-grading
 * @param {string} quizDocId - Quiz documentId
 * @param {Array<{ question_id: string, selected_answer: string }>} answers
 */
export async function submitQuizAnswers(quizDocId, answers) {
  try {
    const token = getAuthToken();
    if (!token) throw new Error("You must be logged in as a student.");

    const res = await fetch(`${API_BASE_URL}/api/quizzes/${quizDocId}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data: { answers } }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || "Failed to submit quiz.");
    return { success: true, data: data.data || data };
  } catch (error) {
    return { success: false, error: error.message || "Failed to submit quiz." };
  }
}

/**
 * 3. Fetch current student's latest submission & score for a quiz
 * @param {string} quizDocId - Quiz documentId
 */
export async function fetchMyQuizSubmission(quizDocId) {
  try {
    const token = getAuthToken();
    if (!token) return { success: false, error: "Not logged in" };

    const res = await fetch(`${API_BASE_URL}/api/quizzes/${quizDocId}/my-submission`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    return { success: res.ok, data: data.data };
  } catch (error) {
    return { success: false, error: error.message || "Failed to fetch submission." };
  }
}

// ==========================================
// 👨‍🏫 INSTRUCTOR & ADMIN MANAGEMENT APIS
// ==========================================

/**
 * 4. Create a new Quiz for a course
 * @param {{ title: string, course: string }} quizData
 */
export async function createQuiz(quizData) {
  try {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required.");

    const res = await fetch(`${API_BASE_URL}/api/quizzes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data: quizData }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || "Failed to create quiz.");
    return { success: true, data: data.data || data };
  } catch (error) {
    return { success: false, error: error.message || "Failed to create quiz." };
  }
}

/**
 * 5. Add a Question to a Quiz
 * @param {{ quiz: string, question_text: string, options: string[], correct_answer: string, points?: number }} questionData
 */
export async function createQuestion(questionData) {
  try {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required.");

    const res = await fetch(`${API_BASE_URL}/api/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data: questionData }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || "Failed to add question.");
    return { success: true, data: data.data || data };
  } catch (error) {
    return { success: false, error: error.message || "Failed to add question." };
  }
}

/**
 * 6. Delete a Quiz
 * @param {string} quizDocId - Quiz documentId
 */
export async function deleteQuiz(quizDocId) {
  try {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required.");

    const res = await fetch(`${API_BASE_URL}/api/quizzes/${quizDocId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: res.ok };
  } catch (error) {
    return { success: false, error: error.message || "Failed to delete quiz." };
  }
}

/**
 * 7. Delete a Question
 * @param {string} questionDocId - Question documentId
 */
export async function deleteQuestion(questionDocId) {
  try {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required.");

    const res = await fetch(`${API_BASE_URL}/api/questions/${questionDocId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: res.ok };
  } catch (error) {
    return { success: false, error: error.message || "Failed to delete question." };
  }
}

/**
 * Helper to get currently logged in user from localStorage
 */
export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  try {
    const userStr = localStorage.getItem("academy_user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

/**
 * Helper to log out user
 */
export function logoutUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("academy_token");
    localStorage.removeItem("academy_user");
  }
}

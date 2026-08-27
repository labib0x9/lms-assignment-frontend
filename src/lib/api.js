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

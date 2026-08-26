/**
 * Academy LMS - Strapi Backend API Client
 *
 * Configure your backend URL in .env.local:
 * NEXT_PUBLIC_API_URL=http://localhost:1337 (or your deployed Strapi backend URL)
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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

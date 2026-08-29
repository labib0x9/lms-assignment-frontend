# Academy — Learning Management System (Frontend)

---

## 🚀 How to Run Locally

### 1. Prerequisites
- **Node.js**: `v18.18.0` or higher
- **npm**: `v9.0.0` or higher
- **Strapi 5 Backend**: Running locally (default: `http://localhost:1337`)

### 2. Environment Setup
Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:1337
```

### 3. Install Dependencies & Start Development Server
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 Feature Completion Status

| Feature | Status |
|---|---|
| Authentication + Role-Based Access | ✅ Complete |
| Course Management & Authoring | ✅ Complete |
| Curriculum & Lesson Reader | ✅ Complete |
| Course Enrollment | ✅ Complete |
| Progress Tracking | ⚠️ Partially complete — see note below |
| Quiz & Auto-Grading | ✅ Complete |
| Admin Panel (role management + platform stats) | ❌ Not implemented |
| Blog (Writing & Control) | ❌ Not implemented |

> **Admin dashboard scope:** `AdminDashboard.js` gives an admin unrestricted course/lesson management across the whole platform (Admin bypasses ownership checks by permission), reusing the same screens as Instructor course management. It does **not** include user role management or platform statistics — so the Admin Panel differentiator itself is not implemented, only unrestricted content access.

> **Instructor/Admin account activation:** new Instructor and Admin signups are created in a blocked state. A platform admin has to manually unblock the account from the Strapi admin panel (`http://localhost:1337/admin`, toggling `blocked → false`) before that user can log in. This uses Strapi's built-in account-blocking field — there's no in-app approval screen in the Academy frontend itself.

> **Progress Tracking gap:** matches the backend — a student can mark lessons complete and view their own progress fully. There's no Instructor/Admin/Content Manager screen yet to view student progress across a course.

---

## ✨ Completed Features

### 1. 🔐 Role-Based Authentication & Access Control
- Full user registration and login workflows with JWT storage in `localStorage`.
- Role-scoped capabilities for **Students**, **Instructors**, and **Administrators / Content Managers**.
- Immediate dashboard access for Students upon signup. Instructor/Admin accounts are created blocked and require manual unblocking via the Strapi admin panel before login succeeds.

### 2. 📚 Course Management & Authoring
- Browse available course catalog with pricing in **Bangladeshi Taka (`৳` / BDT)**.
- Instructor course creation, details editing, and deletion with ownership verification.
- Dynamic course details page with curriculum overview, instructor credentials, and quiz lists.

### 3. 📖 Curriculum & Dedicated Lesson Reader
- Step-by-step curriculum navigation with previous/next lesson shortcuts.
- Rich Markdown documentation rendering (headings, blockquotes, code blocks, lists, bold text).
- Access control ensuring unauthenticated or unenrolled students cannot access restricted lesson content.

### 4. 🎓 Student Course Enrollment & "My Courses" Filtering
- One-click course enrollment with server-side duplicate protection.
- Dedicated **"My Enrolled Courses"** tab on the student dashboard.
- Live enrollment sync button to pull the latest enrollment status from the database.

### 5. 📊 Real-Time Progress Tracking — ⚠️ Partially Complete
- **Per-Lesson Toggle Action**: Interactive `Mark as Complete` / `✓ Completed (Click to Undo)` button.
- **Curriculum Checkmarks**: Completed lessons display a `✅` checkmark, strike-through text, and `Done ✓` tag.
- **Per-Course Progress Bar**: Dynamic `{percentage}%` calculation:
  $$\text{Percentage} = \text{round}\left(\frac{\text{Completed Lessons}}{\text{Total Lessons}} \times 100\right)$$
- **Overall Student Progress Metric**: Top dashboard widget calculating cumulative progress across all enrolled courses:
  $$\text{Overall } \% = \text{round}\left(\frac{\text{Total Completed Lessons across all courses}}{\text{Total Lessons across all courses}} \times 100\right)$$
- **Not implemented**: an Instructor/Admin/Content Manager screen to view a course's student progress. Only a student's own progress view exists.

### 6. 📝 Quiz Assessment & Auto-Grading System
- **Dedicated Quiz Route** (`/courses/[documentId]/quizzes/[quizDocId]`): Full-screen quiz taking and management experience.
- **Instructor Authoring**: Add multiple-choice questions with 2–4 options, correct answer selection, and custom points.
- **Student Runner**: 0-based option index selection with interactive radio cards.
- **Instant Server Auto-Grading & Review**: Server-side grading returning score and detailed question-by-question breakdown with green/red badges.

### 7. 🏛️ Modular Role-Based Dashboard Architecture
- Lightweight router at `/dashboard` delegating to dedicated, isolated components:
- `StudentDashboard.js`: Progress widgets, enrollment sync, and enrolled course cards.
- `InstructorDashboard.js`: Authored course filter and course creation studio.
- `AdminDashboard.js`: Unrestricted course/lesson management across the platform (bypasses ownership checks) — does not include user role management or platform stats.

---

## 🚧 Not Implemented (Out of Scope)

### Admin Panel (role management + platform stats)
`AdminDashboard.js` provides unrestricted content management only. Given the timeline, effort went into the core features and the two fully-implemented differentiators rather than building a dedicated role-management/stats dashboard.

### Blog (Writing & Control)
Not built for this submission, for the same reason.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend API**: [Strapi 5](https://strapi.io/)
- **Deployment**: [Vercel](https://vercel.com/)
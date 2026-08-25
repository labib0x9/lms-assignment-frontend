import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0a192f] flex flex-col selection:bg-amber-200 selection:text-amber-900">
      {/* 1. Navbar */}
      <header className="w-full border-b border-slate-200/80 bg-[#faf9f6]/90 backdrop-blur-xs sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Project name as plain text / wordmark */}
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-[#0a192f] hover:opacity-85 transition-opacity"
          >
            Academy
          </Link>

          {/* Right: Blogs & Login outline buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/blogs"
              className="px-4 py-1.5 text-sm font-medium text-[#0a192f] border border-slate-300 rounded-lg hover:bg-slate-100/80 hover:border-slate-400 transition-colors"
            >
              Blogs
            </Link>
            <Link
              href="/login"
              className="px-4 py-1.5 text-sm font-medium text-[#0a192f] border border-slate-300 rounded-lg hover:bg-slate-100/80 hover:border-slate-400 transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Summary Section */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl mx-auto px-6 py-24 sm:py-32 w-full">
        <div className="max-w-3xl space-y-6">
          {/* Headline: mostly dark navy with a soft highlight pill in warm accent color */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0a192f] leading-[1.25] sm:leading-[1.2]">
            Academy is a focused learning platform for{" "}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xl sm:text-3xl lg:text-4xl font-semibold bg-amber-100 text-amber-900 border border-amber-300/70 align-baseline mx-0.5 sm:mx-1 shadow-xs">
              mastering Backend Engineering
            </span>
          </h1>

          {/* Plain 1-2 sentence paragraph summary */}
          {/* <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl pt-2">
            An open environment built for students and educators to organize course materials, track assignment progress, and deliver feedback without distraction.
          </p> */}
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0a192f] flex flex-col selection:bg-amber-200 selection:text-amber-900">
      <header className="w-full border-b border-slate-200/80 bg-[#faf9f6]/90 backdrop-blur-xs sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-[#0a192f] hover:opacity-85 transition-opacity"
          >
            Academy
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm p-8 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-5 text-center">
          <h1 className="text-2xl font-bold text-[#0a192f]">Sign in to Academy</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            This is a stub login page. Authentication and login forms will be connected here.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-2 px-4 text-sm font-medium text-amber-950 bg-amber-100/90 border border-amber-300/80 rounded-lg hover:bg-amber-200/80 transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </main>
    </div>
  );
}

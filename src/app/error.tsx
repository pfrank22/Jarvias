"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-slate-600">The error has been logged. Please try again.</p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white"
      >
        Try again
      </button>
    </main>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="mt-2 text-slate-600">
        That page doesn’t exist, or you don’t have access to it.
      </p>
      <Link href="/dashboard" className="mt-6 inline-block font-medium text-brand-600">
        Back to dashboard
      </Link>
    </main>
  );
}

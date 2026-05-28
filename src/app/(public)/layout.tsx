export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal SCG branded header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-scg-600">
            <span className="text-xs font-bold text-white">SCG</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Outside Counsel Platform
            </p>
            <p className="text-[10px] text-gray-400">Proposal Submission Portal</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        Siam Cement Group &mdash; Legal Affairs
      </footer>
    </div>
  );
}

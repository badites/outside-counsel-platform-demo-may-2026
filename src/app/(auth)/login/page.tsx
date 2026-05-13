export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-xl font-semibold text-gray-900">
          Counsel Directory
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Sign in to access the outside counsel directory
        </p>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button className="w-full rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800">
            Sign in with magic link
          </button>
        </div>
      </div>
    </div>
  );
}

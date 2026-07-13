import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
          <button
            onClick={logout}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700"
          >
            Sign out
          </button>
        </div>
        <p className="text-zinc-600">
          Signed in as <strong>{user?.name}</strong> ({user?.email}) —{" "}
          <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs">
            {user?.role}
          </span>
        </p>
      </div>
    </div>
  );
}

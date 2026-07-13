import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  ShieldOff,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Pencil,
  X,
  ArrowRight,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import {
  listUsers,
  updateUser,
  deleteUser,
  inviteUser,
  type AdminUser,
  type UpdateUserPayload,
} from "../api";
import { useAuth } from "../hooks/useAuth";

const ROLE_STYLES = {
  admin: "bg-violet-50 text-violet-700 border border-violet-200",
  commercial: "bg-blue-50 text-blue-700 border border-blue-200",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Shared field components ───────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ElementType;
}) {
  return (
    <div className="relative">
      <Icon
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
        strokeWidth={1.75}
      />
      <input
        {...props}
        className="w-full pl-9 pr-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
      />
    </div>
  );
}

function RoleSelect({
  value,
  onChange,
}: {
  value: "commercial" | "admin";
  onChange: (v: "commercial" | "admin") => void;
}) {
  return (
    <div className="relative">
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
        strokeWidth={1.75}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as "commercial" | "admin")}
        className="w-full appearance-none px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
      >
        <option value="commercial">Commercial</option>
        <option value="admin">Admin</option>
      </select>
    </div>
  );
}

// ── Invite modal ──────────────────────────────────────────────────────────────

interface InviteModalProps {
  onClose: () => void;
  onInvited: (user: AdminUser) => void;
  token: string;
}

function InviteModal({ onClose, onInvited, token }: InviteModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"commercial" | "admin">("commercial");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await inviteUser(token, { name, email, password, role });
      const users = await listUsers(token);
      const created = users.find((u) => u.email === email.toLowerCase());
      if (created) onInvited(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Invite user" subtitle="Create a new account for a team member." onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name">
          <TextInput icon={User} type="text" placeholder="Alex Petit" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email address">
          <TextInput icon={Mail} type="email" placeholder="alex@acmecorp.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Temporary password">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
            </button>
          </div>
        </Field>
        <Field label="Role">
          <RoleSelect value={role} onChange={setRole} />
        </Field>
        {error && <ErrorBanner message={error} />}
        <ModalActions onCancel={onClose} loading={loading} submitLabel="Create" />
      </form>
    </ModalShell>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  user: AdminUser;
  onClose: () => void;
  onUpdated: (user: AdminUser) => void;
  token: string;
}

function EditModal({ user, onClose, onUpdated, token }: EditModalProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<"commercial" | "admin">(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload: UpdateUserPayload = {};
      if (name.trim() !== user.name) payload.name = name.trim();
      if (email.trim().toLowerCase() !== user.email) payload.email = email.trim();
      if (role !== user.role) payload.role = role;
      if (isActive !== user.isActive) payload.isActive = isActive;

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      const { user: updated } = await updateUser(token, user._id, payload);
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Edit user" subtitle={`Editing ${user.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name">
          <TextInput icon={User} type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email address">
          <TextInput icon={Mail} type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Role">
          <RoleSelect value={role} onChange={setRole} />
        </Field>
        <Field label="Status">
          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" strokeWidth={1.75} />
            <select
              value={isActive ? "active" : "inactive"}
              onChange={(e) => setIsActive(e.target.value === "active")}
              className="w-full appearance-none px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Field>
        {error && <ErrorBanner message={error} />}
        <ModalActions onCancel={onClose} loading={loading} submitLabel="Save changes" />
      </form>
    </ModalShell>
  );
}

// ── Confirm delete modal ──────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  user: AdminUser;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function ConfirmDelete({ user, onConfirm, onCancel, loading }: ConfirmDeleteProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-red-500" strokeWidth={1.75} />
        </div>
        <h3 className="text-base font-semibold text-zinc-900">Delete user?</h3>
        <p className="text-sm text-zinc-500 mt-1.5">
          <span className="font-medium text-zinc-700">{user.name}</span> ({user.email}) will be
          permanently removed. This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 rounded-lg transition-colors"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared modal primitives ───────────────────────────────────────────────────

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  loading,
  submitLabel,
}: {
  onCancel: () => void;
  loading: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            {submitLabel} <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      {message}
    </p>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UserManagement() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoadingUsers(true);
    listUsers(token)
      .then(setUsers)
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoadingUsers(false));
  }, [token]);

  const handleToggleActive = async (u: AdminUser) => {
    if (!token) return;
    setTogglingId(u._id);
    setActionError("");
    try {
      const { user: updated } = await updateUser(token, u._id, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? updated : x)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleRole = async (u: AdminUser) => {
    if (!token) return;
    setTogglingId(u._id);
    setActionError("");
    try {
      const newRole = u.role === "admin" ? "commercial" : "admin";
      const { user: updated } = await updateUser(token, u._id, { role: newRole });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? updated : x)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!token || !pendingDelete) return;
    setDeletingId(pendingDelete._id);
    setActionError("");
    try {
      await deleteUser(token, pendingDelete._id);
      setUsers((prev) => prev.filter((x) => x._id !== pendingDelete._id));
      setPendingDelete(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  const admins = users.filter((u) => u.role === "admin");
  const commercials = users.filter((u) => u.role === "commercial");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">User Management</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {users.length} team member{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" strokeWidth={1.75} />
          Invite user
        </button>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {loadingUsers ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : fetchError ? (
        <div className="text-center py-20">
          <p className="text-sm text-red-500">{fetchError}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { label: "Admins", items: admins, icon: Shield },
            { label: "Commercial", items: commercials, icon: Users },
          ].map(({ label, items, icon: Icon }) =>
            items.length === 0 ? null : (
              <section key={label}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                    {label}
                  </h2>
                  <span className="text-xs text-zinc-400">· {items.length}</span>
                </div>
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm divide-y divide-zinc-100">
                  {items.map((u) => {
                    const isMe =
                      currentUser?.id === u._id || currentUser?.email === u.email;
                    const busy = togglingId === u._id;
                    return (
                      <div
                        key={u._id}
                        className={`flex items-center gap-4 px-5 py-4 ${!u.isActive ? "opacity-60" : ""}`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColor(u._id)}`}
                        >
                          {getInitials(u.name)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-zinc-800 truncate">{u.name}</p>
                            {isMe && (
                              <span className="text-[10px] bg-zinc-100 text-zinc-500 rounded px-1.5 py-0.5 font-medium">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 truncate">{u.email}</p>
                        </div>

                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${ROLE_STYLES[u.role]}`}
                        >
                          {u.role}
                        </span>

                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                            u.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Edit */}
                          <button
                            onClick={() => setEditTarget(u)}
                            title="Edit user"
                            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                          >
                            <Pencil className="w-4 h-4" strokeWidth={1.75} />
                          </button>

                          {/* Toggle active */}
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={isMe || busy}
                            title={u.isActive ? "Deactivate" : "Activate"}
                            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            {busy ? (
                              <span className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin block" />
                            ) : u.isActive ? (
                              <ToggleRight className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
                            ) : (
                              <ToggleLeft className="w-4 h-4" strokeWidth={1.75} />
                            )}
                          </button>

                          {/* Toggle role */}
                          <button
                            onClick={() => handleToggleRole(u)}
                            disabled={isMe || busy}
                            title={u.role === "admin" ? "Make commercial" : "Make admin"}
                            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            {u.role === "admin" ? (
                              <ShieldOff className="w-4 h-4" strokeWidth={1.75} />
                            ) : (
                              <Shield className="w-4 h-4" strokeWidth={1.75} />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setPendingDelete(u)}
                            disabled={isMe}
                            title="Delete user"
                            className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )
          )}
        </div>
      )}

      {showInvite && token && (
        <InviteModal
          token={token}
          onClose={() => setShowInvite(false)}
          onInvited={(u) => setUsers((prev) => [u, ...prev])}
        />
      )}

      {editTarget && token && (
        <EditModal
          user={editTarget}
          token={token}
          onClose={() => setEditTarget(null)}
          onUpdated={(updated) => {
            setUsers((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDelete
          user={pendingDelete}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
          loading={deletingId === pendingDelete._id}
        />
      )}
    </div>
  );
}

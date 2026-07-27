import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Zap, Eye, EyeOff, ArrowRight, Lock, Mail, User } from "lucide-react";
import { registerApi } from "../api";
import { useLanguage } from "../context/LanguageContext";

export default function Register() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError(t("errors.allFieldsRequired"));
      return;
    }
    if (password.length < 8) {
      setError(t("errors.passwordMinLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errors.passwordsDontMatch"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      await registerApi({ name, email, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex font-[Inter,sans-serif]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[480px] min-w-[480px] bg-zinc-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-semibold text-base tracking-tight">PulseCRM</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white leading-snug">
              {t("register.tagline")}
            </h1>
            <p className="text-zinc-400 mt-3 text-sm leading-relaxed max-w-xs">
              {t("register.taglineSub")}
            </p>
          </div>
          <div className="space-y-3">
            {[
              { stat: "2 min", label: t("register.stat1") },
              { stat: "100%", label: t("register.stat2") },
              { stat: "24/7", label: t("register.stat3") },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-1 h-8 bg-blue-500 rounded-full" />
                <div>
                  <span className="text-white font-bold text-lg leading-none">{item.stat}</span>
                  <span className="text-zinc-500 text-xs ml-2">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 p-4 bg-zinc-800/60 rounded-xl border border-zinc-700/50 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              AP
            </div>
            <div>
              <p className="text-white text-sm font-medium leading-none mb-1">Alex Petit</p>
              <p className="text-zinc-400 text-xs">Sales Rep · Joined last week</p>
            </div>
            <div className="ml-auto">
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded-full px-2 py-1 font-medium">
                {t("register.newBadge")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-zinc-50 p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-zinc-900 font-semibold text-sm tracking-tight">PulseCRM</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900">{t("register.title")}</h2>
            <p className="text-zinc-500 text-sm mt-1.5">{t("register.subtitle")}</p>
          </div>

          {success ? (
            <div className="text-center space-y-4 py-6">
              <div className="text-sm font-medium text-zinc-800">{t("register.successTitle")}</div>
              <p className="text-xs text-zinc-500 mt-1">{t("register.redirecting")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">{t("forms.fullName")}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder={t("register.namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">{t("forms.email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder={t("register.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">{t("forms.password")}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t("register.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">{t("forms.confirmPassword")}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t("register.confirmPasswordPlaceholder")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors mt-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>{t("register.createAccount")} <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-zinc-200">
            <p className="text-xs text-zinc-400 text-center">
              {t("register.hasAccount")}{" "}
              <Link to="/login" className="text-blue-500 hover:text-blue-600 font-medium transition-colors">
                {t("login.signIn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

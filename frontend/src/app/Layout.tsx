import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  Contact,
  Building2,
  Handshake,
  CheckSquare,
  Calendar,
  Phone,
  Video,
  Ticket,
  Search,
  Settings,
  LogOut,
  Bell,
  Zap,
  UserPlus,
  Menu,
  X,
  Activity,
  FileText,
  Receipt,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useLanguage } from "./context/LanguageContext";
import { listCalendarEventAlerts } from "./api";

const NAV_ITEMS = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/prospects", labelKey: "nav.prospects", icon: UserPlus },
  { to: "/contacts", labelKey: "nav.contacts", icon: Contact },
  { to: "/accounts", labelKey: "nav.accounts", icon: Building2 },
  { to: "/deals", labelKey: "nav.deals", icon: Handshake },
  { to: "/tasks", labelKey: "nav.tasks", icon: CheckSquare },
  { to: "/calendar", labelKey: "nav.calendar", icon: Calendar },
  { to: "/calls", labelKey: "nav.calls", icon: Phone },
  { to: "/meetings", labelKey: "nav.meetings", icon: Video },
  { to: "/tickets", labelKey: "nav.tickets", icon: Ticket },
  { to: "/quotes",   labelKey: "nav.quotes",    icon: FileText },
  { to: "/invoices", labelKey: "nav.invoices", icon: Receipt },
  { to: "/orders",   labelKey: "nav.orders",   icon: Package },
  { to: "/purchase-orders", labelKey: "nav.purchaseOrders", icon: ShoppingCart },
  { to: "/deliveries", labelKey: "nav.deliveries", icon: Truck },
];

const NAV_SYSTEM = [
  { to: "/search", labelKey: "nav.search", icon: Search },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

const NAV_ADMIN = [
  { to: "/admin/users",    labelKey: "nav.users",         icon: Users },
  { to: "/admin/activity", labelKey: "nav.activityLog",  icon: Activity },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "dashboard.title",
  "/prospects": "pages.prospects.title",
  "/contacts": "pages.contacts.title",
  "/accounts": "pages.accounts.title",
  "/deals": "pages.deals.title",
  "/tasks": "pages.tasks.title",
  "/calendar": "nav.calendar",
  "/calls": "pages.calls.title",
  "/meetings": "pages.meetings.title",
  "/tickets": "pages.tickets.title",
  "/quotes":   "pages.quotes.title",
  "/invoices": "pages.invoices.title",
  "/orders": "pages.orders.title",
  "/purchase-orders": "pages.purchaseOrders.title",
  "/deliveries": "pages.deliveries.title",
  "/search": "nav.search",
  "/settings": "nav.settings",
  "/admin/users":    "pages.userManagement.title",
  "/admin/activity": "nav.activityLog",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── Nav link helper ───────────────────────────────────────────────────────────

function SideNavLink({
  to,
  labelKey,
  icon: Icon,
  end,
  onClick,
}: {
  to: string;
  labelKey: string;
  icon: React.ElementType;
  end?: boolean;
  onClick?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-zinc-800 text-white"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-blue-400" : ""}`}
            strokeWidth={1.75}
          />
          {t(labelKey)}
          {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
        </>
      )}
    </NavLink>
  );
}

// ── Sidebar content (shared between desktop aside + mobile drawer) ────────────

function SidebarContent({
  onNavClick,
}: {
  onNavClick?: () => void;
}) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const initials = user ? getInitials(user.name) : "?";
  const roleLabel = user?.role === "admin" ? t("nav.adminRole") : t("nav.commercialRole");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Brand */}
      <div className="px-5 py-5 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">PulseCRM</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-none">
        {NAV_ITEMS.map(({ to, labelKey, icon, end }) => (
          <SideNavLink key={to} to={to} labelKey={labelKey} icon={icon} end={end} onClick={onNavClick} />
        ))}

        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] uppercase tracking-widest text-zinc-600 font-medium mb-1">
            {t("nav.system")}
          </p>
        </div>
        {NAV_SYSTEM.map(({ to, labelKey, icon }) => (
          <SideNavLink key={to} to={to} labelKey={labelKey} icon={icon} onClick={onNavClick} />
        ))}

        {user?.role === "admin" && (
          <>
            <div className="pt-3 pb-1">
              <p className="px-3 text-[10px] uppercase tracking-widest text-zinc-600 font-medium mb-1">
                {t("nav.admin")}
              </p>
            </div>
            {NAV_ADMIN.map(({ to, labelKey, icon }) => (
              <SideNavLink key={to} to={to} labelKey={labelKey} icon={icon} onClick={onNavClick} />
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate leading-none mb-1">
              {user?.name ?? "—"}
            </p>
            <span className="inline-flex items-center text-[10px] bg-blue-500/20 text-blue-300 rounded px-1.5 py-0.5 font-medium">
              {roleLabel}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title={t("nav.logout")}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function Layout() {
  const [searchValue, setSearchValue] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<{ _id: string; title: string; startAt?: string; remindAt?: string; type?: string }[]>([]);
  const location = useLocation();
  const { user, token } = useAuth();
  const { t } = useLanguage();

  // Close dropdown on route change
  useEffect(() => {
    setAlertsOpen(false);
  }, [location.pathname]);

  // Fetch calendar alerts
  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const res = await listCalendarEventAlerts(token);
        if (active) setAlerts(res.alerts?.map((a) => ({
          _id: a._id,
          title: a.title,
          startAt: a.startAt,
          remindAt: a.remindAt,
          type: a.type,
        })) || []);
      } catch {}
    })();
    return () => { active = false; };
  }, [token]);

  // Poll alerts every 60s
  useEffect(() => {
    if (!token) return;
    const id = setInterval(async () => {
      try {
        const res = await listCalendarEventAlerts(token);
        setAlerts(res.alerts?.map((a) => ({
          _id: a._id,
          title: a.title,
          startAt: a.startAt,
          remindAt: a.remindAt,
          type: a.type,
        })) || []);
      } catch {}
    }, 60000);
    return () => clearInterval(id);
  }, [token]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const pageTitleKey = PAGE_TITLES[location.pathname] ?? "dashboard.title";
  const pageTitle = t(pageTitleKey);
  const initials = user ? getInitials(user.name) : "?";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 font-[Inter,sans-serif]">

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden lg:flex w-60 min-w-60 h-full bg-zinc-900 flex-col overflow-hidden">
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer panel ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-zinc-900 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation"
      >
        {/* Close button inside drawer */}
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <SidebarContent onNavClick={() => setDrawerOpen(false)} />
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-white border-b border-zinc-200 flex items-center px-4 sm:px-8 gap-3 flex-shrink-0">

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors -ml-1 flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </button>

          <h1 className="text-zinc-900 font-semibold text-base whitespace-nowrap flex-shrink-0">
            {pageTitle}
          </h1>

          {/* Search — hides on small screens */}
          <div className="hidden sm:flex flex-1 justify-center">
            <div className="relative w-full max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
                strokeWidth={1.75}
              />
              <input
                type="text"
                placeholder="Search contacts, deals, accounts…"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="relative">
              <button
                onClick={() => setAlertsOpen((v) => !v)}
                className="relative p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors"
                aria-label="Alerts"
              >
                <Bell className="w-4 h-4" strokeWidth={1.75} />
                {alerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                )}
              </button>
              {alertsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-100">
                    <p className="text-xs font-semibold text-zinc-900">Upcoming Alerts</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="p-4 text-xs text-zinc-400 text-center">No upcoming reminders.</p>
                    ) : (
                      alerts.map((a) => (
                        <div key={a._id} className="px-4 py-3 border-b border-zinc-50 last:border-b-0 hover:bg-zinc-50">
                          <div className="flex items-start gap-2">
                            <Bell className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-zinc-700 leading-snug truncate">{a.title}</p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">
                                {a.remindAt ? `Due ${new Date(a.remindAt).toLocaleString()}` : a.startAt ? `Starts ${new Date(a.startAt).toLocaleString()}` : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50">
                    <button
                      onClick={() => setAlertsOpen(false)}
                      className="text-xs text-zinc-500 hover:text-zinc-700 font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

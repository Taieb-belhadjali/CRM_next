import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router";
import {
  LayoutDashboard,
  Handshake,
  FileText,
  Receipt,
  Ticket,
  LogOut,
  Zap,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../context/LanguageContext";

const NAV_ITEMS = [
  { to: "/portal", labelKey: "portal.dashboard", icon: LayoutDashboard, end: true },
  { to: "/portal/deals", labelKey: "portal.deals", icon: Handshake },
  { to: "/portal/quotes", labelKey: "portal.quotes", icon: FileText },
  { to: "/portal/invoices", labelKey: "portal.invoices", icon: Receipt },
  { to: "/portal/tickets", labelKey: "portal.tickets", icon: Ticket },
];

function SideNavLink({ to, labelKey, icon: Icon, end, onClick }: {
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
            ? "bg-white/10 text-white"
            : "text-white/70 hover:text-white hover:bg-white/5"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-blue-300" : ""}`} strokeWidth={1.75} />
          {t(labelKey)}
          {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-300" />}
        </>
      )}
    </NavLink>
  );
}

export default function PortalLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 font-[Inter,sans-serif]">
      <aside className="hidden lg:flex w-56 min-w-56 h-full bg-blue-900 flex-col overflow-hidden">
        <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">PulseCRM</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-none">
          {NAV_ITEMS.map(({ to, labelKey, icon, end }) => (
            <SideNavLink key={to} to={to} labelKey={labelKey} icon={icon} end={end} />
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-white border-b border-zinc-200 flex items-center px-4 sm:px-8 gap-3 flex-shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors -ml-1 flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </button>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <span className="text-zinc-400">Client Portal</span>
            <ChevronRight className="w-4 h-4 text-zinc-300" />
            <span className="font-medium text-zinc-800">{t(location.pathname === "/portal" ? "portal.dashboard" : location.pathname.replace("/portal/", "portal."))}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-xs text-zinc-500">{user?.email}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

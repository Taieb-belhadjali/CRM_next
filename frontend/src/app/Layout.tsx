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

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/prospects", label: "Prospects", icon: UserPlus },
  { to: "/contacts", label: "Contacts", icon: Contact },
  { to: "/accounts", label: "Accounts", icon: Building2 },
  { to: "/deals", label: "Deals", icon: Handshake },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/calls", label: "Calls", icon: Phone },
  { to: "/meetings", label: "Meetings", icon: Video },
  { to: "/tickets", label: "Tickets", icon: Ticket },
  { to: "/quotes",   label: "Devis",    icon: FileText },
  { to: "/invoices", label: "Factures", icon: Receipt },
  { to: "/orders",   label: "Orders",   icon: Package },
  { to: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { to: "/deliveries", label: "Deliveries", icon: Truck },
];

const NAV_SYSTEM = [
  { to: "/search", label: "Search", icon: Search },
  { to: "/settings", label: "Settings", icon: Settings },
];

const NAV_ADMIN = [
  { to: "/admin/users",    label: "Users",         icon: Users },
  { to: "/admin/activity", label: "Activity Log",  icon: Activity },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/prospects": "Prospects",
  "/contacts": "Contacts",
  "/accounts": "Accounts",
  "/deals": "Deals",
  "/tasks": "Tasks",
  "/calendar": "Calendar",
  "/calls": "Calls",
  "/meetings": "Meetings",
  "/tickets": "Tickets",
  "/quotes":   "Devis",
  "/invoices": "Factures",
  "/orders": "Orders",
  "/purchase-orders": "Purchase Orders",
  "/deliveries": "Deliveries",
  "/search": "Search",
  "/settings": "Settings",
  "/admin/users":    "User Management",
  "/admin/activity": "Activity Log",
  //"/quotes":   "Devis",
  //"/invoices": "Factures",
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
  label,
  icon: Icon,
  end,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
  onClick?: () => void;
}) {
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
          {label}
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
  const navigate = useNavigate();

  const initials = user ? getInitials(user.name) : "?";
  const roleLabel = user?.role === "admin" ? "Admin" : "Commercial";

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
        {NAV_ITEMS.map(({ to, label, icon, end }) => (
          <SideNavLink key={to} to={to} label={label} icon={icon} end={end} onClick={onNavClick} />
        ))}

        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] uppercase tracking-widest text-zinc-600 font-medium mb-1">
            System
          </p>
        </div>
        {NAV_SYSTEM.map(({ to, label, icon }) => (
          <SideNavLink key={to} to={to} label={label} icon={icon} onClick={onNavClick} />
        ))}

        {user?.role === "admin" && (
          <>
            <div className="pt-3 pb-1">
              <p className="px-3 text-[10px] uppercase tracking-widest text-zinc-600 font-medium mb-1">
                Admin
              </p>
            </div>
            {NAV_ADMIN.map(({ to, label, icon }) => (
              <SideNavLink key={to} to={to} label={label} icon={icon} onClick={onNavClick} />
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
            title="Sign out"
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
  const location = useLocation();
  const { user } = useAuth();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const pageTitle = PAGE_TITLES[location.pathname] ?? "Dashboard";
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
            <button className="relative p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors">
              <Bell className="w-4 h-4" strokeWidth={1.75} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>
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

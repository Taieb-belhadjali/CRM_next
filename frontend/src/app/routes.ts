import { createBrowserRouter } from "react-router";
import Layout from "./Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import StubPage from "./pages/StubPage";
import UserManagement from "./pages/UserManagement";
import ActivityLogPage from "./pages/ActivityLog";
import Contacts from "./pages/Contacts";
import Accounts from "./pages/Accounts";
import Prospects from "./pages/Prospects";
import Deals from "./pages/Deals";
import Tasks from "./pages/Tasks";
import CalendarPage from "./pages/CalendarPage";
import Calls from "./pages/Calls";
import Meetings from "./pages/Meetings";
import Tickets from "./pages/Tickets";
import Quotes from "./pages/Quotes";
import Invoices from "./pages/Invoices";
import Orders from "./pages/Orders";
import PurchaseOrders from "./pages/PurchaseOrders";
import Deliveries from "./pages/Deliveries";
import SearchPage from "./pages/Search";
import SettingsPage from "./pages/Settings";
import PortalLayout from "./pages/PortalLayout";
import PortalDashboard from "./pages/PortalDashboard";
import PortalDeals from "./pages/PortalDeals";
import PortalQuotes from "./pages/PortalQuotes";
import PortalInvoices from "./pages/PortalInvoices";
import PortalTickets from "./pages/PortalTickets";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import { ClientRoute } from "./components/ClientRoute";

function makeStub(title: string, description: string) {
  return function Stub() {
    return StubPage({ title, description });
  };
}

export const router = createBrowserRouter([
  // Public
  { path: "/login",    Component: Login },
  { path: "/register", Component: Register },

  // Client Portal
  {
    Component: ClientRoute,
    children: [
      {
        path: "/portal",
        Component: PortalLayout,
        children: [
          { index: true, Component: PortalDashboard },
          { path: "deals", Component: PortalDeals },
          { path: "quotes", Component: PortalQuotes },
          { path: "invoices", Component: PortalInvoices },
          { path: "tickets", Component: PortalTickets },
        ],
      },
    ],
  },

  // Authenticated
  {
    Component: ProtectedRoute,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },

          // Sprint 2
          { path: "contacts",  Component: Contacts },
          { path: "accounts",  Component: Accounts },
          { path: "prospects", Component: Prospects },

          // Sprint 3
          { path: "deals",    Component: Deals },
          { path: "tasks",    Component: Tasks },
          { path: "calendar", Component: CalendarPage },
          { path: "calls",    Component: Calls },
          { path: "meetings", Component: Meetings },
          { path: "tickets",  Component: Tickets },

          // Sprint 4
          { path: "quotes",   Component: Quotes },
          { path: "invoices", Component: Invoices },

          // Sprint 5
          { path: "orders",   Component: Orders },
          { path: "purchase-orders", Component: PurchaseOrders },
          { path: "deliveries", Component: Deliveries },

          { path: "search",   Component: SearchPage },
          { path: "settings", Component: SettingsPage },

          // Admin-only
          {
            Component: AdminRoute,
            children: [
              { path: "admin/users",    Component: UserManagement },
              { path: "admin/activity", Component: ActivityLogPage },
            ],
          },

          { path: "*", Component: makeStub("Not Found", "This page doesn't exist.") },
        ],
      },
    ],
  },
]);

import { createBrowserRouter } from "react-router";
import Layout from "./Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import StubPage from "./pages/StubPage";
import UserManagement from "./pages/UserManagement";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";

function makeStub(title: string, description: string) {
  return function Stub() {
    return StubPage({ title, description });
  };
}

export const router = createBrowserRouter([
  // Public routes
  { path: "/login", Component: Login },
  { path: "/register", Component: Register },

  // All authenticated routes sit under ProtectedRoute
  {
    Component: ProtectedRoute,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: "prospects", Component: makeStub("Prospects", "Manage and track your inbound and outbound prospects.") },
          { path: "contacts", Component: makeStub("Contacts", "View and manage all your CRM contacts in one place.") },
          { path: "accounts", Component: makeStub("Accounts", "Manage company accounts and their associated contacts.") },
          { path: "deals", Component: makeStub("Deals", "Track deals across your pipeline from first touch to close.") },
          { path: "tasks", Component: makeStub("Tasks", "Stay on top of your to-dos and follow-ups.") },
          { path: "calendar", Component: makeStub("Calendar", "View your meetings, calls, and scheduled activities.") },
          { path: "calls", Component: makeStub("Calls", "Log and review call activity across your team.") },
          { path: "meetings", Component: makeStub("Meetings", "Schedule and track client meetings and demos.") },
          { path: "tickets", Component: makeStub("Tickets", "Manage support tickets and customer issues.") },
          { path: "search", Component: makeStub("Search", "Search across contacts, deals, accounts, and more.") },
          { path: "settings", Component: makeStub("Settings", "Configure your workspace, integrations, and preferences.") },

          // Admin-only routes nested inside ProtectedRoute > Layout > AdminRoute
          {
            Component: AdminRoute,
            children: [
              { path: "admin/users", Component: UserManagement },
            ],
          },

          { path: "*", Component: makeStub("Not Found", "This page doesn't exist.") },
        ],
      },
    ],
  },
]);

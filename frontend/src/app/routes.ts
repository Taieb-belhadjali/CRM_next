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
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";

function makeStub(title: string, description: string) {
  return function Stub() {
    return StubPage({ title, description });
  };
}

export const router = createBrowserRouter([
  // Public
  { path: "/login",    Component: Login },
  { path: "/register", Component: Register },

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

          { path: "search",   Component: makeStub("Search",   "Global search coming soon.") },
          { path: "settings", Component: makeStub("Settings", "Workspace settings coming soon.") },

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

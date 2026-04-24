import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderKanban, CheckSquare, Settings, Bell, Search, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import DashboardView from "./views/DashboardView";
import ProjectsView from "./views/ProjectsView";
import WorkflowView from "./views/WorkflowView";
import TasksView from "./views/TasksView";
import SettingsView from "./views/SettingsView";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginView from "./views/LoginView";
import RegisterView from "./views/RegisterView";
import ResetPasswordView from "./views/ResetPasswordView";

const MAIN_LINKS = [
  { path: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
  { path: "/projects", icon: <FolderKanban size={20} />, label: "Projets" },
  { path: "/workflow", icon: <ShieldCheck size={20} />, label: "Validation" },
  { path: "/tasks", icon: <CheckSquare size={20} />, label: "Chantier" },
];

function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside className="hidden md:flex w-16 bg-gb-surface-solid border-r border-gb-border flex-col items-center py-6 shrink-0 z-20 transition-colors duration-300">
      <div className="w-10 h-10 bg-gb-primary rounded mb-10 flex items-center justify-center font-bold text-gb-inverse shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
        B
      </div>
      <nav className="flex-1 w-full px-2 flex flex-col items-center">
        {MAIN_LINKS.map((link) => {
          const isActive = currentPath === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              title={link.label}
              className={`sidebar-icon ${isActive ? "bg-gb-primary/20 text-gb-primary" : "text-gb-muted"}`}
            >
              {link.icon}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2">
        <Link
          to="/settings"
          title="Administration"
          className={`sidebar-icon ${currentPath === "/settings" ? "bg-gb-primary/20 text-gb-primary" : "text-gb-muted"}`}
        >
          <Settings size={20} />
        </Link>
      </div>
    </aside>
  );
}

function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-gb-surface-solid border-t border-gb-border z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] transition-colors duration-300">
      {MAIN_LINKS.map((link) => {
        const isActive = currentPath === link.path;
        return (
          <Link
            key={link.path}
            to={link.path}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              isActive ? "text-gb-primary" : "text-gb-muted"
            }`}
          >
            {link.icon}
            <span className="text-[10px] font-medium truncate w-full text-center px-1">{link.label}</span>
          </Link>
        );
      })}
      <Link
        to="/settings"
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
          currentPath === "/settings" ? "text-gb-primary" : "text-gb-muted"
        }`}
      >
        <Settings size={20} />
        <span className="text-[10px] font-medium truncate w-full text-center px-1">Admin</span>
      </Link>
    </nav>
  );
}

function Header() {
  const { user, logout } = useAuth();
  
  return (
    <header className="h-14 border-b border-gb-border flex items-center justify-between px-4 sm:px-8 bg-gb-app/80 backdrop-blur shrink-0 z-10 sticky top-0 transition-colors duration-300">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="md:hidden w-8 h-8 bg-gb-primary rounded flex items-center justify-center font-bold text-gb-inverse shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
          B
        </div>
        <h1 className="text-base sm:text-lg font-semibold tracking-tight text-gb-text truncate max-w-[150px] sm:max-w-none">ERP BTP</h1>
        <span className="px-2 py-0.5 bg-gb-surface-hover rounded text-xs text-gb-muted font-mono uppercase tracking-widest hidden lg:inline-block">v4.0.1</span>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-6">
        <div className="flex items-center space-x-2 text-sm text-gb-muted hidden sm:flex">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>API Online</span>
        </div>
        <ThemeToggle />
        {user && (
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-right hidden lg:block">
              <p className="text-xs font-medium text-gb-text">{user.firstname} {user.lastname}</p>
              <p className="text-[10px] text-gb-muted uppercase">{user.roles?.[0]?.role?.code || "EMPLOYÉ"}</p>
            </div>
            <Avatar className="w-8 h-8 rounded-full border border-gb-border">
              <AvatarImage src={`https://ui-avatars.com/api/?name=${user.firstname}+${user.lastname}&background=0D8ABC&color=fff`} />
              <AvatarFallback>{user.firstname?.[0]}{user.lastname?.[0]}</AvatarFallback>
            </Avatar>
            <button 
              onClick={logout}
              className="hidden sm:block text-xs font-bold text-gb-danger hover:underline"
              title="Déconnexion"
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gb-app font-sans text-gb-text transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 relative">
        <Header />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><ProjectsView /></ProtectedRoute>} />
            <Route path="/workflow" element={<ProtectedRoute><WorkflowView /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TasksView /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
            <Route path="*" element={<div className="text-gb-muted text-center mt-10">En cours de développement...</div>} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Attempt to seed data once, but ideally this should be explicit in /settings
    fetch("/api/seed", { method: "POST" }).catch(() => {});
  }, []);

  return (
    <ThemeProvider defaultTheme="system">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginView />} />
            <Route path="/register" element={<RegisterView />} />
            <Route path="/reset-password" element={<ResetPasswordView />} />
            <Route path="*" element={<MainLayout />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

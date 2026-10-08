import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  MapPin,
  Send,
  History,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Calendar,
  User,
} from "lucide-react";

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-slate-100/60 font-sans text-slate-800">
      {/* Vibrant Blue Sidebar (Inspired by Reference Image 2) */}
      <aside className="w-64 bg-gradient-to-b from-blue-600 via-blue-600 to-blue-700 text-white flex flex-col justify-between hidden md:flex shadow-xl shadow-blue-900/10">
        <div className="p-6 space-y-8">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black shadow-inner border border-white/30">
              <MapPin className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">GotU</span>
              <span className="block text-[10px] font-semibold text-blue-200 tracking-wider uppercase">Location Share</span>
            </div>
          </div>

          {/* Main Navigation Menu */}
          <nav className="space-y-1.5">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-4 py-3 rounded-2xl bg-white/15 text-white font-semibold text-sm transition-all shadow-sm backdrop-blur-sm"
            >
              <LayoutDashboard className="w-4 h-4 text-blue-100" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/dashboard/live"
              className="flex items-center space-x-3 px-4 py-3 rounded-2xl text-blue-100 hover:bg-white/10 hover:text-white font-medium text-sm transition-all"
            >
              <MapPin className="w-4 h-4" />
              <span>Live Map</span>
            </Link>

            <Link
              href="/dashboard/invitations"
              className="flex items-center space-x-3 px-4 py-3 rounded-2xl text-blue-100 hover:bg-white/10 hover:text-white font-medium text-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Invitations</span>
            </Link>

            <Link
              href="/dashboard/history"
              className="flex items-center space-x-3 px-4 py-3 rounded-2xl text-blue-100 hover:bg-white/10 hover:text-white font-medium text-sm transition-all"
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </Link>
          </nav>
        </div>

        {/* Account Section at Bottom */}
        <div className="p-6 border-t border-white/10 space-y-1">
          <p className="px-4 text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-2">Account</p>

          <Link
            href="/dashboard/settings"
            className="flex items-center space-x-3 px-4 py-2.5 rounded-xl text-blue-100 hover:bg-white/10 hover:text-white text-xs font-medium transition-all"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>

          <Link
            href="/dashboard/help"
            className="flex items-center space-x-3 px-4 py-2.5 rounded-xl text-blue-100 hover:bg-white/10 hover:text-white text-xs font-medium transition-all"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help</span>
          </Link>

          <form action="/api/auth/signout" method="POST" className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-blue-100 hover:bg-red-500/20 hover:text-white text-xs font-medium transition-all text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content & Top Header Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shadow-sm sticky top-0 z-40">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">Welcome back to GotU Location Manager</p>
          </div>

          {/* Right Action Icons (Date, Notification, User Avatar) */}
          <div className="flex items-center space-x-4">
            <button className="hidden sm:flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200/70 transition-all">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>This Month</span>
            </button>

            <button className="relative w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200/70 transition-all">
              <Bell className="w-4.5 h-4.5 text-slate-600" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </button>

            <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="p-8 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

